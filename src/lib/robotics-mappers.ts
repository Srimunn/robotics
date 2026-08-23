import type {
  Enquiry as DbEnquiry,
  Project as DbProject,
  Labour as DbLabour,
  Payment as DbPayment,
  Machine as DbMachine,
  MachineIssueRecord as DbMachineIssueRecord,
  Material as DbMaterial,
  MaterialIssueRecord as DbMaterialIssueRecord,
  AttendanceRecord as DbAttendanceRecord,
  Engineer as DbEngineer,
  MasterDataItem as DbMasterDataItem,
  ProjectDocument as DbProjectDocument,
  StockAuditLog as DbStockAuditLog,
  SystemSettings as DbSystemSettings,
  PaymentStageItem as DbPaymentStageItem,
  ProjectLabourLog as DbProjectLabourLog,
  ProjectLabourAssignment as DbProjectLabourAssignment,
  ProjectActivity as DbProjectActivity,
  ProjectStatusHistory as DbProjectStatusHistory,
  LabourWageHistory as DbLabourWageHistory,
} from "@prisma/client";
import type {
  Enquiry,
  Project,
  Labour,
  Payment,
  Machine,
  MachineIssueRecord,
  Material,
  MaterialIssueRecord,
  AttendanceRecord,
  Engineer,
  MasterDataItem,
  ProjectDocument,
  StockAuditLog,
  SystemSettings,
  PaymentStageItem,
  ProjectLabourLog,
  ProjectLabourAssignment,
  ProjectActivity,
  CustomerDecision,
  AttendanceStatus,
  MachineCondition,
  PaymentStageStatus,
  PaymentStatus,
  SiteVisitStatus,
  ProjectStatus,
  LabourType,
  LabourStatus,
  StockActionType,
  StockItemType,
} from "./robotics-types";

// ============================================================
// DATE + DECIMAL HELPERS
// ============================================================

const isoDate = (d: Date | string | null | undefined): string | undefined => {
  if (!d) return undefined;
  if (typeof d === "string") return d.slice(0, 10);
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return undefined;
    return dt.toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
};

const isoDateTime = (d: Date | string | null | undefined): string | undefined => {
  if (!d) return undefined;
  if (typeof d === "string") return d;
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return undefined;
    return dt.toISOString();
  } catch {
    return undefined;
  }
};

const num = (v: any): number => (v == null ? 0 : typeof v === "number" ? v : isNaN(Number(v)) ? 0 : Number(v.toString()));
const optNum = (v: any): number | undefined => (v == null ? undefined : num(v));

// ============================================================
// ENUM MAPPERS  (DB PascalCase ↔ UI display strings)
// ============================================================

const customerDecisionFromDb = (d: string | null | undefined): CustomerDecision => {
  if (!d) return "Follow Up";
  switch (d) {
    case "FollowUp": return "Follow Up";
    case "Thinking": return "Thinking";
    case "Approved": return "Approved";
    case "Cancelled": return "Cancelled";
    default: return "Follow Up";
  }
};
const customerDecisionToDb = (d: CustomerDecision | string): "FollowUp" | "Thinking" | "Approved" | "Cancelled" => {
  if (d === "Follow Up" || d === "Follow-up" || d === "FollowUp") return "FollowUp";
  if (d === "Thinking") return "Thinking";
  if (d === "Approved") return "Approved";
  return "Cancelled";
};

const attendanceStatusFromDb = (s: string | null | undefined): AttendanceStatus => {
  if (!s) return "Present";
  if (s === "HalfDay") return "Half Day";
  return s as AttendanceStatus;
};
const attendanceStatusToDb = (s: AttendanceStatus | string): "Present" | "Absent" | "Leave" | "HalfDay" | "Overtime" => {
  if (s === "Half Day") return "HalfDay";
  return s as any;
};

const machineConditionFromDb = (c: string | null | undefined): MachineCondition => {
  if (!c) return "Good";
  if (c === "RepairRequired") return "Repair Required";
  return c as MachineCondition;
};
const machineConditionToDb = (c: MachineCondition | string): "Good" | "Damaged" | "RepairRequired" | "Lost" => {
  if (c === "Repair Required") return "RepairRequired";
  return c as any;
};

const machineIssueStatusFromDb = (s: string | null | undefined): "Issued" | "Returned" | "Partially Returned" | "Under Repair" | "Lost" => {
  if (!s) return "Issued";
  if (s === "PartiallyReturned") return "Partially Returned";
  if (s === "UnderRepair") return "Under Repair";
  return s as any;
};

