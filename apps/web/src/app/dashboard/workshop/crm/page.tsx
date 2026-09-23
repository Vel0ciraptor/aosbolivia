'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { api } from '../../../../lib/api';
import { useWorkshopProfile } from '../../../../store/useWorkshopProfile';
import { useAuthStore } from '../../../../store/useAuthStore';
import {
  Car, Plus, Search, AlertCircle, Loader2,
  Edit2, Trash2, Save, RefreshCw, X, ChevronRight, Clock,
  CheckCircle2, Wrench, ArrowRight, User, Phone, FileText,
  Calendar, History, AlertTriangle, Camera, Package, PenTool,
  Download, Image as ImageIcon, CheckSquare, Square, Fuel, Lock,
  DollarSign, Play, Timer, ClipboardList,
} from 'lucide-react';

interface WorkshopJob {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
  kilometraje?: number;
  problema: string;
  clienteNombre: string;
  clienteTelefono?: string;
  estado: string;
  requestId?: string;
  firmaDigital?: string;
  imagenes?: string[];
  imagenesTerminado?: string[];
  tipoTrabajo?: { categorias?: string[]; otro?: string } | null;
  horasEstimadas?: number | null;
  mecanicosAsignados?: Worklog[];
  precioServicio?: number | null;
  createdAt: string;
  logs?: JobLog[];
  checkpoints?: Checkpoint[];
  partNeeds?: PartNeed[];
}

interface Worklog {
  key: string;
  userId: string;
  nombre: string;
  inicio?: string | null;
  fin?: string | null;
  horasReales?: number | null;
}

interface JobLog {
  id: string;
  estado: string;
  observaciones?: string;
  firmaUsuarioId?: string;
  firmaUsuarioNombre?: string;
  firmaUsuarioRol?: string;
  createdAt: string;
}

interface Checkpoint {
  id: string;
  servicio: string;
  checked: boolean;
  notas?: string;
}

interface PartNeed {
  id: string;
  nombre: string;
  cantidad: number;
  esInsumo: boolean;
  yaUsado: boolean;
  precioUnitario?: number | null;
  yaUsadoEn?: string | null;
  usadoPorNombre?: string | null;
  inventoryItemId?: string;
  inventoryItem?: { id: string; nombre: string; stock: number };
}

interface JobFormData {
  marca: string;
  modelo: string;
  anio: string;
  placa: string;
  kilometraje: string;
  problema: string;
  clienteNombre: string;
  clienteTelefono: string;
}

const EMPTY_FORM: JobFormData = {
  marca: '', modelo: '', anio: '', placa: '', kilometraje: '',
  problema: '', clienteNombre: '', clienteTelefono: '',
};

