import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export interface ExchangeRateInfo {
  venta: number;
  compra: number;
  oficial: number;
  fuente: string;
  fechaEfectiva: Date;
  consultadoEn: Date;
  esFallback?: boolean;
}

@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);
  private cachedRate: ExchangeRateInfo | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Sincronizar al iniciar el servicio
    void this.syncRate().catch((err) =>
      this.logger.warn(`Error en sincronización inicial de tipo de cambio: ${err.message}`),
    );
  }

  /**
   * Consulta diaria a las 06:00 hora local
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailyCron() {
    this.logger.log('Iniciando sincronización programada de tipo de cambio...');
    await this.syncRate();
  }

  /**
   * Sincroniza desde api.dolarbluebolivia.click con fallback resiliente
   */
  async syncRate(): Promise<ExchangeRateInfo> {
    const API_URL = 'https://api.dolarbluebolivia.click/v1/officialRate';
    const FALLBACK_URL = 'https://www.dolarbluebolivia.click/tasas.json';

    let venta = 0;
    let compra = 0;
    let oficial = 0;
    let fuente = 'api.dolarbluebolivia.click';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const json: any = await res.json();
        const data = json?.data || json;
        if (data?.blue?.sell && Number(data.blue.sell) > 0) {
          venta = Number(data.blue.sell);
          compra = Number(data.blue.buy || data.blue.sell);
          oficial = Number(data.official?.sell || data.official?.buy || 6.96);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Fallo consulta principal (${API_URL}): ${err.message}`);
    }

    // Intento con fallback si falló
    if (!venta) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(FALLBACK_URL, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json: any = await res.json();
          const rateData = json['/v1/officialRate']?.data;
          if (rateData?.blue?.sell && Number(rateData.blue.sell) > 0) {
            venta = Number(rateData.blue.sell);
            compra = Number(rateData.blue.buy || rateData.blue.sell);
            oficial = Number(rateData.official?.sell || 6.96);
            fuente = 'dolarbluebolivia.click/tasas.json';
          }
        }
      } catch (err: any) {
        this.logger.warn(`Fallo fallback (${FALLBACK_URL}): ${err.message}`);
      }
    }

    const now = new Date();

    // Si obtuvimos valor válido, guardar en histórico y memoria
    if (venta > 0) {
      try {
        await this.prisma.exchangeRateLog.create({
          data: {
            ventaBlue: venta,
            compraBlue: compra,
            oficial: oficial,
            fuente,
            fechaEfectiva: now,
            consultadoEn: now,
          },
        });
      } catch (dbErr: any) {
        this.logger.warn(`No se pudo persistir en exchangeRateLog: ${dbErr.message}`);
      }

      this.cachedRate = {
        venta,
        compra,
        oficial,
        fuente,
        fechaEfectiva: now,
        consultadoEn: now,
        esFallback: false,
      };

      this.logger.log(`Tipo de cambio actualizado exitosamente: Venta ${venta} BOB/USD (Fuente: ${fuente})`);
      return this.cachedRate;
    }

    // Si fallaron ambas fuentes, buscar último valor histórico en BD
    try {
      const last = await this.prisma.exchangeRateLog.findFirst({
        orderBy: { consultadoEn: 'desc' },
      });
      if (last && Number(last.ventaBlue) > 0) {
        this.cachedRate = {
          venta: Number(last.ventaBlue),
          compra: Number(last.compraBlue),
          oficial: Number(last.oficial),
          fuente: `${last.fuente} (histórico)`,
          fechaEfectiva: last.fechaEfectiva,
          consultadoEn: last.consultadoEn,
          esFallback: true,
        };
        this.logger.warn(`Usando último tipo de cambio registrado en BD: ${this.cachedRate.venta} BOB`);
        return this.cachedRate;
      }
    } catch (e: any) {
      this.logger.error(`Error buscando histórico: ${e.message}`);
    }

    // Respaldo de seguridad final razonable (nunca 0)
    this.cachedRate = {
      venta: 11.86,
      compra: 11.82,
      oficial: 6.96,
      fuente: 'Respaldo seguro por defecto',
      fechaEfectiva: now,
      consultadoEn: now,
      esFallback: true,
    };
    return this.cachedRate;
  }

  async getLatestRate(): Promise<ExchangeRateInfo> {
    if (this.cachedRate) {
      return this.cachedRate;
    }
    return this.syncRate();
  }

  async convertUsdToBob(usd: number): Promise<{ bob: number; rate: number; esFallback?: boolean }> {
    const info = await this.getLatestRate();
    const bob = Math.round(usd * info.venta * 100) / 100;
    return { bob, rate: info.venta, esFallback: info.esFallback };
  }
}
