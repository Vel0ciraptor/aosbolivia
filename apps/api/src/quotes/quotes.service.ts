import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateIf,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuoteDto {
  @ApiProperty() @IsString() requestId: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  providerId?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workshopId?: string;
  @ApiProperty() @IsNumber() precio: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comentario?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tiempoEntrega?: string;
  @ApiProperty({
    required: false,
    description: 'Cita propuesta por el taller (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  fechaPropuesta?: string;
}

// Bolivia no aplica horario de verano
const TZ_NAME = 'America/La_Paz';

function dateKeyOf(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ_NAME });
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmtCita(d: Date): string {
  return d.toLocaleString('es-BO', {
    timeZone: TZ_NAME,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateQuoteDto) {
    if (!dto.providerId && !dto.workshopId) {
      throw new BadRequestException(
        'Debe especificar providerId o workshopId.',
      );
    }
    return this.prisma.quote.create({
      data: {
        requestId: dto.requestId,
        providerId: dto.providerId,
        workshopId: dto.workshopId,
        precio: dto.precio,
        comentario: dto.comentario,
        tiempoEntrega: dto.tiempoEntrega,
        fechaPropuesta: dto.fechaPropuesta
          ? new Date(dto.fechaPropuesta)
          : null,
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
      include: {
        request: {
          include: {
            user: { select: { name: true, phone: true } },
            vehicle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByWorkshop(workshopId: string) {
    return this.prisma.quote.findMany({
      where: { workshopId },
      include: {
        request: {
          include: {
            user: { select: { name: true, phone: true } },
            vehicle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string, citaStartAt?: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { request: { include: { vehicle: true, user: true } } },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada');

    if (status !== 'ACCEPTED') {
      return this.prisma.quote.update({
        where: { id },
        data: { estado: status as any },
      });
    }

    const request = quote.request;

    // Cita elegida: la que escoge el cliente ahora > la propuesta por el taller
    // > la fecha deseada en la solicitud
    let slotStart: Date | null = null;
    if (citaStartAt) {
      slotStart = new Date(citaStartAt);
      if (isNaN(slotStart.getTime())) {
        throw new BadRequestException('Fecha de cita inválida');
      }
    } else if (quote.fechaPropuesta) {
      slotStart = new Date(quote.fechaPropuesta);
    } else if (request?.fechaCita) {
      slotStart = new Date(request.fechaCita);
    }

    // Duración de la cita: según el bloque de disponibilidad del taller
    let endAt: Date | null = null;
    if (slotStart && quote.workshopId) {
      const key = dateKeyOf(slotStart);
      const mins =
        slotStart.getUTCHours() * 60 + slotStart.getUTCMinutes();
      const localMins = mins - 4 * 60; // → hora en Bolivia
      const blocks = await this.prisma.workshopAvailability.findMany({
        where: { workshopId: quote.workshopId },
      });
      const block = blocks.find(
        (b) =>
          b.fecha.toISOString().slice(0, 10) === key &&
          localMins >= minutesOf(b.horaInicio) &&
          localMins < minutesOf(b.horaFin),
      );
      const duration = block?.slotMinutes ?? 60;
      endAt = new Date(slotStart.getTime() + duration * 60000);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Las demás cotizaciones pendientes de la solicitud quedan rechazadas
      await tx.quote.updateMany({
        where: {
          requestId: quote.requestId,
          id: { not: id },
          estado: 'PENDING',
        },
        data: { estado: 'REJECTED' },
      });

      const upd = await tx.quote.update({
        where: { id },
        data: { estado: 'ACCEPTED' },
      });

      if (request) {
        await tx.request.update({
          where: { id: quote.requestId },
          data: { estado: 'IN_PROGRESS' },
        });
      }

      if (quote.workshopId && request && slotStart && endAt) {
        const existingAppt = await tx.appointment.findUnique({
          where: { quoteId: id },
        });
        if (!existingAppt) {
          await tx.appointment.create({
            data: {
              workshopId: quote.workshopId,
              requestId: quote.requestId,
              quoteId: id,
              clientUserId: request.userId,
              startAt: slotStart,
              endAt,
              status: 'BOOKED',
            },
          });
        }
      }

      if (quote.workshopId && request) {
        const existing = await tx.workshopJob.findFirst({
          where: { workshopId: quote.workshopId, requestId: quote.requestId },
        });

        if (!existing) {
          const aiParsed = request.aiParsed as any;

          const job = await tx.workshopJob.create({
            data: {
              workshopId: quote.workshopId,
              requestId: request.id,
              marca:
                request.vehicle?.marca || aiParsed?.marca || 'No especificado',
              modelo:
                request.vehicle?.modelo ||
                aiParsed?.modelo ||
                'No especificado',
              anio:
                request.vehicle?.anio ||
                aiParsed?.anio ||
                new Date().getFullYear(),
              placa: request.vehicle?.placa,
              problema: request.descripcion,
              clienteNombre: request.user.name,
              clienteTelefono: request.user.phone,
              estado: 'INGRESANDO',
              fechaCita: slotStart,
            },
          });

          await tx.workshopJobLog.create({
            data: {
              jobId: job.id,
              estado: 'INGRESANDO',
              observaciones: `Creado automáticamente desde solicitud aceptada: ${request.titulo}`,
            },
          });
        } else if (slotStart) {
          await tx.workshopJob.update({
            where: { id: existing.id },
            data: { fechaCita: slotStart },
          });
        }
      }

      if (quote.workshopId) {
        await tx.notification.create({
          data: {
            workshopId: quote.workshopId,
            tipo: 'QUOTE_ACCEPTED',
            titulo: '¡Cotización aceptada!',
            mensaje:
              `El cliente ${request?.user?.name || ''} aceptó tu cotización ` +
              `de Bs ${quote.precio} para "${request?.titulo || ''}".` +
              (slotStart ? ` Cita: ${fmtCita(slotStart)}.` : ''),
            quoteId: id,
            requestId: quote.requestId,
          },
        });
      }

      return upd;
    });

    return updated;
  }
}
