export type SiteVisitStatus = "Pending" | "Assigned" | "Visited" | "Completed";

export type CustomerDecision =
  | "Follow Up"
  | "Follow-up"
  | "Thinking"
  | "Approved"
  | "Cancelled";

export type ProjectStatus = "Waiting" | "Scheduled" | "Ongoing" | "Completed" | "Closed";

export type PaymentStatus = "Pending" | "Partial" | "Paid" | "Overdue";

export type PaymentMode =
  | "Cash"
  | "Google Pay / UPI"
  | "PhonePe"
  | "Paytm"
  | "Bank Transfer"
  | "Cheque"
  | "Credit Collection"
  | "UPI";

export interface Payment {
  id: string;
  projectId: string;
  paymentDate: string;
  amount: number;
  mode: PaymentMode;
  referenceNumber: string;
  remarks: string;
  stageId?: string;
  stageName?: string;
  receivedBy?: string;
  receiptNumber?: string;
  upiApp?: string;
  transactionId?: string;
  upiReferenceNumber?: string;
  utrNumber?: string;
  bankName?: string;
  accountReceived?: string;
  chequeNumber?: string;
  chequeDate?: string;
  proofUrl?: string;
  proofName?: string;
  createdAt: string;
}

export type LabourType = "Permanent" | "Contract";

export type LabourStatus = "Available" | "Assigned" | "Leave";

export type AttendanceStatus = "Present" | "Absent" | "Leave" | "Half Day" | "Overtime";

export type PaymentStageStatus = "Pending" | "Paid" | "Partial" | "Overdue";

export type DocumentCategory =
  | "Quotation PDF"
  | "Invoice PDF"
  | "Site Visit Photos"
  | "Before Work Photos"
  | "After Work Photos"
  | "Completion Photos"
  | "Other Artifacts";

export type MasterDataCategory =
  | "Lead Source"
  | "Referred By Options"
  | "Leakage Type"
  | "Nature Of Work"
  | "Engineer Names"
  | "Labour Types"
  | "Labour Skills"
  | "Cancellation Reasons"
  | "Payment Modes"
  | "Payment Stage"
  | "Customer Decision"
  | "Customer Status"
  | "Project Status"
  | "Site Visit Status"
  | "Work Descriptions"
  | "Remarks Templates"
  | "Machine Category"
  | "Machine Brand"
  | "Machine Attachment"
  | "Material Category"
  | "Material Unit"
  | "Machine Unit"
  | "Locations"
  | "Customer Category"
  | "Engineer Specialization"
  | "Quotation Remarks"
  | "Project Remarks";

export interface MasterDataItem {
  id: string;
  category: MasterDataCategory;
  value: string;
  isActive: boolean;
  isDefault?: boolean;
  createdAt: string;
}

export interface Engineer {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  status?: "Available" | "Assigned";
  currentProjectId?: string;
  currentProjectName?: string;
  nextAvailableDate?: string;
  email?: string;
}

export interface Enquiry {
  id: string; // Auto: ENQ-2026-001
  enquiryDate: string; // YYYY-MM-DD
  customerName: string;
  phone: string;
  location: string;
  leadSource: string;
  referredBy?: string;
  leakageType: string;

  // Step 2: Engineer Assignment
  assignedEngineerId?: string;
  assignedEngineerName?: string;
  siteVisitDate?: string;
  siteVisitStatus: SiteVisitStatus;

  // Step 3: Quotation (Embedded)
  quotationDate?: string;
  quotationAmount?: number;
  quotationPdfUrl?: string;
  remarks?: string;

  // Work Commitment & Execution Dates
  workCommittedDate?: string; // YYYY-MM-DD
  actualWorkStartedDate?: string; // YYYY-MM-DD

  // Step 4: Customer Decision & Status
  customerDecision: CustomerDecision;
  customerStatus?: string; // Active Account, Prospective, VIP Account, etc.
  cancellationReason?: string;

  // Sync reference
  projectId?: string;
  createdAt: string;
}

export interface ProjectActivity {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  details: string;
}

