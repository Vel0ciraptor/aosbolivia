'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '../../../../../lib/api';
import {
  ArrowLeft, Loader2, AlertCircle, Mail, Phone, Calendar, Shield,
  Users, Store, Wrench, Truck, User as UserIcon, CheckCircle2, XCircle,
  Clock, Ban, ChevronRight, Car, ClipboardList, MessageSquareCode,
} from 'lucide-react';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
}

interface RequestItem {
  id: string;
  titulo: string;
  categoria: string;
  estado: string;
  createdAt: string;
  _count: { quotes: number };
}

interface Provider {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  estado: string;
  _count: { parts: number; quotes: number };
}

interface Workshop {
  id: string;
  nombre: string;
  descripcion?: string;
  telefono: string;
  direccion: string;
  estado: string;
  services: Array<{ id: string; nombre: string }>;
  _count: { quotes: number };
}

interface Tow {
  id: string;
  nombre: string;
  telefono: string;
  costoBase: number | string;
  costoKm: number | string;
  cobertura: number | string;
  estado: string;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  avatarUrl?: string;
  createdAt: string;
  vehicles: Vehicle[];
  requests: RequestItem[];
  provider: Provider | null;
  workshop: Workshop | null;
  towService: Tow | null;
}

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  CLIENT: { label: 'Cliente', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Users },
  PROVIDER: { label: 'Proveedor', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Store },
  WORKSHOP: { label: 'Taller', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Wrench },
  TOW_SERVICE: { label: 'Grúa', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: Truck },
  ADMIN: { label: 'Admin', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: Shield },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ACTIVE: { label: 'Activo', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  INACTIVE: { label: 'Inactivo', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20', icon: Clock },
  BANNED: { label: 'Bloqueado', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: Ban },
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUser = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/users/${id}`);
      setUser(res.data);
    } catch (err: any) {
      console.error('Error fetching user:', err);
      setError(err.response?.data?.message || 'No se pudo cargar el usuario.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchUser();
  }, [id, fetchUser]);

  const handleToggleStatus = async () => {
    if (!user) return;
    const next = user.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    if (!confirm(`¿Cambiar estado a ${next}?`)) return;
    try {
      setActionLoading(true);
      await api.patch(`/admin/users/${user.id}/status`, { status: next });
      await fetchUser();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo cambiar el estado.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (newRole: string) => {
    if (!user) return;
    if (!confirm(`¿Cambiar rol de ${user.role} a ${newRole}?`)) return;
    try {
      setActionLoading(true);
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole });
      await fetchUser();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo cambiar el rol.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`¿Eliminar usuario "${user.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      setActionLoading(true);
      await api.delete(`/admin/users/${user.id}`);
      window.location.href = '/dashboard/admin/users';
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar el usuario.');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="font-bold text-zinc-200">No se pudo cargar el usuario</h3>
          <p className="text-sm text-zinc-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const roleMeta = ROLE_META[user.role] || ROLE_META.CLIENT;
  const statusMeta = STATUS_META[user.status] || STATUS_META.ACTIVE;
  const RoleIcon = roleMeta.icon;
  const StatusIcon = statusMeta.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/admin/users"
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${roleMeta.bg} ${roleMeta.color}`}>
              <RoleIcon className="w-3 h-3" />
              {roleMeta.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusMeta.label}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 truncate">{user.name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-4">Información Personal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Email</p>
                <p className="text-sm text-zinc-200 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-zinc-500" />{user.email}</p>
              </div>
              {user.phone && (
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Teléfono</p>
                  <p className="text-sm text-zinc-200 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-zinc-500" />{user.phone}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Registrado</p>
                <p className="text-sm text-zinc-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  {new Date(user.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">ID interno</p>
                <p className="text-xs text-zinc-400 font-mono">{user.id}</p>
              </div>
            </div>
          </div>

          {user.vehicles && user.vehicles.length > 0 && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Car className="w-4 h-4 text-indigo-400" /> Vehículos ({user.vehicles.length})
              </h3>
              <div className="space-y-2">
                {user.vehicles.map((v) => (
                  <div key={v.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-indigo-400">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-200">{v.marca} {v.modelo} {v.anio}</p>
                      {v.placa && <p className="text-[10px] text-zinc-500">Placa: {v.placa}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.requests && user.requests.length > 0 && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-400" /> Solicitudes recientes ({user.requests.length})
              </h3>
              <div className="space-y-2">
                {user.requests.map((r) => (
                  <div key={r.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-zinc-200 flex-1 min-w-0 truncate">{r.titulo}</p>
                      <span className="text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase bg-indigo-500/10 border-indigo-500/20 text-indigo-400">{r.categoria}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase bg-zinc-500/10 border-zinc-500/20 text-zinc-400">{r.estado}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      {new Date(r.createdAt).toLocaleDateString('es-VE')} · {r._count.quotes} cotizaciones
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.provider && (
            <div className="p-6 bg-zinc-900 border border-amber-500/20 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Store className="w-4 h-4" /> Negocio de Repuestos
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><p className="text-zinc-500 text-[10px]">Nombre</p><p className="text-zinc-200 font-bold">{user.provider.nombre}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Estado</p><p className="text-zinc-200 font-bold">{user.provider.estado}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Teléfono</p><p className="text-zinc-200">{user.provider.telefono}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Email</p><p className="text-zinc-200">{user.provider.email}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Repuestos</p><p className="text-zinc-200 font-bold">{user.provider._count.parts}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Cotizaciones</p><p className="text-zinc-200 font-bold">{user.provider._count.quotes}</p></div>
              </div>
            </div>
          )}

          {user.workshop && (
            <div className="p-6 bg-zinc-900 border border-emerald-500/20 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Taller
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><p className="text-zinc-500 text-[10px]">Nombre</p><p className="text-zinc-200 font-bold">{user.workshop.nombre}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Estado</p><p className="text-zinc-200 font-bold">{user.workshop.estado}</p></div>
                <div className="col-span-2"><p className="text-zinc-500 text-[10px]">Dirección</p><p className="text-zinc-200">{user.workshop.direccion}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Servicios</p><p className="text-zinc-200 font-bold">{user.workshop.services.length}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Cotizaciones</p><p className="text-zinc-200 font-bold">{user.workshop._count.quotes}</p></div>
              </div>
              {user.workshop.services.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {user.workshop.services.map((s) => (
                    <span key={s.id} className="text-[10px] px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-full font-semibold">
                      {s.nombre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {user.towService && (
            <div className="p-6 bg-zinc-900 border border-rose-500/20 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4" /> Servicio de Grúa
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><p className="text-zinc-500 text-[10px]">Nombre</p><p className="text-zinc-200 font-bold">{user.towService.nombre}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Estado</p><p className="text-zinc-200 font-bold">{user.towService.estado}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Tarifa base</p><p className="text-zinc-200 font-mono">${user.towService.costoBase}</p></div>
                <div><p className="text-zinc-500 text-[10px]">Por km</p><p className="text-zinc-200 font-mono">${user.towService.costoKm}</p></div>
                <div className="col-span-2"><p className="text-zinc-500 text-[10px]">Cobertura</p><p className="text-zinc-200">{user.towService.cobertura} km</p></div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Acciones de moderación</h3>
            <button
              onClick={handleToggleStatus}
              disabled={actionLoading || user.role === 'ADMIN'}
              className="w-full px-3 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
            >
              {user.status === 'ACTIVE' ? <><Ban className="w-4 h-4" /> Bloquear usuario</> : <><CheckCircle2 className="w-4 h-4" /> Activar usuario</>}
            </button>
            {user.role !== 'ADMIN' && (
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="w-full px-3 py-2.5 bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 text-red-300 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
              >
                <XCircle className="w-4 h-4" /> Eliminar usuario
              </button>
            )}
          </div>

          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Cambiar rol</h3>
            <p className="text-[11px] text-zinc-500">Actual: <span className="font-bold text-zinc-300">{roleMeta.label}</span></p>
            <div className="space-y-1.5">
              {Object.entries(ROLE_META).filter(([k]) => k !== user.role && k !== 'ADMIN').map(([k, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={k}
                    onClick={() => handleChangeRole(k)}
                    disabled={actionLoading}
                    className="w-full px-3 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-30"
                  >
                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    Cambiar a {meta.label}
                  </button>
                );
              })}
              {user.role === 'ADMIN' && (
                <p className="text-[11px] text-zinc-500 italic">Los admins no pueden cambiar su propio rol desde aquí.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
