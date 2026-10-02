import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {}

  get isConfigured(): boolean {
    return !!this.config.get('RESEND_API_KEY');
  }

  async sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY no configurada');
    }

    const from =
      this.config.get('RESEND_FROM') || 'RepuestoIA <onboarding@resend.dev>';
    const frontendUrl = this.config.get('FRONTEND_URL') || '';
    const loginUrl = `${frontendUrl}/login`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #18181b;">
        <h2 style="margin: 0 0 8px; color: #18181b;">Hola ${name || ''},</h2>
        <p style="color: #52525b; line-height: 1.6;">
          Recibimos una solicitud para restablecer tu contraseña en <strong>RepuestoIA</strong>.
        </p>
        <p style="color: #52525b; line-height: 1.6;">
          Haz clic en el siguiente botón (válido durante <strong>30 minutos</strong>):
        </p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background: #10b981; color: #09090b; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold;">
            Restablecer contraseña
          </a>
        </p>
        <p style="color: #71717a; font-size: 13px; line-height: 1.6;">
          Si no fuiste tú, ignora este correo. Tu contraseña actual no cambiará.<br>
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
          <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
        <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
          © RepuestoIA · <a href="${loginUrl}" style="color: #a1a1aa;">Iniciar sesión</a>
        </p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Restablece tu contraseña - RepuestoIA',
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Resend falló (${res.status}): ${body}`);
      throw new Error(`No se pudo enviar el correo (${res.status})`);
    }

    this.logger.log(`Correo de restablecimiento enviado a ${to}`);
  }
}
