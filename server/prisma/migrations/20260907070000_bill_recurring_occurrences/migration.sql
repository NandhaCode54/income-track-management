-- Add recurringSourceId to bills so the scheduler can tell which future
-- payable rows a recurring bill has already materialised, exactly as it does
-- for recurring income and expenses.

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "recurringSourceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bills_recurringSourceId_dueDate_key" ON "bills"("recurringSourceId", "dueDate");

-- CreateIndex
CREATE INDEX "bills_recurringSourceId_idx" ON "bills"("recurringSourceId");