import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface SendWhatsAppResult {
  exitoso: boolean;
  waMeUrl: string;
  mensaje: string;
  token?: string;
  respuestaApi?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Genera token criptográfico seguro para aprobación del cliente (expira en 72 horas)
   */
  generateApprovalToken(): { token: string; expiresAt: Date } {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas
    return { token, expiresAt };
  }

  /**
   * Limpia número de teléfono quitando caracteres especiales y asegurando código de país Bolivia (591)
   */
  normalizePhone(phone: string): string {
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 8) {
      return `591${clean}`;
    }
    return clean;
  }

  /**
   * Prepara y registra mensaje de WhatsApp para enviar diagnóstico y solicitud de aprobación
   */
  async sendDiagnosticApproval(params: {
    workshopId: string;
    jobId: string;
    enviadoPorId: string;
    clienteNombre: string;
    clienteTelefono: string;
    vehiculo: string;
    placa?: string;
    diagnostico: string;
    servicios: { nombre: string; precio: number }[];
    totalEstimadoUsd: number;
    totalEstimadoBob: number;
    token: string;
    appUrl?: string;
  }): Promise<SendWhatsAppResult> {
    const baseAppUrl =
      params.appUrl ||
      this.config.get<string>('APP_URL') ||
      'http://localhost:3003';
    const linkAprobacion = `${baseAppUrl}/aprobacion/${params.token}`;

    const listaServicios = params.servicios.length
      ? params.servicios
          .map((s) => `• ${s.nombre}: $${Number(s.precio).toFixed(2)}`)
          .join('\n')
      : '• Revisión y diagnóstico general';

    const mensaje = `🔧 *Estimado/a ${params.clienteNombre}*, le saludamos de parte del taller.

Hemos realizado la inspección de su vehículo *${params.vehiculo}*${params.placa ? ` (Placa: ${params.placa})` : ''}.

📋 *Diagnóstico Mecánico:*
${params.diagnostico}

🛠️ *Trabajos Presupuestados:*
${listaServicios}

💰 *Presupuesto Estimado:*
Total: *$${params.totalEstimadoUsd.toFixed(2)} USD* (~*Bs. ${params.totalEstimadoBob.toFixed(2)}*)

👉 *Por favor revise el detalle y confirme o rechace el presupuesto ingresando a este enlace seguro:*
${linkAprobacion}

_El enlace tiene una validez de 72 horas._`;

    const telefonoNormalizado = this.normalizePhone(params.clienteTelefono);
    const waMeUrl = `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(mensaje)}`;

    let exitoso = true;
    let respuestaApi = 'Enlace de WhatsApp generado correctamente';

    // Opcional: si existe un Webhook/API configurado en variables de entorno, se dispara
    const apiUrl = this.config.get<string>('WHATSAPP_API_URL');
    const apiToken = this.config.get<string>('WHATSAPP_API_TOKEN');

    if (apiUrl && apiToken) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            phone: telefonoNormalizado,
            message: mensaje,
          }),
        });
        if (!res.ok) {
          exitoso = false;
          respuestaApi = `Error HTTP ${res.status}: ${await res.text()}`;
        } else {
          respuestaApi = await res.text();
        }
      } catch (err: any) {
        exitoso = false;
        respuestaApi = `Fallo de conexión API: ${err.message}`;
      }
    }

    // Registrar en auditoría
    try {
      await this.prisma.whatsAppMessageLog.create({
        data: {
          workshopId: params.workshopId,
          jobId: params.jobId,
          destinatario: telefonoNormalizado,
          tipo: 'DIAGNOSTICO_AUTORIZACION',
          enviadoPorId: params.enviadoPorId,
          mensaje,
          exitoso,
          respuestaApi,
        },
      });
    } catch (e: any) {
      this.logger.error(`Error guardando whatsAppMessageLog: ${e.message}`);
    }

    return { exitoso, waMeUrl, mensaje, token: params.token, respuestaApi };
  }

  /**
   * Prepara y registra mensaje de WhatsApp para notificar que el vehículo está listo para entrega
   */
  async sendVehicleReady(params: {
    workshopId: string;
    jobId: string;
    enviadoPorId: string;
    clienteNombre: string;
    clienteTelefono: string;
    vehiculo: string;
    placa?: string;
    tallerNombre: string;
    tallerDireccion: string;
    totalPagarUsd?: number;
    totalPagarBob?: number;
  }): Promise<SendWhatsAppResult> {
    const telefonoNormalizado = this.normalizePhone(params.clienteTelefono);

    const infoCosto =
      params.totalPagarUsd && params.totalPagarUsd > 0
        ? `\n💰 *Total a cancelar:* $${params.totalPagarUsd.toFixed(2)} USD${params.totalPagarBob ? ` (~Bs. ${params.totalPagarBob.toFixed(2)})` : ''}\n`
        : '';

    const mensaje = `✅ *Estimado/a ${params.clienteNombre}*, le informamos que los trabajos en su vehículo *${params.vehiculo}*${params.placa ? ` (Placa: ${params.placa})` : ''} han sido *finalizados con éxito*.

🚗 *Su vehículo ya está listo para ser retirado.*
${infoCosto}
📍 *Taller:* ${params.tallerNombre}
📌 *Dirección:* ${params.tallerDireccion}

¡Agradecemos su confianza!`;

    const waMeUrl = `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(mensaje)}`;
    let exitoso = true;
    let respuestaApi = 'Enlace de WhatsApp generado correctamente';

    const apiUrl = this.config.get<string>('WHATSAPP_API_URL');
    const apiToken = this.config.get<string>('WHATSAPP_API_TOKEN');

    if (apiUrl && apiToken) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            phone: telefonoNormalizado,
            message: mensaje,
          }),
        });
        if (!res.ok) {
          exitoso = false;
          respuestaApi = `Error HTTP ${res.status}: ${await res.text()}`;
        } else {
          respuestaApi = await res.text();
        }
      } catch (err: any) {
        exitoso = false;
        respuestaApi = `Fallo de conexión API: ${err.message}`;
      }
    }

    try {
      await this.prisma.whatsAppMessageLog.create({
        data: {
          workshopId: params.workshopId,
          jobId: params.jobId,
          destinatario: telefonoNormalizado,
          tipo: 'VEHICULO_LISTO',
          enviadoPorId: params.enviadoPorId,
          mensaje,
          exitoso,
          respuestaApi,
        },
      });
    } catch (e: any) {
      this.logger.error(`Error guardando whatsAppMessageLog: ${e.message}`);
    }

    return { exitoso, waMeUrl, mensaje, respuestaApi };
  }
}
