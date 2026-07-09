import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'fallback-secret'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) return null;

    const enriched: any = { ...user };
    if (user.role === 'PROVIDER') {
      const provider = await this.prisma.provider.findUnique({ where: { userId: user.id } });
      if (provider) enriched.providerId = provider.id;
    } else if (user.role === 'WORKSHOP') {
      const workshop = await this.prisma.workshop.findUnique({ where: { userId: user.id } });
      if (workshop) enriched.workshopId = workshop.id;
    } else if (user.role === 'TOW_SERVICE') {
      const tow = await this.prisma.towService.findUnique({ where: { userId: user.id } });
      if (tow) enriched.towServiceId = tow.id;
    }
    return enriched;
  }
}
