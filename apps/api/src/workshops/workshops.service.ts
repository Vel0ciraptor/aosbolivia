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
  UpdateCostDto,
  CreateMaterialRequestDto,
  ApproveMaterialRequestDto,
  DeliverMaterialRequestDto,
  CustomerApprovalDecisionDto,
  SendApprovalWhatsAppDto,
} from './dto/workshop-job.dto';
import { ExchangeRateService } from './exchange-rate.service';
import { WhatsAppService } from './whatsapp.service';
import { ExcelImportService, InventoryPreviewItem, ServicePreviewItem } from './excel-import.service';
import {
  CreateWorkshopUserDto,
  UpdateWorkshopUserDto,
  ResetWorkshopUserPasswordDto,
} from './dto/workshop-user.dto';
import * as bcrypt from 'bcryptjs';
import { isEmail } from 'class-validator';
import { randomBytes } from 'crypto';
import { readFile, stat, unlink } from 'fs/promises';
import { basename, extname, join } from 'path';

const MECHANIC_ROLE = 'MECANICO';
const MECHANIC_EDITABLE_STATES = ['CHECK_INICIAL', 'TRABAJANDO'];

const MAX_JOB_IMAGES_BYTES = 50 * 1024 * 1024;
const UPLOAD_IMAGES_DIR = join(process.cwd(), 'uploads', 'workshop-images');
const UPLOAD_LOGOS_DIR = join(process.cwd(), 'uploads', 'logos');
const MAX_LOGO_BYTES = 300 * 1024; // 300 KB
const MAX_LOGO_DIMENSION = 300; // 300x300 px

const imageKey = (url: string) => basename(url.split('?')[0]);
const WORKLOG_ADMIN_ROLES = ['SUPERVISOR', 'JEFE_MECANICO', 'CONTABILIDAD'];

// Lee las dimensiones de PNG, JPEG, GIF o WEBP sin dependencias externas
function getImageDimensions(buf: Buffer): { width: number; height: number } | null {
  try {
    // PNG: firma + IHDR en offset 16
    if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    // GIF
    if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'GIF') {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    // WEBP (RIFF....WEBP)
    if (
      buf.length > 30 &&
      buf.toString('ascii', 0, 4) === 'RIFF' &&
      buf.toString('ascii', 8, 12) === 'WEBP'
    ) {
      const fourcc = buf.toString('ascii', 12, 16);
      if (fourcc === 'VP8 ') {
        return {
          width: buf.readUInt16LE(26) & 0x3fff,
          height: buf.readUInt16LE(28) & 0x3fff,
        };
      }
      if (fourcc === 'VP8L') {
        const bits = buf.readUInt32LE(21);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
      if (fourcc === 'VP8X') {
        return {
          width: buf.readUIntLE(24, 3) + 1,
          height: buf.readUIntLE(27, 3) + 1,
        };
      }
    }
    // JPEG: buscar marcador SOF0-SOF15
    if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = buf[i + 1];
        if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
          i += 2;
          continue;
        }
        const len = buf.readUInt16BE(i + 2);
        const isSof =
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc;
        if (isSof) {
          return {
            height: buf.readUInt16BE(i + 5),
            width: buf.readUInt16BE(i + 7),
          };
        }
        i += 2 + len;
      }
    }
  } catch {
    return null;
  }
  return null;
}

