-- CreateTable
CREATE TABLE "PropertyCache" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "propertyData" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCache_cacheKey_key" ON "PropertyCache"("cacheKey");

-- CreateIndex
CREATE INDEX "PropertyCache_cacheKey_idx" ON "PropertyCache"("cacheKey");

-- CreateIndex
CREATE INDEX "PropertyCache_expiresAt_idx" ON "PropertyCache"("expiresAt");

-- CreateIndex
CREATE INDEX "PropertyCache_address_city_state_zipCode_idx" ON "PropertyCache"("address", "city", "state", "zipCode");
