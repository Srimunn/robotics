-- Additive only: three new optional columns on "Enquiry" and one index.
-- Existing enquiry rows are not modified; the new columns start empty (NULL).
-- Safe to run more than once.
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "customerType" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "nextFollowUpDate" TIMESTAMP(3);
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "followUpNote" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Enquiry_nextFollowUpDate_idx" ON "Enquiry"("nextFollowUpDate");
