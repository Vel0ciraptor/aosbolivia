'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../../../../lib/api';
import SignaturePad, { SignaturePadHandle } from '../../../../../components/SignaturePad';
import {
  ArrowLeft, Loader2, AlertCircle, Car, Building2, Calendar,
  CheckCircle2, Clock, Wrench, Image as ImageIcon, X, Camera,
  FileText, Hash, ClipboardCheck, PenTool, XCircle,
} from 'lucide-react';
import { PHASES, PHASE_INDEX, PHASE_META, fmtFecha } from '../phases';

interface JobDetail {
  id: string;
  estado: string;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
  kilometraje?: number;
  problema?: string;
  fechaCita?: string | null;
  createdAt: string;
  updatedAt: string;
  workshop?: { id: string; nombre: string; direccion?: string; telefono?: string };
  request?: { id: string; titulo: string };
  logs: { estado: string; observaciones?: string; usuario?: string; createdAt: string }[];
  fotos: {
    ingreso: string[];
    diagnostico: string[];
    terminado: string[];
    tablero?: string | null;
  };
}

interface ApprovalData {
  jobId: string;
  estado: string;
  vehiculo: string;
  placa?: string;
  problema?: string;
  diagnostico?: string | null;
  workshop?: { nombre: string; direccion?: string; telefono?: string };
  autorizacionEstado: string | null;
  autorizacionPresupuesto: number | null;
  autorizacionDecididoEn?: string | null;
  autorizacionRechazoMotivo?: string | null;
  autorizacionFirma?: string | null;
  servicios: { nombre: string; precio: number }[];
  repuestos: { nombre: string; cantidad: number; esInsumo?: boolean; precioUnitario: number | null }[];
  totalServicios: number;
  totalRepuestos: number;
  totalEstimadoUsd: number;
  tipoCambio: number;
  totalEstimadoBob: number;
}

