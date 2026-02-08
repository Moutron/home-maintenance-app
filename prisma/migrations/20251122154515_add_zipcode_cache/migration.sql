-- CreateTable
CREATE TABLE "ZipCodeCache" (
    "id" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT NOT NULL,
    "weatherData" JSONB NOT NULL,
    "climateData" JSONB,
    "source" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZipCodeCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZipCodeCache_zipCode_key" ON "ZipCodeCache"("zipCode");

-- CreateIndex
CREATE INDEX "ZipCodeCache_zipCode_idx" ON "ZipCodeCache"("zipCode");

-- CreateIndex
CREATE INDEX "ZipCodeCache_expiresAt_idx" ON "ZipCodeCache"("expiresAt");

-- CreateIndex
CREATE INDEX "ZipCodeCache_state_zipCode_idx" ON "ZipCodeCache"("state", "zipCode");
