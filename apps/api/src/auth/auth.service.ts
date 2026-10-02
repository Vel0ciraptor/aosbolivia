import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterDto,
  LoginDto,
  RefreshDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { MailService } from './mail.service';
import { Role } from '../common/enums';

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutos

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto, role: Role = Role.CLIENT) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Use transaction to ensure both user and profile are created together
    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          password: hashedPassword,
          role,
        },
      });

      if (role === Role.PROVIDER) {
        await tx.provider.create({
          data: {
            userId: u.id,
            nombre: u.name + ' Repuestos',
            telefono: u.phone || '',
            email: u.email,
            direccion: 'Dirección no especificada',
            latitud: 10.4806,
            longitud: -66.9036,
            estado: 'ACTIVE',
          },
        });
      } else if (role === Role.WORKSHOP) {
        await tx.workshop.create({
          data: {
            userId: u.id,
            nombre: u.name + ' Taller',
            telefono: u.phone || '',
            direccion: 'Dirección no especificada',
            latitud: 10.495,
            longitud: -66.856,
            estado: 'ACTIVE',
            horario: {},
          },
        });
      } else if (role === Role.TOW_SERVICE) {
        await tx.towService.create({
          data: {
            userId: u.id,
            nombre: u.name + ' Grúa',
            telefono: u.phone || '',
            direccion: 'Dirección no especificada',
            latitud: 10.505,
            longitud: -66.92,
            costoBase: 25.0,
            costoKm: 2.5,
            cobertura: 50.0,
            estado: 'ACTIVE',
          },
        });
      }

      return u;
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    // Primero buscar en usuarios normales
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user && user.password) {
      const passwordMatch = await bcrypt.compare(dto.password, user.password);
      if (passwordMatch) {
        return this.generateTokens(user);
      }
    }

    // Si no se encontró como usuario normal, buscar como WorkshopUser
    const workshopUser = await this.prisma.workshopUser.findFirst({
      where: { email: dto.email, status: 'ACTIVE' },
      include: { workshop: true },
    });

    if (workshopUser) {
      const passwordMatch = await bcrypt.compare(
        dto.password,
        workshopUser.password,
      );
      if (passwordMatch) {
        return this.generateWorkshopUserTokens(workshopUser);
      }
    }

    throw new UnauthorizedException('Credenciales incorrectas');
  }

  async refresh(dto: RefreshDto) {
    let payload: any;
    try {
      payload = this.jwt.verify(dto.refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sesión expirada, inicia sesión nuevamente');
    }

    // Refrescar sesión de WorkshopUser
    if (payload.role === 'WORKSHOP_USER') {
      const workshopUser = await this.prisma.workshopUser.findUnique({
        where: { id: payload.sub },
      });
      if (!workshopUser || workshopUser.status !== 'ACTIVE') {
        throw new UnauthorizedException('Sesión expirada, inicia sesión nuevamente');
      }
      return this.generateWorkshopUserTokens(workshopUser);
    }

    // Refrescar sesión de usuario normal
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('Sesión expirada, inicia sesión nuevamente');
    }
    return this.generateTokens(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Respuesta idéntica exista o no el correo (no revelar cuentas)
    const response: { success: boolean; sent?: boolean; devResetUrl?: string } =
      { success: true };

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      this.logger.warn(`forgot-password: correo no registrado (${dto.email})`);
      return response;
    }

    // Invalidar tokens anteriores sin usar
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3003';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    if (this.mail.isConfigured) {
      try {
        await this.mail.sendPasswordResetEmail(user.email, user.name, resetUrl);
        response.sent = true;
      } catch (err: any) {
        this.logger.error(`No se pudo enviar el correo: ${err?.message || err}`);
      }
    }

    // Sin correo configurado (o falló) en desarrollo, devolvemos el enlace directamente
    if (!response.sent && process.env.NODE_ENV !== 'production') {
      response.devResetUrl = resetUrl;
      this.logger.warn(`forgot-password (dev): ${resetUrl}`);
    }

    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'El enlace de restablecimiento no es válido o expiró. Solicita uno nuevo.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    this.logger.log(`Contraseña restablecida para user ${record.userId}`);
    return { success: true };
  }

  async getWorkshopUserProfile(workshopUserId: string) {
    const profile = await this.prisma.workshopUser.findUnique({
      where: { id: workshopUserId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        workshopId: true,
        workshop: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });
    if (!profile) return null;
    return {
      ...profile,
      workshopUserRole: profile.role,
      role: 'WORKSHOP_USER',
    };
  }

  private generateWorkshopUserTokens(workshopUser: {
    id: string;
    email: string;
    role: string;
    workshopId: string;
  }) {
    const payload = {
      sub: workshopUser.id,
      email: workshopUser.email,
      role: 'WORKSHOP_USER',
      workshopUserRole: workshopUser.role,
      workshopId: workshopUser.workshopId,
    };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '8h',
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: workshopUser.id,
        email: workshopUser.email,
        role: 'WORKSHOP_USER',
        workshopUserRole: workshopUser.role,
        workshopId: workshopUser.workshopId,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) return null;

    // Enriquecer con datos del perfil según rol
    const enriched: any = { ...user };
    if (user.role === 'WORKSHOP') {
      const workshop = await this.prisma.workshop.findUnique({
        where: { userId: user.id },
      });
      if (workshop) enriched.workshopId = workshop.id;
    }
    return enriched;
  }

  private generateTokens(user: {
    id: string;
    email: string;
    role: Role | string;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
