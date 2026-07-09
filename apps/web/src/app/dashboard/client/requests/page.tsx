'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import {
  ClipboardList, Plus, Search, Filter, MessageSquare, Car,
  ArrowRight, Tag, Wrench, Truck, MessageCircle,
  Calendar, CheckCircle2, XCircle, Clock, Inbox,
} from 'lucide-react';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
}

interface Quote {
  id: string;
  precio: number | string;
  estado: string;
  provider?: { nombre: string };
}

interface RequestItem {
  id: string;
  titulo: string;
  categoria: string;
  estado: string;
  descripcion: string;
  createdAt: string;
  vehicle?: Vehicle | null;
  quotes?: Quote[];
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  REPUESTO: { label: 'Repuesto', icon: Tag, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  TALLER: { label: 'Taller', icon: Wrench, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  GRUA: { label: 'Grúa', icon: Truck, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  CONSULTA: { label: 'Consulta', icon: MessageCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
};

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  OPEN: { label: 'Abierta', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  IN_PROGRESS: { label: 'En progreso', icon: Inbox, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  CLOSED: { label: 'Cerrada', icon: CheckCircle2, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  CANCELLED: { label: 'Cancelada', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await api.get('/requests');
        setRequests(res.data || []);
      } catch (err) {
        console.error('Error fetching requests:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (categoryFilter !== 'ALL' && r.categoria !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && r.estado !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${r.titulo} ${r.descripcion} ${r.vehicle?.marca ?? ''} ${r.vehicle?.modelo ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [requests, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      open: requests.filter((r) => r.estado === 'OPEN').length,
      inProgress: requests.filter((r) => r.estado === 'IN_PROGRESS').length,
      closed: requests.filter((r) => r.estado === 'CLOSED').length,
    };
  }, [requests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-400" />
            <span>Mis Solicitudes</span>
          </h2>
          <p className="text-sm text-zinc-400">
            Gestiona todas tus solicitudes de repuestos, talleres y grúas.
          </p>
        </div>
        <Link
          href="/dashboard/client/new-request"
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-zinc-950 font-bold rounded-xl flex items-center gap-2 transition-all text-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Solicitud</span>
        </Link>
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
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cerradas</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.closed}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, descripción, vehículo..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Filtros:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-200 text-xs font-semibold"
          >
            <option value="ALL">Todas las categorías</option>
            <option value="REPUESTO">Repuesto</option>
            <option value="TALLER">Taller</option>
            <option value="GRUA">Grúa</option>
            <option value="CONSULTA">Consulta</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-200 text-xs font-semibold"
          >
            <option value="ALL">Todos los estados</option>
            <option value="OPEN">Abierta</option>
            <option value="IN_PROGRESS">En progreso</option>
            <option value="CLOSED">Cerrada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Inbox className="w-8 h-8" />
          </div>
          {requests.length === 0 ? (
            <>
              <h3 className="font-bold text-zinc-300 text-base">No tienes solicitudes aún</h3>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                Crea tu primera solicitud con IA y recibe cotizaciones de proveedores, talleres y grúas.
              </p>
              <Link
                href="/dashboard/client/new-request"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold border border-zinc-800 rounded-xl transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Crear primera solicitud
              </Link>
            </>
          ) : (
            <>
              <h3 className="font-bold text-zinc-300 text-base">Sin resultados</h3>
              <p className="text-zinc-500 text-sm mt-1">Intenta con otros filtros o términos de búsqueda.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const catMeta = CATEGORY_META[r.categoria] || CATEGORY_META.CONSULTA;
            const statusMeta = STATUS_META[r.estado] || STATUS_META.OPEN;
            const CatIcon = catMeta.icon;
            const StatusIcon = statusMeta.icon;
            return (
              <Link
                key={r.id}
                href={`/dashboard/client/requests/${r.id}`}
                className="block p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${catMeta.bg} ${catMeta.color}`}>
                        <CatIcon className="w-3 h-3" />
                        {catMeta.label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusMeta.label}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                        {r.titulo}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.descripcion}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                      {r.vehicle && (
                        <span className="inline-flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" />
                          {r.vehicle.marca} {r.vehicle.modelo} {r.vehicle.anio}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(r.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 px-2.5 py-1 rounded-xl">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <strong>{r.quotes?.length || 0}</strong> cotizaciones
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 p-2 text-zinc-500 group-hover:text-indigo-400 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
