import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Role } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
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
            latitud: 10.4950,
            longitud: -66.8560,
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
            latitud: 10.5050,
            longitud: -66.9200,
            costoBase: 25.00,
            costoKm: 2.50,
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.generateTokens(user);
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
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
  }

  private generateTokens(user: { id: string; email: string; role: Role | string }) {
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
