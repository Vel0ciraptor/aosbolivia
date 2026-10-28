'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '../../../../../lib/api';
import {
  ArrowLeft, Loader2, AlertCircle, Car, Building2, Calendar,
  CheckCircle2, Clock, Wrench, Image as ImageIcon, X, Camera,
  FileText, Hash,
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

export default function ClientJobTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/my/jobs/${id}`)
      .then((res) => setJob(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || 'No se pudo cargar el seguimiento.')
      )
      .finally(() => setLoading(false));
  }, [id]);

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
