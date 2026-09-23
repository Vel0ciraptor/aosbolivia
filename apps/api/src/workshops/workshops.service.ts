import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import {
  CreateWorkshopServiceDto,
  UpdateWorkshopServiceDto,
} from './dto/workshop-service.dto';
import {
  CreateWorkshopJobDto,
  UpdateWorkshopJobDto,
  UpdateJobStatusDto,
  UpdateCheckpointDto,
  BulkUpdateCheckpointsDto,
  CreatePartNeedDto,
  UpdatePartNeedDto,
  StartStopWorkDto,
  UpdateWorklogDto,
} from './dto/workshop-job.dto';
import {
  CreateWorkshopUserDto,
  UpdateWorkshopUserDto,
} from './dto/workshop-user.dto';
import * as bcrypt from 'bcryptjs';

const DEFAULT_CHECKPOINTS = [
  'Motor',
  'Aceite y filtros',
  'Frenos',
  'Alineación y balanceo',
  'Suspensión',
  'Eléctrico',
  'Neumáticos',
  'Refrigeración',
  'Transmisión',
  'Carrocería',
  'Aire acondicionado',
];

const MECHANIC_ROLE = 'MECANICO';
const MECHANIC_EDITABLE_STATES = ['CHECK_INICIAL', 'TRABAJANDO'];
const WORKLOG_ADMIN_ROLES = ['SUPERVISOR', 'JEFE_MECANICO', 'CONTABILIDAD'];

