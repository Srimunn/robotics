-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CEO', 'Worker', 'Labor');

-- CreateEnum
CREATE TYPE "SiteVisitStatus" AS ENUM ('Pending', 'Assigned', 'Visited', 'Completed');

-- CreateEnum
CREATE TYPE "CustomerDecision" AS ENUM ('FollowUp', 'Thinking', 'Approved', 'Cancelled');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Waiting', 'Scheduled', 'Ongoing', 'Completed', 'Closed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Partial', 'Paid', 'Overdue');

-- CreateEnum
CREATE TYPE "PaymentStageStatus" AS ENUM ('Pending', 'Paid', 'Partial', 'Overdue');

-- CreateEnum
CREATE TYPE "LabourType" AS ENUM ('Permanent', 'Contract');

-- CreateEnum
CREATE TYPE "LabourStatus" AS ENUM ('Available', 'Assigned', 'Leave');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('Present', 'Absent', 'Leave', 'HalfDay', 'Overtime');

-- CreateEnum
CREATE TYPE "MachineCondition" AS ENUM ('Good', 'Damaged', 'RepairRequired', 'Lost');

-- CreateEnum
CREATE TYPE "MachineIssueStatus" AS ENUM ('Issued', 'Returned', 'PartiallyReturned', 'UnderRepair', 'Lost');

-- CreateEnum
CREATE TYPE "StockItemType" AS ENUM ('Machine', 'Material');

