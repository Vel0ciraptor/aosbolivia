'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '../../../../../lib/api';
import { useWorkshopProfile } from '../../../../../store/useWorkshopProfile';
import {
  ArrowLeft, Loader2, AlertCircle, Car, Tag, Sparkles,
  CheckCircle2, XCircle, Clock, Inbox, MessageSquare,
  Phone, Mail, Calendar, Building2, Hash, FileText, Send,
  DollarSign, Truck, User as UserIcon, Wrench,
} from 'lucide-react';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
  motor?: string;
}

interface WorkshopLite {
  id: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
}

interface Quote {
  id: string;
  precio: number | string;
  comentario?: string;
  tiempoEntrega?: string;
  estado: string;
  createdAt: string;
  workshop?: WorkshopLite | null;
  provider?: WorkshopLite | null;
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
  aiParsed?: {
    categoria?: string;
    marca?: string;
    modelo?: string;
    anio?: number;
    pieza?: string;
    resumen?: string;
    confianza?: number;
  } | null;
  vehicle?: Vehicle | null;
  user: { name: string; email?: string; phone?: string };
  quotes: Quote[];
  messages: MessageItem[];
}

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  OPEN: { label: 'Abierta', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  IN_PROGRESS: { label: 'En progreso', icon: Inbox, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  CLOSED: { label: 'Cerrada', icon: CheckCircle2, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  CANCELLED: { label: 'Cancelada', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

export default function WorkshopRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { workshop } = useWorkshopProfile();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [precio, setPrecio] = useState('');
  const [comentario, setComentario] = useState('');
  const [tiempoEntrega, setTiempoEntrega] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const myQuote = request?.quotes?.find((q) => q.workshop?.id === workshop?.id) || null;

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshop) return;
    setSubmitMessage(null);

    const precioNum = parseFloat(precio);
    if (!precioNum || precioNum <= 0) {
      setSubmitMessage({ type: 'error', text: 'Ingresa un precio válido.' });
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/quotes', {
        requestId: id,
        workshopId: workshop.id,
        precio: precioNum,
        comentario: comentario.trim() || undefined,
        tiempoEntrega: tiempoEntrega.trim() || undefined,
      });
      setSubmitMessage({ type: 'success', text: '¡Cotización enviada correctamente!' });
      setPrecio('');
      setComentario('');
      setTiempoEntrega('');
      await fetchRequest();
    } catch (err: any) {
      setSubmitMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo enviar la cotización.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/workshop/requests"
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

  const statusMeta = STATUS_META[request.estado] || STATUS_META.OPEN;
  const StatusIcon = statusMeta.icon;
  const canQuote = (request.estado === 'OPEN' || request.estado === 'IN_PROGRESS') && !myQuote;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/workshop/requests"
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              <Wrench className="w-3 h-3" /> TALLER
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusMeta.label}
            </span>
            {myQuote && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                myQuote.estado === 'ACCEPTED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                myQuote.estado === 'REJECTED' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                {myQuote.estado === 'ACCEPTED' ? <CheckCircle2 className="w-3 h-3" /> :
                 myQuote.estado === 'REJECTED' ? <XCircle className="w-3 h-3" /> :
                 <Clock className="w-3 h-3" />}
                Mi cotización: {myQuote.estado === 'ACCEPTED' ? 'Aceptada' : myQuote.estado === 'REJECTED' ? 'Rechazada' : 'Pendiente'}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 truncate">{request.titulo}</h2>
        </div>
      </div>

      {submitMessage && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
            submitMessage.type === 'success'
              ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-200'
              : 'bg-red-950/30 border border-red-800/50 text-red-200'
          }`}
        >
          {submitMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{submitMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Descripción del Cliente</h3>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {request.descripcion}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Publicada el{' '}
                {new Date(request.createdAt).toLocaleDateString('es-VE', {
                  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {request.aiParsed && (
            <div className="p-6 bg-gradient-to-br from-emerald-950/30 to-zinc-900 border border-emerald-500/20 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Datos Detectados</h3>
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
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Servicio</p>
                    <p className="text-sm text-zinc-100 font-bold mt-0.5 capitalize">{request.aiParsed.pieza}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {request.vehicle && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                <Car className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Vehículo del Cliente</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-emerald-400">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-200">{request.vehicle.marca} {request.vehicle.modelo}</h4>
                  <p className="text-[11px] text-zinc-500">Año {request.vehicle.anio}</p>
                </div>
              </div>
              {(request.vehicle.placa || request.vehicle.motor) && (
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
                </div>
              )}
            </div>
          )}

          {request.quotes && request.quotes.length > 0 && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                    Otras Cotizaciones ({request.quotes.length})
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-500">Precios enviados</span>
              </div>
              <div className="space-y-2">
                {[...request.quotes].sort((a, b) => {
                  const pa = typeof a.precio === 'string' ? parseFloat(a.precio) : a.precio;
                  const pb = typeof b.precio === 'string' ? parseFloat(b.precio) : b.precio;
                  return (pa || 0) - (pb || 0);
                }).map((q, idx) => {
                  const isMine = q.workshop?.id === workshop?.id;
                  const precioNum = typeof q.precio === 'string' ? parseFloat(q.precio) : q.precio;
                  const competitorName = q.workshop?.nombre || q.provider?.nombre || 'Anónimo';
                  return (
                    <div
                      key={q.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isMine
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-zinc-950/40 border-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-zinc-500 font-mono w-6">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-zinc-200 truncate">
                            {isMine ? 'Tú' : competitorName}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {q.estado === 'ACCEPTED' ? '✓ Aceptada' : q.estado === 'REJECTED' ? '✗ Rechazada' : 'Pendiente'}
                          </p>
                        </div>
                      </div>
                      <span className="text-base font-extrabold text-zinc-100 font-mono">
                        ${precioNum?.toFixed(2) ?? '0.00'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
              <UserIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Cliente</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <UserIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-zinc-200 truncate">{request.user.name}</h4>
                {request.user.email && (
                  <p className="text-[11px] text-zinc-500 truncate">{request.user.email}</p>
                )}
              </div>
            </div>
            {request.user.phone && (
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-2 border-t border-zinc-800/60">
                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                <span>{request.user.phone}</span>
              </div>
            )}
          </div>

          {canQuote ? (
            <form onSubmit={handleSubmitQuote} className="p-6 bg-gradient-to-br from-emerald-950/30 to-zinc-900 border border-emerald-500/20 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Enviar Cotización</h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Precio (USD) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="120.00"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 transition-colors text-sm font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Tiempo de entrega
                </label>
                <input
                  type="text"
                  value={tiempoEntrega}
                  onChange={(e) => setTiempoEntrega(e.target.value)}
                  placeholder="Ej: 1-2 días hábiles"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 transition-colors text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Detalle del servicio</label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  placeholder="Diagnóstico, repuestos necesarios, garantía..."
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 transition-colors text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Cotización</span>
                  </>
                )}
              </button>
            </form>
          ) : myQuote ? (
            <div className={`p-6 rounded-2xl border space-y-3 ${
              myQuote.estado === 'ACCEPTED' ? 'bg-emerald-950/20 border-emerald-500/30' :
              myQuote.estado === 'REJECTED' ? 'bg-red-950/20 border-red-500/30' :
              'bg-amber-950/20 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {myQuote.estado === 'ACCEPTED' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                 myQuote.estado === 'REJECTED' ? <XCircle className="w-4 h-4 text-red-400" /> :
                 <Clock className="w-4 h-4 text-amber-400" />}
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Tu Cotización</h3>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                  <span className="text-zinc-500">Precio</span>
                  <span className="text-zinc-100 font-mono font-bold">${parseFloat(String(myQuote.precio)).toFixed(2)}</span>
                </div>
                {myQuote.tiempoEntrega && (
                  <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                    <span className="text-zinc-500">Entrega</span>
                    <span className="text-zinc-300 font-semibold">{myQuote.tiempoEntrega}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg">
                  <span className="text-zinc-500">Estado</span>
                  <span className={`font-bold ${
                    myQuote.estado === 'ACCEPTED' ? 'text-emerald-400' :
                    myQuote.estado === 'REJECTED' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {myQuote.estado === 'ACCEPTED' ? 'Aceptada' : myQuote.estado === 'REJECTED' ? 'Rechazada' : 'Pendiente'}
                  </span>
                </div>
              </div>
              {myQuote.comentario && (
                <div className="p-3 bg-zinc-950/60 rounded-lg">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Tu comentario</p>
                  <p className="text-xs text-zinc-300">{myQuote.comentario}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl text-center">
              <XCircle className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-400">Esta solicitud no acepta cotizaciones</p>
              <p className="text-[11px] text-zinc-600 mt-1">Estado: {statusMeta.label}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
