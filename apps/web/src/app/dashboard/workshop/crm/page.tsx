'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { api } from '../../../../lib/api';
import { useWorkshopProfile } from '../../../../store/useWorkshopProfile';
import { useAuthStore } from '../../../../store/useAuthStore';
import VoiceDictationButton from '../../../../components/VoiceDictationButton';
import {
  Car, Plus, Search, AlertCircle, Loader2,
  Edit2, Trash2, Save, RefreshCw, X, ChevronRight,
  CheckCircle2, Wrench, ArrowRight, User, Phone, FileText,
  Calendar, History, AlertTriangle, Camera, Package, PenTool,
  Download, Image as ImageIcon, Square, Fuel, Lock,
  DollarSign, Play, Timer, ClipboardList, Eye, EyeOff, Tag,
  Send, ExternalLink, ShieldCheck, Check, Sparkles, MessageSquare, Clock,
} from 'lucide-react';

interface ServicioRealizado {
  id: string;
  nombre: string;
  precio: number;
}

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
  origen?: string;
  requestId?: string;
  fechaCita?: string | null;
  firmaDigital?: string;
  firmaIngreso?: string;
  imagenes?: string[];
  imagenesIngreso?: string[];
  imagenesTerminado?: string[];
  tipoTrabajo?: { categorias?: string[]; otro?: string } | null;
  serviciosRealizados?: ServicioRealizado[];
  horasEstimadas?: number | null;
  mecanicosAsignados?: Worklog[];
  precioServicio?: number | null;
  createdAt: string;
  logs?: JobLog[];
  checkpoints?: Checkpoint[];
  partNeeds?: PartNeed[];

  // Campos v4
  nivelCombustible?: string | null;
  combustibleRegistradoPor?: string | null;
  combustibleRegistradoEn?: string | null;
  fotoTablero?: string | null;
  diagnosticoMecanico?: string | null;
  diagnosticoImagenes?: string[];
  autorizacionEstado?: 'PENDIENTE_APROBACION' | 'APROBADO' | 'RECHAZADO' | 'EXPIRADO' | null;
  autorizacionToken?: string | null;
  autorizacionTokenExpira?: string | null;
  autorizacionPresupuesto?: any;
  autorizacionDecididoEn?: string | null;
  autorizacionFirma?: string | null;
  autorizacionRechazoMotivo?: string | null;
  conclusionesEntrega?: string | null;
  descuentoTipo?: 'PORCENTAJE' | 'FIJO' | null;
  descuentoValor?: number | null;
  aplicaIva?: boolean;
  porcentajeIva?: number;
  tipoCambioAplicado?: number | null;
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

interface MaterialRequest {
  id: string;
  materialNombre: string;
  cantidad: number;
  esInsumo: boolean;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'ENTREGADO';
  solicitadoPorNombre: string;
  aprobadoPorNombre?: string | null;
  entregadoPorNombre?: string | null;
  motivoRechazo?: string | null;
  notas?: string | null;
  createdAt: string;
  inventoryItem?: { id: string; nombre: string; stock: number } | null;
}

