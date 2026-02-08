-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SystemType" AS ENUM ('HVAC', 'ROOF', 'WATER_HEATER', 'PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'EXTERIOR', 'LANDSCAPING', 'POOL', 'DECK', 'FENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplianceType" AS ENUM ('REFRIGERATOR', 'DISHWASHER', 'WASHER', 'DRYER', 'OVEN', 'RANGE', 'MICROWAVE', 'GARBAGE_DISPOSAL', 'GARBAGE_COMPACTOR', 'ICE_MAKER', 'WINE_COOLER', 'OTHER');

-- CreateEnum
CREATE TYPE "ExteriorFeatureType" AS ENUM ('DECK', 'FENCE', 'POOL', 'SPRINKLER_SYSTEM', 'DRIVEWAY', 'PATIO', 'SIDING', 'GUTTERS', 'WINDOWS', 'DOORS', 'GARAGE_DOOR', 'FOUNDATION', 'OTHER');

-- CreateEnum
CREATE TYPE "InteriorFeatureType" AS ENUM ('CARPET', 'HARDWOOD_FLOOR', 'TILE_FLOOR', 'LAMINATE_FLOOR', 'VINYL_FLOOR', 'WINDOWS', 'DOORS', 'CABINETS', 'COUNTERTOPS', 'PAINT', 'WALLPAPER', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('HVAC', 'PLUMBING', 'EXTERIOR', 'STRUCTURAL', 'LANDSCAPING', 'APPLIANCE', 'SAFETY', 'ELECTRICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL', 'SEASONAL', 'AS_NEEDED');

-- CreateEnum
CREATE TYPE "ContractorTier" AS ENUM ('BASIC', 'FEATURED', 'PREMIUM');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'CLAIMED', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Home" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "yearBuilt" INTEGER NOT NULL,
    "squareFootage" INTEGER,
    "lotSize" DOUBLE PRECISION,
    "homeType" TEXT NOT NULL,
    "climateZone" TEXT,
    "heatingDegreeDays" INTEGER,
    "coolingDegreeDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Home_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeSystem" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "systemType" "SystemType" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "installDate" TIMESTAMP(3),
    "expectedLifespan" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "baseFrequency" "TaskFrequency" NOT NULL,
    "frequencyRules" JSONB,
    "climateRules" JSONB,
    "ageRules" JSONB,
    "systemRules" JSONB,
    "educationalContent" JSONB,
    "diyDifficulty" TEXT,
    "costRangeMin" DOUBLE PRECISION,
    "costRangeMax" DOUBLE PRECISION,
    "importance" TEXT,
    "season" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTask" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "frequency" "TaskFrequency" NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedDate" TIMESTAMP(3),
    "costEstimate" DOUBLE PRECISION,
    "notes" TEXT,
    "aiExplanation" TEXT,
    "priority" TEXT,
    "dependsOnTaskId" TEXT,
    "relatedItemId" TEXT,
    "relatedItemType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletedTask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualCost" DOUBLE PRECISION,
    "notes" TEXT,
    "photos" TEXT[],
    "contractorUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "services" TEXT[],
    "coverageZips" TEXT[],
    "coverageRadius" INTEGER,
    "tier" "ContractorTier" NOT NULL DEFAULT 'BASIC',
    "stripeAccountId" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "taskId" TEXT,
    "serviceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timeline" TEXT,
    "photos" TEXT[],
    "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
    "claimedBy" TEXT,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "leadFee" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "leadRequestId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appliance" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "applianceType" "ApplianceType" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "installDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "expectedLifespan" INTEGER,
    "lastServiceDate" TIMESTAMP(3),
    "usageFrequency" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExteriorFeature" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "featureType" "ExteriorFeatureType" NOT NULL,
    "material" TEXT,
    "brand" TEXT,
    "installDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "expectedLifespan" INTEGER,
    "lastServiceDate" TIMESTAMP(3),
    "squareFootage" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExteriorFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorFeature" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "featureType" "InteriorFeatureType" NOT NULL,
    "material" TEXT,
    "brand" TEXT,
    "installDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "expectedLifespan" INTEGER,
    "lastServiceDate" TIMESTAMP(3),
    "squareFootage" DOUBLE PRECISION,
    "room" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InteriorFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceHistory" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "applianceId" TEXT,
    "exteriorFeatureId" TEXT,
    "interiorFeatureId" TEXT,
    "systemId" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "contractorName" TEXT,
    "contractorPhone" TEXT,
    "photos" TEXT[],
    "receipts" TEXT[],
    "warrantyInfo" TEXT,
    "notes" TEXT,
    "nextServiceDue" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Home_userId_idx" ON "Home"("userId");

-- CreateIndex
CREATE INDEX "Home_state_zipCode_idx" ON "Home"("state", "zipCode");

-- CreateIndex
CREATE INDEX "HomeSystem_homeId_idx" ON "HomeSystem"("homeId");

-- CreateIndex
CREATE INDEX "TaskTemplate_category_idx" ON "TaskTemplate"("category");

-- CreateIndex
CREATE INDEX "TaskTemplate_isActive_idx" ON "TaskTemplate"("isActive");

-- CreateIndex
CREATE INDEX "MaintenanceTask_homeId_idx" ON "MaintenanceTask"("homeId");

-- CreateIndex
CREATE INDEX "MaintenanceTask_nextDueDate_idx" ON "MaintenanceTask"("nextDueDate");

-- CreateIndex
CREATE INDEX "MaintenanceTask_completed_idx" ON "MaintenanceTask"("completed");

-- CreateIndex
CREATE INDEX "MaintenanceTask_dependsOnTaskId_idx" ON "MaintenanceTask"("dependsOnTaskId");

-- CreateIndex
CREATE INDEX "CompletedTask_userId_idx" ON "CompletedTask"("userId");

-- CreateIndex
CREATE INDEX "CompletedTask_taskId_idx" ON "CompletedTask"("taskId");

-- CreateIndex
CREATE INDEX "CompletedTask_completedDate_idx" ON "CompletedTask"("completedDate");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_clerkId_key" ON "Contractor"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_email_key" ON "Contractor"("email");

-- CreateIndex
CREATE INDEX "Contractor_tier_idx" ON "Contractor"("tier");

-- CreateIndex
CREATE INDEX "Contractor_isActive_idx" ON "Contractor"("isActive");

-- CreateIndex
CREATE INDEX "LeadRequest_userId_idx" ON "LeadRequest"("userId");

-- CreateIndex
CREATE INDEX "LeadRequest_status_idx" ON "LeadRequest"("status");

-- CreateIndex
CREATE INDEX "LeadRequest_claimedBy_idx" ON "LeadRequest"("claimedBy");

-- CreateIndex
CREATE INDEX "LeadRequest_createdAt_idx" ON "LeadRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ContractorReview_contractorId_idx" ON "ContractorReview"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorReview_rating_idx" ON "ContractorReview"("rating");

-- CreateIndex
CREATE INDEX "ContractorReview_isVerified_idx" ON "ContractorReview"("isVerified");

-- CreateIndex
CREATE INDEX "Appliance_homeId_idx" ON "Appliance"("homeId");

-- CreateIndex
CREATE INDEX "Appliance_applianceType_idx" ON "Appliance"("applianceType");

-- CreateIndex
CREATE INDEX "ExteriorFeature_homeId_idx" ON "ExteriorFeature"("homeId");

-- CreateIndex
CREATE INDEX "ExteriorFeature_featureType_idx" ON "ExteriorFeature"("featureType");

-- CreateIndex
CREATE INDEX "InteriorFeature_homeId_idx" ON "InteriorFeature"("homeId");

-- CreateIndex
CREATE INDEX "InteriorFeature_featureType_idx" ON "InteriorFeature"("featureType");

-- CreateIndex
CREATE INDEX "MaintenanceHistory_homeId_idx" ON "MaintenanceHistory"("homeId");

-- CreateIndex
CREATE INDEX "MaintenanceHistory_applianceId_idx" ON "MaintenanceHistory"("applianceId");

-- CreateIndex
CREATE INDEX "MaintenanceHistory_exteriorFeatureId_idx" ON "MaintenanceHistory"("exteriorFeatureId");

-- CreateIndex
CREATE INDEX "MaintenanceHistory_interiorFeatureId_idx" ON "MaintenanceHistory"("interiorFeatureId");

-- CreateIndex
CREATE INDEX "MaintenanceHistory_serviceDate_idx" ON "MaintenanceHistory"("serviceDate");

-- AddForeignKey
ALTER TABLE "Home" ADD CONSTRAINT "Home_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeSystem" ADD CONSTRAINT "HomeSystem_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "MaintenanceTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedTask" ADD CONSTRAINT "CompletedTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedTask" ADD CONSTRAINT "CompletedTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRequest" ADD CONSTRAINT "LeadRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRequest" ADD CONSTRAINT "LeadRequest_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRequest" ADD CONSTRAINT "LeadRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRequest" ADD CONSTRAINT "LeadRequest_claimedBy_fkey" FOREIGN KEY ("claimedBy") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorReview" ADD CONSTRAINT "ContractorReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorReview" ADD CONSTRAINT "ContractorReview_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appliance" ADD CONSTRAINT "Appliance_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExteriorFeature" ADD CONSTRAINT "ExteriorFeature_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteriorFeature" ADD CONSTRAINT "InteriorFeature_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceHistory" ADD CONSTRAINT "MaintenanceHistory_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceHistory" ADD CONSTRAINT "MaintenanceHistory_applianceId_fkey" FOREIGN KEY ("applianceId") REFERENCES "Appliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceHistory" ADD CONSTRAINT "MaintenanceHistory_exteriorFeatureId_fkey" FOREIGN KEY ("exteriorFeatureId") REFERENCES "ExteriorFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceHistory" ADD CONSTRAINT "MaintenanceHistory_interiorFeatureId_fkey" FOREIGN KEY ("interiorFeatureId") REFERENCES "InteriorFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
