'use client';

import React, { useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  Download, Upload, X, Loader2, AlertCircle, CheckCircle2, FileText,
} from 'lucide-react';

type Kind = 'inventory' | 'services' | 'vehicles';

interface PreviewItem {
  fila: number;
  sku?: string;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  unidad?: string;
  stock?: number;
  precioCosto?: number;
  precioUnitario?: number;
  precioReferencial?: number;
  duracionEstimada?: number;
  // Vehículos (flota del cliente)
  marca?: string;
  modelo?: string;
  anio?: number;
  motor?: string;
  combustible?: string;
  placa?: string;
  vin?: string;
  esActualizacion: boolean;
}

interface PreviewError {
  fila: number;
  columna: string;
  mensaje: string;
}

interface PreviewResponse {
  totalFilas: number;
  nuevos: number;
  actualizaciones: number;
  rechazados: number;
  items: PreviewItem[];
  errores: PreviewError[];
}

const CONFIG: Record<Kind, {
  template: string;
  preview: string;
  confirm: string;
  payloadKey: 'items' | 'services' | 'vehicles';
  templateName: string;
  title: string;
  entityLabel: string;
  dedupeHint: string;
}> = {
  inventory: {
    template: '/workshops/me/inventory/template',
    preview: '/workshops/me/inventory/excel-preview',
    confirm: '/workshops/me/inventory/excel-confirm',
    payloadKey: 'items',
    templateName: 'plantilla_inventario.xlsx',
    title: 'Importar Inventario desde Excel',
    entityLabel: 'ítems',
    dedupeHint: 'Los existentes (por SKU o nombre) se actualizarán.',
  },
  services: {
    template: '/workshops/me/services/template',
    preview: '/workshops/me/services/excel-preview',
    confirm: '/workshops/me/services/excel-confirm',
    payloadKey: 'services',
    templateName: 'plantilla_servicios.xlsx',
    title: 'Importar Servicios desde Excel',
    entityLabel: 'servicios',
    dedupeHint: 'Los existentes (por código o nombre) se actualizarán.',
  },
  vehicles: {
    template: '/vehicles/excel-template',
    preview: '/vehicles/excel-preview',
    confirm: '/vehicles/excel-confirm',
    payloadKey: 'vehicles',
    templateName: 'plantilla_vehiculos.xlsx',
    title: 'Importar Flota de Vehículos desde Excel',
    entityLabel: 'vehículos',
    dedupeHint: 'Los existentes (por placa o VIN) se actualizarán.',
  },
};

