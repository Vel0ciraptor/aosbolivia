'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../../lib/api';
import VoiceDictationButton from '../../../../../components/VoiceDictationButton';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  Fuel,
  History,
  Image as ImageIcon,
  Loader2,
  Package,
  PenTool,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Tag,
  Timer,
  Trash2,
  User,
  Wrench,
  X,
} from 'lucide-react';
import {
  CostAudit,
  EMPTY_FORM,
  FUEL_LEVELS,
  JobFormData,
  JobLog,
  MaterialRequest,
  PartNeed,
  STATUS_FLOW,
  STATUS_META,
  ServicioRealizado,
  TRABAJOS_TIPOS,
  Worklog,
  WorkshopJob,
  calcJobTotals,
} from '../types';
import {
  CostAdjustmentModal,
  MaterialRequestModal,
  SignatureModal,
  SuggestedMaterialsModal,
} from './JobSubModals';

interface JobDetailModalProps {
  job: WorkshopJob | null;
  user: any;
  workTags: string[];
  exchangeRate: number;
  isMechanic: boolean;
  isWorkshopAdmin: boolean;
  canApproveMaterials: boolean;
  canDeliverMaterials: boolean;
  canAdjustCost: boolean;
  onClose: () => void;
  onJobUpdated: (jobId: string, patch: Partial<WorkshopJob>) => void;
  onWorkTagsUpdated: (tags: string[]) => void;
  onOpenStatusModal: (job: WorkshopJob) => void;
  onOpenEdit: (job: WorkshopJob) => void;
  onOpenReport: (jobId: string) => void;
}