export interface ProjectLabourAssignment {
  labourId: string;
  labourName: string;
  labourType: LabourType;
  weeklyWage: number;
  assignedDate: string;
  isActive?: boolean;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  placeName?: string;
}

export interface ProjectLabourLog {
  labourId: string;
  labourName: string;
  labourType: LabourType;
  weeklyWage: number;
  dailyWage?: number; // legacy backward compatibility
  date: string; // YYYY-MM-DD
  inTime?: string;
  outTime?: string;
  attendance: AttendanceStatus;
  hoursWorked: number;
  earnedMoney?: number;
  workDescription: string;
  remarks?: string;
  inPhotoUrl?: string;
  outPhotoUrl?: string;
  inLocation?: GeoLocation;
  outLocation?: GeoLocation;
  verificationStatus?: "Pending Verification" | "Verified" | "Rejected";
  verifiedBy?: string;
  verifiedDate?: string;
  verificationComments?: string;
  isGpsWarning?: boolean;
}

export interface PaymentStageItem {
  id: string; // e.g. STG-2026-001
  stageName: string; // e.g. "Advance 20%", "Mid Work 50%", "Final Balance"
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: PaymentStageStatus;
  paymentNotes?: string;
  paidAmount?: number;
  paidDate?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  remarks?: string;
}

export interface ProjectDocument {
  id: string; // e.g. DOC-2026-001
  projectId: string;
  projectName?: string;
  customerName?: string;
  category: DocumentCategory;
  title: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  fileSize?: string;
  notes?: string;
}

export interface Project {
  id: string; // Auto: PRJ-2026-001
  enquiryId?: string;
  customerName: string;
  phone: string;
  location: string;
  leadSource?: string;
  referredBy?: string;
  leakageType?: string;
  natureOfWork: string;
  assignedEngineerId?: string;
  assignedEngineerName?: string;
  siteVisitDate?: string;
  siteVisitStatus?: SiteVisitStatus;
  quotationDate?: string;
  quotationAmount?: number;
  projectValue: number;
  scheduledDate: string; // YYYY-MM-DD
  workCommittedDate?: string; // YYYY-MM-DD
  actualWorkStartedDate?: string; // YYYY-MM-DD
  customerDecision?: CustomerDecision;
  cancellationReason?: string;
  assignedLabourIds: string[];
  labourAssignments?: ProjectLabourAssignment[];
  remarks: string;
  status: ProjectStatus;
  receivedAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  beforeWorkPhotoUrl?: string;
  afterWorkPhotoUrl?: string;
  internalNotes: string;
  followUpTag?: "MD" | "Team" | null;
  createdAt: string;
  statusHistory: {
    status: ProjectStatus;
    timestamp: string;
    note: string;
  }[];
  activities: ProjectActivity[];
  labourLogs: ProjectLabourLog[];
  machineIssues?: MachineIssueRecord[];
  materialIssues?: MaterialIssueRecord[];
  paymentStages?: PaymentStageItem[];
  documents?: ProjectDocument[];
}

export type MachineCondition = "Good" | "Damaged" | "Repair Required" | "Lost";

