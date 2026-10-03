-- Capacidad de slots por taller: cuantos vehiculos puede atender en el mismo horario
ALTER TABLE "workshops" ADD COLUMN "capacidadSlot" INTEGER NOT NULL DEFAULT 1;
