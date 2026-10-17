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
import { WorkshopsService } from '../workshops/workshops.service';
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
    private workshopsService: WorkshopsService,
  ) {}

  async create(userId: string, dto: CreateRequestDto) {
    // Parsear con IA Mock
    const parsed = this.aiService.parseRequest(dto.descripcion);

    const categoria = (dto.categoria || parsed.categoria) as RequestCategory;
    const titulo = parsed.resumen;
    const modalidad = dto.modalidad || 'PROGRAMADO';

    if (modalidad === 'EMERGENCIA') {
      // EMERGENCIA: Notifica a toda la red, no exige taller fijo ni cita
    } else if (modalidad === 'URGENCIA') {
      // URGENCIA: Dirigida al taller de confianza, atención hoy mismo sin exigir cita fija
      if (!dto.workshopId) {
        throw new BadRequestException(
          'Para una solicitud de urgencia debes seleccionar tu taller de confianza',
        );
      }
      const workshop = await this.prisma.workshop.findUnique({
        where: { id: dto.workshopId },
        select: { id: true, estado: true, nombre: true },
      });
      if (!workshop || workshop.estado !== 'ACTIVE') {
        throw new BadRequestException('El taller elegido no está disponible');
      }
    } else {
      // PROGRAMADO: Requiere validación de cita y capacidad si tiene taller de confianza
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
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.request.create({
        data: {
          userId,
          vehicleId: dto.vehicleId,
          workshopId: modalidad === 'EMERGENCIA' ? null : dto.workshopId,
          categoria,
          titulo,
          descripcion: dto.descripcion,
          aiParsed: parsed as any,
          modalidad,
          fechaCita: dto.fechaCita ? new Date(dto.fechaCita) : null,
        },
        include: {
          vehicle: true,
          user: { select: { name: true, email: true } },
          workshop: { select: { id: true, nombre: true } },
        },
      });

      // Reservar el slot si es programada con cita
      if (modalidad === 'PROGRAMADO' && created.workshopId && created.fechaCita) {
        const endAt = await this.agendaService.getSlotEnd(
          created.workshopId,
          created.fechaCita.toISOString(),
        );
        await tx.appointment.create({
          data: {
            workshopId: created.workshopId,
            requestId: created.id,
            clientUserId: userId,
            startAt: created.fechaCita,
            endAt,
            status: 'BOOKED',
          },
        });
      }

      // Notificaciones según modalidad
      if (modalidad === 'EMERGENCIA') {
        const talleresActivos = await tx.workshop.findMany({
          where: { estado: 'ACTIVE' },
          select: { id: true },
        });
        if (talleresActivos.length) {
          await tx.notification.createMany({
            data: talleresActivos.map((w) => ({
              workshopId: w.id,
              tipo: 'EMERGENCY_REQUEST',
              titulo: '🚨 Solicitud de EMERGENCIA',
              mensaje: `Emergencia recibida: ${titulo}. Requiere atención inmediata.`,
              requestId: created.id,
            })),
          });
        }
      } else if (modalidad === 'URGENCIA' && created.workshopId) {
        await tx.notification.create({
          data: {
            workshopId: created.workshopId,
            tipo: 'URGENT_REQUEST',
            titulo: '⚡ Solicitud de URGENCIA (Atención hoy)',
            mensaje: `El cliente necesita atención hoy mismo: ${titulo}.`,
            requestId: created.id,
          },
        });
      }

      return created;
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
  private isWorkshopActor(
    user?: RequestUser,
  ): user is RequestUser & { workshopId: string } {
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

    const updated = await this.prisma.request.update({
      where: { id },
      data: { estado: status as any },
    });

    // Si la solicitud se cancela, se libera el slot reservado
    if (status === 'CANCELLED') {
      await this.prisma.appointment.updateMany({
        where: { requestId: id, status: 'BOOKED' },
        data: { status: 'CANCELLED' },
      });
    }

    return updated;
  }

  // El taller elegido acepta la solicitud dirigida: pasa a IN_PROGRESS,
  // se asegura la cita del cliente y entra al CRM como INGRESANDO.
  async accept(id: string, user?: RequestUser) {
    const found = await this.prisma.request.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        workshopId: true,
        estado: true,
        fechaCita: true,
      },
    });
    if (!found) throw new NotFoundException('Solicitud no encontrada');
    if (!found.workshopId) {
      throw new BadRequestException(
        'Esta solicitud es pública: cotiza normalmente en vez de aceptarla',
      );
    }
    if (!this.isWorkshopActor(user) || user.workshopId !== found.workshopId) {
      throw new ForbiddenException(
        'Solo el taller elegido puede aceptar esta solicitud',
      );
    }
    if (found.estado !== 'OPEN') {
      throw new ConflictException('La solicitud ya fue procesada');
    }

    const workshopId = found.workshopId;

    await this.prisma.request.update({
      where: { id },
      data: { estado: 'IN_PROGRESS' },
    });

    // Asegurar la cita elegida (si el hold sigue libre)
    if (found.fechaCita) {
      const hasAppt = await this.prisma.appointment.findFirst({
        where: { requestId: id, status: 'BOOKED' },
      });
      if (!hasAppt) {
        const start = found.fechaCita;
        const free = await this.agendaService.isSlotFree(
          workshopId,
          start.toISOString(),
        );
        if (free) {
          const endAt = await this.agendaService.getSlotEnd(
            workshopId,
            start.toISOString(),
          );
          await this.prisma.appointment.create({
            data: {
              workshopId,
              requestId: id,
              clientUserId: found.userId,
              startAt: start,
              endAt,
              status: 'BOOKED',
            },
          });
        }
      }
    }

    // Entra al CRM (INGRESANDO) con la cita del cliente
    const existingJob = await this.prisma.workshopJob.findFirst({
      where: { workshopId, requestId: id },
    });
    if (!existingJob) {
      await this.workshopsService.createJobFromRequest(
        workshopId,
        id,
        found.fechaCita ?? undefined,
      );
    }

    return this.prisma.request.findUnique({
      where: { id },
      include: {
        vehicle: true,
        user: { select: { name: true, email: true } },
        workshop: { select: { id: true, nombre: true } },
      },
    });
  }

  // El taller elegido rechaza la solicitud dirigida y se libera el slot
  async reject(id: string, user?: RequestUser) {
    const found = await this.prisma.request.findUnique({
      where: { id },
      select: { id: true, workshopId: true, estado: true },
    });
    if (!found) throw new NotFoundException('Solicitud no encontrada');
    if (!found.workshopId) {
      throw new BadRequestException(
        'Esta solicitud es pública: cotiza normalmente en vez de rechazarla',
      );
    }
    if (!this.isWorkshopActor(user) || user.workshopId !== found.workshopId) {
      throw new ForbiddenException(
        'Solo el taller elegido puede rechazar esta solicitud',
      );
    }
    if (found.estado !== 'OPEN') {
      throw new ConflictException('La solicitud ya fue procesada');
    }

    const updated = await this.prisma.request.update({
      where: { id },
      data: { estado: 'REJECTED' },
    });

    await this.prisma.appointment.updateMany({
      where: { requestId: id, status: 'BOOKED' },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }

  // Un taller acepta una solicitud de emergencia disponible de forma atómica
  async acceptEmergency(id: string, user?: RequestUser) {
    if (!this.isWorkshopActor(user) || !user?.workshopId) {
      throw new ForbiddenException(
        'Solo un taller autorizado puede aceptar una emergencia',
      );
    }

    const workshopId = user.workshopId;

    // Actualización atómica para evitar asignaciones duplicadas
    const updated = await this.prisma.request.updateMany({
      where: {
        id,
        modalidad: 'EMERGENCIA',
        estado: 'OPEN',
      },
      data: {
        estado: 'IN_PROGRESS',
        workshopId,
      },
    });

    if (updated.count === 0) {
      throw new ConflictException(
        'Esta emergencia ya fue aceptada por otro taller o ya no está disponible.',
      );
    }

    // Crear trabajo en Llegada de Vehículos
    await this.workshopsService.createJobFromRequest(workshopId, id);

    return this.prisma.request.findUnique({
      where: { id },
      include: {
        vehicle: true,
        user: { select: { name: true, email: true } },
        workshop: { select: { id: true, nombre: true } },
      },
    });
  }
}

