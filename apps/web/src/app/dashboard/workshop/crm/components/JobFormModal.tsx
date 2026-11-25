'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../../../lib/api';
import { Car, X, AlertCircle, Loader2, Save } from 'lucide-react';
import { EMPTY_FORM, JobFormData, WorkshopJob } from '../types';

interface JobFormModalProps {
  open: boolean;
  editingJob: WorkshopJob | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function JobFormModal({
  open,
  editingJob,
  onClose,
  onSaved,
}: JobFormModalProps) {
  const [form, setForm] = useState<JobFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (editingJob) {
      setForm({
        marca: editingJob.marca,
        modelo: editingJob.modelo,
        anio: String(editingJob.anio),
        placa: editingJob.placa || '',
        kilometraje: String(editingJob.kilometraje || ''),
        problema: editingJob.problema,
        clienteNombre: editingJob.clienteNombre,
        clienteTelefono: editingJob.clienteTelefono || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editingJob]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.marca.trim() || !form.modelo.trim()) {
      setFormError('Marca y modelo son obligatorios.');
      return;
    }
    if (!form.anio || parseInt(form.anio, 10) < 1900) {
      setFormError('Ingrese un año válido.');
      return;
    }
    if (!form.clienteNombre.trim()) {
      setFormError('El nombre del cliente es obligatorio.');
      return;
    }
    if (!form.problema.trim()) {
      setFormError('Describa el problema.');
      return;
    }

    const payload: Record<string, any> = {
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      anio: parseInt(form.anio, 10),
      placa: form.placa.trim() || undefined,
      kilometraje: form.kilometraje ? parseInt(form.kilometraje, 10) : undefined,
      problema: form.problema.trim(),
      clienteNombre: form.clienteNombre.trim(),
      clienteTelefono: form.clienteTelefono.trim() || undefined,
    };

    try {
      setSaving(true);
      if (editingJob) {
        await api.put(`/workshops/me/jobs/${editingJob.id}`, payload);
      } else {
        await api.post('/workshops/me/jobs', payload);
      }
      onClose();
      await onSaved();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-zinc-200 mb-1 flex items-center gap-2">
          <Car className="w-5 h-5 text-brand-400" />
          {editingJob ? 'Editar Vehículo' : 'Registrar Vehículo'}
        </h3>
        <p className="text-xs text-zinc-500 mb-6">
          Complete los datos del vehículo que ingresa al taller.
        </p>
        {formError && (
          <div className="mb-4 p-3 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-2 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Marca <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                placeholder="Ej: Toyota"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Modelo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                placeholder="Ej: Hilux"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Año <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear() + 1}
                value={form.anio}
                onChange={(e) => setForm({ ...form, anio: e.target.value })}
                placeholder="2020"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Placa</label>
              <input
                type="text"
                value={form.placa}
                onChange={(e) => setForm({ ...form, placa: e.target.value })}
                placeholder="ABC-123"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Kilometraje</label>
              <input
                type="number"
                min="0"
                value={form.kilometraje}
                onChange={(e) => setForm({ ...form, kilometraje: e.target.value })}
                placeholder="125000"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Cliente <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.clienteNombre}
              onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })}
              placeholder="Nombre del cliente"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Teléfono del cliente</label>
            <input
              type="tel"
              value={form.clienteTelefono}
              onChange={(e) => setForm({ ...form, clienteTelefono: e.target.value })}
              placeholder="+591 70000000"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Problema reportado <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.problema}
              onChange={(e) => setForm({ ...form, problema: e.target.value })}
              rows={3}
              placeholder="Describa el problema reportado..."
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm resize-none"
            />
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
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editingJob ? 'Guardar cambios' : 'Registrar vehículo'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

