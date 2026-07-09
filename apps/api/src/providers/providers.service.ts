import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.provider.findMany({
      where: { estado: 'ACTIVE' },
      include: { _count: { select: { parts: true, quotes: true } } },
    });
  }

  async findOne(id: string) {
    return this.prisma.provider.findUnique({
      where: { id },
      include: { parts: { where: { estado: 'ACTIVE' } } },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.provider.findUnique({
      where: { userId },
      include: { _count: { select: { parts: true, quotes: true } } },
    });
  }

  async findNearby(lat: number, lng: number, radiusKm: number = 50) {
    const providers = await this.prisma.provider.findMany({ where: { estado: 'ACTIVE' } });
    return providers
      .map((p) => ({ ...p, distanciaKm: this.haversine(lat, lng, p.latitud, p.longitud) }))
      .filter((p) => p.distanciaKm <= radiusKm)
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  }

  async update(userId: string, dto: UpdateProviderDto) {
    const provider = await this.prisma.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    return this.prisma.provider.update({
      where: { userId },
      data: dto,
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
