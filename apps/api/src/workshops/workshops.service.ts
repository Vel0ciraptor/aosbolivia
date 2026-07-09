import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { CreateWorkshopServiceDto, UpdateWorkshopServiceDto } from './dto/workshop-service.dto';
import { CreateWorkshopJobDto, UpdateWorkshopJobDto, UpdateJobStatusDto } from './dto/workshop-job.dto';

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

  async update(userId: string, dto: UpdateWorkshopDto) {
    const workshop = await this.prisma.workshop.findUnique({ where: { userId } });
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
      .map((w) => ({ ...w, distanciaKm: this.haversine(lat, lng, w.latitud, w.longitud) }))
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

  async updateService(workshopId: string, serviceId: string, dto: UpdateWorkshopServiceDto) {
    const service = await this.prisma.workshopService.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    if (service.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para modificar este servicio');
    }
    return this.prisma.workshopService.update({
      where: { id: serviceId },
      data: { ...dto, precioReferencial: dto.precioReferencial as any },
    });
  }

  async removeService(workshopId: string, serviceId: string) {
    const service = await this.prisma.workshopService.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    if (service.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para eliminar este servicio');
    }
    return this.prisma.workshopService.delete({ where: { id: serviceId } });
  }

  // ─────────────────────────────────────────────
  // CRM - Workshop Jobs
  // ─────────────────────────────────────────────

  async findJobs(workshopId: string, estado?: string) {
    const where: any = { workshopId };
    if (estado) where.estado = estado;
    return this.prisma.workshopJob.findMany({
      where,
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findJobById(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({
      where: { id: jobId },
      include: { logs: { orderBy: { createdAt: 'desc' } }, request: true },
    });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para ver este registro');
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
    if (existing) throw new BadRequestException('Esta solicitud ya tiene un registro en el CRM');

    const aiParsed = request.aiParsed as any;
    const job = await this.prisma.workshopJob.create({
      data: {
        workshopId,
        requestId,
        marca: request.vehicle?.marca || aiParsed?.marca || 'No especificado',
        modelo: request.vehicle?.modelo || aiParsed?.modelo || 'No especificado',
        anio: request.vehicle?.anio || aiParsed?.anio || new Date().getFullYear(),
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

  async updateJob(workshopId: string, jobId: string, dto: UpdateWorkshopJobDto) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para modificar este registro');
    }
    return this.prisma.workshopJob.update({
      where: { id: jobId },
      data: dto,
    });
  }

  async updateJobStatus(workshopId: string, jobId: string, dto: UpdateJobStatusDto) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para modificar este registro');
    }

    const [updatedJob] = await this.prisma.$transaction([
      this.prisma.workshopJob.update({
        where: { id: jobId },
        data: { estado: dto.estado },
      }),
      this.prisma.workshopJobLog.create({
        data: {
          jobId,
          estado: dto.estado,
          observaciones: dto.observaciones,
        },
      }),
    ]);

    return updatedJob;
  }

  async removeJob(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para eliminar este registro');
    }
    return this.prisma.workshopJob.delete({ where: { id: jobId } });
  }

  async findJobLogs(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para ver este registro');
    }
    return this.prisma.workshopJobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
