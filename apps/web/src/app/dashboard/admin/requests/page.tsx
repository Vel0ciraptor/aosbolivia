'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import {
  ClipboardList, Search, Filter, Tag, Car, Calendar, MessageSquare,
  Clock, CheckCircle2, XCircle, Inbox, AlertCircle, RefreshCw, Trash2,
  Wrench, Truck, Package, Store, User as UserIcon,
} from 'lucide-react';

interface RequestRow {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  estado: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  vehicle?: { marca: string; modelo: string; anio: number } | null;
  _count: { quotes: number; messages: number };
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  REPUESTO: { label: 'Repuesto', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: Package },
  TALLER: { label: 'Taller', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Wrench },
  GRUA: { label: 'Grúa', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: Truck },
  CONSULTA: { label: 'Consulta', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: MessageSquare },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  OPEN: { label: 'Abierta', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Clock },
  IN_PROGRESS: { label: 'En progreso', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Inbox },
  CLOSED: { label: 'Cerrada', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('ALL');
  const [estadoFilter, setEstadoFilter] = useState<string>('ALL');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (categoriaFilter !== 'ALL') params.categoria = categoriaFilter;
      if (estadoFilter !== 'ALL') params.estado = estadoFilter;
      const res = await api.get('/admin/requests', { params });
      setRequests(res.data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [categoriaFilter, estadoFilter]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${r.titulo} ${r.descripcion} ${r.user.name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [requests, search]);

  const stats = useMemo(() => ({
    total: requests.length,
    open: requests.filter((r) => r.estado === 'OPEN').length,
    inProgress: requests.filter((r) => r.estado === 'IN_PROGRESS').length,
  }), [requests]);

  const handleDelete = async (r: RequestRow) => {
    if (!confirm(`¿Eliminar solicitud "${r.titulo}"? Se borrarán también las cotizaciones asociadas.`)) return;
    try {
      setActionId(r.id);
      await api.delete(`/admin/requests/${r.id}`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar la solicitud.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-400" />
            <span>Todas las Solicitudes</span>
          </h2>
          <p className="text-sm text-zinc-400">Monitorea y modera las solicitudes de toda la plataforma.</p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-zinc-300 transition-colors flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Recargar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.total}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Abiertas</p>
          <p className="text-2xl font-extrabold text-blue-400 mt-1">{stats.open}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">En progreso</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.inProgress}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, descripción o cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-amber-500 text-zinc-100 text-sm"
          />
        </div>
        <select
          value={categoriaFilter}
          onChange={(e) => setCategoriaFilter(e.target.value)}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs font-semibold"
        >
          <option value="ALL">Todas las categorías</option>
          <option value="REPUESTO">Repuesto</option>
          <option value="TALLER">Taller</option>
          <option value="GRUA">Grúa</option>
          <option value="CONSULTA">Consulta</option>
        </select>
        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs font-semibold"
        >
          <option value="ALL">Todos los estados</option>
          <option value="OPEN">Abierta</option>
          <option value="IN_PROGRESS">En progreso</option>
          <option value="CLOSED">Cerrada</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-zinc-300 text-base">Sin resultados</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const catMeta = CATEGORY_META[r.categoria] || CATEGORY_META.CONSULTA;
            const statusMeta = STATUS_META[r.estado] || STATUS_META.OPEN;
            const CatIcon = catMeta.icon;
            const StatusIcon = statusMeta.icon;
            return (
              <div key={r.id} className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex items-center gap-4 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${catMeta.bg} flex items-center justify-center shrink-0`}>
                  <CatIcon className={`w-5 h-5 ${catMeta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-zinc-200 text-sm truncate">{r.titulo}</p>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${catMeta.bg} ${catMeta.color}`}>
                      {catMeta.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
                      <StatusIcon className="w-2.5 h-2.5" /> {statusMeta.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">
                    <UserIcon className="w-2.5 h-2.5 inline mr-0.5" /> {r.user.name} · {r.user.email}
                    {r.vehicle && <> · {r.vehicle.marca} {r.vehicle.modelo} {r.vehicle.anio}</>}
                  </p>
                  <div className="flex gap-3 mt-1 text-[10px] text-zinc-600">
                    <span>{r._count.quotes} cotizaciones</span>
                    <span>{r._count.messages} mensajes</span>
                    <span>{new Date(r.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(r)}
                  disabled={actionId === r.id}
                  className="px-2 py-1.5 bg-zinc-950 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-30"
                >
                  <Trash2 className="w-3 h-3" /> Eliminar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