const stockActionTypeFromDb = (s: string | null | undefined): StockActionType => {
  if (!s) return "Stock Addition";
  if (s === "RepairMove") return "Repair Move";
  if (s === "LostMove") return "Lost Move";
  if (s === "StockAddition") return "Stock Addition";
  if (s === "StockAdjustment") return "Stock Adjustment";
  return s as StockActionType;
};

const verificationFromDb = (v: string | null | undefined): "Pending Verification" | "Verified" | "Rejected" | undefined => {
  if (!v) return undefined;
  if (v === "PendingVerification") return "Pending Verification";
  return v as any;
};
const verificationToDb = (v: "Pending Verification" | "Verified" | "Rejected" | string | undefined): "PendingVerification" | "Verified" | "Rejected" | undefined => {
  if (!v) return undefined;
  if (v === "Pending Verification") return "PendingVerification";
  return v as any;
};

// ============================================================
// ENTITY MAPPERS: DB → UI
// ============================================================

export function mapMasterDataFromDb(m: DbMasterDataItem): MasterDataItem {
  return {
    id: m.id,
    category: m.category as any,
    value: m.value,
    isActive: m.isActive,
    isDefault: m.isDefault,
    createdAt: isoDateTime(m.createdAt)!,
  };
}

export function mapSystemSettingsFromDb(s: DbSystemSettings): SystemSettings {
  return {
    companyName: s.companyName,
    companyAddress: s.companyAddress,
    phone: s.phone,
    email: s.email,
    taxId: s.taxId,
    autoUpdateProjectStatusOnPayment: s.autoUpdateProjectStatusOnPayment,
    defaultLeadSources: s.defaultLeadSources,
    defaultLeakageTypes: s.defaultLeakageTypes,
    defaultWeeklyWagePermanent: s.defaultWeeklyWagePermanent,
    defaultWeeklyWageContract: s.defaultWeeklyWageContract,
    defaultDailyWagePermanent: s.defaultDailyWagePermanent ?? undefined,
    defaultDailyWageContract: s.defaultDailyWageContract ?? undefined,
  };
}

export function mapEngineerFromDb(e: DbEngineer): Engineer {
  return {
    id: e.id,
    name: e.name,
    phone: e.phone,
    specialty: e.specialty,
    status: (e.status as any) ?? "Available",
    currentProjectId: e.currentProjectId ?? undefined,
    currentProjectName: e.currentProjectName ?? undefined,
    nextAvailableDate: isoDate(e.nextAvailableDate),
    email: e.email ?? undefined,
  };
}

export function mapLabourFromDb(l: DbLabour & { wageHistory?: DbLabourWageHistory[] }): Labour {
  return {
    id: l.id,
    name: l.name,
    phone: l.phone,
    type: l.type as LabourType,
    defaultWeeklyWage: l.defaultWeeklyWage,
    dailyWage: l.dailyWage ?? undefined,
    status: l.status as LabourStatus,
    isActive: (l as any).isActive ?? true,
    skills: l.skills,
    loginId: l.loginId,
    pin: l.pin,
    photoUrl: l.photoUrl ?? undefined,
    address: l.address ?? undefined,
    wageHistory: (l.wageHistory ?? []).map((w) => ({
      projectId: w.projectId,
      projectName: w.projectName,
      weeklyWage: w.weeklyWage,
      assignedDate: isoDate(w.assignedDate)!,
    })),
  };
}


export function mapCustomerFromDb(c: { id: string; name: string; phone: string; location: string; createdAt: Date | string }): { id: string; name: string; phone: string; location: string; createdAt: string } {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    location: c.location,
    createdAt: isoDateTime(c.createdAt)!,
  };
}