-- CreateEnum
CREATE TYPE "StockActionType" AS ENUM ('Issue', 'Return', 'RepairMove', 'LostMove', 'StockAddition', 'StockAdjustment');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PendingVerification', 'Verified', 'Rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "labourId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterDataItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterDataItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "companyName" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "autoUpdateProjectStatusOnPayment" BOOLEAN NOT NULL DEFAULT true,
    "defaultLeadSources" TEXT[],
    "defaultLeakageTypes" TEXT[],
    "defaultWeeklyWagePermanent" INTEGER NOT NULL,
    "defaultWeeklyWageContract" INTEGER NOT NULL,
    "defaultDailyWagePermanent" INTEGER,
    "defaultDailyWageContract" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engineer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "status" TEXT DEFAULT 'Available',
    "currentProjectId" TEXT,
    "currentProjectName" TEXT,
    "nextAvailableDate" TIMESTAMP(3),
    "email" TEXT,

    CONSTRAINT "Engineer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Labour" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "type" "LabourType" NOT NULL,
    "defaultWeeklyWage" INTEGER NOT NULL,
    "dailyWage" INTEGER,
    "status" "LabourStatus" NOT NULL DEFAULT 'Available',
    "skills" TEXT[],
    "loginId" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "photoUrl" TEXT,
    "address" TEXT,

    CONSTRAINT "Labour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabourWageHistory" (
    "id" TEXT NOT NULL,
    "labourId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "weeklyWage" INTEGER NOT NULL,
    "assignedDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabourWageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "enquiryDate" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "leadSource" TEXT NOT NULL,
    "referredBy" TEXT,
    "leakageType" TEXT NOT NULL,
    "assignedEngineerId" TEXT,
    "assignedEngineerName" TEXT,
    "siteVisitDate" TIMESTAMP(3),
    "siteVisitStatus" "SiteVisitStatus" NOT NULL DEFAULT 'Pending',
    "quotationDate" TIMESTAMP(3),
    "quotationAmount" DECIMAL(12,2),
    "quotationPdfUrl" TEXT,
    "remarks" TEXT,
    "workCommittedDate" TIMESTAMP(3),
    "actualWorkStartedDate" TIMESTAMP(3),
    "customerDecision" "CustomerDecision" NOT NULL DEFAULT 'FollowUp',
    "customerStatus" TEXT,
    "cancellationReason" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "leadSource" TEXT,
    "referredBy" TEXT,
    "leakageType" TEXT,
    "natureOfWork" TEXT NOT NULL,
    "assignedEngineerId" TEXT,
    "assignedEngineerName" TEXT,
    "siteVisitDate" TIMESTAMP(3),
    "siteVisitStatus" "SiteVisitStatus",
    "quotationDate" TIMESTAMP(3),
    "quotationAmount" DECIMAL(12,2),
    "projectValue" DECIMAL(12,2) NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "workCommittedDate" TIMESTAMP(3),
    "actualWorkStartedDate" TIMESTAMP(3),
    "customerDecision" "CustomerDecision",
    "cancellationReason" TEXT,
    "remarks" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'Waiting',
    "receivedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "beforeWorkPhotoUrl" TEXT,
    "afterWorkPhotoUrl" TEXT,
    "internalNotes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStatusHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL,

    CONSTRAINT "ProjectStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectActivity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "details" TEXT NOT NULL,

    CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLabourAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "labourId" TEXT NOT NULL,
    "labourName" TEXT NOT NULL,
    "labourType" "LabourType" NOT NULL,
    "weeklyWage" INTEGER NOT NULL,
    "assignedDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLabourAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLabourLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "labourId" TEXT NOT NULL,
    "labourName" TEXT NOT NULL,
    "labourType" "LabourType" NOT NULL,
    "weeklyWage" INTEGER NOT NULL,
    "dailyWage" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "inTime" TEXT,
    "outTime" TEXT,
    "attendance" "AttendanceStatus" NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL,
    "earnedMoney" INTEGER,
    "workDescription" TEXT NOT NULL,
    "remarks" TEXT,
    "inPhotoUrl" TEXT,
    "outPhotoUrl" TEXT,
    "inLocation" JSONB,
    "outLocation" JSONB,
    "verificationStatus" "VerificationStatus" DEFAULT 'PendingVerification',
    "verifiedBy" TEXT,
    "verifiedDate" TIMESTAMP(3),
    "verificationComments" TEXT,
    "isGpsWarning" BOOLEAN,

    CONSTRAINT "ProjectLabourLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentStageItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStageStatus" NOT NULL DEFAULT 'Pending',
    "paymentNotes" TEXT,
    "paidAmount" DECIMAL(12,2),
    "paidDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "referenceNumber" TEXT,
    "remarks" TEXT,

    CONSTRAINT "PaymentStageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT,
    "customerName" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "fileSize" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "mode" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "remarks" TEXT NOT NULL,
    "stageId" TEXT,
    "stageName" TEXT,
    "receivedBy" TEXT,
    "receiptNumber" TEXT,
    "upiApp" TEXT,
    "transactionId" TEXT,
    "upiReferenceNumber" TEXT,
    "utrNumber" TEXT,
    "bankName" TEXT,
    "accountReceived" TEXT,
    "chequeNumber" TEXT,
    "chequeDate" TIMESTAMP(3),
    "proofUrl" TEXT,
    "proofName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "labourId" TEXT NOT NULL,
    "labourName" TEXT,
    "projectId" TEXT,
    "projectName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "inTime" TEXT,
    "outTime" TEXT,
    "hoursWorked" DOUBLE PRECISION,
    "earnedMoney" INTEGER,
    "workDescription" TEXT,
    "weeklyWage" INTEGER,
    "remarks" TEXT,
    "inPhotoUrl" TEXT,
    "outPhotoUrl" TEXT,
    "inLocation" JSONB,
    "outLocation" JSONB,
    "verificationStatus" "VerificationStatus",
    "verifiedBy" TEXT,
    "verifiedDate" TIMESTAMP(3),
    "verificationComments" TEXT,
    "isGpsWarning" BOOLEAN,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "attachment" TEXT,
    "brand" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "availableQuantity" INTEGER NOT NULL,
    "issuedQuantity" INTEGER NOT NULL DEFAULT 0,
    "repairQuantity" INTEGER NOT NULL DEFAULT 0,
    "lostQuantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "condition" "MachineCondition" NOT NULL DEFAULT 'Good',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineIssueRecord" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "category" TEXT,
    "brand" TEXT,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expectedReturnDate" TIMESTAMP(3) NOT NULL,
    "actualReturnedDate" TIMESTAMP(3),
    "issuedBy" TEXT NOT NULL,
    "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
    "conditionOnReturn" "MachineCondition",
    "status" "MachineIssueStatus" NOT NULL DEFAULT 'Issued',
    "remarks" TEXT,
    "returnRemarks" TEXT,

    CONSTRAINT "MachineIssueRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "minimumStock" INTEGER NOT NULL,
    "supplier" TEXT NOT NULL,
    "purchaseCost" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssueRecord" (
    "id" TEXT NOT NULL,
    "materialId" TEXT,
    "materialName" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2),
    "totalCost" DECIMAL(12,2),
    "issueDate" TIMESTAMP(3) NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "MaterialIssueRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemType" "StockItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "actionType" "StockActionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousAvailable" INTEGER,
    "newAvailable" INTEGER,
    "projectId" TEXT,
    "projectName" TEXT,
    "customerName" TEXT,
    "issuedByOrActor" TEXT NOT NULL,
    "condition" "MachineCondition",
    "notes" TEXT,

    CONSTRAINT "StockAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_labourId_key" ON "User"("labourId");

-- CreateIndex
CREATE INDEX "MasterDataItem_category_idx" ON "MasterDataItem"("category");