@Injectable()
export class WorkshopsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.workshop.findMany({
      where: { estado: 'ACTIVE' },
      include: { services: true, _count: { select: { services: true } } },
    });
  }

  async findOne(id: string) {
    return this.prisma.workshop.findUnique({
      where: { id },
      include: { services: true },
    });
  }

  async findByUserId(userId: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { userId },
      include: { services: { orderBy: { createdAt: 'desc' } } },
    });
    if (!workshop) throw new NotFoundException('Taller no encontrado');
    return workshop;
  }

  async findByWorkshopId(workshopId: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      include: { services: { orderBy: { createdAt: 'desc' } } },
    });
    if (!workshop) throw new NotFoundException('Taller no encontrado');
    return workshop;
  }

  async update(userId: string, dto: UpdateWorkshopDto) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { userId },
    });
    if (!workshop) throw new NotFoundException('Taller no encontrado');
    return this.prisma.workshop.update({
      where: { userId },
      data: { ...dto, horario: dto.horario as any },
    });
  }

  async findNearby(lat: number, lng: number, radiusKm: number = 50) {
    const workshops = await this.prisma.workshop.findMany({
      where: { estado: 'ACTIVE' },
      include: { services: { take: 3 } },
    });
    return workshops
      .map((w) => ({
        ...w,
        distanciaKm: this.haversine(lat, lng, w.latitud, w.longitud),
      }))
      .filter((w) => w.distanciaKm <= radiusKm)
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  }

  async findServices(workshopId: string) {
    return this.prisma.workshopService.findMany({
      where: { workshopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createService(workshopId: string, dto: CreateWorkshopServiceDto) {
    return this.prisma.workshopService.create({
      data: {
        workshopId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        precioReferencial: dto.precioReferencial as any,
      },
    });
  }

  async updateService(
    workshopId: string,
    serviceId: string,
    dto: UpdateWorkshopServiceDto,
  ) {
    const service = await this.prisma.workshopService.findUnique({
      where: { id: serviceId },
    });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    if (service.workshopId !== workshopId) {
      throw new ForbiddenException(
        'No tiene permiso para modificar este servicio',
      );
    }
    return this.prisma.workshopService.update({
      where: { id: serviceId },
      data: { ...dto, precioReferencial: dto.precioReferencial as any },
    });
  }

  async removeService(workshopId: string, serviceId: string) {
    const service = await this.prisma.workshopService.findUnique({
      where: { id: serviceId },
    });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    if (service.workshopId !== workshopId) {
      throw new ForbiddenException(
        'No tiene permiso para eliminar este servicio',
      );
    }
    return this.prisma.workshopService.delete({ where: { id: serviceId } });
  }

  // ─────────────────────────────────────────────
  // CRM - Workshop Jobs
  // ─────────────────────────────────────────────

  async findJobs(workshopId: string, estado?: string, role?: string, userId?: string) {
    const where: any = { workshopId };
    if (estado) where.estado = estado;
    if (role === MECHANIC_ROLE) {
      if (!estado || !MECHANIC_EDITABLE_STATES.includes(estado)) {
        where.estado = { in: MECHANIC_EDITABLE_STATES };
      }
      if (userId) {
        where.mecanicosAsignados = { array_contains: [{ userId }] };
      }
    }
    return this.prisma.workshopJob.findMany({
      where,
      include: {
        logs: { orderBy: { createdAt: 'desc' }, take: 1 },
        checkpoints: true,
        partNeeds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findJobById(workshopId: string, jobId: string, role?: string, userId?: string) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
      include: {
        logs: { orderBy: { createdAt: 'desc' } },
        request: true,
        checkpoints: { orderBy: { servicio: 'asc' } },
        partNeeds: { include: { inventoryItem: true } },
      },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para ver este registro');
    }
    if (role === MECHANIC_ROLE) {
      if (!MECHANIC_EDITABLE_STATES.includes(job.estado)) {
        throw new ForbiddenException('No tiene permiso para ver este estado');
      }
      if (userId) {
        const asignados = (job.mecanicosAsignados as any[]) || [];
        if (!asignados.some((w) => w.userId === userId)) {
          throw new ForbiddenException('No tiene permiso para ver este trabajo');
        }
      }
      const mecanicosAsignados = (job.mecanicosAsignados as any[]) || [];
      return {
        id: job.id,
        marca: job.marca,
        modelo: job.modelo,
        anio: job.anio,
        placa: job.placa,
        kilometraje: job.kilometraje,
        problema: job.problema,
        estado: job.estado,
        createdAt: job.createdAt,
        mecanicosAsignados,
        logs: job.logs,
        checkpoints: job.checkpoints,
        partNeeds: (job.partNeeds || []).map((pn) => ({
          id: pn.id,
          nombre: pn.nombre,
          cantidad: pn.cantidad,
          esInsumo: pn.esInsumo,
          yaUsado: pn.yaUsado,
          inventoryItemId: pn.inventoryItemId,
          inventoryItem: pn.inventoryItem,
        })),
        clientWorkshopOnly: true,
      };
    }
    return job;
  }

  async createJob(workshopId: string, dto: CreateWorkshopJobDto) {
    const job = await this.prisma.workshopJob.create({
      data: {
        workshopId,
        marca: dto.marca,
        modelo: dto.modelo,
        anio: dto.anio,
        placa: dto.placa,
        kilometraje: dto.kilometraje,
        problema: dto.problema,
        clienteNombre: dto.clienteNombre,
        clienteTelefono: dto.clienteTelefono,
        requestId: dto.requestId,
        estado: 'INGRESANDO',
      },
    });

    await this.prisma.workshopJobLog.create({
      data: {
        jobId: job.id,
        estado: 'INGRESANDO',
        observaciones: 'Vehículo registrado en el taller',
      },
    });

    return job;
  }

  async createJobFromRequest(workshopId: string, requestId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { vehicle: true, user: true },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');

    const existing = await this.prisma.workshopJob.findFirst({
      where: { workshopId, requestId },
    });
    if (existing)
      throw new BadRequestException(
        'Esta solicitud ya tiene un registro en el CRM',
      );

    const aiParsed = request.aiParsed as any;
    const job = await this.prisma.workshopJob.create({
      data: {
        workshopId,
        requestId,
        marca: request.vehicle?.marca || aiParsed?.marca || 'No especificado',
        modelo:
          request.vehicle?.modelo || aiParsed?.modelo || 'No especificado',
        anio:
          request.vehicle?.anio || aiParsed?.anio || new Date().getFullYear(),
        placa: request.vehicle?.placa,
        problema: request.descripcion,
        clienteNombre: request.user.name,
        clienteTelefono: request.user.phone,
        estado: 'INGRESANDO',
      },
    });

    await this.prisma.workshopJobLog.create({
      data: {
        jobId: job.id,
        estado: 'INGRESANDO',
        observaciones: `Creado desde solicitud: ${request.titulo}`,
      },
    });

    return job;
  }

  async updateJob(
    workshopId: string,
    jobId: string,
    dto: UpdateWorkshopJobDto,
  ) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException(
        'No tiene permiso para modificar este registro',
      );
    }
    return this.prisma.workshopJob.update({
      where: { id: jobId },
      data: {
        ...dto,
        imagenes: dto.imagenes as any,
        imagenesTerminado: dto.imagenesTerminado as any,
      },
    });
  }

  async updateJobStatus(
    workshopId: string,
    jobId: string,
    dto: UpdateJobStatusDto,
    signer: {
      userId: string;
      userName: string;
      userRole: string;
      userType: string;
    },
  ) {
    if (signer.userRole === MECHANIC_ROLE) {
      throw new ForbiddenException(
        'Un mecánico no puede cambiar el estado del trabajo',
      );
    }
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException(
        'No tiene permiso para modificar este registro',
      );
    }

    // Validar contraseña del usuario que firma
    let passwordValid = false;
    if (signer.userType === 'WORKSHOP_USER') {
      const workshopUser = await this.prisma.workshopUser.findUnique({
        where: { id: signer.userId },
      });
      if (workshopUser) {
        passwordValid = await bcrypt.compare(
          dto.password,
          workshopUser.password,
        );
      }
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: signer.userId },
      });
      if (user && user.password) {
        passwordValid = await bcrypt.compare(dto.password, user.password);
      }
    }

    if (!passwordValid) {
      throw new ForbiddenException('Contraseña incorrecta');
    }

    const data: any = { estado: dto.estado };

    const [updatedJob] = await this.prisma.$transaction([
      this.prisma.workshopJob.update({ where: { id: jobId }, data }),
      this.prisma.workshopJobLog.create({
        data: {
          jobId,
          estado: dto.estado,
          observaciones: dto.observaciones,
          firmaUsuarioId: signer.userId,
          firmaUsuarioNombre: signer.userName,
          firmaUsuarioRol: signer.userRole,
        },
      }),
    ]);

    if (dto.estado === 'CHECK_INICIAL') {
      const existing = await this.prisma.jobCheckpoint.findMany({
        where: { jobId },
      });
      if (existing.length === 0) {
        await this.prisma.jobCheckpoint.createMany({
          data: DEFAULT_CHECKPOINTS.map((servicio) => ({
            jobId,
            servicio,
            checked: false,
          })),
        });
      }
    }

    return updatedJob;
  }

  async removeJob(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException(
        'No tiene permiso para eliminar este registro',
      );
    }
    return this.prisma.workshopJob.delete({ where: { id: jobId } });
  }

  async findJobLogs(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para ver este registro');
    }
    return this.prisma.workshopJobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────
  // CHECKPOINTS
  // ─────────────────────────────────────────────

  async findCheckpoints(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');
    return this.prisma.jobCheckpoint.findMany({
      where: { jobId },
      orderBy: { servicio: 'asc' },
    });
  }

  async bulkUpdateCheckpoints(
    workshopId: string,
    jobId: string,
    dto: BulkUpdateCheckpointsDto,
  ) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');

    for (const cp of dto.checkpoints) {
      const existing = await this.prisma.jobCheckpoint.findFirst({
        where: { jobId, servicio: cp.servicio },
      });
      if (existing) {
        await this.prisma.jobCheckpoint.update({
          where: { id: existing.id },
          data: { checked: cp.checked, notas: cp.notas },
        });
      } else {
        await this.prisma.jobCheckpoint.create({
          data: {
            jobId,
            servicio: cp.servicio,
            checked: cp.checked,
            notas: cp.notas,
          },
        });
      }
    }

    return this.prisma.jobCheckpoint.findMany({
      where: { jobId },
      orderBy: { servicio: 'asc' },
    });
  }

  // ─────────────────────────────────────────────
  // PART NEEDS (Piezas/Insumos necesarios)
  // ─────────────────────────────────────────────

  async findPartNeeds(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');
    return this.prisma.jobPartNeed.findMany({
      where: { jobId },
      include: { inventoryItem: true },
    });
  }

  async createPartNeed(
    workshopId: string,
    jobId: string,
    dto: CreatePartNeedDto,
    role?: string,
  ) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');
    if (role === MECHANIC_ROLE)
      throw new ForbiddenException('Un mecánico no administra piezas');

    let precioUnitario = dto.precioUnitario;
    if (precioUnitario === undefined && dto.inventoryItemId) {
      const item = await this.prisma.inventoryItem.findUnique({
        where: { id: dto.inventoryItemId },
      });
      if (item) precioUnitario = Number(item.precioUnitario);
    }

    return this.prisma.jobPartNeed.create({
      data: {
        jobId,
        inventoryItemId: dto.inventoryItemId,
        nombre: dto.nombre,
        cantidad: dto.cantidad,
        esInsumo: dto.esInsumo,
        precioUnitario,
      },
      include: { inventoryItem: true },
    });
  }

  async removePartNeed(workshopId: string, jobId: string, partNeedId: string) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');
    return this.prisma.jobPartNeed.delete({ where: { id: partNeedId } });
  }

  async updatePartNeed(
    workshopId: string,
    jobId: string,
    partNeedId: string,
    dto: UpdatePartNeedDto,
    role?: string,
  ) {
    if (role === MECHANIC_ROLE)
      throw new ForbiddenException('Un mecánico no administra piezas');
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');

    const partNeed = await this.prisma.jobPartNeed.findUnique({
      where: { id: partNeedId },
    });
    if (!partNeed) throw new NotFoundException('Pieza/Insumo no encontrado');

    return this.prisma.jobPartNeed.update({
      where: { id: partNeedId },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.cantidad !== undefined && { cantidad: dto.cantidad }),
        ...(dto.precioUnitario !== undefined && {
          precioUnitario: dto.precioUnitario,
        }),
      },
      include: { inventoryItem: true },
    });
  }

  async usePartNeed(
    workshopId: string,
    jobId: string,
    partNeedId: string,
    actor?: { userId: string; userName: string; role?: string },
  ) {
    if (actor?.role === MECHANIC_ROLE) {
      throw new ForbiddenException('Un mecánico no puede descontar inventario');
    }
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');

    const partNeed = await this.prisma.jobPartNeed.findUnique({
      where: { id: partNeedId },
    });
    if (!partNeed) throw new NotFoundException('Pieza/Insumo no encontrado');
    if (partNeed.yaUsado)
      throw new BadRequestException('Ya fue descontado del inventario');
    if (!partNeed.inventoryItemId)
      throw new BadRequestException('No está vinculado al inventario');

    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: partNeed.inventoryItemId },
    });
    if (!item) throw new NotFoundException('Item de inventario no encontrado');
    if (item.stock < partNeed.cantidad) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${item.stock}`,
      );
    }

    const precioUnitario =
      partNeed.precioUnitario !== null && partNeed.precioUnitario !== undefined
        ? partNeed.precioUnitario
        : item.precioUnitario;

    const [updated] = await this.prisma.$transaction([
      this.prisma.jobPartNeed.update({
        where: { id: partNeedId },
        data: {
          yaUsado: true,
          yaUsadoEn: new Date(),
          usadoPorId: actor?.userId,
          usadoPorNombre: actor?.userName,
          precioUnitario,
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: partNeed.inventoryItemId },
        data: { stock: { decrement: partNeed.cantidad } },
      }),
    ]);

    return updated;
  }

  // ─────────────────────────────────────────────
  // WORKLOGS (Horas de mecánicos)
  // ─────────────────────────────────────────────

  private isWorklogAdmin(role?: string) {
    return !role || WORKLOG_ADMIN_ROLES.includes(role);
  }

  private async loadEditableJob(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');
    return job;
  }

  async startWork(
    workshopId: string,
    jobId: string,
    dto: StartStopWorkDto,
    actor: { id: string; name: string; role?: string },
  ) {
    const job = await this.loadEditableJob(workshopId, jobId);
    let userId = dto.userId;
    if (!userId) {
      if (actor.role !== MECHANIC_ROLE)
        throw new BadRequestException('Indique el mecánico a asignar');
      userId = actor.id;
    } else if (actor.role === MECHANIC_ROLE && userId !== actor.id) {
      throw new ForbiddenException('Solo puede iniciar su propio trabajo');
    }

    const mechanic = await this.prisma.workshopUser.findFirst({
      where: { id: userId, workshopId },
    });
    if (!mechanic || !['MECANICO', 'JEFE_MECANICO'].includes(mechanic.role)) {
      throw new BadRequestException('El usuario no es un mecánico del taller');
    }

    const worklogs = (job.mecanicosAsignados as any[]) || [];
    const active = worklogs.find((w) => w.userId === userId && !w.fin);
    if (active)
      throw new BadRequestException('El mecánico ya tiene el trabajo iniciado');

    const entry = {
      key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      nombre: mechanic.name,
      inicio: new Date().toISOString(),
      fin: null,
      horasReales: null,
    };

    const updated = await this.prisma.workshopJob.update({
      where: { id: jobId },
      data: { mecanicosAsignados: [...worklogs, entry] },
    });
    return updated.mecanicosAsignados;
  }

  async stopWork(
    workshopId: string,
    jobId: string,
    dto: StartStopWorkDto,
    actor: { id: string; role?: string },
  ) {
    const job = await this.loadEditableJob(workshopId, jobId);
    const userId = dto.userId || actor.id;
    if (actor.role === MECHANIC_ROLE && userId !== actor.id) {
      throw new ForbiddenException('Solo puede terminar su propio trabajo');
    }

    const worklogs = (job.mecanicosAsignados as any[]) || [];
    const entry = worklogs.find((w) => w.userId === userId && !w.fin);
    if (!entry)
      throw new BadRequestException(
        'No hay trabajo iniciado para este mecánico',
      );

    const fin = new Date();
    const inicio = new Date(entry.inicio);
    const horasReales = Math.max(
      0,
      Math.round(((fin.getTime() - inicio.getTime()) / 3600000) * 100) / 100,
    );

    const updated = await this.prisma.workshopJob.update({
      where: { id: jobId },
      data: {
        mecanicosAsignados: worklogs.map((w) =>
          w.key === entry.key
            ? { ...w, fin: fin.toISOString(), horasReales }
            : w,
        ),
      },
    });
    return updated.mecanicosAsignados;
  }

  async updateWorklog(
    workshopId: string,
    jobId: string,
    worklogKey: string,
    dto: UpdateWorklogDto,
    role?: string,
  ) {
    if (!this.isWorklogAdmin(role))
      throw new ForbiddenException('No tiene permiso para editar horas');
    const job = await this.loadEditableJob(workshopId, jobId);
    const worklogs = (job.mecanicosAsignados as any[]) || [];
    const entry = worklogs.find((w) => w.key === worklogKey);
    if (!entry) throw new NotFoundException('Registro de horas no encontrado');

    const next = { ...entry };
    if (dto.horasReales !== undefined) next.horasReales = dto.horasReales;
    if (dto.inicio) next.inicio = dto.inicio;
    if (dto.fin) next.fin = dto.fin;

    const updated = await this.prisma.workshopJob.update({
      where: { id: jobId },
      data: {
        mecanicosAsignados: worklogs.map((w) =>
          w.key === worklogKey ? next : w,
        ),
      },
    });
    return updated.mecanicosAsignados;
  }

  async getMechanicHours(workshopId: string, from?: string, to?: string) {
    const jobs = await this.prisma.workshopJob.findMany({
      where: { workshopId },
      select: {
        id: true,
        marca: true,
        modelo: true,
        placa: true,
        clienteNombre: true,
        mecanicosAsignados: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows: any[] = [];
    for (const job of jobs) {
      const worklogs = (job.mecanicosAsignados as any[]) || [];
      for (const w of worklogs) {
        if (!w.fin) continue;
        const inicio = new Date(w.inicio);
        const fin = new Date(w.fin);
        if (from && inicio < new Date(from)) continue;
        if (to && fin > new Date(to)) continue;
        rows.push({
          jobId: job.id,
          worklogKey: w.key,
          marca: job.marca,
          modelo: job.modelo,
          placa: job.placa,
          clienteNombre: job.clienteNombre,
          userId: w.userId,
          nombre: w.nombre,
          inicio: w.inicio,
          fin: w.fin,
          horasReales: w.horasReales,
        });
      }
    }
    rows.sort((a, b) => new Date(b.fin).getTime() - new Date(a.fin).getTime());
    return rows;
  }

  async getInventoryMovements(workshopId: string) {
    const jobs = await this.prisma.workshopJob.findMany({
      where: { workshopId },
      select: {
        id: true,
        marca: true,
        modelo: true,
        placa: true,
        clienteNombre: true,
      },
    });
    const jobIds = jobs.map((j) => j.id);
    const partNeeds = await this.prisma.jobPartNeed.findMany({
      where: { jobId: { in: jobIds }, yaUsado: true },
      orderBy: { yaUsadoEn: 'desc' },
    });
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    return partNeeds.map((pn) => {
      const job = jobMap.get(pn.jobId);
      return {
        id: pn.id,
        fecha: pn.yaUsadoEn,
        pieza: pn.nombre,
        cantidad: pn.cantidad,
        movimiento: 'SALIDA',
        jobId: pn.jobId,
        vehiculo: job
          ? `${job.marca} ${job.modelo}${job.placa ? ` (${job.placa})` : ''}`
          : pn.jobId,
        cliente: job?.clienteNombre,
        mecanico: pn.usadoPorNombre || '-',
        precioUnitario: pn.precioUnitario,
      };
    });
  }

  // ─────────────────────────────────────────────
  // INVENTORY
  // ─────────────────────────────────────────────

  async findInventory(workshopId: string, categoria?: string) {
    const where: any = { workshopId, estado: 'ACTIVE' };
    if (categoria) where.categoria = categoria;
    return this.prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInventoryItem(workshopId: string, dto: any) {
    return this.prisma.inventoryItem.create({
      data: {
        workshopId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        categoria: dto.categoria,
        stock: dto.stock || 0,
        precioUnitario: dto.precioUnitario || 0,
        unidad: dto.unidad || 'unidad',
      },
    });
  }

  async updateInventoryItem(workshopId: string, itemId: string, dto: any) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (item.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');
    return this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: dto,
    });
  }

  async removeInventoryItem(workshopId: string, itemId: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (item.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');
    return this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: { estado: 'INACTIVE' },
    });
  }

  private haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─────────────────────────────────────────────
  // WORKSHOP USERS (Equipo interno)
  // ─────────────────────────────────────────────

  async findWorkshopUsers(workshopId: string) {
    return this.prisma.workshopUser.findMany({
      where: { workshopId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWorkshopUser(workshopId: string, dto: CreateWorkshopUserDto) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });
    if (!workshop) throw new NotFoundException('Taller no encontrado');

    const email = `${dto.emailPrefix.toLowerCase().trim()}@${workshop.nombre
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')}.com`;

    const existing = await this.prisma.workshopUser.findUnique({
      where: { workshopId_email: { workshopId, email } },
    });
    if (existing)
      throw new ConflictException(
        'Ya existe un usuario con ese email en el taller',
      );

    const plainPassword = dto.password || this.generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await this.prisma.workshopUser.create({
      data: {
        workshopId,
        name: dto.name.trim(),
        email,
        phone: dto.phone,
        role: dto.role,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return { ...user, plainPassword };
  }

  async updateWorkshopUser(
    workshopId: string,
    userId: string,
    dto: UpdateWorkshopUserDto,
  ) {
    const user = await this.prisma.workshopUser.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');

    return this.prisma.workshopUser.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.role && { role: dto.role }),
        ...(dto.status && { status: dto.status }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async removeWorkshopUser(workshopId: string, userId: string) {
    const user = await this.prisma.workshopUser.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');

    return this.prisma.workshopUser.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    });
  }

  async findWorkshopUserByEmail(email: string) {
    return this.prisma.workshopUser.findFirst({
      where: { email, status: 'ACTIVE' },
      include: { workshop: true },
    });
  }

  private generatePassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // ─────────────────────────────────────────────
  // IMAGE UPLOAD
  // ─────────────────────────────────────────────

  async uploadJobImage(
    workshopId: string,
    jobId: string,
    file: Express.Multer.File,
  ) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');

    const baseUrl = process.env.APP_URL || 'http://localhost:3004';
    const url = `${baseUrl}/uploads/workshop-images/${file.filename}`;
    return { url };
  }

  // ─────────────────────────────────────────────
  // REPORT GENERATION (HTML)
  // ─────────────────────────────────────────────

  async generateJobReport(workshopId: string, jobId: string, role?: string): Promise<string> {
    if (role === MECHANIC_ROLE) throw new ForbiddenException('Un mecánico no puede generar reportes');
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
      include: {
        workshop: true,
        logs: { orderBy: { createdAt: 'desc' } },
        checkpoints: { orderBy: { servicio: 'asc' } },
        partNeeds: { include: { inventoryItem: true } },
      },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');

    const checkpoints = (job.checkpoints || [])
      .map(
        (cp) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${cp.servicio}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${cp.checked ? '✅' : '❌'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${cp.notas || '-'}</td>
      </tr>
    `,
      )
      .join('');

    const partNeeds = (job.partNeeds || [])
      .map(
        (pn) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${pn.nombre}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${pn.cantidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${pn.esInsumo ? 'Insumo' : 'Repuesto'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">${pn.precioUnitario != null ? `$${Number(pn.precioUnitario).toFixed(2)}` : '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">${pn.precioUnitario != null ? `$${(Number(pn.precioUnitario) * pn.cantidad).toFixed(2)}` : '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${pn.yaUsado ? '✅' : '⏳'}</td>
      </tr>
    `,
      )
      .join('');

    const worklogs = (job.mecanicosAsignados as any[]) || [];
    const worklogRows = worklogs
      .map(
        (w) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${w.nombre || '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;color:#6b7280;">${w.inicio ? new Date(w.inicio).toLocaleString('es-VE') : '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;color:#6b7280;">${w.fin ? new Date(w.fin).toLocaleString('es-VE') : 'En curso'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${w.horasReales != null ? `${w.horasReales} h` : '-'}</td>
      </tr>
    `,
      )
      .join('');

    const tipoTrabajo = job.tipoTrabajo as any;
    const tipoTrabajoText = tipoTrabajo
      ? [
          ...((tipoTrabajo.categorias || []) as string[]),
          ...(tipoTrabajo.otro ? [tipoTrabajo.otro] : []),
        ].join(', ')
      : '';

    const totalRepuestos = (job.partNeeds || []).reduce((sum, pn) => {
      if (pn.precioUnitario != null)
        return sum + Number(pn.precioUnitario) * pn.cantidad;
      return sum;
    }, 0);
    const precioServicio =
      job.precioServicio != null ? Number(job.precioServicio) : 0;
    const totalCostos = precioServicio + totalRepuestos;

    const logs = (job.logs || [])
      .map(
        (log) => `
      <div style="margin-bottom:12px;padding-left:20px;border-left:3px solid #10b981;">
        <strong style="font-size:14px;color:#10b981;">${log.estado}</strong>
        <span style="font-size:12px;color:#9ca3af;margin-left:8px;">${new Date(log.createdAt).toLocaleString('es-VE')}</span>
        ${log.observaciones ? `<p style="font-size:13px;color:#6b7280;margin:4px 0 0 0;">${log.observaciones}</p>` : ''}
      </div>
    `,
      )
      .join('');

    const imagenes = ((job.imagenes as string[]) || [])
      .map(
        (url) =>
          `<img src="${url}" style="width:150px;height:150px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />`,
      )
      .join('');

    const imagenesTerminado = ((job.imagenesTerminado as string[]) || [])
      .map(
        (url) =>
          `<img src="${url}" style="width:150px;height:150px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />`,
      )
      .join('');

    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Reporte - ${job.marca} ${job.modelo}</title>
    <style>@media print { body { margin: 0; } }</style>
    </head>
    <body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:40px;color:#1f2937;">
      <div style="max-width:800px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #10b981;padding-bottom:16px;margin-bottom:24px;">
          <div>
            <h1 style="font-size:24px;font-weight:800;margin:0;color:#111827;">${job.workshop.nombre}</h1>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0 0;">${job.workshop.direccion} | ${job.workshop.telefono}</p>
          </div>
          <div style="text-align:right;">
            <p style="font-size:11px;color:#9ca3af;margin:0;">REPORTE DE SERVICIO</p>
            <p style="font-size:12px;color:#6b7280;margin:4px 0 0 0;">${new Date(job.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
          <div style="padding:16px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
            <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 8px 0;">Vehículo</h3>
            <p style="font-size:18px;font-weight:700;margin:0;">${job.marca} ${job.modelo} ${job.anio}</p>
            ${job.placa ? `<p style="font-size:14px;color:#6b7280;margin:4px 0 0 0;">Placa: ${job.placa}</p>` : ''}
            ${job.kilometraje ? `<p style="font-size:14px;color:#6b7280;margin:4px 0 0 0;">Kilometraje: ${job.kilometraje.toLocaleString()} km</p>` : ''}
          </div>
          <div style="padding:16px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
            <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 8px 0;">Cliente</h3>
            <p style="font-size:16px;font-weight:600;margin:0;">${job.clienteNombre}</p>
            ${job.clienteTelefono ? `<p style="font-size:14px;color:#6b7280;margin:4px 0 0 0;">${job.clienteTelefono}</p>` : ''}
          </div>
        </div>

        <div style="padding:16px;background:#fef3c7;border-radius:12px;border:1px solid #f59e0b;margin-bottom:24px;">
          <h3 style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;margin:0 0 8px 0;">Problema Reportado</h3>
          <p style="font-size:14px;margin:0;">${job.problema}</p>
          ${tipoTrabajoText ? `<p style="font-size:13px;color:#78350f;margin:8px 0 0 0;"><strong>Tipo de trabajo:</strong> ${tipoTrabajoText}</p>` : ''}
        </div>

        ${
          job.checkpoints && job.checkpoints.length > 0
            ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Check Inicial</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Servicio</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Estado</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Notas</th>
            </tr></thead>
            <tbody>${checkpoints}</tbody>
          </table>
        </div>`
            : ''
        }

        ${
          worklogRows
            ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Mecánicos y Horas</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Mecánico</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Inicio</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Fin</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Horas</th>
            </tr></thead>
            <tbody>${worklogRows}</tbody>
          </table>
        </div>`
            : ''
        }

        ${
          job.partNeeds && job.partNeeds.length > 0
            ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Piezas / Insumos Necesarios</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Nombre</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Cantidad</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Tipo</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Precio U.</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Subtotal</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Usado</th>
            </tr></thead>
            <tbody>${partNeeds}</tbody>
          </table>
        </div>`
            : ''
        }

        ${
          precioServicio > 0 || totalRepuestos > 0
            ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Resumen de Costos</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Concepto</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Monto</th>
            </tr></thead>
            <tbody>
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">Servicio</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">${precioServicio > 0 ? `$${precioServicio.toFixed(2)}` : '-'}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">Repuestos / Insumos</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">${totalRepuestos > 0 ? `$${totalRepuestos.toFixed(2)}` : '-'}</td>
              </tr>
              <tr style="background:#ecfdf5;">
                <td style="padding:10px 12px;font-size:15px;font-weight:800;color:#065f46;">TOTAL</td>
                <td style="padding:10px 12px;text-align:right;font-size:15px;font-weight:800;color:#065f46;">$${totalCostos.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>`
            : ''
        }

        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Historial de Estados</h2>
          ${logs}
        </div>

        ${imagenes ? `<div style="margin-bottom:24px;"><h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Fotos del Trabajo</h2><div style="display:flex;gap:8px;flex-wrap:wrap;">${imagenes}</div></div>` : ''}
        ${imagenesTerminado ? `<div style="margin-bottom:24px;"><h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Fotos del Resultado</h2><div style="display:flex;gap:8px;flex-wrap:wrap;">${imagenesTerminado}</div></div>` : ''}

        ${
          job.firmaDigital
            ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Firma del Cliente</h2>
          <img src="${job.firmaDigital}" style="height:80px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:white;" />
        </div>`
            : ''
        }

        <div style="border-top:2px solid #e5e7eb;padding-top:16px;margin-top:24px;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">Documento generado por RepuestoIA — ${new Date().toLocaleString('es-VE')}</p>
        </div>
      </div>
    </body>
    </html>`;
  }
}