export function mapEnquiryFromDb(e: DbEnquiry): Enquiry {
  return {
    id: e.id,
    enquiryDate: isoDate(e.enquiryDate)!,
    customerName: e.customerName,
    phone: e.phone,
    phone2: (e as any).phone2 ?? undefined,
    location: e.location,
    leadSource: e.leadSource,
    referredBy: e.referredBy ?? undefined,
    leakageType: e.leakageType,
    assignedEngineerId: e.assignedEngineerId ?? undefined,
    assignedEngineerName: e.assignedEngineerName ?? undefined,
    siteVisitDate: isoDate(e.siteVisitDate),
    siteVisitStatus: e.siteVisitStatus as SiteVisitStatus,
    quotationDate: isoDate(e.quotationDate),
    quotationAmount: optNum(e.quotationAmount),
    quotationPdfUrl: e.quotationPdfUrl ?? undefined,
    remarks: e.remarks ?? undefined,
    workCommittedDate: isoDate(e.workCommittedDate),
    actualWorkStartedDate: isoDate(e.actualWorkStartedDate),
    customerDecision: customerDecisionFromDb(e.customerDecision),
    customerStatus: e.customerStatus ?? undefined,
    cancellationReason: e.cancellationReason ?? undefined,
    projectId: e.projectId ?? undefined,
    createdByRole: (e as any).createdByRole ?? undefined,
    createdAt: isoDateTime(e.createdAt)!,
  };
}

export function mapPaymentStageItemFromDb(s: DbPaymentStageItem): PaymentStageItem {
  return {
    id: s.id,
    stageName: s.stageName,
    amount: num(s.amount),
    dueDate: isoDate(s.dueDate)!,
    status: s.status as PaymentStageStatus,
    paymentNotes: s.paymentNotes ?? undefined,
    paidAmount: optNum(s.paidAmount),
    paidDate: isoDate(s.paidDate),
    paymentMethod: s.paymentMethod ?? undefined,
    referenceNumber: s.referenceNumber ?? undefined,
    remarks: s.remarks ?? undefined,
  };
}

export function mapProjectFromDb(
  p: DbProject & {
    statusHistory?: DbProjectStatusHistory[];
    activities?: DbProjectActivity[];
    labourAssignments?: DbProjectLabourAssignment[];
    labourLogs?: DbProjectLabourLog[];
    machineIssues?: DbMachineIssueRecord[];
    materialIssues?: DbMaterialIssueRecord[];
    paymentStages?: DbPaymentStageItem[];
    documents?: DbProjectDocument[];
  }
): Project {
  return {
    id: p.id,
    enquiryId: undefined, // filled via reverse lookup if needed
    customerName: p.customerName,
    phone: p.phone,
    location: p.location,
    leadSource: p.leadSource ?? undefined,
    referredBy: p.referredBy ?? undefined,
    leakageType: p.leakageType ?? undefined,
    natureOfWork: p.natureOfWork,
    assignedEngineerId: p.assignedEngineerId ?? undefined,
    assignedEngineerName: p.assignedEngineerName ?? undefined,
    siteVisitDate: isoDate(p.siteVisitDate),
    siteVisitStatus: (p.siteVisitStatus as SiteVisitStatus) ?? undefined,
    quotationDate: isoDate(p.quotationDate),
    quotationAmount: optNum(p.quotationAmount),
    quotationPdfUrl: (p as any).quotationPdfUrl ?? undefined,
    projectValue: num(p.projectValue),
    scheduledDate: isoDate(p.scheduledDate)!,
    workCommittedDate: isoDate(p.workCommittedDate),
    actualWorkStartedDate: isoDate(p.actualWorkStartedDate),
    customerDecision: p.customerDecision ? customerDecisionFromDb(p.customerDecision) : undefined,
    cancellationReason: p.cancellationReason ?? undefined,
    assignedLabourIds: (p.labourAssignments ?? []).filter((a) => (a as any).isActive !== false).map((a) => a.labourId),
    labourAssignments: (p.labourAssignments ?? []).map((a) => ({
      labourId: a.labourId,
      labourName: a.labourName,
      labourType: a.labourType as LabourType,
      weeklyWage: a.weeklyWage,
      dailyWage: (a as any).dailyWage ?? (a.weeklyWage ? Math.round(a.weeklyWage / 6) : undefined),
      assignedDate: isoDate(a.assignedDate)!,
      isActive: (a as any).isActive ?? true,
    })),
    remarks: p.remarks,
    status: p.status as ProjectStatus,
    receivedAmount: num(p.receivedAmount),
    balanceAmount: num(p.balanceAmount),
    paymentStatus: p.paymentStatus as PaymentStatus,
    beforeWorkPhotoUrl: p.beforeWorkPhotoUrl ?? undefined,
    afterWorkPhotoUrl: p.afterWorkPhotoUrl ?? undefined,
    internalNotes: p.internalNotes,
    followUpTag: ((p as any).followUpTag as "MD" | "Team" | null) ?? undefined,
    createdByRole: (p as any).createdByRole ?? undefined,
    createdAt: isoDateTime(p.createdAt)!,
    statusHistory: (p.statusHistory ?? []).map((s) => ({
      status: s.status as ProjectStatus,
      timestamp: isoDateTime(s.timestamp)!,
      note: s.note,
    })),
    activities: (p.activities ?? []).map((a) => ({
      id: a.id,
      timestamp: isoDateTime(a.timestamp)!,
      event: a.event,
      actor: a.actor,
      details: a.details,
    })),
    labourLogs: (p.labourLogs ?? []).map((l) => ({
      labourId: l.labourId,
      labourName: l.labourName,
      labourType: l.labourType as LabourType,
      weeklyWage: l.weeklyWage,
      dailyWage: l.dailyWage ?? undefined,
      date: isoDate(l.date)!,
      inTime: l.inTime ?? undefined,
      outTime: l.outTime ?? undefined,
      attendance: attendanceStatusFromDb(l.attendance),
      hoursWorked: l.hoursWorked,
      earnedMoney: l.earnedMoney ?? undefined,
      workDescription: l.workDescription,
      remarks: l.remarks ?? undefined,
      inPhotoUrl: l.inPhotoUrl ?? undefined,
      outPhotoUrl: l.outPhotoUrl ?? undefined,
      inLocation: (l.inLocation as any) ?? undefined,
      outLocation: (l.outLocation as any) ?? undefined,
      verificationStatus: verificationFromDb(l.verificationStatus),
      verifiedBy: l.verifiedBy ?? undefined,
      verifiedDate: isoDate(l.verifiedDate),
      verificationComments: l.verificationComments ?? undefined,
      isGpsWarning: l.isGpsWarning ?? undefined,
    })),
    machineIssues: (p.machineIssues ?? []).map(mapMachineIssueFromDb),
    materialIssues: (p.materialIssues ?? []).map(mapMaterialIssueFromDb),
    paymentStages: (p.paymentStages ?? []).map(mapPaymentStageItemFromDb),
    documents: (p.documents ?? []).map(mapProjectDocumentFromDb),
  };
}

