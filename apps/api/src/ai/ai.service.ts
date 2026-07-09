import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ParsedRequest {
  categoria: 'REPUESTO' | 'TALLER' | 'GRUA' | 'CONSULTA';
  marca?: string;
  modelo?: string;
  anio?: number;
  pieza?: string;
  especialidad?: string;
  ubicacion?: string;
  confianza: number;
  resumen: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  // ─── Parser de texto libre ───────────────────────────────────────────
  parseRequest(text: string): ParsedRequest {
    const lower = text.toLowerCase();

    // Detectar categoría
    const categoria = this.detectCategory(lower);

    // Extraer marca/modelo
    const { marca, modelo } = this.extractVehicle(lower);

    // Extraer año
    const anio = this.extractYear(lower);

    // Extraer pieza o especialidad
    const pieza = this.extractPart(lower);
    const especialidad = this.extractSpecialty(lower);

    const resumen = this.buildSummary(categoria, marca, modelo, anio, pieza, especialidad);

    return {
      categoria,
      marca,
      modelo,
      anio,
      pieza,
      especialidad,
      confianza: 0.85,
      resumen,
    };
  }

  // ─── Chatbot Demo ─────────────────────────────────────────────────────
  async chat(messages: ChatMessage[], userId: string): Promise<string> {
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

    // Saludo inicial
    if (messages.length === 1) {
      return `¡Hola! Soy el asistente de RepuestoIA 🚗\n\nPuedo ayudarte a:\n• Encontrar **repuestos** para tu vehículo\n• Ubicar **talleres** cercanos\n• Solicitar **grúas** de emergencia\n• Resolver **dudas** sobre tu vehículo\n\n¿Qué necesitas hoy?`;
    }

    // Palabras clave para repuestos
    if (this.containsAny(lastMessage, ['repuesto', 'pieza', 'parte', 'bomba', 'filtro', 'pastilla', 'alternador', 'batería', 'freno'])) {
      const parsed = this.parseRequest(lastMessage);
      const parts = await this.searchParts(parsed);
      return this.formatPartsResponse(parsed, parts);
    }

    // Palabras clave para taller
    if (this.containsAny(lastMessage, ['taller', 'mecánico', 'reparar', 'arreglar', 'servicio', 'revisión'])) {
      const workshops = await this.prisma.workshop.findMany({
        take: 3,
        include: { services: { take: 3 } },
      });
      return this.formatWorkshopsResponse(workshops);
    }

    // Palabras clave para grúa
    if (this.containsAny(lastMessage, ['grúa', 'remolque', 'varado', 'accidente', 'auxilio', 'asistencia'])) {
      const tows = await this.prisma.towService.findMany({ take: 3 });
      return this.formatTowsResponse(tows);
    }

    // Diagnóstico básico
    if (this.containsAny(lastMessage, ['enciende', 'arranca', 'ruido', 'humo', 'falla', 'problema', 'luz', 'testigo'])) {
      return this.generateDiagnosis(lastMessage);
    }

    // Respuesta genérica
    return `Entiendo que necesitas ayuda con tu vehículo. ¿Podrías describir con más detalle qué necesitas?\n\nPor ejemplo:\n• "Necesito una **bomba de gasolina** para mi Toyota Hilux 2019"\n• "Busco un **taller** especializado en transmisión"\n• "Necesito una **grúa** urgente"`;
  }

  // ─── Buscar partes compatibles ────────────────────────────────────────
  async searchParts(parsed: ParsedRequest) {
    const where: any = { estado: 'ACTIVE' };

    if (parsed.marca) {
      where.marca = { contains: parsed.marca, mode: 'insensitive' };
    }
    if (parsed.modelo) {
      where.modelo = { contains: parsed.modelo, mode: 'insensitive' };
    }
    if (parsed.anio) {
      where.anioDesde = { lte: parsed.anio };
      where.anioHasta = { gte: parsed.anio };
    }
    if (parsed.pieza) {
      where.nombre = { contains: parsed.pieza, mode: 'insensitive' };
    }

    return this.prisma.part.findMany({
      where,
      take: 5,
      include: { provider: { select: { nombre: true, telefono: true } } },
      orderBy: { precio: 'asc' },
    });
  }

  // ─── Helpers privados ─────────────────────────────────────────────────
  private detectCategory(text: string): ParsedRequest['categoria'] {
    if (this.containsAny(text, ['grúa', 'remolque', 'varado', 'auxilio'])) return 'GRUA';
    if (this.containsAny(text, ['taller', 'mecánico', 'reparar', 'arreglar'])) return 'TALLER';
    if (this.containsAny(text, ['repuesto', 'pieza', 'parte', 'bomba', 'filtro', 'pastilla', 'alternador', 'batería', 'amortiguador'])) return 'REPUESTO';
    return 'CONSULTA';
  }

  private extractVehicle(text: string): { marca?: string; modelo?: string } {
    const vehicleMap: Record<string, { marca: string; modelos: string[] }> = {
      toyota: { marca: 'Toyota', modelos: ['hilux', 'corolla', 'camry', 'rav4', 'land cruiser', 'yaris', 'fortuner'] },
      ford: { marca: 'Ford', modelos: ['explorer', 'f-150', 'ranger', 'escape', 'fusion', 'mustang'] },
      chevrolet: { marca: 'Chevrolet', modelos: ['silverado', 'tahoe', 'equinox', 'malibu', 'spark', 'aveo'] },
      nissan: { marca: 'Nissan', modelos: ['frontier', 'pathfinder', 'altima', 'sentra', 'versa', 'x-trail'] },
      honda: { marca: 'Honda', modelos: ['civic', 'accord', 'crv', 'pilot', 'fit'] },
      hyundai: { marca: 'Hyundai', modelos: ['tucson', 'santa fe', 'elantra', 'accent', 'sonata'] },
      kia: { marca: 'Kia', modelos: ['sportage', 'sorento', 'rio', 'cerato', 'picanto'] },
      volkswagen: { marca: 'Volkswagen', modelos: ['jetta', 'passat', 'tiguan', 'golf', 'amarok'] },
    };

    for (const [key, value] of Object.entries(vehicleMap)) {
      if (text.includes(key)) {
        const foundModelo = value.modelos.find((m) => text.includes(m));
        return { marca: value.marca, modelo: foundModelo };
      }
    }
    return {};
  }

  private extractYear(text: string): number | undefined {
    const match = text.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
    return match ? parseInt(match[0]) : undefined;
  }

  private extractPart(text: string): string | undefined {
    const parts = [
      'bomba de gasolina', 'bomba de agua', 'filtro de aceite', 'filtro de aire',
      'pastillas de freno', 'disco de freno', 'alternador', 'batería',
      'amortiguador', 'correa de distribución', 'bujías', 'termostato',
      'radiador', 'compresor de aire', 'embrague', 'clutch',
    ];
    return parts.find((p) => text.includes(p));
  }

  private extractSpecialty(text: string): string | undefined {
    const specialties = ['frenos', 'suspensión', 'transmisión', 'motor', 'eléctrico', 'carrocería', 'aire acondicionado'];
    return specialties.find((s) => text.includes(s));
  }

  private buildSummary(
    categoria: string,
    marca?: string,
    modelo?: string,
    anio?: number,
    pieza?: string,
    especialidad?: string,
  ): string {
    if (categoria === 'REPUESTO' && pieza) {
      return `Búsqueda de ${pieza}${marca ? ` para ${marca}` : ''}${modelo ? ` ${modelo}` : ''}${anio ? ` ${anio}` : ''}`;
    }
    if (categoria === 'TALLER' && especialidad) {
      return `Taller especializado en ${especialidad}`;
    }
    if (categoria === 'GRUA') {
      return 'Servicio de grúa / asistencia en carretera';
    }
    return `Consulta automotriz: ${categoria.toLowerCase()}`;
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((k) => text.includes(k));
  }

  private formatPartsResponse(parsed: ParsedRequest, parts: any[]): string {
    if (parts.length === 0) {
      return `No encontré repuestos exactos para tu búsqueda, pero puedo crear una solicitud para que los proveedores te contacten. ¿Quieres que lo haga?`;
    }
    let response = `🔍 Encontré **${parts.length} opciones** para "${parsed.pieza || 'tu pieza'}":\n\n`;
    parts.forEach((p, i) => {
      response += `**${i + 1}. ${p.nombre}**\n`;
      response += `   💰 Precio: $${p.precio}\n`;
      response += `   🏪 Proveedor: ${p.provider.nombre}\n`;
      response += `   📦 Stock: ${p.stock} disponibles\n\n`;
    });
    response += `¿Te gustaría solicitar cotizaciones a estos proveedores?`;
    return response;
  }

  private formatWorkshopsResponse(workshops: any[]): string {
    if (workshops.length === 0) return 'No encontré talleres disponibles en este momento.';
    let response = `🔧 Talleres disponibles:\n\n`;
    workshops.forEach((w, i) => {
      response += `**${i + 1}. ${w.nombre}**\n`;
      response += `   📍 ${w.direccion}\n`;
      response += `   📞 ${w.telefono}\n`;
      if (w.services.length > 0) {
        response += `   🛠️ Servicios: ${w.services.map((s: any) => s.nombre).join(', ')}\n`;
      }
      response += '\n';
    });
    return response;
  }

  private formatTowsResponse(tows: any[]): string {
    if (tows.length === 0) return 'No encontré servicios de grúa disponibles.';
    let response = `🚛 Servicios de grúa disponibles:\n\n`;
    tows.forEach((t, i) => {
      response += `**${i + 1}. ${t.nombre}**\n`;
      response += `   📞 ${t.telefono}\n`;
      response += `   💰 Base: $${t.costoBase} + $${t.costoKm}/km\n`;
      response += `   🗺️ Cobertura: ${t.cobertura}km\n\n`;
    });
    response += `📌 **¿Necesitas asistencia inmediata?** Llama directamente o crea una solicitud de grúa.`;
    return response;
  }

  private generateDiagnosis(text: string): string {
    const symptoms: Record<string, string> = {
      'no enciende': '🔋 **Posibles causas:** Batería descargada, problema en el motor de arranque, o falla en el sistema de inyección. Recomiendo revisar la batería primero.',
      'no arranca': '🔋 **Posibles causas:** Batería descargada, problema en el motor de arranque, o falla en el sistema de inyección. Recomiendo revisar la batería primero.',
      'humo negro': '💨 **Humo negro:** Indica mezcla de combustible rica. Posible falla en inyectores, sensor de flujo de masa de aire (MAF) o filtro de aire obstruido.',
      'humo blanco': '💨 **Humo blanco:** Puede indicar quema de líquido refrigerante. Revisa el nivel del refrigerante y busca posibles fugas.',
      'ruido': '🔊 **Ruido inusual:** Puede ser amortiguadores, frenos, o problemas mecánicos. Necesito más detalles: ¿dónde se escucha y en qué condiciones?',
      'luz': '⚠️ **Luz de advertencia:** Recomiendo hacer un diagnóstico OBD2 para leer los códigos de error exactos.',
    };

    for (const [symptom, response] of Object.entries(symptoms)) {
      if (text.includes(symptom)) return response + '\n\n¿Quieres que busque un taller cercano para revisarlo?';
    }

    return `⚠️ Describe con más detalle el problema (ruidos, luces encendidas, comportamiento del motor) para darte un diagnóstico más preciso.`;
  }
}
