'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '../../../../../lib/api';
import {
  ArrowLeft, Loader2, AlertCircle, Car, Tag, Wrench, Truck, MessageCircle,
  Sparkles, CheckCircle2, XCircle, Clock, Inbox, MessageSquare,
  Phone, Mail, Calendar, Building2,
  Hash, FileText, Send,
} from 'lucide-react';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
  motor?: string;
  combustible?: string;
}

interface Provider {
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

interface Quote {
  id: string;
  precio: number | string;
  comentario?: string;
  tiempoEntrega?: string;
  estado: string;
  createdAt: string;
  provider?: Provider;
  workshop?: { nombre: string; telefono?: string };
  workshopId?: string;
  fechaPropuesta?: string | null;
}

interface MessageItem {
  id: string;
  message: string;
  isAI: boolean;
  createdAt: string;
  sender?: { name: string; role: string };
}

interface RequestDetail {
  id: string;
  titulo: string;
  categoria: string;
  estado: string;
  descripcion: string;
  createdAt: string;
  fechaCita?: string | null;
  workshop?: { id: string; nombre: string } | null;
  aiParsed?: {
    categoria?: string;
    marca?: string;
    modelo?: string;
    anio?: number;
    pieza?: string;
    especialidad?: string;
    resumen?: string;
    confianza?: number;
  } | null;
  vehicle?: Vehicle | null;
  user?: { name: string; email: string; phone?: string };
  quotes: Quote[];
  messages: MessageItem[];
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  REPUESTO: { label: 'Repuesto', icon: Tag, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  TALLER: { label: 'Servicio de Taller', icon: Wrench, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  GRUA: { label: 'Servicio de Grúa', icon: Truck, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  CONSULTA: { label: 'Consulta General', icon: MessageCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
};

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  OPEN: { label: 'Abierta', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  IN_PROGRESS: { label: 'En progreso', icon: Inbox, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  CLOSED: { label: 'Cerrada', icon: CheckCircle2, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  CANCELLED: { label: 'Cancelada', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

const QUOTE_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ACCEPTED: { label: 'Aceptada', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  REJECTED: { label: 'Rechazada', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  EXPIRED: { label: 'Expirada', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
};

interface Slot {
  startAt: string;
  endAt: string;
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function CitaPicker({
  workshopId,
  propuesta,
  fechaDeseada,
  value,
  onChange,
}: {
  workshopId: string;
  propuesta?: string | null;
  fechaDeseada?: string | null;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const from = new Date();
    const to = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    api
      .get(
        `/workshops/${workshopId}/slots?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`
      )
      .then((res) => {
        if (!cancelled) setSlots(res.data || []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workshopId]);

  const label = (iso: string) => fmtFecha(iso);

  return (
    <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl mb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cita de ingreso</p>
          {value && (
            <span className="text-[11px] font-bold text-emerald-300 truncate">
              {label(value)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 shrink-0"
        >
          {open ? 'Ocultar' : 'Escoger otra cita'}
        </button>
      </div>

      {propuesta && (
        <p className="text-[11px] text-zinc-400 mt-1.5">
          📅 El taller propone: <strong className="text-zinc-200">{label(propuesta)}</strong>
        </p>
      )}
      {!propuesta && fechaDeseada && (
        <p className="text-[11px] text-zinc-400 mt-1.5">
          📅 Tu fecha deseada: <strong className="text-zinc-200">{label(fechaDeseada)}</strong>
        </p>
      )}

      {open && (
        <div className="mt-2">
          {loading ? (
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 py-2">
              <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Cargando citas disponibles...
            </div>
          ) : slots.length === 0 ? (
            <p className="text-[11px] text-zinc-500 py-2">
              Este taller no tiene citas disponibles en los próximos días. Acepta con la
              fecha propuesta o espera a que abran agenda.
            </p>
          ) : (
            <>
              <select
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value || null)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-200 text-xs font-semibold"
              >
                {!propuesta && !fechaDeseada && <option value="">Sin cita por ahora</option>}
                {propuesta && <option value={propuesta}>Propuesta: {label(propuesta)}</option>}
                {value && value !== propuesta && !slots.some((s) => s.startAt === value) && (
                  <option value={value}>Seleccionada: {label(value)}</option>
                )}
                {slots.map((s) => (
                  <option key={s.startAt} value={s.startAt}>
                    {label(s.startAt)}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-600 mt-1.5">
                {slots.length} citas libres en los próximos 30 días
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string | null>>({});

  const fetchRequest = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/requests/${id}`);
      setRequest(res.data);
    } catch (err: any) {
      console.error('Error fetching request:', err);
      setError(err.response?.data?.message || 'No se pudo cargar la solicitud.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchRequest();
  }, [id, fetchRequest]);

  const handleQuoteAction = React.useCallback(async (
    quoteId: string,
    action: 'ACCEPTED' | 'REJECTED',
    citaStartAt?: string | null,
  ) => {
    setUpdatingQuoteId(quoteId);
    setActionMessage(null);
    try {
      await api.put(`/quotes/${quoteId}/status`, {
        status: action,
        ...(action === 'ACCEPTED' && citaStartAt ? { citaStartAt } : {}),
      });
      setActionMessage({
        type: 'success',
        text: action === 'ACCEPTED'
          ? 'Cotización aceptada. La cita quedó reservada y el taller fue notificado.'
          : 'Cotización rechazada.',
      });
      await fetchRequest();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo actualizar la cotización.',
      });
    } finally {
      setUpdatingQuoteId(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  }, [fetchRequest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/client/requests"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a solicitudes
        </Link>
        <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="font-bold text-zinc-200">No se pudo cargar la solicitud</h3>
          <p className="text-sm text-zinc-400 mt-1">{error || 'Solicitud no encontrada.'}</p>
        </div>
      </div>
    );
  }

  const catMeta = CATEGORY_META[request.categoria] || CATEGORY_META.CONSULTA;
  const statusMeta = STATUS_META[request.estado] || STATUS_META.OPEN;
  const CatIcon = catMeta.icon;
  const StatusIcon = statusMeta.icon;

  const sortedQuotes = [...(request.quotes || [])].sort((a, b) => {
    const pa = typeof a.precio === 'string' ? parseFloat(a.precio) : a.precio;
    const pb = typeof b.precio === 'string' ? parseFloat(b.precio) : b.precio;
    return (pa || 0) - (pb || 0);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/client/requests"
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${catMeta.bg} ${catMeta.color}`}>
              <CatIcon className="w-3 h-3" />
              {catMeta.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusMeta.label}
            </span>
            {request.workshop && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border-amber-500/30 text-amber-300">
                <Building2 className="w-3 h-3" />
                Solo lo ve: {request.workshop.nombre}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 truncate">{request.titulo}</h2>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-200'
              : 'bg-red-950/30 border border-red-800/50 text-red-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Descripción</h3>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {request.descripcion}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Publicada el{' '}
                {new Date(request.createdAt).toLocaleDateString('es-VE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {request.fechaCita && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Fecha deseada de ingreso:{' '}
                  <strong>{fmtFecha(request.fechaCita)}</strong>
                </span>
              </div>
            )}
          </div>

          {request.aiParsed && (
            <div className="p-6 bg-gradient-to-br from-indigo-950/30 to-zinc-900 border border-indigo-500/20 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-indigo-500/20">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Análisis IA</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {request.aiParsed.marca && (
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Marca</p>
                    <p className="text-sm text-zinc-200 font-bold mt-0.5">{request.aiParsed.marca}</p>
                  </div>
                )}
                {request.aiParsed.modelo && (
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Modelo</p>
                    <p className="text-sm text-zinc-200 font-bold mt-0.5">{request.aiParsed.modelo}</p>
                  </div>
                )}
                {request.aiParsed.anio && (
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Año</p>
                    <p className="text-sm text-zinc-200 font-bold mt-0.5">{request.aiParsed.anio}</p>
                  </div>
                )}
                {request.aiParsed.pieza && (
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pieza</p>
                    <p className="text-sm text-zinc-200 font-bold mt-0.5 capitalize">{request.aiParsed.pieza}</p>
                  </div>
                )}
                {request.aiParsed.especialidad && (
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Especialidad</p>
                    <p className="text-sm text-zinc-200 font-bold mt-0.5 capitalize">{request.aiParsed.especialidad}</p>
                  </div>
                )}
                {request.aiParsed.confianza !== undefined && (
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Confianza</p>
                    <p className="text-sm text-zinc-200 font-bold mt-0.5">
                      {Math.round(request.aiParsed.confianza * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                  Cotizaciones ({sortedQuotes.length})
                </h3>
              </div>
              {sortedQuotes.length > 0 && (
                <span className="text-[11px] text-zinc-500">Ordenadas por precio</span>
              )}
            </div>

            {sortedQuotes.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-3 text-zinc-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-sm text-zinc-400">Aún no hay cotizaciones para esta solicitud.</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Los proveedores y talleres serán notificados y enviarán sus propuestas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedQuotes.map((q, idx) => {
                  const qMeta = QUOTE_STATUS_META[q.estado] || QUOTE_STATUS_META.PENDING;
                  const precioNum = typeof q.precio === 'string' ? parseFloat(q.precio) : q.precio;
                  const isBestPrice = idx === 0 && q.estado === 'PENDING';
                  const canAct = q.estado === 'PENDING' && (request.estado === 'OPEN' || request.estado === 'IN_PROGRESS');
                  return (
                    <div
                      key={q.id}
                      className={`p-4 border rounded-2xl transition-all ${
                        isBestPrice
                          ? 'bg-emerald-950/10 border-emerald-500/30'
                          : 'bg-zinc-950/40 border-zinc-800/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-zinc-200 text-sm">
                                {q.workshop?.nombre || q.provider?.nombre || 'Proveedor'}
                              </h4>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                                q.workshop
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              }`}>
                                {q.workshop ? 'Taller' : 'Repuestos'}
                              </span>
                              {isBestPrice && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/30">
                                  Mejor precio
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500">
                              {new Date(q.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-zinc-100">
                            ${precioNum?.toFixed(2) ?? '0.00'}
                          </p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${qMeta.bg} ${qMeta.color}`}>
                            {qMeta.label}
                          </span>
                        </div>
                      </div>

                      {q.comentario && (
                        <div className="p-3 bg-zinc-950/60 border border-zinc-800/40 rounded-xl mb-3">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Comentario</p>
                          <p className="text-xs text-zinc-300 leading-relaxed">{q.comentario}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400 mb-3">
                        {q.tiempoEntrega && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Entrega: <strong className="text-zinc-300">{q.tiempoEntrega}</strong></span>
                          </div>
                        )}
                        {q.provider?.telefono && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="truncate">{q.provider.telefono}</span>
                          </div>
                        )}
                        {q.provider?.email && (
                          <div className="flex items-center gap-1.5 sm:col-span-2">
                            <Mail className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="truncate">{q.provider.email}</span>
                          </div>
                        )}
                      </div>

                      {q.fechaPropuesta && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 mb-3">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            📅 Cita propuesta:{' '}
                            <strong>{fmtFecha(q.fechaPropuesta)}</strong>
                          </span>
                        </div>
                      )}

                      {canAct && q.workshopId && (
                        <CitaPicker
                          workshopId={q.workshopId}
                          propuesta={q.fechaPropuesta}
                          fechaDeseada={request.fechaCita}
                          value={
                            selectedSlots[q.id] !== undefined
                              ? selectedSlots[q.id]
                              : (q.fechaPropuesta ?? request.fechaCita ?? null)
                          }
                          onChange={(v) => setSelectedSlots((s) => ({ ...s, [q.id]: v }))}
                        />
                      )}

                      {canAct && (
                        <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/60">
                          <button
                            onClick={() =>
                              handleQuoteAction(
                                q.id,
                                'ACCEPTED',
                                selectedSlots[q.id] !== undefined
                                  ? selectedSlots[q.id]
                                  : (q.fechaPropuesta ?? request.fechaCita ?? null),
                              )
                            }
                            disabled={updatingQuoteId === q.id}
                            className="flex-1 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {updatingQuoteId === q.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Aceptar cotización
                          </button>
                          <button
                            onClick={() => handleQuoteAction(q.id, 'REJECTED')}
                            disabled={updatingQuoteId === q.id}
                            className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {updatingQuoteId === q.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {request.messages && request.messages.length > 0 && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                <Send className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                  Mensajes ({request.messages.length})
                </h3>
              </div>
              <div className="space-y-3">
                {request.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border ${
                      m.isAI
                        ? 'bg-indigo-950/20 border-indigo-500/20'
                        : 'bg-zinc-950/40 border-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        {m.isAI && <Sparkles className="w-3 h-3 text-indigo-400" />}
                        {m.sender?.name || (m.isAI ? 'Asistente IA' : 'Usuario')}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(m.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {request.vehicle && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                <Car className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Vehículo</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-indigo-400">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-200">{request.vehicle.marca} {request.vehicle.modelo}</h4>
                  <p className="text-[11px] text-zinc-500">Año {request.vehicle.anio}</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/60 text-[11px]">
                {request.vehicle.placa && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Placa</span>
                    <span className="text-zinc-300 font-semibold">{request.vehicle.placa}</span>
                  </div>
                )}
                {request.vehicle.motor && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Motor</span>
                    <span className="text-zinc-300 font-semibold">{request.vehicle.motor}</span>
                  </div>
                )}
                {request.vehicle.combustible && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Combustible</span>
                    <span className="text-zinc-300 font-semibold">{request.vehicle.combustible}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
              <Hash className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Resumen</h3>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                <span className="text-zinc-500">ID de solicitud</span>
                <span className="text-zinc-300 font-mono">{request.id.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                <span className="text-zinc-500">Cotizaciones</span>
                <span className="text-zinc-300 font-bold">{request.quotes?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                <span className="text-zinc-500">Aceptadas</span>
                <span className="text-emerald-400 font-bold">
                  {request.quotes?.filter((q) => q.estado === 'ACCEPTED').length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                <span className="text-zinc-500">Pendientes</span>
                <span className="text-amber-400 font-bold">
                  {request.quotes?.filter((q) => q.estado === 'PENDING').length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
