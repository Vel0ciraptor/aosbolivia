'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { Car, Plus, Trash2, X, AlertCircle, Fuel, Settings, Calendar } from 'lucide-react';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  motor?: string;
  combustible?: string;
  placa?: string;
  vin?: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [motor, setMotor] = useState('');
  const [combustible, setCombustible] = useState('Gasolina');
  const [placa, setPlaca] = useState('');
  const [vin, setVin] = useState('');

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenModal = () => {
    setMarca('');
    setModelo('');
    setAnio(new Date().getFullYear());
    setMotor('');
    setCombustible('Gasolina');
    setPlaca('');
    setVin('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!marca || !modelo || !anio) {
      setFormError('Por favor complete los campos requeridos (Marca, Modelo y Año)');
      return;
    }

    try {
      await api.post('/vehicles', {
        marca,
        modelo,
        anio: Number(anio),
        motor: motor || undefined,
        combustible: combustible || undefined,
        placa: placa || undefined,
        vin: vin || undefined
      });
      setIsModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al guardar el vehículo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este vehículo?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      fetchVehicles();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Mis Vehículos</h2>
          <p className="text-sm text-zinc-400">Registra tus vehículos para cotizar repuestos o servicios de forma más rápida.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 text-zinc-950 font-bold rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-indigo-500/10 transition-all transform active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Vehículo</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Car className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-zinc-300 text-base">No hay vehículos registrados</h3>
          <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
            Registra tu primer carro para que nuestro chatbot de IA y los proveedores puedan identificar la compatibilidad exacta de los repuestos.
          </p>
          <button
            onClick={handleOpenModal}
            className="mt-4 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold border border-zinc-800 rounded-xl transition-colors text-sm"
          >
            Registrar vehículo ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between hover:border-zinc-700/80 transition-all relative overflow-hidden group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-200 text-base">{v.marca} {v.modelo}</h4>
                      <span className="text-[10px] text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {v.placa || 'Sin placa'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-2 bg-zinc-950/30 hover:bg-red-950/20 hover:text-red-400 border border-zinc-800/80 hover:border-red-900/30 rounded-xl text-zinc-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-2 border-t border-zinc-800/60">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Año: <strong>{v.anio}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Motor: <strong>{v.motor || 'N/A'}</strong></span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="truncate">Combustible: <strong>{v.combustible || 'N/A'}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative p-6 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-zinc-200 mb-2">Registrar Nuevo Vehículo</h3>
            <p className="text-xs text-zinc-500 mb-6">Ingresa los datos correspondientes para identificar tu vehículo.</p>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/30 border border-red-800/50 rounded-xl flex items-start gap-2 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 block">Marca *</label>
                  <input
                    type="text"
                    placeholder="Toyota"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 block">Modelo *</label>
                  <input
                    type="text"
                    placeholder="Hilux"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 block">Año *</label>
                  <input
                    type="number"
                    placeholder="2019"
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 block">Motor (Ej: 2.8 TDI)</label>
                  <input
                    type="text"
                    placeholder="2.8 TDI"
                    value={motor}
                    onChange={(e) => setMotor(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 block">Combustible</label>
                  <select
                    value={combustible}
                    onChange={(e) => setCombustible(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm"
                  >
                    <option value="Gasolina">Gasolina</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hibrido">Híbrido</option>
                    <option value="Electrico">Eléctrico</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 block">Placa</label>
                  <input
                    type="text"
                    placeholder="ABC-123"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 block">VIN (Número de Chasis)</label>
                  <input
                    type="text"
                    placeholder="17 dígitos..."
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-100 transition-colors text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-300 text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-zinc-950 font-bold rounded-xl text-sm transition-all"
                >
                  Guardar Vehículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