@Injectable()
export class WorkshopsService {
  constructor(
    private prisma: PrismaService,
    private exchangeRateService: ExchangeRateService,
    private whatsAppService: WhatsAppService,
    private excelImportService: ExcelImportService,
  ) {}

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
      data: {
        ...dto,
        horario: dto.horario as any,
        trabajoTags: dto.trabajoTags as any,
      },
    });
  }

  // Tags personalizados de tipo de trabajo (CRM)
  async addWorkTag(workshopId: string, nombre: string) {
    const clean = (nombre || '').trim();
    if (!clean) throw new BadRequestException('El nombre del tag es obligatorio');
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });
    if (!workshop) throw new NotFoundException('Taller no encontrado');
    const tags = ((workshop.trabajoTags as string[]) || []).slice();
    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      tags.push(clean);
    }
    const updated = await this.prisma.workshop.update({
      where: { id: workshopId },
      data: { trabajoTags: tags },
    });
    return { trabajoTags: (updated.trabajoTags as string[]) || [] };
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
        origen: dto.origen || 'DIRECTO',
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

  async createJobFromRequest(
    workshopId: string,
    requestId: string,
    fechaCita?: Date,
  ) {
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
        origen: 'DIRECTO',
        fechaCita: fechaCita ?? request.fechaCita ?? null,
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
    actor?: { id: string; name?: string },
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

    const data: any = {
      ...dto,
      imagenes: dto.imagenes as any,
      imagenesIngreso: dto.imagenesIngreso as any,
      imagenesTerminado: dto.imagenesTerminado as any,
      tipoTrabajo: dto.tipoTrabajo as any,
      serviciosRealizados: dto.serviciosRealizados as any,
      diagnosticoImagenes: dto.diagnosticoImagenes as any,
    };

    // Si se modifica o registra el nivel de combustible, registrar quién y cuándo
    if (dto.nivelCombustible && dto.nivelCombustible !== job.nivelCombustible) {
      data.nivelCombustible = dto.nivelCombustible;
      data.combustibleRegistradoPor = actor?.name || actor?.id || 'Recepción';
      data.combustibleRegistradoEn = new Date();
    }

    return this.prisma.workshopJob.update({
      where: { id: jobId },
      data,
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

    // Del ingreso al check inicial: primero hay que registrar el kilometraje y el combustible
    if (job.estado === 'INGRESANDO' && dto.estado === 'CHECK_INICIAL') {
      if (!job.kilometraje) {
        throw new BadRequestException(
          'Primero ingresa el kilometraje del vehículo',
        );
      }
      if (!job.nivelCombustible) {
        throw new BadRequestException(
          'Primero registra el nivel de combustible del vehículo',
        );
      }
    }

    // Al pasar a TRABAJANDO: verificar mecánico asignado y autorización del cliente
    if (dto.estado === 'TRABAJANDO') {
      const worklogs = (job.mecanicosAsignados as any[]) || [];
      if (!worklogs.length) {
        throw new BadRequestException(
          'Debe asignar al menos un mecánico responsable antes de iniciar los trabajos.',
        );
      }
      if (job.autorizacionEstado === 'PENDIENTE_APROBACION') {
        throw new BadRequestException(
          'No se puede iniciar el trabajo: está pendiente la aprobación del presupuesto por el cliente.',
        );
      }
      if (job.autorizacionEstado === 'RECHAZADO') {
        throw new BadRequestException(
          'El cliente rechazó el presupuesto. Realice los ajustes necesarios y vuelva a solicitar aprobación.',
        );
      }
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
    actor?: { id: string; name?: string },
  ) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');

    let precioUnitario = dto.precioUnitario;
    if (precioUnitario === undefined && dto.inventoryItemId) {
      const item = await this.prisma.inventoryItem.findUnique({
        where: { id: dto.inventoryItemId },
      });
      if (item) precioUnitario = Number(item.precioUnitario);
    }

    // Al agregar un insumo/repuesto del inventario se crea automáticamente
    // una solicitud PENDIENTE a almacén que debe aprobar el jefe mecánico
    const [partNeed] = await this.prisma.$transaction([
      this.prisma.jobPartNeed.create({
        data: {
          jobId,
          inventoryItemId: dto.inventoryItemId,
          nombre: dto.nombre,
          cantidad: dto.cantidad,
          esInsumo: dto.esInsumo,
          precioUnitario,
        },
        include: { inventoryItem: true },
      }),
      ...(dto.inventoryItemId
        ? [
            this.prisma.workshopMaterialRequest.create({
              data: {
                workshopId,
                jobId,
                inventoryItemId: dto.inventoryItemId,
                cantidad: dto.cantidad,
                justificacion: `Solicitud automática por ${dto.esInsumo ? 'insumo' : 'repuesto'}: ${dto.nombre}`,
                solicitadoPorId: actor?.id || 'sistema',
                solicitadoPor: actor?.name || 'Sistema',
              },
            }),
          ]
        : []),
    ]);

    return partNeed;
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

    if (job.autorizacionEstado === 'PENDIENTE_APROBACION') {
      throw new BadRequestException(
        'No se puede iniciar el trabajo: está pendiente la aprobación del presupuesto por el cliente.',
      );
    }
    if (job.autorizacionEstado === 'RECHAZADO') {
      throw new BadRequestException(
        'El cliente rechazó el presupuesto. Realice los ajustes necesarios y vuelva a solicitar aprobación.',
      );
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
      iniciadoPor: actor.name || actor.id,
      tarifaHora: mechanic.tarifaHora != null ? Number(mechanic.tarifaHora) : null,
    };

    const updateData: any = {
      mecanicosAsignados: [...worklogs, entry],
    };

    // Si aún estaba en CHECK_INICIAL o INGRESANDO, avanza automáticamente a TRABAJANDO
    if (job.estado === 'CHECK_INICIAL' || job.estado === 'INGRESANDO') {
      updateData.estado = 'TRABAJANDO';
      await this.prisma.workshopJobLog.create({
        data: {
          jobId,
          estado: 'TRABAJANDO',
          observaciones: `Trabajo iniciado por ${mechanic.name} (Asignado por: ${actor.name || actor.id})`,
          firmaUsuarioId: actor.id,
          firmaUsuarioNombre: actor.name,
          firmaUsuarioRol: actor.role || 'SUPERVISOR',
        },
      });
    }

    const updated = await this.prisma.workshopJob.update({
      where: { id: jobId },
      data: updateData,
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
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, tarifaHora: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWorkshopUser(workshopId: string, dto: CreateWorkshopUserDto) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });
    if (!workshop) throw new NotFoundException('Taller no encontrado');

    const domain = workshop.nombre
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
    const email = `${dto.emailPrefix.toLowerCase().trim()}@${domain}.com`;

    if (!domain || !isEmail(email)) {
      throw new BadRequestException(
        'El correo generado no es válido. Verifica el nombre del taller y el prefijo del correo',
      );
    }

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
        ...(dto.tarifaHora !== undefined && { tarifaHora: dto.tarifaHora }),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, tarifaHora: true, createdAt: true },
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
        ...(dto.tarifaHora !== undefined && { tarifaHora: dto.tarifaHora }),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, tarifaHora: true, createdAt: true },
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

  async resetWorkshopUserPassword(
    workshopId: string,
    userId: string,
    dto: ResetWorkshopUserPasswordDto,
  ) {
    const user = await this.prisma.workshopUser.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');

    const plainPassword = dto.password || this.generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await this.prisma.workshopUser.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { id: user.id, name: user.name, email: user.email, plainPassword };
  }

  async changeOwnWorkshopUserPassword(
    workshopUserId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.workshopUser.findUnique({
      where: { id: workshopUserId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.status !== 'ACTIVE')
      throw new ForbiddenException('Cuenta desactivada');

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      throw new BadRequestException('La contraseña actual es incorrecta');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.workshopUser.update({
      where: { id: workshopUserId },
      data: { password: hashedPassword },
    });

    return { success: true };
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
    const bytes = randomBytes(12);
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(bytes[i] % chars.length);
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

    const existingUrls = [
      ...((job.imagenes as string[]) || []),
      ...((job.imagenesIngreso as string[]) || []),
      ...((job.imagenesTerminado as string[]) || []),
    ];
    let totalBytes = file.size;
    for (const url of existingUrls) {
      try {
        totalBytes += (await stat(join(UPLOAD_IMAGES_DIR, imageKey(url)))).size;
      } catch {
        // archivo ya no existe (fue incrustado en un reporte y eliminado)
      }
    }
    if (totalBytes > MAX_JOB_IMAGES_BYTES) {
      try {
        await unlink(join(UPLOAD_IMAGES_DIR, file.filename));
      } catch {
        // ya no existe
      }
      throw new BadRequestException(
        'Las fotos de un vehículo no pueden superar los 50MB en total',
      );
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:3004';
    const url = `${baseUrl}/uploads/workshop-images/${file.filename}`;
    return { url };
  }

  // ─────────────────────────────────────────────
  // LOGO DEL TALLER (máx 300x300 px / 300 KB)
  // ─────────────────────────────────────────────

  async uploadLogo(workshopId: string, file: Express.Multer.File) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });
    if (!workshop) throw new NotFoundException('Taller no encontrado');

    const discard = async () => {
      try {
        await unlink(join(UPLOAD_LOGOS_DIR, file.filename));
      } catch {
        // ya no existe
      }
    };

    if (file.size > MAX_LOGO_BYTES) {
      await discard();
      throw new BadRequestException(
        `El logo no puede pesar más de ${MAX_LOGO_BYTES / 1024} KB`,
      );
    }

    const dims = getImageDimensions(await readFile(file.path));
    if (!dims) {
      await discard();
      throw new BadRequestException('No se pudo leer la imagen del logo');
    }
    if (dims.width > MAX_LOGO_DIMENSION || dims.height > MAX_LOGO_DIMENSION) {
      await discard();
      throw new BadRequestException(
        `El logo debe medir máximo ${MAX_LOGO_DIMENSION}x${MAX_LOGO_DIMENSION} px (recibido ${dims.width}x${dims.height})`,
      );
    }

    // Eliminar logo anterior
    if (workshop.imageUrl) {
      try {
        await unlink(join(UPLOAD_LOGOS_DIR, imageKey(workshop.imageUrl)));
      } catch {
        // el logo anterior ya no existe
      }
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:3004';
    const url = `${baseUrl}/uploads/logos/${file.filename}`;

    await this.prisma.workshop.update({
      where: { id: workshopId },
      data: { imageUrl: url },
    });

    return { url, width: dims.width, height: dims.height };
  }

  async removeLogo(workshopId: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });
    if (!workshop) throw new NotFoundException('Taller no encontrado');

    if (workshop.imageUrl) {
      try {
        await unlink(join(UPLOAD_LOGOS_DIR, imageKey(workshop.imageUrl)));
      } catch {
        // el archivo ya no existe
      }
    }

    await this.prisma.workshop.update({
      where: { id: workshopId },
      data: { imageUrl: null },
    });

    return { success: true };
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

    const accent = (job.workshop.colorPrimario as string) || '#10b981';

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
    // Tarifas por hora actuales de los mecánicos involucrados
    const userIds = [...new Set(worklogs.map((w) => w.userId).filter(Boolean))];
    const tarifasMap = new Map<string, number>();
    if (userIds.length) {
      const users = await this.prisma.workshopUser.findMany({
        where: { id: { in: userIds as string[] } },
        select: { id: true, tarifaHora: true },
      });
      for (const u of users) {
        if (u.tarifaHora != null) tarifasMap.set(u.id, Number(u.tarifaHora));
      }
    }
    let totalManoObra = 0;
    const worklogRows = worklogs
      .map((w) => {
        const tarifa =
          w.tarifaHora != null ? Number(w.tarifaHora) : tarifasMap.get(w.userId) ?? 0;
        const horas = w.horasReales != null ? Number(w.horasReales) : 0;
        const costo = horas * tarifa;
        totalManoObra += costo;
        return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${w.nombre || '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;color:#6b7280;">${w.inicio ? new Date(w.inicio).toLocaleString('es-VE') : '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;color:#6b7280;">${w.fin ? new Date(w.fin).toLocaleString('es-VE') : 'En curso'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${w.horasReales != null ? `${w.horasReales} h` : '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">${tarifa > 0 ? `$${tarifa.toFixed(2)}/h` : '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">${costo > 0 ? `$${costo.toFixed(2)}` : '-'}</td>
      </tr>
    `;
      })
      .join('');

    const tipoTrabajo = job.tipoTrabajo as any;
    const tipoTrabajoText = tipoTrabajo
      ? [
          ...((tipoTrabajo.categorias || []) as string[]),
          ...(tipoTrabajo.otro ? [tipoTrabajo.otro] : []),
        ].join(', ')
      : '';

    const servicios = (job.serviciosRealizados as any[]) || [];
    const serviciosRows = servicios
      .map(
        (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${s.nombre || '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">$${(Number(s.precio) || 0).toFixed(2)}</td>
      </tr>
    `,
      )
      .join('');

    const totalRepuestos = (job.partNeeds || []).reduce((sum, pn) => {
      if (pn.precioUnitario != null)
        return sum + Number(pn.precioUnitario) * pn.cantidad;
      return sum;
    }, 0);
    const precioServicioLegacy =
      job.precioServicio != null ? Number(job.precioServicio) : 0;
    const totalServicios = servicios.length
      ? servicios.reduce((sum, s) => sum + (Number(s.precio) || 0), 0)
      : precioServicioLegacy;
    const totalCostos = totalServicios + totalRepuestos + totalManoObra;

    const logs = (job.logs || [])
      .map(
        (log) => `
      <div style="margin-bottom:12px;padding-left:20px;border-left:3px solid ${accent};">
        <strong style="font-size:14px;color:${accent};">${log.estado}</strong>
        <span style="font-size:12px;color:#9ca3af;margin-left:8px;">${new Date(log.createdAt).toLocaleString('es-VE')}</span>
        ${log.observaciones ? `<p style="font-size:13px;color:#6b7280;margin:4px 0 0 0;">${log.observaciones}</p>` : ''}
      </div>
    `,
      )
      .join('');

    const embedReportImage = async (url: string): Promise<string> => {
      try {
        const name = imageKey(url);
        const data = await readFile(join(UPLOAD_IMAGES_DIR, name));
        const ext = extname(name).toLowerCase();
        const mime =
          ext === '.png'
            ? 'image/png'
            : ext === '.gif'
              ? 'image/gif'
              : ext === '.webp'
                ? 'image/webp'
                : 'image/jpeg';
        return `data:${mime};base64,${data.toString('base64')}`;
      } catch {
        return url;
      }
    };

    const renderImages = (urls: any) =>
      Promise.all(
        ((urls || []) as string[]).map(async (url) => {
          const src = await embedReportImage(url);
          return `<img src="${src}" style="width:150px;height:150px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />`;
        }),
      );

    const embedLogo = async (): Promise<string> => {
      const url = job.workshop.imageUrl;
      if (!url) return '';
      try {
        const name = imageKey(url);
        const data = await readFile(join(UPLOAD_LOGOS_DIR, name));
        const ext = extname(name).toLowerCase();
        const mime =
          ext === '.png'
            ? 'image/png'
            : ext === '.gif'
              ? 'image/gif'
              : ext === '.webp'
                ? 'image/webp'
                : 'image/jpeg';
        return `data:${mime};base64,${data.toString('base64')}`;
      } catch {
        return url;
      }
    };

    const logoSrc = await embedLogo();
    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" alt="Logo" style="width:64px;height:64px;object-fit:contain;border-radius:10px;" />`
      : '';

    const embedFotoTablero = async (): Promise<string> => {
      const url = job.fotoTablero;
      if (!url) return '';
      return embedReportImage(url);
    };
    const fotoTableroSrc = await embedFotoTablero();

    const imagenes = (await renderImages(job.imagenes)).join('');
    const imagenesTerminado = (
      await renderImages(job.imagenesTerminado)
    ).join('');
    const imagenesDiagnostico = (
      await renderImages(job.diagnosticoImagenes)
    ).join('');

    // Cálculos económicos con descuento e IVA
    const subtotal = totalCostos;
    let descuentoMonto = 0;
    if (job.descuentoTipo === 'PORCENTAJE') {
      descuentoMonto = subtotal * ((Number(job.descuentoValor) || 0) / 100);
    } else if (job.descuentoTipo === 'FIJO') {
      descuentoMonto = Math.min(subtotal, Number(job.descuentoValor) || 0);
    }
    const baseImponible = Math.max(0, subtotal - descuentoMonto);
    const ivaMonto = job.aplicaIva
      ? baseImponible * ((Number(job.porcentajeIva) || 13) / 100)
      : 0;
    const totalFinalUsd = baseImponible + ivaMonto;

    // Tipo de cambio oficial de venta (BOB)
    const rateInfo = await this.exchangeRateService.getLatestRate();
    const rateVenta = Number(job.tipoCambioAplicado) || rateInfo.venta;
    const totalFinalBob = Math.round(totalFinalUsd * rateVenta * 100) / 100;

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Reporte - ${job.marca} ${job.modelo}</title>
    <style>@media print { body { margin: 0; } }</style>
    </head>
    <body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:40px;color:#1f2937;">
      <div style="max-width:800px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${accent};padding-bottom:16px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:14px;">
            ${logoHtml}
            <div>
              <h1 style="font-size:24px;font-weight:800;margin:0;color:#111827;">${job.workshop.nombre}</h1>
              <p style="font-size:13px;color:#6b7280;margin:4px 0 0 0;">${job.workshop.direccion} | ${job.workshop.telefono}</p>
            </div>
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
            <p style="font-size:14px;margin:4px 0 0 0;"><strong style="color:#374151;">Combustible:</strong> ${job.nivelCombustible ? `<span style="font-weight:700;color:${accent};">${job.nivelCombustible}</span> (Registrado por: ${job.combustibleRegistradoPor || 'Recepción'})` : 'No registrado'}</p>
            <p style="font-size:14px;margin:4px 0 0 0;"><strong style="color:#374151;">Ingreso:</strong> ${job.origen === 'COTIZACION' ? 'Vía cotización aceptada' : 'Directo al taller'}</p>
            ${job.fechaCita ? `<p style="font-size:14px;color:#6b7280;margin:4px 0 0 0;">Cita: ${new Date(job.fechaCita).toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</p>` : ''}
            ${fotoTableroSrc ? `<div style="margin-top:10px;"><p style="font-size:11px;color:#6b7280;margin:0 0 4px 0;">Evidencia Odómetro / Tablero:</p><img src="${fotoTableroSrc}" style="width:140px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" /></div>` : ''}
          </div>
          <div style="padding:16px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
            <h3 style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 8px 0;">Cliente</h3>
            <p style="font-size:16px;font-weight:600;margin:0;">${job.clienteNombre}</p>
            ${job.clienteTelefono ? `<p style="font-size:14px;color:#6b7280;margin:4px 0 0 0;">${job.clienteTelefono}</p>` : ''}
            <p style="font-size:13px;color:#6b7280;margin:8px 0 0 0;"><strong>Autorización:</strong> ${job.autorizacionEstado === 'APROBADO' ? '<span style="color:#059669;font-weight:700;">Aprobado por el cliente</span>' : job.autorizacionEstado === 'PENDIENTE_APROBACION' ? '<span style="color:#d97706;font-weight:700;">Pendiente de aprobación</span>' : 'Directa'}</p>
          </div>
        </div>

        <div style="padding:16px;background:#fef3c7;border-radius:12px;border:1px solid #f59e0b;margin-bottom:24px;">
          <h3 style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;margin:0 0 8px 0;">Problema Reportado</h3>
          <p style="font-size:14px;margin:0;">${job.problema}</p>
          ${tipoTrabajoText ? `<p style="font-size:13px;color:#78350f;margin:8px 0 0 0;"><strong>Tipo de trabajo:</strong> ${tipoTrabajoText}</p>` : ''}
        </div>

        ${
          job.diagnosticoMecanico
            ? `
        <div style="padding:16px;background:#f0fdf4;border-radius:12px;border:1px solid #86efac;margin-bottom:24px;">
          <h3 style="font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;margin:0 0 8px 0;">Diagnóstico Mecánico</h3>
          <p style="font-size:14px;margin:0;color:#14532d;">${job.diagnosticoMecanico}</p>
          ${imagenesDiagnostico ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">${imagenesDiagnostico}</div>` : ''}
        </div>`
            : ''
        }

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
          serviciosRows
            ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Trabajos Realizados</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Servicio</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Precio</th>
            </tr></thead>
            <tbody>${serviciosRows}</tbody>
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
            </tr></thead>
            <tbody>${partNeeds}</tbody>
          </table>
        </div>`
            : ''
        }

        ${
          worklogs.length
            ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Mano de Obra (Horas de Mecánico)</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Mecánico</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Inicio</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Fin</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Horas</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Tarifa/H</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Costo</th>
            </tr></thead>
            <tbody>${worklogRows}</tbody>
          </table>
        </div>`
            : ''
        }

        ${
          totalServicios > 0 || totalRepuestos > 0 || totalManoObra > 0
            ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Informe Económico</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Concepto</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Monto ($ USD)</th>
            </tr></thead>
            <tbody>
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${servicios.length ? `Servicios realizados (${servicios.length})` : 'Servicio'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">${totalServicios > 0 ? `$${totalServicios.toFixed(2)}` : '-'}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">Mano de obra (horas mecánico)</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">${totalManoObra > 0 ? `$${totalManoObra.toFixed(2)}` : '-'}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">Repuestos / Insumos</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">${totalRepuestos > 0 ? `$${totalRepuestos.toFixed(2)}` : '-'}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:8px 12px;font-size:14px;font-weight:600;color:#374151;">Subtotal Bruto</td>
                <td style="padding:8px 12px;text-align:right;font-size:14px;font-weight:600;color:#374151;">$${subtotal.toFixed(2)}</td>
              </tr>
              ${
                descuentoMonto > 0
                  ? `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#dc2626;">Descuento (${job.descuentoTipo === 'PORCENTAJE' ? `${job.descuentoValor}%` : 'Fijo'})</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;color:#dc2626;">-$${descuentoMonto.toFixed(2)}</td>
              </tr>`
                  : ''
              }
              ${
                job.aplicaIva
                  ? `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">IVA (${Number(job.porcentajeIva || 13)}%)</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">$${ivaMonto.toFixed(2)}</td>
              </tr>`
                  : `<tr>
                <td style="padding:6px 12px;font-size:12px;color:#9ca3af;">Tratamiento fiscal</td>
                <td style="padding:6px 12px;text-align:right;font-size:12px;color:#9ca3af;">Sin IVA</td>
              </tr>`
              }
              <tr style="background:#f9fafb;">
                <td style="padding:10px 12px;font-size:16px;font-weight:800;color:${accent};">TOTAL (USD)</td>
                <td style="padding:10px 12px;text-align:right;font-size:16px;font-weight:800;color:${accent};">$${totalFinalUsd.toFixed(2)}</td>
              </tr>
              <tr style="background:#ecfdf5;">
                <td style="padding:10px 12px;font-size:15px;font-weight:800;color:#065f46;">TOTAL EN BOLIVIANOS (BOB)</td>
                <td style="padding:10px 12px;text-align:right;font-size:15px;font-weight:800;color:#065f46;">Bs. ${totalFinalBob.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <p style="font-size:11px;color:#9ca3af;margin:6px 0 0 0;">* Tipo de cambio aplicado: <strong>${rateVenta} BOB/USD</strong> (Valor de venta del Dólar).</p>
        </div>`
            : ''
        }

        ${
          job.conclusionesEntrega
            ? `
        <div style="padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #cbd5e1;margin-bottom:24px;">
          <h3 style="font-size:12px;font-weight:700;color:#334155;text-transform:uppercase;margin:0 0 8px 0;">Conclusiones de Observaciones</h3>
          <p style="font-size:14px;margin:0;color:#1e293b;">${job.conclusionesEntrega}</p>
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
          job.firmaDigital || job.firmaIngreso
            ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Firmas</h2>
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            ${job.firmaIngreso ? `<div><p style="font-size:12px;color:#6b7280;margin:0 0 4px 0;">Firma de ingreso</p><img src="${job.firmaIngreso}" style="height:80px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:white;" /></div>` : ''}
            ${job.firmaDigital ? `<div><p style="font-size:12px;color:#6b7280;margin:0 0 4px 0;">Firma de salida (cliente)</p><img src="${job.firmaDigital}" style="height:80px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:white;" /></div>` : ''}
          </div>
        </div>`
            : ''
        }

        <div style="border-top:2px solid #e5e7eb;padding-top:16px;margin-top:24px;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">Documento generado por AOSBolivia — ${new Date().toLocaleString('es-VE')}</p>
        </div>
      </div>
    </body>
    </html>`;

    return html;
  }

  // ─────────────────────────────────────────────
  // WHATSAPP Y AUTORIZACIÓN DEL CLIENTE
  // ─────────────────────────────────────────────

  async sendDiagnosticApprovalWhatsApp(
    workshopId: string,
    jobId: string,
    userId: string,
    dto?: SendApprovalWhatsAppDto,
  ) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
      include: { workshop: true, partNeeds: true },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');
    if (!job.clienteTelefono) {
      throw new BadRequestException('El cliente no tiene un número de teléfono registrado');
    }

    // Generar token único con expiración
    const { token, expiresAt } = this.whatsAppService.generateApprovalToken();

    // Calcular costos presupuestados
    const servicios = (job.serviciosRealizados as any[]) || [];
    const totalServicios = servicios.length
      ? servicios.reduce((sum, s) => sum + (Number(s.precio) || 0), 0)
      : Number(job.precioServicio) || 0;
    const totalRepuestos = (job.partNeeds || []).reduce(
      (sum, p) => sum + Number(p.precioUnitario || 0) * (p.cantidad || 1),
      0,
    );
    const totalEstimadoUsd = totalServicios + totalRepuestos;

    const rateInfo = await this.exchangeRateService.getLatestRate();
    const totalEstimadoBob = totalEstimadoUsd * rateInfo.venta;

    // Actualizar orden con token y estado pendiente de aprobación
    await this.prisma.workshopJob.update({
      where: { id: jobId },
      data: {
        autorizacionToken: token,
        autorizacionTokenExpira: expiresAt,
        autorizacionPresupuesto: totalEstimadoUsd,
        autorizacionEstado: 'PENDIENTE_APROBACION',
        tipoCambioAplicado: rateInfo.venta,
      },
    });

    return this.whatsAppService.sendDiagnosticApproval({
      workshopId,
      jobId,
      enviadoPorId: userId,
      clienteNombre: job.clienteNombre,
      clienteTelefono: job.clienteTelefono,
      vehiculo: `${job.marca} ${job.modelo} (${job.anio})`,
      placa: job.placa || undefined,
      diagnostico: job.diagnosticoMecanico || job.problema || 'Inspección técnica general',
      servicios: servicios.map((s) => ({ nombre: s.nombre, precio: Number(s.precio) || 0 })),
      totalEstimadoUsd,
      totalEstimadoBob,
      token,
      appUrl: dto?.appUrl,
      workshopPhone:
        (job.workshop as any)?.whatsappNumero || job.workshop?.telefono,
    });
  }

  async sendVehicleReadyWhatsApp(
    workshopId: string,
    jobId: string,
    userId: string,
    appUrl?: string,
  ) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
      include: { workshop: true, partNeeds: true },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');
    if (!job.clienteTelefono) {
      throw new BadRequestException('El cliente no tiene un número de teléfono registrado');
    }

    const servicios = (job.serviciosRealizados as any[]) || [];
    const totalServicios = servicios.length
      ? servicios.reduce((sum, s) => sum + (Number(s.precio) || 0), 0)
      : Number(job.precioServicio) || 0;
    const totalRepuestos = (job.partNeeds || []).reduce(
      (sum, p) => sum + Number(p.precioUnitario || 0) * (p.cantidad || 1),
      0,
    );
    // Mano de obra: horas reales × tarifa por hora
    const worklogsWL = (job.mecanicosAsignados as any[]) || [];
    const userIdsWL = [...new Set(worklogsWL.map((w) => w.userId).filter(Boolean))];
    const tarifasWL = new Map<string, number>();
    if (userIdsWL.length) {
      const users = await this.prisma.workshopUser.findMany({
        where: { id: { in: userIdsWL as string[] } },
        select: { id: true, tarifaHora: true },
      });
      for (const u of users) {
        if (u.tarifaHora != null) tarifasWL.set(u.id, Number(u.tarifaHora));
      }
    }
    const totalManoObraWL = worklogsWL.reduce((sum, w) => {
      const tarifa = w.tarifaHora != null ? Number(w.tarifaHora) : tarifasWL.get(w.userId) ?? 0;
      return sum + (w.horasReales != null ? Number(w.horasReales) : 0) * tarifa;
    }, 0);
    const subtotal = totalServicios + totalRepuestos + totalManoObraWL;
    let descuentoMonto = 0;
    if (job.descuentoTipo === 'PORCENTAJE') {
      descuentoMonto = subtotal * ((Number(job.descuentoValor) || 0) / 100);
    } else if (job.descuentoTipo === 'FIJO') {
      descuentoMonto = Math.min(subtotal, Number(job.descuentoValor) || 0);
    }
    const base = Math.max(0, subtotal - descuentoMonto);
    const iva = job.aplicaIva ? base * ((Number(job.porcentajeIva) || 13) / 100) : 0;
    const totalFinalUsd = base + iva;

    const rateInfo = await this.exchangeRateService.getLatestRate();
    const rateVenta = Number(job.tipoCambioAplicado) || rateInfo.venta;
    const totalFinalBob = totalFinalUsd * rateVenta;

    return this.whatsAppService.sendVehicleReady({
      workshopId,
      jobId,
      enviadoPorId: userId,
      clienteNombre: job.clienteNombre,
      clienteTelefono: job.clienteTelefono,
      vehiculo: `${job.marca} ${job.modelo}`,
      placa: job.placa || undefined,
      tallerNombre: job.workshop.nombre,
      tallerDireccion: job.workshop.direccion,
      totalPagarUsd: totalFinalUsd,
      totalPagarBob: totalFinalBob,
      workshopPhone:
        (job.workshop as any)?.whatsappNumero || job.workshop?.telefono,
    });
  }

  // Vista pública para el cliente desde WhatsApp
  async getJobByApprovalToken(token: string) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { autorizacionToken: token },
      include: {
        workshop: {
          select: {
            nombre: true,
            telefono: true,
            direccion: true,
            colorPrimario: true,
            imageUrl: true,
          },
        },
        partNeeds: true,
      },
    });

    if (!job) throw new NotFoundException('Enlace de aprobación no válido o inexistente.');

    const now = new Date();
    if (job.autorizacionTokenExpira && job.autorizacionTokenExpira < now && job.autorizacionEstado === 'PENDIENTE_APROBACION') {
      await this.prisma.workshopJob.update({
        where: { id: job.id },
        data: { autorizacionEstado: 'EXPIRADO' },
      });
      job.autorizacionEstado = 'EXPIRADO';
    }

    const rateInfo = await this.exchangeRateService.getLatestRate();
    const rateVenta = Number(job.tipoCambioAplicado) || rateInfo.venta;
    const servicios = (job.serviciosRealizados as any[]) || [];
    const totalServicios = servicios.length
      ? servicios.reduce((sum, s) => sum + (Number(s.precio) || 0), 0)
      : Number(job.precioServicio) || 0;
    const totalRepuestos = (job.partNeeds || []).reduce(
      (sum, p) => sum + Number(p.precioUnitario || 0) * (p.cantidad || 1),
      0,
    );
    const totalEstimadoUsd = totalServicios + totalRepuestos;
    const totalEstimadoBob = totalEstimadoUsd * rateVenta;

    return {
      id: job.id,
      vehiculo: `${job.marca} ${job.modelo} (${job.anio})`,
      placa: job.placa,
      kilometraje: job.kilometraje,
      diagnosticoMecanico: job.diagnosticoMecanico || job.problema,
      diagnosticoImagenes: (job.diagnosticoImagenes as string[]) || [],
      servicios,
      piezas: job.partNeeds,
      totalEstimadoUsd,
      totalEstimadoBob,
      tipoCambioVenta: rateVenta,
      autorizacionEstado: job.autorizacionEstado,
      autorizacionTokenExpira: job.autorizacionTokenExpira,
      autorizacionDecididoEn: job.autorizacionDecididoEn,
      workshop: job.workshop,
    };
  }

  // Cliente aprueba o rechaza el presupuesto
  async decideJobApproval(
    token: string,
    dto: CustomerApprovalDecisionDto,
    ip: string,
    userAgent: string,
  ) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { autorizacionToken: token },
    });
    if (!job) throw new NotFoundException('Token no válido.');

    if (job.autorizacionEstado === 'APROBADO' || job.autorizacionEstado === 'RECHAZADO') {
      throw new ConflictException(
        `Este presupuesto ya fue ${job.autorizacionEstado === 'APROBADO' ? 'aprobado' : 'rechazado'} anteriormente el ${job.autorizacionDecididoEn ? new Date(job.autorizacionDecididoEn).toLocaleString('es-BO') : ''}.`,
      );
    }

    const now = new Date();
    if (job.autorizacionTokenExpira && job.autorizacionTokenExpira < now) {
      throw new BadRequestException('El enlace de aprobación ha expirado. Comuníquese con el taller.');
    }

    const nuevoEstado = dto.decision === 'APROBAR' ? 'APROBADO' : 'RECHAZADO';

    const updated = await this.prisma.workshopJob.update({
      where: { id: job.id },
      data: {
        autorizacionEstado: nuevoEstado,
        autorizacionDecididoEn: now,
        autorizacionIpCliente: ip,
        autorizacionUserAgent: userAgent,
        autorizacionFirma: dto.firma || undefined,
        autorizacionRechazoMotivo: dto.motivo || undefined,
      },
    });

    // Registrar en bitácora de auditoría
    await this.prisma.workshopJobLog.create({
      data: {
        jobId: job.id,
        estado: job.estado,
        observaciones: `Decisión del cliente: ${nuevoEstado} el presupuesto vía enlace web.${dto.motivo ? ` Motivo: ${dto.motivo}` : ''}`,
      },
    });

    return {
      ok: true,
      estado: nuevoEstado,
      decididoEn: now,
    };
  }

  // ─────────────────────────────────────────────
  // EDICIÓN DE COSTO AL CLIENTE CON AUDITORÍA
  // ─────────────────────────────────────────────

  async updateJobCost(
    workshopId: string,
    jobId: string,
    user: { id: string; name: string; role?: string },
    dto: UpdateCostDto,
  ) {
    if (user.role && !['SUPERVISOR', 'CONTABILIDAD'].includes(user.role)) {
      throw new ForbiddenException('No tiene permisos para modificar el costo final.');
    }

    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');
    if (job.estado === 'FINALIZADO') {
      throw new BadRequestException('No se puede modificar el costo de una orden ya finalizada.');
    }

    const precioAnterior = Number(job.precioServicio) || 0;
    const precioNuevo = dto.nuevoPrecio ?? dto.precioServicio ?? precioAnterior;

    const dataUpdate: any = { precioServicio: precioNuevo };
    if (dto.descuentoTipo !== undefined) dataUpdate.descuentoTipo = dto.descuentoTipo;
    if (dto.descuentoValor !== undefined) dataUpdate.descuentoValor = dto.descuentoValor;
    if (dto.aplicaIva !== undefined) dataUpdate.aplicaIva = dto.aplicaIva;
    if (dto.porcentajeIva !== undefined) dataUpdate.porcentajeIva = dto.porcentajeIva;

    const cambios: string[] = [];
    if (precioNuevo !== precioAnterior)
      cambios.push(`Precio servicio: $${precioAnterior} → $${precioNuevo}`);
    if (dto.descuentoTipo !== undefined && dto.descuentoTipo !== job.descuentoTipo)
      cambios.push(`Tipo descuento: ${job.descuentoTipo || 'ninguno'} → ${dto.descuentoTipo}`);
    if (dto.descuentoValor !== undefined && Number(dto.descuentoValor) !== Number(job.descuentoValor || 0))
      cambios.push(`Descuento: ${Number(job.descuentoValor || 0)} → ${Number(dto.descuentoValor)}`);
    if (dto.aplicaIva !== undefined && dto.aplicaIva !== job.aplicaIva)
      cambios.push(`IVA: ${job.aplicaIva ? 'sí' : 'no'} → ${dto.aplicaIva ? 'sí' : 'no'}`);
    if (dto.porcentajeIva !== undefined && Number(dto.porcentajeIva) !== Number(job.porcentajeIva || 13))
      cambios.push(`% IVA: ${Number(job.porcentajeIva || 13)} → ${Number(dto.porcentajeIva)}`);

    const justificacion = cambios.length
      ? `${dto.justificacion.trim()} (${cambios.join('; ')})`
      : dto.justificacion.trim();

    const [costAudit, updatedJob] = await this.prisma.$transaction([
      this.prisma.workshopJobCostAudit.create({
        data: {
          jobId,
          precioAnterior,
          precioNuevo,
          userId: user.id,
          userName: user.name || 'Usuario',
          justificacion,
        },
      }),
      this.prisma.workshopJob.update({
        where: { id: jobId },
        data: dataUpdate,
      }),
    ]);

    return {
      ok: true,
      precioAnterior,
      precioNuevo,
      justificacion: dto.justificacion,
      auditId: costAudit.id,
      presupuestoExcedido:
        job.autorizacionPresupuesto && precioNuevo > Number(job.autorizacionPresupuesto),
    };
  }

  async getJobCostAudits(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job || job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');

    return this.prisma.workshopJobCostAudit.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────
  // SOLICITUDES Y SALIDAS DE ALMACÉN (MATERIALES)
  // ─────────────────────────────────────────────

  async createMaterialRequest(
    workshopId: string,
    jobId: string,
    user: { id: string; name: string },
    dto: CreateMaterialRequestDto,
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.inventoryItemId, workshopId },
    });
    if (!item) throw new NotFoundException('Item de inventario no encontrado');

    return this.prisma.workshopMaterialRequest.create({
      data: {
        workshopId,
        jobId,
        inventoryItemId: dto.inventoryItemId,
        servicioId: dto.servicioId,
        cantidad: dto.cantidad,
        justificacion: dto.justificacion,
        solicitadoPorId: user.id,
        solicitadoPor: user.name || 'Mecánico',
      },
      include: { inventoryItem: true },
    });
  }

  async listMaterialRequests(workshopId: string, jobId?: string) {
    const where: any = { workshopId };
    if (jobId) where.jobId = jobId;

    return this.prisma.workshopMaterialRequest.findMany({
      where,
      include: { inventoryItem: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveMaterialRequest(
    workshopId: string,
    requestId: string,
    user: { id: string; name: string; role?: string },
    dto: ApproveMaterialRequestDto,
  ) {
    if (user.role && !['SUPERVISOR', 'JEFE_MECANICO'].includes(user.role)) {
      throw new ForbiddenException(
        'Solo el Jefe Mecánico o Administrador puede aprobar solicitudes de material.',
      );
    }

    const req = await this.prisma.workshopMaterialRequest.findFirst({
      where: { id: requestId, workshopId },
    });
    if (!req) throw new NotFoundException('Solicitud de material no encontrada');
    if (req.estado !== 'PENDIENTE') {
      throw new ConflictException(`La solicitud ya se encuentra en estado ${req.estado}`);
    }

    const nuevoEstado = dto.accion === 'APROBAR' ? 'APROBADA' : 'RECHAZADA';

    return this.prisma.workshopMaterialRequest.update({
      where: { id: requestId },
      data: {
        estado: nuevoEstado,
        aprobadoPorId: user.id,
        aprobadoPor: user.name || 'Jefe de Taller',
        aprobadoEn: new Date(),
        justificacion: dto.motivo ? `${req.justificacion || ''} | Motivo rechazo: ${dto.motivo}` : req.justificacion,
      },
      include: { inventoryItem: true },
    });
  }

  async deliverMaterialRequest(
    workshopId: string,
    requestId: string,
    user: { id: string; name: string; role?: string },
    dto: DeliverMaterialRequestDto,
  ) {
    if (user.role && !['SUPERVISOR', 'INVENTARIO'].includes(user.role)) {
      throw new ForbiddenException(
        'Solo el Encargado de Almacén/Inventario puede registrar la entrega física de materiales.',
      );
    }

    const req = await this.prisma.workshopMaterialRequest.findFirst({
      where: { id: requestId, workshopId },
      include: { inventoryItem: true, job: true },
    });
    if (!req) throw new NotFoundException('Solicitud de material no encontrada');
    if (req.estado !== 'APROBADA') {
      throw new BadRequestException('Solo se pueden entregar materiales previamente aprobados.');
    }
    if (dto.cantidadEntregada > req.cantidad) {
      throw new BadRequestException(
        `La cantidad a entregar (${dto.cantidadEntregada}) no puede superar la autorizada (${req.cantidad}).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: req.inventoryItemId },
      });
      if (!item) throw new NotFoundException('Item de inventario inexistente');

      if (item.stock < dto.cantidadEntregada) {
        throw new BadRequestException(
          `Stock insuficiente en almacén. Disponible: ${item.stock}, Solicitado: ${dto.cantidadEntregada}`,
        );
      }

      const stockNuevo = item.stock - dto.cantidadEntregada;

      // 1. Descontar inventario
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { stock: stockNuevo },
      });

      // 2. Registrar movimiento trazable
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          workshopId,
          tipo: 'SALIDA_ORDEN',
          cantidad: dto.cantidadEntregada,
          stockAnterior: item.stock,
          stockNuevo,
          jobId: req.jobId,
          usuarioId: user.id,
          usuarioNombre: user.name || 'Almacenero',
          motivo: `Entrega para orden ${req.job.marca} ${req.job.modelo} (${req.job.placa || 'Sin placa'})`,
        },
      });

      // 3. Crear o actualizar JobPartNeed para que figure en la orden
      await tx.jobPartNeed.create({
        data: {
          jobId: req.jobId,
          inventoryItemId: item.id,
          nombre: item.nombre,
          cantidad: dto.cantidadEntregada,
          esInsumo: true,
          yaUsado: true,
          yaUsadoEn: new Date(),
          precioUnitario: item.precioUnitario,
          usadoPorId: user.id,
          usadoPorNombre: user.name || 'Almacenero',
        },
      });

      // 4. Actualizar estado de la solicitud
      return tx.workshopMaterialRequest.update({
        where: { id: requestId },
        data: {
          estado: 'ENTREGADA',
          cantidadEntregada: dto.cantidadEntregada,
          entregadoPorId: user.id,
          entregadoPor: user.name || 'Almacenero',
          entregadoEn: new Date(),
        },
        include: { inventoryItem: true },
      });
    });
  }

  // ─────────────────────────────────────────────
  // PLANTILLAS DE SERVICIOS CON INSUMOS PREDEFINIDOS
  // ─────────────────────────────────────────────

  async addSuggestedMaterialsToJob(
    workshopId: string,
    jobId: string,
    serviceId: string,
    user: { id: string; name: string },
  ) {
    const service = await this.prisma.workshopService.findFirst({
      where: { id: serviceId, workshopId },
    });
    if (!service) throw new NotFoundException('Servicio no encontrado');

    const sugeridos = (service.materialesSugeridos as any[]) || [];
    if (!sugeridos.length) {
      return { ok: true, mensaje: 'El servicio no tiene insumos predefinidos', agregados: 0 };
    }

    let agregados = 0;
    for (const mat of sugeridos) {
      if (mat.inventoryItemId) {
        await this.createMaterialRequest(workshopId, jobId, user, {
          inventoryItemId: mat.inventoryItemId,
          cantidad: Number(mat.cantidad) || 1,
          servicioId: service.id,
          justificacion: `Carga automática de insumo predefinido para servicio: ${service.nombre}`,
        });
        agregados++;
      }
    }

    return { ok: true, agregados };
  }

  // ─────────────────────────────────────────────
  // IMPORTACIÓN EXCEL DE INVENTARIO Y SERVICIOS
  // ─────────────────────────────────────────────

  getInventoryTemplate() {
    return this.excelImportService.generateInventoryTemplate();
  }

  getServicesTemplate() {
    return this.excelImportService.generateServicesTemplate();
  }

  previewInventoryImport(workshopId: string, buffer: Buffer) {
    return this.excelImportService.previewInventory(workshopId, buffer);
  }

  confirmInventoryImport(
    workshopId: string,
    userId: string,
    userName: string,
    items: InventoryPreviewItem[],
  ) {
    return this.excelImportService.confirmInventory(workshopId, userId, userName, items);
  }

  previewServicesImport(workshopId: string, buffer: Buffer) {
    return this.excelImportService.previewServices(workshopId, buffer);
  }

  confirmServicesImport(workshopId: string, services: ServicePreviewItem[]) {
    return this.excelImportService.confirmServices(workshopId, services);
  }

  // Tipo de cambio oficial vigente
  getExchangeRate() {
    return this.exchangeRateService.getLatestRate();
  }
}

