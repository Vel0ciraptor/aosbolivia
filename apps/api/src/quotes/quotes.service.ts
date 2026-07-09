import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNumber, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuoteDto {
  @ApiProperty() @IsString() requestId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() providerId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() workshopId?: string;
  @ApiProperty() @IsNumber() precio: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() comentario?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() tiempoEntrega?: string;
}

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateQuoteDto) {
    if (!dto.providerId && !dto.workshopId) {
      throw new BadRequestException('Debe especificar providerId o workshopId.');
    }
    return this.prisma.quote.create({
      data: {
        requestId: dto.requestId,
        providerId: dto.providerId,
        workshopId: dto.workshopId,
        precio: dto.precio,
        comentario: dto.comentario,
        tiempoEntrega: dto.tiempoEntrega,
      },
      include: {
        provider: { select: { nombre: true } },
        workshop: { select: { nombre: true } },
        request: { select: { titulo: true } },
      },
    });
  }

  async findByRequest(requestId: string) {
    return this.prisma.quote.findMany({
      where: { requestId },
      include: {
        provider: { select: { nombre: true, telefono: true, email: true } },
        workshop: { select: { nombre: true, telefono: true } },
      },
      orderBy: { precio: 'asc' },
    });
  }

  async findByProvider(providerId: string) {
    return this.prisma.quote.findMany({
      where: { providerId },
      include: { request: { include: { user: { select: { name: true, phone: true } }, vehicle: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByWorkshop(workshopId: string) {
    return this.prisma.quote.findMany({
      where: { workshopId },
      include: { request: { include: { user: { select: { name: true, phone: true } }, vehicle: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.quote.update({ where: { id }, data: { estado: status as any } });
  }
}
