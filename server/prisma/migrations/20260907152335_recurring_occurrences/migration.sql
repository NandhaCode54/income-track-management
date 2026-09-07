-- Add recurringSourceId so the scheduler can tell which occurrences a series
-- has already materialised and avoid re-inserting the same month twice.

-- AlterTable
ALTER TABLE "incomes" ADD COLUMN     "recurringSourceId" TEXT;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "recurringSourceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "incomes_recurringSourceId_date_key" ON "incomes"("recurringSourceId", "date");

-- CreateIndex
CREATE INDEX "incomes_recurringSourceId_idx" ON "incomes"("recurringSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_recurringSourceId_date_key" ON "expenses"("recurringSourceId", "date");

-- CreateIndex
CREATE INDEX "expenses_recurringSourceId_idx" ON "expenses"("recurringSourceId");
