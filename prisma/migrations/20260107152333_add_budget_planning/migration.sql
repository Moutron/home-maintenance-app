-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "BudgetAlertType" AS ENUM ('APPROACHING_LIMIT', 'EXCEEDED_LIMIT', 'PROJECT_OVER_BUDGET');

-- CreateEnum
CREATE TYPE "BudgetAlertStatus" AS ENUM ('PENDING', 'SENT', 'DISMISSED');

-- CreateTable
CREATE TABLE "BudgetPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "homeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "budgetPlanId" TEXT,
    "projectId" TEXT,
    "alertType" "BudgetAlertType" NOT NULL,
    "status" "BudgetAlertStatus" NOT NULL DEFAULT 'PENDING',
    "thresholdPercent" DOUBLE PRECISION,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetPlan_userId_idx" ON "BudgetPlan"("userId");

-- CreateIndex
CREATE INDEX "BudgetPlan_period_idx" ON "BudgetPlan"("period");

-- CreateIndex
CREATE INDEX "BudgetPlan_startDate_endDate_idx" ON "BudgetPlan"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "BudgetPlan_isActive_idx" ON "BudgetPlan"("isActive");

-- CreateIndex
CREATE INDEX "BudgetAlert_userId_idx" ON "BudgetAlert"("userId");

-- CreateIndex
CREATE INDEX "BudgetAlert_status_idx" ON "BudgetAlert"("status");

-- CreateIndex
CREATE INDEX "BudgetAlert_alertType_idx" ON "BudgetAlert"("alertType");

-- CreateIndex
CREATE INDEX "BudgetAlert_createdAt_idx" ON "BudgetAlert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_playerId_key" ON "PushSubscription"("playerId");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "PushSubscription_isActive_idx" ON "PushSubscription"("isActive");

-- AddForeignKey
ALTER TABLE "BudgetPlan" ADD CONSTRAINT "BudgetPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_budgetPlanId_fkey" FOREIGN KEY ("budgetPlanId") REFERENCES "BudgetPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