export interface Machine {
  id: string; // e.g., MCH-2026-001
  toolName: string;
  category: string;
  attachment?: string;
  brand: string;
  currentStock: number; // Total physical units owned
  availableQuantity: number; // Available to issue
  issuedQuantity: number; // Currently deployed
  repairQuantity: number; // Under repair
  lostQuantity: number; // Lost
  unit: string;
  condition: MachineCondition;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MachineIssueRecord {
  id: string; // e.g. MIR-2026-001
  machineId: string;
  machineName: string;
  category?: string;
  brand?: string;
  projectId: string;
  projectName: string;
  customerName: string;
  quantity: number;
  issueDate: string; // YYYY-MM-DD
  expectedReturnDate: string; // YYYY-MM-DD
  actualReturnedDate?: string; // YYYY-MM-DD
  issuedBy: string;
  returnedQuantity: number;
  conditionOnReturn?: MachineCondition;
  status: "Issued" | "Returned" | "Partially Returned" | "Under Repair" | "Lost";
  remarks?: string;
  returnRemarks?: string;
}

export interface Material {
  id: string; // e.g. MAT-2026-001
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  supplier: string;
  purchaseCost: number; // Price per unit in ₹
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MaterialIssueRecord {
  id: string; // e.g. MAT-ISS-2026-001
  materialId?: string;
  materialName: string;
  category?: string;
  unit?: string;
  projectId: string;
  projectName: string;
  customerName: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  issueDate: string; // YYYY-MM-DD
  issuedBy: string;
  remarks?: string;
}

export type StockItemType = "Machine" | "Material";
export type StockActionType =
  | "Issue"
  | "Return"
  | "Repair Move"
  | "Lost Move"
  | "Stock Addition"
  | "Stock Adjustment";

export interface StockAuditLog {
  id: string; // e.g. AUD-2026-001
  timestamp: string;
  itemType: StockItemType;
  itemId: string;
  itemName: string;
  actionType: StockActionType;
  quantity: number;
  previousAvailable?: number;
  newAvailable?: number;
  projectId?: string;
  projectName?: string;
  customerName?: string;
  issuedByOrActor: string;
  condition?: MachineCondition;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string;
  createdAt: string;
}

export interface LabourWageHistory {
  projectId: string;
  projectName: string;
  weeklyWage: number;
  assignedDate: string;
}

export interface Labour {
  id: string;
  name: string;
  phone: string;
  type: LabourType;
  defaultWeeklyWage: number;
  dailyWage?: number; // legacy fallback
  status: LabourStatus;
  isActive?: boolean;
  skills: string[];
  wageHistory?: LabourWageHistory[];
  loginId: string;
  pin: string;
  photoUrl?: string;
  address?: string;
}


export interface AttendanceRecord {
  id: string; // labourId_YYYY-MM-DD
  labourId: string;
  labourName?: string;
  projectId?: string;
  projectName?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  inTime?: string;
  outTime?: string;
  hoursWorked?: number;
  earnedMoney?: number;
  workDescription?: string;
  weeklyWage?: number;
  remarks?: string;
  inPhotoUrl?: string;
  outPhotoUrl?: string;
  inLocation?: GeoLocation;
  outLocation?: GeoLocation;
  verificationStatus?: "Pending Verification" | "Verified" | "Rejected";
  verifiedBy?: string;
  verifiedDate?: string;
  verificationComments?: string;
  isGpsWarning?: boolean;
}

export interface CurrentUser {
  role: "CEO" | "Worker" | "Labor";
  id?: string;
  name: string;
}



export function computePaymentStatus(
  projectValue: number,
  receivedAmount: number,
  dueDate?: string,
  paymentStages?: PaymentStageItem[]
): PaymentStatus {
  if (receivedAmount === 0) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const hasOverdueStage = paymentStages?.some(
      (s) => s.dueDate < todayStr && (s.paidAmount || 0) < s.amount
    );
    const isProjectDueDatePassed = dueDate && dueDate.trim().length > 0 && dueDate < todayStr;
    if (hasOverdueStage || isProjectDueDatePassed) return "Overdue";
    return "Pending";
  }

  if (receivedAmount >= projectValue && projectValue > 0) {
    return "Paid";
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const hasOverdueStage = paymentStages?.some(
    (s) => s.dueDate < todayStr && (s.paidAmount || 0) < s.amount
  );
  const isProjectDueDatePassed = dueDate && dueDate.trim().length > 0 && dueDate < todayStr;

  if (hasOverdueStage || isProjectDueDatePassed) {
    return "Overdue";
  }

  return "Partial";
}

export interface SystemSettings {
  companyName: string;
  companyAddress: string;
  phone: string;
  email: string;
  taxId: string;
  autoUpdateProjectStatusOnPayment: boolean;
  defaultLeadSources: string[];
  defaultLeakageTypes: string[];
  defaultWeeklyWagePermanent: number;
  defaultWeeklyWageContract: number;
  defaultDailyWagePermanent?: number;
  defaultDailyWageContract?: number;
}
