import {
  Car,
  ClipboardList,
  Wrench,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export interface ServicioRealizado {
  id: string;
  nombre: string;
  precio: number;
}

export interface Worklog {
  key: string;
  userId: string;
  nombre: string;
  inicio?: string | null;
  fin?: string | null;
  horasReales?: number | null;
  tarifaHora?: number | null;
}

export interface JobLog {
  id: string;
  estado: string;
  observaciones?: string;
  firmaUsuarioId?: string;
  firmaUsuarioNombre?: string;
  firmaUsuarioRol?: string;
  createdAt: string;
}

export interface Checkpoint {
  id: string;
  servicio: string;
  checked: boolean;
  notas?: string;
}

export interface PartNeed {
  id: string;
  nombre: string;
  cantidad: number;
  esInsumo: boolean;
  yaUsado: boolean;
  precioUnitario?: number | null;
  yaUsadoEn?: string | null;
  usadoPorNombre?: string | null;
  inventoryItemId?: string;
  inventoryItem?: { id: string; nombre: string; stock: number; precioUnitario?: number | null };
}

export interface MaterialRequest {
  id: string;
  cantidad: number;
  cantidadEntregada?: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ENTREGADA' | 'CANCELADA';
  justificacion?: string | null;
  solicitadoPor?: string;
  aprobadoPor?: string | null;
  entregadoPor?: string | null;
  createdAt: string;
  inventoryItem?: { id: string; nombre: string; stock: number; unidad?: string } | null;
}

export interface CostAudit {
  id: string;
  precioAnterior: number;
  precioNuevo: number;
  userId?: string;
  userName?: string;
  justificacion: string;
  createdAt: string;
}

export interface WorkshopJob {
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
  precioManoObra?: number | null;
  horasTrabajadasFinal?: number | null;
  fechaPagoHoras?: string | null;
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

export interface JobFormData {
  marca: string;
  modelo: string;
  anio: string;
  placa: string;
  kilometraje: string;
  problema: string;
  clienteNombre: string;
  clienteTelefono: string;
}

export const EMPTY_FORM: JobFormData = {
  marca: '',
  modelo: '',
  anio: '',
  placa: '',
  kilometraje: '',
  problema: '',
  clienteNombre: '',
  clienteTelefono: '',
};

export const STATUS_FLOW = [
  'INGRESANDO',
  'CHECK_INICIAL',
  'TRABAJANDO',
  'TERMINADO',
  'SALIDA',
  'FINALIZADO',
];

export const STATUS_META: Record<
  string,
  { label: string; icon: any; color: string; bg: string; next?: string }
> = {
  INGRESANDO: {
    label: 'Ingresando',
    icon: Car,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    next: 'CHECK_INICIAL',
  },
  CHECK_INICIAL: {
    label: 'Check List',
    icon: ClipboardList,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    next: 'TRABAJANDO',
  },
  TRABAJANDO: {
    label: 'Trabajando',
    icon: Wrench,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    next: 'TERMINADO',
  },
  TERMINADO: {
    label: 'Terminado',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    next: 'SALIDA',
  },
  SALIDA: {
    label: 'Salida',
    icon: ArrowRight,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    next: 'FINALIZADO',
  },
  FINALIZADO: {
    label: 'Finalizado',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
};

export const TRABAJOS_TIPOS = [
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

export const FUEL_LEVELS = [
  { key: 'EMPTY', label: 'E (Vacío)', color: 'text-red-400 border-red-500/40 bg-red-500/10' },
  { key: '1/4', label: '1/4', color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
  { key: '1/2', label: '1/2', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { key: '3/4', label: '3/4', color: 'text-lime-400 border-lime-500/40 bg-lime-500/10' },
  { key: 'FULL', label: 'F (Lleno)', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
];

export function prevStatusOf(estado: string): string | null {
  const i = STATUS_FLOW.indexOf(estado);
  return i > 0 ? STATUS_FLOW[i - 1] : null;
}

export function calcJobTotals(
  detailJob: WorkshopJob | null,
  serviciosRealizados: ServicioRealizado[],
  partNeeds: PartNeed[],
  exchangeRate: number,
) {
  const baseServ = (serviciosRealizados || []).length
    ? serviciosRealizados.reduce((s, x) => s + (Number(x.precio) || 0), 0)
    : Number(detailJob?.precioServicio) || 0;
  const baseRep = (partNeeds || []).reduce(
    (s, p) => s + (Number(p.precioUnitario) || 0) * p.cantidad,
    0,
  );
  const baseMO = Number(detailJob?.precioManoObra) || 0;
  const subtotal = baseServ + baseMO + baseRep;

  let descMonto = 0;
  if (detailJob?.descuentoTipo === 'PORCENTAJE') {
    descMonto = (subtotal * (detailJob.descuentoValor || 0)) / 100;
  } else if (detailJob?.descuentoTipo === 'FIJO') {
    descMonto = detailJob.descuentoValor || 0;
  }
  if (descMonto > subtotal) descMonto = subtotal;

  const baseImponible = subtotal - descMonto;
  const ivaMonto = detailJob?.aplicaIva
    ? (baseImponible * (detailJob.porcentajeIva || 13)) / 100
    : 0;
  const totalUsd = baseImponible + ivaMonto;
  const rate = detailJob?.tipoCambioAplicado || exchangeRate || 11.86;
  const totalBob = totalUsd * rate;

  return {
    baseServ,
    baseMO,
    baseRep,
    subtotal,
    descMonto,
    ivaMonto,
    totalUsd,
    totalBob,
    rate,
  };
}