-- CreateIndex
CREATE UNIQUE INDEX "MasterDataItem_category_value_key" ON "MasterDataItem"("category", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Labour_loginId_key" ON "Labour"("loginId");

-- CreateIndex
CREATE INDEX "LabourWageHistory_labourId_idx" ON "LabourWageHistory"("labourId");

-- CreateIndex
CREATE INDEX "LabourWageHistory_projectId_idx" ON "LabourWageHistory"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_phone_key" ON "Customer"("name", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_projectId_key" ON "Enquiry"("projectId");

-- CreateIndex
CREATE INDEX "Enquiry_customerName_idx" ON "Enquiry"("customerName");

-- CreateIndex
CREATE INDEX "Enquiry_assignedEngineerId_idx" ON "Enquiry"("assignedEngineerId");

-- CreateIndex
CREATE INDEX "Project_customerName_idx" ON "Project"("customerName");

-- CreateIndex
CREATE INDEX "Project_assignedEngineerId_idx" ON "Project"("assignedEngineerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectStatusHistory_projectId_idx" ON "ProjectStatusHistory"("projectId");

-- CreateIndex
CREATE INDEX "ProjectActivity_projectId_idx" ON "ProjectActivity"("projectId");

-- CreateIndex
CREATE INDEX "ProjectLabourAssignment_projectId_idx" ON "ProjectLabourAssignment"("projectId");

-- CreateIndex
CREATE INDEX "ProjectLabourAssignment_labourId_idx" ON "ProjectLabourAssignment"("labourId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLabourAssignment_projectId_labourId_key" ON "ProjectLabourAssignment"("projectId", "labourId");

-- CreateIndex
CREATE INDEX "ProjectLabourLog_projectId_idx" ON "ProjectLabourLog"("projectId");

-- CreateIndex
CREATE INDEX "ProjectLabourLog_labourId_idx" ON "ProjectLabourLog"("labourId");

-- CreateIndex
CREATE INDEX "ProjectLabourLog_date_idx" ON "ProjectLabourLog"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLabourLog_projectId_labourId_date_key" ON "ProjectLabourLog"("projectId", "labourId", "date");

-- CreateIndex
CREATE INDEX "PaymentStageItem_projectId_idx" ON "PaymentStageItem"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_utrNumber_key" ON "Payment"("utrNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_chequeNumber_key" ON "Payment"("chequeNumber");

-- CreateIndex
CREATE INDEX "Payment_projectId_idx" ON "Payment"("projectId");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "AttendanceRecord_labourId_idx" ON "AttendanceRecord"("labourId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_labourId_date_key" ON "AttendanceRecord"("labourId", "date");

-- CreateIndex
CREATE INDEX "MachineIssueRecord_machineId_idx" ON "MachineIssueRecord"("machineId");

-- CreateIndex
CREATE INDEX "MachineIssueRecord_projectId_idx" ON "MachineIssueRecord"("projectId");

-- CreateIndex
CREATE INDEX "MaterialIssueRecord_materialId_idx" ON "MaterialIssueRecord"("materialId");

-- CreateIndex
CREATE INDEX "MaterialIssueRecord_projectId_idx" ON "MaterialIssueRecord"("projectId");

-- CreateIndex
CREATE INDEX "StockAuditLog_itemId_idx" ON "StockAuditLog"("itemId");

-- CreateIndex
CREATE INDEX "StockAuditLog_timestamp_idx" ON "StockAuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_labourId_fkey" FOREIGN KEY ("labourId") REFERENCES "Labour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabourWageHistory" ADD CONSTRAINT "LabourWageHistory_labourId_fkey" FOREIGN KEY ("labourId") REFERENCES "Labour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_assignedEngineerId_fkey" FOREIGN KEY ("assignedEngineerId") REFERENCES "Engineer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_assignedEngineerId_fkey" FOREIGN KEY ("assignedEngineerId") REFERENCES "Engineer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStatusHistory" ADD CONSTRAINT "ProjectStatusHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLabourAssignment" ADD CONSTRAINT "ProjectLabourAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLabourAssignment" ADD CONSTRAINT "ProjectLabourAssignment_labourId_fkey" FOREIGN KEY ("labourId") REFERENCES "Labour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLabourLog" ADD CONSTRAINT "ProjectLabourLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLabourLog" ADD CONSTRAINT "ProjectLabourLog_labourId_fkey" FOREIGN KEY ("labourId") REFERENCES "Labour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentStageItem" ADD CONSTRAINT "PaymentStageItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_labourId_fkey" FOREIGN KEY ("labourId") REFERENCES "Labour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineIssueRecord" ADD CONSTRAINT "MachineIssueRecord_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineIssueRecord" ADD CONSTRAINT "MachineIssueRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueRecord" ADD CONSTRAINT "MaterialIssueRecord_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueRecord" ADD CONSTRAINT "MaterialIssueRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
