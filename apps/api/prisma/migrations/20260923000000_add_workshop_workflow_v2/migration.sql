-- AlterTable: Agregar campos de flujo de trabajo al CRM
ALTER TABLE "workshop_jobs" ADD COLUMN "tipoTrabajo" JSONB,
ADD COLUMN "horasEstimadas" INTEGER,
ADD COLUMN "mecanicosAsignados" JSONB,
ADD COLUMN "precioServicio" DECIMAL(65,30);

-- AlterTable: Agregar precios y trazabilidad a piezas usadas
ALTER TABLE "job_part_needs" ADD COLUMN "precioUnitario" DECIMAL(65,30),
ADD COLUMN "yaUsadoEn" TIMESTAMP(3),
ADD COLUMN "usadoPorId" TEXT,
ADD COLUMN "usadoPorNombre" TEXT;