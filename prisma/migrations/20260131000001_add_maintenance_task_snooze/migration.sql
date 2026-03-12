-- AlterTable
ALTER TABLE "MaintenanceTask" ADD COLUMN "snoozedUntil" TIMESTAMP(3),
ADD COLUMN "customRecurrence" JSONB;

-- CreateIndex
CREATE INDEX "MaintenanceTask_snoozedUntil_idx" ON "MaintenanceTask"("snoozedUntil");