const STATUS_FLOW = ['INGRESANDO', 'CHECK_INICIAL', 'TRABAJANDO', 'TERMINADO', 'SALIDA', 'FINALIZADO'];

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string; next?: string }> = {
  INGRESANDO: { label: 'Ingresando', icon: Car, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', next: 'CHECK_INICIAL' },
  CHECK_INICIAL: { label: 'Check Inicial', icon: Search, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', next: 'TRABAJANDO' },
  TRABAJANDO: { label: 'Trabajando', icon: Wrench, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', next: 'TERMINADO' },
  TERMINADO: { label: 'Terminado', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', next: 'SALIDA' },
  SALIDA: { label: 'Salida', icon: ArrowRight, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', next: 'FINALIZADO' },
  FINALIZADO: { label: 'Finalizado', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

const TRABAJOS_TIPOS = [
  'Mecánica general',
  'Eléctrico',
  'Carrocería',
  'Transmisión',
  'Suspensión',
  'Frenos',
  'Motor',
  'Diagnóstico',
  'Otro',
];

export default function WorkshopCrmPage() {
  const { workshop, loading: loadingWorkshop, error: workshopError } = useWorkshopProfile();
  const { user } = useAuthStore();
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
  const [statusPassword, setStatusPassword] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [partNeeds, setPartNeeds] = useState<PartNeed[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [partSearch, setPartSearch] = useState('');
  const [partDropdownOpen, setPartDropdownOpen] = useState(false);
  const [newPartQty, setNewPartQty] = useState('1');

  const [uploading, setUploading] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const reportIframeRef = useRef<HTMLIFrameElement>(null);

  // ── Mejoras v2 (tipo de trabajo, mecánicos, costos, historial) ──
  const isMechanic = user?.workshopUserRole === 'MECANICO';
  const [tipoTrabajoSel, setTipoTrabajoSel] = useState<string[]>([]);
  const [tipoTrabajoOtro, setTipoTrabajoOtro] = useState('');
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [horasEstimadasInput, setHorasEstimadasInput] = useState('');
  const [precioServicioInput, setPrecioServicioInput] = useState('');
  const [partPriceEdits, setPartPriceEdits] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'jobs' | 'historial'>('jobs');
  const [histTab, setHistTab] = useState<'hours' | 'movements'>('hours');
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [mechanicHours, setMechanicHours] = useState<any[]>([]);
  const [invMovements, setInvMovements] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-part-dropdown]')) setPartDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const openCreate = () => { setEditingJob(null); setForm(EMPTY_FORM); setFormError(null); setIsFormOpen(true); };
  const openEdit = (job: WorkshopJob) => {
    setEditingJob(job);
    setForm({
      marca: job.marca, modelo: job.modelo, anio: String(job.anio),
      placa: job.placa || '', kilometraje: String(job.kilometraje || ''),
      problema: job.problema, clienteNombre: job.clienteNombre, clienteTelefono: job.clienteTelefono || '',
    });
    setFormError(null); setIsFormOpen(true);
  };
  const closeForm = () => { setIsFormOpen(false); setEditingJob(null); setForm(EMPTY_FORM); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.marca.trim() || !form.modelo.trim()) { setFormError('Marca y modelo son obligatorios.'); return; }
    if (!form.anio || parseInt(form.anio) < 1900) { setFormError('Ingrese un año válido.'); return; }
    if (!form.clienteNombre.trim()) { setFormError('El nombre del cliente es obligatorio.'); return; }
    if (!form.problema.trim()) { setFormError('Describa el problema.'); return; }

    const payload: any = {
      marca: form.marca.trim(), modelo: form.modelo.trim(),
      anio: parseInt(form.anio), placa: form.placa.trim() || undefined,
      kilometraje: form.kilometraje ? parseInt(form.kilometraje) : undefined,
      problema: form.problema.trim(), clienteNombre: form.clienteNombre.trim(),
      clienteTelefono: form.clienteTelefono.trim() || undefined,
    };

    try {
      setSaving(true);
      if (editingJob) { await api.put(`/workshops/me/jobs/${editingJob.id}`, payload); }
      else { await api.post('/workshops/me/jobs', payload); }
      closeForm(); await fetchJobs();
    } catch (err: any) { setFormError(err.response?.data?.message || 'No se pudo guardar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (job: WorkshopJob) => {
    if (!confirm(`¿Eliminar registro de ${job.clienteNombre} - ${job.marca} ${job.modelo}?`)) return;
    try { await api.delete(`/workshops/me/jobs/${job.id}`); await fetchJobs(); if (detailJob?.id === job.id) setDetailJob(null); }
    catch (err: any) { alert(err.response?.data?.message || 'No se pudo eliminar.'); }
  };

  const openDetail = async (job: WorkshopJob) => {
    setDetailJob(job); setLoadingDetail(true);
    try {
      const res = await api.get(`/workshops/me/jobs/${job.id}`);
      const data = res.data;
      setDetailJob(data);
      setDetailLogs(data.logs || []);
      setCheckpoints(data.checkpoints || []);
      setPartNeeds(data.partNeeds || []);
      setTipoTrabajoSel(data.tipoTrabajo?.categorias || []);
      setTipoTrabajoOtro(data.tipoTrabajo?.otro || '');
      setHorasEstimadasInput(data.horasEstimadas ? String(data.horasEstimadas) : '');
      setPrecioServicioInput(data.precioServicio != null ? String(data.precioServicio) : '');
      setPartPriceEdits({});
      fetchTeamUsers();
      if (data.estado === 'TRABAJANDO') fetchInventory();
    } catch (err) { console.error(err); }
    finally { setLoadingDetail(false); }
  };

  const fetchTeamUsers = async () => {
    try {
      const res = await api.get('/workshops/me/users');
      setTeamUsers((res.data || []).filter(
        (u: any) => ['MECANICO', 'JEFE_MECANICO'].includes(u.role) && u.status !== 'INACTIVE',
      ));
    } catch (err) { console.error(err); }
  };

  const loadHistorial = async () => {
    setHistLoading(true);
    try {
      const [h, m] = await Promise.all([
        api.get('/workshops/me/mechanic-hours', { params: { from: histFrom || undefined, to: histTo || undefined } }),
        api.get('/workshops/me/inventory-movements'),
      ]);
      setMechanicHours(h.data || []);
      setInvMovements(m.data || []);
    } catch (err) { console.error(err); }
    finally { setHistLoading(false); }
  };

  const openStatusModal = (job: WorkshopJob) => { setStatusModalJob(job); setStatusObs(''); setStatusPassword(''); };

  const handleStatusChange = async (newStatus: string) => {
    if (!statusModalJob) return;
    setChangingStatus(true);
    try {
      await api.patch(`/workshops/me/jobs/${statusModalJob.id}/status`, {
        estado: newStatus, observaciones: statusObs.trim() || undefined, password: statusPassword,
      });
      setStatusModalJob(null); setStatusPassword(''); await fetchJobs();
      if (detailJob?.id === statusModalJob.id) {
        const res = await api.get(`/workshops/me/jobs/${statusModalJob.id}`);
        const data = res.data;
        setDetailJob(data); setDetailLogs(data.logs || []);
        setCheckpoints(data.checkpoints || []);
        setPartNeeds(data.partNeeds || []);
        setTipoTrabajoSel(data.tipoTrabajo?.categorias || []);
        setTipoTrabajoOtro(data.tipoTrabajo?.otro || '');
        setHorasEstimadasInput(data.horasEstimadas ? String(data.horasEstimadas) : '');
        setPrecioServicioInput(data.precioServicio != null ? String(data.precioServicio) : '');
        setPartPriceEdits({});
      }
      if (newStatus === 'FINALIZADO') {
        setTimeout(() => { handleDownloadPdf(statusModalJob.id); }, 300);
      }
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo cambiar el estado.'); }
    finally { setChangingStatus(false); }
  };

  const handleCheckpointToggle = async (cp: Checkpoint) => {
    if (!detailJob) return;
    const updated = checkpoints.map((c) => c.id === cp.id ? { ...c, checked: !c.checked } : c);
    setCheckpoints(updated);
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}/checkpoints`, {
        checkpoints: updated.map((c) => ({ servicio: c.servicio, checked: c.checked, notas: c.notas })),
      });
    } catch (err) { console.error(err); }
  };

  const handleAddPartNeed = async () => {
    if (!detailJob || !selectedPartId) return;
    const item = inventoryItems.find((i: any) => i.id === selectedPartId);
    if (!item) return;
    try {
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/parts-needed`, {
        nombre: item.nombre,
        cantidad: parseInt(newPartQty) || 1,
        esInsumo: item.categoria === 'INSUMO',
        inventoryItemId: selectedPartId,
      });
      setPartNeeds([...partNeeds, res.data]);
      setSelectedPartId(null); setPartSearch(''); setNewPartQty('1'); setPartDropdownOpen(false);
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo agregar.'); }
  };

  const handleRemovePartNeed = async (pnId: string) => {
    if (!detailJob) return;
    try {
      await api.delete(`/workshops/me/jobs/${detailJob.id}/parts-needed/${pnId}`);
      setPartNeeds(partNeeds.filter((p) => p.id !== pnId));
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo quitar.'); }
  };

  const handleUsePartNeed = async (pnId: string) => {
    if (!detailJob) return;
    try {
      await api.patch(`/workshops/me/jobs/${detailJob.id}/parts-needed/${pnId}/use`);
      setPartNeeds(partNeeds.map((p) => p.id === pnId ? { ...p, yaUsado: true } : p));
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo descontar.'); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imagenes' | 'imagenesTerminado') => {
    if (!detailJob || !e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 5);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post(`/workshops/me/jobs/${detailJob.id}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        urls.push(res.data.url);
      }
      const current = (detailJob[field] as string[]) || [];
      const updated = [...current, ...urls].slice(0, 5);
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { [field]: updated });
      setDetailJob({ ...detailJob, [field]: updated });
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudieron subir las imágenes.'); }
    finally { setUploading(false); }
  };

  const handleRemoveImage = async (url: string, field: 'imagenes' | 'imagenesTerminado') => {
    if (!detailJob) return;
    const updated = ((detailJob[field] as string[]) || []).filter((u) => u !== url);
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { [field]: updated });
      setDetailJob({ ...detailJob, [field]: updated });
    } catch (err: any) { alert(err.response?.data?.message); }
  };

  const handleSaveSignature = async () => {
    if (!detailJob || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { firmaDigital: dataUrl });
      setDetailJob({ ...detailJob, firmaDigital: dataUrl });
      setSignatureOpen(false);
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo guardar la firma.'); }
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleDownloadPdf = async (jobId: string) => {
    try {
      const res = await api.get(`/workshops/me/jobs/${jobId}/report`);
      setReportHtml(res.data);
    } catch (err: any) { alert('No se pudo generar el reporte.'); }
  };

  const fetchInventory = async () => {
    try { const res = await api.get('/workshops/me/inventory'); setInventoryItems(res.data || []); } catch {}
  };

  // ── Tipo de trabajo ──
  const saveTipoTrabajo = async (sel: string[], otro: string) => {
    if (!detailJob) return;
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { tipoTrabajo: { categorias: sel, otro: otro.trim() || undefined } });
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo guardar el tipo de trabajo.'); }
  };

  const toggleTipoTrabajo = (t: string) => {
    const next = tipoTrabajoSel.includes(t) ? tipoTrabajoSel.filter((x) => x !== t) : [...tipoTrabajoSel, t];
    setTipoTrabajoSel(next);
    saveTipoTrabajo(next, tipoTrabajoOtro);
  };

  // ── Horas estimadas ──
  const saveHorasEstimadas = async () => {
    if (!detailJob) return;
    const horas = parseInt(horasEstimadasInput);
    if (isNaN(horas) || horas <= 0) { setHorasEstimadasInput(detailJob.horasEstimadas ? String(detailJob.horasEstimadas) : ''); return; }
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { horasEstimadas: horas });
      setDetailJob({ ...detailJob, horasEstimadas: horas });
    } catch (err: any) { alert(err.response?.data?.message || 'No se guardó.'); }
  };

  // ── Asignación de mecánicos ──
  const handleAsignarMecanico = async () => {
    if (!detailJob || !assignUserId) return;
    const u = teamUsers.find((x: any) => x.id === assignUserId);
    if (!u) return;
    const wl: Worklog[] = (detailJob.mecanicosAsignados || []).slice();
    if (wl.some((w) => w.userId === assignUserId)) { alert('Ese mecánico ya está asignado.'); return; }
    const entry: Worklog = { key: `${Date.now()}`, userId: u.id, nombre: u.name, inicio: null, fin: null, horasReales: null };
    setSavingDetail(true);
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { mecanicosAsignados: [...wl, entry] });
      setDetailJob({ ...detailJob, mecanicosAsignados: [...wl, entry] });
      setAssignUserId('');
      await fetchJobs();
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo asignar.'); }
    finally { setSavingDetail(false); }
  };

  const handleRemoveMecanico = async (w: Worklog) => {
    if (!detailJob) return;
    if (w.inicio && !w.fin) { alert('Primero termina el trabajo en curso.'); return; }
    const updated = (detailJob.mecanicosAsignados || []).filter((x) => x.key !== w.key);
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { mecanicosAsignados: updated });
      setDetailJob({ ...detailJob, mecanicosAsignados: updated });
      await fetchJobs();
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo quitar.'); }
  };

  // ── Start / Stop trabajo ──
  const handleStartWork = async (w: Worklog) => {
    if (!detailJob) return;
    try {
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/work/start`, (w.userId && !isMechanic) ? { userId: w.userId } : {});
      setDetailJob({ ...detailJob, mecanicosAsignados: res.data || [] });
      await fetchJobs();
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo iniciar el trabajo.'); }
  };

  const handleStopWork = async (w: Worklog) => {
    if (!detailJob) return;
    try {
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/work/stop`, (w.userId && !isMechanic) ? { userId: w.userId } : {});
      setDetailJob({ ...detailJob, mecanicosAsignados: res.data || [] });
      await fetchJobs();
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo terminar el trabajo.'); }
  };

  // ── Costos (precio servicio y repuestos) ──
  const savePrecioServicio = async () => {
    if (!detailJob) return;
    const val = parseFloat(precioServicioInput);
    if (isNaN(val) || val < 0) { setPrecioServicioInput(detailJob.precioServicio != null ? String(detailJob.precioServicio) : ''); return; }
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { precioServicio: val });
      setDetailJob({ ...detailJob, precioServicio: val });
      await fetchJobs();
    } catch (err: any) { alert(err.response?.data?.message || 'No se guardó.'); }
  };

  const handlePartPriceBlur = async (pn: PartNeed) => {
    const val = parseFloat(partPriceEdits[pn.id]);
    if (isNaN(val) || val < 0) { setPartPriceEdits((p) => ({ ...p, [pn.id]: pn.precioUnitario != null ? String(pn.precioUnitario) : '' })); return; }
    setPartNeeds(partNeeds.map((p) => (p.id === pn.id ? { ...p, precioUnitario: val } : p)));
    try {
      await api.patch(`/workshops/me/jobs/${detailJob?.id}/parts-needed/${pn.id}`, { precioUnitario: val });
      await fetchJobs();
    } catch (err: any) { alert(err.response?.data?.message || 'No se guardó el precio.'); }
  };

  const subtotalRepuestos = (list: PartNeed[]) => (list || []).reduce((s, p) => s + ((Number(p.precioUnitario) || 0) * p.cantidad), 0);
  const totalCostos = (detalle: WorkshopJob | null, list: PartNeed[]) => (Number(detalle?.precioServicio) || 0) + subtotalRepuestos(list);

  // ── Historial: editar horas (admin) ──
  const handleEditMechanicHour = async (row: any) => {
    const input = prompt(`Horas reales para ${row.nombre} en ${row.marca} ${row.modelo}:`, row.horasReales ?? '');
    if (input === null) return;
    const horas = parseFloat(input);
    if (isNaN(horas) || horas < 0) { alert('Horas inválidas.'); return; }
    try {
      await api.patch(`/workshops/me/jobs/${row.jobId}/worklogs/${row.worklogKey}`, { horasReales: horas });
      await loadHistorial();
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo editar.'); }
  };

  if (loading || loadingWorkshop) {
    return (<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>);
  }
  if (workshopError || !workshop) {
    return (<div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center"><AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="font-bold text-zinc-200">No se pudo cargar el perfil del taller</h3><p className="text-sm text-zinc-400 mt-1">{workshopError}</p></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2"><Car className="w-6 h-6 text-emerald-400" /><span>CRM - Vehículos en Taller</span></h2>
          <p className="text-sm text-zinc-400">{isMechanic ? 'Vista de mecánico: vehículos en check inicial o trabajando.' : 'Registro y seguimiento de vehículos que ingresan al taller.'}</p>
        </div>
        {!isMechanic && <button onClick={openCreate} className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2"><Plus className="w-4 h-4" /><span>Registrar Vehículo</span></button>}
      </div>

      {!isMechanic && (
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'jobs' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'}`}><Car className="w-4 h-4" /> Vehículos</button>
          <button onClick={() => { if (activeTab !== 'historial') loadHistorial(); setActiveTab('historial'); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'historial' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'}`}><History className="w-4 h-4" /> Historial</button>
        </div>
      )}

      {activeTab === 'historial' && !isMechanic && (
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-zinc-100">Historial del Taller</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Desde</label>
                <input type="date" value={histFrom} onChange={(e) => setHistFrom(e.target.value)} className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Hasta</label>
                <input type="date" value={histTo} onChange={(e) => setHistTo(e.target.value)} className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs" />
              </div>
              <button onClick={loadHistorial} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Filtrar</button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
            <button onClick={() => setHistTab('hours')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${histTab === 'hours' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}><Timer className="w-3.5 h-3.5" /> Horas de mecánicos</button>
            <button onClick={() => setHistTab('movements')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${histTab === 'movements' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}><Package className="w-3.5 h-3.5" /> Movimientos de inventario</button>
          </div>
          {histLoading ? (
            <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : histTab === 'hours' ? (
            (() => {
              const totalHours = mechanicHours.reduce((s, r) => s + (r.horasReales ?? 0), 0);
              const totalJobs = new Set(mechanicHours.map((r) => r.jobId)).size;
              const byMechanic: Record<string, number> = {};
              mechanicHours.forEach((r) => { byMechanic[r.nombre || 'Sin asignar'] = (byMechanic[r.nombre || 'Sin asignar'] || 0) + (r.horasReales ?? 0); });
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl"><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Horas totales</p><p className="text-2xl font-extrabold text-zinc-100 mt-1">{totalHours.toFixed(2)} h</p></div>
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl"><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Vehículos atendidos</p><p className="text-2xl font-extrabold text-zinc-100 mt-1">{totalJobs}</p></div>
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl"><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Mecánicos activos</p><p className="text-2xl font-extrabold text-zinc-100 mt-1">{Object.keys(byMechanic).length}</p></div>
                  </div>
                  {Object.entries(byMechanic).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(byMechanic).map(([nombre, h]) => (
                        <div key={nombre} className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs"><span className="text-zinc-300 font-semibold">{nombre}</span><span className="text-zinc-500 ml-2">{h.toFixed(2)} h</span></div>
                      ))}
                    </div>
                  )}
                  {mechanicHours.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-6">Sin registros de horas en el rango seleccionado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                          <th className="py-2 pr-3 font-bold">Mecánico</th><th className="py-2 pr-3 font-bold">Vehículo</th><th className="py-2 pr-3 font-bold">Cliente</th><th className="py-2 pr-3 font-bold">Inicio</th><th className="py-2 pr-3 font-bold">Fin</th><th className="py-2 pr-3 font-bold text-right">Horas</th><th className="py-2 font-bold">Editar</th>
                        </tr></thead>
                        <tbody>
                          {mechanicHours.map((r, i) => (
                            <tr key={i} className="border-b border-zinc-800/60 hover:bg-zinc-900/50">
                              <td className="py-2.5 pr-3 text-zinc-200 font-semibold">{r.nombre || '-'}</td>
                              <td className="py-2.5 pr-3 text-zinc-300">{r.marca} {r.modelo}{r.placa ? ` (${r.placa})` : ''}</td>
                              <td className="py-2.5 pr-3 text-zinc-500">{r.clienteNombre || '-'}</td>
                              <td className="py-2.5 pr-3 text-zinc-400 text-xs">{r.inicio ? new Date(r.inicio).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                              <td className="py-2.5 pr-3 text-zinc-400 text-xs">{r.fin ? new Date(r.fin).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                              <td className="py-2.5 pr-3 text-right font-bold text-zinc-200">{r.horasReales != null ? `${r.horasReales} h` : '-'}</td>
                              <td className="py-2.5"><button onClick={() => handleEditMechanicHour(r)} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-lg flex items-center gap-1"><Edit2 className="w-3 h-3" /> Editar</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            (() => {
              const byItem: Record<string, { cant: number; jobs: number }> = {};
              invMovements.forEach((mv: any) => {
                const k = mv.nombre || 'Sin nombre';
                byItem[k] = byItem[k] || { cant: 0, jobs: 0 };
                byItem[k].cant += mv.cantidad;
                byItem[k].jobs += 1;
              });
              return (
                <div className="space-y-4">
                  {Object.entries(byItem).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(byItem).map(([nombre, v]) => (
                        <div key={nombre} className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs"><span className="text-zinc-300 font-semibold">{nombre}</span><span className="text-zinc-500 ml-2">{v.cant} uds · {v.jobs} jobs</span></div>
                      ))}
                    </div>
                  )}
                  {invMovements.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-6">Sin movimientos de inventario registrados.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                          <th className="py-2 pr-3 font-bold">Pieza</th><th className="py-2 pr-3 font-bold">Cant.</th><th className="py-2 pr-3 font-bold">Vehículo</th><th className="py-2 pr-3 font-bold">Cliente</th><th className="py-2 pr-3 font-bold">Salida</th><th className="py-2 font-bold">Usado por</th>
                        </tr></thead>
                        <tbody>
                          {invMovements.map((mv: any, i) => (
                            <tr key={i} className="border-b border-zinc-800/60 hover:bg-zinc-900/50">
                              <td className="py-2.5 pr-3 text-zinc-200 font-semibold">{mv.nombre}</td>
                              <td className="py-2.5 pr-3 text-zinc-300">{mv.cantidad}</td>
                              <td className="py-2.5 pr-3 text-zinc-400 text-xs">{mv.marca} {mv.modelo}{mv.placa ? ` (${mv.placa})` : ''}</td>
                              <td className="py-2.5 pr-3 text-zinc-500 text-xs">{mv.clienteNombre || '-'}</td>
                              <td className="py-2.5 pr-3 text-zinc-400 text-xs">{mv.yaUsadoEn ? new Date(mv.yaUsadoEn).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                              <td className="py-2.5 text-zinc-400 text-xs">{mv.usadoPorNombre || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {activeTab === 'jobs' && (<>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_FLOW.map((s) => {
          const meta = STATUS_META[s]; const Icon = meta.icon;
          return (<button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)} className={`p-4 border rounded-2xl transition-all text-left ${statusFilter === s ? `${meta.bg} border-2` : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
            <div className="flex items-center gap-2 mb-2"><Icon className={`w-4 h-4 ${statusFilter === s ? meta.color : 'text-zinc-500'}`} /><span className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === s ? meta.color : 'text-zinc-500'}`}>{meta.label}</span></div>
            <p className={`text-2xl font-extrabold ${statusFilter === s ? 'text-zinc-100' : 'text-zinc-300'}`}>{stats[s]}</p>
          </button>);
        })}
      </div>

      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por marca, modelo, placa, cliente..." className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 transition-colors text-sm" /></div>
        <button onClick={fetchJobs} className="px-3 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 transition-colors" title="Recargar"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500"><Car className="w-8 h-8" /></div>
          {jobs.length === 0 ? (isMechanic ? (<>
            <h3 className="font-bold text-zinc-300 text-base">No hay vehículos en tu lista</h3>
            <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">Se muestran aquí los vehículos en check inicial o trabajando.</p>
          </>) : (<>
            <h3 className="font-bold text-zinc-300 text-base">No hay vehículos registrados</h3>
            <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">Registra el primer vehículo que ingrese a tu taller.</p>
            <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold border border-zinc-800 rounded-xl transition-colors text-sm"><Plus className="w-3.5 h-3.5" /> Registrar primer vehículo</button>
          </>)) : (<>
            <h3 className="font-bold text-zinc-300 text-base">Sin resultados</h3>
            <p className="text-zinc-500 text-sm mt-1">Intenta con otros filtros.</p>
          </>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((job) => {
            const meta = STATUS_META[job.estado] || STATUS_META.INGRESANDO; const StatusIcon = meta.icon;
            const nextStatus = meta.next; const nextMeta = nextStatus ? STATUS_META[nextStatus] : null;
            return (
              <div key={job.id} className="p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all group">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}><StatusIcon className="w-2.5 h-2.5" />{meta.label}</span>
                  {job.requestId ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 text-blue-400"><FileText className="w-2.5 h-2.5" />Solicitud</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 border border-zinc-500/20 text-zinc-500"><User className="w-2.5 h-2.5" />Directo</span>
                  )}
                </div>
                <button onClick={() => openDetail(job)} className="text-left w-full">
                  <h3 className="text-sm font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors truncate">{job.marca} {job.modelo} <span className="text-zinc-500 font-normal">{job.anio}</span></h3>
                </button>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {job.placa && <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] font-mono text-zinc-400">{job.placa}</span>}
                  {job.kilometraje && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-400"><Fuel className="w-2.5 h-2.5" />{job.kilometraje.toLocaleString()}</span>}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5 line-clamp-1">{job.clienteNombre}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5 line-clamp-1">{job.problema}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                  <span className="text-[9px] text-zinc-600">{new Date(job.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}</span>
                  <div className="flex items-center gap-1">
                    {!isMechanic && (<>
                    {nextStatus && nextMeta && (
                      <button onClick={() => openStatusModal(job)} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-colors flex items-center gap-0.5" title={`Avanzar a: ${nextMeta.label}`}>
                        {React.createElement(nextMeta.icon, { className: 'w-2.5 h-2.5' })}<span className="hidden sm:inline">{nextMeta.label}</span>
                      </button>
                    )}
                    <button onClick={() => handleDownloadPdf(job.id)} className="px-1.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 text-[10px] rounded transition-colors" title="PDF"><Download className="w-2.5 h-2.5" /></button>
                    <button onClick={() => openEdit(job)} className="px-1.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 text-[10px] rounded transition-colors" title="Editar"><Edit2 className="w-2.5 h-2.5" /></button>
                    </>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>)}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6 max-h-[90vh] overflow-y-auto">
            <button onClick={closeForm} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-zinc-200 mb-1 flex items-center gap-2"><Car className="w-5 h-5 text-emerald-400" />{editingJob ? 'Editar Vehículo' : 'Registrar Vehículo'}</h3>
            <p className="text-xs text-zinc-500 mb-6">Complete los datos del vehículo que ingresa al taller.</p>
            {formError && (<div className="mb-4 p-3 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-2 text-red-200 text-xs"><AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" /><span>{formError}</span></div>)}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Marca <span className="text-red-400">*</span></label><input type="text" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Ej: Toyota" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm" /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Modelo <span className="text-red-400">*</span></label><input type="text" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Ej: Hilux" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Año <span className="text-red-400">*</span></label><input type="number" min="1900" max={new Date().getFullYear() + 1} value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} placeholder="2020" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono" /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Placa</label><input type="text" value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} placeholder="ABC-123" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono uppercase" /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Kilometraje</label><input type="number" min="0" value={form.kilometraje} onChange={(e) => setForm({ ...form, kilometraje: e.target.value })} placeholder="125000" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm font-mono" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Cliente <span className="text-red-400">*</span></label><input type="text" value={form.clienteNombre} onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })} placeholder="Nombre del cliente" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Teléfono del cliente</label><input type="tel" value={form.clienteTelefono} onChange={(e) => setForm({ ...form, clienteTelefono: e.target.value })} placeholder="+58 412 1234567" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Problema reportado <span className="text-red-400">*</span></label><textarea value={form.problema} onChange={(e) => setForm({ ...form, problema: e.target.value })} rows={3} placeholder="Describa el problema..." className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm resize-none" /></div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button type="button" onClick={closeForm} className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Guardando...</span></> : <><Save className="w-4 h-4" /><span>{editingJob ? 'Guardar cambios' : 'Registrar vehículo'}</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setDetailJob(null)} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors z-10"><X className="w-5 h-5" /></button>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {(() => { const meta = STATUS_META[detailJob.estado] || STATUS_META.INGRESANDO; const Icon = meta.icon; return (<span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}><Icon className="w-4 h-4" />{meta.label}</span>); })()}
                    {detailJob.requestId && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 border-zinc-500/20 text-zinc-400"><FileText className="w-2.5 h-2.5" /> Solicitud</span>}
                    {!isMechanic && <button onClick={() => handleDownloadPdf(detailJob.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"><Download className="w-3.5 h-3.5" /> PDF</button>}
                  </div>
                  <h3 className="text-xl font-bold text-zinc-100">{detailJob.marca} {detailJob.modelo} {detailJob.anio}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-zinc-400">
                    {detailJob.placa && <span className="font-mono">Placa: {detailJob.placa}</span>}
                    {detailJob.kilometraje && <span className="flex items-center gap-1"><Fuel className="w-3.5 h-3.5" />{detailJob.kilometraje.toLocaleString()} km</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl"><div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-zinc-500" /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cliente</span></div><p className="text-sm font-semibold text-zinc-200">{detailJob.clienteNombre}</p>{detailJob.clienteTelefono && <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {detailJob.clienteTelefono}</p>}</div>
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl"><div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-zinc-500" /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Registro</span></div><p className="text-sm font-semibold text-zinc-200">{new Date(detailJob.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl mb-6"><div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-zinc-500" /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Problema reportado</span></div><p className="text-sm text-zinc-300">{detailJob.problema}</p></div>

                {detailJob.estado === 'CHECK_INICIAL' && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl mb-6">
                    <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><ClipboardList className="w-4 h-4 text-amber-400" /> Tipo de Trabajo</h4>
                    <div className="flex flex-wrap gap-2">
                      {TRABAJOS_TIPOS.filter((t) => t !== 'Otro').map((t) => {
                        const on = tipoTrabajoSel.includes(t);
                        return (
                          <button key={t} onClick={() => toggleTipoTrabajo(t)} disabled={isMechanic}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-500'} ${isMechanic ? 'cursor-default opacity-80' : ''}`}>
                            {t}
                          </button>
                        );
                      })}
                      <button onClick={() => toggleTipoTrabajo('Otro')} disabled={isMechanic}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${tipoTrabajoSel.includes('Otro') ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-500'} ${isMechanic ? 'cursor-default opacity-80' : ''}`}>Otro</button>
                    </div>
                    {(tipoTrabajoSel.includes('Otro') || tipoTrabajoOtro) && (
                      <div className="mt-3">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Especificar</label>
                        <input value={tipoTrabajoOtro} onChange={(e) => setTipoTrabajoOtro(e.target.value)} onBlur={() => saveTipoTrabajo(tipoTrabajoSel, tipoTrabajoOtro)} disabled={isMechanic}
                          placeholder="Describa el tipo de trabajo..." className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:border-amber-500 disabled:opacity-60" />
                      </div>
                    )}
                    <div className="mt-5 -mb-1">
                      <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-3"><CheckSquare className="w-4 h-4 text-amber-400" /> Check Inicial</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {checkpoints.map((cp) => (
                          <button key={cp.id} onClick={() => handleCheckpointToggle(cp)} disabled={isMechanic} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${cp.checked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'} ${isMechanic ? 'cursor-default opacity-80' : ''}`}>
                            {cp.checked ? <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" /> : <Square className="w-4 h-4 text-zinc-600 shrink-0" />}
                            <span className={`text-sm ${cp.checked ? 'text-emerald-300 line-through' : 'text-zinc-300'}`}>{cp.servicio}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {detailJob.estado === 'TRABAJANDO' && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl mb-6">
                    <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-purple-400" /> Mecánicos y Horas</h4>
                    <div className="space-y-2 mb-3">
                      {(detailJob.mecanicosAsignados || []).map((w) => {
                        const active = !!w.inicio && !w.fin;
                        const isMine = w.userId === user?.id;
                        const canOperate = isMechanic ? isMine : true;
                        return (
                          <div key={w.key} className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-purple-400" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-zinc-200 font-semibold">{w.nombre}</p>
                                {active && <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />EN CURSO</span>}
                                {w.horasReales != null && <span className="text-[10px] text-zinc-500 font-mono">{w.horasReales} h</span>}
                              </div>
                              <p className="text-[10px] text-zinc-500">
                                {w.inicio ? `Inicio: ${new Date(w.inicio).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Sin iniciar'}
                                {w.fin ? ` · Fin: ${new Date(w.fin).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                              </p>
                            </div>
                            {canOperate && !w.inicio && (
                              <button onClick={() => handleStartWork(w)} className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"><Play className="w-3 h-3" /> Empezar</button>
                            )}
                            {canOperate && active && (
                              <button onClick={() => handleStopWork(w)} className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"><Square className="w-3 h-3" /> Terminar</button>
                            )}
                            {!isMechanic && !w.inicio && (
                              <button onClick={() => handleRemoveMecanico(w)} className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors" title="Quitar"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        );
                      })}
                      {isMechanic && !(detailJob.mecanicosAsignados || []).some((w) => w.userId === user?.id && w.inicio && !w.fin) && (
                        <button onClick={() => handleStartWork({ key: 'self', userId: user?.id || '', nombre: user?.name || 'Yo' })} className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"><Play className="w-3.5 h-3.5" /> Empezar mi trabajo</button>
                      )}
                    </div>
                    {!isMechanic && (
                      <div className="flex gap-2 items-end mb-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase">Asignar mecánico</label>
                          <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-purple-500">
                            <option value="">Seleccionar mecánico...</option>
                            {teamUsers.map((u: any) => (<option key={u.id} value={u.id}>{u.name} ({u.role})</option>))}
                          </select>
                        </div>
                        <button onClick={handleAsignarMecanico} disabled={!assignUserId || savingDetail} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shrink-0 disabled:opacity-40 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Asignar</button>
                      </div>
                    )}
                    <div className="flex gap-2 items-end mb-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1"><Timer className="w-3 h-3" /> Horas estimadas</label>
                        <input type="number" min="0" step="0.5" value={horasEstimadasInput} onChange={(e) => setHorasEstimadasInput(e.target.value)} onBlur={saveHorasEstimadas} placeholder="0" className="w-28 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono" disabled={isMechanic} />
                      </div>
                      <p className="text-[10px] text-zinc-600 pb-2">Se guarda al salir del campo.</p>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4 mt-2"><Package className="w-4 h-4 text-purple-400" /> Piezas / Insumos Necesarios</h4>
                    <div className="space-y-2 mb-3">
                      {partNeeds.map((pn) => (
                        <div key={pn.id} className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-200 font-semibold">{pn.nombre}</p>
                            <p className="text-xs text-zinc-500">Cant: {pn.cantidad} {pn.esInsumo ? '(Insumo)' : '(Repuesto)'}{pn.inventoryItem && ` — Stock: ${pn.inventoryItem.stock}`}</p>
                          </div>
                          {!isMechanic && pn.inventoryItemId && !pn.yaUsado && <button onClick={() => handleUsePartNeed(pn.id)} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg">Usar</button>}
                          {pn.yaUsado && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg">Usado</span>}
                          {!isMechanic && !pn.yaUsado && <button onClick={() => handleRemovePartNeed(pn.id)} className="px-2 py-1 text-zinc-500 hover:text-red-400 text-[10px]"><Trash2 className="w-3.5 h-3.5" /></button>}
                        </div>
                      ))}
                    </div>
                    {!isMechanic && (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Buscar pieza/insumo del inventario</label>
                        <div className="relative" data-part-dropdown>
                          <input
                            type="text"
                            value={partSearch}
                            onChange={(e) => { setPartSearch(e.target.value); setSelectedPartId(null); setPartDropdownOpen(true); }}
                            onFocus={() => setPartDropdownOpen(true)}
                            placeholder="Escriba para buscar..."
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs"
                          />
                          {partDropdownOpen && partSearch && !selectedPartId && (
                            <div className="absolute z-20 top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                              {inventoryItems.filter((item: any) => item.nombre.toLowerCase().includes(partSearch.toLowerCase())).length === 0 ? (
                                <div className="px-3 py-2 text-xs text-zinc-500">Sin resultados en inventario</div>
                              ) : (
                                inventoryItems.filter((item: any) => item.nombre.toLowerCase().includes(partSearch.toLowerCase())).map((item: any) => (
                                  <button key={item.id} onClick={() => { setSelectedPartId(item.id); setPartSearch(item.nombre); setPartDropdownOpen(false); }}
                                    className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded-lg flex items-center justify-between gap-2 transition-colors">
                                    <div className="min-w-0">
                                      <p className="text-xs text-zinc-200 font-semibold truncate">{item.nombre}</p>
                                      <p className="text-[10px] text-zinc-500">{item.categoria} — Stock: {item.stock} {item.unidad}</p>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                          {selectedPartId && (
                            <button onClick={() => { setSelectedPartId(null); setPartSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="w-20 space-y-1.5"><label className="text-[10px] text-zinc-500 font-bold uppercase">Cant.</label><input type="number" min="1" value={newPartQty} onChange={(e) => setNewPartQty(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono" /></div>
                      <button onClick={handleAddPartNeed} disabled={!selectedPartId} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    )}
                    <div className="mt-3">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1 mb-1"><ImageIcon className="w-3 h-3" /> Fotos del trabajo (máx. 5)</label>
                      <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, 'imagenes')} className="w-full text-xs text-zinc-400" disabled={uploading} />
                      {uploading && <p className="text-xs text-amber-400 mt-1">Subiendo imágenes...</p>}
                      {detailJob.imagenes && detailJob.imagenes.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {(detailJob.imagenes as string[]).map((url, i) => (
                            <div key={i} className="relative group"><img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-zinc-800" /><button onClick={() => handleRemoveImage(url, 'imagenes')} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button></div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailJob.estado === 'TERMINADO' && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl mb-6">
                    <div className="mb-5">
                      <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-3"><DollarSign className="w-4 h-4 text-emerald-400" /> Cotización / Costos</h4>
                      <div className="flex gap-2 items-end mb-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase">Precio del servicio ($)</label>
                          <input type="number" min="0" step="0.01" value={precioServicioInput} onChange={(e) => setPrecioServicioInput(e.target.value)} onBlur={savePrecioServicio} placeholder="0.00" className="w-36 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono focus:border-emerald-500" />
                        </div>
                        <p className="text-[10px] text-zinc-600 pb-2">Se guarda al salir del campo.</p>
                      </div>
                      {partNeeds.length > 0 && (
                        <div className="overflow-x-auto mb-3">
                          <table className="w-full text-sm">
                            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                              <th className="py-2 pr-3 font-bold">Pieza</th><th className="py-2 pr-3 font-bold">Cant.</th><th className="py-2 pr-3 font-bold text-right">Precio U. ($)</th><th className="py-2 font-bold text-right">Subtotal</th>
                            </tr></thead>
                            <tbody>
                              {partNeeds.map((pn) => (
                                <tr key={pn.id} className="border-b border-zinc-800/60">
                                  <td className="py-2 pr-3 text-zinc-200">{pn.nombre}</td>
                                  <td className="py-2 pr-3 text-zinc-300">{pn.cantidad}</td>
                                  <td className="py-2 pr-3 text-right">
                                    <input
                                      type="number" min="0" step="0.01"
                                      value={partPriceEdits[pn.id] !== undefined ? partPriceEdits[pn.id] : (pn.precioUnitario != null ? String(pn.precioUnitario) : '')}
                                      onChange={(e) => setPartPriceEdits((p) => ({ ...p, [pn.id]: e.target.value }))}
                                      onBlur={() => handlePartPriceBlur(pn)}
                                      placeholder="—"
                                      className="w-24 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-right focus:border-emerald-500"
                                    />
                                  </td>
                                  <td className="py-2 pr-3 text-right font-mono text-zinc-400">{((Number(pn.precioUnitario) || 0) * pn.cantidad).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="flex justify-end items-center gap-6 pt-2 border-t border-zinc-800">
                        <div className="text-right"><p className="text-[10px] text-zinc-500 font-bold uppercase">Servicio</p><p className="text-sm font-bold text-zinc-200">{((Number(detailJob.precioServicio) || 0)).toFixed(2)}$</p></div>
                        <div className="text-right"><p className="text-[10px] text-zinc-500 font-bold uppercase">Repuestos</p><p className="text-sm font-bold text-zinc-200">{subtotalRepuestos(partNeeds).toFixed(2)}$</p></div>
                        <div className="text-right"><p className="text-[10px] text-emerald-400 font-bold uppercase">Total</p><p className="text-lg font-extrabold text-emerald-400">{totalCostos(detailJob, partNeeds).toFixed(2)}$</p></div>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><Camera className="w-4 h-4 text-emerald-400" /> Fotos del Resultado</h4>
                    <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, 'imagenesTerminado')} className="w-full text-xs text-zinc-400" disabled={uploading} />
                    {uploading && <p className="text-xs text-amber-400 mt-1">Subiendo imágenes...</p>}
                    {detailJob.imagenesTerminado && (detailJob.imagenesTerminado as string[]).length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {(detailJob.imagenesTerminado as string[]).map((url, i) => (
                          <div key={i} className="relative group"><img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-zinc-800" /><button onClick={() => handleRemoveImage(url, 'imagenesTerminado')} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button></div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detailJob.estado === 'SALIDA' && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl mb-6">
                    <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-3"><DollarSign className="w-4 h-4 text-zinc-400" /> Resumen de Costos</h4>
                    <div className="flex gap-2 items-end mb-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Precio del servicio ($)</label>
                        <input type="number" min="0" step="0.01" value={precioServicioInput} onChange={(e) => setPrecioServicioInput(e.target.value)} onBlur={savePrecioServicio} placeholder="0.00" className="w-36 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono focus:border-emerald-500" />
                      </div>
                      <p className="text-[10px] text-zinc-600 pb-2">Se guarda al salir del campo.</p>
                    </div>
                    {partNeeds.length > 0 && (
                      <div className="overflow-x-auto mb-3">
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                            <th className="py-2 pr-3 font-bold">Pieza</th><th className="py-2 pr-3 font-bold">Cant.</th><th className="py-2 pr-3 font-bold text-right">Precio U. ($)</th><th className="py-2 font-bold text-right">Subtotal</th>
                          </tr></thead>
                          <tbody>
                            {partNeeds.map((pn) => (
                              <tr key={pn.id} className="border-b border-zinc-800/60">
                                <td className="py-2 pr-3 text-zinc-200">{pn.nombre}</td>
                                <td className="py-2 pr-3 text-zinc-300">{pn.cantidad}</td>
                                <td className="py-2 pr-3 text-right">
                                  <input
                                    type="number" min="0" step="0.01"
                                    value={partPriceEdits[pn.id] !== undefined ? partPriceEdits[pn.id] : (pn.precioUnitario != null ? String(pn.precioUnitario) : '')}
                                    onChange={(e) => setPartPriceEdits((p) => ({ ...p, [pn.id]: e.target.value }))}
                                    onBlur={() => handlePartPriceBlur(pn)}
                                    placeholder="—"
                                    className="w-24 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-right focus:border-emerald-500"
                                  />
                                </td>
                                <td className="py-2 pr-3 text-right font-mono text-zinc-400">{((Number(pn.precioUnitario) || 0) * pn.cantidad).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="flex justify-end items-center gap-6 pt-2 border-t border-zinc-800 mb-5">
                      <div className="text-right"><p className="text-[10px] text-zinc-500 font-bold uppercase">Servicio</p><p className="text-sm font-bold text-zinc-200">{((Number(detailJob.precioServicio) || 0)).toFixed(2)}$</p></div>
                      <div className="text-right"><p className="text-[10px] text-zinc-500 font-bold uppercase">Repuestos</p><p className="text-sm font-bold text-zinc-200">{subtotalRepuestos(partNeeds).toFixed(2)}$</p></div>
                      <div className="text-right"><p className="text-[10px] text-emerald-400 font-bold uppercase">Total</p><p className="text-lg font-extrabold text-emerald-400">{totalCostos(detailJob, partNeeds).toFixed(2)}$</p></div>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><PenTool className="w-4 h-4 text-zinc-400" /> Firma del Cliente</h4>
                    {detailJob.firmaDigital ? (
                      <div className="space-y-3">
                        <img src={detailJob.firmaDigital} alt="Firma" className="h-24 border border-zinc-800 rounded-xl bg-white p-2" />
                        <button onClick={() => setSignatureOpen(true)} className="text-xs text-zinc-500 hover:text-zinc-300 underline">Cambiar firma</button>
                      </div>
                    ) : (
                      <button onClick={() => { setSignatureOpen(true); fetchInventory(); }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"><PenTool className="w-4 h-4" /> Capturar firma</button>
                    )}
                  </div>
                )}

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl mb-6">
                  <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><History className="w-4 h-4 text-zinc-500" /> Historial de estados</h4>
                  {detailLogs.length === 0 ? <p className="text-xs text-zinc-500">No hay registros.</p> : (
                    <div className="space-y-3">
                      {detailLogs.map((log) => { const logMeta = STATUS_META[log.estado] || STATUS_META.INGRESANDO; const LogIcon = logMeta.icon; return (
                        <div key={log.id} className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${logMeta.bg} border`}><LogIcon className={`w-4 h-4 ${logMeta.color}`} /></div>
                          <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className={`text-xs font-bold ${logMeta.color}`}>{logMeta.label}</span><span className="text-[10px] text-zinc-600">{new Date(log.createdAt).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>{log.firmaUsuarioNombre && <div className="flex items-center gap-1.5 mt-1"><User className="w-3 h-3 text-zinc-600" /><span className="text-[10px] text-zinc-500">Firmado por <span className="font-semibold text-zinc-400">{log.firmaUsuarioNombre}</span>{log.firmaUsuarioRol && <span className="px-1.5 py-0.5 bg-zinc-800 rounded-full text-zinc-500">{log.firmaUsuarioRol}</span>}</span></div>}{log.observaciones && <p className="text-xs text-zinc-500 mt-0.5">{log.observaciones}</p>}</div>
                        </div>); })}
                    </div>
                  )}
                </div>

                {!isMechanic && (
                <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end gap-3">
                  {detailJob.estado === 'FINALIZADO' && (
                    <button onClick={() => { setDetailJob(null); openStatusModal(detailJob); }} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Reabrir vehículo
                    </button>
                  )}
                  {STATUS_META[detailJob.estado]?.next && (<button onClick={() => { setDetailJob(null); openStatusModal(detailJob); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2">Avanzar estado<ChevronRight className="w-4 h-4" /></button>)}
                  <button onClick={() => { setDetailJob(null); openEdit(detailJob); }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"><Edit2 className="w-4 h-4" /> Editar</button>
                </div>
              )}
              </>
            )}
          </div>
        </div>
      )}

      {statusModalJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6">
            <button onClick={() => setStatusModalJob(null)} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-zinc-200 mb-1 flex items-center gap-2">
              {statusModalJob.estado === 'FINALIZADO' ? <><RefreshCw className="w-5 h-5 text-amber-400" />Reabrir Vehículo</> : <><ArrowRight className="w-5 h-5 text-emerald-400" />Cambiar Estado</>}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">{statusModalJob.marca} {statusModalJob.modelo} {statusModalJob.anio}</p>
            {user && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                <User className="w-4 h-4 text-zinc-500" />
                <span className="text-xs text-zinc-400"> Firmando como:</span>
                <span className="text-xs font-bold text-zinc-200">{user.name}</span>
                <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded-full">{user.workshopUserRole || user.role}</span>
              </div>
            )}
            <div className="space-y-3 mb-4">
              <p className="text-xs text-zinc-400">Estado actual:{(() => { const meta = STATUS_META[statusModalJob.estado] || STATUS_META.INGRESANDO; const Icon = meta.icon; return (<span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}><Icon className="w-3 h-3" />{meta.label}</span>); })()}</p>
              {statusModalJob.estado === 'FINALIZADO' ? (
                <p className="text-xs text-zinc-400">Reabrir a:{(() => { const meta = STATUS_META.INGRESANDO; const Icon = meta.icon; return (<span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}><Icon className="w-3 h-3" />{meta.label}</span>); })()}</p>
              ) : STATUS_META[statusModalJob.estado]?.next && <p className="text-xs text-zinc-400">Avanzar a:{(() => { const nextKey = STATUS_META[statusModalJob.estado].next!; const meta = STATUS_META[nextKey]; const Icon = meta.icon; return (<span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}><Icon className="w-3 h-3" />{meta.label}</span>); })()}</p>}
            </div>
            <div className="space-y-1.5 mb-4"><label className="text-xs font-semibold text-zinc-300">Observaciones (opcional)</label><textarea value={statusObs} onChange={(e) => setStatusObs(e.target.value)} rows={2} placeholder="Detalles del cambio de estado..." className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm resize-none" /></div>
            <div className="space-y-1.5 mb-6">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-zinc-500" /> Contraseña de firma <span className="text-red-400">*</span></label>
              <input type="password" value={statusPassword} onChange={(e) => setStatusPassword(e.target.value)} placeholder="Ingrese su contraseña para firmar" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-100 text-sm" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStatusModalJob(null)} className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors">Cancelar</button>
              <button
                onClick={() => {
                  const target = statusModalJob.estado === 'FINALIZADO' ? 'INGRESANDO' : STATUS_META[statusModalJob.estado]?.next!;
                  handleStatusChange(target);
                }}
                disabled={changingStatus || !statusPassword}
                className={`px-5 py-2.5 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50 ${
                  statusModalJob.estado === 'FINALIZADO'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-zinc-950'
                }`}>
                {changingStatus ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Cambiando...</span></> : <><CheckCircle2 className="w-4 h-4" /><span>{statusModalJob.estado === 'FINALIZADO' ? 'Reabrir' : 'Confirmar cambio'}</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {signatureOpen && detailJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6">
            <button onClick={() => setSignatureOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2"><PenTool className="w-5 h-5 text-zinc-400" /> Firme aquí</h3>
            <div className="bg-white rounded-xl p-1 mb-4"><canvas ref={canvasRef} width={400} height={200} className="w-full rounded-lg cursor-crosshair touch-none" onMouseDown={(e) => { const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); }} onMouseMove={(e) => { if (e.buttons !== 1) return; const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); }} /></div>
            <div className="flex justify-end gap-3"><button onClick={clearCanvas} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl">Limpiar</button><button onClick={handleSaveSignature} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl">Guardar firma</button></div>
          </div>
        </div>
      )}

      {reportHtml && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <button onClick={() => setReportHtml(null)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors">
              <X className="w-4 h-4" /> Cerrar
            </button>
            <h3 className="text-sm font-bold text-zinc-300">Reporte de servicio</h3>
            <button onClick={() => reportIframeRef.current?.contentWindow?.print()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Imprimir / PDF
            </button>
          </div>
          <iframe ref={reportIframeRef} srcDoc={reportHtml} className="flex-1 w-full bg-white border-0" title="Reporte" />
        </div>
      )}
    </div>
  );
}
