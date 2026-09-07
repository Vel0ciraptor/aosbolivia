'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../lib/api';
import {
  Users, Plus, Loader2, AlertCircle, CheckCircle2, Copy, Share2,
  Shield, Wrench, Package, Calculator, Eye, MoreVertical, Trash2, Edit, X,
} from 'lucide-react';

interface WorkshopUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  createdAt: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any; description: string }> = {
  SUPERVISOR: {
    label: 'Supervisor',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    icon: Shield,
    description: 'CRM, Inventario, Cotizaciones, Reportes',
  },
  JEFE_MECANICO: {
    label: 'Jefe Mecánico',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: Wrench,
    description: 'CRM, Asignar trabajos, Inventario',
  },
  MECANICO: {
    label: 'Mecánico',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: Wrench,
    description: 'Ver trabajos, Usar piezas, Subir fotos',
  },
  INVENTARIO: {
    label: 'Inventario',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: Package,
    description: 'CRUD inventario, Movimientos de stock',
  },
  CONTABILIDAD: {
    label: 'Contabilidad',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: Calculator,
    description: 'Ver cotizaciones, Reportes financieros',
  },
};

interface TeamTabProps {
  workshopName: string;
}

export default function TeamTab({ workshopName }: TeamTabProps) {
  const [users, setUsers] = useState<WorkshopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<WorkshopUser | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/workshops/me/users');
      setUsers(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo cargar el equipo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async (data: { name: string; emailPrefix: string; phone: string; role: string }) => {
    try {
      const res = await api.post('/workshops/me/users', data);
      setCredentials({
        name: res.data.name,
        email: res.data.email,
        password: res.data.plainPassword,
      });
      setShowCreateModal(false);
      setMessage({ type: 'success', text: `${data.name} fue creado correctamente` });
      loadUsers();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo crear el usuario',
      });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleUpdate = async (id: string, data: { name?: string; phone?: string; role?: string }) => {
    try {
      await api.put(`/workshops/me/users/${id}`, data);
      setShowEditModal(null);
      setMessage({ type: 'success', text: 'Usuario actualizado correctamente' });
      loadUsers();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo actualizar',
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`¿Desactivar a ${name}? No podrá iniciar sesión.`)) return;
    try {
      await api.delete(`/workshops/me/users/${id}`);
      setMessage({ type: 'success', text: `${name} fue desactivado` });
      loadUsers();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo desactivar',
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const copyCredentials = (name: string, email: string, password: string) => {
    const text = `Hola ${name}, tu acceso al taller es:\n📧 ${email}\n🔑 ${password}\nIngresa en: repuestoia.com/login`;
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Credenciales copiadas al portapapeles' });
    setTimeout(() => setMessage(null), 3000);
  };

  const shareCredentials = (name: string, email: string, password: string) => {
    const text = `Hola ${name}, tu acceso al taller es:\n📧 ${email}\n🔑 ${password}\nIngresa en: repuestoia.com/login`;
    if (navigator.share) {
      navigator.share({ title: 'Acceso al Taller', text });
    } else {
      copyCredentials(name, email, password);
    }
  };

  const stats = {
    total: users.length,
    byRole: users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Equipo del Taller
          </h3>
          <p className="text-sm text-zinc-400 mt-1">Gestiona los accesos de tu equipo</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Acceso
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-200'
              : 'bg-red-950/30 border border-red-800/50 text-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
          <p className="text-2xl font-bold text-zinc-100">{stats.total}</p>
          <p className="text-xs text-zinc-400 mt-1">Total</p>
        </div>
        {Object.entries(ROLE_CONFIG).map(([key, config]) => (
          <div key={key} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
            <p className="text-2xl font-bold text-zinc-100">{stats.byRole[key] || 0}</p>
            <p className="text-xs text-zinc-400 mt-1">{config.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {!error && users.length === 0 && (
        <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
          <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <h4 className="font-bold text-zinc-300">Sin miembros aún</h4>
          <p className="text-sm text-zinc-500 mt-1">Crea el primer acceso para tu equipo</p>
        </div>
      )}

      {!error && users.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map((user) => {
                  const roleConfig = ROLE_CONFIG[user.role];
                  const RoleIcon = roleConfig?.icon || Shield;
                  return (
                    <tr key={user.id} className="hover:bg-zinc-950/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                            <span className="text-sm font-bold text-zinc-300">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-200">{user.name}</p>
                            {user.phone && <p className="text-xs text-zinc-500">{user.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-300 font-mono">{user.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleConfig?.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleConfig?.label || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                          {user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyCredentials(user.name, user.email, '••••••••')}
                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                            title="Copiar info"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowEditModal(user)}
                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleDeactivate(user.id, user.name)}
                              className="p-2 hover:bg-red-950/30 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                              title="Desactivar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateUserModal
          workshopName={workshopName}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {showEditModal && (
        <EditUserModal
          user={showEditModal}
          onClose={() => setShowEditModal(null)}
          onSubmit={(data) => handleUpdate(showEditModal.id, data)}
        />
      )}

      {credentials && (
        <CredentialsModal
          credentials={credentials}
          onClose={() => setCredentials(null)}
          onCopy={() => copyCredentials(credentials.name, credentials.email, credentials.password)}
          onShare={() => shareCredentials(credentials.name, credentials.email, credentials.password)}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  workshopName,
  onClose,
  onSubmit,
}: {
  workshopName: string;
  onClose: () => void;
  onSubmit: (data: { name: string; emailPrefix: string; phone: string; role: string }) => void;
}) {
  const [name, setName] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

  const slug = workshopName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ name, emailPrefix, phone, role });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100">Crear Acceso</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Nombre completo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Email *</label>
            <div className="flex items-center gap-0">
              <input
                type="text"
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="juan"
                className="flex-1 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-l-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono"
                required
              />
              <span className="px-3 py-2.5 bg-zinc-950 border border-l-0 border-zinc-800 rounded-r-xl text-zinc-500 text-sm font-mono">
                @{slug}.com
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Teléfono</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+58 412 1234567"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Rol *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
              required
            >
              <option value="">Seleccionar rol</option>
              {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label} - {config.description}</option>
              ))}
            </select>
          </div>

          {role && (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
              <p className="text-[11px] text-emerald-300">
                💡 Se generará una contraseña automática que verás al crear el usuario.
              </p>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name || !emailPrefix || !role}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Crear usuario</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSubmit,
}: {
  user: WorkshopUser;
  onClose: () => void;
  onSubmit: (data: { name?: string; phone?: string; role?: string }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [role, setRole] = useState(user.role);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ name, phone, role });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100">Editar Acceso</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Nombre completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-500 text-sm font-mono cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Teléfono</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+58 412 1234567"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
              required
            >
              {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CredentialsModal({
  credentials,
  onClose,
  onCopy,
  onShare,
}: {
  credentials: { name: string; email: string; password: string };
  onClose: () => void;
  onCopy: () => void;
  onShare: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100">Credenciales Creadas</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
          <p className="text-sm text-emerald-300 font-semibold">Guarda estas credenciales, no se volverán a mostrar:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 w-16">Nombre:</span>
              <span className="text-sm text-zinc-200 font-semibold">{credentials.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 w-16">Email:</span>
              <span className="text-sm text-zinc-200 font-mono">{credentials.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 w-16">Clave:</span>
              <span className="text-sm text-zinc-200 font-mono bg-zinc-950 px-2 py-1 rounded">{credentials.password}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCopy}
            className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-200 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copiar credenciales
          </button>
          <button
            onClick={onShare}
            className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-200 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-bold rounded-xl text-sm transition-all"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
