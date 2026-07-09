'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useWorkshopProfile } from '../../../../store/useWorkshopProfile';
import {
  Wrench, Plus, Search, X, AlertCircle, Loader2,
  Edit2, Trash2, DollarSign, Hash, Tag, Save, RefreshCw,
} from 'lucide-react';

interface WorkshopService {
  id: string;
  nombre: string;
  descripcion?: string;
  precioReferencial?: string | number;
  createdAt: string;
}

interface ServiceFormData {
  nombre: string;
  descripcion: string;
  precioReferencial: string;
}

const EMPTY_FORM: ServiceFormData = {
  nombre: '',
  descripcion: '',
  precioReferencial: '',
};

export default function WorkshopServicesPage() {
  const { workshop, loading: loadingWorkshop, error: workshopError, reload } = useWorkshopProfile();
  const [services, setServices] = useState<WorkshopService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<WorkshopService | null>(null);
  const [form, setForm] = useState<ServiceFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchServices = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/workshops/me/services');
      setServices(res.data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingWorkshop) fetchServices();
  }, [loadingWorkshop, fetchServices]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${s.nombre} ${s.descripcion ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [services, search]);

  const openCreate = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEdit = (s: WorkshopService) => {
    setEditingService(s);
    setForm({
      nombre: s.nombre,
      descripcion: s.descripcion || '',
      precioReferencial: s.precioReferencial ? String(s.precioReferencial) : '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingService(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.nombre.trim()) {
      setFormError('El nombre del servicio es obligatorio.');
      return;
    }
    const precioNum = form.precioReferencial ? parseFloat(form.precioReferencial) : undefined;
    if (form.precioReferencial && (isNaN(precioNum!) || precioNum! < 0)) {
      setFormError('El precio debe ser un número válido.');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      precioReferencial: precioNum,
    };

    try {
      setSaving(true);
      if (editingService) {
        await api.put(`/workshops/me/services/${editingService.id}`, payload);
      } else {
        await api.post('/workshops/me/services', payload);
      }
      closeForm();
      await fetchServices();
      reload();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'No se pudo guardar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: WorkshopService) => {
    if (!confirm(`¿Eliminar "${s.nombre}" de tus servicios?`)) return;
    try {
      await api.delete(`/workshops/me/services/${s.id}`);
      await fetchServices();
      reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar el servicio.');
    }
  };

  if (loading || loadingWorkshop) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (workshopError || !workshop) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-zinc-200">No se pudo cargar el perfil del taller</h3>
        <p className="text-sm text-zinc-400 mt-1">{workshopError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-400" />
            <span>Mis Servicios</span>
          </h2>
          <p className="text-sm text-zinc-400">Gestiona los servicios mecánicos que ofrece tu taller.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/workshop/profile"
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-sm rounded-xl hover:bg-zinc-800 transition-all"
          >
            Editar Perfil
          </Link>
          <button
            onClick={openCreate}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Servicio</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Servicios</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{services.length}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Filtrados</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{filtered.length}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 transition-colors text-sm"
          />
        </div>
        <button
          onClick={fetchServices}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 transition-colors"
          title="Recargar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Wrench className="w-8 h-8" />
          </div>
          {services.length === 0 ? (
            <>
              <h3 className="font-bold text-zinc-300 text-base">No tienes servicios registrados</h3>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                Agrega los servicios que ofrece tu taller (cambio de aceite, alineación, frenos...) para mostrarlos a los clientes.
              </p>
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold border border-zinc-800 rounded-xl transition-colors text-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar primer servicio
              </button>
            </>
          ) : (
            <>
              <h3 className="font-bold text-zinc-300 text-base">Sin resultados</h3>
              <p className="text-zinc-500 text-sm mt-1">Intenta con otros términos de búsqueda.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const precioNum = s.precioReferencial ? parseFloat(String(s.precioReferencial)) : null;
            return (
              <div
                key={s.id}
                className="p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex flex-col gap-3 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-zinc-200 text-sm line-clamp-2">{s.nombre}</h4>
                  </div>
                </div>
                {s.descripcion && (
                  <p className="text-xs text-zinc-500 line-clamp-2">{s.descripcion}</p>
                )}
                <div className="flex items-end justify-between pt-3 border-t border-zinc-800/60">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Precio ref.</p>
                    <p className="text-xl font-extrabold text-emerald-400 font-mono">
                      {precioNum != null ? `$${precioNum.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openEdit(s)}
                    className="flex-1 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="px-3 py-1.5 bg-zinc-950 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 text-xs font-bold rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeForm}
              className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-zinc-200 mb-1 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-400" />
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              Los servicios que ofrezcas serán visibles para los clientes.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-2 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Nombre del servicio <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Cambio de aceite y filtro"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Detalle del servicio, qué incluye, garantía..."
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Precio referencial (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precioReferencial}
                  onChange={(e) => setForm({ ...form, precioReferencial: e.target.value })}
                  placeholder="120.00"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono"
                />
                <p className="text-[11px] text-zinc-500">Precio base que verá el cliente. Puede variar según diagnóstico.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingService ? 'Guardar cambios' : 'Crear servicio'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