interface CostAudit {
  id: string;
  montoAnterior: number;
  montoNuevo: number;
  descuentoTipo?: string | null;
  descuentoValor?: number | null;
  aplicaIva: boolean;
  justificacion: string;
  usuarioNombre: string;
  usuarioRol: string;
  createdAt: string;
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
  CHECK_INICIAL: { label: 'Check List', icon: ClipboardList, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', next: 'TRABAJANDO' },
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

const FUEL_LEVELS = [
  { key: 'EMPTY', label: 'E (Vacío)', color: 'text-red-400 border-red-500/40 bg-red-500/10' },
  { key: '1/4', label: '1/4', color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
  { key: '1/2', label: '1/2', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { key: '3/4', label: '3/4', color: 'text-lime-400 border-lime-500/40 bg-lime-500/10' },
  { key: 'FULL', label: 'F (Lleno)', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
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
  const [showStatusPassword, setShowStatusPassword] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const [kmInput, setKmInput] = useState('');
  const [savingKm, setSavingKm] = useState(false);
  const [kmError, setKmError] = useState<string | null>(null);

  const [partNeeds, setPartNeeds] = useState<PartNeed[]>([]);
  const [partSearch, setPartSearch] = useState('');
  const [newPartQty, setNewPartQty] = useState('1');

  const [uploading, setUploading] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [sigTarget, setSigTarget] = useState<'salida' | 'ingreso'>('salida');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const reportIframeRef = useRef<HTMLIFrameElement>(null);

  // Mejoras v4: Tipo de trabajo, mecánicos, historial, tipo de cambio
  const isMechanic = user?.workshopUserRole === 'MECANICO';
  const isWarehouseOrAdmin = !isMechanic || ['ADMIN', 'ENCARGADO_INVENTARIO', 'JEFE_MECANICO'].includes(user?.workshopUserRole || '');
  const [tipoTrabajoSel, setTipoTrabajoSel] = useState<string[]>([]);
  const [tipoTrabajoOtro, setTipoTrabajoOtro] = useState('');
  const [workTags, setWorkTags] = useState<string[]>([]);
  const [serviciosRealizados, setServiciosRealizados] = useState<ServicioRealizado[]>([]);
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

  // v4: Diagnóstico, WhatsApp, Almacén, Tipo de cambio, Costo
  const [diagnosticoInput, setDiagnosticoInput] = useState('');
  const [savingDiagnostico, setSavingDiagnostico] = useState(false);
  const [conclusionesInput, setConclusionesInput] = useState('');
  const [savingConclusiones, setSavingConclusiones] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(11.86);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [sendingReadyWhatsApp, setSendingReadyWhatsApp] = useState(false);

  // v4: Material requests
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [isMaterialReqOpen, setIsMaterialReqOpen] = useState(false);
  const [matReqItemId, setMatReqItemId] = useState('');
  const [matReqCustomName, setMatReqCustomName] = useState('');
  const [matReqQty, setMatReqQty] = useState('1');
  const [matReqEsInsumo, setMatReqEsInsumo] = useState(true);
  const [matReqNotas, setMatReqNotas] = useState('');
  const [savingMatReq, setSavingMatReq] = useState(false);
  const [catalogServices, setCatalogServices] = useState<any[]>([]);
  const [isLoadSuggestedOpen, setIsLoadSuggestedOpen] = useState(false);

  // v4: Cost adjustments
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costJustification, setCostJustification] = useState('');
  const [editDescuentoTipo, setEditDescuentoTipo] = useState<'NINGUNO' | 'PORCENTAJE' | 'FIJO'>('NINGUNO');
  const [editDescuentoValor, setEditDescuentoValor] = useState('0');
  const [editAplicaIva, setEditAplicaIva] = useState(false);
  const [editPrecioServicio, setEditPrecioServicio] = useState('');
  const [costAudits, setCostAudits] = useState<CostAudit[]>([]);
  const [savingCost, setSavingCost] = useState(false);

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

  const fetchMaterialRequests = async (jobId: string) => {
    try {
      const res = await api.get('/workshops/me/materials', { params: { jobId } });
      setMaterialRequests(res.data || []);
    } catch {}
  };

  const fetchCatalogServices = async () => {
    try {
      const res = await api.get('/workshops/me/services');
      setCatalogServices(res.data || []);
    } catch {}
  };

  const openDetail = async (job: WorkshopJob) => {
    setDetailJob(job); setLoadingDetail(true);
    try {
      const res = await api.get(`/workshops/me/jobs/${job.id}`);
      const data = res.data;
      setDetailJob(data);
      setDetailLogs(data.logs || []);
      setPartNeeds(data.partNeeds || []);
      setTipoTrabajoSel(data.tipoTrabajo?.categorias || []);
      setTipoTrabajoOtro(data.tipoTrabajo?.otro || '');
      setServiciosRealizados(data.serviciosRealizados || []);
      setHorasEstimadasInput(data.horasEstimadas ? String(data.horasEstimadas) : '');
      setPrecioServicioInput(data.precioServicio != null ? String(data.precioServicio) : '');
      setDiagnosticoInput(data.diagnosticoMecanico || '');
      setConclusionesInput(data.conclusionesEntrega || '');
      setPartPriceEdits({});
      setKmInput(data.kilometraje != null ? String(data.kilometraje) : '');
      setKmError(null);
      fetchTeamUsers();
      fetchMaterialRequests(job.id);
      fetchCatalogServices();
      fetchInventory();
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

  const handleSaveKm = async () => {
    if (!detailJob) return;
    const parsed = parseInt(kmInput, 10);
    if (isNaN(parsed) || parsed < 0) { setKmError('Ingresa un kilometraje válido (número).'); return; }
    setKmError(null);
    setSavingKm(true);
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { kilometraje: parsed });
      setDetailJob({ ...detailJob, kilometraje: parsed });
      fetchJobs();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setKmError(data?.message || 'No se pudo guardar el kilometraje.');
    } finally { setSavingKm(false); }
  };

  // ── v4: Nivel de Combustible con Auditoría ──
  const handleSelectFuelLevel = async (level: string) => {
    if (!detailJob) return;
    try {
      const res = await api.put(`/workshops/me/jobs/${detailJob.id}`, { nivelCombustible: level });
      setDetailJob(res.data);
      await fetchJobs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo registrar el nivel de combustible.');
    }
  };

  // ── v4: Diagnóstico Mecánico (con dictado por voz) ──
  const saveDiagnostico = async (val?: string) => {
    if (!detailJob) return;
    const text = val !== undefined ? val : diagnosticoInput;
    setSavingDiagnostico(true);
    try {
      const res = await api.put(`/workshops/me/jobs/${detailJob.id}`, { diagnosticoMecanico: text });
      setDetailJob(res.data);
      await fetchJobs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo guardar el diagnóstico.');
    } finally {
      setSavingDiagnostico(false);
    }
  };

  // ── v4: Conclusiones de Observaciones en Salida ──
  const saveConclusiones = async (val?: string) => {
    if (!detailJob) return;
    const text = val !== undefined ? val : conclusionesInput;
    setSavingConclusiones(true);
    try {
      const res = await api.put(`/workshops/me/jobs/${detailJob.id}`, { conclusionesEntrega: text });
      setDetailJob(res.data);
      await fetchJobs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudieron guardar las conclusiones.');
    } finally {
      setSavingConclusiones(false);
    }
  };

  // ── v4: Enviar Autorización por WhatsApp ──
  const handleSendWhatsAppApproval = async () => {
    if (!detailJob) return;
    setSendingWhatsApp(true);
    try {
      const items = [
        ...serviciosRealizados.map((s) => ({ concepto: s.nombre, cantidad: 1, precioUnitario: Number(s.precio) || 0, subtotal: Number(s.precio) || 0 })),
        ...partNeeds.map((p) => ({ concepto: p.nombre, cantidad: p.cantidad, precioUnitario: Number(p.precioUnitario) || 0, subtotal: (Number(p.precioUnitario) || 0) * p.cantidad })),
      ];
      const totalUsd = totalCostos(detailJob, partNeeds, serviciosRealizados);
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/whatsapp-approval`, {
        items,
        totalUsd,
        notas: diagnosticoInput || detailJob.diagnosticoMecanico || detailJob.problema,
      });
      const { whatsappUrl, token } = res.data;
      setDetailJob({
        ...detailJob,
        autorizacionEstado: 'PENDIENTE_APROBACION',
        autorizacionToken: token,
      });
      await fetchJobs();
      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo generar el enlace de WhatsApp.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // ── v4: Notificar Vehículo Listo por WhatsApp ──
  const handleSendWhatsAppReady = async () => {
    if (!detailJob) return;
    setSendingReadyWhatsApp(true);
    try {
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/whatsapp-ready`);
      const { whatsappUrl } = res.data;
      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo enviar la notificación.');
    } finally {
      setSendingReadyWhatsApp(false);
    }
  };

  // ── v4: Ajuste de Costo y Descuento / IVA con Auditoría ──
  const openCostModal = async () => {
    if (!detailJob) return;
    setCostJustification('');
    setEditDescuentoTipo((detailJob.descuentoTipo as any) || 'NINGUNO');
    setEditDescuentoValor(detailJob.descuentoValor != null ? String(detailJob.descuentoValor) : '0');
    setEditAplicaIva(!!detailJob.aplicaIva);
    setEditPrecioServicio(detailJob.precioServicio != null ? String(detailJob.precioServicio) : '');
    setCostModalOpen(true);
    try {
      const res = await api.get(`/workshops/me/jobs/${detailJob.id}/cost-audits`);
      setCostAudits(res.data || []);
    } catch {}
  };

  const handleSaveCostAdjustment = async () => {
    if (!detailJob) return;
    if (!costJustification.trim()) {
      alert('La justificación es obligatoria para registrar la auditoría del cambio de costo.');
      return;
    }
    setSavingCost(true);
    try {
      const payload: any = {
        justificacion: costJustification.trim(),
        descuentoTipo: editDescuentoTipo !== 'NINGUNO' ? editDescuentoTipo : null,
        descuentoValor: editDescuentoTipo !== 'NINGUNO' ? parseFloat(editDescuentoValor) || 0 : 0,
        aplicaIva: editAplicaIva,
        porcentajeIva: 13,
      };
      if (editPrecioServicio.trim()) {
        payload.precioServicio = parseFloat(editPrecioServicio) || 0;
      }
      const res = await api.patch(`/workshops/me/jobs/${detailJob.id}/cost`, payload);
      setDetailJob(res.data);
      setCostModalOpen(false);
      await fetchJobs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo guardar el ajuste de costo.');
    } finally {
      setSavingCost(false);
    }
  };

  // ── v4: Solicitudes de Almacén / Materiales ──
  const handleCreateMaterialRequest = async () => {
    if (!detailJob) return;
    const name = matReqItemId
      ? (inventoryItems.find((i) => i.id === matReqItemId)?.nombre || '')
      : matReqCustomName.trim();
    if (!name) {
      alert('Seleccione un ítem del inventario o ingrese el nombre del material.');
      return;
    }
    setSavingMatReq(true);
    try {
      await api.post(`/workshops/me/jobs/${detailJob.id}/materials`, {
        inventoryItemId: matReqItemId || undefined,
        materialNombre: name,
        cantidad: parseInt(matReqQty) || 1,
        esInsumo: matReqEsInsumo,
        notas: matReqNotas.trim() || undefined,
      });
      setIsMaterialReqOpen(false);
      setMatReqItemId('');
      setMatReqCustomName('');
      setMatReqQty('1');
      setMatReqNotas('');
      await fetchMaterialRequests(detailJob.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo solicitar el material.');
    } finally {
      setSavingMatReq(false);
    }
  };

  const handleApproveMaterialRequest = async (reqId: string, aprobado: boolean) => {
    if (!detailJob) return;
    const motivo = !aprobado ? (prompt('Motivo de rechazo:') || 'Rechazado por jefe mecánico') : undefined;
    try {
      await api.patch(`/workshops/me/materials/${reqId}/approve`, { aprobado, motivoRechazo: motivo });
      await fetchMaterialRequests(detailJob.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar solicitud.');
    }
  };

  const handleDeliverMaterialRequest = async (reqId: string) => {
    if (!detailJob) return;
    try {
      await api.patch(`/workshops/me/materials/${reqId}/deliver`, {});
      await fetchMaterialRequests(detailJob.id);
      await fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al registrar la entrega de almacén.');
    }
  };

  const handleLoadSuggestedMaterials = async (serviceId: string) => {
    if (!detailJob) return;
    try {
      await api.post(`/workshops/me/jobs/${detailJob.id}/services/${serviceId}/load-materials`);
      setIsLoadSuggestedOpen(false);
      await fetchMaterialRequests(detailJob.id);
      const res = await api.get(`/workshops/me/jobs/${detailJob.id}`);
      setDetailJob(res.data);
      setPartNeeds(res.data.partNeeds || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cargar materiales sugeridos.');
    }
  };

  // ── Cambio de estado con validaciones v4 (mecánico asignado y autorización) ──
  const handleStatusChange = async (newStatus: string) => {
    if (!statusModalJob) return;

    if (newStatus === 'TRABAJANDO') {
      const mecanicos = statusModalJob.mecanicosAsignados || [];
      if (mecanicos.length === 0) {
        alert('Debe asignar al menos un mecánico al vehículo antes de avanzar a "Trabajando".');
        return;
      }
      if (statusModalJob.autorizacionEstado === 'RECHAZADO') {
        alert('El cliente ha rechazado el diagnóstico/presupuesto. Debe acordar un nuevo presupuesto antes de trabajar.');
        return;
      }
      if (statusModalJob.autorizacionEstado === 'PENDIENTE_APROBACION') {
        if (!confirm('La autorización del cliente aún está pendiente vía WhatsApp. ¿Desea iniciar los trabajos de todas formas?')) {
          return;
        }
      }
    }

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
        setPartNeeds(data.partNeeds || []);
        setTipoTrabajoSel(data.tipoTrabajo?.categorias || []);
        setTipoTrabajoOtro(data.tipoTrabajo?.otro || '');
        setServiciosRealizados(data.serviciosRealizados || []);
        setHorasEstimadasInput(data.horasEstimadas ? String(data.horasEstimadas) : '');
        setPrecioServicioInput(data.precioServicio != null ? String(data.precioServicio) : '');
        setDiagnosticoInput(data.diagnosticoMecanico || '');
        setConclusionesInput(data.conclusionesEntrega || '');
        setPartPriceEdits({});
        fetchMaterialRequests(statusModalJob.id);
      }
      if (newStatus === 'FINALIZADO') {
        setTimeout(() => { handleDownloadPdf(statusModalJob.id); }, 300);
      }
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo cambiar el estado.'); }
    finally { setChangingStatus(false); }
  };

  const handleAddPartNeed = async (item: any) => {
    if (!detailJob || !item) return;
    try {
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/parts-needed`, {
        nombre: item.nombre,
        cantidad: parseInt(newPartQty) || 1,
        esInsumo: item.categoria === 'INSUMO',
        inventoryItemId: item.id,
      });
      setPartNeeds([...partNeeds, res.data]);
      setNewPartQty('1');
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

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'imagenes' | 'imagenesTerminado' | 'imagenesIngreso' | 'diagnosticoImagenes'
  ) => {
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

  const handleSingleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'fotoTablero'
  ) => {
    if (!detailJob || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.url;
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { [field]: url });
      setDetailJob({ ...detailJob, [field]: url });
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo subir la foto.'); }
    finally { setUploading(false); }
  };

  const handleRemoveImage = async (
    url: string,
    field: 'imagenes' | 'imagenesTerminado' | 'imagenesIngreso' | 'diagnosticoImagenes'
  ) => {
    if (!detailJob) return;
    const updated = ((detailJob[field] as string[]) || []).filter((u) => u !== url);
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { [field]: updated });
      setDetailJob({ ...detailJob, [field]: updated });
    } catch (err: any) { alert(err.response?.data?.message); }
  };

  const handleRemoveSingleImage = async (field: 'fotoTablero') => {
    if (!detailJob) return;
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { [field]: null });
      setDetailJob({ ...detailJob, [field]: null });
    } catch (err: any) { alert(err.response?.data?.message); }
  };

  const handleSaveSignature = async () => {
    if (!detailJob || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const field = sigTarget === 'ingreso' ? 'firmaIngreso' : 'firmaDigital';
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { [field]: dataUrl });
      setDetailJob({ ...detailJob, [field]: dataUrl });
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

  const allWorkTags = useMemo(() => {
    const base = TRABAJOS_TIPOS.filter((t) => t !== 'Otro');
    const extras = workTags.filter((t) => !base.some((b) => b.toLowerCase() === t.toLowerCase()));
    return [...base, ...extras];
  }, [workTags]);

  const saveWorkTag = async () => {
    const nombre = tipoTrabajoOtro.trim();
    if (!nombre) { alert('Escriba el nombre del tipo de trabajo.'); return; }
    try {
      const res = await api.post('/workshops/me/work-tags', { nombre });
      const tags: string[] = res.data?.trabajoTags || [];
      setWorkTags(tags);
      const next = tipoTrabajoSel.includes(nombre) ? tipoTrabajoSel : [...tipoTrabajoSel.filter((t) => t !== 'Otro'), nombre];
      setTipoTrabajoSel(next);
      setTipoTrabajoOtro('');
      await saveTipoTrabajo(next, '');
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo guardar el tag.'); }
  };

  // ── Origen del vehículo ──
  const saveOrigen = async (origen: string) => {
    if (!detailJob || detailJob.origen === origen) return;
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { origen });
      setDetailJob({ ...detailJob, origen });
      await fetchJobs();
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudo guardar el origen.'); }
  };

  // ── Trabajos realizados ──
  const persistServicios = async (list: ServicioRealizado[]) => {
    if (!detailJob) return;
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { serviciosRealizados: list });
      setDetailJob({ ...detailJob, serviciosRealizados: list });
      await fetchJobs();
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudieron guardar los trabajos.'); }
  };

  const addServicioRealizado = () => {
    const next = [...serviciosRealizados, { id: `${Date.now()}`, nombre: '', precio: 0 }];
    setServiciosRealizados(next);
  };

  const updateServicioRealizado = (id: string, patch: Partial<ServicioRealizado>) => {
    setServiciosRealizados(serviciosRealizados.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeServicioRealizado = (id: string) => {
    const next = serviciosRealizados.filter((s) => s.id !== id);
    setServiciosRealizados(next);
    persistServicios(next);
  };

  const saveServicioRealizado = (id: string) => {
    const s = serviciosRealizados.find((x) => x.id === id);
    if (!s) return;
    if (!s.nombre.trim()) { alert('Escriba el nombre del trabajo realizado.'); return; }
    persistServicios(serviciosRealizados.map((x) => (x.id === id ? { ...x, nombre: x.nombre.trim(), precio: Number(x.precio) || 0 } : x)));
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
  const totalServiciosMonto = (detalle: WorkshopJob | null, servs: ServicioRealizado[]) =>
    (servs || []).length
      ? servs.reduce((s, x) => s + (Number(x.precio) || 0), 0)
      : (Number(detalle?.precioServicio) || 0);
  const totalCostos = (detalle: WorkshopJob | null, list: PartNeed[], servs: ServicioRealizado[]) =>
    totalServiciosMonto(detalle, servs) + subtotalRepuestos(list);

  // ── Desglose de totales con descuento, IVA y Tipo de Cambio Oficial ──
  const totalsBreakdown = useMemo(() => {
    const baseServ = totalServiciosMonto(detailJob, serviciosRealizados);
    const baseRep = subtotalRepuestos(partNeeds);
    const subtotal = baseServ + baseRep;

    let descMonto = 0;
    if (detailJob?.descuentoTipo === 'PORCENTAJE') {
      descMonto = (subtotal * (detailJob.descuentoValor || 0)) / 100;
    } else if (detailJob?.descuentoTipo === 'FIJO') {
      descMonto = detailJob.descuentoValor || 0;
    }
    if (descMonto > subtotal) descMonto = subtotal;

    const baseImponible = subtotal - descMonto;
    const ivaMonto = detailJob?.aplicaIva ? (baseImponible * (detailJob.porcentajeIva || 13)) / 100 : 0;
    const totalUsd = baseImponible + ivaMonto;
    const rate = detailJob?.tipoCambioAplicado || exchangeRate || 11.86;
    const totalBob = totalUsd * rate;

    return {
      subtotal,
      descMonto,
      ivaMonto,
      totalUsd,
      totalBob,
      rate,
    };
  }, [detailJob, serviciosRealizados, partNeeds, exchangeRate]);

  // ── Editar horas de mecánico desde la ficha ──
  const handleWorklogHoursBlur = async (w: Worklog, value: string) => {
    if (!detailJob) return;
    const horas = parseFloat(value);
    if (isNaN(horas) || horas < 0) return;
    try {
      const res = await api.patch(`/workshops/me/jobs/${detailJob.id}/worklogs/${w.key}`, { horasReales: horas });
      setDetailJob({ ...detailJob, mecanicosAsignados: res.data || [] });
      await fetchJobs();
    } catch (err: any) { alert(err.response?.data?.message || 'No se pudieron guardar las horas.'); }
  };

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

  const renderServiciosEditor = (editable: boolean) => (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-brand-400" /> Trabajos realizados</h5>
        {editable && (
          <button onClick={addServicioRealizado} className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar trabajo</button>
        )}
      </div>
      {serviciosRealizados.length === 0 ? (
        <p className="text-[11px] text-zinc-500">Agrega cada trabajo realizado con su precio; saldrán detallados en el informe económico y PDF.</p>
      ) : (
        <div className="space-y-2">
          {serviciosRealizados.map((s) => (
            <div key={s.id} className="flex items-center gap-2 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
              <input
                type="text"
                value={s.nombre}
                onChange={(e) => updateServicioRealizado(s.id, { nombre: e.target.value })}
                onBlur={() => saveServicioRealizado(s.id)}
                disabled={!editable}
                placeholder="Nombre del trabajo (ej: Cambio de frenos)"
                className="flex-1 min-w-0 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:border-brand-500 disabled:opacity-70"
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-zinc-500 font-mono">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={s.precio || ''}
                  onChange={(e) => updateServicioRealizado(s.id, { precio: parseFloat(e.target.value) || 0 })}
                  onBlur={() => saveServicioRealizado(s.id)}
                  disabled={!editable}
                  placeholder="0.00"
                  className="w-24 px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-right focus:border-brand-500 disabled:opacity-70"
                />
              </div>
              {editable && (
                <button onClick={() => removeServicioRealizado(s.id)} className="p-1 text-zinc-500 hover:text-red-400 transition-colors shrink-0" title="Quitar"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      )}
      {serviciosRealizados.length === 0 && (
        <div className="mt-2 flex gap-2 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase">Precio único del servicio ($)</label>
            <input type="number" min="0" step="0.01" value={precioServicioInput} onChange={(e) => setPrecioServicioInput(e.target.value)} onBlur={savePrecioServicio} placeholder="0.00" className="w-36 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono focus:border-brand-500" disabled={!editable} />
          </div>
        </div>
      )}
    </div>
  );

  const renderPartesTabla = (editable: boolean) => (
    partNeeds.length > 0 ? (
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            <th className="py-2 pr-3 font-bold">Pieza / Insumo</th><th className="py-2 pr-3 font-bold">Cant.</th><th className="py-2 pr-3 font-bold text-right">Precio U. ($)</th><th className="py-2 font-bold text-right">Subtotal ($)</th>
          </tr></thead>
          <tbody>
            {partNeeds.map((pn) => (
              <tr key={pn.id} className="border-b border-zinc-800/60">
                <td className="py-2 pr-3 text-zinc-200">{pn.nombre} {pn.esInsumo && <span className="text-[10px] text-purple-400 font-mono">(Insumo)</span>}</td>
                <td className="py-2 pr-3 text-zinc-300">{pn.cantidad}</td>
                <td className="py-2 pr-3 text-right">
                  {editable ? (
                    <input
                      type="number" min="0" step="0.01"
                      value={partPriceEdits[pn.id] !== undefined ? partPriceEdits[pn.id] : (pn.precioUnitario != null ? String(pn.precioUnitario) : '')}
                      onChange={(e) => setPartPriceEdits((p) => ({ ...p, [pn.id]: e.target.value }))}
                      onBlur={() => handlePartPriceBlur(pn)}
                      placeholder="—"
                      className="w-24 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-right focus:border-brand-500"
                    />
                  ) : (
                    <span className="font-mono text-zinc-300">{pn.precioUnitario != null ? `$${Number(pn.precioUnitario).toFixed(2)}` : '—'}</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-zinc-400">{((Number(pn.precioUnitario) || 0) * pn.cantidad).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : <p className="text-[11px] text-zinc-500 mb-3">Sin piezas/insumos registrados.</p>
  );

  const renderTotalesCompleto = () => (
    <div className="space-y-2 pt-3 border-t border-zinc-800">
      <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
        <span className="text-zinc-400">Subtotal (Servicios + Repuestos):</span>
        <span className="font-mono text-zinc-200 font-semibold">${totalsBreakdown.subtotal.toFixed(2)}</span>
      </div>

      {totalsBreakdown.descMonto > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-amber-400">
          <span>Descuento ({detailJob?.descuentoTipo === 'PORCENTAJE' ? `${detailJob.descuentoValor}%` : 'Monto fijo'}):</span>
          <span className="font-mono font-semibold">-${totalsBreakdown.descMonto.toFixed(2)}</span>
        </div>
      )}

      {detailJob?.aplicaIva && (
        <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-blue-400">
          <span>IVA (13%):</span>
          <span className="font-mono font-semibold">+${totalsBreakdown.ivaMonto.toFixed(2)}</span>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-zinc-800">
        <div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase">Total a Pagar (USD)</p>
          <p className="text-xl font-extrabold text-brand-400">${totalsBreakdown.totalUsd.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 font-bold uppercase">Equivalente en Bolivianos (T.C. {totalsBreakdown.rate.toFixed(2)} Bs/USD)</p>
          <p className="text-xl font-extrabold text-emerald-400">Bs. {totalsBreakdown.totalBob.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );

  const renderHorasEditables = () => (
    <div className="mb-4">
      <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-2"><Timer className="w-3.5 h-3.5 text-orange-400" /> Horas de mecánico</h5>
      {(detailJob?.mecanicosAsignados || []).length === 0 ? (
        <p className="text-[11px] text-zinc-500">Sin mecánicos asignados.</p>
      ) : (
        <div className="space-y-2">
          {(detailJob?.mecanicosAsignados || []).map((w) => (
            <div key={w.key} className="flex items-center gap-3 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-orange-400" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-200 font-semibold truncate">{w.nombre}</p>
                <p className="text-[10px] text-zinc-500">
                  {w.inicio ? `Inicio: ${new Date(w.inicio).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Sin iniciar'}
                  {w.fin ? ` · Fin: ${new Date(w.fin).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number" min="0" step="0.25"
                  defaultValue={w.horasReales != null ? String(w.horasReales) : ''}
                  onBlur={(e) => handleWorklogHoursBlur(w, e.target.value)}
                  placeholder="0.00"
                  className="w-20 px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-right focus:border-orange-500"
                />
                <span className="text-[10px] text-zinc-500 font-bold">h</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-zinc-600 mt-1.5">Puedes corregir las horas manualmente; se guarda al salir del campo.</p>
    </div>
  );

  if (loading || loadingWorkshop) {
    return (<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>);
  }
  if (workshopError || !workshop) {
    return (<div className="p-8 bg-red-950/20 border border-red-800/40 rounded-2xl text-center"><AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="font-bold text-zinc-200">No se pudo cargar el perfil del taller</h3><p className="text-sm text-zinc-400 mt-1">{workshopError}</p></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Car className="w-6 h-6 text-brand-400" />
            <span>Llegada de vehículos</span>
          </h2>
          <p className="text-sm text-zinc-400">{isMechanic ? 'Vista de mecánico: vehículos en check inicial o trabajando.' : 'Registro, inspección inicial, control de combustible y seguimiento de vehículos en taller.'}</p>
        </div>
        {!isMechanic && (
          <div className="flex items-center gap-2">
            <button onClick={openCreate} className="px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /><span>Registrar Vehículo</span>
            </button>
          </div>
        )}
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
              <History className="w-5 h-5 text-brand-400" />
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
              <button onClick={loadHistorial} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Filtrar</button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
            <button onClick={() => setHistTab('hours')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${histTab === 'hours' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}><Timer className="w-3.5 h-3.5" /> Horas de mecánicos</button>
            <button onClick={() => setHistTab('movements')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${histTab === 'movements' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}><Package className="w-3.5 h-3.5" /> Movimientos de inventario</button>
          </div>
          {histLoading ? (
            <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
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
                  {job.autorizacionEstado === 'APROBADO' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Check className="w-2.5 h-2.5" />Aprobado
                    </span>
                  ) : job.autorizacionEstado === 'PENDIENTE_APROBACION' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Clock className="w-2.5 h-2.5 animate-pulse" />Pendiente WhatsApp
                    </span>
                  ) : job.autorizacionEstado === 'RECHAZADO' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400">
                      <X className="w-2.5 h-2.5" />Rechazado
                    </span>
                  ) : job.origen === 'COTIZACION' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400"><FileText className="w-2.5 h-2.5" />Cotización</span>
                  ) : job.requestId ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 text-blue-400"><FileText className="w-2.5 h-2.5" />Solicitud</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 border border-zinc-500/20 text-zinc-500"><User className="w-2.5 h-2.5" />Directo</span>
                  )}
                </div>
                <button onClick={() => openDetail(job)} className="text-left w-full">
                  <h3 className="text-sm font-bold text-zinc-100 group-hover:text-brand-300 transition-colors truncate">{job.marca} {job.modelo} <span className="text-zinc-500 font-normal">{job.anio}</span></h3>
                </button>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {job.placa && <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] font-mono text-zinc-400">{job.placa}</span>}
                  {job.kilometraje && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-400"><Fuel className="w-2.5 h-2.5" />{job.kilometraje.toLocaleString()}</span>}
                  {job.nivelCombustible && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] text-amber-300 font-mono">
                      ⛽ {job.nivelCombustible}
                    </span>
                  )}
                  {job.fechaCita && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-300 font-bold" title="Cita de ingreso">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(job.fechaCita).toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5 line-clamp-1">{job.clienteNombre}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5 line-clamp-1">{job.diagnosticoMecanico || job.problema}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                  <span className="text-[9px] text-zinc-600">{new Date(job.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}</span>
                  <div className="flex items-center gap-1">
                    {!isMechanic && (<>
                    {nextStatus && nextMeta && (
                      <button onClick={() => openStatusModal(job)} className="px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded transition-colors flex items-center gap-0.5" title={`Avanzar a: ${nextMeta.label}`}>
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

      {/* MODAL REGISTRAR / EDITAR VEHICULO */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6 max-h-[90vh] overflow-y-auto">
            <button onClick={closeForm} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-zinc-200 mb-1 flex items-center gap-2"><Car className="w-5 h-5 text-brand-400" />{editingJob ? 'Editar Vehículo' : 'Registrar Vehículo'}</h3>
            <p className="text-xs text-zinc-500 mb-6">Complete los datos del vehículo que ingresa al taller.</p>
            {formError && (<div className="mb-4 p-3 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-2 text-red-200 text-xs"><AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" /><span>{formError}</span></div>)}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Marca <span className="text-red-400">*</span></label><input type="text" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Ej: Toyota" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm" /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Modelo <span className="text-red-400">*</span></label><input type="text" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Ej: Hilux" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Año <span className="text-red-400">*</span></label><input type="number" min="1900" max={new Date().getFullYear() + 1} value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} placeholder="2020" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm font-mono" /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Placa</label><input type="text" value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} placeholder="ABC-123" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm font-mono uppercase" /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Kilometraje</label><input type="number" min="0" value={form.kilometraje} onChange={(e) => setForm({ ...form, kilometraje: e.target.value })} placeholder="125000" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm font-mono" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Cliente <span className="text-red-400">*</span></label><input type="text" value={form.clienteNombre} onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })} placeholder="Nombre del cliente" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Teléfono del cliente</label><input type="tel" value={form.clienteTelefono} onChange={(e) => setForm({ ...form, clienteTelefono: e.target.value })} placeholder="+591 70000000" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-zinc-300">Problema reportado <span className="text-red-400">*</span></label><textarea value={form.problema} onChange={(e) => setForm({ ...form, problema: e.target.value })} rows={3} placeholder="Describa el problema reportado..." className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm resize-none" /></div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button type="button" onClick={closeForm} className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Guardando...</span></> : <><Save className="w-4 h-4" /><span>{editingJob ? 'Guardar cambios' : 'Registrar vehículo'}</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE VEHICULO */}
      {detailJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6 max-h-[92vh] overflow-y-auto">
            <button onClick={() => setDetailJob(null)} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors z-10"><X className="w-5 h-5" /></button>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <>
                {/* Cabecera del vehículo */}
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                    {(() => { const meta = STATUS_META[detailJob.estado] || STATUS_META.INGRESANDO; const Icon = meta.icon; return (<span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}><Icon className="w-4 h-4" />{meta.label}</span>); })()}
                    {detailJob.autorizacionEstado === 'APROBADO' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" /> Diagnóstico Aprobado por Cliente
                      </span>
                    )}
                    {detailJob.autorizacionEstado === 'PENDIENTE_APROBACION' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider bg-amber-500/10 border-amber-500/30 text-amber-400">
                        <Clock className="w-4 h-4 animate-pulse" /> Esperando Aprobación WhatsApp
                      </span>
                    )}
                    {detailJob.autorizacionEstado === 'RECHAZADO' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider bg-red-500/10 border-red-500/30 text-red-400">
                        <X className="w-4 h-4" /> Diagnóstico Rechazado
                      </span>
                    )}
                    {!isMechanic && <button onClick={() => handleDownloadPdf(detailJob.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors"><Download className="w-3.5 h-3.5" /> PDF Completo</button>}
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-100">{detailJob.marca} {detailJob.modelo} {detailJob.anio}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-zinc-400">
                    {detailJob.placa && <span className="font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">Placa: {detailJob.placa}</span>}
                    {detailJob.kilometraje && <span className="flex items-center gap-1 font-mono"><Fuel className="w-3.5 h-3.5 text-zinc-500" />{detailJob.kilometraje.toLocaleString()} km</span>}
                    {detailJob.nivelCombustible && <span className="flex items-center gap-1 text-amber-400 font-mono">⛽ Nivel: {detailJob.nivelCombustible}</span>}
                  </div>
                </div>

                {/* Info Cliente */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1.5"><User className="w-4 h-4 text-zinc-500" /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cliente</span></div>
                    <p className="text-sm font-semibold text-zinc-200">{detailJob.clienteNombre}</p>
                    {detailJob.clienteTelefono && <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1"><Phone className="w-3 h-3 text-brand-400" /> {detailJob.clienteTelefono}</p>}
                  </div>
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Problema Reportado</span></div>
                    <p className="text-xs text-zinc-300 line-clamp-3">{detailJob.problema}</p>
                  </div>
                </div>

                {/* ── BANNER DE AUTORIZACION DEL CLIENTE (WHATSAPP) ── */}
                {detailJob.autorizacionEstado && (
                  <div className={`p-4 rounded-2xl border mb-6 ${
                    detailJob.autorizacionEstado === 'APROBADO' ? 'bg-emerald-950/20 border-emerald-500/30' :
                    detailJob.autorizacionEstado === 'RECHAZADO' ? 'bg-red-950/20 border-red-500/30' :
                    'bg-amber-950/20 border-amber-500/30'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {detailJob.autorizacionEstado === 'APROBADO' ? (
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                          ) : detailJob.autorizacionEstado === 'RECHAZADO' ? (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                          )}
                          <h4 className="text-sm font-bold text-zinc-100">
                            {detailJob.autorizacionEstado === 'APROBADO' && 'Presupuesto y diagnóstico APROBADOS por el cliente'}
                            {detailJob.autorizacionEstado === 'RECHAZADO' && 'Presupuesto y diagnóstico RECHAZADOS por el cliente'}
                            {detailJob.autorizacionEstado === 'PENDIENTE_APROBACION' && 'Presupuesto enviado · Esperando aprobación por enlace'}
                          </h4>
                        </div>
                        {detailJob.autorizacionDecididoEn && (
                          <p className="text-[11px] text-zinc-400 mt-1">
                            Decidido el: {new Date(detailJob.autorizacionDecididoEn).toLocaleString('es-VE')}
                          </p>
                        )}
                        {detailJob.autorizacionRechazoMotivo && (
                          <p className="text-xs text-red-300 mt-1">
                            Motivo de rechazo: <span className="font-semibold">{detailJob.autorizacionRechazoMotivo}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {detailJob.autorizacionToken && (
                          <a
                            href={`/aprobacion/${detailJob.autorizacionToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Ver portal cliente
                          </a>
                        )}
                        <button
                          onClick={handleSendWhatsAppApproval}
                          disabled={sendingWhatsApp}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" /> {sendingWhatsApp ? 'Enviando...' : 'Reenviar WhatsApp'}
                        </button>
                      </div>
                    </div>
                    {detailJob.autorizacionFirma && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-3">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Firma del cliente:</span>
                        <img src={detailJob.autorizacionFirma} alt="Firma cliente" className="h-10 bg-white rounded px-2 py-0.5 border border-zinc-700" />
                      </div>
                    )}
                  </div>
                )}

                {/* ── SECCION 5.1 & 5.2: RECEPCION / INGRESO ── */}
                <div className="p-4 bg-zinc-950 border border-blue-500/20 rounded-2xl mb-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-400" /> Recepción y Diagnóstico del Vehículo
                    </h4>
                    <button
                      onClick={handleSendWhatsAppApproval}
                      disabled={sendingWhatsApp || !detailJob.clienteTelefono}
                      title={!detailJob.clienteTelefono ? 'Agrega el teléfono del cliente para enviar WhatsApp' : undefined}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {sendingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Enviar Aprobación WhatsApp</span>
                    </button>
                  </div>

                  {/* 5.1 Marcador visual de combustible */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Fuel className="w-4 h-4 text-amber-400" /> Nivel de Combustible al Recibir
                      </label>
                      {detailJob.combustibleRegistradoPor && (
                        <span className="text-[10px] text-zinc-500">
                          Registrado por <span className="text-zinc-300 font-semibold">{detailJob.combustibleRegistradoPor}</span>
                          {detailJob.combustibleRegistradoEn && ` el ${new Date(detailJob.combustibleRegistradoEn).toLocaleDateString('es-VE')}`}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {FUEL_LEVELS.map((fl) => {
                        const isSelected = detailJob.nivelCombustible === fl.key;
                        return (
                          <button
                            key={fl.key}
                            type="button"
                            onClick={() => handleSelectFuelLevel(fl.key)}
                            disabled={isMechanic}
                            className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all ${
                              isSelected
                                ? `${fl.color} ring-2 ring-amber-400/50 shadow-lg`
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            } disabled:opacity-70`}
                          >
                            {fl.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Foto del Tablero (Evidencia de combustible / odómetro) */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-blue-400" /> Foto del Tablero (Combustible y Odómetro)
                      </label>
                      {detailJob.fotoTablero && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleImage('fotoTablero')}
                          className="text-[10px] text-red-400 hover:text-red-300"
                        >
                          Eliminar foto
                        </button>
                      )}
                    </div>
                    {detailJob.fotoTablero ? (
                      <div className="flex items-center gap-4">
                        <img src={detailJob.fotoTablero} alt="Tablero del vehículo" className="w-32 h-24 object-cover rounded-xl border border-zinc-700" />
                        <div className="text-xs text-zinc-400 space-y-1">
                          <p className="text-emerald-400 font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Foto del tablero guardada</p>
                          <p className="text-[11px] text-zinc-500">Esta foto respalda el kilometraje y nivel de combustible registrado.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <label className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2 border border-zinc-700">
                          <Camera className="w-4 h-4 text-blue-400" />
                          <span>Subir foto del tablero</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleSingleImageUpload(e, 'fotoTablero')}
                            disabled={uploading}
                          />
                        </label>
                        <span className="text-[11px] text-zinc-500">Fotografía clara del velocímetro y aguja de combustible.</span>
                      </div>
                    )}
                  </div>

                  {/* 5.2 Diagnóstico Mecánico con Dictado por Voz */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-brand-400" /> Diagnóstico Mecánico
                      </label>
                      <div className="flex items-center gap-2">
                        <VoiceDictationButton
                          onTranscript={(text) => {
                            const next = (diagnosticoInput ? diagnosticoInput + ' ' : '') + text;
                            setDiagnosticoInput(next);
                            saveDiagnostico(next);
                          }}
                          disabled={isMechanic}
                          title="Dictar diagnóstico mecánico por voz"
                        />
                        <button
                          type="button"
                          onClick={() => saveDiagnostico()}
                          disabled={savingDiagnostico}
                          className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Guardar
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={diagnosticoInput}
                      onChange={(e) => setDiagnosticoInput(e.target.value)}
                      onBlur={() => saveDiagnostico()}
                      rows={3}
                      placeholder="Describa el diagnóstico técnico, fallas identificadas y componentes que requieren reemplazo..."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-brand-500 resize-none"
                    />
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Fotos del diagnóstico y fallas (máx. 5)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(e, 'diagnosticoImagenes')}
                        className="w-full text-xs text-zinc-400"
                        disabled={uploading}
                      />
                      {detailJob.diagnosticoImagenes && detailJob.diagnosticoImagenes.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {detailJob.diagnosticoImagenes.map((url, i) => (
                            <div key={i} className="relative group">
                              <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-zinc-800" />
                              <button onClick={() => handleRemoveImage(url, 'diagnosticoImagenes')} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kilometraje de ingreso */}
                  <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-zinc-800/60">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Kilometraje al ingresar</label>
                      <input
                        type="number"
                        min="0"
                        value={kmInput}
                        onChange={(e) => setKmInput(e.target.value)}
                        placeholder="125000"
                        className="w-36 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs font-mono"
                      />
                    </div>
                    <button
                      onClick={handleSaveKm}
                      disabled={savingKm || !kmInput.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                    >
                      {savingKm ? 'Guardando...' : 'Guardar Km'}
                    </button>
                    {kmError && <span className="text-xs text-red-400">{kmError}</span>}
                  </div>
                </div>

                {/* ── CHECK LIST / TIPO DE TRABAJO ── */}
                {detailJob.estado === 'CHECK_INICIAL' && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl mb-6">
                    <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-1"><ClipboardList className="w-4 h-4 text-amber-400" /> ¿Qué servicios se realizarán?</h4>
                    <p className="text-[11px] text-zinc-500 mb-4">Selecciona uno o varios tipos de trabajo.</p>
                    <div className="flex flex-wrap gap-2">
                      {allWorkTags.map((t) => {
                        const on = tipoTrabajoSel.includes(t);
                        const isCustom = workTags.some((w) => w.toLowerCase() === t.toLowerCase());
                        return (
                          <button key={t} onClick={() => toggleTipoTrabajo(t)} disabled={isMechanic}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-500'} ${isMechanic ? 'cursor-default opacity-80' : ''}`}>
                            {isCustom && <Tag className="w-3 h-3" />}{t}
                          </button>
                        );
                      })}
                      <button onClick={() => { if (!tipoTrabajoSel.includes('Otro')) toggleTipoTrabajo('Otro'); }} disabled={isMechanic}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${tipoTrabajoSel.includes('Otro') ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-500'} ${isMechanic ? 'cursor-default opacity-80' : ''}`}>Otro</button>
                    </div>
                    {(tipoTrabajoSel.includes('Otro') || tipoTrabajoOtro) && (
                      <div className="mt-3 flex gap-2 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px] space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Especificar tipo de trabajo</label>
                          <input value={tipoTrabajoOtro} onChange={(e) => setTipoTrabajoOtro(e.target.value)} onBlur={() => saveTipoTrabajo(tipoTrabajoSel, tipoTrabajoOtro)} disabled={isMechanic}
                            placeholder="Ej: Pintura automotriz..." className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:border-amber-500 disabled:opacity-60" />
                        </div>
                        {!isMechanic && (
                          <button onClick={saveWorkTag} disabled={!tipoTrabajoOtro.trim()}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-40 shrink-0">
                            <Save className="w-3.5 h-3.5" /> Guardar tag
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TRABAJANDO / ASIGNACION DE MECANICOS / ALMACEN ── */}
                {detailJob.estado === 'TRABAJANDO' && (
                  <div className="p-4 bg-zinc-950 border border-purple-500/20 rounded-2xl mb-6 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-purple-400" /> Mecánicos Asignados y Registro de Horas
                        </h4>
                        {!isMechanic && (detailJob.mecanicosAsignados || []).length === 0 && (
                          <span className="text-xs text-red-400 font-bold animate-pulse">
                            ⚠️ Debe asignar un mecánico responsable
                          </span>
                        )}
                      </div>

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
                                  {active && <span className="flex items-center gap-1 text-[9px] font-bold text-brand-400"><span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />EN CURSO</span>}
                                  {w.horasReales != null && <span className="text-[10px] text-zinc-500 font-mono">{w.horasReales} h</span>}
                                </div>
                                <p className="text-[10px] text-zinc-500">
                                  {w.inicio ? `Inicio: ${new Date(w.inicio).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Sin iniciar'}
                                  {w.fin ? ` · Fin: ${new Date(w.fin).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                                </p>
                              </div>
                              {canOperate && !w.inicio && (
                                <button onClick={() => handleStartWork(w)} className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"><Play className="w-3 h-3" /> Empezar</button>
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
                    </div>

                    {/* ── 9. SOLICITUDES DE MATERIALES / ALMACEN ── */}
                    <div className="pt-4 border-t border-zinc-800">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-400" /> Solicitudes a Almacén / Insumos
                          </h4>
                          <p className="text-[11px] text-zinc-500">Control de entregas y salidas directas desde el inventario del taller.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsLoadSuggestedOpen(true)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Cargar sugeridos de servicio
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsMaterialReqOpen(true)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Pedir a Almacén
                          </button>
                        </div>
                      </div>

                      {materialRequests.length === 0 ? (
                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-xs text-zinc-500">
                          No hay solicitudes de material pendientes para este vehículo.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {materialRequests.map((mr) => (
                            <div key={mr.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-200 text-sm">{mr.materialNombre}</span>
                                  <span className="text-xs text-zinc-400 font-mono">Cant: {mr.cantidad}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    mr.estado === 'ENTREGADO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                                    mr.estado === 'APROBADO' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                                    mr.estado === 'RECHAZADO' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                                    'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  }`}>
                                    {mr.estado}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-1">
                                  Solicitado por {mr.solicitadoPorNombre}
                                  {mr.aprobadoPorNombre && ` · Aprobado por ${mr.aprobadoPorNombre}`}
                                  {mr.entregadoPorNombre && ` · Entregado por ${mr.entregadoPorNombre}`}
                                  {mr.motivoRechazo && ` · Motivo rechazo: ${mr.motivoRechazo}`}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {mr.estado === 'PENDIENTE' && isWarehouseOrAdmin && (
                                  <>
                                    <button
                                      onClick={() => handleApproveMaterialRequest(mr.id, true)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                                    >
                                      Aprobar
                                    </button>
                                    <button
                                      onClick={() => handleApproveMaterialRequest(mr.id, false)}
                                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
                                    >
                                      Rechazar
                                    </button>
                                  </>
                                )}
                                {mr.estado === 'APROBADO' && isWarehouseOrAdmin && (
                                  <button
                                    onClick={() => handleDeliverMaterialRequest(mr.id)}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg"
                                  >
                                    Entregar de almacén
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TERMINADO O SALIDA (INFORME ECONOMICO & CIERRE) ── */}
                {['TERMINADO', 'SALIDA', 'FINALIZADO'].includes(detailJob.estado) && (
                  <div className="p-4 bg-zinc-950 border border-orange-500/20 rounded-2xl mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-400" /> Informe Económico
                      </h4>
                      {!isMechanic && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={openCostModal}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-zinc-700"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-brand-400" /> Ajustar Costo / Descuentos / IVA
                          </button>
                          {detailJob.clienteTelefono && (
                            <button
                              type="button"
                              onClick={handleSendWhatsAppReady}
                              disabled={sendingReadyWhatsApp}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {sendingReadyWhatsApp ? 'Enviando...' : 'WhatsApp: Vehículo Listo'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {renderServiciosEditor(!isMechanic && detailJob.estado !== 'FINALIZADO')}
                    {renderPartesTabla(!isMechanic && detailJob.estado !== 'FINALIZADO')}
                    {renderHorasEditables()}
                    {renderTotalesCompleto()}

                    {/* 12. Conclusiones de Observaciones en Salida con Dictado por Voz */}
                    <div className="pt-3 border-t border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                          <ClipboardList className="w-4 h-4 text-orange-400" /> Conclusiones de Observaciones
                        </label>
                        <div className="flex items-center gap-2">
                          <VoiceDictationButton
                            onTranscript={(text) => {
                              const next = (conclusionesInput ? conclusionesInput + ' ' : '') + text;
                              setConclusionesInput(next);
                              saveConclusiones(next);
                            }}
                            disabled={isMechanic || detailJob.estado === 'FINALIZADO'}
                            title="Dictar conclusiones de entrega por voz"
                          />
                          <button
                            type="button"
                            onClick={() => saveConclusiones()}
                            disabled={savingConclusiones || detailJob.estado === 'FINALIZADO'}
                            className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" /> Guardar
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={conclusionesInput}
                        onChange={(e) => setConclusionesInput(e.target.value)}
                        onBlur={() => saveConclusiones()}
                        disabled={isMechanic || detailJob.estado === 'FINALIZADO'}
                        rows={2}
                        placeholder="Recomendaciones para el cliente, mantenimiento preventivo sugerido para el próximo servicio..."
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-brand-500 resize-none disabled:opacity-60"
                      />
                    </div>

                    {/* Fotos de Salida */}
                    <div className="pt-3 border-t border-zinc-800 space-y-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1">
                        <Camera className="w-3 h-3" /> Fotos del vehículo terminado (máx. 5)
                      </label>
                      {detailJob.estado !== 'FINALIZADO' && (
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleImageUpload(e, 'imagenesTerminado')}
                          className="w-full text-xs text-zinc-400"
                          disabled={uploading}
                        />
                      )}
                      {detailJob.imagenesTerminado && detailJob.imagenesTerminado.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {detailJob.imagenesTerminado.map((url, i) => (
                            <div key={i} className="relative group">
                              <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-zinc-800" />
                              {detailJob.estado !== 'FINALIZADO' && (
                                <button onClick={() => handleRemoveImage(url, 'imagenesTerminado')} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Firma de entrega */}
                    <div className="pt-3 border-t border-zinc-800">
                      <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-2">
                        <PenTool className="w-3.5 h-3.5 text-orange-400" /> Firma de Retiro del Cliente
                      </h5>
                      {detailJob.firmaDigital ? (
                        <div className="flex items-center gap-3">
                          <img src={detailJob.firmaDigital} alt="Firma cliente salida" className="h-16 bg-white rounded-lg p-1 border border-zinc-700" />
                          {detailJob.estado !== 'FINALIZADO' && (
                            <button onClick={() => { setSigTarget('salida'); setSignatureOpen(true); }} className="text-xs text-zinc-400 underline hover:text-zinc-200">
                              Cambiar firma
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setSigTarget('salida'); setSignatureOpen(true); }}
                          disabled={detailJob.estado === 'FINALIZADO'}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-zinc-700"
                        >
                          <PenTool className="w-3.5 h-3.5 text-orange-400" /> Capturar firma en pantalla táctil
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Historial de Auditoría de Estados */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl mb-6">
                  <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><History className="w-4 h-4 text-zinc-500" /> Historial de estados</h4>
                  {detailLogs.length === 0 ? <p className="text-xs text-zinc-500">No hay registros de transiciones.</p> : (
                    <div className="space-y-3">
                      {detailLogs.map((log) => { const logMeta = STATUS_META[log.estado] || STATUS_META.INGRESANDO; const LogIcon = logMeta.icon; return (
                        <div key={log.id} className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${logMeta.bg} border`}><LogIcon className={`w-4 h-4 ${logMeta.color}`} /></div>
                          <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className={`text-xs font-bold ${logMeta.color}`}>{logMeta.label}</span><span className="text-[10px] text-zinc-600">{new Date(log.createdAt).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>{log.firmaUsuarioNombre && <div className="flex items-center gap-1.5 mt-1"><User className="w-3 h-3 text-zinc-600" /><span className="text-[10px] text-zinc-500">Firmado por <span className="font-semibold text-zinc-400">{log.firmaUsuarioNombre}</span>{log.firmaUsuarioRol && <span className="px-1.5 py-0.5 bg-zinc-800 rounded-full text-zinc-500">{log.firmaUsuarioRol}</span>}</span></div>}{log.observaciones && <p className="text-xs text-zinc-500 mt-0.5">{log.observaciones}</p>}</div>
                        </div>); })}
                    </div>
                  )}
                </div>

                {/* Botones de acción al pie */}
                {!isMechanic && (
                  <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end gap-3 flex-wrap">
                    {detailJob.estado === 'FINALIZADO' && (
                      <button onClick={() => { setDetailJob(null); openStatusModal(detailJob); }} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Reabrir vehículo
                      </button>
                    )}
                    {STATUS_META[detailJob.estado]?.next && (() => {
                      const faltaKm = detailJob.estado === 'INGRESANDO' && !detailJob.kilometraje;
                      return (
                        <button
                          onClick={() => { setDetailJob(null); openStatusModal(detailJob); }}
                          disabled={faltaKm}
                          title={faltaKm ? 'Primero registra el kilometraje de ingreso' : undefined}
                          className={`px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2 ${faltaKm ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span>Avanzar a {STATUS_META[STATUS_META[detailJob.estado].next!].label}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      );
                    })()}
                    <button onClick={() => { setDetailJob(null); openEdit(detailJob); }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"><Edit2 className="w-4 h-4" /> Editar datos</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL CAMBIO DE ESTADO CON VALIDACIONES V4 */}
      {statusModalJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6">
            <button onClick={() => setStatusModalJob(null)} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-zinc-200 mb-1 flex items-center gap-2">
              {statusModalJob.estado === 'FINALIZADO' ? <><RefreshCw className="w-5 h-5 text-amber-400" />Reabrir Vehículo</> : <><ArrowRight className="w-5 h-5 text-brand-400" />Cambiar Estado</>}
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

            {/* Alertas v4 de validación de transición a Trabajando */}
            {statusModalJob.estado === 'CHECK_INICIAL' && (
              <div className="space-y-2 mb-4">
                {(statusModalJob.mecanicosAsignados || []).length === 0 && (
                  <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Debe asignar al menos un mecánico antes de poder pasar a &quot;Trabajando&quot;.</span>
                  </div>
                )}
                {statusModalJob.autorizacionEstado === 'PENDIENTE_APROBACION' && (
                  <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Aviso: El presupuesto aún está pendiente de aprobación por el cliente.</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5 mb-4"><label className="text-xs font-semibold text-zinc-300">Observaciones (opcional)</label><textarea value={statusObs} onChange={(e) => setStatusObs(e.target.value)} rows={2} placeholder="Detalles del cambio de estado..." className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm resize-none" /></div>
            <div className="space-y-1.5 mb-6">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-zinc-500" /> Contraseña de firma <span className="text-red-400">*</span></label>
              <div className="relative">
                <input type={showStatusPassword ? 'text' : 'password'} value={statusPassword} onChange={(e) => setStatusPassword(e.target.value)} placeholder="Ingrese su contraseña para firmar" className="w-full px-4 py-2.5 pr-11 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-500 text-zinc-100 text-sm" />
                <button type="button" onClick={() => setShowStatusPassword((v) => !v)} aria-label={showStatusPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showStatusPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStatusModalJob(null)} className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors">Cancelar</button>
              <button
                onClick={() => {
                  const target = statusModalJob.estado === 'FINALIZADO' ? 'INGRESANDO' : STATUS_META[statusModalJob.estado]?.next!;
                  handleStatusChange(target);
                }}
                disabled={changingStatus || !statusPassword || (statusModalJob.estado === 'INGRESANDO' && !statusModalJob.kilometraje)}
                className={`px-5 py-2.5 font-bold rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50 ${
                  statusModalJob.estado === 'FINALIZADO'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950'
                    : 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white'
                }`}>
                {changingStatus ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Cambiando...</span></> : <><CheckCircle2 className="w-4 h-4" /><span>{statusModalJob.estado === 'FINALIZADO' ? 'Reabrir' : 'Confirmar cambio'}</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEDIR MATERIAL A ALMACEN */}
      {isMaterialReqOpen && detailJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" /> Solicitar Material / Insumo a Almacén
              </h3>
              <button onClick={() => setIsMaterialReqOpen(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Seleccionar del inventario existente</label>
                <select
                  value={matReqItemId}
                  onChange={(e) => setMatReqItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs"
                >
                  <option value="">-- O escribir nombre manual abajo --</option>
                  {inventoryItems.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.nombre} (Stock: {inv.stock} {inv.unidad}) - ${Number(inv.precioUnitario).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {!matReqItemId && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Nombre del material</label>
                  <input
                    type="text"
                    value={matReqCustomName}
                    onChange={(e) => setMatReqCustomName(e.target.value)}
                    placeholder="Ej: Empaquetadura de culata"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={matReqQty}
                    onChange={(e) => setMatReqQty(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Tipo de elemento</label>
                  <select
                    value={matReqEsInsumo ? 'INSUMO' : 'REPUESTO'}
                    onChange={(e) => setMatReqEsInsumo(e.target.value === 'INSUMO')}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs"
                  >
                    <option value="INSUMO">Insumo (Taller)</option>
                    <option value="REPUESTO">Repuesto del vehículo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Notas para Almacén</label>
                <textarea
                  value={matReqNotas}
                  onChange={(e) => setMatReqNotas(e.target.value)}
                  rows={2}
                  placeholder="Detalles sobre especificación o urgencia..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsMaterialReqOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateMaterialRequest}
                  disabled={savingMatReq}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl"
                >
                  {savingMatReq ? 'Enviando...' : 'Crear Solicitud'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CARGAR INSUMOS SUGERIDOS DE SERVICIO */}
      {isLoadSuggestedOpen && detailJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Cargar Materiales Predefinidos de Servicio
              </h3>
              <button onClick={() => setIsLoadSuggestedOpen(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Seleccione un servicio de su catálogo que tenga insumos o repuestos predefinidos para añadirlos automáticamente:
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {catalogServices.filter((s) => s.materialesSugeridos && s.materialesSugeridos.length > 0).length === 0 ? (
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-xs text-zinc-500">
                  Ningún servicio tiene insumos predefinidos configurados en el catálogo.
                </div>
              ) : (
                catalogServices
                  .filter((s) => s.materialesSugeridos && s.materialesSugeridos.length > 0)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleLoadSuggestedMaterials(s.id)}
                      className="w-full text-left p-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
                    >
                      <p className="text-xs font-bold text-zinc-200">{s.nombre}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {s.materialesSugeridos.length} insumos predefinidos: {s.materialesSugeridos.map((m: any) => `${m.cantidad || 1}x ${m.nombre}`).join(', ')}
                      </p>
                    </button>
                  ))
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-zinc-800 mt-4">
              <button onClick={() => setIsLoadSuggestedOpen(false)} className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJUSTAR COSTO / DESCUENTO / IVA CON AUDITORIA */}
      {costModalOpen && detailJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brand-400" /> Ajustar Costo, Descuento e IVA
              </h3>
              <button onClick={() => setCostModalOpen(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Precio base de mano de obra / servicio ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrecioServicio}
                  onChange={(e) => setEditPrecioServicio(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">Tipo de Descuento</label>
                  <select
                    value={editDescuentoTipo}
                    onChange={(e: any) => setEditDescuentoTipo(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs"
                  >
                    <option value="NINGUNO">Sin descuento</option>
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="FIJO">Monto fijo ($)</option>
                  </select>
                </div>
                {editDescuentoTipo !== 'NINGUNO' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Valor del Descuento {editDescuentoTipo === 'PORCENTAJE' ? '(%)' : '($)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editDescuentoValor}
                      onChange={(e) => setEditDescuentoValor(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <input
                  type="checkbox"
                  id="iva_check"
                  checked={editAplicaIva}
                  onChange={(e) => setEditAplicaIva(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="iva_check" className="text-xs font-semibold text-zinc-200 cursor-pointer">
                  Aplicar IVA oficial de Bolivia (+13% con factura legal)
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Justificación obligatoria del ajuste
                </label>
                <textarea
                  value={costJustification}
                  onChange={(e) => setCostJustification(e.target.value)}
                  rows={2}
                  placeholder="Ej: Descuento especial por cliente frecuente acordado con administración..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs resize-none"
                />
              </div>

              {costAudits.length > 0 && (
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Historial de auditoría de costos</p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {costAudits.map((a) => (
                      <div key={a.id} className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-400">
                        <div className="flex justify-between font-semibold text-zinc-300">
                          <span>{a.usuarioNombre} ({a.usuarioRol})</span>
                          <span>{new Date(a.createdAt).toLocaleDateString('es-VE')}</span>
                        </div>
                        <p className="text-zinc-500 mt-0.5">{a.justificacion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCostModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCostAdjustment}
                  disabled={savingCost || !costJustification.trim()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {savingCost ? 'Guardando...' : 'Aplicar y Auditar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAPTURAR FIRMA TOUCH */}
      {signatureOpen && detailJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
            <button onClick={() => setSignatureOpen(false)} className="absolute top-3 right-3 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors z-10"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-zinc-200 mb-1 flex items-center gap-2 pr-8"><PenTool className="w-5 h-5 text-zinc-400" /> {sigTarget === 'ingreso' ? 'Firma de ingreso' : 'Firma de salida del cliente'}</h3>
            <p className="text-[11px] text-zinc-500 mb-3">Firme con el dedo en pantallas táctiles o con el mouse. Puede hacerlo ahora mismo desde el celular o tablet.</p>
            <div className="bg-white rounded-xl p-2 mb-4 shadow-inner">
              <canvas
                ref={canvasRef}
                width={600}
                height={300}
                className="w-full h-56 sm:h-64 rounded-lg cursor-crosshair touch-none select-none"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => {
                  const canvas = canvasRef.current; if (!canvas) return;
                  canvas.setPointerCapture(e.pointerId);
                  isDrawingRef.current = true;
                  const ctx = canvas.getContext('2d'); if (!ctx) return;
                  const rect = canvas.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
                  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
                  ctx.beginPath(); ctx.moveTo(x, y);
                }}
                onPointerMove={(e) => {
                  if (!isDrawingRef.current) return;
                  const canvas = canvasRef.current; if (!canvas) return;
                  const ctx = canvas.getContext('2d'); if (!ctx) return;
                  const rect = canvas.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
                  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
                  ctx.lineTo(x, y); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
                }}
                onPointerUp={() => { isDrawingRef.current = false; }}
                onPointerCancel={() => { isDrawingRef.current = false; }}
                onPointerLeave={() => { isDrawingRef.current = false; }}
              />
            </div>
            <div className="flex justify-end gap-3"><button onClick={clearCanvas} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl">Limpiar</button><button onClick={handleSaveSignature} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl">Guardar firma</button></div>
          </div>
        </div>
      )}

      {/* REPORTE HTML / PDF PREVIEW */}
      {reportHtml && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <button onClick={() => setReportHtml(null)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors">
              <X className="w-4 h-4" /> Cerrar
            </button>
            <h3 className="text-sm font-bold text-zinc-300">Reporte de servicio</h3>
            <button onClick={() => reportIframeRef.current?.contentWindow?.print()} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Imprimir / PDF
            </button>
          </div>
          <iframe ref={reportIframeRef} srcDoc={reportHtml} className="flex-1 w-full bg-white border-0" title="Reporte" />
        </div>
      )}
    </div>
  );
}