export default function ExcelImportActions({ kind, onImported }: { kind: Kind; onImported: () => void }) {
  const cfg = CONFIG[kind];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      const res = await api.get(cfg.template, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = cfg.templateName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('No se pudo descargar la plantilla.');
    } finally { setDownloading(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      setUploading(true);
      const res = await api.post(cfg.preview, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo procesar el archivo. Verifique que sea la plantilla (.xlsx).');
    } finally { setUploading(false); }
  };

  const handleConfirm = async () => {
    if (!preview || preview.items.length === 0) return;
    try {
      setConfirming(true);
      const res = await api.post(cfg.confirm, { [cfg.payloadKey]: preview.items });
      alert(`Importación completada: ${res.data.creados} ${cfg.entityLabel} creados, ${res.data.actualizados} actualizados.`);
      setPreview(null);
      onImported();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo confirmar la importación.');
    } finally { setConfirming(false); }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={downloading}
          className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
          title={`Descargar ${cfg.templateName}`}
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span>Plantilla Excel</span>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
          title={`Subir un ${cfg.templateName} rellenado`}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <span>{uploading ? 'Procesando...' : 'Importar Excel'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* MODAL DE PREVISUALIZACIÓN */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" /> {cfg.title}
              </h3>
              <button onClick={() => setPreview(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Filas leídas</p>
                <p className="text-xl font-extrabold text-zinc-100 mt-0.5">{preview.totalFilas}</p>
              </div>
              <div className="p-3 bg-zinc-950 border border-emerald-800/40 rounded-xl">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Nuevos</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-0.5">{preview.nuevos}</p>
              </div>
              <div className="p-3 bg-zinc-950 border border-blue-800/40 rounded-xl">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Actualizaciones</p>
                <p className="text-xl font-extrabold text-blue-400 mt-0.5">{preview.actualizaciones}</p>
              </div>
              <div className="p-3 bg-zinc-950 border border-red-800/40 rounded-xl">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Rechazados</p>
                <p className="text-xl font-extrabold text-red-400 mt-0.5">{preview.rechazados}</p>
              </div>
            </div>

            {preview.errores.length > 0 && (
              <div className="mb-4 p-3 bg-red-950/20 border border-red-800/40 rounded-xl space-y-1 max-h-32 overflow-y-auto">
                <p className="text-[10px] text-red-400 font-bold uppercase flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Filas con errores (no se importarán)</p>
                {preview.errores.map((err, i) => (
                  <p key={i} className="text-[11px] text-red-300">Fila {err.fila} · {err.columna}: {err.mensaje}</p>
                ))}
              </div>
            )}

            {preview.items.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-500">
                No hay filas válidas para importar. Corrija la plantilla y vuelva a intentarlo.
              </div>
            ) : (
              <div className="overflow-x-auto mb-4 max-h-72 overflow-y-auto border border-zinc-800 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-950">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                      <th className="py-2 px-3 font-bold">Fila</th>
                      {kind === 'vehicles' ? (
                        <>
                          <th className="py-2 px-3 font-bold">Marca</th>
                          <th className="py-2 px-3 font-bold">Modelo</th>
                          <th className="py-2 px-3 font-bold text-right">Año</th>
                          <th className="py-2 px-3 font-bold">Motor</th>
                          <th className="py-2 px-3 font-bold">Combustible</th>
                          <th className="py-2 px-3 font-bold">Placa</th>
                          <th className="py-2 px-3 font-bold">VIN</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-3 font-bold">{kind === 'inventory' ? 'SKU' : 'Código'}</th>
                          <th className="py-2 px-3 font-bold">Nombre</th>
                          <th className="py-2 px-3 font-bold">Categoría</th>
                          {kind === 'inventory' ? (
                            <>
                              <th className="py-2 px-3 font-bold">Stock</th>
                              <th className="py-2 px-3 font-bold text-right">Costo ($)</th>
                              <th className="py-2 px-3 font-bold text-right">Venta ($)</th>
                            </>
                          ) : (
                            <>
                              <th className="py-2 px-3 font-bold text-right">Precio ($)</th>
                              <th className="py-2 px-3 font-bold text-right">Duración (h)</th>
                            </>
                          )}
                        </>
                      )}
                      <th className="py-2 px-3 font-bold">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((it, i) => (
                      <tr key={i} className="border-b border-zinc-800/60">
                        <td className="py-2 px-3 font-mono text-zinc-500">{it.fila}</td>
                        {kind === 'vehicles' ? (
                          <>
                            <td className="py-2 px-3 text-zinc-200 font-semibold">{it.marca}</td>
                            <td className="py-2 px-3 text-zinc-200 font-semibold">{it.modelo}</td>
                            <td className="py-2 px-3 font-mono text-zinc-300 text-right">{it.anio}</td>
                            <td className="py-2 px-3 text-zinc-400">{it.motor || '—'}</td>
                            <td className="py-2 px-3 text-zinc-400">{it.combustible || '—'}</td>
                            <td className="py-2 px-3 font-mono text-zinc-300">{it.placa || '—'}</td>
                            <td className="py-2 px-3 font-mono text-zinc-500 text-[10px]">{it.vin || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 font-mono text-zinc-400">{it.sku || it.codigo || '—'}</td>
                            <td className="py-2 px-3 text-zinc-200 font-semibold">{it.nombre}</td>
                            <td className="py-2 px-3 text-zinc-400">{it.categoria || '—'}</td>
                            {kind === 'inventory' ? (
                              <>
                                <td className="py-2 px-3 font-mono text-zinc-300">{it.stock ?? 0} <span className="text-[10px] text-zinc-500">{it.unidad}</span></td>
                                <td className="py-2 px-3 font-mono text-zinc-400 text-right">${Number(it.precioCosto || 0).toFixed(2)}</td>
                                <td className="py-2 px-3 font-mono text-zinc-300 text-right">${Number(it.precioUnitario || 0).toFixed(2)}</td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-3 font-mono text-zinc-300 text-right">${Number(it.precioReferencial || 0).toFixed(2)}</td>
                                <td className="py-2 px-3 font-mono text-zinc-400 text-right">{it.duracionEstimada ?? '—'}</td>
                              </>
                            )}
                          </>
                        )}
                        <td className="py-2 px-3">
                          {it.esActualizacion ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">Actualizar</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Nuevo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800">
              <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {cfg.dedupeHint}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPreview(null)} className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl">Cancelar</button>
                <button
                  onClick={handleConfirm}
                  disabled={confirming || preview.items.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {confirming ? 'Importando...' : `Importar ${preview.items.length} ${cfg.entityLabel}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
