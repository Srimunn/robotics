-- DropForeignKey
ALTER TABLE "MachineIssueRecord" DROP CONSTRAINT "MachineIssueRecord_projectId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialIssueRecord" DROP CONSTRAINT "MaterialIssueRecord_projectId_fkey";

-- AddForeignKey
ALTER TABLE "MachineIssueRecord" ADD CONSTRAINT "MachineIssueRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueRecord" ADD CONSTRAINT "MaterialIssueRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
