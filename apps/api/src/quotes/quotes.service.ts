import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { request: { include: { vehicle: true, user: true } } },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada');

    const updated = await this.prisma.quote.update({ where: { id }, data: { estado: status as any } });

    if (status === 'ACCEPTED' && quote.workshopId && quote.request) {
      const existing = await this.prisma.workshopJob.findFirst({
        where: { workshopId: quote.workshopId, requestId: quote.requestId },
      });

      if (!existing) {
        const request = quote.request;
        const aiParsed = request.aiParsed as any;

        const job = await this.prisma.workshopJob.create({
          data: {
            workshopId: quote.workshopId,
            requestId: request.id,
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
            observaciones: `Creado automáticamente desde solicitud aceptada: ${request.titulo}`,
          },
        });
      }

      await this.prisma.request.update({
        where: { id: quote.requestId },
        data: { estado: 'IN_PROGRESS' },
      });
    }

    return updated;
  }
}
