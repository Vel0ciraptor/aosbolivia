import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
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

export class ApplyWeeklyDto {
  @ApiProperty({
    description: 'Días de atención (0=domingo ... 6=sábado)',
    example: [1, 2, 3, 4, 5],
  })
  @IsArray()
  @IsInt({ each: true })
  dias: number[];

  @ApiProperty({
    description: 'Rangos horarios que se repiten cada día elegido',
    example: [
      { inicio: '08:00', fin: '12:00' },
      { inicio: '14:00', fin: '18:00' },
    ],
  })
  @IsArray()
  rangos: { inicio: string; fin: string }[];

  @ApiProperty({
    required: false,
    default: 30,
    description: 'Duración de cada cita (minutos)',
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  slotMinutes?: number;

  @ApiProperty({
    required: false,
    default: 90,
    description: 'Cuántos días hacia adelante se genera la agenda',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  horizonteDias?: number;

  @ApiProperty({
    required: false,
    default: 1,
    description: 'Vehículos que el taller puede atender en el mismo slot',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  capacidadSlot?: number;
}

// Horario habitual guardado en Workshop.horario (JSON)
export interface WeeklyPattern {
  dias: number[];
  rangos: { inicio: string; fin: string }[];
  slotMinutes: number;
  horizonteDias: number;
  generadoHasta?: string; // último día materializado (YYYY-MM-DD)
  actualizadoEn?: string;
}

function parseWeeklyPattern(raw: unknown): WeeklyPattern | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<WeeklyPattern>;
  if (!Array.isArray(p.dias) || !Array.isArray(p.rangos)) return null;
  const dias = p.dias.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const rangos = (p.rangos || []).filter(
    (r) =>
      r &&
      typeof r.inicio === 'string' &&
      typeof r.fin === 'string' &&
      HHMM_REGEX.test(r.inicio) &&
      HHMM_REGEX.test(r.fin) &&
      minutesOf(r.inicio) < minutesOf(r.fin),
  );
  if (dias.length === 0 || rangos.length === 0) return null;
  return {
    dias,
    rangos,
    slotMinutes: typeof p.slotMinutes === 'number' ? p.slotMinutes : 30,
    horizonteDias: typeof p.horizonteDias === 'number' ? p.horizonteDias : 90,
    generadoHasta:
      typeof p.generadoHasta === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.generadoHasta)
        ? p.generadoHasta
        : undefined,
    actualizadoEn:
      typeof p.actualizadoEn === 'string' ? p.actualizadoEn : undefined,
  };
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
    await this.ensureWeeklyPattern(workshopId);
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
      throw new BadRequestException(
        'La hora de inicio debe ser menor que la de fin',
      );
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
      throw new BadRequestException('El rango no puede superar los 365 días');
    }

    const source = await this.prisma.workshopAvailability.findMany({
      where: { workshopId },
    });
    const sourceBlocks = source.filter((b) => blockKey(b.fecha) === sourceKey);
    if (sourceBlocks.length === 0) {
      throw new BadRequestException(
        'El día modelo no tiene bloques de horario',
      );
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

  private validateWeeklyPattern(dto: ApplyWeeklyDto): WeeklyPattern {
    const dias = Array.from(new Set(dto.dias)).sort((a, b) => a - b);
    if (
      dias.length === 0 ||
      dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
    ) {
      throw new BadRequestException(
        'Elige al menos un día válido (0=domingo ... 6=sábado)',
      );
    }
    if (
      !Array.isArray(dto.rangos) ||
      dto.rangos.length === 0 ||
      dto.rangos.length > 4
    ) {
      throw new BadRequestException('Define entre 1 y 4 horarios por día');
    }
    for (const r of dto.rangos) {
      if (
        !r ||
        typeof r.inicio !== 'string' ||
        typeof r.fin !== 'string' ||
        !HHMM_REGEX.test(r.inicio) ||
        !HHMM_REGEX.test(r.fin)
      ) {
        throw new BadRequestException('Los horarios deben tener formato HH:MM');
      }
      if (minutesOf(r.inicio) >= minutesOf(r.fin)) {
        throw new BadRequestException(
          'La hora de fin debe ser mayor que la de inicio',
        );
      }
    }
    const rangos = [...dto.rangos].sort(
      (a, b) => minutesOf(a.inicio) - minutesOf(b.inicio),
    );
    for (let i = 1; i < rangos.length; i++) {
      if (minutesOf(rangos[i].inicio) < minutesOf(rangos[i - 1].fin)) {
        throw new BadRequestException('Los horarios no pueden solaparse');
      }
    }
    return {
      dias,
      rangos,
      slotMinutes: dto.slotMinutes ?? 30,
      horizonteDias: dto.horizonteDias ?? 90,
    };
  }

  // Crea los bloques concretos del patrón en [fromKey, toKey], sin duplicar
  // ni pisar bloques existentes (los bloques borrados manualmente se respetan).
  private async materializeRange(
    workshopId: string,
    pattern: WeeklyPattern,
    fromKey: string,
    toKey: string,
  ): Promise<number> {
    const span = diffDays(fromKey, toKey);
    if (span < 0) return 0;

    const existing = await this.prisma.workshopAvailability.findMany({
      where: {
        workshopId,
        fecha: {
          gte: new Date(`${fromKey}T00:00:00Z`),
          lte: new Date(`${toKey}T00:00:00Z`),
        },
      },
      select: { fecha: true, horaInicio: true, horaFin: true },
    });

    const byKey = new Map<string, { inicio: string; fin: string }[]>();
    for (const b of existing) {
      const key = blockKey(b.fecha);
      const list = byKey.get(key) ?? [];
      list.push({ inicio: b.horaInicio, fin: b.horaFin });
      byKey.set(key, list);
    }

    const toCreate: {
      workshopId: string;
      fecha: Date;
      horaInicio: string;
      horaFin: string;
      slotMinutes: number;
    }[] = [];

    for (let i = 0; i <= span; i++) {
      const key = addDays(fromKey, i);
      const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
      if (!pattern.dias.includes(weekday)) continue;
      const list = byKey.get(key) ?? [];
      for (const r of pattern.rangos) {
        const s = minutesOf(r.inicio);
        const e = minutesOf(r.fin);
        const overlaps = list.some(
          (o) => s < minutesOf(o.fin) && e > minutesOf(o.inicio),
        );
        if (overlaps) continue;
        list.push({ inicio: r.inicio, fin: r.fin });
        toCreate.push({
          workshopId,
          fecha: new Date(`${key}T00:00:00Z`),
          horaInicio: r.inicio,
          horaFin: r.fin,
          slotMinutes: pattern.slotMinutes,
        });
      }
      byKey.set(key, list);
    }

    if (toCreate.length > 0) {
      await this.prisma.workshopAvailability.createMany({ data: toCreate });
    }
    return toCreate.length;
  }

  // Guarda el horario habitual en Workshop.horario y genera la agenda.
  async applyWeeklyPattern(workshopId: string, dto: ApplyWeeklyDto) {
    const pattern = this.validateWeeklyPattern(dto);
    const todayKey = dateKeyOf(new Date());
    const targetKey = addDays(todayKey, pattern.horizonteDias);
    const created = await this.materializeRange(
      workshopId,
      pattern,
      todayKey,
      targetKey,
    );
    const saved: WeeklyPattern = {
      ...pattern,
      generadoHasta: targetKey,
      actualizadoEn: new Date().toISOString(),
    };
    const capacidadSlot =
      dto.capacidadSlot !== undefined
        ? Math.min(20, Math.max(1, Math.trunc(dto.capacidadSlot)))
        : undefined;
    await this.prisma.workshop.update({
      where: { id: workshopId },
      data: {
        horario: saved as unknown as Prisma.InputJsonValue,
        ...(capacidadSlot !== undefined ? { capacidadSlot } : {}),
      },
    });
    return { horario: saved, created, hasta: targetKey, capacidadSlot };
  }

  // Vehículos que el taller puede atender en el mismo slot
  private async getCapacity(workshopId: string): Promise<number> {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      select: { capacidadSlot: true },
    });
    return Math.max(1, workshop?.capacidadSlot ?? 1);
  }

  // Hora mural (Bolivia) de un instante: clave de día y minutos desde 00:00
  private wallInfo(start: Date): { key: string; wallMin: number } {
    const offsetMs =
      (Number(TZ_OFFSET.slice(1, 3)) * 60 + Number(TZ_OFFSET.slice(4, 6))) *
      60000 *
      (TZ_OFFSET.startsWith('-') ? -1 : 1);
    const local = new Date(start.getTime() + offsetMs);
    return {
      key: local.toISOString().slice(0, 10),
      wallMin: local.getUTCHours() * 60 + local.getUTCMinutes(),
    };
  }

  // Extiende la agenda generada con el patrón guardado hacia el futuro
  // (solo días aún no generados: así las excepciones manuales se respetan).
  private async ensureWeeklyPattern(workshopId: string): Promise<number> {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      select: { horario: true },
    });
    const pattern = parseWeeklyPattern(workshop?.horario);
    if (!pattern) return 0;

    const todayKey = dateKeyOf(new Date());
    const targetKey = addDays(todayKey, pattern.horizonteDias);
    const nextKey = pattern.generadoHasta
      ? addDays(pattern.generadoHasta, 1)
      : todayKey;
    const fromKey = nextKey > todayKey ? nextKey : todayKey;
    if (fromKey > targetKey) return 0;

    const created = await this.materializeRange(
      workshopId,
      pattern,
      fromKey,
      targetKey,
    );
    pattern.generadoHasta = targetKey;
    pattern.actualizadoEn = new Date().toISOString();
    await this.prisma.workshop.update({
      where: { id: workshopId },
      data: { horario: pattern as unknown as Prisma.InputJsonValue },
    });
    return created;
  }

