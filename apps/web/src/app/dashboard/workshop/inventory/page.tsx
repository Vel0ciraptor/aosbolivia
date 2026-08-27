'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../../../lib/api';
import { useWorkshopProfile } from '../../../../store/useWorkshopProfile';
import {
  Package, Plus, Search, Edit2, Trash2, Save, X,
  Loader2, AlertCircle, RefreshCw, Box, Wrench,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  stock: number;
  precioUnitario: number;
  unidad: string;
  estado: string;
  createdAt: string;
}

interface FormData {
  nombre: string;
  descripcion: string;
  categoria: string;
  stock: string;
  precioUnitario: string;
  unidad: string;
}

const EMPTY_FORM: FormData = { nombre: '', descripcion: '', categoria: 'REPUESTO', stock: '0', precioUnitario: '0', unidad: 'unidad' };
const CATEGORIAS = ['REPUESTO', 'INSUMO'];
const UNIDADES = ['unidad', 'litro', 'juego', 'par', 'metro', 'kilogramo', 'caja', 'galón'];

export default function InventoryPage() {
  const { workshop, loading: loadingWorkshop, error: workshopError } = useWorkshopProfile();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/workshops/me/inventory');
      setItems(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!loadingWorkshop) fetchItems(); }, [loadingWorkshop, fetchItems]);

  const filtered = items.filter((item) => {
    if (catFilter !== 'ALL' && item.categoria !== catFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!`${item.nombre} ${item.descripcion || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: items.length,
    repuestos: items.filter((i) => i.categoria === 'REPUESTO').length,
    insumos: items.filter((i) => i.categoria === 'INSUMO').length,
    stockBajo: items.filter((i) => i.stock <= 3).length,
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(null); setIsFormOpen(true); };
  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      nombre: item.nombre, descripcion: item.descripcion || '', categoria: item.categoria,
      stock: String(item.stock), precioUnitario: String(item.precioUnitario), unidad: item.unidad,
    });
    setFormError(null); setIsFormOpen(true);
  };
  const closeForm = () => { setIsFormOpen(false); setEditing(null); setForm(EMPTY_FORM); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null);
    if (!form.nombre.trim()) { setFormError('El nombre es obligatorio.'); return; }
    if (!form.categoria) { setFormError('Seleccione una categoría.'); return; }

    const payload = {
      nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || undefined,
      categoria: form.categoria, stock: parseInt(form.stock) || 0,
      precioUnitario: parseFloat(form.precioUnitario) || 0, unidad: form.unidad,
    };

    try {
      setSaving(true);
      if (editing) { await api.put(`/workshops/me/inventory/${editing.id}`, payload); }
      else { await api.post('/workshops/me/inventory', payload); }
      closeForm(); await fetchItems();
    } catch (err: any) { setFormError(err.response?.data?.message || 'No se pudo guardar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`¿Eliminar "${item.nombre}" del inventario?`)) return;
    try { await api.delete(`/workshops/me/inventory/${item.id}`); await fetchItems(); }
    catch (err: any) { alert(err.response?.data?.message || 'No se pudo eliminar.'); }
  };

  if (loading || loadingWorkshop) return (<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>);
  if (workshopError || !workshop) return (<div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center"><AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="font-bold text-zinc-200">No se pudo cargar el perfil</h3></div>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2"><Package className="w-6 h-6 text-emerald-400" /><span>Inventario del Taller</span></h2>
          <p className="text-sm text-zinc-400">Repuestos e insumos disponibles.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2"><Plus className="w-4 h-4" /> Agregar item</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Package, color: 'text-zinc-400' },
          { label: 'Repuestos', value: stats.repuestos, icon: Box, color: 'text-blue-400' },
          { label: 'Insumos', value: stats.insumos, icon: Wrench, color: 'text-purple-400' },
          { label: 'Stock Bajo', value: stats.stockBajo, icon: AlertCircle, color: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-1"><s.icon className={`w-4 h-4 ${s.color}`} /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{s.label}</span></div>
            <p className="text-2xl font-extrabold text-zinc-100">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre..." className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm" /></div>
        <div className="flex gap-2">
          {['ALL', ...CATEGORIAS].map((c) => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${catFilter === c ? 'bg-emerald-600 text-white' : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}>
              {c === 'ALL' ? 'Todos' : c}
            </button>
          ))}
        </div>
        <button onClick={fetchItems} className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 transition-colors"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <Package className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
          <h3 className="font-bold text-zinc-300">{items.length === 0 ? 'Inventario vacío' : 'Sin resultados'}</h3>
          {items.length === 0 && <p className="text-zinc-500 text-sm mt-1">Agrega repuestos e insumos para tu taller.</p>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800">
              <th className="text-left py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nombre</th>
              <th className="text-left py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Categoría</th>
              <th className="text-center py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Stock</th>
              <th className="text-right py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Precio</th>
              <th className="text-right py-3 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Acciones</th>
            </tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                  <td className="py-3 px-4"><p className="text-sm font-semibold text-zinc-200">{item.nombre}</p>{item.descripcion && <p className="text-xs text-zinc-500 mt-0.5">{item.descripcion}</p>}</td>
                  <td className="py-3 px-4"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.categoria === 'REPUESTO' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>{item.categoria === 'REPUESTO' ? 'Repuesto' : 'Insumo'}</span></td>
                  <td className="py-3 px-4 text-center"><span className={`text-sm font-mono font-bold ${item.stock <= 3 ? 'text-amber-400' : 'text-zinc-200'}`}>{item.stock}</span> <span className="text-[10px] text-zinc-500">{item.unidad}</span></td>
                  <td className="py-3 px-4 text-right"><span className="text-sm font-mono text-zinc-300">${Number(item.precioUnitario).toFixed(2)}</span></td>
                  <td className="py-3 px-4 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => openEdit(item)} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-red-950/30 hover:text-red-400 rounded-lg text-zinc-400 transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6">
            <button onClick={closeForm} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-zinc-200 mb-1 flex items-center gap-2"><Package className="w-5 h-5 text-emerald-400" />{editing ? 'Editar Item' : 'Nuevo Item'}</h3>
            <p className="text-xs text-zinc-500 mb-6">{editing ? 'Actualiza la información.' : 'Agrega un repuesto o insumo al inventario.'}</p>
            {formError && <div className="mb-4 p-3 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-2 text-red-200 text-xs"><AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" /><span>{formError}</span></div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Nombre <span className="text-red-400">*</span></label><input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Filtro de aceite" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Descripción</label><input type="text" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Categoría <span className="text-red-400">*</span></label><select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm">{CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Unidad</label><select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm">{UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Stock</label><input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono" /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Precio unitario ($)</label><input type="number" min="0" step="0.01" value={form.precioUnitario} onChange={(e) => setForm({ ...form, precioUnitario: e.target.value })} className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono" /></div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button type="button" onClick={closeForm} className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold">Cancelar</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 font-bold rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Guardando...</span></> : <><Save className="w-4 h-4" /><span>{editing ? 'Guardar' : 'Crear item'}</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
