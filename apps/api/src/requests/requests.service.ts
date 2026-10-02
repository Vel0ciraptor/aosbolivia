import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AgendaService } from '../agenda/agenda.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestCategory } from '../common/enums';

interface RequestUser {
  id: string;
  role: string;
  workshopId?: string;
}

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private agendaService: AgendaService,
  ) {}

  async create(userId: string, dto: CreateRequestDto) {
    // Parsear con IA Mock
    const parsed = this.aiService.parseRequest(dto.descripcion);

    const categoria = (dto.categoria || parsed.categoria) as RequestCategory;
    const titulo = parsed.resumen;

    if (dto.workshopId) {
      const workshop = await this.prisma.workshop.findUnique({
        where: { id: dto.workshopId },
        select: { id: true, estado: true, nombre: true },
      });
      if (!workshop || workshop.estado !== 'ACTIVE') {
        throw new BadRequestException('El taller elegido no está disponible');
      }
      if (!dto.fechaCita) {
        throw new BadRequestException(
          'Debes elegir una cita disponible en el taller de confianza',
        );
      }
      const free = await this.agendaService.isSlotFree(
        dto.workshopId,
        dto.fechaCita,
      );
      if (!free) {
        throw new ConflictException(
          'Esa cita ya no está disponible, escoge otro horario',
        );
      }
    }

    const request = await this.prisma.request.create({
      data: {
        userId,
        vehicleId: dto.vehicleId,
        workshopId: dto.workshopId,
        categoria,
        titulo,
        descripcion: dto.descripcion,
        aiParsed: parsed as any,
        fechaCita: dto.fechaCita ? new Date(dto.fechaCita) : null,
      },
      include: {
        vehicle: true,
        user: { select: { name: true, email: true } },
        workshop: { select: { id: true, nombre: true } },
      },
    });

    return { request, aiParsed: parsed };
  }

  async findAllByUser(userId: string) {
    return this.prisma.request.findMany({
      where: { userId },
      include: {
        vehicle: true,
        quotes: {
          include: { provider: { select: { nombre: true } } },
        },
        workshop: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Visibilidad de las solicitudes dirigidas: las que tienen taller de
  // confianza solo las ve ese taller (y el admin); el resto son públicas.
  private isWorkshopActor(user?: RequestUser): user is RequestUser {
    return (
      !!user &&
      (user.role === 'WORKSHOP' || user.role === 'WORKSHOP_USER') &&
      !!user.workshopId
    );
  }

  private visibilityWhere(user?: RequestUser) {
    if (!user || user.role === 'ADMIN') return {};
    if (this.isWorkshopActor(user)) {
      return { OR: [{ workshopId: null }, { workshopId: user.workshopId }] };
    }
    return { workshopId: null };
  }

  async findAll(user?: RequestUser) {
    return this.prisma.request.findMany({
      where: this.visibilityWhere(user),
      include: {
        user: { select: { name: true, email: true } },
        vehicle: true,
        workshop: { select: { id: true, nombre: true } },
        _count: { select: { quotes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private canAccess(request: { userId: string; workshopId: string | null }, user?: RequestUser) {
    if (!request.workshopId) return true;
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (request.userId === user.id) return true;
    return this.isWorkshopActor(user) && user.workshopId === request.workshopId;
  }

  async findOne(id: string, user?: RequestUser) {
    const found = await this.prisma.request.findUnique({
      where: { id },
      select: { id: true, userId: true, workshopId: true },
    });
    if (!found) return null;
    if (!this.canAccess(found, user)) {
      throw new ForbiddenException('No tienes acceso a esta solicitud');
    }

    return this.prisma.request.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        vehicle: true,
        workshop: { select: { id: true, nombre: true } },
        quotes: {
          include: {
            provider: { select: { nombre: true, telefono: true, email: true } },
          },
        },
        messages: {
          include: { sender: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async updateStatus(id: string, status: string, user?: RequestUser) {
    const found = await this.prisma.request.findUnique({
      where: { id },
      select: { id: true, userId: true, workshopId: true },
    });
    if (!found) throw new NotFoundException('Solicitud no encontrada');
    if (!this.canAccess(found, user)) {
      throw new ForbiddenException('No tienes acceso a esta solicitud');
    }

    return this.prisma.request.update({
      where: { id },
      data: { estado: status as any },
    });
  }
}
