'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useProviderProfile } from '../../../../store/useProviderProfile';
import {
  Package, Plus, Search, X, AlertCircle, Loader2,
  Edit2, Trash2, DollarSign, Hash, Tag, Car, Save,
} from 'lucide-react';

interface Part {
  id: string;
  nombre: string;
  descripcion?: string;
  marca: string;
  modelo: string;
  anioDesde: number;
  anioHasta: number;
  precio: string | number;
  stock: number;
  imageUrl?: string;
  estado: string;
  createdAt: string;
}

interface PartFormData {
  nombre: string;
  descripcion: string;
  marca: string;
  modelo: string;
  anioDesde: number;
  anioHasta: number;
  precio: string;
  stock: number;
}

const EMPTY_FORM: PartFormData = {
  nombre: '',
  descripcion: '',
  marca: '',
  modelo: '',
  anioDesde: new Date().getFullYear() - 5,
  anioHasta: new Date().getFullYear(),
  precio: '',
  stock: 0,
};

export default function CatalogPage() {
  const { provider, loading: loadingProvider, error: providerError } = useProviderProfile();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [form, setForm] = useState<PartFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchParts = React.useCallback(async () => {
    if (!provider) return;
    try {
      setLoading(true);
      const res = await api.get(`/parts/provider/${provider.id}`);
      setParts(res.data || []);
    } catch (err) {
      console.error('Error fetching parts:', err);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (!loadingProvider) fetchParts();
  }, [loadingProvider, fetchParts]);

  const filtered = useMemo(() => {
    return parts.filter((p) => {
      if (!showInactive && p.estado === 'INACTIVE') return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${p.nombre} ${p.marca} ${p.modelo} ${p.descripcion ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [parts, search, showInactive]);

  const openCreate = () => {
    setEditingPart(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEdit = (p: Part) => {
    setEditingPart(p);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      marca: p.marca,
      modelo: p.modelo,
      anioDesde: p.anioDesde,
      anioHasta: p.anioHasta,
      precio: String(p.precio),
      stock: p.stock,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingPart(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.nombre.trim() || !form.marca.trim() || !form.modelo.trim() || !form.precio) {
      setFormError('Completa los campos requeridos: Nombre, Marca, Modelo y Precio.');
      return;
    }
    const precioNum = parseFloat(form.precio);
    if (isNaN(precioNum) || precioNum < 0) {
      setFormError('El precio debe ser un número válido.');
      return;
    }
    if (form.anioDesde > form.anioHasta) {
      setFormError('El año "desde" no puede ser mayor al año "hasta".');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      anioDesde: Number(form.anioDesde),
      anioHasta: Number(form.anioHasta),
      precio: precioNum,
      stock: Number(form.stock),
    };

    try {
      setSaving(true);
      if (editingPart) {
        await api.put(`/parts/${editingPart.id}`, payload);
      } else {
        await api.post('/parts', payload);
      }
      closeForm();
      await fetchParts();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'No se pudo guardar el repuesto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Part) => {
    if (!confirm(`¿Eliminar "${p.nombre}" del catálogo? Esta acción se puede revertir editándolo.`)) return;
    try {
      await api.delete(`/parts/${p.id}`);
      await fetchParts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar el repuesto.');
    }
  };

  const handleReactivate = async (p: Part) => {
    try {
      await api.put(`/parts/${p.id}`, { estado: 'ACTIVE' });
      await fetchParts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo reactivar el repuesto.');
    }
  };

  if (loading || loadingProvider) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (providerError || !provider) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-zinc-200">No se pudo cargar el perfil del proveedor</h3>
        <p className="text-sm text-zinc-400 mt-1">{providerError}</p>
      </div>
    );
  }

  const activeCount = parts.filter((p) => p.estado === 'ACTIVE').length;
  const totalValue = parts.filter((p) => p.estado === 'ACTIVE').reduce((sum, p) => sum + (parseFloat(String(p.precio)) * p.stock), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            <span>Mi Catálogo</span>
          </h2>
          <p className="text-sm text-zinc-400">Gestiona los repuestos que ofreces a los clientes.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/provider/profile"
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-sm rounded-xl hover:bg-zinc-800 transition-all"
          >
            Editar Perfil
          </Link>
          <button
            onClick={openCreate}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 text-zinc-950 font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Repuesto</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Activos</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{activeCount}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Items</p>
          <p className="text-2xl font-extrabold text-zinc-100 mt-1">{parts.length}</p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl col-span-2 md:col-span-1">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Valor Inventario</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">${totalValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, marca o modelo..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none px-3">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500"
          />
          Mostrar inactivos
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Package className="w-8 h-8" />
          </div>
          {parts.length === 0 ? (
            <>
              <h3 className="font-bold text-zinc-300 text-base">Tu catálogo está vacío</h3>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                Agrega tu primer repuesto para que los clientes puedan encontrarlo y cotizar.
              </p>
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold border border-zinc-800 rounded-xl transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> Agregar primer repuesto
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
          {filtered.map((p) => {
            const precioNum = parseFloat(String(p.precio));
            const isInactive = p.estado === 'INACTIVE';
            return (
              <div
                key={p.id}
                className={`p-5 bg-zinc-900 border rounded-2xl flex flex-col gap-3 transition-all relative ${
                  isInactive
                    ? 'border-zinc-800/50 opacity-60'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {isInactive && (
                  <span className="absolute top-3 right-3 text-[9px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Inactivo
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-indigo-400 shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-zinc-200 text-sm line-clamp-2">{p.nombre}</h4>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1">
                      <Car className="w-3 h-3" />
                      {p.marca} {p.modelo} · {p.anioDesde}-{p.anioHasta}
                    </p>
                  </div>
                </div>
                {p.descripcion && (
                  <p className="text-xs text-zinc-500 line-clamp-2">{p.descripcion}</p>
                )}
                <div className="flex items-end justify-between pt-3 border-t border-zinc-800/60">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Precio</p>
                    <p className="text-xl font-extrabold text-emerald-400 font-mono">${precioNum.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Stock</p>
                    <p className={`text-lg font-bold font-mono ${p.stock > 0 ? 'text-zinc-200' : 'text-red-400'}`}>
                      {p.stock}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {isInactive ? (
                    <button
                      onClick={() => handleReactivate(p)}
                      className="flex-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg transition-colors"
                    >
                      Reactivar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => openEdit(p)}
                        className="flex-1 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="px-3 py-1.5 bg-zinc-950 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 text-xs font-bold rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeForm}
              className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-zinc-200 mb-1 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              {editingPart ? 'Editar Repuesto' : 'Nuevo Repuesto'}
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              Completa los datos del repuesto. Los clientes lo verán en los resultados de búsqueda.
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
                  <Tag className="w-3.5 h-3.5" /> Nombre del repuesto <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Bomba de Gasolina Toyota Hilux"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                  placeholder="Características, marca OEM, garantía..."
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" /> Marca <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    placeholder="Toyota"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Modelo <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.modelo}
                    onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    placeholder="Hilux"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Año desde <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={form.anioDesde}
                    onChange={(e) => setForm({ ...form, anioDesde: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Año hasta <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={form.anioHasta}
                    onChange={(e) => setForm({ ...form, anioHasta: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Precio (USD) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    placeholder="85.00"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> Stock disponible
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 text-sm font-mono"
                  />
                </div>
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
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingPart ? 'Guardar cambios' : 'Crear repuesto'}</span>
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
