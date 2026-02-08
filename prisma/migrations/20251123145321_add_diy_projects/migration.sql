-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('NOT_STARTED', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('HVAC', 'PLUMBING', 'ELECTRICAL', 'EXTERIOR', 'INTERIOR', 'LANDSCAPING', 'APPLIANCE', 'STRUCTURAL', 'OTHER');

-- CreateTable
CREATE TABLE "DiyProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProjectCategory" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "difficulty" "ProjectDifficulty" NOT NULL,
    "estimatedHours" INTEGER,
    "actualHours" DOUBLE PRECISION,
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "budget" DOUBLE PRECISION,
    "targetStartDate" TIMESTAMP(3),
    "targetEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "linkedTaskId" TEXT,
    "linkedSystemId" TEXT,
    "linkedApplianceId" TEXT,
    "linkedExteriorFeatureId" TEXT,
    "linkedInteriorFeatureId" TEXT,
    "permitRequired" BOOLEAN NOT NULL DEFAULT false,
    "permitInfo" TEXT,
    "satisfactionRating" INTEGER,
    "wouldDoAgain" BOOLEAN,
    "notes" TEXT,
    "lessonsLearned" TEXT,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiyProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStep" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "dependsOnStepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMaterial" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "vendor" TEXT,
    "vendorUrl" TEXT,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "purchasedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTool" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owned" BOOLEAN NOT NULL DEFAULT false,
    "rentalCost" DOUBLE PRECISION,
    "rentalDays" INTEGER,
    "purchaseCost" DOUBLE PRECISION,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stepId" TEXT,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isBefore" BOOLEAN NOT NULL DEFAULT false,
    "isAfter" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ProjectCategory" NOT NULL,
    "difficulty" "ProjectDifficulty" NOT NULL,
    "estimatedHours" INTEGER,
    "estimatedCostMin" DOUBLE PRECISION,
    "estimatedCostMax" DOUBLE PRECISION,
    "skillLevel" TEXT,
    "permitRequired" BOOLEAN NOT NULL DEFAULT false,
    "permitInfo" TEXT,
    "safetyNotes" TEXT,
    "videoUrl" TEXT,
    "guideUrl" TEXT,
    "commonMistakes" TEXT[],
    "steps" JSONB NOT NULL,
    "defaultMaterials" JSONB NOT NULL,
    "defaultTools" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiyProject_userId_idx" ON "DiyProject"("userId");

-- CreateIndex
CREATE INDEX "DiyProject_homeId_idx" ON "DiyProject"("homeId");

-- CreateIndex
CREATE INDEX "DiyProject_status_idx" ON "DiyProject"("status");

-- CreateIndex
CREATE INDEX "DiyProject_category_idx" ON "DiyProject"("category");

-- CreateIndex
CREATE INDEX "DiyProject_templateId_idx" ON "DiyProject"("templateId");

-- CreateIndex
CREATE INDEX "ProjectStep_projectId_idx" ON "ProjectStep"("projectId");

-- CreateIndex
CREATE INDEX "ProjectStep_stepNumber_idx" ON "ProjectStep"("stepNumber");

-- CreateIndex
CREATE INDEX "ProjectMaterial_projectId_idx" ON "ProjectMaterial"("projectId");

-- CreateIndex
CREATE INDEX "ProjectTool_projectId_idx" ON "ProjectTool"("projectId");

-- CreateIndex
CREATE INDEX "ProjectPhoto_projectId_idx" ON "ProjectPhoto"("projectId");

-- CreateIndex
CREATE INDEX "ProjectPhoto_stepId_idx" ON "ProjectPhoto"("stepId");

-- CreateIndex
CREATE INDEX "ProjectTemplate_category_idx" ON "ProjectTemplate"("category");

-- CreateIndex
CREATE INDEX "ProjectTemplate_difficulty_idx" ON "ProjectTemplate"("difficulty");

-- CreateIndex
CREATE INDEX "ProjectTemplate_isActive_idx" ON "ProjectTemplate"("isActive");

-- AddForeignKey
ALTER TABLE "DiyProject" ADD CONSTRAINT "DiyProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyProject" ADD CONSTRAINT "DiyProject_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiyProject" ADD CONSTRAINT "DiyProject_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStep" ADD CONSTRAINT "ProjectStep_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DiyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMaterial" ADD CONSTRAINT "ProjectMaterial_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DiyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTool" ADD CONSTRAINT "ProjectTool_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DiyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DiyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
