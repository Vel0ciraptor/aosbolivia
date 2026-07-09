'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useTowProfile } from '../../../../store/useTowProfile';
import {
  Truck, Search, Filter, ArrowRight, Phone, MapPin, ShieldAlert,
  Clock, CheckCircle2, XCircle, Inbox, ClipboardList, Car, Calendar,
  AlertCircle,
} from 'lucide-react';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
}

interface RequestItem {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  estado: string;
  createdAt: string;
  user: { name: string; phone?: string };
  vehicle?: Vehicle | null;
  aiParsed?: any;
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

function getClientCoords(r: RequestItem): { lat: number; lng: number } {
  if (r.aiParsed?.origen?.lat && r.aiParsed?.origen?.lng) {
    return { lat: r.aiParsed.origen.lat, lng: r.aiParsed.origen.lng };
  }
  return { lat: 10.4806, lng: -66.9036 };
}

export default function TowRequestsPage() {
  const { tow, loading: loadingTow, error: towError } = useTowProfile();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [onlyInRange, setOnlyInRange] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/requests/all');
        if (cancelled) return;
        const all = (res.data || []).filter((r: RequestItem) => r.categoria === 'GRUA');
        setRequests(all);
      } catch (err) {
        console.error('Error fetching tow requests:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const myProfile = tow || {
    latitud: 10.5050,
    longitud: -66.9200,
    cobertura: 50,
    costoBase: '25.00',
    costoKm: '2.50',
  };
  const costoBaseNum = parseFloat(String(myProfile.costoBase));
  const costoKmNum = parseFloat(String(myProfile.costoKm));

  const enriched = useMemo(() => {
    return requests.map((r) => {
      const coords = getClientCoords(r);
      const distance = haversine(myProfile.latitud, myProfile.longitud, coords.lat, coords.lng);
      const isCovered = distance <= myProfile.cobertura;
      const costEstimate = costoBaseNum + (distance * costoKmNum);
      return { ...r, distance, isCovered, costEstimate, coords };
    });
  }, [requests, myProfile.latitud, myProfile.longitud, myProfile.cobertura, costoBaseNum, costoKmNum]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (statusFilter !== 'ALL' && r.estado !== statusFilter) return false;
      if (onlyInRange && !r.isCovered) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${r.titulo} ${r.descripcion} ${r.user.name} ${r.vehicle?.marca ?? ''} ${r.vehicle?.modelo ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, search, statusFilter, onlyInRange]);

  const stats = useMemo(() => {
    return {
      total: enriched.length,
      open: enriched.filter((r) => r.estado === 'OPEN').length,
      inProgress: enriched.filter((r) => r.estado === 'IN_PROGRESS').length,
      inRange: enriched.filter((r) => r.isCovered).length,
    };
  }, [enriched]);

  if (loading || loadingTow) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (towError && !tow) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-zinc-200">No se pudo cargar el perfil</h3>
        <p className="text-sm text-zinc-400 mt-1">{towError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-rose-400" />
          <span>Solicitudes de Grúa</span>
        </h2>
        <p className="text-sm text-zinc-400">
          Todas las solicitudes de remolque activas. Distancias calculadas desde tu base.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.total}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Abiertas</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.open}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">En progreso</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.inProgress}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">En cobertura</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.inRange}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente, vehículo..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-100 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Estado:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-rose-500 text-zinc-200 text-xs font-semibold"
          >
            <option value="ALL">Todos</option>
            <option value="OPEN">Abierta</option>
            <option value="IN_PROGRESS">En progreso</option>
            <option value="CLOSED">Cerrada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl">
            <input
              type="checkbox"
              checked={onlyInRange}
              onChange={(e) => setOnlyInRange(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-rose-500 focus:ring-rose-500"
            />
            Solo en cobertura
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Inbox className="w-8 h-8" />
          </div>
          {enriched.length === 0 ? (
            <>
              <h3 className="font-bold text-zinc-300 text-base">No hay solicitudes de grúa</h3>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                Las nuevas solicitudes de remolque aparecerán aquí para que puedas responder.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-bold text-zinc-300 text-base">Sin resultados</h3>
              <p className="text-zinc-500 text-sm mt-1">Intenta con otros filtros o términos de búsqueda.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => {
            const statusMeta = STATUS_META[r.estado] || STATUS_META.OPEN;
            const StatusIcon = statusMeta.icon;
            return (
              <Link
                key={r.id}
                href={`/dashboard/tow/requests/${r.id}`}
                className="block p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl space-y-3 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 border-rose-500/20 text-rose-400">
                      <Truck className="w-3 h-3" /> GRÚA
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusMeta.label}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-zinc-100 group-hover:text-rose-300 transition-colors line-clamp-1">
                    {r.titulo}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.descripcion}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800/60 text-xs">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <div>
                      <p className="text-[10px] text-zinc-500">Distancia</p>
                      <p className="font-bold text-zinc-200 font-mono">{r.distance.toFixed(1)} km</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-zinc-500" />
                    <div>
                      <p className="text-[10px] text-zinc-500">Costo est.</p>
                      <p className="font-bold text-emerald-400 font-mono">${r.costEstimate.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {!r.isCovered && (
                  <div className="flex items-center gap-1.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Fuera de tu radio de cobertura ({r.distance.toFixed(0)} km &gt; {myProfile.cobertura} km)</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                  <span className="inline-flex items-center gap-1 font-semibold text-zinc-300">
                    <Phone className="w-3.5 h-3.5" />
                    {r.user.name}
                  </span>
                  {r.vehicle && (
                    <span className="inline-flex items-center gap-1">
                      <Car className="w-3.5 h-3.5" />
                      {r.vehicle.marca} {r.vehicle.modelo} {r.vehicle.anio}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 transition-colors ml-auto" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
