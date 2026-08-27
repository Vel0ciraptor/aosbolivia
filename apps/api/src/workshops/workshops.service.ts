import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { CreateWorkshopServiceDto, UpdateWorkshopServiceDto } from './dto/workshop-service.dto';
import {
  CreateWorkshopJobDto, UpdateWorkshopJobDto, UpdateJobStatusDto,
  UpdateCheckpointDto, BulkUpdateCheckpointsDto, CreatePartNeedDto,
} from './dto/workshop-job.dto';

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
      include: {
        logs: { orderBy: { createdAt: 'desc' }, take: 1 },
        checkpoints: true,
        partNeeds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findJobById(workshopId: string, jobId: string) {
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
    if (existing) throw new BadRequestException('Esta solicitud ya tiene un registro en el CRM');

    const aiParsed = request.aiParsed as any;
    const job = await this.prisma.workshopJob.create({
      data: {
        workshopId,
        requestId,
        marca: request.vehicle?.marca || aiParsed?.marca || 'No especificado',
        modelo: request.vehicle?.modelo || aiParsed?.modelo || 'No especificado',
        anio: request.vehicle?.anio || aiParsed?.anio || new Date().getFullYear(),
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

  async updateJob(workshopId: string, jobId: string, dto: UpdateWorkshopJobDto) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para modificar este registro');
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

  async updateJobStatus(workshopId: string, jobId: string, dto: UpdateJobStatusDto) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) {
      throw new ForbiddenException('No tiene permiso para modificar este registro');
    }

    const data: any = { estado: dto.estado };

    const [updatedJob] = await this.prisma.$transaction([
      this.prisma.workshopJob.update({ where: { id: jobId }, data }),
      this.prisma.workshopJobLog.create({
        data: { jobId, estado: dto.estado, observaciones: dto.observaciones },
      }),
    ]);

    if (dto.estado === 'CHECK_INICIAL') {
      const existing = await this.prisma.jobCheckpoint.findMany({ where: { jobId } });
      if (existing.length === 0) {
        await this.prisma.jobCheckpoint.createMany({
          data: DEFAULT_CHECKPOINTS.map((servicio) => ({ jobId, servicio, checked: false })),
        });
      }
    }

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

  // ─────────────────────────────────────────────
  // CHECKPOINTS
  // ─────────────────────────────────────────────

  async findCheckpoints(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');
    return this.prisma.jobCheckpoint.findMany({
      where: { jobId },
      orderBy: { servicio: 'asc' },
    });
  }

  async bulkUpdateCheckpoints(workshopId: string, jobId: string, dto: BulkUpdateCheckpointsDto) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');

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
          data: { jobId, servicio: cp.servicio, checked: cp.checked, notas: cp.notas },
        });
      }
    }

    return this.prisma.jobCheckpoint.findMany({ where: { jobId }, orderBy: { servicio: 'asc' } });
  }

  // ─────────────────────────────────────────────
  // PART NEEDS (Piezas/Insumos necesarios)
  // ─────────────────────────────────────────────

  async findPartNeeds(workshopId: string, jobId: string) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');
    return this.prisma.jobPartNeed.findMany({
      where: { jobId },
      include: { inventoryItem: true },
    });
  }

  async createPartNeed(workshopId: string, jobId: string, dto: CreatePartNeedDto) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');

    return this.prisma.jobPartNeed.create({
      data: {
        jobId,
        inventoryItemId: dto.inventoryItemId,
        nombre: dto.nombre,
        cantidad: dto.cantidad,
        esInsumo: dto.esInsumo,
      },
      include: { inventoryItem: true },
    });
  }

  async removePartNeed(workshopId: string, jobId: string, partNeedId: string) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');
    return this.prisma.jobPartNeed.delete({ where: { id: partNeedId } });
  }

  async usePartNeed(workshopId: string, jobId: string, partNeedId: string) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');

    const partNeed = await this.prisma.jobPartNeed.findUnique({ where: { id: partNeedId } });
    if (!partNeed) throw new NotFoundException('Pieza/Insumo no encontrado');
    if (partNeed.yaUsado) throw new BadRequestException('Ya fue descontado del inventario');
    if (!partNeed.inventoryItemId) throw new BadRequestException('No está vinculado al inventario');

    const item = await this.prisma.inventoryItem.findUnique({ where: { id: partNeed.inventoryItemId } });
    if (!item) throw new NotFoundException('Item de inventario no encontrado');
    if (item.stock < partNeed.cantidad) {
      throw new BadRequestException(`Stock insuficiente. Disponible: ${item.stock}`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.jobPartNeed.update({
        where: { id: partNeedId },
        data: { yaUsado: true },
      }),
      this.prisma.inventoryItem.update({
        where: { id: partNeed.inventoryItemId },
        data: { stock: { decrement: partNeed.cantidad } },
      }),
    ]);

    return updated;
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
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (item.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');
    return this.prisma.inventoryItem.update({ where: { id: itemId }, data: dto });
  }

  async removeInventoryItem(workshopId: string, itemId: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (item.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');
    return this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: { estado: 'INACTIVE' },
    });
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─────────────────────────────────────────────
  // IMAGE UPLOAD
  // ─────────────────────────────────────────────

  async uploadJobImage(workshopId: string, jobId: string, file: Express.Multer.File) {
    const job = await this.prisma.workshopJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Vehículo no encontrado');
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');

    const baseUrl = process.env.APP_URL || 'http://localhost:3004';
    const url = `${baseUrl}/uploads/workshop-images/${file.filename}`;
    return { url };
  }

  // ─────────────────────────────────────────────
  // REPORT GENERATION (HTML)
  // ─────────────────────────────────────────────

  async generateJobReport(workshopId: string, jobId: string): Promise<string> {
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
    if (job.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');

    const checkpoints = (job.checkpoints || []).map((cp) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${cp.servicio}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${cp.checked ? '✅' : '❌'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${cp.notas || '-'}</td>
      </tr>
    `).join('');

    const partNeeds = (job.partNeeds || []).map((pn) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${pn.nombre}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${pn.cantidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${pn.esInsumo ? 'Insumo' : 'Repuesto'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${pn.yaUsado ? '✅' : '⏳'}</td>
      </tr>
    `).join('');

    const logs = (job.logs || []).map((log) => `
      <div style="margin-bottom:12px;padding-left:20px;border-left:3px solid #10b981;">
        <strong style="font-size:14px;color:#10b981;">${log.estado}</strong>
        <span style="font-size:12px;color:#9ca3af;margin-left:8px;">${new Date(log.createdAt).toLocaleString('es-VE')}</span>
        ${log.observaciones ? `<p style="font-size:13px;color:#6b7280;margin:4px 0 0 0;">${log.observaciones}</p>` : ''}
      </div>
    `).join('');

    const imagenes = ((job.imagenes as string[]) || []).map((url) =>
      `<img src="${url}" style="width:150px;height:150px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />`
    ).join('');

    const imagenesTerminado = ((job.imagenesTerminado as string[]) || []).map((url) =>
      `<img src="${url}" style="width:150px;height:150px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />`
    ).join('');

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
        </div>

        ${job.checkpoints && job.checkpoints.length > 0 ? `
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
        </div>` : ''}

        ${job.partNeeds && job.partNeeds.length > 0 ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Piezas / Insumos Necesarios</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Nombre</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Cantidad</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Tipo</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Usado</th>
            </tr></thead>
            <tbody>${partNeeds}</tbody>
          </table>
        </div>` : ''}

        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Historial de Estados</h2>
          ${logs}
        </div>

        ${imagenes ? `<div style="margin-bottom:24px;"><h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Fotos del Trabajo</h2><div style="display:flex;gap:8px;flex-wrap:wrap;">${imagenes}</div></div>` : ''}
        ${imagenesTerminado ? `<div style="margin-bottom:24px;"><h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Fotos del Resultado</h2><div style="display:flex;gap:8px;flex-wrap:wrap;">${imagenesTerminado}</div></div>` : ''}

        ${job.firmaDigital ? `
        <div style="margin-bottom:24px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#111827;">Firma del Cliente</h2>
          <img src="${job.firmaDigital}" style="height:80px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:white;" />
        </div>` : ''}

        <div style="border-top:2px solid #e5e7eb;padding-top:16px;margin-top:24px;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">Documento generado por RepuestoIA — ${new Date().toLocaleString('es-VE')}</p>
        </div>
      </div>
    </body>
    </html>`;
  }
}
