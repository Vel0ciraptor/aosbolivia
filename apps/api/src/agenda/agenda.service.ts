import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  Matches,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Bolivia: UTC-4 sin horario de verano. Los bloques de agenda se guardan
// como hora local del taller ("08:00") y se convierten a UTC al reservar.
const TZ_OFFSET = '-04:00';
const TZ_NAME = 'America/La_Paz';
const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_RANGE_DAYS = 370;

export class CreateAvailabilityDto {
  @ApiProperty({ example: '2026-10-16' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(HHMM_REGEX, { message: 'horaInicio debe tener formato HH:MM' })
  horaInicio: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  @Matches(HHMM_REGEX, { message: 'horaFin debe tener formato HH:MM' })
  horaFin: string;

  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  slotMinutes?: number;
}

export class CopyAvailabilityDto {
  @ApiProperty({ description: 'Día modelo del que se copian los bloques' })
  @IsDateString()
  sourceFecha: string;

  @ApiProperty({ description: 'Primer día del rango' })
  @IsDateString()
  fromDate: string;

  @ApiProperty({ description: 'Último día del rango' })
  @IsDateString()
  toDate: string;

  @ApiProperty({
    required: false,
    description:
      'Días de la semana a incluir (0=domingo ... 6=sábado). Si se omite, todos los días del rango',
    example: [1, 2, 3, 4, 5],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateKeyOf(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ_NAME });
}

// Las columnas @db.Date se devuelven como medianoche UTC: usar la clave UTC
function blockKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function wallToUtc(dateKey: string, hhmm: string): Date {
  return new Date(`${dateKey}T${hhmm}:00${TZ_OFFSET}`);
}

function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(fromKey: string, toKey: string): number {
  const a = new Date(`${fromKey}T00:00:00Z`).getTime();
  const b = new Date(`${toKey}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

@Injectable()
export class AgendaService {
  constructor(private prisma: PrismaService) {}

  async findAvailability(workshopId: string, from?: string, to?: string) {
    const blocks = await this.prisma.workshopAvailability.findMany({
      where: { workshopId },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    });
    const fromKey = from?.slice(0, 10);
    const toKey = to?.slice(0, 10);
    return blocks.filter((b) => {
      const key = blockKey(b.fecha);
      if (fromKey && key < fromKey) return false;
      if (toKey && key > toKey) return false;
      return true;
    });
  }

  async createBlock(workshopId: string, dto: CreateAvailabilityDto) {
    const key = dto.fecha.slice(0, 10);
    if (minutesOf(dto.horaInicio) >= minutesOf(dto.horaFin)) {
      throw new BadRequestException('La hora de inicio debe ser menor que la de fin');
    }
    return this.prisma.workshopAvailability.create({
      data: {
        workshopId,
        fecha: new Date(`${key}T00:00:00Z`),
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        slotMinutes: dto.slotMinutes ?? 30,
      },
    });
  }

  async copyBlocks(workshopId: string, dto: CopyAvailabilityDto) {
    const sourceKey = dto.sourceFecha.slice(0, 10);
    const fromKey = dto.fromDate.slice(0, 10);
    const toKey = dto.toDate.slice(0, 10);

    if (fromKey > toKey) {
      throw new BadRequestException('El rango de fechas no es válido');
    }
    const span = diffDays(fromKey, toKey);
    if (span > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        'El rango no puede superar los 365 días',
      );
    }

    const source = await this.prisma.workshopAvailability.findMany({
      where: { workshopId },
    });
    const sourceBlocks = source.filter((b) => blockKey(b.fecha) === sourceKey);
    if (sourceBlocks.length === 0) {
      throw new BadRequestException('El día modelo no tiene bloques de horario');
    }

    const existingKeys = new Set(
      source.map((b) => `${blockKey(b.fecha)}|${b.horaInicio}`),
    );

    const toCreate: {
      workshopId: string;
      fecha: Date;
      horaInicio: string;
      horaFin: string;
      slotMinutes: number;
    }[] = [];

    const total = span;
    for (let i = 0; i <= total; i++) {
      const key = addDays(fromKey, i);
      const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
      if (key === sourceKey) continue;
      if (dto.daysOfWeek && !dto.daysOfWeek.includes(weekday)) continue;
      for (const b of sourceBlocks) {
        const marker = `${key}|${b.horaInicio}`;
        if (existingKeys.has(marker)) continue;
        existingKeys.add(marker);
        toCreate.push({
          workshopId,
          fecha: new Date(`${key}T00:00:00Z`),
          horaInicio: b.horaInicio,
          horaFin: b.horaFin,
          slotMinutes: b.slotMinutes,
        });
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.workshopAvailability.createMany({ data: toCreate });
    }

    return { created: toCreate.length };
  }

  async removeBlock(workshopId: string, id: string) {
    const block = await this.prisma.workshopAvailability.findUnique({
      where: { id },
    });
    if (!block) throw new NotFoundException('Bloque no encontrado');
    if (block.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');
    await this.prisma.workshopAvailability.delete({ where: { id } });
    return { ok: true };
  }

  async getSlots(workshopId: string, from?: string, to?: string) {
    const startKey = from?.slice(0, 10) ?? dateKeyOf(new Date());
    const endKey = to?.slice(0, 10) ?? addDays(startKey, 30);
    if (startKey > endKey) throw new BadRequestException('Rango de fechas no válido');

    const blocks = await this.prisma.workshopAvailability.findMany({
      where: { workshopId },
    });
    const inRange = blocks.filter((b) => {
      const key = blockKey(b.fecha);
      return key >= startKey && key <= endKey;
    });

    const appointments = await this.prisma.appointment.findMany({
      where: { workshopId, status: 'BOOKED' },
    });

    const now = Date.now();
    const slots: { startAt: string; endAt: string }[] = [];

    for (const block of inRange) {
      const key = blockKey(block.fecha);
      const startMin = minutesOf(block.horaInicio);
      const endMin = minutesOf(block.horaFin);
      const step = block.slotMinutes || 30;
      for (let m = startMin; m + step <= endMin; m += step) {
        const startAt = wallToUtc(key, `${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
        const endAt = new Date(startAt.getTime() + step * 60000);
        if (startAt.getTime() <= now) continue;
        const taken = appointments.some(
          (a) => startAt.getTime() < a.endAt.getTime() && endAt.getTime() > a.startAt.getTime(),
        );
        if (taken) continue;
        slots.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });
        if (slots.length >= 600) return slots;
      }
    }

    return slots;
  }

