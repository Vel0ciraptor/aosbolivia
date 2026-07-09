'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../../../../lib/api';
import { useWorkshopProfile } from '../../../../store/useWorkshopProfile';
import {
  Car, Plus, Search, Filter, AlertCircle, Loader2,
  Edit2, Trash2, Save, RefreshCw, X, ChevronRight, Clock,
  CheckCircle2, Wrench, ArrowRight, User, Phone, FileText,
  Calendar, History, AlertTriangle,
} from 'lucide-react';

interface WorkshopJob {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
  problema: string;
  clienteNombre: string;
  clienteTelefono?: string;
  estado: string;
  requestId?: string;
  createdAt: string;
  logs?: JobLog[];
}

interface JobLog {
  id: string;
  estado: string;
  observaciones?: string;
  createdAt: string;
}

interface JobFormData {
  marca: string;
  modelo: string;
  anio: string;
  placa: string;
  problema: string;
  clienteNombre: string;
  clienteTelefono: string;
}

const EMPTY_FORM: JobFormData = {
  marca: '',
  modelo: '',
  anio: '',
  placa: '',
  problema: '',
  clienteNombre: '',
  clienteTelefono: '',
};

const STATUS_FLOW = ['INGRESANDO', 'CHECK_INICIAL', 'TRABAJANDO', 'TERMINADO', 'SALIDA'];

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string; next?: string }> = {
  INGRESANDO: { label: 'Ingresando', icon: Car, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', next: 'CHECK_INICIAL' },
  CHECK_INICIAL: { label: 'Check Inicial', icon: Search, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', next: 'TRABAJANDO' },
  TRABAJANDO: { label: 'Trabajando', icon: Wrench, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', next: 'TERMINADO' },
  TERMINADO: { label: 'Terminado', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', next: 'SALIDA' },
  SALIDA: { label: 'Salida', icon: ArrowRight, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
};

export default function WorkshopCrmPage() {
  const { workshop, loading: loadingWorkshop, error: workshopError } = useWorkshopProfile();
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<WorkshopJob | null>(null);
  const [form, setForm] = useState<JobFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [detailJob, setDetailJob] = useState<WorkshopJob | null>(null);
  const [detailLogs, setDetailLogs] = useState<JobLog[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [statusModalJob, setStatusModalJob] = useState<WorkshopJob | null>(null);
  const [statusObs, setStatusObs] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/workshops/me/jobs');
      setJobs(res.data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingWorkshop) fetchJobs();
  }, [loadingWorkshop, fetchJobs]);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter !== 'ALL' && j.estado !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${j.marca} ${j.modelo} ${j.placa ?? ''} ${j.clienteNombre} ${j.problema}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, search, statusFilter]);

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    STATUS_FLOW.forEach((s) => { byStatus[s] = 0; });
    jobs.forEach((j) => { if (byStatus[j.estado] !== undefined) byStatus[j.estado]++; });
    return byStatus;
  }, [jobs]);

  const openCreate = () => {
    setEditingJob(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEdit = (job: WorkshopJob) => {
    setEditingJob(job);
    setForm({
      marca: job.marca,
      modelo: job.modelo,
      anio: String(job.anio),
      placa: job.placa || '',
      problema: job.problema,
      clienteNombre: job.clienteNombre,
      clienteTelefono: job.clienteTelefono || '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingJob(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.marca.trim() || !form.modelo.trim()) {
      setFormError('Marca y modelo son obligatorios.');
      return;
    }
    if (!form.anio || parseInt(form.anio) < 1900) {
      setFormError('Ingrese un año válido (mayor a 1900).');
      return;
    }
    if (!form.clienteNombre.trim()) {
      setFormError('El nombre del cliente es obligatorio.');
      return;
    }
    if (!form.problema.trim()) {
      setFormError('Describa el problema reportado.');
      return;
    }

    const payload = {
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      anio: parseInt(form.anio),
      placa: form.placa.trim() || undefined,
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
      closeForm();
      await fetchJobs();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (job: WorkshopJob) => {
    if (!confirm(`¿Eliminar registro de ${job.clienteNombre} - ${job.marca} ${job.modelo}?`)) return;
    try {
      await api.delete(`/workshops/me/jobs/${job.id}`);
      await fetchJobs();
      if (detailJob?.id === job.id) setDetailJob(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar.');
    }
  };

  const openDetail = async (job: WorkshopJob) => {
    setDetailJob(job);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/workshops/me/jobs/${job.id}`);
      setDetailJob(res.data);
      setDetailLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openStatusModal = (job: WorkshopJob) => {
    setStatusModalJob(job);
    setStatusObs('');
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!statusModalJob) return;
    setChangingStatus(true);
    try {
      await api.patch(`/workshops/me/jobs/${statusModalJob.id}/status`, {
        estado: newStatus,
        observaciones: statusObs.trim() || undefined,
      });
      setStatusModalJob(null);
      await fetchJobs();
      if (detailJob?.id === statusModalJob.id) {
        const res = await api.get(`/workshops/me/jobs/${statusModalJob.id}`);
        setDetailJob(res.data);
        setDetailLogs(res.data.logs || []);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo cambiar el estado.');
    } finally {
      setChangingStatus(false);
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
            <Car className="w-6 h-6 text-emerald-400" />
            <span>CRM - Vehículos en Taller</span>
          </h2>
          <p className="text-sm text-zinc-400">Registro y seguimiento de vehículos que ingresan al taller.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Vehículo</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUS_FLOW.map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
              className={`p-4 border rounded-2xl transition-all text-left ${
                statusFilter === s
                  ? `${meta.bg} border-2`
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${statusFilter === s ? meta.color : 'text-zinc-500'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  statusFilter === s ? meta.color : 'text-zinc-500'
                }`}>
                  {meta.label}
                </span>
              </div>
              <p className={`text-2xl font-extrabold ${
                statusFilter === s ? 'text-zinc-100' : 'text-zinc-300'
              }`}>
                {stats[s]}
              </p>
            </button>
          );
        })}
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, modelo, placa, cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 transition-colors text-sm"
          />
        </div>
        <button
          onClick={fetchJobs}
          className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 transition-colors"
          title="Recargar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Car className="w-8 h-8" />
          </div>
          {jobs.length === 0 ? (
            <>
              <h3 className="font-bold text-zinc-300 text-base">No hay vehículos registrados</h3>
              <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                Registra el primer vehículo que ingrese a tu taller para comenzar a dar seguimiento.
              </p>
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold border border-zinc-800 rounded-xl transition-colors text-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar primer vehículo
              </button>
            </>
          ) : (
            <>
              <h3 className="font-bold text-zinc-300 text-base">Sin resultados</h3>
              <p className="text-zinc-500 text-sm mt-1">Intenta con otros filtros o términos de búsqueda.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const meta = STATUS_META[job.estado] || STATUS_META.INGRESANDO;
            const StatusIcon = meta.icon;
            const nextStatus = meta.next;
            const nextMeta = nextStatus ? STATUS_META[nextStatus] : null;
            const lastLog = job.logs?.[0];
            return (
              <div
                key={job.id}
                className="p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {meta.label}
                      </span>
                      {job.requestId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 border-zinc-500/20 text-zinc-400">
                          <FileText className="w-2.5 h-2.5" /> Desde solicitud
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => openDetail(job)} className="text-left">
                        <h3 className="text-base font-bold text-zinc-100 hover:text-emerald-300 transition-colors">
                          {job.marca} {job.modelo} {job.anio}
                        </h3>
                      </button>
                      {job.placa && (
                        <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400">
                          {job.placa}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-1">{job.problema}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-300">
                        <User className="w-3.5 h-3.5" />
                        {job.clienteNombre}
                      </span>
                      {job.clienteTelefono && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {job.clienteTelefono}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(job.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {lastLog && (
                        <span className="inline-flex items-center gap-1 text-zinc-600">
                          <Clock className="w-3 h-3" />
                          {new Date(lastLog.createdAt).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {nextStatus && nextMeta && (
                      <button
                        onClick={() => openStatusModal(job)}
                        className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                        title={`Avanzar a: ${nextMeta.label}`}
                      >
                        {React.createElement(nextMeta.icon, { className: 'w-3.5 h-3.5' })}
                        <span className="hidden md:inline">{nextMeta.label}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(job)}
                        className="px-2 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-xs rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(job)}
                        className="px-2 py-1.5 bg-zinc-950 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 text-xs rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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
              <Car className="w-5 h-5 text-emerald-400" />
              {editingJob ? 'Editar Vehículo' : 'Registrar Vehículo'}
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              {editingJob ? 'Actualiza la información del vehículo.' : 'Complete los datos del vehículo que ingresa al taller.'}
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
                  <label className="text-xs font-semibold text-zinc-300">Marca <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    placeholder="Ej: Toyota"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Modelo <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.modelo}
                    onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    placeholder="Ej: Hilux"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Año <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={form.anio}
                    onChange={(e) => setForm({ ...form, anio: e.target.value })}
                    placeholder="2020"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Placa</label>
                  <input
                    type="text"
                    value={form.placa}
                    onChange={(e) => setForm({ ...form, placa: e.target.value })}
                    placeholder="ABC-123"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono uppercase"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Cliente <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.clienteNombre}
                  onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })}
                  placeholder="Nombre del cliente"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Teléfono del cliente</label>
                <input
                  type="tel"
                  value={form.clienteTelefono}
                  onChange={(e) => setForm({ ...form, clienteTelefono: e.target.value })}
                  placeholder="+58 412 1234567"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Problema reportado <span className="text-red-400">*</span></label>
                <textarea
                  value={form.problema}
                  onChange={(e) => setForm({ ...form, problema: e.target.value })}
                  rows={3}
                  placeholder="Describa el problema que presenta el vehículo..."
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm resize-none"
                />
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
                      <span>{editingJob ? 'Guardar cambios' : 'Registrar vehículo'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDetailJob(null)}
              className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    {(() => {
                      const meta = STATUS_META[detailJob.estado] || STATUS_META.INGRESANDO;
                      const Icon = meta.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}>
                          <Icon className="w-4 h-4" />
                          {meta.label}
                        </span>
                      );
                    })()}
                    {detailJob.requestId && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 border-zinc-500/20 text-zinc-400">
                        <FileText className="w-2.5 h-2.5" /> Desde solicitud
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-zinc-100">
                    {detailJob.marca} {detailJob.modelo} {detailJob.anio}
                  </h3>
                  {detailJob.placa && (
                    <p className="text-sm text-zinc-400 font-mono mt-1">Placa: {detailJob.placa}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-zinc-500" />
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cliente</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-200">{detailJob.clienteNombre}</p>
                    {detailJob.clienteTelefono && (
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {detailJob.clienteTelefono}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Registro</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-200">
                      {new Date(detailJob.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {new Date(detailJob.createdAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-zinc-500" />
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Problema reportado</span>
                  </div>
                  <p className="text-sm text-zinc-300">{detailJob.problema}</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-zinc-500" />
                    Historial de estados
                  </h4>
                  {detailLogs.length === 0 ? (
                    <p className="text-xs text-zinc-500">No hay registros de cambios de estado.</p>
                  ) : (
                    <div className="space-y-3">
                      {detailLogs.map((log) => {
                        const logMeta = STATUS_META[log.estado] || STATUS_META.INGRESANDO;
                        const LogIcon = logMeta.icon;
                        return (
                          <div key={log.id} className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${logMeta.bg} border`}>
                              <LogIcon className={`w-4 h-4 ${logMeta.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${logMeta.color}`}>{logMeta.label}</span>
                                <span className="text-[10px] text-zinc-600">
                                  {new Date(log.createdAt).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {log.observaciones && (
                                <p className="text-xs text-zinc-500 mt-0.5">{log.observaciones}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end gap-3">
                  {STATUS_META[detailJob.estado]?.next && (
                    <button
                      onClick={() => { setDetailJob(null); openStatusModal(detailJob); }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                    >
                      Avanzar estado
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => { setDetailJob(null); openEdit(detailJob); }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {statusModalJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6">
            <button
              onClick={() => setStatusModalJob(null)}
              className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-zinc-200 mb-1 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-emerald-400" />
              Cambiar Estado
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              {statusModalJob.marca} {statusModalJob.modelo} {statusModalJob.anio}
            </p>
            <div className="space-y-3 mb-4">
              <p className="text-xs text-zinc-400">
                Estado actual:
                {(() => {
                  const meta = STATUS_META[statusModalJob.estado] || STATUS_META.INGRESANDO;
                  const Icon = meta.icon;
                  return (
                    <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}>
                      <Icon className="w-3 h-3" />
                      {meta.label}
                    </span>
                  );
                })()}
              </p>
              {STATUS_META[statusModalJob.estado]?.next && (
                <p className="text-xs text-zinc-400">
                  Avanzar a:
                  {(() => {
                    const nextKey = STATUS_META[statusModalJob.estado].next!;
                    const meta = STATUS_META[nextKey];
                    const Icon = meta.icon;
                    return (
                      <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    );
                  })()}
                </p>
              )}
            </div>
            <div className="space-y-1.5 mb-6">
              <label className="text-xs font-semibold text-zinc-300">Observaciones (opcional)</label>
              <textarea
                value={statusObs}
                onChange={(e) => setStatusObs(e.target.value)}
                rows={3}
                placeholder="Detalles del cambio de estado..."
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStatusModalJob(null)}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleStatusChange(STATUS_META[statusModalJob.estado]?.next!)}
                disabled={changingStatus || !STATUS_META[statusModalJob.estado]?.next}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {changingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cambiando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar cambio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