export default function JobDetailModal({
  job,
  user,
  workTags,
  exchangeRate,
  isMechanic,
  isWorkshopAdmin,
  canApproveMaterials,
  canDeliverMaterials,
  canAdjustCost,
  onClose,
  onJobUpdated,
  onWorkTagsUpdated,
  onOpenStatusModal,
  onOpenEdit,
  onOpenReport,
}: JobDetailModalProps) {
  const [detailJob, setDetailJob] = useState<WorkshopJob | null>(job);
  const [detailLogs, setDetailLogs] = useState<JobLog[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [kmInput, setKmInput] = useState('');
  const [savingKm, setSavingKm] = useState(false);
  const [kmError, setKmError] = useState<string | null>(null);

  const [partNeeds, setPartNeeds] = useState<PartNeed[]>([]);
  const [partSearch, setPartSearch] = useState('');
  const [newPartQty, setNewPartQty] = useState('1');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  const [uploading, setUploading] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [sigTarget, setSigTarget] = useState<'salida' | 'ingreso'>('salida');

  const [tipoTrabajoSel, setTipoTrabajoSel] = useState<string[]>([]);
  const [tipoTrabajoOtro, setTipoTrabajoOtro] = useState('');
  const [serviciosRealizados, setServiciosRealizados] = useState<ServicioRealizado[]>([]);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [precioServicioInput, setPrecioServicioInput] = useState('');
  const [precioManoObraInput, setPrecioManoObraInput] = useState('');
  const [horasFinalesInput, setHorasFinalesInput] = useState('');
  const [fechaPagoInput, setFechaPagoInput] = useState('');
  const [partEdits, setPartEdits] = useState<
    Record<string, { nombre?: string; cantidad?: string; precioUnitario?: string }>
  >({});
  const [showAdminPrevEdit, setShowAdminPrevEdit] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState<JobFormData>(EMPTY_FORM);
  const [savingAdminDatos, setSavingAdminDatos] = useState(false);
  const [customPartName, setCustomPartName] = useState('');
  const [customPartQty, setCustomPartQty] = useState('1');
  const [customPartPrice, setCustomPartPrice] = useState('');
  const [customPartEsInsumo, setCustomPartEsInsumo] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);

  const [diagnosticoInput, setDiagnosticoInput] = useState('');
  const [savingDiagnostico, setSavingDiagnostico] = useState(false);
  const [conclusionesInput, setConclusionesInput] = useState('');
  const [savingConclusiones, setSavingConclusiones] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [sendingReadyWhatsApp, setSendingReadyWhatsApp] = useState(false);

  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [isMaterialReqOpen, setIsMaterialReqOpen] = useState(false);
  const [matReqItemId, setMatReqItemId] = useState('');
  const [matReqQty, setMatReqQty] = useState('1');
  const [matReqNotas, setMatReqNotas] = useState('');
  const [savingMatReq, setSavingMatReq] = useState(false);
  const [addingServicioId, setAddingServicioId] = useState('');
  const [catalogServices, setCatalogServices] = useState<any[]>([]);
  const [isLoadSuggestedOpen, setIsLoadSuggestedOpen] = useState(false);

  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costJustification, setCostJustification] = useState('');
  const [editDescuentoTipo, setEditDescuentoTipo] = useState<'NINGUNO' | 'PORCENTAJE' | 'FIJO'>('NINGUNO');
  const [editDescuentoValor, setEditDescuentoValor] = useState('0');
  const [editAplicaIva, setEditAplicaIva] = useState(false);
  const [editPrecioServicio, setEditPrecioServicio] = useState('');
  const [costAudits, setCostAudits] = useState<CostAudit[]>([]);
  const [savingCost, setSavingCost] = useState(false);

  const syncDetailStates = (data: WorkshopJob) => {
    setDetailJob(data);
    setDetailLogs(data.logs || []);
    setPartNeeds(data.partNeeds || []);
    setTipoTrabajoSel(data.tipoTrabajo?.categorias || []);
    setTipoTrabajoOtro(data.tipoTrabajo?.otro || '');
    setServiciosRealizados(data.serviciosRealizados || []);
    setPrecioServicioInput(data.precioServicio != null ? String(data.precioServicio) : '');
    setPrecioManoObraInput(data.precioManoObra != null ? String(data.precioManoObra) : '');
    setHorasFinalesInput(data.horasTrabajadasFinal != null ? String(data.horasTrabajadasFinal) : '');
    setFechaPagoInput(data.fechaPagoHoras ? String(data.fechaPagoHoras).substring(0, 10) : '');
    setDiagnosticoInput(data.diagnosticoMecanico || '');
    setConclusionesInput(data.conclusionesEntrega || '');
    setPartEdits({});
    setKmInput(data.kilometraje != null ? String(data.kilometraje) : '');
    setKmError(null);
    setAdminEditForm({
      marca: data.marca || '',
      modelo: data.modelo || '',
      anio: String(data.anio || ''),
      placa: data.placa || '',
      kilometraje: data.kilometraje != null ? String(data.kilometraje) : '',
      problema: data.problema || '',
      clienteNombre: data.clienteNombre || '',
      clienteTelefono: data.clienteTelefono || '',
    });
  };

  const fetchMaterialRequests = async (jobId: string) => {
    try {
      const res = await api.get('/workshops/me/materials', { params: { jobId } });
      setMaterialRequests(res.data || []);
    } catch {}
  };

  useEffect(() => {
    if (!job) {
      setDetailJob(null);
      return;
    }
    let cancelled = false;
    setDetailJob(job);
    setLoadingDetail(true);
    setShowAdminPrevEdit(false);

    (async () => {
      try {
        const res = await api.get(`/workshops/me/jobs/${job.id}`);
        if (!cancelled) syncDetailStates(res.data);
        api
          .get('/workshops/me/users')
          .then((r) => {
            if (!cancelled) {
              setTeamUsers(
                (r.data || []).filter(
                  (u: any) => ['MECANICO', 'JEFE_MECANICO'].includes(u.role) && u.status !== 'INACTIVE',
                ),
              );
            }
          })
          .catch(() => {});
        api
          .get('/workshops/me/materials', { params: { jobId: job.id } })
          .then((r) => {
            if (!cancelled) setMaterialRequests(r.data || []);
          })
          .catch(() => {});
        api
          .get('/workshops/me/services')
          .then((r) => {
            if (!cancelled) setCatalogServices(r.data || []);
          })
          .catch(() => {});
        api
          .get('/workshops/me/inventory')
          .then((r) => {
            if (!cancelled) setInventoryItems(r.data || []);
          })
          .catch(() => {});
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [job]);

  const allWorkTags = useMemo(() => {
    const base = TRABAJOS_TIPOS.filter((t) => t !== 'Otro');
    const extras = workTags.filter((t) => !base.some((b) => b.toLowerCase() === t.toLowerCase()));
    return [...base, ...extras];
  }, [workTags]);

  const totalsBreakdown = useMemo(
    () => calcJobTotals(detailJob, serviciosRealizados, partNeeds, exchangeRate),
    [detailJob, serviciosRealizados, partNeeds, exchangeRate],
  );

  if (!job || !detailJob) return null;

  const applyJobPatch = (patch: Partial<WorkshopJob>) => {
    setDetailJob((prev) => (prev ? { ...prev, ...patch } : prev));
    onJobUpdated(detailJob.id, patch);
  };

  const handleSaveKm = async () => {
    const parsed = parseInt(kmInput, 10);
    if (isNaN(parsed) || parsed < 0) {
      setKmError('Ingresa un kilometraje válido (número).');
      return;
    }
    setKmError(null);
    setSavingKm(true);
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { kilometraje: parsed });
      applyJobPatch({ kilometraje: parsed });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setKmError(data?.message || 'No se pudo guardar el kilometraje.');
    } finally {
      setSavingKm(false);
    }
  };

  const handleSelectFuelLevel = async (level: string) => {
    try {
      const res = await api.put(`/workshops/me/jobs/${detailJob.id}`, { nivelCombustible: level });
      applyJobPatch(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo registrar el nivel de combustible.');
    }
  };

  const saveDiagnostico = async (val?: string) => {
    const text = val !== undefined ? val : diagnosticoInput;
    if ((detailJob.diagnosticoMecanico || '') === text) return;
    setSavingDiagnostico(true);
    try {
      const res = await api.put(`/workshops/me/jobs/${detailJob.id}`, { diagnosticoMecanico: text });
      applyJobPatch(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo guardar el diagnóstico.');
    } finally {
      setSavingDiagnostico(false);
    }
  };

  const saveConclusiones = async (val?: string) => {
    const text = val !== undefined ? val : conclusionesInput;
    if ((detailJob.conclusionesEntrega || '') === text) return;
    setSavingConclusiones(true);
    try {
      const res = await api.put(`/workshops/me/jobs/${detailJob.id}`, { conclusionesEntrega: text });
      applyJobPatch(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudieron guardar las conclusiones.');
    } finally {
      setSavingConclusiones(false);
    }
  };

  const handleRequestAppApproval = async () => {
    setSendingWhatsApp(true);
    try {
      await api.post(`/workshops/me/jobs/${detailJob.id}/request-approval`);
      applyJobPatch({ autorizacionEstado: 'PENDIENTE_APROBACION' });
      alert('Presupuesto enviado. El cliente lo verá en su app (Seguimiento) para aprobar o rechazar con firma.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo solicitar la aprobación.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleSendWhatsAppApproval = async () => {
    setSendingWhatsApp(true);
    try {
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/whatsapp-approval`, {
        appUrl: window.location.origin,
      });
      const { waMeUrl, whatsappUrl, token } = res.data;
      applyJobPatch({ autorizacionEstado: 'PENDIENTE_APROBACION', autorizacionToken: token });
      const link = waMeUrl || whatsappUrl;
      if (link) window.open(link, '_blank');
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo generar el enlace de WhatsApp.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleSendWhatsAppReady = async () => {
    setSendingReadyWhatsApp(true);
    try {
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/whatsapp-ready`);
      const { waMeUrl, whatsappUrl } = res.data;
      const link = waMeUrl || whatsappUrl;
      if (link) window.open(link, '_blank');
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo enviar la notificación.');
    } finally {
      setSendingReadyWhatsApp(false);
    }
  };

  const openCostModal = async () => {
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
    if (!costJustification.trim()) {
      alert('La justificación es obligatoria para registrar la auditoría del cambio de costo.');
      return;
    }
    setSavingCost(true);
    try {
      const payload: any = {
        justificacion: costJustification.trim(),
        aplicaIva: editAplicaIva,
        porcentajeIva: 13,
      };
      if (editDescuentoTipo !== 'NINGUNO') {
        payload.descuentoTipo = editDescuentoTipo;
        payload.descuentoValor = parseFloat(editDescuentoValor) || 0;
      }
      if (editPrecioServicio.trim()) {
        payload.precioServicio = parseFloat(editPrecioServicio) || 0;
      }
      await api.patch(`/workshops/me/jobs/${detailJob.id}/cost`, payload);
      const res = await api.get(`/workshops/me/jobs/${detailJob.id}`);
      syncDetailStates(res.data);
      onJobUpdated(detailJob.id, res.data);
      setCostModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo guardar el ajuste de costo.');
    } finally {
      setSavingCost(false);
    }
  };

  const handleCreateMaterialRequest = async () => {
    if (!matReqItemId) {
      alert('Seleccione un ítem del inventario del taller.');
      return;
    }
    setSavingMatReq(true);
    try {
      await api.post(`/workshops/me/jobs/${detailJob.id}/materials`, {
        inventoryItemId: matReqItemId,
        cantidad: parseInt(matReqQty, 10) || 1,
        justificacion: matReqNotas.trim() || undefined,
      });
      setIsMaterialReqOpen(false);
      setMatReqItemId('');
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
    const motivo = !aprobado
      ? prompt('Motivo de rechazo:') || 'Rechazado por jefe mecánico'
      : undefined;
    try {
      await api.patch(`/workshops/me/materials/${reqId}/approve`, {
        accion: aprobado ? 'APROBAR' : 'RECHAZAR',
        motivo,
      });
      await fetchMaterialRequests(detailJob.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar solicitud.');
    }
  };

  const handleDeliverMaterialRequest = async (reqId: string, cantidad: number) => {
    try {
      await api.patch(`/workshops/me/materials/${reqId}/deliver`, {
        cantidadEntregada: cantidad,
      });
      await fetchMaterialRequests(detailJob.id);
      const r = await api.get('/workshops/me/inventory');
      setInventoryItems(r.data || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al registrar la entrega de almacén.');
    }
  };

  const handleLoadSuggestedMaterials = async (serviceId: string) => {
    try {
      await api.post(`/workshops/me/jobs/${detailJob.id}/services/${serviceId}/load-materials`);
      setIsLoadSuggestedOpen(false);
      await fetchMaterialRequests(detailJob.id);
      const res = await api.get(`/workshops/me/jobs/${detailJob.id}`);
      syncDetailStates(res.data);
      onJobUpdated(detailJob.id, res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cargar materiales sugeridos.');
    }
  };

  const handleAddPartNeed = async (item: any) => {
    if (!item) return;
    try {
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/parts-needed`, {
        nombre: item.nombre,
        cantidad: parseInt(newPartQty, 10) || 1,
        esInsumo: item.categoria === 'INSUMO',
        inventoryItemId: item.id,
      });
      setPartNeeds((prev) => [...prev, res.data]);
      setNewPartQty('1');
      await fetchMaterialRequests(detailJob.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo agregar.');
    }
  };

  const handleRemovePartNeed = async (pnId: string) => {
    try {
      await api.delete(`/workshops/me/jobs/${detailJob.id}/parts-needed/${pnId}`);
      setPartNeeds((prev) => prev.filter((p) => p.id !== pnId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo quitar.');
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'imagenes' | 'imagenesTerminado' | 'imagenesIngreso' | 'diagnosticoImagenes',
  ) => {
    if (!e.target.files) return;
    const current = (detailJob[field] as string[]) || [];
    const remaining = Math.max(0, 5 - current.length);
    if (remaining === 0) {
      alert('Máximo 5 fotos por vehículo en esta etapa.');
      return;
    }
    const selected = Array.from(e.target.files);
    const files = selected.slice(0, remaining);
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
      const updated = [...current, ...urls].slice(0, 5);
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { [field]: updated });
      applyJobPatch({ [field]: updated } as Partial<WorkshopJob>);
      if (selected.length > files.length) {
        alert(`Solo se guardaron ${files.length} foto(s): el máximo es 5 por vehículo.`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudieron subir las imágenes.');
    } finally {
      setUploading(false);
    }
  };

  const handleSingleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'fotoTablero',
  ) => {
    if (!e.target.files || !e.target.files[0]) return;
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
      applyJobPatch({ [field]: url } as Partial<WorkshopJob>);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo subir la foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (
    url: string,
    field: 'imagenes' | 'imagenesTerminado' | 'imagenesIngreso' | 'diagnosticoImagenes',
  ) => {
    const updated = ((detailJob[field] as string[]) || []).filter((u) => u !== url);
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { [field]: updated });
      applyJobPatch({ [field]: updated } as Partial<WorkshopJob>);
    } catch (err: any) {
      alert(err.response?.data?.message);
    }
  };

  const handleRemoveSingleImage = async (field: 'fotoTablero') => {
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { [field]: null });
      applyJobPatch({ [field]: null } as Partial<WorkshopJob>);
    } catch (err: any) {
      alert(err.response?.data?.message);
    }
  };

  const handleSaveSignature = async (dataUrl: string) => {
    const field = sigTarget === 'ingreso' ? 'firmaIngreso' : 'firmaDigital';
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { [field]: dataUrl });
      applyJobPatch({ [field]: dataUrl } as Partial<WorkshopJob>);
      setSignatureOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo guardar la firma.');
    }
  };

  const saveTipoTrabajo = async (sel: string[], otro: string) => {
    const nextOtro = otro.trim() || undefined;
    const prevSel = detailJob.tipoTrabajo?.categorias || [];
    const prevOtro = detailJob.tipoTrabajo?.otro || undefined;
    const sameSel = prevSel.length === sel.length && prevSel.every((v, i) => v === sel[i]);
    if (sameSel && prevOtro === nextOtro) return;
    const nextTipo = { categorias: sel, otro: nextOtro };
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { tipoTrabajo: nextTipo });
      applyJobPatch({ tipoTrabajo: nextTipo });
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo guardar el tipo de trabajo.');
    }
  };

  const toggleTipoTrabajo = (t: string) => {
    const next = tipoTrabajoSel.includes(t)
      ? tipoTrabajoSel.filter((x) => x !== t)
      : [...tipoTrabajoSel, t];
    setTipoTrabajoSel(next);
    saveTipoTrabajo(next, tipoTrabajoOtro);
  };

  const saveWorkTag = async () => {
    const nombre = tipoTrabajoOtro.trim();
    if (!nombre) {
      alert('Escriba el nombre del tipo de trabajo.');
      return;
    }
    try {
      const res = await api.post('/workshops/me/work-tags', { nombre });
      const tags: string[] = res.data?.trabajoTags || [];
      onWorkTagsUpdated(tags);
      const next = tipoTrabajoSel.includes(nombre)
        ? tipoTrabajoSel
        : [...tipoTrabajoSel.filter((t) => t !== 'Otro'), nombre];
      setTipoTrabajoSel(next);
      setTipoTrabajoOtro('');
      await saveTipoTrabajo(next, '');
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo guardar el tag.');
    }
  };

  const persistServicios = async (list: ServicioRealizado[]) => {
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { serviciosRealizados: list });
      applyJobPatch({ serviciosRealizados: list });
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudieron guardar los trabajos.');
    }
  };

  const addServicioRealizado = () => {
    setServiciosRealizados((prev) => [...prev, { id: `${Date.now()}`, nombre: '', precio: 0 }]);
  };

  const updateServicioRealizado = (id: string, patch: Partial<ServicioRealizado>) => {
    setServiciosRealizados((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeServicioRealizado = (id: string) => {
    const next = serviciosRealizados.filter((s) => s.id !== id);
    setServiciosRealizados(next);
    persistServicios(next);
  };

  const saveServicioRealizado = (id: string) => {
    const s = serviciosRealizados.find((x) => x.id === id);
    if (!s) return;
    const trimmedName = s.nombre.trim();
    const numPrice = Number(s.precio) || 0;
    const saved = (detailJob.serviciosRealizados || []).find((x) => x.id === id);
    if (!trimmedName) {
      if (!saved) return;
      alert('Escriba el nombre del trabajo realizado.');
      return;
    }
    if (saved && saved.nombre === trimmedName && (Number(saved.precio) || 0) === numPrice) return;
    persistServicios(
      serviciosRealizados.map((x) =>
        x.id === id ? { ...x, nombre: trimmedName, precio: numPrice } : x,
      ),
    );
  };

  const handleAddServicioFromCatalog = async (svc: any) => {
    setAddingServicioId(svc.id);
    try {
      const next = [
        ...serviciosRealizados,
        { id: `svc-${Date.now()}`, nombre: svc.nombre, precio: Number(svc.precioReferencial) || 0 },
      ];
      setServiciosRealizados(next);
      await persistServicios(next);
      if (svc.materialesSugeridos && svc.materialesSugeridos.length > 0) {
        await api.post(`/workshops/me/jobs/${detailJob.id}/services/${svc.id}/load-materials`);
        await fetchMaterialRequests(detailJob.id);
        const res = await api.get(`/workshops/me/jobs/${detailJob.id}`);
        setPartNeeds(res.data.partNeeds || []);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo agregar el servicio del catálogo.');
    } finally {
      setAddingServicioId('');
    }
  };

  const handleAsignarMecanico = async () => {
    if (!assignUserId) return;
    const u = teamUsers.find((x: any) => x.id === assignUserId);
    if (!u) return;
    const wl: Worklog[] = (detailJob.mecanicosAsignados || []).slice();
    if (wl.some((w) => w.userId === assignUserId)) {
      alert('Ese mecánico ya está asignado.');
      return;
    }
    const entry: Worklog = {
      key: `${Date.now()}`,
      userId: u.id,
      nombre: u.name,
      inicio: null,
      fin: null,
      horasReales: null,
    };
    const next = [...wl, entry];
    setSavingDetail(true);
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { mecanicosAsignados: next });
      applyJobPatch({ mecanicosAsignados: next });
      setAssignUserId('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo asignar.');
    } finally {
      setSavingDetail(false);
    }
  };

  const handleRemoveMecanico = async (w: Worklog) => {
    if (w.inicio && !w.fin) {
      alert('Primero termina el trabajo en curso.');
      return;
    }
    const updated = (detailJob.mecanicosAsignados || []).filter((x) => x.key !== w.key);
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { mecanicosAsignados: updated });
      applyJobPatch({ mecanicosAsignados: updated });
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo quitar.');
    }
  };

  const handleStartWork = async (w: Worklog) => {
    try {
      const res = await api.post(
        `/workshops/me/jobs/${detailJob.id}/work/start`,
        w.userId && !isMechanic ? { userId: w.userId } : {},
      );
      applyJobPatch({ mecanicosAsignados: res.data || [] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo iniciar el trabajo.');
    }
  };

  const handleStopWork = async (w: Worklog) => {
    try {
      const res = await api.post(
        `/workshops/me/jobs/${detailJob.id}/work/stop`,
        w.userId && !isMechanic ? { userId: w.userId } : {},
      );
      applyJobPatch({ mecanicosAsignados: res.data || [] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo terminar el trabajo.');
    }
  };

  const savePrecioServicio = async () => {
    const val = parseFloat(precioServicioInput);
    if (isNaN(val) || val < 0) {
      setPrecioServicioInput(detailJob.precioServicio != null ? String(detailJob.precioServicio) : '');
      return;
    }
    if (detailJob.precioServicio != null && Number(detailJob.precioServicio) === val) return;
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { precioServicio: val });
      applyJobPatch({ precioServicio: val });
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se guardó.');
    }
  };

  const setPartFieldEdit = (
    id: string,
    field: 'nombre' | 'cantidad' | 'precioUnitario',
    value: string,
  ) => {
    setPartEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const clearPartFieldEdit = (id: string, field: 'nombre' | 'cantidad' | 'precioUnitario') => {
    setPartEdits((prev) => {
      const entry = { ...prev[id] };
      delete entry[field];
      if (Object.keys(entry).length === 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: entry };
    });
  };

  const handlePartFieldBlur = async (
    pn: PartNeed,
    field: 'nombre' | 'cantidad' | 'precioUnitario',
  ) => {
    const raw = partEdits[pn.id]?.[field];
    if (raw === undefined) return;

    const payload: Record<string, any> = {};
    const localPatch: Partial<PartNeed> = {};

    if (field === 'nombre') {
      const trimmed = raw.trim();
      if (!trimmed) {
        clearPartFieldEdit(pn.id, field);
        return;
      }
      if (trimmed === pn.nombre) return;
      payload.nombre = trimmed;
      localPatch.nombre = trimmed;
    } else if (field === 'cantidad') {
      const qty = parseInt(raw, 10);
      if (isNaN(qty) || qty < 1) {
        clearPartFieldEdit(pn.id, field);
        return;
      }
      if (qty === pn.cantidad) return;
      payload.cantidad = qty;
      localPatch.cantidad = qty;
    } else {
      const val = parseFloat(raw);
      if (isNaN(val) || val < 0) {
        clearPartFieldEdit(pn.id, field);
        return;
      }
      if (pn.precioUnitario != null && Number(pn.precioUnitario) === val) return;
      payload.precioUnitario = val;
      localPatch.precioUnitario = val;
    }

    const updatedParts = partNeeds.map((p) => (p.id === pn.id ? { ...p, ...localPatch } : p));
    setPartNeeds(updatedParts);
    try {
      await api.patch(`/workshops/me/jobs/${detailJob.id}/parts-needed/${pn.id}`, payload);
      onJobUpdated(detailJob.id, { partNeeds: updatedParts });
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo actualizar la pieza/insumo.');
    }
  };

  const handleAddCustomPartNeed = async () => {
    if (!customPartName.trim()) return;
    const qty = Math.max(1, parseInt(customPartQty, 10) || 1);
    const price = customPartPrice.trim() !== '' ? parseFloat(customPartPrice) : undefined;
    if (price !== undefined && (isNaN(price) || price < 0)) {
      alert('Ingresa un precio unitario válido.');
      return;
    }
    try {
      const res = await api.post(`/workshops/me/jobs/${detailJob.id}/parts-needed`, {
        nombre: customPartName.trim(),
        cantidad: qty,
        esInsumo: customPartEsInsumo,
        ...(price !== undefined ? { precioUnitario: price } : {}),
      });
      const updatedParts = [...partNeeds, res.data];
      setPartNeeds(updatedParts);
      setCustomPartName('');
      setCustomPartQty('1');
      setCustomPartPrice('');
      onJobUpdated(detailJob.id, { partNeeds: updatedParts });
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo agregar la pieza/insumo.');
    }
  };

  const saveAdminDatosBasicos = async () => {
    if (
      !adminEditForm.marca.trim() ||
      !adminEditForm.modelo.trim() ||
      !adminEditForm.clienteNombre.trim() ||
      !adminEditForm.problema.trim()
    ) {
      alert('Marca, modelo, cliente y problema son obligatorios.');
      return;
    }
    const anio = parseInt(adminEditForm.anio, 10);
    if (isNaN(anio) || anio < 1900) {
      alert('Ingresa un año válido.');
      return;
    }
    setSavingAdminDatos(true);
    try {
      const payload: Record<string, any> = {
        marca: adminEditForm.marca.trim(),
        modelo: adminEditForm.modelo.trim(),
        anio,
        placa: adminEditForm.placa.trim() || undefined,
        clienteNombre: adminEditForm.clienteNombre.trim(),
        clienteTelefono: adminEditForm.clienteTelefono.trim() || undefined,
        problema: adminEditForm.problema.trim(),
      };
      const res = await api.put(`/workshops/me/jobs/${detailJob.id}`, payload);
      applyJobPatch(res.data);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      alert(data?.message || 'No se pudieron guardar los datos.');
    } finally {
      setSavingAdminDatos(false);
    }
  };

  const savePrecioManoObra = async () => {
    const val = parseFloat(precioManoObraInput);
    if (isNaN(val) || val < 0) {
      setPrecioManoObraInput(detailJob.precioManoObra != null ? String(detailJob.precioManoObra) : '');
      return;
    }
    if (detailJob.precioManoObra != null && Number(detailJob.precioManoObra) === val) return;
    try {
      await api.put(`/workshops/me/jobs/${detailJob.id}`, { precioManoObra: val });
      applyJobPatch({ precioManoObra: val });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      alert(data?.message || 'No se guardó la mano de obra.');
    }
  };

  const saveRegistroInternoHoras = async () => {
    if (!isWorkshopAdmin) return;
    const payload: any = {
      fechaPagoHoras: fechaPagoInput ? new Date(`${fechaPagoInput}T12:00:00`).toISOString() : null,
    };
    if (horasFinalesInput.trim() === '') {
      payload.horasTrabajadasFinal = null;
    } else {
      const horas = parseFloat(horasFinalesInput);
      if (isNaN(horas) || horas < 0) {
        alert('Ingresa unas horas válidas.');
        return;
      }
      payload.horasTrabajadasFinal = horas;
    }
    try {
      const res = await api.put(`/workshops/me/jobs/${detailJob.id}`, payload);
      applyJobPatch(res.data);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      alert(data?.message || 'No se pudo guardar el registro interno de horas.');
    }
  };

  const renderServiciosEditor = (editable: boolean) => (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-brand-400" /> Trabajos realizados
        </h5>
        {editable && (
          <button
            onClick={addServicioRealizado}
            className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Agregar trabajo
          </button>
        )}
      </div>
      {serviciosRealizados.length === 0 ? (
        <p className="text-[11px] text-zinc-500">
          Agrega cada trabajo realizado con su precio; saldrán detallados en el informe económico y
          PDF.
        </p>
      ) : (
        <div className="space-y-2">
          {serviciosRealizados.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl"
            >
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
                  type="number"
                  min="0"
                  step="0.01"
                  value={s.precio || ''}
                  onChange={(e) =>
                    updateServicioRealizado(s.id, { precio: parseFloat(e.target.value) || 0 })
                  }
                  onBlur={() => saveServicioRealizado(s.id)}
                  disabled={!editable}
                  placeholder="0.00"
                  className="w-24 px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-right focus:border-brand-500 disabled:opacity-70"
                />
              </div>
              {editable && (
                <button
                  onClick={() => removeServicioRealizado(s.id)}
                  className="p-1 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                  title="Quitar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {serviciosRealizados.length === 0 && (
        <div className="mt-2 flex gap-2 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase">
              Precio único del servicio ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={precioServicioInput}
              onChange={(e) => setPrecioServicioInput(e.target.value)}
              onBlur={savePrecioServicio}
              placeholder="0.00"
              className="w-36 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono focus:border-brand-500"
              disabled={!editable}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderPartesTabla = (editable: boolean, allowFullEdit = false) =>
    partNeeds.length > 0 ? (
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
              <th className="py-2 pr-3 font-bold">Pieza / Insumo</th>
              <th className="py-2 pr-3 font-bold">Cant.</th>
              <th className="py-2 pr-3 font-bold text-right">Precio U. ($)</th>
              <th className="py-2 pr-3 font-bold text-right">Total ($)</th>
              {allowFullEdit && <th className="py-2 font-bold text-right">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {partNeeds.map((pn) => {
              const edit = partEdits[pn.id] || {};
              const curQty =
                edit.cantidad !== undefined ? parseInt(edit.cantidad, 10) || pn.cantidad : pn.cantidad;
              const curPrice =
                edit.precioUnitario !== undefined
                  ? parseFloat(edit.precioUnitario) || 0
                  : Number(pn.precioUnitario) || 0;
              return (
                <tr key={pn.id} className="border-b border-zinc-800/60">
                  <td className="py-2 pr-3 text-zinc-200">
                    {allowFullEdit ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={edit.nombre !== undefined ? edit.nombre : pn.nombre}
                          onChange={(e) => setPartFieldEdit(pn.id, 'nombre', e.target.value)}
                          onBlur={() => handlePartFieldBlur(pn, 'nombre')}
                          className="w-full min-w-[140px] px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:border-brand-500"
                        />
                        {pn.esInsumo && (
                          <span className="text-[10px] text-purple-400 font-mono shrink-0">
                            (Insumo)
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        {pn.nombre}{' '}
                        {pn.esInsumo && (
                          <span className="text-[10px] text-purple-400 font-mono">(Insumo)</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-zinc-300">
                    {allowFullEdit ? (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={edit.cantidad !== undefined ? edit.cantidad : String(pn.cantidad)}
                        onChange={(e) => setPartFieldEdit(pn.id, 'cantidad', e.target.value)}
                        onBlur={() => handlePartFieldBlur(pn, 'cantidad')}
                        className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-center focus:border-brand-500"
                      />
                    ) : (
                      pn.cantidad
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {editable ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          edit.precioUnitario !== undefined
                            ? edit.precioUnitario
                            : pn.precioUnitario != null
                              ? String(pn.precioUnitario)
                              : ''
                        }
                        onChange={(e) => setPartFieldEdit(pn.id, 'precioUnitario', e.target.value)}
                        onBlur={() => handlePartFieldBlur(pn, 'precioUnitario')}
                        placeholder="—"
                        className="w-24 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-right focus:border-brand-500"
                      />
                    ) : (
                      <span className="font-mono text-zinc-300">
                        {pn.precioUnitario != null ? `$${Number(pn.precioUnitario).toFixed(2)}` : '—'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-zinc-400">
                    ${(curPrice * curQty).toFixed(2)}
                  </td>
                  {allowFullEdit && (
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemovePartNeed(pn.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Quitar pieza/insumo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-[11px] text-zinc-500 mb-3">Sin piezas/insumos registrados.</p>
    );

  const renderTotalesCompleto = () => (
    <div className="space-y-2 pt-3 border-t border-zinc-800">
      <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
        <span className="text-zinc-400">Servicios:</span>
        <span className="font-mono text-zinc-200 font-semibold">
          ${totalsBreakdown.baseServ.toFixed(2)}
        </span>
      </div>
      <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
        <span className="text-zinc-400">Mano de obra (precio fijo):</span>
        <span className="font-mono text-zinc-200 font-semibold">
          ${totalsBreakdown.baseMO.toFixed(2)}
        </span>
      </div>
      <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
        <span className="text-zinc-400">Insumos / Repuestos:</span>
        <span className="font-mono text-zinc-200 font-semibold">
          ${totalsBreakdown.baseRep.toFixed(2)}
        </span>
      </div>
      <div className="flex flex-wrap justify-between items-center gap-2 text-xs pt-1 border-t border-zinc-800/60">
        <span className="text-zinc-300 font-semibold">Subtotal:</span>
        <span className="font-mono text-zinc-200 font-semibold">
          ${totalsBreakdown.subtotal.toFixed(2)}
        </span>
      </div>
      {totalsBreakdown.descMonto > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-amber-400">
          <span>
            Descuento (
            {detailJob.descuentoTipo === 'PORCENTAJE'
              ? `${detailJob.descuentoValor}%`
              : 'Monto fijo'}
            ):
          </span>
          <span className="font-mono font-semibold">-${totalsBreakdown.descMonto.toFixed(2)}</span>
        </div>
      )}
      {detailJob.aplicaIva && (
        <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-blue-400">
          <span>IVA (13%):</span>
          <span className="font-mono font-semibold">+${totalsBreakdown.ivaMonto.toFixed(2)}</span>
        </div>
      )}
      <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-zinc-800">
        <div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase">Total a Pagar (USD)</p>
          <p className="text-xl font-extrabold text-brand-400">
            ${totalsBreakdown.totalUsd.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 font-bold uppercase">
            Equivalente en Bolivianos (T.C. {totalsBreakdown.rate.toFixed(2)} Bs/USD)
          </p>
          <p className="text-xl font-extrabold text-emerald-400">
            Bs. {totalsBreakdown.totalBob.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );

  const renderHorasEditables = () => (
    <div className="mb-4">
      <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-2">
        <Timer className="w-3.5 h-3.5 text-orange-400" /> Horas de mecánico (referencia)
      </h5>
      {(detailJob.mecanicosAsignados || []).length === 0 ? (
        <p className="text-[11px] text-zinc-500">Sin mecánicos asignados.</p>
      ) : (
        <div className="space-y-2">
          {(detailJob.mecanicosAsignados || []).map((w) => {
            const duracion =
              w.inicio && w.fin
                ? Math.round(
                    ((new Date(w.fin).getTime() - new Date(w.inicio).getTime()) / 3600000) * 100,
                  ) / 100
                : null;
            return (
              <div
                key={w.key}
                className="flex items-center gap-3 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl"
              >
                <div className="w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-200 font-semibold truncate">{w.nombre}</p>
                  <p className="text-[10px] text-zinc-500">
                    {w.inicio
                      ? `Inicio: ${new Date(w.inicio).toLocaleString('es-VE', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Sin iniciar'}
                    {w.fin
                      ? ` · Fin: ${new Date(w.fin).toLocaleString('es-VE', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : ''}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                  {duracion != null ? `${duracion} h` : w.inicio && !w.fin ? 'En curso' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-zinc-600 mt-1.5">
        Solo se registra cuándo comenzó y terminó cada mecánico. Estas horas NO se suman al costo ni
        se muestran al cliente.
      </p>

      <div className="mt-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
        <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-brand-400" /> Mano de obra para el cliente ($)
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="number"
            min="0"
            step="0.01"
            value={precioManoObraInput}
            onChange={(e) => setPrecioManoObraInput(e.target.value)}
            onBlur={savePrecioManoObra}
            placeholder="0.00"
            disabled={isMechanic}
            className="w-32 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono focus:border-brand-500 disabled:opacity-60"
          />
          <span className="text-[10px] text-zinc-500">
            Precio fijo que aparecerá en el PDF del cliente (no se calcula por horas).
          </span>
        </div>
      </div>

      {isWorkshopAdmin && (
        <div className="mt-3 p-3 bg-zinc-950 border border-amber-500/30 rounded-xl space-y-2">
          <p className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Registro interno de pago · solo admin · no va al PDF
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase">
                Horas trabajadas
              </label>
              <input
                type="number"
                min="0"
                step="0.25"
                value={horasFinalesInput}
                onChange={(e) => setHorasFinalesInput(e.target.value)}
                placeholder="0.00"
                className="w-28 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono focus:border-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase">Fecha de pago</label>
              <input
                type="date"
                value={fechaPagoInput}
                onChange={(e) => setFechaPagoInput(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono focus:border-amber-500"
              />
            </div>
            <button
              onClick={saveRegistroInternoHoras}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" /> Guardar
            </button>
          </div>
          <p className="text-[10px] text-zinc-600">
            Horas y fecha de pago son solo para control interno del taller; nunca se muestran en el
            PDF del cliente.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6 max-h-[92vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Cabecera */}
              <div className="mb-4">
                <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                  {(() => {
                    const meta = STATUS_META[detailJob.estado] || STATUS_META.INGRESANDO;
                    const Icon = meta.icon;
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}
                      >
                        <Icon className="w-4 h-4" />
                        {meta.label}
                      </span>
                    );
                  })()}
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
                  {!isMechanic && (
                    <button
                      onClick={() => onOpenReport(detailJob.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF Completo
                    </button>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-zinc-100">
                  {detailJob.marca} {detailJob.modelo} {detailJob.anio}
                </h3>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-zinc-400">
                  {detailJob.placa && (
                    <span className="font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      Placa: {detailJob.placa}
                    </span>
                  )}
                  {detailJob.kilometraje && (
                    <span className="flex items-center gap-1 font-mono">
                      <Fuel className="w-3.5 h-3.5 text-zinc-500" />
                      {detailJob.kilometraje.toLocaleString()} km
                    </span>
                  )}
                  {detailJob.nivelCombustible && (
                    <span className="flex items-center gap-1 text-amber-400 font-mono">
                      ⛽ Nivel: {detailJob.nivelCombustible}
                    </span>
                  )}
                </div>
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
                {STATUS_FLOW.map((s, i) => {
                  const meta = STATUS_META[s];
                  const Icon = meta.icon;
                  const idxCur = STATUS_FLOW.indexOf(detailJob.estado);
                  const done = STATUS_FLOW.indexOf(s) < idxCur;
                  const cur = s === detailJob.estado;
                  return (
                    <React.Fragment key={s}>
                      {i > 0 && (
                        <div
                          className={`h-px w-4 shrink-0 ${done || cur ? 'bg-brand-500' : 'bg-zinc-800'}`}
                        />
                      )}
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          cur
                            ? `${meta.bg} ${meta.color}`
                            : done
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                        }`}
                      >
                        {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                        <span className="hidden sm:inline">{meta.label}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Info Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4 text-zinc-500" />
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Cliente
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-200">{detailJob.clienteNombre}</p>
                  {detailJob.clienteTelefono && (
                    <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-brand-400" /> {detailJob.clienteTelefono}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Problema Reportado
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-3">{detailJob.problema}</p>
                </div>
              </div>

              {/* Banner autorización */}
              {detailJob.autorizacionEstado && (
                <div
                  className={`p-4 rounded-2xl border mb-6 ${
                    detailJob.autorizacionEstado === 'APROBADO'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : detailJob.autorizacionEstado === 'RECHAZADO'
                        ? 'bg-red-950/20 border-red-500/30'
                        : 'bg-amber-950/20 border-amber-500/30'
                  }`}
                >
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
                          {detailJob.autorizacionEstado === 'APROBADO' &&
                            'Presupuesto y diagnóstico APROBADOS por el cliente'}
                          {detailJob.autorizacionEstado === 'RECHAZADO' &&
                            'Presupuesto y diagnóstico RECHAZADOS por el cliente'}
                          {detailJob.autorizacionEstado === 'PENDIENTE_APROBACION' &&
                            'Presupuesto solicitado · Esperando aprobación del cliente en su app'}
                        </h4>
                      </div>
                      {detailJob.autorizacionDecididoEn && (
                        <p className="text-[11px] text-zinc-400 mt-1">
                          Decidido el: {new Date(detailJob.autorizacionDecididoEn).toLocaleString('es-VE')}
                        </p>
                      )}
                      {detailJob.autorizacionRechazoMotivo && (
                        <p className="text-xs text-red-300 mt-1">
                          Motivo de rechazo:{' '}
                          <span className="font-semibold">{detailJob.autorizacionRechazoMotivo}</span>
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
                        <Send className="w-3.5 h-3.5" />{' '}
                        {sendingWhatsApp ? 'Enviando...' : 'Reenviar WhatsApp'}
                      </button>
                    </div>
                  </div>
                  {detailJob.autorizacionFirma && (
                    <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-3">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">
                        Firma del cliente:
                      </span>
                      <img
                        src={detailJob.autorizacionFirma}
                        alt="Firma cliente"
                        className="h-10 bg-white rounded px-2 py-0.5 border border-zinc-700"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ETAPA 1: INGRESANDO */}
              {detailJob.estado === 'INGRESANDO' && (
                <div className="p-4 bg-zinc-950 border border-blue-500/20 rounded-2xl mb-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 text-[11px] font-extrabold text-blue-400">
                      1
                    </span>
                    <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-400" /> Ingreso del Vehículo
                    </h4>
                  </div>

                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Fuel className="w-4 h-4 text-amber-400" /> Nivel de Combustible al Recibir
                      </label>
                      {detailJob.combustibleRegistradoPor && (
                        <span className="text-[10px] text-zinc-500">
                          Registrado por{' '}
                          <span className="text-zinc-300 font-semibold">
                            {detailJob.combustibleRegistradoPor}
                          </span>
                          {detailJob.combustibleRegistradoEn &&
                            ` el ${new Date(detailJob.combustibleRegistradoEn).toLocaleDateString('es-VE')}`}
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

                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-blue-400" /> Foto del Tablero (Combustible y
                        Odómetro)
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
                        <img
                          src={detailJob.fotoTablero}
                          alt="Tablero del vehículo"
                          className="w-32 h-24 object-cover rounded-xl border border-zinc-700"
                        />
                        <div className="text-xs text-zinc-400 space-y-1">
                          <p className="text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Foto del tablero guardada
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Esta foto respalda el kilometraje y nivel de combustible registrado.
                          </p>
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
                        <span className="text-[11px] text-zinc-500">
                          Fotografía clara del velocímetro y aguja de combustible.
                        </span>
                      </div>
                    )}
                  </div>

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
                              <img
                                src={url}
                                alt=""
                                className="w-16 h-16 object-cover rounded-lg border border-zinc-800"
                              />
                              <button
                                onClick={() => handleRemoveImage(url, 'diagnosticoImagenes')}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-zinc-800/60">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">
                        Kilometraje al ingresar
                      </label>
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
              )}

              {/* ETAPA 2: CHECK_INICIAL */}
              {detailJob.estado === 'CHECK_INICIAL' && (
                <div className="p-4 bg-zinc-950 border border-amber-500/20 rounded-2xl mb-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-extrabold text-amber-400">
                      2
                    </span>
                    <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-amber-400" /> Check List — ¿Qué
                      servicios se realizarán?
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-500 -mt-3">
                    Selecciona uno o varios tipos de trabajo y agrega los servicios del catálogo con
                    su precio.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allWorkTags.map((t) => {
                      const on = tipoTrabajoSel.includes(t);
                      const isCustom = workTags.some((w) => w.toLowerCase() === t.toLowerCase());
                      return (
                        <button
                          key={t}
                          onClick={() => toggleTipoTrabajo(t)}
                          disabled={isMechanic}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            on
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-500'
                          } ${isMechanic ? 'cursor-default opacity-80' : ''}`}
                        >
                          {isCustom && <Tag className="w-3 h-3" />}
                          {t}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => {
                        if (!tipoTrabajoSel.includes('Otro')) toggleTipoTrabajo('Otro');
                      }}
                      disabled={isMechanic}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        tipoTrabajoSel.includes('Otro')
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-500'
                      } ${isMechanic ? 'cursor-default opacity-80' : ''}`}
                    >
                      Otro
                    </button>
                  </div>
                  {(tipoTrabajoSel.includes('Otro') || tipoTrabajoOtro) && (
                    <div className="mt-3 flex gap-2 items-end flex-wrap">
                      <div className="flex-1 min-w-[200px] space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase block">
                          Especificar tipo de trabajo
                        </label>
                        <input
                          value={tipoTrabajoOtro}
                          onChange={(e) => setTipoTrabajoOtro(e.target.value)}
                          onBlur={() => saveTipoTrabajo(tipoTrabajoSel, tipoTrabajoOtro)}
                          disabled={isMechanic}
                          placeholder="Ej: Pintura automotriz..."
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:border-amber-500 disabled:opacity-60"
                        />
                      </div>
                      {!isMechanic && (
                        <button
                          onClick={saveWorkTag}
                          disabled={!tipoTrabajoOtro.trim()}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-40 shrink-0"
                        >
                          <Save className="w-3.5 h-3.5" /> Guardar tag
                        </button>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-zinc-800">
                    <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-400" /> Servicios del catálogo (con
                      precio)
                    </h5>
                    {catalogServices.length === 0 ? (
                      <p className="text-[11px] text-zinc-500">
                        No hay servicios en el catálogo. Agrega servicios desde el perfil del taller.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                        {catalogServices.map((svc) => {
                          const already = serviciosRealizados.some((s) => s.nombre === svc.nombre);
                          return (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() => handleAddServicioFromCatalog(svc)}
                              disabled={already || !!addingServicioId || isMechanic}
                              className="flex items-center justify-between gap-2 p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left transition-colors disabled:opacity-50"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-200 truncate">
                                  {svc.nombre}
                                </p>
                                {svc.materialesSugeridos && svc.materialesSugeridos.length > 0 && (
                                  <p className="text-[10px] text-zinc-500 truncate">
                                    {svc.materialesSugeridos.length} insumos incluidos
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs font-mono font-bold text-emerald-400">
                                  ${Number(svc.precioReferencial || 0).toFixed(2)}
                                </span>
                                {already ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : addingServicioId === svc.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {serviciosRealizados.length > 0 && (
                    <div className="pt-3 border-t border-zinc-800">
                      <h5 className="text-xs font-bold text-zinc-300 mb-2">
                        Presupuesto estimado ({serviciosRealizados.length} servicios)
                      </h5>
                      <div className="space-y-1">
                        {serviciosRealizados.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between text-xs p-2 bg-zinc-900 border border-zinc-800 rounded-lg"
                          >
                            <span className="text-zinc-300">{s.nombre}</span>
                            <span className="font-mono text-zinc-400">
                              ${(Number(s.precio) || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] text-zinc-500">
                      {detailJob.autorizacionEstado === 'APROBADO'
                        ? 'El cliente aprobó el presupuesto desde su app.'
                        : detailJob.autorizacionEstado === 'RECHAZADO'
                          ? 'El cliente rechazó el presupuesto. Puedes ajustar y enviarlo de nuevo.'
                          : detailJob.autorizacionEstado === 'PENDIENTE_APROBACION'
                            ? 'Presupuesto solicitado · Esperando respuesta del cliente en su app.'
                            : 'Opcional: envía el presupuesto al cliente si surge un trabajo extra. No bloquea el flujo del vehículo.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRequestAppApproval}
                        disabled={
                          sendingWhatsApp ||
                          detailJob.autorizacionEstado === 'APROBADO' ||
                          !detailJob.requestId
                        }
                        title={
                          !detailJob.requestId
                            ? 'Este vehículo no tiene cliente con cuenta vinculada'
                            : undefined
                        }
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {sendingWhatsApp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {detailJob.autorizacionEstado === 'PENDIENTE_APROBACION'
                            ? 'Reenviar solicitud'
                            : 'Solicitar Aprobación al Cliente'}
                        </span>
                      </button>
                      <button
                        onClick={handleSendWhatsAppApproval}
                        disabled={sendingWhatsApp || !detailJob.clienteTelefono}
                        title={
                          !detailJob.clienteTelefono
                            ? 'Agrega el teléfono del cliente para enviar WhatsApp'
                            : 'Alternativa: enviar también por WhatsApp'
                        }
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WhatsApp (opcional)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 3: TRABAJANDO */}
              {detailJob.estado === 'TRABAJANDO' && (
                <div className="p-4 bg-zinc-950 border border-purple-500/20 rounded-2xl mb-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/30 text-[11px] font-extrabold text-purple-400">
                      3
                    </span>
                    <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-purple-400" /> Trabajando — Mecánicos y
                      Servicios
                    </h4>
                  </div>
                  {isMechanic && (
                    <p className="text-[11px] text-zinc-500 -mt-3">
                      Tu rol aquí: pulsa <span className="font-bold text-brand-400">Empezar</span>{' '}
                      al iniciar y <span className="font-bold text-red-400">Terminar</span> al
                      finalizar, sube hasta 5{' '}
                      <span className="font-bold text-zinc-300">fotos del arreglo</span> (cámara o
                      galería) y pide insumos o repuestos a almacén. Al terminar solo se guarda tu
                      hora de inicio y fin; las horas a pagar las registra el administrador al
                      finalizar el vehículo.
                    </p>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-purple-400" /> Mecánicos Asignados
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
                          <div
                            key={w.key}
                            className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl"
                          >
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-zinc-200 font-semibold">{w.nombre}</p>
                                {active && (
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-brand-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                                    EN CURSO
                                  </span>
                                )}
                                {w.horasReales != null && (
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    {w.horasReales} h
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-500">
                                {w.inicio
                                  ? `Inicio: ${new Date(w.inicio).toLocaleString('es-VE', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`
                                  : 'Sin iniciar'}
                                {w.fin
                                  ? ` · Fin: ${new Date(w.fin).toLocaleString('es-VE', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`
                                  : ''}
                              </p>
                            </div>
                            {canOperate && !w.inicio && (
                              <button
                                onClick={() => handleStartWork(w)}
                                className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Play className="w-3 h-3" /> Empezar
                              </button>
                            )}
                            {canOperate && active && (
                              <button
                                onClick={() => handleStopWork(w)}
                                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Square className="w-3 h-3" /> Terminar
                              </button>
                            )}
                            {!isMechanic && !w.inicio && (
                              <button
                                onClick={() => handleRemoveMecanico(w)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                                title="Quitar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!isMechanic && (
                      <div className="flex gap-2 items-end mb-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase">
                            Asignar mecánico
                          </label>
                          <select
                            value={assignUserId}
                            onChange={(e) => setAssignUserId(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-purple-500"
                          >
                            <option value="">Seleccionar mecánico...</option>
                            {teamUsers.map((u: any) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.role})
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={handleAsignarMecanico}
                          disabled={!assignUserId || savingDetail}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shrink-0 disabled:opacity-40 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Asignar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-purple-400" /> Fotos del arreglo
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ({(detailJob.imagenesTerminado || []).length}/5)
                        </span>
                      </label>
                      {uploading && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
                    </div>
                    {(detailJob.imagenesTerminado || []).length < 5 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2 border border-zinc-700">
                          <Camera className="w-4 h-4 text-purple-400" />
                          <span>Tomar foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, 'imagenesTerminado')}
                            disabled={uploading}
                          />
                        </label>
                        <label className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2 border border-zinc-700">
                          <ImageIcon className="w-4 h-4" />
                          <span>Subir de galería</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, 'imagenesTerminado')}
                            disabled={uploading}
                          />
                        </label>
                        <span className="text-[11px] text-zinc-500">
                          Se comprimen y convierten a WebP automáticamente.
                        </span>
                      </div>
                    )}
                    {(detailJob.imagenesTerminado || []).length === 0 ? (
                      <p className="text-[11px] text-zinc-500">
                        Sin fotos aún. Sube evidencia de los arreglos desde la cámara o la galería
                        (máx. 5). Aparecerán automáticamente en la etapa &quot;Terminado&quot;.
                      </p>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {(detailJob.imagenesTerminado || []).map((url, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={url}
                              alt=""
                              className="w-20 h-20 object-cover rounded-lg border border-zinc-800"
                            />
                            <button
                              onClick={() => handleRemoveImage(url, 'imagenesTerminado')}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isMechanic && (
                    <div className="pt-4 border-t border-zinc-800">
                      {renderServiciosEditor(!isMechanic)}
                    </div>
                  )}

                  <div className="pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                          <Package className="w-4 h-4 text-amber-400" /> Insumos / Repuestos —
                          Solicitudes a Almacén
                        </h4>
                        <p className="text-[11px] text-zinc-500">
                          El mecánico pide lo que necesita; al aprobarlo el jefe mecánico o el admin,
                          se descuenta del inventario general.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isMechanic && (
                          <button
                            type="button"
                            onClick={() => setIsLoadSuggestedOpen(true)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Cargar sugeridos de
                            servicio
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsMaterialReqOpen(true)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />{' '}
                          {isMechanic ? 'Pedir insumo / repuesto' : 'Pedir a Almacén'}
                        </button>
                      </div>
                    </div>

                    {!isMechanic && (
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">
                          Agregar insumo / repuesto del inventario
                        </p>
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex-1 min-w-[180px] space-y-1">
                            <select
                              value={partSearch}
                              onChange={(e) => setPartSearch(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs"
                            >
                              <option value="">-- Seleccionar item --</option>
                              {inventoryItems.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.nombre} (Stock: {inv.stock})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-20 space-y-1">
                            <input
                              type="number"
                              min="1"
                              value={newPartQty}
                              onChange={(e) => setNewPartQty(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-center"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const item = inventoryItems.find((i: any) => i.id === partSearch);
                              if (item) {
                                handleAddPartNeed(item);
                                setPartSearch('');
                              }
                            }}
                            disabled={!partSearch}
                            className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" /> Agregar
                          </button>
                        </div>
                      </div>
                    )}

                    {renderPartesTabla(!isMechanic)}

                    {materialRequests.length === 0 ? (
                      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-xs text-zinc-500">
                        No hay solicitudes de material pendientes para este vehículo.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {materialRequests.map((mr) => (
                          <div
                            key={mr.id}
                            className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-200 text-sm">
                                  {mr.inventoryItem?.nombre || 'Material'}
                                </span>
                                <span className="text-xs text-zinc-400 font-mono">
                                  Cant: {mr.cantidad}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    mr.estado === 'ENTREGADA'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                      : mr.estado === 'APROBADA'
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                        : mr.estado === 'RECHAZADA'
                                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  }`}
                                >
                                  {mr.estado}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 mt-1">
                                Solicitado por {mr.solicitadoPor || '—'}
                                {mr.aprobadoPor && ` · Aprobado por ${mr.aprobadoPor}`}
                                {mr.entregadoPor && ` · Entregado por ${mr.entregadoPor}`}
                                {mr.justificacion && ` · ${mr.justificacion}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {mr.estado === 'PENDIENTE' && canApproveMaterials && (
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
                              {mr.estado === 'APROBADA' && canDeliverMaterials && (
                                <button
                                  onClick={() => handleDeliverMaterialRequest(mr.id, mr.cantidad)}
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

              {/* ETAPA 4: TERMINADO */}
              {detailJob.estado === 'TERMINADO' && (
                <div className="p-4 bg-zinc-950 border border-emerald-500/20 rounded-2xl mb-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-extrabold text-emerald-400">
                        4
                      </span>
                      <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" /> Terminado — Parte Económico
                      </h4>
                    </div>
                    {!isMechanic && (
                      <div className="flex flex-wrap items-center gap-2">
                        {isWorkshopAdmin && (
                          <button
                            type="button"
                            onClick={() => setShowAdminPrevEdit((v) => !v)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 border transition-colors ${
                              showAdminPrevEdit
                                ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                            }`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            {showAdminPrevEdit
                              ? 'Ocultar datos anteriores'
                              : 'Editar datos anteriores'}
                          </button>
                        )}
                        {canAdjustCost && (
                          <button
                            type="button"
                            onClick={openCostModal}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-zinc-700"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-brand-400" /> Ajustar Costo /
                            Descuentos / IVA
                          </button>
                        )}
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

                  {isWorkshopAdmin && showAdminPrevEdit && (
                    <div className="p-4 bg-zinc-900 border border-brand-500/30 rounded-2xl space-y-4">
                      <h5 className="text-xs font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" /> Edición de datos de etapas anteriores (Admin)
                      </h5>

                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-zinc-400">Vehículo y Cliente</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={adminEditForm.marca}
                            onChange={(e) =>
                              setAdminEditForm((f) => ({ ...f, marca: e.target.value }))
                            }
                            placeholder="Marca"
                            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs"
                          />
                          <input
                            type="text"
                            value={adminEditForm.modelo}
                            onChange={(e) =>
                              setAdminEditForm((f) => ({ ...f, modelo: e.target.value }))
                            }
                            placeholder="Modelo"
                            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs"
                          />
                          <input
                            type="number"
                            min="1900"
                            value={adminEditForm.anio}
                            onChange={(e) =>
                              setAdminEditForm((f) => ({ ...f, anio: e.target.value }))
                            }
                            placeholder="Año"
                            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono"
                          />
                          <input
                            type="text"
                            value={adminEditForm.placa}
                            onChange={(e) =>
                              setAdminEditForm((f) => ({ ...f, placa: e.target.value }))
                            }
                            placeholder="Placa"
                            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono uppercase"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={adminEditForm.clienteNombre}
                            onChange={(e) =>
                              setAdminEditForm((f) => ({ ...f, clienteNombre: e.target.value }))
                            }
                            placeholder="Cliente"
                            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs"
                          />
                          <input
                            type="tel"
                            value={adminEditForm.clienteTelefono}
                            onChange={(e) =>
                              setAdminEditForm((f) => ({ ...f, clienteTelefono: e.target.value }))
                            }
                            placeholder="Teléfono"
                            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs"
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={adminEditForm.problema}
                          onChange={(e) =>
                            setAdminEditForm((f) => ({ ...f, problema: e.target.value }))
                          }
                          placeholder="Problema reportado"
                          className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs resize-none"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={saveAdminDatosBasicos}
                            disabled={savingAdminDatos}
                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />{' '}
                            {savingAdminDatos ? 'Guardando...' : 'Guardar vehículo/cliente'}
                          </button>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase">
                            Kilometraje
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={kmInput}
                              onChange={(e) => setKmInput(e.target.value)}
                              placeholder="125000"
                              className="w-32 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={handleSaveKm}
                              disabled={savingKm || !kmInput.trim()}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                            >
                              {savingKm ? 'Guardando...' : 'Guardar Km'}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase">
                            Nivel de Combustible
                          </label>
                          <div className="grid grid-cols-5 gap-1">
                            {FUEL_LEVELS.map((fl) => (
                              <button
                                key={fl.key}
                                type="button"
                                onClick={() => handleSelectFuelLevel(fl.key)}
                                className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold ${
                                  detailJob.nivelCombustible === fl.key
                                    ? `${fl.color} ring-1 ring-amber-400`
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                                }`}
                              >
                                {fl.key}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase">
                            Diagnóstico Mecánico
                          </label>
                          <button
                            type="button"
                            onClick={() => saveDiagnostico()}
                            disabled={savingDiagnostico}
                            className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" /> Guardar diagnóstico
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={diagnosticoInput}
                          onChange={(e) => setDiagnosticoInput(e.target.value)}
                          onBlur={() => saveDiagnostico()}
                          placeholder="Diagnóstico..."
                          className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs resize-none"
                        />
                      </div>

                      <div className="pt-3 border-t border-zinc-800 space-y-2">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase block">
                          Tipo de Trabajo
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {allWorkTags.map((t) => {
                            const on = tipoTrabajoSel.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => toggleTipoTrabajo(t)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                  on
                                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={tipoTrabajoOtro}
                            onChange={(e) => setTipoTrabajoOtro(e.target.value)}
                            onBlur={() => saveTipoTrabajo(tipoTrabajoSel, tipoTrabajoOtro)}
                            placeholder="Otro tipo de trabajo..."
                            className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {renderServiciosEditor(!isMechanic)}
                  {renderHorasEditables()}
                  <div>
                    {renderPartesTabla(!isMechanic, isWorkshopAdmin)}
                    {isWorkshopAdmin && (
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">
                          Agregar pieza o insumo (Admin)
                        </p>
                        <div className="flex flex-wrap items-end gap-2">
                          <input
                            type="text"
                            value={customPartName}
                            onChange={(e) => setCustomPartName(e.target.value)}
                            placeholder="Nombre de pieza o insumo"
                            className="flex-1 min-w-[160px] px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs"
                          />
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={customPartQty}
                            onChange={(e) => setCustomPartQty(e.target.value)}
                            placeholder="Cant."
                            className="w-16 px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-center"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={customPartPrice}
                            onChange={(e) => setCustomPartPrice(e.target.value)}
                            placeholder="Precio U. ($)"
                            className="w-28 px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-xs font-mono text-right"
                          />
                          <label className="flex items-center gap-1.5 text-xs text-zinc-400 px-2 py-1.5">
                            <input
                              type="checkbox"
                              checked={customPartEsInsumo}
                              onChange={(e) => setCustomPartEsInsumo(e.target.checked)}
                              className="rounded border-zinc-700 bg-zinc-950"
                            />
                            Insumo
                          </label>
                          <button
                            type="button"
                            onClick={handleAddCustomPartNeed}
                            disabled={!customPartName.trim()}
                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" /> Agregar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {renderTotalesCompleto()}

                  <div className="pt-3 border-t border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-emerald-400" /> Conclusiones de
                        Observaciones (opcional)
                      </label>
                      <div className="flex items-center gap-2">
                        <VoiceDictationButton
                          onTranscript={(text) => {
                            const next = (conclusionesInput ? conclusionesInput + ' ' : '') + text;
                            setConclusionesInput(next);
                            saveConclusiones(next);
                          }}
                          disabled={isMechanic}
                          title="Dictar conclusiones de entrega por voz"
                        />
                        <button
                          type="button"
                          onClick={() => saveConclusiones()}
                          disabled={savingConclusiones}
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
                      disabled={isMechanic}
                      rows={2}
                      placeholder="Recomendaciones para el cliente, mantenimiento preventivo sugerido para el próximo servicio..."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-brand-500 resize-none disabled:opacity-60"
                    />
                  </div>

                  <div className="pt-3 border-t border-zinc-800 space-y-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Fotos del vehículo terminado (máx. 5)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, 'imagenesTerminado')}
                      className="w-full text-xs text-zinc-400"
                      disabled={uploading}
                    />
                    {detailJob.imagenesTerminado && detailJob.imagenesTerminado.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {detailJob.imagenesTerminado.map((url, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={url}
                              alt=""
                              className="w-16 h-16 object-cover rounded-lg border border-zinc-800"
                            />
                            <button
                              onClick={() => handleRemoveImage(url, 'imagenesTerminado')}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ETAPA 5: SALIDA */}
              {detailJob.estado === 'SALIDA' && (
                <div className="p-4 bg-zinc-950 border border-orange-500/20 rounded-2xl mb-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/10 border border-orange-500/30 text-[11px] font-extrabold text-orange-400">
                      5
                    </span>
                    <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-orange-400" /> Salida — Firma del Cliente
                    </h4>
                  </div>

                  {renderTotalesCompleto()}

                  <div className="pt-3 border-t border-zinc-800">
                    <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-2">
                      <PenTool className="w-3.5 h-3.5 text-orange-400" /> Firma de Retiro del
                      Cliente
                    </h5>
                    {detailJob.firmaDigital ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={detailJob.firmaDigital}
                          alt="Firma cliente salida"
                          className="h-16 bg-white rounded-lg p-1 border border-zinc-700"
                        />
                        <button
                          onClick={() => {
                            setSigTarget('salida');
                            setSignatureOpen(true);
                          }}
                          className="text-xs text-zinc-400 underline hover:text-zinc-200"
                        >
                          Cambiar firma
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSigTarget('salida');
                          setSignatureOpen(true);
                        }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-zinc-700"
                      >
                        <PenTool className="w-3.5 h-3.5 text-orange-400" /> Capturar firma en
                        pantalla táctil
                      </button>
                    )}
                  </div>

                  {conclusionesInput && (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">
                        Conclusiones de observaciones
                      </p>
                      <p className="text-xs text-zinc-300">{conclusionesInput}</p>
                    </div>
                  )}

                  {detailJob.imagenesTerminado && detailJob.imagenesTerminado.length > 0 && (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">
                        Fotos del vehículo terminado
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {detailJob.imagenesTerminado.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="w-16 h-16 object-cover rounded-lg border border-zinc-800"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {!isMechanic && detailJob.clienteTelefono && (
                    <div className="pt-3 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={handleSendWhatsAppReady}
                        disabled={sendingReadyWhatsApp}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingReadyWhatsApp ? 'Enviando...' : 'WhatsApp: Vehículo Listo'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ETAPA 6: FINALIZADO */}
              {detailJob.estado === 'FINALIZADO' && (
                <div className="p-4 bg-zinc-950 border border-emerald-500/20 rounded-2xl mb-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-extrabold text-emerald-400">
                      6
                    </span>
                    <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Finalizado — Orden
                      Cerrada
                    </h4>
                  </div>

                  {renderTotalesCompleto()}

                  {detailJob.firmaDigital && (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">
                        Firma del cliente
                      </p>
                      <img
                        src={detailJob.firmaDigital}
                        alt="Firma cliente"
                        className="h-16 bg-white rounded-lg p-1 border border-zinc-700"
                      />
                    </div>
                  )}

                  {conclusionesInput && (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">
                        Conclusiones de observaciones
                      </p>
                      <p className="text-xs text-zinc-300">{conclusionesInput}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-zinc-800 flex justify-end">
                    <button
                      onClick={() => onOpenReport(detailJob.id)}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar parte de servicio (PDF)
                    </button>
                  </div>
                </div>
              )}

              {/* Historial de estados */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl mb-6">
                <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-zinc-500" /> Historial de estados
                </h4>
                {detailLogs.length === 0 ? (
                  <p className="text-xs text-zinc-500">No hay registros de transiciones.</p>
                ) : (
                  <div className="space-y-3">
                    {detailLogs.map((log) => {
                      const logMeta = STATUS_META[log.estado] || STATUS_META.INGRESANDO;
                      const LogIcon = logMeta.icon;
                      return (
                        <div key={log.id} className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${logMeta.bg} border`}
                          >
                            <LogIcon className={`w-4 h-4 ${logMeta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${logMeta.color}`}>
                                {logMeta.label}
                              </span>
                              <span className="text-[10px] text-zinc-600">
                                {new Date(log.createdAt).toLocaleString('es-VE', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {log.firmaUsuarioNombre && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <User className="w-3 h-3 text-zinc-600" />
                                <span className="text-[10px] text-zinc-500">
                                  Firmado por{' '}
                                  <span className="font-semibold text-zinc-400">
                                    {log.firmaUsuarioNombre}
                                  </span>
                                  {log.firmaUsuarioRol && (
                                    <span className="px-1.5 py-0.5 bg-zinc-800 rounded-full text-zinc-500 ml-1">
                                      {log.firmaUsuarioRol}
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
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

              {/* Pie */}
              {!isMechanic && (
                <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end gap-3 flex-wrap">
                  {detailJob.estado === 'FINALIZADO' && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenStatusModal(detailJob);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Reabrir vehículo
                    </button>
                  )}
                  {STATUS_META[detailJob.estado]?.next &&
                    (() => {
                      const faltaKm = detailJob.estado === 'INGRESANDO' && !detailJob.kilometraje;
                      return (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenStatusModal(detailJob);
                          }}
                          disabled={faltaKm}
                          title={faltaKm ? 'Primero registra el kilometraje de ingreso' : undefined}
                          className={`px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2 ${
                            faltaKm ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <span>
                            Avanzar a {STATUS_META[STATUS_META[detailJob.estado].next!].label}
                          </span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      );
                    })()}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenEdit(detailJob);
                    }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Editar datos
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <MaterialRequestModal
        open={isMaterialReqOpen}
        inventoryItems={inventoryItems}
        matReqItemId={matReqItemId}
        matReqQty={matReqQty}
        matReqNotas={matReqNotas}
        savingMatReq={savingMatReq}
        onItemChange={setMatReqItemId}
        onQtyChange={setMatReqQty}
        onNotasChange={setMatReqNotas}
        onClose={() => setIsMaterialReqOpen(false)}
        onSubmit={handleCreateMaterialRequest}
      />
      <SuggestedMaterialsModal
        open={isLoadSuggestedOpen}
        catalogServices={catalogServices}
        onSelect={handleLoadSuggestedMaterials}
        onClose={() => setIsLoadSuggestedOpen(false)}
      />
      <CostAdjustmentModal
        open={costModalOpen}
        editPrecioServicio={editPrecioServicio}
        editDescuentoTipo={editDescuentoTipo}
        editDescuentoValor={editDescuentoValor}
        editAplicaIva={editAplicaIva}
        costJustification={costJustification}
        costAudits={costAudits}
        savingCost={savingCost}
        onPrecioChange={setEditPrecioServicio}
        onDescuentoTipoChange={setEditDescuentoTipo}
        onDescuentoValorChange={setEditDescuentoValor}
        onAplicaIvaChange={setEditAplicaIva}
        onJustificationChange={setCostJustification}
        onClose={() => setCostModalOpen(false)}
        onSave={handleSaveCostAdjustment}
      />
      <SignatureModal
        open={signatureOpen}
        sigTarget={sigTarget}
        job={detailJob}
        onClose={() => setSignatureOpen(false)}
        onSave={handleSaveSignature}
      />
    </>
  );
}