export function mapPaymentFromDb(p: DbPayment): Payment {
  return {
    id: p.id,
    projectId: p.projectId,
    paymentDate: isoDate(p.paymentDate)!,
    amount: num(p.amount),
    mode: p.mode as any,
    referenceNumber: p.referenceNumber,
    remarks: p.remarks,
    stageId: p.stageId ?? undefined,
    stageName: p.stageName ?? undefined,
    receivedBy: p.receivedBy ?? undefined,
    receiptNumber: p.receiptNumber ?? undefined,
    upiApp: p.upiApp ?? undefined,
    transactionId: p.transactionId ?? undefined,
    upiReferenceNumber: p.upiReferenceNumber ?? undefined,
    utrNumber: p.utrNumber ?? undefined,
    bankName: p.bankName ?? undefined,
    accountReceived: p.accountReceived ?? undefined,
    chequeNumber: p.chequeNumber ?? undefined,
    chequeDate: isoDate(p.chequeDate),
    proofUrl: p.proofUrl ?? undefined,
    proofName: p.proofName ?? undefined,
    createdAt: isoDateTime(p.createdAt)!,
  };
}

export function mapMachineFromDb(m: DbMachine): Machine {
  return {
    id: m.id,
    toolName: m.toolName,
    category: m.category,
    attachment: m.attachment ?? undefined,
    brand: m.brand,
    currentStock: m.currentStock,
    availableQuantity: m.availableQuantity,
    issuedQuantity: m.issuedQuantity,
    repairQuantity: m.repairQuantity,
    lostQuantity: m.lostQuantity,
    unit: m.unit,
    condition: machineConditionFromDb(m.condition),
    remarks: m.remarks ?? undefined,
    createdAt: isoDateTime(m.createdAt)!,
    updatedAt: isoDateTime(m.updatedAt),
  };
}

export function mapMachineIssueFromDb(r: DbMachineIssueRecord): MachineIssueRecord {
  return {
    id: r.id,
    machineId: r.machineId,
    machineName: r.machineName,
    category: r.category ?? undefined,
    brand: r.brand ?? undefined,
    projectId: r.projectId,
    projectName: r.projectName,
    customerName: r.customerName,
    quantity: r.quantity,
    issueDate: isoDate(r.issueDate)!,
    expectedReturnDate: isoDate(r.expectedReturnDate)!,
    actualReturnedDate: isoDate(r.actualReturnedDate),
    issuedBy: r.issuedBy,
    returnedQuantity: r.returnedQuantity,
    conditionOnReturn: r.conditionOnReturn ? machineConditionFromDb(r.conditionOnReturn) : undefined,
    status: machineIssueStatusFromDb(r.status),
    remarks: r.remarks ?? undefined,
    returnRemarks: r.returnRemarks ?? undefined,
  };
}

