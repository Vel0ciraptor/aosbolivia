// Fases por las que pasa el vehículo en el taller (mismo orden que el CRM)
export const PHASES = [
  { key: 'INGRESANDO', label: 'Ingreso al taller', desc: 'Tu vehículo fue recibido en el taller' },
  { key: 'CHECK_INICIAL', label: 'Inspección inicial', desc: 'El taller realiza el check y diagnóstico' },
  { key: 'TRABAJANDO', label: 'En reparación', desc: 'Los mecánicos están trabajando en tu vehículo' },
  { key: 'TERMINADO', label: 'Reparación terminada', desc: 'El trabajo está listo, falta la entrega' },
  { key: 'SALIDA', label: 'Proceso de salida', desc: 'Preparando documentos y entrega' },
  { key: 'FINALIZADO', label: 'Vehículo entregado', desc: 'Proceso completado' },
];

export const PHASE_INDEX: Record<string, number> = PHASES.reduce(
  (acc, p, i) => ({ ...acc, [p.key]: i }),
  {} as Record<string, number>,
);

export const PHASE_META: Record<string, { label: string; color: string; bg: string }> = {
  INGRESANDO: { label: 'Ingreso', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  CHECK_INICIAL: { label: 'Inspección', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  TRABAJANDO: { label: 'En reparación', color: 'text-brand-400', bg: 'bg-brand-500/10 border-brand-500/20' },
  TERMINADO: { label: 'Terminado', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  SALIDA: { label: 'En salida', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  FINALIZADO: { label: 'Entregado', color: 'text-zinc-300', bg: 'bg-zinc-500/10 border-zinc-500/20' },
};

export function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
