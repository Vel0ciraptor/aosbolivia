-- Configuración del informe económico en el PDF final al cliente
ALTER TABLE "workshops" ADD COLUMN "pdfModoServicioHoras" TEXT NOT NULL DEFAULT 'DESGLOSADO';

