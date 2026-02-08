-- CreateTable
CREATE TABLE "ToolInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "condition" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolInventory_userId_idx" ON "ToolInventory"("userId");

-- CreateIndex
CREATE INDEX "ToolInventory_category_idx" ON "ToolInventory"("category");

-- CreateIndex
CREATE INDEX "ToolInventory_name_idx" ON "ToolInventory"("name");

-- AddForeignKey
ALTER TABLE "ToolInventory" ADD CONSTRAINT "ToolInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
