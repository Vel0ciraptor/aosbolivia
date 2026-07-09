'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../lib/api';
import {
  MessageSquareCode, Search, Filter, Calendar, CheckCircle2,
  XCircle, Clock, AlertCircle, DollarSign, Store, Wrench, RefreshCw, Trash2,
} from 'lucide-react';

interface QuoteRow {
  id: string;
  precio: number | string;
  comentario?: string;
  tiempoEntrega?: string;
  estado: string;
  createdAt: string;
  provider?: { id: string; nombre: string } | null;
  workshop?: { id: string; nombre: string } | null;
  request: { id: string; titulo: string; categoria: string; estado: string };
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
  ACCEPTED: { label: 'Aceptada', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  REJECTED: { label: 'Rechazada', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
  EXPIRED: { label: 'Expirada', color: 'text-zinc-500', bg: 'bg-zinc-500/10 border-zinc-500/20', icon: Clock },
};

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  REPUESTO: { label: 'Repuesto', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  TALLER: { label: 'Taller', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  GRUA: { label: 'Grúa', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  CONSULTA: { label: 'Consulta', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
};

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') params.estado = statusFilter;
      const res = await api.get('/admin/quotes', { params });
      setQuotes(res.data || []);
    } catch (err) {
      console.error('Error fetching quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (search.trim()) {
        const s = search.toLowerCase();
        const haystack = `${q.request.titulo} ${q.provider?.nombre ?? ''} ${q.workshop?.nombre ?? ''} ${q.comentario ?? ''}`.toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [quotes, search]);

  const stats = useMemo(() => {
    const totalValue = quotes.reduce((sum, q) => sum + (typeof q.precio === 'string' ? parseFloat(q.precio) : q.precio), 0);
    const acceptedValue = quotes
      .filter((q) => q.estado === 'ACCEPTED')
      .reduce((sum, q) => sum + (typeof q.precio === 'string' ? parseFloat(q.precio) : q.precio), 0);
    return {
      total: quotes.length,
      pending: quotes.filter((q) => q.estado === 'PENDING').length,
      accepted: quotes.filter((q) => q.estado === 'ACCEPTED').length,
      rejected: quotes.filter((q) => q.estado === 'REJECTED').length,
      totalValue,
      acceptedValue,
    };
  }, [quotes]);

  const handleDelete = async (q: QuoteRow) => {
    if (!confirm(`¿Eliminar cotización de $${q.precio}?`)) return;
    try {
      setActionId(q.id);
      await api.delete(`/admin/quotes/${q.id}`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar la cotización.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <MessageSquareCode className="w-6 h-6 text-purple-400" />
            <span>Todas las Cotizaciones</span>
          </h2>
          <p className="text-sm text-zinc-400">Monitorea todas las cotizaciones de la plataforma.</p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-zinc-300 transition-colors flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Recargar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{stats.total}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-1">{stats.pending}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Aceptadas</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.accepted}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Rechazadas</p>
          <p className="text-2xl font-extrabold text-red-400 mt-1">{stats.rejected}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Valor cotizado</p>
          <p className="text-xl font-extrabold text-zinc-100 font-mono mt-1">${stats.totalValue.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Valor aceptado</p>
          <p className="text-xl font-extrabold text-emerald-400 font-mono mt-1">${stats.acceptedValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por solicitud, negocio, comentario..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-purple-500 text-zinc-100 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs font-semibold"
        >
          <option value="ALL">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="ACCEPTED">Aceptada</option>
          <option value="REJECTED">Rechazada</option>
          <option value="EXPIRED">Expirada</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <MessageSquareCode className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-zinc-300 text-base">Sin cotizaciones</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => {
            const statusMeta = STATUS_META[q.estado] || STATUS_META.PENDING;
            const catMeta = CATEGORY_META[q.request.categoria] || CATEGORY_META.CONSULTA;
            const StatusIcon = statusMeta.icon;
            const businessName = q.provider?.nombre || q.workshop?.nombre || 'Negocio eliminado';
            const BusinessIcon = q.provider ? Store : q.workshop ? Wrench : MessageSquareCode;
            const precioNum = typeof q.precio === 'string' ? parseFloat(q.precio) : q.precio;
            return (
              <div key={q.id} className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex items-center gap-4 transition-colors">
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Precio</p>
                  <p className="text-xl font-extrabold text-emerald-400 font-mono">${precioNum.toFixed(2)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-zinc-200 text-sm truncate">{q.request.titulo}</p>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${catMeta.bg} ${catMeta.color}`}>
                      {catMeta.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
                      <StatusIcon className="w-2.5 h-2.5" /> {statusMeta.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1">
                    <BusinessIcon className="w-3 h-3" /> {businessName}
                    {q.tiempoEntrega && <> · {q.tiempoEntrega}</>}
                  </p>
                  {q.comentario && (
                    <p className="text-[10px] text-zinc-600 truncate italic mt-0.5">&ldquo;{q.comentario}&rdquo;</p>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    <Calendar className="w-2.5 h-2.5 inline mr-0.5" />
                    {new Date(q.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(q)}
                  disabled={actionId === q.id}
                  className="px-2 py-1.5 bg-zinc-950 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-30 shrink-0"
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