  // Verifica que un slot pedido por el cliente (ISO 8601) siga libre:
  // alineado a un bloque de agenda del taller y sin solape con citas BOOKED.
  async isSlotFree(workshopId: string, startISO: string): Promise<boolean> {
    const start = new Date(startISO);
    if (isNaN(start.getTime())) return false;
    const now = Date.now();
    if (start.getTime() <= now) return false;

    // Hora mural (Bolivia) del inicio del slot
    const offsetMs =
      (Number(TZ_OFFSET.slice(1, 3)) * 60 + Number(TZ_OFFSET.slice(4, 6))) *
      60000 *
      (TZ_OFFSET.startsWith('-') ? -1 : 1);
    const local = new Date(start.getTime() + offsetMs);
    const key = local.toISOString().slice(0, 10);
    const wallMin = local.getUTCHours() * 60 + local.getUTCMinutes();

    const blocks = await this.prisma.workshopAvailability.findMany({
      where: { workshopId },
    });
    const block = blocks.find((b) => {
      if (blockKey(b.fecha) !== key) return false;
      const startMin = minutesOf(b.horaInicio);
      const endMin = minutesOf(b.horaFin);
      const step = b.slotMinutes || 30;
      if (wallMin < startMin || wallMin + step > endMin) return false;
      return (wallMin - startMin) % step === 0;
    });
    if (!block) return false;

    const step = block.slotMinutes || 30;
    const endAt = new Date(start.getTime() + step * 60000);
    const appointments = await this.prisma.appointment.findMany({
      where: { workshopId, status: 'BOOKED' },
    });
    const taken = appointments.some(
      (a) => start.getTime() < a.endAt.getTime() && endAt.getTime() > a.startAt.getTime(),
    );
    return !taken;
  }

  async findAppointments(workshopId: string, from?: string, to?: string) {
    const list = await this.prisma.appointment.findMany({
      where: { workshopId, status: 'BOOKED' },
      include: {
        quote: { select: { precio: true, comentario: true } },
        request: {
          select: {
            titulo: true,
            user: { select: { name: true, phone: true } },
            vehicle: { select: { marca: true, modelo: true, placa: true } },
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });
    const fromKey = from?.slice(0, 10);
    const toKey = to?.slice(0, 10);
    return list.filter((a) => {
      const key = dateKeyOf(a.startAt);
      if (fromKey && key < fromKey) return false;
      if (toKey && key > toKey) return false;
      return true;
    });
  }

  async cancelAppointment(workshopId: string, id: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Cita no encontrada');
    if (appt.workshopId !== workshopId) throw new ForbiddenException('Sin permiso');
    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
