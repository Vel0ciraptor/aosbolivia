
'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { api } from '../../../../lib/api';
import { useWorkshopProfile } from '../../../../store/useWorkshopProfile';
import { useAuthStore } from '../../../../store/useAuthStore';
import {
  Car,
  Plus,
  Search,
  AlertCircle,
  Edit2,
  RefreshCw,
  X,
  User,
  FileText,
  Calendar,
  History,
  Fuel,
  Download,
  Check,
  Clock,
} from 'lucide-react';
import { STATUS_FLOW, STATUS_META, WorkshopJob } from './types';
import HistorialTab from './components/HistorialTab';
import JobFormModal from './components/JobFormModal';
import JobDetailModal from './components/JobDetailModal';
import StatusChangeModal from './components/StatusChangeModal';
import ReportPreviewModal from './components/ReportPreviewModal';

export default function WorkshopCrmPage() {
  const { workshop, loading: loadingWorkshop, error: workshopError } = useWorkshopProfile();
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'jobs' | 'historial'>('jobs');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<WorkshopJob | null>(null);
  const [detailJob, setDetailJob] = useState<WorkshopJob | null>(null);
  const [statusModalJob, setStatusModalJob] = useState<WorkshopJob | null>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  const isMechanic = user?.workshopUserRole === 'MECANICO';
  const workshopRole = user?.workshopUserRole || user?.role || '';
  const isWorkshopAdmin = user?.role === 'WORKSHOP' || user?.role === 'ADMIN';
  const canEditHours = isWorkshopAdmin || workshopRole === 'JEFE_MECANICO';
  const canApproveMaterials = isWorkshopAdmin || workshopRole === 'JEFE_MECANICO';
  const canDeliverMaterials = ['SUPERVISOR', 'INVENTARIO'].includes(workshopRole) || isWorkshopAdmin;
  const canAdjustCost = isWorkshopAdmin || ['SUPERVISOR', 'CONTABILIDAD'].includes(workshopRole);

  const [workTags, setWorkTags] = useState<string[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(11.86);

  // `loading` controla SOLO la carga inicial. Los refrescos de fondo (fetchJobs)
  // no deben ponerlo en true para no desmontar la página con el spinner.
  const jobsLoadedRef = useRef(false);
  const fetchJobs = useCallback(async () => {
    const initial = !jobsLoadedRef.current;
    try {
      if (initial) setLoading(true);
      const res = await api.get('/workshops/me/jobs');
      setJobs(res.data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      jobsLoadedRef.current = true;
      if (initial) setLoading(false);
    }
  }, []);

  const fetchExchangeRate = useCallback(async () => {
    try {
      const res = await api.get('/workshops/me/exchange-rate');
      if (res.data?.rate) {
        setExchangeRate(Number(res.data.rate));
      }
    } catch {
      // fallback sell rate
    }
  }, []);

  useEffect(() => {
    if (!loadingWorkshop) {
      fetchJobs();
      fetchExchangeRate();
    }
  }, [loadingWorkshop, fetchJobs, fetchExchangeRate]);

  useEffect(() => {
    setWorkTags(((workshop as any)?.trabajoTags as string[]) || []);
  }, [workshop]);

  // Actualiza un vehículo en la lista local sin repetir GET /workshops/me/jobs
  const handleJobUpdated = useCallback((jobId: string, patch: Partial<WorkshopJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));
  }, []);

  const handleDownloadPdf = useCallback(async (jobId: string) => {
    try {
      const res = await api.get(`/workshops/me/jobs/${jobId}/report`);
      setReportHtml(res.data);
    } catch {
      alert('No se pudo generar el reporte.');
    }
  }, []);

  const handleStatusChanged = useCallback(
    async (jobId: string, newStatus: string) => {
      await fetchJobs();
      if (newStatus === 'FINALIZADO') {
        setTimeout(() => {
          handleDownloadPdf(jobId);
        }, 300);
      }
    },
    [fetchJobs, handleDownloadPdf],
  );

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter !== 'ALL' && j.estado !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack =
          `${j.marca} ${j.modelo} ${j.placa ?? ''} ${j.clienteNombre} ${j.problema}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, search, statusFilter]);

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    STATUS_FLOW.forEach((s) => {
      byStatus[s] = 0;
    });
    jobs.forEach((j) => {
      if (byStatus[j.estado] !== undefined) byStatus[j.estado]++;
    });
    return byStatus;
  }, [jobs]);

  const openCreate = () => {
    setEditingJob(null);
    setIsFormOpen(true);
  };

  const openEdit = (job: WorkshopJob) => {
    setEditingJob(job);
    setIsFormOpen(true);
  };

  if (loading || loadingWorkshop) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
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
            <Car className="w-6 h-6 text-brand-400" />
            <span>Llegada de vehículos</span>
          </h2>
          <p className="text-sm text-zinc-400">
            {isMechanic
              ? 'Vista de mecánico: vehículos en check inicial o trabajando.'
              : 'Registro, inspección inicial, control de combustible y seguimiento de vehículos en taller.'}
          </p>
        </div>
        {!isMechanic && (
          <div className="flex items-center gap-2">
            <button
              onClick={openCreate}
              className="px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Vehículo</span>
            </button>
          </div>
        )}
      </div>

      {!isMechanic && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'jobs'
                ? 'bg-zinc-800 text-zinc-100'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Car className="w-4 h-4" /> Vehículos
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'historial'
                ? 'bg-zinc-800 text-zinc-100'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <History className="w-4 h-4" /> Historial
          </button>
        </div>
      )}

      {activeTab === 'historial' && !isMechanic && (
        <HistorialTab canEditHours={canEditHours} />
      )}

      {activeTab === 'jobs' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                    <Icon
                      className={`w-4 h-4 ${statusFilter === s ? meta.color : 'text-zinc-500'}`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        statusFilter === s ? meta.color : 'text-zinc-500'
                      }`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p
                    className={`text-2xl font-extrabold ${
                      statusFilter === s ? 'text-zinc-100' : 'text-zinc-300'
                    }`}
                  >
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
                type="search"
                name="taller_vehiculos_search"
                autoComplete="off"
                data-lpignore="true"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por marca, modelo, placa, cliente..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 transition-colors text-sm"
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
                isMechanic ? (
                  <>
                    <h3 className="font-bold text-zinc-300 text-base">
                      No hay vehículos en tu lista
                    </h3>
                    <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                      Se muestran aquí los vehículos en check inicial o trabajando.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-zinc-300 text-base">
                      No hay vehículos registrados
                    </h3>
                    <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                      Registra el primer vehículo que ingrese a tu taller.
                    </p>
                    <button
                      onClick={openCreate}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold border border-zinc-800 rounded-xl transition-colors text-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar primer vehículo
                    </button>
                  </>
                )
              ) : (
                <>
                  <h3 className="font-bold text-zinc-300 text-base">Sin resultados</h3>
                  <p className="text-zinc-500 text-sm mt-1">Intenta con otros filtros.</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((job) => {
                const meta = STATUS_META[job.estado] || STATUS_META.INGRESANDO;
                const StatusIcon = meta.icon;
                const nextStatus = meta.next;
                const nextMeta = nextStatus ? STATUS_META[nextStatus] : null;
                return (
                  <div
                    key={job.id}
                    className="p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}
                      >
                        <StatusIcon className="w-2.5 h-2.5" />
                        {meta.label}
                      </span>
                      {job.autorizacionEstado === 'APROBADO' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <Check className="w-2.5 h-2.5" />
                          Aprobado
                        </span>
                      ) : job.autorizacionEstado === 'PENDIENTE_APROBACION' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Clock className="w-2.5 h-2.5 animate-pulse" />
                          Pendiente WhatsApp
                        </span>
                      ) : job.autorizacionEstado === 'RECHAZADO' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400">
                          <X className="w-2.5 h-2.5" />
                          Rechazado
                        </span>
                      ) : job.origen === 'COTIZACION' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <FileText className="w-2.5 h-2.5" />
                          Cotización
                        </span>
                      ) : job.requestId ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 text-blue-400">
                          <FileText className="w-2.5 h-2.5" />
                          Solicitud
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 border border-zinc-500/20 text-zinc-500">
                          <User className="w-2.5 h-2.5" />
                          Directo
                        </span>
                      )}
                    </div>
                    <button onClick={() => setDetailJob(job)} className="text-left w-full">
                      <h3 className="text-sm font-bold text-zinc-100 group-hover:text-brand-300 transition-colors truncate">
                        {job.marca} {job.modelo}{' '}
                        <span className="text-zinc-500 font-normal">{job.anio}</span>
                      </h3>
                    </button>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {job.placa && (
                        <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] font-mono text-zinc-400">
                          {job.placa}
                        </span>
                      )}
                      {job.kilometraje && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-400">
                          <Fuel className="w-2.5 h-2.5" />
                          {job.kilometraje.toLocaleString()}
                        </span>
                      )}
                      {job.nivelCombustible && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] text-amber-300 font-mono">
                          ⛽ {job.nivelCombustible}
                        </span>
                      )}
                      {job.fechaCita && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-300 font-bold"
                          title="Cita de ingreso"
                        >
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(job.fechaCita).toLocaleString('es-BO', {
                            timeZone: 'America/La_Paz',
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1.5 line-clamp-1">
                      {job.clienteNombre}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 line-clamp-1">
                      {job.diagnosticoMecanico || job.problema}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                      <span className="text-[9px] text-zinc-600">
                        {new Date(job.createdAt).toLocaleDateString('es-VE', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                      <div className="flex items-center gap-1">
                        {!isMechanic && (
                          <>
                            {nextStatus && nextMeta && (
                              <button
                                onClick={() => setStatusModalJob(job)}
                                className="px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded transition-colors flex items-center gap-0.5"
                                title={`Avanzar a: ${nextMeta.label}`}
                              >
                                {React.createElement(nextMeta.icon, { className: 'w-2.5 h-2.5' })}
                                <span className="hidden sm:inline">{nextMeta.label}</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadPdf(job.id)}
                              className="px-1.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 text-[10px] rounded transition-colors"
                              title="PDF"
                            >
                              <Download className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => openEdit(job)}
                              className="px-1.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 text-[10px] rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <JobFormModal
        open={isFormOpen}
        editingJob={editingJob}
        onClose={() => {
          setIsFormOpen(false);
          setEditingJob(null);
        }}
        onSaved={fetchJobs}
      />

      <JobDetailModal
        job={detailJob}
        user={user}
        workTags={workTags}
        exchangeRate={exchangeRate}
        isMechanic={isMechanic}
        isWorkshopAdmin={isWorkshopAdmin}
        canApproveMaterials={canApproveMaterials}
        canDeliverMaterials={canDeliverMaterials}
        canAdjustCost={canAdjustCost}
        onClose={() => setDetailJob(null)}
        onJobUpdated={handleJobUpdated}
        onWorkTagsUpdated={setWorkTags}
        onOpenStatusModal={(j) => setStatusModalJob(j)}
        onOpenEdit={openEdit}
        onOpenReport={handleDownloadPdf}
      />

      <StatusChangeModal
        job={statusModalJob}
        user={user}
        isWorkshopAdmin={isWorkshopAdmin}
        onClose={() => setStatusModalJob(null)}
        onChanged={handleStatusChanged}
      />

      <ReportPreviewModal reportHtml={reportHtml} onClose={() => setReportHtml(null)} />
    </div>
  );
}
