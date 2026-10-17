-- AlterTable requests
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "modalidad" TEXT NOT NULL DEFAULT 'PROGRAMADO';

-- AlterTable workshop_services
ALTER TABLE "workshop_services" ADD COLUMN IF NOT EXISTS "codigo" TEXT,
ADD COLUMN IF NOT EXISTS "categoria" TEXT,
ADD COLUMN IF NOT EXISTS "duracionEstimada" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "materialesSugeridos" JSONB;

-- AlterTable workshop_jobs
ALTER TABLE "workshop_jobs" ADD COLUMN IF NOT EXISTS "nivelCombustible" TEXT,
ADD COLUMN IF NOT EXISTS "combustibleRegistradoPor" TEXT,
ADD COLUMN IF NOT EXISTS "combustibleRegistradoEn" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "fotoTablero" TEXT,
ADD COLUMN IF NOT EXISTS "diagnosticoMecanico" TEXT,
ADD COLUMN IF NOT EXISTS "diagnosticoImagenes" JSONB,
ADD COLUMN IF NOT EXISTS "autorizacionEstado" TEXT NOT NULL DEFAULT 'SIN_SOLICITAR',
ADD COLUMN IF NOT EXISTS "autorizacionToken" TEXT,
ADD COLUMN IF NOT EXISTS "autorizacionTokenExpira" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "autorizacionPresupuesto" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "autorizacionDecididoEn" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "autorizacionIpCliente" TEXT,
ADD COLUMN IF NOT EXISTS "autorizacionUserAgent" TEXT,
ADD COLUMN IF NOT EXISTS "autorizacionFirma" TEXT,
ADD COLUMN IF NOT EXISTS "autorizacionRechazoMotivo" TEXT,
ADD COLUMN IF NOT EXISTS "conclusionesEntrega" TEXT,
ADD COLUMN IF NOT EXISTS "descuentoTipo" TEXT,
ADD COLUMN IF NOT EXISTS "descuentoValor" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "aplicaIva" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "porcentajeIva" DECIMAL(65,30) DEFAULT 13,
ADD COLUMN IF NOT EXISTS "tipoCambioAplicado" DECIMAL(65,30);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workshop_jobs_autorizacionToken_key" ON "workshop_jobs"("autorizacionToken");

-- AlterTable inventory_items
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "sku" TEXT,
ADD COLUMN IF NOT EXISTS "precioCosto" DECIMAL(65,30) DEFAULT 0;

-- CreateTable workshop_job_cost_audits
CREATE TABLE IF NOT EXISTS "workshop_job_cost_audits" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "precioAnterior" DECIMAL(65,30) NOT NULL,
    "precioNuevo" DECIMAL(65,30) NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "justificacion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshop_job_cost_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable workshop_material_requests
CREATE TABLE IF NOT EXISTS "workshop_material_requests" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "servicioId" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "cantidadEntregada" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "justificacion" TEXT,
    "solicitadoPorId" TEXT NOT NULL,
    "solicitadoPor" TEXT NOT NULL,
    "aprobadoPorId" TEXT,
    "aprobadoPor" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "entregadoPorId" TEXT,
    "entregadoPor" TEXT,
    "entregadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_material_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable inventory_movements
CREATE TABLE IF NOT EXISTS "inventory_movements" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stockAnterior" INTEGER NOT NULL,
    "stockNuevo" INTEGER NOT NULL,
    "jobId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable exchange_rate_logs
CREATE TABLE IF NOT EXISTS "exchange_rate_logs" (
    "id" TEXT NOT NULL,
    "compraBlue" DECIMAL(65,30) NOT NULL,
    "ventaBlue" DECIMAL(65,30) NOT NULL,
    "oficial" DECIMAL(65,30) NOT NULL,
    "fuente" TEXT NOT NULL DEFAULT 'api.dolarbluebolivia.click',
    "fechaEfectiva" TIMESTAMP(3) NOT NULL,
    "consultadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rate_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable whatsapp_message_logs
CREATE TABLE IF NOT EXISTS "whatsapp_message_logs" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "enviadoPorId" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "exitoso" BOOLEAN NOT NULL,
    "respuestaApi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "workshop_job_cost_audits" DROP CONSTRAINT IF EXISTS "workshop_job_cost_audits_jobId_fkey";
ALTER TABLE "workshop_job_cost_audits" ADD CONSTRAINT "workshop_job_cost_audits_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "workshop_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_material_requests" DROP CONSTRAINT IF EXISTS "workshop_material_requests_jobId_fkey";
ALTER TABLE "workshop_material_requests" ADD CONSTRAINT "workshop_material_requests_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "workshop_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_material_requests" DROP CONSTRAINT IF EXISTS "workshop_material_requests_inventoryItemId_fkey";
ALTER TABLE "workshop_material_requests" ADD CONSTRAINT "workshop_material_requests_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" DROP CONSTRAINT IF EXISTS "inventory_movements_inventoryItemId_fkey";
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_logs" DROP CONSTRAINT IF EXISTS "whatsapp_message_logs_jobId_fkey";
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "workshop_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
