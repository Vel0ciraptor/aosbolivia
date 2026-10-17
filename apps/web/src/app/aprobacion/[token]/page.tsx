'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import {
  Wrench, CheckCircle2, XCircle, AlertTriangle, Clock,
  Car, ShieldCheck, MapPin, Phone, DollarSign, PenTool,
  Loader2, Check, X, FileText, Image as ImageIcon
} from 'lucide-react';

export default function CustomerApprovalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal para firma y confirmación
  const [modalAction, setModalAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Canvas para firma
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/job-approval/${token}`);
      setData(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'No se pudo cargar la información del presupuesto o el enlace es inválido.',
      );
    } finally {
      setLoading(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getSignatureDataUrl = (): string | undefined => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return canvas.toDataURL('image/png');
  };

  const handleDecision = async () => {
    if (!modalAction) return;
    setSubmitting(true);
    try {
      const firma = modalAction === 'APPROVE' ? getSignatureDataUrl() : undefined;
      await axios.post(`${API_URL}/job-approval/${token}/decide`, {
        decision: modalAction === 'APPROVE' ? 'APROBAR' : 'RECHAZAR',
        motivo: modalAction === 'REJECT' ? rejectMotivo : undefined,
        firma,
      });

      setActionSuccess(
        modalAction === 'APPROVE'
          ? '¡Presupuesto aprobado exitosamente! El taller ha sido notificado.'
          : 'Presupuesto rechazado. El taller se pondrá en contacto contigo.',
      );
      setModalAction(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al procesar la decisión.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Cargando presupuesto del vehículo...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100">Enlace no disponible</h2>
          <p className="text-sm text-zinc-400">{error || 'El enlace de aprobación ha expirado o es incorrecto.'}</p>
        </div>
      </div>
    );
  }

  const { workshop } = data;
  const brandColor = workshop?.colorPrimario || '#0284c7';
  const yaDecidido = data.autorizacionEstado === 'APROBADO' || data.autorizacionEstado === 'RECHAZADO';
  const expirado = data.autorizacionEstado === 'EXPIRADO';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16 font-sans">
      {/* Header del Taller */}
      <header
        className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-30"
        style={{ borderBottomColor: `${brandColor}40` }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {workshop?.imageUrl ? (
              <img
                src={workshop.imageUrl}
                alt="Logo"
                className="w-12 h-12 rounded-xl object-contain bg-zinc-950 border border-zinc-800"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white"
                style={{ backgroundColor: brandColor }}
              >
                {workshop?.nombre?.charAt(0) || 'T'}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight text-zinc-100">
                {workshop?.nombre || 'Taller Automotriz'}
              </h1>
              <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                <span className="truncate max-w-[220px]">{workshop?.direccion || 'Bolivia'}</span>
              </p>
            </div>
          </div>
          {workshop?.telefono && (
            <a
              href={`https://wa.me/${workshop.telefono.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Contactar</span>
            </a>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Banner de Estado */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">¡Respuesta registrada!</p>
              <p className="text-xs text-emerald-300 mt-0.5">{actionSuccess}</p>
            </div>
          </div>
        )}

        {data.autorizacionEstado === 'APROBADO' && !actionSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Presupuesto Aprobado</p>
              <p className="text-xs text-emerald-300">
                Aprobaste este presupuesto el {new Date(data.autorizacionDecididoEn || Date.now()).toLocaleString('es-BO')}. El taller ya está trabajando en tu vehículo.
              </p>
            </div>
          </div>
        )}

        {data.autorizacionEstado === 'RECHAZADO' && !actionSuccess && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
            <XCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Presupuesto Rechazado</p>
              <p className="text-xs text-red-300">Has rechazado este presupuesto. El taller no iniciará reparaciones sin un nuevo acuerdo.</p>
            </div>
          </div>
        )}

        {expirado && !yaDecidido && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-400 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Enlace Vencido</p>
              <p className="text-xs text-amber-300">El plazo de 72 horas para aprobar este presupuesto ha finalizado. Consulta con el taller.</p>
            </div>
          </div>
        )}

        {/* Tarjeta del Vehículo */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Vehículo a Reparar</span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-100 mt-1 flex items-center gap-2">
                <Car className="w-6 h-6 text-brand-400 shrink-0" />
                <span>{data.vehiculo}</span>
              </h2>
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400 flex-wrap">
                {data.placa && (
                  <span className="px-2.5 py-1 bg-zinc-800 rounded-lg font-mono font-bold text-zinc-200">
                    Placa: {data.placa}
                  </span>
                )}
                {data.kilometraje && (
                  <span className="text-zinc-400">
                    Kilometraje: {Number(data.kilometraje).toLocaleString()} km
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Diagnóstico Mecánico */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-brand-400 font-bold text-sm">
            <Wrench className="w-4 h-4" />
            <h3>Diagnóstico del Mecánico</h3>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
            {data.diagnosticoMecanico || 'Diagnóstico y revisión técnica general realizada por el taller.'}
          </p>
          {data.diagnosticoImagenes && data.diagnosticoImagenes.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-semibold">
                <ImageIcon className="w-3.5 h-3.5" /> Evidencia y Fotos del Diagnóstico:
              </span>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {data.diagnosticoImagenes.map((imgUrl: string, idx: number) => (
                  <a key={idx} href={imgUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    <img
                      src={imgUrl}
                      alt={`Evidencia ${idx + 1}`}
                      className="w-24 h-24 object-cover rounded-xl border border-zinc-700/80 hover:opacity-90 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Desglose de Trabajos y Repuestos */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-lg">
          <h3 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-400" /> Trabajos y Servicios Presupuestados
          </h3>

          <div className="space-y-2">
            {data.servicios && data.servicios.length > 0 ? (
              data.servicios.map((srv: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-sm"
                >
                  <span className="text-zinc-200 font-medium">{srv.nombre}</span>
                  <span className="font-bold text-zinc-100 font-mono">${Number(srv.precio || 0).toFixed(2)}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-zinc-500 italic p-3 bg-zinc-950 rounded-xl">
                Revisión integral y mano de obra
              </div>
            )}

            {data.piezas && data.piezas.length > 0 && (
              <div className="pt-2 space-y-2">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                  Repuestos / Insumos Necesarios
                </span>
                {data.piezas.map((part: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-sm"
                  >
                    <div>
                      <span className="text-zinc-200 font-medium">{part.nombre}</span>
                      <span className="text-xs text-zinc-500 ml-2">x{part.cantidad || 1}</span>
                    </div>
                    <span className="font-bold text-zinc-100 font-mono">
                      ${(Number(part.precioUnitario || 0) * (part.cantidad || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen Total */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">Presupuesto Total Estimado</p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                (T/C Oficial Venta: {data.tipoCambioVenta} BOB/USD)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-brand-400">
                ${data.totalEstimadoUsd?.toFixed(2)} <span className="text-xs font-bold text-zinc-400">USD</span>
              </p>
              <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
                ~Bs. {data.totalEstimadoBob?.toFixed(2)}
              </p>
            </div>
          </div>
        </section>

        {/* Botones de Acción (si no se ha decidido y no está expirado) */}
        {!yaDecidido && !expirado && (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setModalAction('APPROVE');
                setTimeout(clearCanvas, 100);
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.99]"
            >
              <Check className="w-5 h-5" />
              <span>Aprobar Presupuesto</span>
            </button>
            <button
              onClick={() => setModalAction('REJECT')}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Rechazar o Pedir Modificaciones</span>
            </button>
          </div>
        )}
      </main>

      {/* Modal de Aprobación / Rechazo con Firma Táctil */}
      {modalAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setModalAction(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>

            {modalAction === 'APPROVE' ? (
              <>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                  <PenTool className="w-5 h-5" />
                  <h4>Firma de Aprobación del Cliente</h4>
                </div>
                <p className="text-xs text-zinc-400">
                  Por favor estampa tu firma con el dedo o mouse para autorizar al taller a iniciar los trabajos por{' '}
                  <strong className="text-zinc-200">${data.totalEstimadoUsd?.toFixed(2)} USD</strong> (~Bs.{' '}
                  {data.totalEstimadoBob?.toFixed(2)}).
                </p>

                <div className="bg-white rounded-2xl p-2 shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={220}
                    className="w-full h-44 rounded-xl cursor-crosshair touch-none select-none"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => {
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      canvas.setPointerCapture(e.pointerId);
                      isDrawingRef.current = true;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      const rect = canvas.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
                      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
                      ctx.beginPath();
                      ctx.moveTo(x, y);
                    }}
                    onPointerMove={(e) => {
                      if (!isDrawingRef.current) return;
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      const rect = canvas.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
                      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
                      ctx.lineTo(x, y);
                      ctx.strokeStyle = '#000';
                      ctx.lineWidth = 3;
                      ctx.lineCap = 'round';
                      ctx.stroke();
                    }}
                    onPointerUp={() => {
                      isDrawingRef.current = false;
                    }}
                    onPointerCancel={() => {
                      isDrawingRef.current = false;
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 rounded-xl"
                  >
                    Borrar firma
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleDecision}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Confirmar Aprobación</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-red-400 font-bold text-lg">
                  <XCircle className="w-5 h-5" />
                  <h4>Rechazar Presupuesto</h4>
                </div>
                <p className="text-xs text-zinc-400">
                  ¿Deseas indicar al taller algún motivo o ajuste necesario en el presupuesto? (Opcional):
                </p>
                <textarea
                  value={rejectMotivo}
                  onChange={(e) => setRejectMotivo(e.target.value)}
                  placeholder="Ej: Deseo postergar el cambio de pastillas, o el costo supera mi presupuesto..."
                  rows={4}
                  className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-zinc-100 focus:outline-none focus:border-red-500 resize-none"
                />
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAction(null)}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleDecision}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    <span>Confirmar Rechazo</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
