import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartDto, UpdatePartDto } from './dto/parts.dto';

@Injectable()
export class PartsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { marca?: string; modelo?: string; anio?: number; search?: string }) {
    const where: any = { estado: 'ACTIVE' };
    if (query.marca) where.marca = { contains: query.marca, mode: 'insensitive' };
    if (query.modelo) where.modelo = { contains: query.modelo, mode: 'insensitive' };
    if (query.anio) { where.anioDesde = { lte: query.anio }; where.anioHasta = { gte: query.anio }; }
    if (query.search) where.nombre = { contains: query.search, mode: 'insensitive' };
    return this.prisma.part.findMany({
      where,
      include: { provider: { select: { id: true, nombre: true, telefono: true, email: true, latitud: true, longitud: true } } },
      orderBy: { precio: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.part.findUnique({ where: { id }, include: { provider: true } });
  }

  async findByProvider(providerId: string) {
    return this.prisma.part.findMany({
      where: { providerId },
      include: { provider: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(providerId: string, dto: CreatePartDto) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    return this.prisma.part.create({
      data: {
        providerId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        marca: dto.marca,
        modelo: dto.modelo,
        anioDesde: dto.anioDesde,
        anioHasta: dto.anioHasta,
        precio: dto.precio,
        stock: dto.stock ?? 0,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async update(id: string, providerId: string, dto: UpdatePartDto) {
    const part = await this.prisma.part.findUnique({ where: { id } });
    if (!part) throw new NotFoundException('Repuesto no encontrado');
    if (part.providerId !== providerId) {
      throw new ForbiddenException('No tiene permiso para modificar este repuesto');
    }
    return this.prisma.part.update({
      where: { id },
      data: { ...dto, precio: dto.precio as any },
    });
  }

  async remove(id: string, providerId: string) {
    const part = await this.prisma.part.findUnique({ where: { id } });
    if (!part) throw new NotFoundException('Repuesto no encontrado');
    if (part.providerId !== providerId) {
      throw new ForbiddenException('No tiene permiso para eliminar este repuesto');
    }
    return this.prisma.part.update({
      where: { id },
      data: { estado: 'INACTIVE' },
    });
  }
}
