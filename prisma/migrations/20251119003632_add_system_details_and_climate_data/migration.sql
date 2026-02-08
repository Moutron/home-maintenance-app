-- AlterTable
ALTER TABLE "Home" ADD COLUMN     "averageRainfall" DOUBLE PRECISION,
ADD COLUMN     "averageSnowfall" DOUBLE PRECISION,
ADD COLUMN     "stormFrequency" TEXT,
ADD COLUMN     "windZone" TEXT;

-- AlterTable
ALTER TABLE "HomeSystem" ADD COLUMN     "capacity" TEXT,
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "lastInspection" TIMESTAMP(3),
ADD COLUMN     "material" TEXT,
ADD COLUMN     "stormResistance" TEXT;

-- CreateIndex
CREATE INDEX "HomeSystem_systemType_idx" ON "HomeSystem"("systemType");
