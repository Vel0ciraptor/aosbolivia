'use client';

import React, { useRef } from 'react';
import SignaturePad, { SignaturePadHandle } from '../../../../../components/SignaturePad';
import {
  Package,
  X,
  Sparkles,
  DollarSign,
  AlertCircle,
  PenTool,
} from 'lucide-react';
import { CostAudit, WorkshopJob } from '../types';

interface MaterialRequestModalProps {
  open: boolean;
  inventoryItems: any[];
  matReqItemId: string;
  matReqQty: string;
  matReqNotas: string;
  savingMatReq: boolean;
  onItemChange: (v: string) => void;
  onQtyChange: (v: string) => void;
  onNotasChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function MaterialRequestModal({
  open,
  inventoryItems,
  matReqItemId,
  matReqQty,
  matReqNotas,
  savingMatReq,
  onItemChange,
  onQtyChange,
  onNotasChange,
  onClose,
  onSubmit,
}: MaterialRequestModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" /> Solicitar Material / Insumo a Almacén
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">
              Seleccionar del inventario del taller <span className="text-red-400">*</span>
            </label>
            <select
              value={matReqItemId}
              onChange={(e) => onItemChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs"
            >
              <option value="">-- Seleccionar material o insumo --</option>
              {inventoryItems.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.nombre} (Stock: {inv.stock} {inv.unidad || ''}) - $
                  {Number(inv.precioUnitario).toFixed(2)}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-zinc-500">
              La solicitud quedará PENDIENTE hasta que el jefe mecánico o el admin la apruebe; al
              aprobarla se descuenta del inventario general.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Cantidad</label>
            <input
              type="number"
              min="1"
              value={matReqQty}
              onChange={(e) => onQtyChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">
              Justificación / Notas para Almacén
            </label>
            <textarea
              value={matReqNotas}
              onChange={(e) => onNotasChange(e.target.value)}
              rows={2}
              placeholder="Detalles sobre especificación o urgencia..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={savingMatReq || !matReqItemId}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              {savingMatReq ? 'Enviando...' : 'Crear Solicitud'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SuggestedMaterialsModalProps {
  open: boolean;
  catalogServices: any[];
  onSelect: (serviceId: string) => void;
  onClose: () => void;
}

export function SuggestedMaterialsModal({
  open,
  catalogServices,
  onSelect,
  onClose,
}: SuggestedMaterialsModalProps) {
  if (!open) return null;
  const withMaterials = catalogServices.filter(
    (s) => s.materialesSugeridos && s.materialesSugeridos.length > 0,
  );
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> Cargar Materiales Predefinidos de Servicio
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Seleccione un servicio de su catálogo que tenga insumos o repuestos predefinidos para
          añadirlos automáticamente:
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {withMaterials.length === 0 ? (
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-xs text-zinc-500">
              Ningún servicio tiene insumos predefinidos configurados en el catálogo.
            </div>
          ) : (
            withMaterials.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="w-full text-left p-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors"
              >
                <p className="text-xs font-bold text-zinc-200">{s.nombre}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {s.materialesSugeridos.length} insumos predefinidos:{' '}
                  {s.materialesSugeridos.map((m: any) => `${m.cantidad || 1}x ${m.nombre}`).join(', ')}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end pt-4 border-t border-zinc-800 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

interface CostAdjustmentModalProps {
  open: boolean;
  editPrecioServicio: string;
  editDescuentoTipo: 'NINGUNO' | 'PORCENTAJE' | 'FIJO';
  editDescuentoValor: string;
  editAplicaIva: boolean;
  costJustification: string;
  costAudits: CostAudit[];
  savingCost: boolean;
  onPrecioChange: (v: string) => void;
  onDescuentoTipoChange: (v: 'NINGUNO' | 'PORCENTAJE' | 'FIJO') => void;
  onDescuentoValorChange: (v: string) => void;
  onAplicaIvaChange: (v: boolean) => void;
  onJustificationChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function CostAdjustmentModal({
  open,
  editPrecioServicio,
  editDescuentoTipo,
  editDescuentoValor,
  editAplicaIva,
  costJustification,
  costAudits,
  savingCost,
  onPrecioChange,
  onDescuentoTipoChange,
  onDescuentoValorChange,
  onAplicaIvaChange,
  onJustificationChange,
  onClose,
  onSave,
}: CostAdjustmentModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-400" /> Ajustar Costo, Descuento e IVA
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">
              Precio base del servicio ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editPrecioServicio}
              onChange={(e) => onPrecioChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Tipo de Descuento</label>
              <select
                value={editDescuentoTipo}
                onChange={(e: any) => onDescuentoTipoChange(e.target.value)}
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
                  onChange={(e) => onDescuentoValorChange(e.target.value)}
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
              onChange={(e) => onAplicaIvaChange(e.target.checked)}
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
              onChange={(e) => onJustificationChange(e.target.value)}
              rows={2}
              placeholder="Ej: Descuento especial por cliente frecuente acordado con administración..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-xs resize-none"
            />
          </div>
          {costAudits.length > 0 && (
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">
                Historial de auditoría de costos
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {costAudits.map((a) => (
                  <div
                    key={a.id}
                    className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-400"
                  >
                    <div className="flex justify-between font-semibold text-zinc-300">
                      <span>{a.userName || 'Usuario'}</span>
                      <span>
                        ${Number(a.precioAnterior).toFixed(2)} → ${Number(a.precioNuevo).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-zinc-500 mt-0.5">{a.justificacion}</p>
                    <p className="text-zinc-600 mt-0.5 text-[10px]">
                      {new Date(a.createdAt).toLocaleDateString('es-VE')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={savingCost || !costJustification.trim()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              {savingCost ? 'Guardando...' : 'Aplicar y Auditar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SignatureModalProps {
  open: boolean;
  sigTarget: 'salida' | 'ingreso';
  job: WorkshopJob | null;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void>;
}

export function SignatureModal({
  open,
  sigTarget,
  job,
  onClose,
  onSave,
}: SignatureModalProps) {
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  if (!open || !job) return null;

  const handleSave = async () => {
    if (!signaturePadRef.current) return;
    const dataUrl = signaturePadRef.current.toDataURL();
    if (!dataUrl) return;
    await onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-zinc-200 mb-1 flex items-center gap-2 pr-8">
          <PenTool className="w-5 h-5 text-zinc-400" />{' '}
          {sigTarget === 'ingreso' ? 'Firma de ingreso' : 'Firma de salida del cliente'}
        </h3>
        <p className="text-[11px] text-zinc-500 mb-3">
          Firme con el dedo en pantallas táctiles o con el mouse. Puede hacerlo ahora mismo desde el
          celular o tablet.
        </p>
        <div className="bg-white rounded-xl p-2 mb-4 shadow-inner">
          <SignaturePad ref={signaturePadRef} width={600} height={300} className="h-56 sm:h-64" />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => signaturePadRef.current?.clear()}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl"
          >
            Limpiar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl"
          >
            Guardar firma
          </button>
        </div>
      </div>
    </div>
  );
}

