import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

export interface RowError {
  fila: number;
  columna: string;
  mensaje: string;
}

export interface InventoryPreviewItem {
  fila: number;
  sku?: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  unidad: string;
  stock: number;
  precioUnitario: number; // venta
  precioCosto: number;
  esActualizacion: boolean;
  itemIdExistente?: string;
}

export interface ServicePreviewItem {
  fila: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  precioReferencial?: number;
  duracionEstimada?: number;
  esActualizacion: boolean;
  serviceIdExistente?: string;
}

@Injectable()
export class ExcelImportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Genera plantilla Excel oficial para importación de inventario
   */
  generateInventoryTemplate(): Buffer {
    const headers = [
      'SKU',
      'Nombre',
      'Descripción',
      'Categoría',
      'Unidad de Medida',
      'Stock Inicial',
      'Precio de Costo ($)',
      'Precio de Venta ($)',
    ];

    const sampleRows = [
      [
        'FIL-ACE-01',
        'Filtro de Aceite Sintético',
        'Para motores 1.6 a 2.0L',
        'Filtros',
        'unidad',
        15,
        5.5,
        12.0,
      ],
      [
        'PAST-DEL-02',
        'Pastillas de Freno Delanteras',
        'Cerámica alta durabilidad',
        'Frenos',
        'juego',
        8,
        18.0,
        35.0,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 30 },
      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 20 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Genera plantilla Excel oficial para importación de catálogo de servicios
   */
  generateServicesTemplate(): Buffer {
    const headers = [
      'Código',
      'Nombre del Servicio',
      'Descripción',
      'Categoría',
      'Precio Referencial ($)',
      'Duración Estimada (Horas)',
    ];

    const sampleRows = [
      [
        'SRV-AFIN-01',
        'Afinamiento Completo de Motor',
        'Cambio de bujías, filtros y limpieza de inyectores',
        'Mantenimiento Preventivo',
        65.0,
        2.5,
      ],
      [
        'SRV-FREN-02',
        'Cambio de Pastillas y Rectificado',
        'Reemplazo de pastillas delanteras y rectificado de discos',
        'Frenos',
        40.0,
        1.5,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 34 },
      { wch: 45 },
      { wch: 26 },
      { wch: 24 },
      { wch: 26 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servicios');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Previsualiza y valida archivo de inventario
   */
  async previewInventory(workshopId: string, buffer: Buffer) {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('El archivo no es un Excel (.xlsx/.xls) válido.');
    }

    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new BadRequestException('El archivo Excel está vacío.');

    const sheet = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      throw new BadRequestException('El archivo no contiene filas de datos.');
    }

    // Traer inventario existente para detectar SKU o nombres duplicados
    const existentes = await this.prisma.inventoryItem.findMany({
      where: { workshopId },
      select: { id: true, sku: true, nombre: true, stock: true },
    });

    const skuMap = new Map<string, { id: string; stock: number }>();
    const nombreMap = new Map<string, { id: string; stock: number }>();
    existentes.forEach((it) => {
      if (it.sku) skuMap.set(it.sku.trim().toLowerCase(), { id: it.id, stock: it.stock });
      nombreMap.set(it.nombre.trim().toLowerCase(), { id: it.id, stock: it.stock });
    });

    const itemsValidos: InventoryPreviewItem[] = [];
    const errores: RowError[] = [];

    // Fila 0 son encabezados, datos desde fila 1 (índice 1 = fila 2 en Excel)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
        continue; // Fila vacía
      }

      const filaNum = i + 1;
      const sku = row[0] ? String(row[0]).trim() : undefined;
      const nombre = row[1] ? String(row[1]).trim() : '';
      const descripcion = row[2] ? String(row[2]).trim() : undefined;
      const categoria = row[3] ? String(row[3]).trim() : 'General';
      const unidad = row[4] ? String(row[4]).trim() : 'unidad';
      const stock = row[5] !== undefined && row[5] !== null && !isNaN(Number(row[5])) ? Math.max(0, parseInt(row[5], 10)) : 0;
      const precioCosto = row[6] !== undefined && row[6] !== null && !isNaN(Number(row[6])) ? Math.max(0, parseFloat(row[6])) : 0;
      const precioUnitario = row[7] !== undefined && row[7] !== null && !isNaN(Number(row[7])) ? Math.max(0, parseFloat(row[7])) : precioCosto;

      if (!nombre) {
        errores.push({ fila: filaNum, columna: 'Nombre', mensaje: 'El nombre es obligatorio.' });
        continue;
      }

      // Chequeo si ya existe por SKU o nombre
      let esActualizacion = false;
      let itemIdExistente: string | undefined;

      if (sku && skuMap.has(sku.toLowerCase())) {
        esActualizacion = true;
        itemIdExistente = skuMap.get(sku.toLowerCase())!.id;
      } else if (nombreMap.has(nombre.toLowerCase())) {
        esActualizacion = true;
        itemIdExistente = nombreMap.get(nombre.toLowerCase())!.id;
      }

      itemsValidos.push({
        fila: filaNum,
        sku,
        nombre,
        descripcion,
        categoria,
        unidad,
        stock,
        precioCosto,
        precioUnitario,
        esActualizacion,
        itemIdExistente,
      });
    }

    return {
      totalFilas: itemsValidos.length + errores.length,
      nuevos: itemsValidos.filter((it) => !it.esActualizacion).length,
      actualizaciones: itemsValidos.filter((it) => it.esActualizacion).length,
      rechazados: errores.length,
      items: itemsValidos,
      errores,
    };
  }

  /**
   * Confirma e inserta/actualiza transaccionalmente el inventario
   */
  async confirmInventory(
    workshopId: string,
    userId: string,
    userName: string,
    items: InventoryPreviewItem[],
  ) {
    if (!items.length) throw new BadRequestException('No hay items válidos para importar.');

    return this.prisma.$transaction(async (tx) => {
      let creados = 0;
      let actualizados = 0;

      for (const item of items) {
        if (item.esActualizacion && item.itemIdExistente) {
          const actual = await tx.inventoryItem.findUnique({
            where: { id: item.itemIdExistente },
          });

          if (actual) {
            const stockNuevo = item.stock;
            const diff = stockNuevo - actual.stock;

            await tx.inventoryItem.update({
              where: { id: actual.id },
              data: {
                sku: item.sku || actual.sku,
                nombre: item.nombre,
                descripcion: item.descripcion || actual.descripcion,
                categoria: item.categoria || actual.categoria,
                unidad: item.unidad || actual.unidad,
                stock: stockNuevo,
                precioCosto: item.precioCosto,
                precioUnitario: item.precioUnitario,
              },
            });

            if (diff !== 0) {
              await tx.inventoryMovement.create({
                data: {
                  inventoryItemId: actual.id,
                  workshopId,
                  tipo: 'AJUSTE_EXCEL',
                  cantidad: Math.abs(diff),
                  stockAnterior: actual.stock,
                  stockNuevo,
                  usuarioId: userId,
                  usuarioNombre: userName,
                  motivo: `Ajuste masivo por importación Excel (Fila ${item.fila})`,
                },
              });
            }
            actualizados++;
          }
        } else {
          const nuevo = await tx.inventoryItem.create({
            data: {
              workshopId,
              sku: item.sku,
              nombre: item.nombre,
              descripcion: item.descripcion,
              categoria: item.categoria,
              unidad: item.unidad,
              stock: item.stock,
              precioCosto: item.precioCosto,
              precioUnitario: item.precioUnitario,
            },
          });

          if (item.stock > 0) {
            await tx.inventoryMovement.create({
              data: {
                inventoryItemId: nuevo.id,
                workshopId,
                tipo: 'INGRESO_INICIAL',
                cantidad: item.stock,
                stockAnterior: 0,
                stockNuevo: item.stock,
                usuarioId: userId,
                usuarioNombre: userName,
                motivo: `Carga inicial por importación Excel (Fila ${item.fila})`,
              },
            });
          }
          creados++;
        }
      }

      return { ok: true, creados, actualizados, total: creados + actualizados };
    });
  }

  /**
   * Previsualiza y valida catálogo de servicios desde Excel
   */
  async previewServices(workshopId: string, buffer: Buffer) {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('El archivo no es un Excel (.xlsx/.xls) válido.');
    }

    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new BadRequestException('El archivo Excel está vacío.');

    const sheet = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      throw new BadRequestException('El archivo no contiene filas de datos.');
    }

    const existentes = await this.prisma.workshopService.findMany({
      where: { workshopId },
      select: { id: true, codigo: true, nombre: true },
    });

    const codigoMap = new Map<string, string>();
    const nombreMap = new Map<string, string>();
    existentes.forEach((s) => {
      if (s.codigo) codigoMap.set(s.codigo.trim().toLowerCase(), s.id);
      nombreMap.set(s.nombre.trim().toLowerCase(), s.id);
    });

    const itemsValidos: ServicePreviewItem[] = [];
    const errores: RowError[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
        continue;
      }

      const filaNum = i + 1;
      const codigo = row[0] ? String(row[0]).trim() : undefined;
      const nombre = row[1] ? String(row[1]).trim() : '';
      const descripcion = row[2] ? String(row[2]).trim() : undefined;
      const categoria = row[3] ? String(row[3]).trim() : 'Mantenimiento';
      const precioReferencial =
        row[4] !== undefined && row[4] !== null && !isNaN(Number(row[4]))
          ? Math.max(0, parseFloat(row[4]))
          : 0;
      const duracionEstimada =
        row[5] !== undefined && row[5] !== null && !isNaN(Number(row[5]))
          ? Math.max(0, parseFloat(row[5]))
          : 1;

      if (!nombre) {
        errores.push({ fila: filaNum, columna: 'Nombre', mensaje: 'El nombre del servicio es obligatorio.' });
        continue;
      }

      let esActualizacion = false;
      let serviceIdExistente: string | undefined;

      if (codigo && codigoMap.has(codigo.toLowerCase())) {
        esActualizacion = true;
        serviceIdExistente = codigoMap.get(codigo.toLowerCase());
      } else if (nombreMap.has(nombre.toLowerCase())) {
        esActualizacion = true;
        serviceIdExistente = nombreMap.get(nombre.toLowerCase());
      }

      itemsValidos.push({
        fila: filaNum,
        codigo,
        nombre,
        descripcion,
        categoria,
        precioReferencial,
        duracionEstimada,
        esActualizacion,
        serviceIdExistente,
      });
    }

    return {
      totalFilas: itemsValidos.length + errores.length,
      nuevos: itemsValidos.filter((it) => !it.esActualizacion).length,
      actualizaciones: itemsValidos.filter((it) => it.esActualizacion).length,
      rechazados: errores.length,
      items: itemsValidos,
      errores,
    };
  }

  /**
   * Confirma e inserta/actualiza masivamente los servicios
   */
  async confirmServices(workshopId: string, services: ServicePreviewItem[]) {
    if (!services.length) throw new BadRequestException('No hay servicios válidos para importar.');

    return this.prisma.$transaction(async (tx) => {
      let creados = 0;
      let actualizados = 0;

      for (const s of services) {
        if (s.esActualizacion && s.serviceIdExistente) {
          await tx.workshopService.update({
            where: { id: s.serviceIdExistente },
            data: {
              codigo: s.codigo,
              nombre: s.nombre,
              descripcion: s.descripcion,
              categoria: s.categoria,
              precioReferencial: s.precioReferencial,
              duracionEstimada: s.duracionEstimada,
            },
          });
          actualizados++;
        } else {
          await tx.workshopService.create({
            data: {
              workshopId,
              codigo: s.codigo,
              nombre: s.nombre,
              descripcion: s.descripcion,
              categoria: s.categoria,
              precioReferencial: s.precioReferencial,
              duracionEstimada: s.duracionEstimada,
            },
          });
          creados++;
        }
      }

      return { ok: true, creados, actualizados, total: creados + actualizados };
    });
  }
}
