'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import {
  Users, Search, Filter, Shield, Store, Wrench, Truck,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight, RefreshCw,
  User as UserIcon, Ban, Trash2,
} from 'lucide-react';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  createdAt: string;
  _count: {
    vehicles: number;
    requests: number;
    provider: number;
    workshop: number;
    towService: number;
  };
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/admin/users', { params });
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchUsers, 200);
    return () => clearTimeout(t);
  }, [roleFilter, statusFilter, search]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'ACTIVE').length,
    banned: users.filter((u) => u.status === 'BANNED').length,
  }), [users]);

  const handleToggleStatus = async (u: UserRow) => {
    const next = u.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    if (!confirm(`¿Cambiar estado de "${u.name}" a ${next}?`)) return;
    try {
      setActionId(u.id);
      await api.patch(`/admin/users/${u.id}/status`, { status: next });
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo cambiar el estado.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`¿Eliminar usuario "${u.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      setActionId(u.id);
      await api.delete(`/admin/users/${u.id}`);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar el usuario.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Gestión de Usuarios</span>
          </h2>
          <p className="text-sm text-zinc-400">Administra todos los usuarios del sistema.</p>
        </div>
        <button
          onClick={fetchUsers}
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
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Activos</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.active}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Bloqueados</p>
          <p className="text-2xl font-extrabold text-red-400 mt-1">{stats.banned}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs font-semibold"
        >
          <option value="ALL">Todos los roles</option>
          <option value="CLIENT">Cliente</option>
          <option value="PROVIDER">Proveedor</option>
          <option value="WORKSHOP">Taller</option>
          <option value="TOW_SERVICE">Grúa</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs font-semibold"
        >
          <option value="ALL">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
          <option value="BANNED">Bloqueado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-zinc-300 text-base">Sin resultados</h3>
          <p className="text-zinc-500 text-sm mt-1">No se encontraron usuarios con esos filtros.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const roleMeta = ROLE_META[u.role] || ROLE_META.CLIENT;
            const statusMeta = STATUS_META[u.status] || STATUS_META.ACTIVE;
            const RoleIcon = roleMeta.icon;
            const StatusIcon = statusMeta.icon;
            return (
              <div
                key={u.id}
                className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex items-center gap-4 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${roleMeta.bg} flex items-center justify-center shrink-0`}>
                  <RoleIcon className={`w-5 h-5 ${roleMeta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-zinc-200 text-sm truncate">{u.name}</p>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${roleMeta.bg} ${roleMeta.color}`}>
                      {roleMeta.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusMeta.bg} ${statusMeta.color}`}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">{u.email} {u.phone ? `· ${u.phone}` : ''}</p>
                  <div className="flex gap-3 mt-1 text-[10px] text-zinc-600">
                    <span>{u._count.requests} solicitudes</span>
                    {u._count.vehicles > 0 && <span>{u._count.vehicles} vehículos</span>}
                    {u._count.provider > 0 && <span className="text-amber-400">proveedor</span>}
                    {u._count.workshop > 0 && <span className="text-emerald-400">taller</span>}
                    {u._count.towService > 0 && <span className="text-rose-400">grúa</span>}
                    <span>· {new Date(u.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={actionId === u.id || u.role === 'ADMIN'}
                    className="px-2 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-30"
                  >
                    <Ban className="w-3 h-3" />
                    {u.status === 'ACTIVE' ? 'Bloquear' : 'Activar'}
                  </button>
                  {u.role !== 'ADMIN' && (
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={actionId === u.id}
                      className="px-2 py-1.5 bg-zinc-950 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <Link
                    href={`/dashboard/admin/users/${u.id}`}
                    className="px-2 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    Ver <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
