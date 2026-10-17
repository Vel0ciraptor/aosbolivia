-- AlterTable
ALTER TABLE "workshops" ADD COLUMN     "colorPrimario" TEXT,
ADD COLUMN     "trabajoTags" JSONB;

-- AlterTable
ALTER TABLE "workshop_jobs" ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'DIRECTO',
ADD COLUMN     "serviciosRealizados" JSONB;