export default function ClientJobTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [approval, setApproval] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Modal de decisión: null | 'APROBAR' | 'RECHAZAR'
  const [decisionModal, setDecisionModal] = useState<'APROBAR' | 'RECHAZAR' | null>(null);
  const [decisionSending, setDecisionSending] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  const fetchAll = () => {
    api
      .get(`/my/jobs/${id}`)
      .then((res) => setJob(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || 'No se pudo cargar el seguimiento.')
      )
      .finally(() => setLoading(false));
    // Presupuesto pendiente de aprobación (si existe); errores se ignoran
    api
      .get(`/my/jobs/${id}/approval`)
      .then((res) => setApproval(res.data))
      .catch(() => setApproval(null));
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDecide = async () => {
    if (!decisionModal) return;
    if (decisionModal === 'APROBAR') {
      const firma = signaturePadRef.current?.toDataURL();
      if (!firma) {
        alert('Debe firmar con el dedo para aprobar el presupuesto.');
        return;
      }
      setDecisionSending(true);
      try {
        await api.post(`/my/jobs/${id}/approval/decide`, {
          decision: 'APROBAR',
          firma,
        });
        setDecisionModal(null);
        fetchAll();
      } catch (err: any) {
        alert(err.response?.data?.message || 'No se pudo registrar la aprobación.');
      } finally {
        setDecisionSending(false);
      }
    } else {
      if (!rejectMotivo.trim()) {
        alert('Indica el motivo del rechazo.');
        return;
      }
      setDecisionSending(true);
      try {
        await api.post(`/my/jobs/${id}/approval/decide`, {
          decision: 'RECHAZAR',
          motivo: rejectMotivo.trim(),
        });
        setDecisionModal(null);
        setRejectMotivo('');
        fetchAll();
      } catch (err: any) {
        alert(err.response?.data?.message || 'No se pudo registrar el rechazo.');
      } finally {
        setDecisionSending(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/client/tracking"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al seguimiento
        </Link>
        <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="font-bold text-zinc-200">No se pudo cargar el trabajo</h3>
          <p className="text-sm text-zinc-400 mt-1">{error || 'Trabajo no encontrado.'}</p>
        </div>
      </div>
    );
  }

  const currentIdx = PHASE_INDEX[job.estado] ?? 0;
  const meta = PHASE_META[job.estado] || PHASE_META.INGRESANDO;
  const totalFotos =
    job.fotos.ingreso.length + job.fotos.diagnostico.length + job.fotos.terminado.length +
    (job.fotos.tablero ? 1 : 0);

  const photoSections = [
    { title: 'Fotos de ingreso', icon: Camera, photos: job.fotos.ingreso },
    {
      title: 'Diagnóstico',
      icon: Wrench,
      photos: [...job.fotos.diagnostico, ...(job.fotos.tablero ? [job.fotos.tablero] : [])],
    },
    { title: 'Trabajo terminado', icon: CheckCircle2, photos: job.fotos.terminado },
  ].filter((s) => s.photos.length > 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/client/tracking"
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}>
              {job.estado === 'TRABAJANDO' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : currentIdx >= 3 ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              {meta.label}
            </span>
            {job.workshop && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border-amber-500/30 text-amber-300">
                <Building2 className="w-3 h-3" />
                {job.workshop.nombre}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 truncate">
            {job.marca} {job.modelo} <span className="text-zinc-500 font-normal">{job.anio}</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* APROBACIÓN DEL PRESUPUESTO */}
          {approval && approval.autorizacionEstado && (
            <div
              className={`p-6 border rounded-2xl space-y-4 ${
                approval.autorizacionEstado === 'PENDIENTE_APROBACION'
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : approval.autorizacionEstado === 'APROBADO'
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-red-950/20 border-red-800/40'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <ClipboardCheck
                    className={`w-4 h-4 ${
                      approval.autorizacionEstado === 'PENDIENTE_APROBACION'
                        ? 'text-amber-400'
                        : approval.autorizacionEstado === 'APROBADO'
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  />
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                    Presupuesto
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                    approval.autorizacionEstado === 'PENDIENTE_APROBACION'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : approval.autorizacionEstado === 'APROBADO'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-950/40 border-red-800/50 text-red-300'
                  }`}
                >
                  {approval.autorizacionEstado === 'PENDIENTE_APROBACION'
                    ? 'Pendiente de tu aprobación'
                    : approval.autorizacionEstado === 'APROBADO'
                    ? 'Aprobado'
                    : 'Rechazado'}
                </span>
              </div>

              {approval.diagnostico && (
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                    Diagnóstico del taller
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{approval.diagnostico}</p>
                </div>
              )}

              {approval.servicios.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                    Servicios
                  </p>
                  <div className="space-y-1">
                    {approval.servicios.map((s, i) => (
                      <div key={i} className="flex justify-between text-xs p-2 bg-zinc-950/60 rounded-lg">
                        <span className="text-zinc-300">{s.nombre}</span>
                        <span className="text-zinc-200 font-semibold">${Number(s.precio || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {approval.repuestos.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                    Repuestos e insumos
                  </p>
                  <div className="space-y-1">
                    {approval.repuestos.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs p-2 bg-zinc-950/60 rounded-lg">
                        <span className="text-zinc-300">
                          {p.nombre} <span className="text-zinc-500">×{p.cantidad}</span>
                          {p.esInsumo && (
                            <span className="ml-1.5 text-[9px] font-bold uppercase text-brand-300">Insumo</span>
                          )}
                        </span>
                        <span className="text-zinc-200 font-semibold">
                          {p.precioUnitario != null ? `$${(p.precioUnitario * p.cantidad).toFixed(2)}` : 'A convenir'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totales */}
              <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Total servicios</span>
                  <span className="text-zinc-300">${approval.totalServicios.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Total repuestos</span>
                  <span className="text-zinc-300">${approval.totalRepuestos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-zinc-800/60">
                  <span className="text-zinc-200">Total estimado (USD)</span>
                  <span className="text-zinc-100">${approval.totalEstimadoUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Estimado en Bolivianos (tc {Number(approval.tipoCambio).toFixed(2)})</span>
                  <span>Bs {approval.totalEstimadoBob.toFixed(2)}</span>
                </div>
              </div>

              {/* Decisión del cliente */}
              {approval.autorizacionEstado === 'PENDIENTE_APROBACION' ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => setDecisionModal('APROBAR')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <PenTool className="w-4 h-4" />
                    Aprobar presupuesto (con firma)
                  </button>
                  <button
                    onClick={() => setDecisionModal('RECHAZAR')}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                  <p className="text-[10px] text-zinc-500 w-full">
                    Al aprobar, firmas con el dedo y el taller podrá iniciar los trabajos.
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-400 space-y-2">
                  {approval.autorizacionDecididoEn && (
                    <p>
                      Decidido el{' '}
                      <strong>{new Date(approval.autorizacionDecididoEn).toLocaleString('es-BO')}</strong>.
                    </p>
                  )}
                  {approval.autorizacionRechazoMotivo && (
                    <p className="text-red-300">
                      Motivo de rechazo: <strong>{approval.autorizacionRechazoMotivo}</strong>
                    </p>
                  )}
                  {approval.autorizacionFirma && (
                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                        Tu firma
                      </p>
                      <img
                        src={approval.autorizacionFirma}
                        alt="Firma del cliente"
                        className="h-16 bg-white rounded-lg p-1"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CHECKLIST DE FASES */}
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                  Progreso de tu vehículo
                </h3>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                Fase {currentIdx + 1} de {PHASES.length}
              </span>
            </div>

            <div className="space-y-0">
              {PHASES.map((phase, i) => {
                const isDone = i < currentIdx;
                const isActive = i === currentIdx;
                const isPending = i > currentIdx;
                return (
                  <div key={phase.key} className="flex gap-3">
                    {/* Línea conectora + marcador */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${
                          isDone
                            ? 'bg-emerald-500/15 border-emerald-500/50'
                            : isActive
                            ? 'bg-brand-500/20 border-brand-500'
                            : 'bg-zinc-950 border-zinc-800'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : isActive ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                        )}
                      </div>
                      {i < PHASES.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 min-h-[22px] ${
                            isDone ? 'bg-emerald-500/40' : 'bg-zinc-800'
                          }`}
                        />
                      )}
                    </div>
                    {/* Texto de la fase */}
                    <div className={`pb-4 ${i === PHASES.length - 1 ? 'pb-0' : ''}`}>
                      <p
                        className={`text-sm font-bold ${
                          isDone
                            ? 'text-emerald-300'
                            : isActive
                            ? 'text-zinc-100'
                            : 'text-zinc-500'
                        }`}
                      >
                        {phase.label}
                        {isDone && (
                          <span className="ml-2 text-[10px] font-bold uppercase text-emerald-500/70">
                            Completada
                          </span>
                        )}
                        {isActive && (
                          <span className="ml-2 text-[10px] font-bold uppercase text-brand-400">
                            En curso
                          </span>
                        )}
                      </p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          isPending ? 'text-zinc-600' : 'text-zinc-400'
                        }`}
                      >
                        {phase.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-2 border-t border-zinc-800/60">
              <Clock className="w-3.5 h-3.5" />
              Última actualización: {fmtFecha(job.updatedAt)}
            </p>
          </div>

          {/* FOTOS DEL VEHÍCULO */}
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                  Fotos del vehículo ({totalFotos})
                </h3>
              </div>
              <span className="text-[10px] text-zinc-500">Optimizadas en WebP</span>
            </div>

            {totalFotos === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">
                Aún no hay fotos disponibles. El taller subirá imágenes del avance de tu vehículo.
              </p>
            ) : (
              <div className="space-y-5">
                {photoSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <div key={section.title} className="space-y-2">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-brand-400" />
                        {section.title}
                        <span className="text-zinc-600">({section.photos.length})</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {section.photos.map((url, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setLightbox(url)}
                            className="relative group w-24 h-24 rounded-xl overflow-hidden border border-zinc-800 hover:border-brand-500/60 transition-all"
                            title="Ver foto completa"
                          >
                            <img
                              src={url}
                              alt={`${section.title} ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* HISTORIAL */}
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
              <FileText className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                Historial ({job.logs.length})
              </h3>
            </div>
            {job.logs.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">Sin movimientos registrados.</p>
            ) : (
              <div className="space-y-3">
                {[...job.logs].reverse().map((log, i) => {
                  const logMeta = PHASE_META[log.estado];
                  return (
                    <div key={i} className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold ${logMeta ? logMeta.color : 'text-zinc-300'}`}
                        >
                          {logMeta ? logMeta.label : log.estado}
                        </span>
                        <span className="text-[10px] text-zinc-500">{fmtFecha(log.createdAt)}</span>
                      </div>
                      {log.observaciones && (
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          {log.observaciones}
                        </p>
                      )}
                      {log.usuario && (
                        <p className="text-[10px] text-zinc-600 mt-1">Registrado por: {log.usuario}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
              <Car className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Vehículo</h3>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                <span className="text-zinc-500">Marca / Modelo</span>
                <span className="text-zinc-300 font-semibold">{job.marca} {job.modelo}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                <span className="text-zinc-500">Año</span>
                <span className="text-zinc-300 font-semibold">{job.anio}</span>
              </div>
              {job.placa && (
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                  <span className="text-zinc-500">Placa</span>
                  <span className="text-zinc-300 font-mono font-semibold">{job.placa}</span>
                </div>
              )}
              {job.kilometraje != null && (
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                  <span className="text-zinc-500">Kilometraje</span>
                  <span className="text-zinc-300 font-semibold">
                    {Number(job.kilometraje).toLocaleString()} km
                  </span>
                </div>
              )}
            </div>
            {job.problema && (
              <div className="pt-2 border-t border-zinc-800/60">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                  Problema reportado
                </p>
                <p className="text-[11px] text-zinc-300 leading-relaxed">{job.problema}</p>
              </div>
            )}
          </div>

          {job.workshop && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                <Building2 className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Taller</h3>
              </div>
              <p className="text-sm font-bold text-zinc-200">{job.workshop.nombre}</p>
              {job.workshop.direccion && (
                <p className="text-[11px] text-zinc-500">{job.workshop.direccion}</p>
              )}
              {job.workshop.telefono && (
                <p className="text-[11px] text-zinc-500">Tel: {job.workshop.telefono}</p>
              )}
            </div>
          )}

          {job.request && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                <Hash className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Solicitud</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{job.request.titulo}</p>
              <Link
                href={`/dashboard/client/requests/${job.request.id}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-400 hover:text-brand-300"
              >
                Ver solicitud y cotizaciones →
              </Link>
            </div>
          )}

          {job.fechaCita && (
            <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-2xl flex items-center gap-2 text-[11px] text-brand-300">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                Cita de ingreso: <strong>{fmtFecha(job.fechaCita)}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DECISIÓN DEL PRESUPUESTO */}
      {decisionModal && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !decisionSending && setDecisionModal(null)}
        >
          <div
            className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                {decisionModal === 'APROBAR'
                  ? 'Aprobar presupuesto'
                  : 'Rechazar presupuesto'}
              </h3>
              <button
                onClick={() => !decisionSending && setDecisionModal(null)}
                className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {decisionModal === 'APROBAR' ? (
              <>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Firma con el dedo en el recuadro para autorizar el presupuesto de{' '}
                  <strong className="text-zinc-200">
                    ${approval?.totalEstimadoUsd.toFixed(2)} USD
                  </strong>{' '}
                  (Bs {approval?.totalEstimadoBob.toFixed(2)}). El taller podrá iniciar los
                  trabajos una vez firmado.
                </p>
                <div className="bg-white rounded-xl p-2">
                  <SignaturePad ref={signaturePadRef} className="bg-white" />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => signaturePadRef.current?.clear()}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={handleDecide}
                    disabled={decisionSending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {decisionSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PenTool className="w-4 h-4" />
                    )}
                    Confirmar aprobación
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Indica el motivo del rechazo para que el taller pueda ajustar el presupuesto.
                </p>
                <textarea
                  value={rejectMotivo}
                  onChange={(e) => setRejectMotivo(e.target.value)}
                  rows={3}
                  placeholder="Ej: El costo de los repuestos es muy alto..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500/50 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setDecisionModal(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDecide}
                    disabled={decisionSending || !rejectMotivo.trim()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {decisionSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Confirmar rechazo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* LIGHTBOX DE FOTO */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 transition-colors"
            aria-label="Cerrar foto"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightbox}
            alt="Foto del vehículo"
            className="max-w-full max-h-[85vh] rounded-2xl border border-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
