-- Mano de obra fija por vehículo (monto que ve el cliente; no se calcula por horas)
ALTER TABLE "workshop_jobs" ADD COLUMN "precioManoObra" DECIMAL(65,30);

-- Control interno de pago de horas (solo admin; NUNCA va al PDF del cliente)
ALTER TABLE "workshop_jobs" ADD COLUMN "horasTrabajadasFinal" DECIMAL(65,30);
ALTER TABLE "workshop_jobs" ADD COLUMN "fechaPagoHoras" TIMESTAMP(3);
