'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import {
  Shield, Users, Store, Wrench, Truck, ClipboardList, MessageSquareCode,
  TrendingUp, AlertCircle, Package, Car, ArrowRight, CheckCircle2, XCircle,
  Clock, Activity, ChevronRight,
} from 'lucide-react';

interface AdminStats {
  users: {
    total: number;
    clients: number;
    providers: number;
    workshops: number;
    tows: number;
  };
  requests: {
    total: number;
    open: number;
  };
  quotes: {
    total: number;
    accepted: number;
  };
  catalog: {
    activeParts: number;
    vehicles: number;
  };
  businessStatus: Record<string, number>;
  recentUsers: Array<{ id: string; name: string; email: string; role: string; createdAt: string }>;
}

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  CLIENT: { label: 'Cliente', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Users },
  PROVIDER: { label: 'Proveedor', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Store },
  WORKSHOP: { label: 'Taller', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Wrench },
  TOW_SERVICE: { label: 'Grúa', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: Truck },
  ADMIN: { label: 'Admin', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: Shield },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await api.get('/admin/stats');
        if (!cancelled) setStats(res.data);
      } catch (err: any) {
        console.error('Error fetching admin stats:', err);
        setError(err.response?.data?.message || 'No se pudieron cargar las estadísticas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-zinc-200">No se pudieron cargar las estadísticas</h3>
        <p className="text-sm text-zinc-400 mt-1">{error}</p>
      </div>
    );
  }

  const activeBusinessCount = (stats.businessStatus.ACTIVE || 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-400" />
            <span>Panel Administrativo</span>
          </h2>
          <p className="text-sm text-zinc-400">Vista general de la plataforma, métricas y acciones de moderación.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/admin/users"
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-sm rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>Usuarios</span>
          </Link>
          <Link
            href="/dashboard/admin/requests"
            className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-zinc-950 font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            <span>Monitoreo</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Usuarios</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100">{stats.users.total}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Negocios</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100">
              {stats.users.providers + stats.users.workshops + stats.users.tows}
            </p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <Store className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Solicitudes</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100">{stats.requests.total}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <ClipboardList className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Cotizaciones</span>
            <p className="text-2xl md:text-3xl font-extrabold text-zinc-100">{stats.quotes.total}</p>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
            <MessageSquareCode className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Clientes</p>
          <p className="text-2xl font-extrabold text-blue-400 mt-1">{stats.users.clients}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Proveedores</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-1">{stats.users.providers}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Talleres</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.users.workshops}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Grúas</p>
          <p className="text-2xl font-extrabold text-rose-400 mt-1">{stats.users.tows}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-400" />
              <span>Acciones rápidas</span>
            </h3>
          </div>
          <div className="space-y-2">
            {[
              { name: 'Gestionar Usuarios', href: '/dashboard/admin/users', icon: Users, desc: `${stats.users.total} usuarios registrados`, color: 'text-indigo-400' },
              { name: 'Proveedores', href: '/dashboard/admin/providers', icon: Store, desc: `${stats.users.providers} negocios de repuestos`, color: 'text-amber-400' },
              { name: 'Talleres', href: '/dashboard/admin/workshops', icon: Wrench, desc: `${stats.users.workshops} talleres mecánicos`, color: 'text-emerald-400' },
              { name: 'Servicios de Grúa', href: '/dashboard/admin/tows', icon: Truck, desc: `${stats.users.tows} servicios de grúa`, color: 'text-rose-400' },
              { name: 'Todas las Solicitudes', href: '/dashboard/admin/requests', icon: ClipboardList, desc: `${stats.requests.open} abiertas de ${stats.requests.total}`, color: 'text-amber-400' },
              { name: 'Todas las Cotizaciones', href: '/dashboard/admin/quotes', icon: MessageSquareCode, desc: `${stats.quotes.accepted} aceptadas de ${stats.quotes.total}`, color: 'text-purple-400' },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${a.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-200 text-sm">{a.name}</p>
                      <p className="text-[11px] text-zinc-500">{a.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-400" />
              <span>Usuarios recientes</span>
            </h3>
            <Link
              href="/dashboard/admin/users"
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {stats.recentUsers.length === 0 ? (
              <div className="p-8 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-2xl text-center">
                <p className="text-zinc-500 text-sm">Sin usuarios recientes</p>
              </div>
            ) : (
              stats.recentUsers.map((u) => {
                const meta = ROLE_META[u.role] || ROLE_META.CLIENT;
                const Icon = meta.icon;
                return (
                  <Link
                    key={u.id}
                    href={`/dashboard/admin/users/${u.id}`}
                    className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-200 text-sm truncate">{u.name}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Repuestos activos</p>
              <p className="text-xl font-extrabold text-indigo-400 mt-1">{stats.catalog.activeParts}</p>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Vehículos</p>
              <p className="text-xl font-extrabold text-emerald-400 mt-1">{stats.catalog.vehicles}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
