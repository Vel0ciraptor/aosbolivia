import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestCategory } from '../common/enums';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async create(userId: string, dto: CreateRequestDto) {
    // Parsear con IA Mock
    const parsed = this.aiService.parseRequest(dto.descripcion);

    const categoria = (dto.categoria || parsed.categoria) as RequestCategory;
    const titulo = parsed.resumen;

    const request = await this.prisma.request.create({
      data: {
        userId,
        vehicleId: dto.vehicleId,
        categoria,
        titulo,
        descripcion: dto.descripcion,
        aiParsed: parsed as any,
      },
      include: {
        vehicle: true,
        user: { select: { name: true, email: true } },
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.request.findMany({
      include: {
        user: { select: { name: true, email: true } },
        vehicle: true,
        _count: { select: { quotes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.request.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        vehicle: true,
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

  async updateStatus(id: string, status: string) {
    return this.prisma.request.update({
      where: { id },
      data: { estado: status as any },
    });
  }
}
