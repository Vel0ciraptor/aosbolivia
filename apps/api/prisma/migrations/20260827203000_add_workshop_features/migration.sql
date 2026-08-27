-- AlterTable: Add new columns to workshop_jobs
ALTER TABLE "workshop_jobs" ADD COLUMN "kilometraje" INTEGER,
ADD COLUMN "firmaDigital" TEXT,
ADD COLUMN "imagenes" JSONB,
ADD COLUMN "imagenesTerminado" JSONB;

-- CreateTable
CREATE TABLE "job_checkpoints" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "servicio" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,

    CONSTRAINT "job_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_part_needs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "esInsumo" BOOLEAN NOT NULL DEFAULT false,
    "yaUsado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "job_part_needs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "precioUnitario" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unidad" TEXT NOT NULL DEFAULT 'unidad',
    "estado" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_checkpoints_id_key" ON "job_checkpoints"("id");

-- CreateIndex
CREATE UNIQUE INDEX "job_part_needs_id_key" ON "job_part_needs"("id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_id_key" ON "inventory_items"("id");

-- AddForeignKey
ALTER TABLE "job_checkpoints" ADD CONSTRAINT "job_checkpoints_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "workshop_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_part_needs" ADD CONSTRAINT "job_part_needs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "workshop_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_part_needs" ADD CONSTRAINT "job_part_needs_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
