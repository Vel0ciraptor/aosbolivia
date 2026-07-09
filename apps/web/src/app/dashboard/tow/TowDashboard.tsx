'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useTowProfile } from '../../../store/useTowProfile';
import { Truck, ClipboardList, TrendingUp, Compass, ArrowRight, Phone, ShieldAlert, MapPin, Inbox, Edit2 } from 'lucide-react';

interface RequestItem {
  id: string;
  titulo: string;
  descripcion: string;
  createdAt: string;
  categoria: string;
  estado: string;
  user: { name: string; phone?: string };
  vehicle?: { marca: string; modelo: string; anio: number } | null;
  aiParsed?: any;
}

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

export default function TowDashboard() {
  const { tow, loading: loadingTow } = useTowProfile();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingTow) return;
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await api.get('/requests/all');
        if (cancelled) return;
        const allRequests = (res.data || []).filter(
          (r: RequestItem) => r.categoria === 'GRUA' && r.estado !== 'CANCELLED'
        );
        setRequests(allRequests);
      } catch (err) {
        console.error('Error fetching tow dashboard data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [loadingTow]);

  if (loading || loadingTow) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myProfile = tow || {
    nombre: 'Mi Servicio de Grúa',
    costoBase: '25.00',
    costoKm: '2.50',
    cobertura: 50,
    latitud: 10.5050,
    longitud: -66.9200,
  };
  const costoBaseNum = parseFloat(String(myProfile.costoBase));
  const costoKmNum = parseFloat(String(myProfile.costoKm));

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-rose-400" />
            <span>{myProfile.nombre}</span>
          </h2>
          <p className="text-sm text-zinc-400">Administra tus servicios de auxilio vial y remolque automotriz.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/tow/profile"
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-sm rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            <span>Editar Perfil</span>
          </Link>
          <Link
            href="/dashboard/tow/requests"
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 text-zinc-950 font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Ver Solicitudes</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Tarifa Base</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100 font-mono">${costoBaseNum.toFixed(2)}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
            <Truck className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Por Kilómetro</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100 font-mono">${costoKmNum.toFixed(2)}/km</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Cobertura</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100 font-mono">{myProfile.cobertura} km</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <Compass className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Solicitudes</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100">{requests.length}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400">
            <ClipboardList className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>
      </div>

      {/* Towing Requests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            <span>Solicitudes de Grúa Activas</span>
          </h3>
          <Link
            href="/dashboard/tow/requests"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
            <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-zinc-300 text-base">No hay solicitudes de grúa activas</h3>
            <p className="text-zinc-500 text-sm mt-1">
              Las nuevas solicitudes de remolque aparecerán aquí en tiempo real.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.slice(0, 4).map((r) => {
              const coords = getClientCoords(r);
              const distance = haversine(myProfile.latitud, myProfile.longitud, coords.lat, coords.lng);
              const isCovered = distance <= myProfile.cobertura;
              const costEstimate = costoBaseNum + (distance * costoKmNum);
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/tow/requests/${r.id}`}
                  className="p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl space-y-3 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Solicitud de Remolque
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(r.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <h4 className="font-bold text-zinc-200 text-base group-hover:text-rose-300 transition-colors line-clamp-1">
                    {r.titulo}
                  </h4>
                  <p className="text-xs text-zinc-500 line-clamp-2">{r.descripcion}</p>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800/60 text-xs">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <div>
                        <p className="text-[10px] text-zinc-500">Distancia</p>
                        <p className="font-bold text-zinc-200 font-mono">{distance.toFixed(1)} km</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-zinc-500" />
                      <div>
                        <p className="text-[10px] text-zinc-500">Costo est.</p>
                        <p className="font-bold text-emerald-400 font-mono">${costEstimate.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {!isCovered && (
                    <div className="flex items-center gap-1.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Fuera de tu radio de cobertura</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-zinc-300 truncate max-w-[140px]">{r.user.name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
