import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserStatus } from '../common/enums';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      totalClients,
      totalProviders,
      totalWorkshops,
      totalTows,
      totalRequests,
      openRequests,
      totalQuotes,
      acceptedQuotes,
      totalParts,
      totalVehicles,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.CLIENT } }),
      this.prisma.user.count({ where: { role: Role.PROVIDER } }),
      this.prisma.user.count({ where: { role: Role.WORKSHOP } }),
      this.prisma.user.count({ where: { role: Role.TOW_SERVICE } }),
      this.prisma.request.count(),
      this.prisma.request.count({ where: { estado: 'OPEN' } }),
      this.prisma.quote.count(),
      this.prisma.quote.count({ where: { estado: 'ACCEPTED' } }),
      this.prisma.part.count({ where: { estado: 'ACTIVE' } }),
      this.prisma.vehicle.count(),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
    ]);

    const businessStatusCounts = await this.prisma.provider.groupBy({
      by: ['estado'],
      _count: { _all: true },
    }).then((rows) => rows.reduce((acc: Record<string, number>, r) => {
      acc[r.estado] = r._count._all;
      return acc;
    }, {}));

    return {
      users: {
        total: totalUsers,
        clients: totalClients,
        providers: totalProviders,
        workshops: totalWorkshops,
        tows: totalTows,
      },
      requests: {
        total: totalRequests,
        open: openRequests,
      },
      quotes: {
        total: totalQuotes,
        accepted: acceptedQuotes,
      },
      catalog: {
        activeParts: totalParts,
        vehicles: totalVehicles,
      },
      businessStatus: businessStatusCounts,
      recentUsers,
    };
  }

  async listUsers(filters?: { role?: string; status?: string; search?: string }) {
    const where: any = {};
    if (filters?.role) where.role = filters.role;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      const q = filters.search;
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            vehicles: true,
            requests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const userIds = users.map((u) => u.id);
    const [providerCounts, workshopCounts, towCounts] = await Promise.all([
      this.prisma.provider.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: { _all: true } }),
      this.prisma.workshop.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: { _all: true } }),
      this.prisma.towService.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: { _all: true } }),
    ]);
    const pMap = new Map(providerCounts.map((r) => [r.userId, r._count._all]));
    const wMap = new Map(workshopCounts.map((r) => [r.userId, r._count._all]));
    const tMap = new Map(towCounts.map((r) => [r.userId, r._count._all]));
    return users.map((u) => ({
      ...u,
      _count: {
        ...u._count,
        provider: pMap.get(u.id) || 0,
        workshop: wMap.get(u.id) || 0,
        towService: tMap.get(u.id) || 0,
      },
    }));
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        vehicles: true,
        requests: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { _count: { select: { quotes: true } } },
        },
        provider: { include: { _count: { select: { parts: true, quotes: true } } } },
        workshop: { include: { services: true, _count: { select: { quotes: true } } } },
        towService: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateUserStatus(id: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
  }

  async updateUserRole(id: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.id === id && role !== Role.ADMIN) {
      throw new BadRequestException('No puedes degradar tu propia cuenta de administrador.');
    }
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === Role.ADMIN) {
      throw new BadRequestException('No se puede eliminar un usuario administrador.');
    }
    await this.prisma.user.delete({ where: { id } });
    return { id, deleted: true };
  }

  async listProviders() {
    return this.prisma.provider.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, status: true, createdAt: true } },
        _count: { select: { parts: true, quotes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateProviderStatus(id: string, estado: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    return this.prisma.provider.update({
      where: { id },
      data: { estado },
    });
  }

  async listWorkshops() {
    return this.prisma.workshop.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, status: true, createdAt: true } },
        _count: { select: { services: true, quotes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateWorkshopStatus(id: string, estado: string) {
    const ws = await this.prisma.workshop.findUnique({ where: { id } });
    if (!ws) throw new NotFoundException('Taller no encontrado');
    return this.prisma.workshop.update({
      where: { id },
      data: { estado },
    });
  }

  async listTows() {
    return this.prisma.towService.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTowStatus(id: string, estado: string) {
    const tow = await this.prisma.towService.findUnique({ where: { id } });
    if (!tow) throw new NotFoundException('Servicio de grúa no encontrado');
    return this.prisma.towService.update({
      where: { id },
      data: { estado },
    });
  }

  async listAllRequests(filters?: { categoria?: string; estado?: string }) {
    const where: any = {};
    if (filters?.categoria) where.categoria = filters.categoria;
    if (filters?.estado) where.estado = filters.estado;
    return this.prisma.request.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        vehicle: true,
        _count: { select: { quotes: true, messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteRequest(id: string) {
    const req = await this.prisma.request.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    await this.prisma.request.delete({ where: { id } });
    return { id, deleted: true };
  }

  async listAllQuotes(filters?: { estado?: string }) {
    const where: any = {};
    if (filters?.estado) where.estado = filters.estado;
    return this.prisma.quote.findMany({
      where,
      include: {
        provider: { select: { id: true, nombre: true } },
        workshop: { select: { id: true, nombre: true } },
        request: { select: { id: true, titulo: true, categoria: true, estado: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteQuote(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    await this.prisma.quote.delete({ where: { id } });
    return { id, deleted: true };
  }
}
