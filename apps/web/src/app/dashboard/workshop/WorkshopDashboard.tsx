'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useWorkshopProfile } from '../../../store/useWorkshopProfile';
import { Wrench, ClipboardList, TrendingUp, CheckCircle2, ArrowRight, DollarSign, Edit2, Building2, Plus, Inbox, Package } from 'lucide-react';

interface WorkshopService {
  id: string;
  nombre: string;
  descripcion?: string;
  precioReferencial?: string | number;
}

interface RequestItem {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  estado: string;
  createdAt: string;
  user: { name: string };
  vehicle?: { marca: string; modelo: string; anio: number } | null;
  _count?: { quotes: number };
}

export default function WorkshopDashboard() {
  const { workshop, loading: loadingWorkshop } = useWorkshopProfile();
  const [services, setServices] = useState<WorkshopService[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [quotesCount, setQuotesCount] = useState({ total: 0, accepted: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingWorkshop) return;
    let cancelled = false;
    async function fetchData() {
      try {
        const reqRes = await api.get('/requests/all');
        if (cancelled) return;
        const allReqs = (reqRes.data || []).filter(
          (r: RequestItem) => r.categoria === 'TALLER' && r.estado !== 'CANCELLED'
        );
        setRequests(allReqs);

        if (workshop?.services) {
          setServices(workshop.services);
        }

        setQuotesCount({ total: 0, accepted: 0, pending: 0 });
      } catch (err) {
        console.error('Error fetching workshop dashboard data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [workshop, loadingWorkshop]);

  if (loading || loadingWorkshop) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            <span>{workshop?.nombre || 'Mi Taller'}</span>
          </h2>
          <p className="text-sm text-zinc-400">Administra tus servicios mecánicos y responde a solicitudes de clientes.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/workshop/profile"
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-sm rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            <span>Editar Perfil</span>
          </Link>
          <Link
            href="/dashboard/workshop/services"
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-sm rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            <span>Servicios</span>
          </Link>
          <Link
            href="/dashboard/workshop/requests"
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 text-zinc-950 font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Ver Solicitudes</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Servicios</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100">{services.length}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
            <Wrench className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Solicitudes</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100">{requests.length}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <ClipboardList className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 md:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Estado</span>
            <p className="text-2xl md:text-3xl font-extrabold text-emerald-400">{workshop?.estado === 'ACTIVE' ? 'Activo' : 'Inactivo'}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-400" />
              <span>Solicitudes de Taller</span>
            </h3>
            <Link
              href="/dashboard/workshop/requests"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="p-8 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-2xl text-center">
                <Inbox className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-zinc-500 text-sm">No hay solicitudes mecánicas activas</p>
                <p className="text-zinc-600 text-xs mt-1">Las nuevas solicitudes aparecerán aquí</p>
              </div>
            ) : (
              requests.slice(0, 3).map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/workshop/requests/${r.id}`}
                  className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl flex items-center justify-between transition-colors block group"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <h4 className="font-bold text-zinc-200 text-sm truncate group-hover:text-emerald-300 transition-colors">{r.titulo}</h4>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{r.descripcion}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-semibold">
                        {r.user.name}
                      </span>
                      {r.vehicle && (
                        <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                          {r.vehicle.marca} {r.vehicle.modelo} {r.vehicle.anio}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500">
                        {new Date(r.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              <span>Mis Servicios</span>
            </h3>
            <Link
              href="/dashboard/workshop/services"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>Gestionar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {services.length === 0 ? (
              <div className="p-8 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-2xl text-center">
                <Wrench className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-zinc-500 text-sm">No has agregado servicios a tu taller</p>
                <Link
                  href="/dashboard/workshop/services"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-400 font-bold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar primer servicio
                </Link>
              </div>
            ) : (
              services.slice(0, 3).map((s) => (
                <div key={s.id} className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl flex items-center justify-between transition-colors">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-zinc-200 text-sm">{s.nombre}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{s.descripcion || 'Sin descripción'}</p>
                  </div>
                  <span className="text-base font-extrabold text-emerald-400 font-mono ml-3">
                    {s.precioReferencial != null ? `$${Number(s.precioReferencial).toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
