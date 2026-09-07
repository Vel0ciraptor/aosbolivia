-- AlterTable: Agregar campos de firma a workshop_job_logs
ALTER TABLE "workshop_job_logs" ADD COLUMN "firmaUsuarioId" TEXT,
ADD COLUMN "firmaUsuarioNombre" TEXT,
ADD COLUMN "firmaUsuarioRol" TEXT;
