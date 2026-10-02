-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "workshopId" TEXT;

-- CreateIndex
CREATE INDEX "requests_workshopId_idx" ON "requests"("workshopId");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
