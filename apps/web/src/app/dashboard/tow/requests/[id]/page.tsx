'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '../../../../../lib/api';
import { useTowProfile } from '../../../../../store/useTowProfile';
import {
  ArrowLeft, Loader2, AlertCircle, Car, Phone, Mail, Calendar,
  Truck, MapPin, ShieldAlert, Clock, Inbox, CheckCircle2, XCircle,
  FileText, Sparkles, Building2, Hash, Send, Play, Check,
  Navigation,
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

interface RequestDetail {
  id: string;
  titulo: string;
  categoria: string;
  estado: string;
  descripcion: string;
  createdAt: string;
  aiParsed?: any;
  vehicle?: Vehicle | null;
  user: { name: string; email?: string; phone?: string };
  messages?: any[];
  quotes?: any[];
}

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  OPEN: { label: 'Abierta', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  IN_PROGRESS: { label: 'En progreso', icon: Inbox, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  CLOSED: { label: 'Cerrada', icon: CheckCircle2, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  CANCELLED: { label: 'Cancelada', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TowRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { tow } = useTowProfile();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleUpdateStatus = async (newStatus: 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED') => {
    setUpdating(true);
    setActionMessage(null);
    try {
      await api.put(`/requests/${id}/status`, { estado: newStatus });
      const labels: Record<string, string> = {
        IN_PROGRESS: 'Solicitud marcada como en progreso.',
        CLOSED: 'Solicitud cerrada.',
        CANCELLED: 'Solicitud cancelada.',
      };
      setActionMessage({ type: 'success', text: labels[newStatus] });
      await fetchRequest();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo actualizar la solicitud.',
      });
    } finally {
      setUpdating(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/tow/requests"
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

  const myProfile = tow || {
    latitud: 10.5050,
    longitud: -66.9200,
    cobertura: 50,
    costoBase: '25.00',
    costoKm: '2.50',
  };

  const coords = request.aiParsed?.origen?.lat && request.aiParsed?.origen?.lng
    ? { lat: request.aiParsed.origen.lat, lng: request.aiParsed.origen.lng }
    : { lat: 10.4806, lng: -66.9036 };
  const distance = haversine(myProfile.latitud, myProfile.longitud, coords.lat, coords.lng);
  const isCovered = distance <= myProfile.cobertura;
  const costoBaseNum = parseFloat(String(myProfile.costoBase));
  const costoKmNum = parseFloat(String(myProfile.costoKm));
  const costEstimate = costoBaseNum + (distance * costoKmNum);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tow/requests"
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 border-rose-500/20 text-rose-400">
              <Truck className="w-3 h-3" /> GRÚA
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusMeta.label}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 truncate">{request.titulo}</h2>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
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
              <FileText className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Descripción de la Emergencia</h3>
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
            <div className="p-6 bg-gradient-to-br from-rose-950/30 to-zinc-900 border border-rose-500/20 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-rose-500/20">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Datos Detectados</h3>
              </div>
              {request.aiParsed.resumen && (
                <p className="text-sm text-zinc-200 font-semibold">{request.aiParsed.resumen}</p>
              )}
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
                {request.aiParsed.ubicacion && (
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Ubicación</p>
                    <p className="text-sm text-zinc-200 font-bold mt-0.5">{request.aiParsed.ubicacion}</p>
                  </div>
                )}
                {request.aiParsed.especialidad && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                    <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Tipo</p>
                    <p className="text-sm text-zinc-100 font-bold mt-0.5 capitalize">{request.aiParsed.especialidad}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {request.vehicle && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                <Car className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Vehículo</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-rose-400">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-200">{request.vehicle.marca} {request.vehicle.modelo}</h4>
                  <p className="text-[11px] text-zinc-500">Año {request.vehicle.anio}</p>
                </div>
              </div>
              {(request.vehicle.placa || request.vehicle.motor || request.vehicle.combustible) && (
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
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-gradient-to-br from-rose-950/30 to-zinc-900 border border-rose-500/30 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-rose-500/20">
              <Truck className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Resumen del Servicio</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl">
                <span className="text-[11px] text-zinc-500 font-semibold uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Distancia
                </span>
                <span className="text-base font-extrabold text-zinc-100 font-mono">{distance.toFixed(1)} km</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl">
                <span className="text-[11px] text-zinc-500 font-semibold uppercase">Tarifa base</span>
                <span className="text-sm font-bold text-zinc-200 font-mono">${costoBaseNum.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl">
                <span className="text-[11px] text-zinc-500 font-semibold uppercase">Por km</span>
                <span className="text-sm font-bold text-zinc-200 font-mono">${costoKmNum.toFixed(2)}/km</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Costo total est.</span>
                <span className="text-2xl font-extrabold text-emerald-400 font-mono">${costEstimate.toFixed(2)}</span>
              </div>
            </div>

            {!isCovered && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="text-[11px] text-amber-300">
                  <p className="font-bold">Fuera de tu cobertura habitual</p>
                  <p className="text-amber-400/80 mt-0.5">
                    La distancia ({distance.toFixed(0)} km) supera tu radio configurado ({myProfile.cobertura} km).
                  </p>
                </div>
              </div>
            )}

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-bold rounded-xl transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Abrir en Google Maps
            </a>
          </div>

          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
              <Building2 className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Cliente</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <span className="text-base font-bold">{request.user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-zinc-200 truncate">{request.user.name}</h4>
                {request.user.email && (
                  <p className="text-[11px] text-zinc-500 truncate">{request.user.email}</p>
                )}
              </div>
            </div>
            {request.user.phone && (
              <a
                href={`tel:${request.user.phone}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-bold rounded-xl transition-colors"
              >
                <Phone className="w-4 h-4" />
                Llamar al cliente
              </a>
            )}
          </div>

          {(request.estado === 'OPEN' || request.estado === 'IN_PROGRESS') && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                <Send className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Acciones</h3>
              </div>
              <div className="space-y-2">
                {request.estado === 'OPEN' && (
                  <button
                    onClick={() => handleUpdateStatus('IN_PROGRESS')}
                    disabled={updating}
                    className="w-full px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Asignarme este servicio
                  </button>
                )}
                <button
                  onClick={() => handleUpdateStatus('CLOSED')}
                  disabled={updating}
                  className="w-full px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Marcar como completado
                </button>
                <button
                  onClick={() => handleUpdateStatus('CANCELLED')}
                  disabled={updating}
                  className="w-full px-4 py-2.5 bg-zinc-950 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar servicio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