export function mapMaterialFromDb(m: DbMaterial): Material {
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    currentStock: m.currentStock,
    minimumStock: m.minimumStock,
    supplier: m.supplier,
    purchaseCost: num(m.purchaseCost),
    remarks: m.remarks ?? undefined,
    createdAt: isoDateTime(m.createdAt)!,
    updatedAt: isoDateTime(m.updatedAt),
  };
}

export function mapMaterialIssueFromDb(r: DbMaterialIssueRecord): MaterialIssueRecord {
  return {
    id: r.id,
    materialId: r.materialId ?? undefined,
    materialName: r.materialName,
    category: r.category ?? undefined,
    unit: r.unit ?? undefined,
    projectId: r.projectId,
    projectName: r.projectName,
    customerName: r.customerName,
    quantity: r.quantity,
    unitCost: optNum(r.unitCost),
    totalCost: optNum(r.totalCost),
    issueDate: isoDate(r.issueDate)!,
    issuedBy: r.issuedBy,
    remarks: r.remarks ?? undefined,
  };
}

export function mapAttendanceFromDb(a: DbAttendanceRecord): AttendanceRecord {
  return {
    id: a.id,
    labourId: a.labourId,
    labourName: a.labourName ?? undefined,
    projectId: a.projectId ?? undefined,
    projectName: a.projectName ?? undefined,
    date: isoDate(a.date)!,
    status: attendanceStatusFromDb(a.status),
    inTime: a.inTime ?? undefined,
    outTime: a.outTime ?? undefined,
    hoursWorked: a.hoursWorked ?? undefined,
    earnedMoney: a.earnedMoney ?? undefined,
    workDescription: a.workDescription ?? undefined,
    weeklyWage: a.weeklyWage ?? undefined,
    dailyWage: (a as any).dailyWage ?? (a.weeklyWage ? Math.round(a.weeklyWage / 6) : undefined),
    remarks: a.remarks ?? undefined,
    inPhotoUrl: a.inPhotoUrl ?? undefined,
    outPhotoUrl: a.outPhotoUrl ?? undefined,
    inLocation: (a.inLocation as any) ?? undefined,
    outLocation: (a.outLocation as any) ?? undefined,
    verificationStatus: verificationFromDb(a.verificationStatus),
    verifiedBy: a.verifiedBy ?? undefined,
    verifiedDate: isoDate(a.verifiedDate),
    verificationComments: a.verificationComments ?? undefined,
    isGpsWarning: a.isGpsWarning ?? undefined,
  };
}

export function mapProjectDocumentFromDb(d: DbProjectDocument): ProjectDocument {
  return {
    id: d.id,
    projectId: d.projectId,
    projectName: d.projectName ?? undefined,
    customerName: d.customerName ?? undefined,
    category: d.category as any,
    title: d.title,
    fileUrl: d.fileUrl,
    uploadedAt: isoDateTime(d.uploadedAt)!,
    uploadedBy: d.uploadedBy,
    fileSize: d.fileSize ?? undefined,
    notes: d.notes ?? undefined,
  };
}

export function mapStockAuditLogFromDb(l: DbStockAuditLog): StockAuditLog {
  return {
    id: l.id,
    timestamp: isoDateTime(l.timestamp)!,
    itemType: l.itemType as StockItemType,
    itemId: l.itemId,
    itemName: l.itemName,
    actionType: stockActionTypeFromDb(l.actionType),
    quantity: l.quantity,
    previousAvailable: l.previousAvailable ?? undefined,
    newAvailable: l.newAvailable ?? undefined,
    projectId: l.projectId ?? undefined,
    projectName: l.projectName ?? undefined,
    customerName: l.customerName ?? undefined,
    issuedByOrActor: l.issuedByOrActor,
    condition: l.condition ? machineConditionFromDb(l.condition) : undefined,
    notes: l.notes ?? undefined,
  };
}

// ============================================================
// EXPORT: TO-DB CONVERTERS (used when sending mutations)
// ============================================================

export const toDb = {
  customerDecision: customerDecisionToDb,
  attendanceStatus: attendanceStatusToDb,
  machineCondition: machineConditionToDb,
  verification: verificationToDb,
};
