import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { CreateWorkshopServiceDto, UpdateWorkshopServiceDto } from './dto/workshop-service.dto';

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
    return this.prisma.workshop.findUnique({
      where: { userId },
      include: { services: { orderBy: { createdAt: 'desc' } } },
    });
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

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
