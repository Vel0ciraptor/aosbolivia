-- AlterTable: citas y firma de ingreso
ALTER TABLE "requests" ADD COLUMN "fechaCita" TIMESTAMP(3);

ALTER TABLE "quotes" ADD COLUMN "fechaPropuesta" TIMESTAMP(3);

ALTER TABLE "workshop_jobs" ADD COLUMN "fechaCita" TIMESTAMP(3);

ALTER TABLE "workshop_jobs" ADD COLUMN "firmaIngreso" TEXT;

ALTER TABLE "workshop_jobs" ADD COLUMN "imagenesIngreso" JSONB;

-- CreateTable
CREATE TABLE "workshop_availability" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshop_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "requestId" TEXT,
    "quoteId" TEXT,
    "clientUserId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "quoteId" TEXT,
    "requestId" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workshop_availability_workshopId_fecha_idx" ON "workshop_availability"("workshopId", "fecha");

-- CreateIndex
CREATE INDEX "appointments_workshopId_startAt_idx" ON "appointments"("workshopId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_quoteId_key" ON "appointments"("quoteId");

-- CreateIndex
CREATE INDEX "notifications_workshopId_leida_createdAt_idx" ON "notifications"("workshopId", "leida", "createdAt");

-- AddForeignKey
ALTER TABLE "workshop_availability" ADD CONSTRAINT "workshop_availability_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
