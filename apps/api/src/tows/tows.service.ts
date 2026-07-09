import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTowDto } from './dto/update-tow.dto';

@Injectable()
export class TowsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.towService.findMany({ where: { estado: 'ACTIVE' } });
  }

  async findOne(id: string) {
    return this.prisma.towService.findUnique({ where: { id } });
  }

  async findByUserId(userId: string) {
    return this.prisma.towService.findUnique({ where: { userId } });
  }

  async update(userId: string, dto: UpdateTowDto) {
    const tow = await this.prisma.towService.findUnique({ where: { userId } });
    if (!tow) throw new NotFoundException('Servicio de grúa no encontrado');
    return this.prisma.towService.update({
      where: { userId },
      data: {
        ...dto,
        costoBase: dto.costoBase as any,
        costoKm: dto.costoKm as any,
      },
    });
  }

  async findNearby(lat: number, lng: number, radiusKm: number = 50) {
    const tows = await this.prisma.towService.findMany({ where: { estado: 'ACTIVE' } });
    return tows
      .map((t) => ({
        ...t,
        distanciaKm: this.haversine(lat, lng, t.latitud, t.longitud),
        costoEstimado: +t.costoBase + this.haversine(lat, lng, t.latitud, t.longitud) * +t.costoKm,
      }))
      .filter((t) => t.distanciaKm <= t.cobertura && t.distanciaKm <= radiusKm)
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