  async removeBlock(workshopId: string, id: string) {
    const block = await this.prisma.workshopAvailability.findUnique({
      where: { id },
    });
    if (!block) throw new NotFoundException('Bloque no encontrado');
    if (block.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');
    await this.prisma.workshopAvailability.delete({ where: { id } });
    return { ok: true };
  }

  async getSlots(workshopId: string, from?: string, to?: string) {
    const startKey = from?.slice(0, 10) ?? dateKeyOf(new Date());
    const endKey = to?.slice(0, 10) ?? addDays(startKey, 30);
    if (startKey > endKey)
      throw new BadRequestException('Rango de fechas no válido');

    await this.ensureWeeklyPattern(workshopId);
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
    const capacity = await this.getCapacity(workshopId);

    const now = Date.now();
    const slots: { startAt: string; endAt: string }[] = [];

    for (const block of inRange) {
      const key = blockKey(block.fecha);
      const startMin = minutesOf(block.horaInicio);
      const endMin = minutesOf(block.horaFin);
      const step = block.slotMinutes || 30;
      for (let m = startMin; m + step <= endMin; m += step) {
        const startAt = wallToUtc(
          key,
          `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
        );
        const endAt = new Date(startAt.getTime() + step * 60000);
        if (startAt.getTime() <= now) continue;
        const occupancy = appointments.filter(
          (a) =>
            startAt.getTime() < a.endAt.getTime() &&
            endAt.getTime() > a.startAt.getTime(),
        ).length;
        if (occupancy >= capacity) continue;
        slots.push({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        });
        if (slots.length >= 600) return slots;
      }
    }

    return slots;
  }

  // Verifica que un slot pedido por el cliente (ISO 8601) siga libre:
  // alineado a un bloque de agenda y con aforo (capacidad) disponible.
  async isSlotFree(workshopId: string, startISO: string): Promise<boolean> {
    const start = new Date(startISO);
    if (isNaN(start.getTime())) return false;
    if (start.getTime() <= Date.now()) return false;

    const { key, wallMin } = this.wallInfo(start);
    const block = await this.findBlockAt(workshopId, key, wallMin, true);
    if (!block) return false;

    const step = block.slotMinutes || 30;
    const endAt = new Date(start.getTime() + step * 60000);
    const [appointments, capacity] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { workshopId, status: 'BOOKED' },
      }),
      this.getCapacity(workshopId),
    ]);
    const occupancy = appointments.filter(
      (a) =>
        start.getTime() < a.endAt.getTime() && endAt.getTime() > a.startAt.getTime(),
    ).length;
    return occupancy < capacity;
  }

  // Duración del slot: el bloque de agenda que lo contiene (fallback 60 min)
  async getSlotEnd(workshopId: string, startISO: string): Promise<Date> {
    const start = new Date(startISO);
    const { key, wallMin } = this.wallInfo(start);
    const block = await this.findBlockAt(workshopId, key, wallMin, false);
    const step = block?.slotMinutes || 60;
    return new Date(start.getTime() + step * 60000);
  }

  // Bloque de agenda que contiene una hora mural dada
  private async findBlockAt(
    workshopId: string,
    key: string,
    wallMin: number,
    requireAlignment: boolean,
  ) {
    const blocks = await this.prisma.workshopAvailability.findMany({
      where: { workshopId },
    });
    return (
      blocks.find((b) => {
        if (blockKey(b.fecha) !== key) return false;
        const startMin = minutesOf(b.horaInicio);
        const endMin = minutesOf(b.horaFin);
        const step = b.slotMinutes || 30;
        if (wallMin < startMin || wallMin + step > endMin) return false;
        if (!requireAlignment) return true;
        return (wallMin - startMin) % step === 0;
      }) ?? null
    );
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
    if (appt.workshopId !== workshopId)
      throw new ForbiddenException('Sin permiso');
    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
