-- Additive only: new optional columns and one index. Existing rows are not modified;
-- every new column starts empty (NULL). Safe to run more than once.

-- Enquiry: B2B/B2C, GST/Non-GST (independent of each other) and follow-up reminder
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "customerType" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "isGST" BOOLEAN;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "nextFollowUpDate" TIMESTAMP(3);
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "followUpNote" TEXT;

-- Project: B2B/B2C (the existing "isGST" column is unchanged)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "customerType" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Enquiry_nextFollowUpDate_idx" ON "Enquiry"("nextFollowUpDate");
