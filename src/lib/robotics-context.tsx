import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import type {
  Enquiry,
  Project,
  Customer,
  Labour,
  AttendanceRecord,
  Payment,
  SystemSettings,
  Engineer,
  CustomerDecision,
  ProjectStatus,
  PaymentStatus,
  PaymentStageStatus,
  PaymentStageItem,
  AttendanceStatus,
  ProjectActivity,
  ProjectLabourLog,
  ProjectLabourAssignment,
  MasterDataCategory,
  MasterDataItem,
  Machine,
  MachineIssueRecord,
  MachineCondition,
  Material,
  MaterialIssueRecord,
  StockItemType,
  StockActionType,
  StockAuditLog,
  ProjectDocument,
} from "./robotics-types";
import { computePaymentStatus } from "./robotics-types";
import { toast } from "sonner";

const STORAGE_KEY = "robotics_erp_v6_clean_prod";

const defaultSettings: SystemSettings = {
  companyName: "Robotics Service Management System",
  companyAddress: "Industrial Tech Park, Suite 402, High-Tech City, Hyderabad, TS",
  phone: "+91 98765 43210",
  email: "service@robotics-mgmt.com",
  taxId: "GSTIN36AABCR1234F1Z9",
  autoUpdateProjectStatusOnPayment: true,
  defaultLeadSources: ["Website Enquiry", "Phone Call", "Customer Referral", "Field Service Agent", "Direct Visit"],
  defaultLeakageTypes: [
    "Robotic Arm Oil Leakage & Joint Seal",
    "Hydraulic Actuator Pressure Drop",
    "Conveyor Motor Bearing Failure",
    "PLC Controller Communication Error",
    "SCADA Sensor Threshold Fault",
    "AGV Drive System Gear Wear",
  ],
  defaultWeeklyWagePermanent: 14000,
  defaultWeeklyWageContract: 9500,
};

const initialEngineers: Engineer[] = [
  { id: "ENG-001", name: "Er. Rajesh Kumar", phone: "9876001122", specialty: "Robotic Welding & Hydraulics Specialist" },
  { id: "ENG-002", name: "Er. Suresh V.", phone: "9876002233", specialty: "PLC & Industrial Automation Engineer" },
  { id: "ENG-003", name: "Er. Ananya Sharma", phone: "9876003344", specialty: "SCADA & Telemetry Systems Specialist" },
  { id: "ENG-004", name: "Er. Vikramaditya M.", phone: "9876004455", specialty: "Autonomous Guided Vehicles (AGV) Lead" },
];

const initialMasterData: MasterDataItem[] = [
  // Lead Source
  { id: "MD-LS-1", category: "Lead Source", value: "Phone Call", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-2", category: "Lead Source", value: "Website", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-3", category: "Lead Source", value: "Google Search", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-4", category: "Lead Source", value: "WhatsApp", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-5", category: "Lead Source", value: "Instagram", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-6", category: "Lead Source", value: "Facebook", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-7", category: "Lead Source", value: "YouTube", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-8", category: "Lead Source", value: "Word of Mouth", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-9", category: "Lead Source", value: "Existing Customer", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-10", category: "Lead Source", value: "Builder Reference", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-11", category: "Lead Source", value: "Engineer Reference", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-12", category: "Lead Source", value: "CEO Reference", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-13", category: "Lead Source", value: "Advertisement", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LS-14", category: "Lead Source", value: "Other", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Referred By Options
  { id: "MD-RB-1", category: "Referred By Options", value: "CEO", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-2", category: "Referred By Options", value: "Er. Tamilmani", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-3", category: "Referred By Options", value: "ABC Builders", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-4", category: "Referred By Options", value: "Mr. Ravi", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-5", category: "Referred By Options", value: "Existing Customer - Suresh", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-6", category: "Referred By Options", value: "Website", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-7", category: "Referred By Options", value: "Google", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-8", category: "Referred By Options", value: "Friend", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-9", category: "Referred By Options", value: "Neighbor", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-10", category: "Referred By Options", value: "Contractor", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-11", category: "Referred By Options", value: "Architect", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RB-12", category: "Referred By Options", value: "Other", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Leakage Type
  { id: "MD-LT-1", category: "Leakage Type", value: "Robotic Arm Oil Leakage & Joint Seal", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LT-2", category: "Leakage Type", value: "Hydraulic Actuator Pressure Drop", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LT-3", category: "Leakage Type", value: "Conveyor Motor Bearing Failure", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LT-4", category: "Leakage Type", value: "PLC Controller Communication Error", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LT-5", category: "Leakage Type", value: "SCADA Sensor Threshold Fault", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LT-6", category: "Leakage Type", value: "AGV Drive System Gear Wear", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Nature Of Work
  { id: "MD-NW-1", category: "Nature Of Work", value: "Robotic Arm Servicing & Joint Re-sealing", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-NW-2", category: "Nature Of Work", value: "PLC Controller Troubleshooting & Programming", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-NW-3", category: "Nature Of Work", value: "Hydraulic Line Flushing & Seal Overhaul", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-NW-4", category: "Nature Of Work", value: "Conveyor Bearing Replacement & Alignment", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Engineer Names
  { id: "MD-ENG-1", category: "Engineer Names", value: "Er. Rajesh Kumar", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-ENG-2", category: "Engineer Names", value: "Er. Suresh V.", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-ENG-3", category: "Engineer Names", value: "Er. Ananya Sharma", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-ENG-4", category: "Engineer Names", value: "Er. Vikramaditya M.", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Labour Types
  { id: "MD-LBR-1", category: "Labour Types", value: "Permanent", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-LBR-2", category: "Labour Types", value: "Contract", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Cancellation Reasons
  { id: "MD-CR-1", category: "Cancellation Reasons", value: "Client chose internal team due to budget constraints", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-CR-2", category: "Cancellation Reasons", value: "Project deferred to next quarter", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-CR-3", category: "Cancellation Reasons", value: "Equipment replaced with new machinery", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Payment Modes
  { id: "MD-PM-1", category: "Payment Modes", value: "Bank Transfer", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-PM-2", category: "Payment Modes", value: "UPI", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-PM-3", category: "Payment Modes", value: "Cheque", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-PM-4", category: "Payment Modes", value: "Cash", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Customer Decision
  { id: "MD-CD-1", category: "Customer Decision", value: "Follow Up", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-CD-2", category: "Customer Decision", value: "Thinking", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-CD-3", category: "Customer Decision", value: "Approved", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-CD-4", category: "Customer Decision", value: "Cancelled", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Customer Status
  { id: "MD-CS-1", category: "Customer Status", value: "Active", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-CS-2", category: "Customer Status", value: "Prospective", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-CS-3", category: "Customer Status", value: "VIP Account", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Project Status
  { id: "MD-PS-1", category: "Project Status", value: "Waiting", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-PS-2", category: "Project Status", value: "Scheduled", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-PS-3", category: "Project Status", value: "Ongoing", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-PS-4", category: "Project Status", value: "Completed", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-PS-5", category: "Project Status", value: "Closed", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Site Visit Status
  { id: "MD-SVS-1", category: "Site Visit Status", value: "Pending", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-SVS-2", category: "Site Visit Status", value: "Assigned", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-SVS-3", category: "Site Visit Status", value: "Visited", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-SVS-4", category: "Site Visit Status", value: "Completed", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Work Descriptions
  { id: "MD-WD-1", category: "Work Descriptions", value: "Robotic welding joint seal dismantling & gasket calibration", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-WD-2", category: "Work Descriptions", value: "Joint degreasing & hydraulic line flush", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-WD-3", category: "Work Descriptions", value: "Tooling assistant & cabinet cable harness check", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-WD-4", category: "Work Descriptions", value: "PLC programming & ladder logic verification", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Remarks Templates
  { id: "MD-RT-1", category: "Remarks Templates", value: "Preventive servicing on 6-axis welding arm", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RT-2", category: "Remarks Templates", value: "Waiting for client board review and PO issuance", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-RT-3", category: "Remarks Templates", value: "Lead engineer assigned with 2 technicians", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Machine Category
  { id: "MD-MC-1", category: "Machine Category", value: "Welding Equipment", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MC-2", category: "Machine Category", value: "Hydraulic Tools", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MC-3", category: "Machine Category", value: "Diagnostics & Automation", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MC-4", category: "Machine Category", value: "Alignment & Optics", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MC-5", category: "Machine Category", value: "Pneumatic Tools", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MC-6", category: "Machine Category", value: "Electronics Test", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Machine Brand
  { id: "MD-MB-1", category: "Machine Brand", value: "Fanuc Robotics", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MB-2", category: "Machine Brand", value: "Bosch Rexroth", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MB-3", category: "Machine Brand", value: "Siemens", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MB-4", category: "Machine Brand", value: "SKF Industrial", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MB-5", category: "Machine Brand", value: "Atlas Copco", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MB-6", category: "Machine Brand", value: "Keysight Technologies", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Machine Attachment
  { id: "MD-MA-1", category: "Machine Attachment", value: "Water-Cooled Torch Mount & Cable Assembly", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MA-2", category: "Machine Attachment", value: "Dual-Valve Quick Coupling Adapter", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MA-3", category: "Machine Attachment", value: "PROFINET Rugged Field Cable & Optical Transceiver", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MA-4", category: "Machine Attachment", value: "Magnetic V-Bracket & Wireless Sensor Units", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MA-5", category: "Machine Attachment", value: "1-Inch Impact Socket Assortment", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Material Category
  { id: "MD-MTC-1", category: "Material Category", value: "Oils & Lubricants", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MTC-2", category: "Material Category", value: "Seals & Gaskets", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MTC-3", category: "Material Category", value: "Bearings & Mechanical", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MTC-4", category: "Material Category", value: "Electrical & PLC Components", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MTC-5", category: "Material Category", value: "Hydraulic Fittings", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MTC-6", category: "Material Category", value: "Consumables", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MTC-7", category: "Material Category", value: "Chemicals & Solvents", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Material Unit
  { id: "MD-MU-1", category: "Material Unit", value: "Ltr", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MU-2", category: "Material Unit", value: "Kg", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MU-3", category: "Material Unit", value: "Meters", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MU-4", category: "Material Unit", value: "Pcs", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MU-5", category: "Material Unit", value: "Boxes", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MU-6", category: "Material Unit", value: "Rolls", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MU-7", category: "Material Unit", value: "Set", isActive: true, isDefault: true, createdAt: new Date().toISOString() },

  // Machine Unit
  { id: "MD-MCU-1", category: "Machine Unit", value: "Nos", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MCU-2", category: "Machine Unit", value: "Set", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MCU-3", category: "Machine Unit", value: "Unit", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: "MD-MCU-4", category: "Machine Unit", value: "Pcs", isActive: true, isDefault: true, createdAt: new Date().toISOString() },
];

export const calculateHoursFromTimes = (inTimeStr?: string, outTimeStr?: string): number => {
  if (!inTimeStr || !inTimeStr.trim()) return 0;
  if (!outTimeStr || !outTimeStr.trim()) return 8;

  try {
    const parseTime = (str: string) => {
      const parts = str.trim().split(" ");
      const [hours, minutes] = parts[0].split(":").map(Number);
      let h = hours;
      if (parts[1] && parts[1].toUpperCase() === "PM" && h < 12) h += 12;
      if (parts[1] && parts[1].toUpperCase() === "AM" && h === 12) h = 0;
      return h + (minutes || 0) / 60;
    };

    const inH = parseTime(inTimeStr);
    const outH = parseTime(outTimeStr);
    const diff = outH - inH;
    return diff > 0 ? Math.round(diff * 10) / 10 : 8;
  } catch {
    return 8;
  }
};

export const calculateEarnedWage = (weeklyWage: number = 1400, hoursWorked: number = 0): number => {
  if (!hoursWorked || hoursWorked <= 0) return 0;
  // Standard weekly wage covers 48 hours (6 days x 8 hrs)
  const hourlyRate = (weeklyWage || 1400) / 48;
  return Math.round(hoursWorked * hourlyRate);
};

const initialEnquiries: Enquiry[] = [];

const initialLabours: Labour[] = [
  {
    id: "LBR-101",
    name: "Ramesh Chandra",
    phone: "9840998877",
    type: "Permanent",
    defaultWeeklyWage: 1400,
    status: "Assigned",
    skills: ["Robotic Joint Seals", "General Servicing", "Pneumatic Controls"],
    wageHistory: [
      { projectId: "PRJ-2026-001", projectName: "AeroTech Solutions", weeklyWage: 1400, assignedDate: "2026-08-01" },
    ],
  },
  {
    id: "LBR-102",
    name: "Suresh Kumar",
    phone: "9876543210",
    type: "Permanent",
    defaultWeeklyWage: 1600,
    status: "Available",
    skills: ["Hydraulics", "PLC Wiring", "Motor Repair"],
    wageHistory: [],
  },
  {
    id: "LBR-201",
    name: "Ganesh M.",
    phone: "9123456789",
    type: "Contract",
    defaultWeeklyWage: 1800,
    status: "Assigned",
    skills: ["SCADA Servicing", "Electrical Wiring", "Leaking"],
    wageHistory: [
      { projectId: "PRJ-2026-001", projectName: "AeroTech Solutions", weeklyWage: 1800, assignedDate: "2026-08-02" },
    ],
  },
  {
    id: "LBR-202",
    name: "Selvam K.",
    phone: "9988776655",
    type: "Contract",
    defaultWeeklyWage: 2200,
    status: "Available",
    skills: ["Conveyor Alignment", "Hydraulics"],
    wageHistory: [],
  },
];

const initialProjects: Project[] = [];

const initialCustomers: Customer[] = [];

const initialPayments: Payment[] = [];

const initialMachines: Machine[] = [];

const initialMaterials: Material[] = [];

const initialMachineIssues: MachineIssueRecord[] = [];

const initialMaterialIssues: MaterialIssueRecord[] = [];

const initialStockAuditLogs: StockAuditLog[] = [];

const initialDocuments: ProjectDocument[] = [];

const generateInitialAttendance = (): Record<string, AttendanceRecord> => {
  return {
    "LBR-101_2026-08-01": {
      id: "LBR-101_2026-08-01",
      labourId: "LBR-101",
      labourName: "Ramesh Chandra",
      projectId: "PRJ-2026-001",
      projectName: "AeroTech Solutions",
      date: "2026-08-01",
      status: "Present",
      inTime: "09:00 AM",
      outTime: "06:00 PM",
      hoursWorked: 9,
      earnedMoney: 263,
      workDescription: "Robotic Joint Seal Alignment",
      weeklyWage: 1400,
    },
    "LBR-101_2026-08-02": {
      id: "LBR-101_2026-08-02",
      labourId: "LBR-101",
      labourName: "Ramesh Chandra",
      projectId: "PRJ-2026-001",
      projectName: "AeroTech Solutions",
      date: "2026-08-02",
      status: "Present",
      inTime: "09:00 AM",
      outTime: "05:00 PM",
      hoursWorked: 8,
      earnedMoney: 233,
      workDescription: "Hydraulic Pump Overhaul",
      weeklyWage: 1400,
    },
    "LBR-201_2026-08-01": {
      id: "LBR-201_2026-08-01",
      labourId: "LBR-201",
      labourName: "Ganesh M.",
      projectId: "PRJ-2026-001",
      projectName: "AeroTech Solutions",
      date: "2026-08-01",
      status: "Present",
      inTime: "08:30 AM",
      outTime: "06:30 PM",
      hoursWorked: 10,
      earnedMoney: 375,
      workDescription: "PLC Wiring & Sensor Calibration",
      weeklyWage: 1800,
    },
  };
};

type RoboticsContextType = {
  enquiries: Enquiry[];
  projects: Project[];
  labours: Labour[];
  payments: Payment[];
  attendance: Record<string, AttendanceRecord>;
  engineers: Engineer[];
  settings: SystemSettings;
  customers: Customer[];
  masterData: MasterDataItem[];
  machines: Machine[];
  materials: Material[];
  machineIssues: MachineIssueRecord[];
  materialIssues: MaterialIssueRecord[];
  documents: ProjectDocument[];
  stockAuditLogs: StockAuditLog[];

  // Engineer Actions & Availability
  addEngineer: (eng: Omit<Engineer, "id">) => Engineer;
  updateEngineer: (id: string, updates: Partial<Engineer>) => void;
  deleteEngineer: (id: string) => void;
  checkEngineerAvailability: (engineerId: string, engineerName?: string, siteVisitDate?: string, excludeEnquiryId?: string) => { isAvailable: boolean; currentProject?: Project; conflictMessage?: string };
  checkLabourAvailability: (labourId: string) => { isAvailable: boolean; currentProject?: Project; conflictMessage?: string };

  // Document Actions
  addDocument: (doc: Omit<ProjectDocument, "id" | "uploadedAt">) => ProjectDocument;
  deleteDocument: (id: string) => void;

  // Master Data Actions
  getMasterDataByCategory: (category: MasterDataCategory) => MasterDataItem[];
  addMasterDataItem: (category: MasterDataCategory, value: string) => MasterDataItem;
  updateMasterDataItem: (id: string, newValue: string) => void;
  deleteMasterDataItem: (id: string) => void;
  toggleMasterDataItemActive: (id: string) => void;

  // Enquiry & Project Actions with Unified Bi-directional Data Sync
  addEnquiry: (e: Omit<Enquiry, "id" | "createdAt" | "customerDecision" | "siteVisitStatus">) => Enquiry;
  updateEnquiry: (id: string, e: Partial<Enquiry>) => void;
  deleteEnquiry: (id: string) => void;
  approveAndConvertEnquiryToProject: (enquiryId: string) => Project | undefined;
  
  updateProject: (id: string, p: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  updateProjectStatus: (id: string, status: ProjectStatus, note?: string) => void;
  assignLaboursToProject: (projectId: string, assignments: { labourId: string; weeklyWage: number }[]) => void;
  updateProjectLabourLog: (projectId: string, log: ProjectLabourLog) => void;
  
  addLabour: (l: Omit<Labour, "id">) => Labour;
  updateLabour: (id: string, l: Partial<Labour>) => void;
  deleteLabour: (id: string) => void;
  recordAttendance: (record: Omit<AttendanceRecord, "id">) => void;
  
  addPayment: (pay: Omit<Payment, "id" | "createdAt">) => Payment | undefined;
  deletePayment: (id: string) => void;
  addPaymentStage: (projectId: string, stage: Omit<PaymentStageItem, "id" | "status">) => void;
  updatePaymentStage: (projectId: string, stageId: string, updates: Partial<PaymentStageItem>) => void;
  deletePaymentStage: (projectId: string, stageId: string) => void;
  applyPresetPaymentPlan: (
    projectId: string,
    presetType: "100_ADVANCE" | "50_50" | "20_30_50" | "100_CREDIT"
  ) => void;

  // Machine Actions
  addMachine: (m: Omit<Machine, "id" | "createdAt" | "issuedQuantity" | "repairQuantity" | "lostQuantity">) => Machine;
  updateMachine: (id: string, updates: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;
  issueMachineToProject: (params: {
    machineId: string;
    projectId: string;
    quantity: number;
    issueDate: string;
    expectedReturnDate: string;
    issuedBy: string;
    remarks?: string;
  }) => MachineIssueRecord | undefined;
  returnMachineFromProject: (params: {
    issueRecordId: string;
    returnQty: number;
    condition: MachineCondition;
    returnRemarks?: string;
    returnedBy?: string;
  }) => void;

  // Material Actions
  addMaterial: (m: Omit<Material, "id" | "createdAt">) => Material;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  issueMaterialToProject: (params: {
    materialId: string;
    projectId: string;
    quantity: number;
    issueDate: string;
    issuedBy: string;
    remarks?: string;
  }) => MaterialIssueRecord | undefined;
  adjustStock: (params: {
    itemType: StockItemType;
    itemId: string;
    newQuantity: number;
    reason: string;
    actor: string;
  }) => void;
  
  updateSettings: (s: Partial<SystemSettings>) => void;
  resetDemoData: () => void;
  resetToCleanDemoMode: () => void;
};

const RoboticsContext = createContext<RoboticsContextType | null>(null);

export function RoboticsProvider({ children }: { children: ReactNode }) {
  const [engineers, setEngineers] = useState<Engineer[]>(() => {
    if (typeof window === "undefined") return initialEngineers;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_engineers`);
      return stored ? JSON.parse(stored) : initialEngineers;
    } catch {
      return initialEngineers;
    }
  });

  const [documents, setDocuments] = useState<ProjectDocument[]>(() => {
    if (typeof window === "undefined") return initialDocuments;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_documents`);
      return stored ? JSON.parse(stored) : initialDocuments;
    } catch {
      return initialDocuments;
    }
  });

  const [masterData, setMasterData] = useState<MasterDataItem[]>(() => {
    if (typeof window === "undefined") return initialMasterData;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_masterdata`);
      return stored ? JSON.parse(stored) : initialMasterData;
    } catch {
      return initialMasterData;
    }
  });

  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    if (typeof window === "undefined") return initialEnquiries;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_enquiries`);
      return stored ? JSON.parse(stored) : initialEnquiries;
    } catch {
      return initialEnquiries;
    }
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window === "undefined") return initialProjects;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_projects`);
      return stored ? JSON.parse(stored) : initialProjects;
    } catch {
      return initialProjects;
    }
  });

  const [labours, setLabours] = useState<Labour[]>(() => {
    if (typeof window === "undefined") return initialLabours;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_labours`);
      return stored ? JSON.parse(stored) : initialLabours;
    } catch {
      return initialLabours;
    }
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    if (typeof window === "undefined") return initialPayments;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_payments`);
      return stored ? JSON.parse(stored) : initialPayments;
    } catch {
      return initialPayments;
    }
  });

  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>(() => {
    if (typeof window === "undefined") return generateInitialAttendance();
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_attendance`);
      return stored ? JSON.parse(stored) : generateInitialAttendance();
    } catch {
      return generateInitialAttendance();
    }
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    if (typeof window === "undefined") return defaultSettings;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_settings`);
      return stored ? JSON.parse(stored) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [machines, setMachines] = useState<Machine[]>(() => {
    if (typeof window === "undefined") return initialMachines;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_machines`);
      return stored ? JSON.parse(stored) : initialMachines;
    } catch {
      return initialMachines;
    }
  });

  const [materials, setMaterials] = useState<Material[]>(() => {
    if (typeof window === "undefined") return initialMaterials;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_materials`);
      return stored ? JSON.parse(stored) : initialMaterials;
    } catch {
      return initialMaterials;
    }
  });

  const [machineIssues, setMachineIssues] = useState<MachineIssueRecord[]>(() => {
    if (typeof window === "undefined") return initialMachineIssues;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_machine_issues`);
      return stored ? JSON.parse(stored) : initialMachineIssues;
    } catch {
      return initialMachineIssues;
    }
  });

  const [materialIssues, setMaterialIssues] = useState<MaterialIssueRecord[]>(() => {
    if (typeof window === "undefined") return initialMaterialIssues;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_material_issues`);
      return stored ? JSON.parse(stored) : initialMaterialIssues;
    } catch {
      return initialMaterialIssues;
    }
  });

  const [stockAuditLogs, setStockAuditLogs] = useState<StockAuditLog[]>(() => {
    if (typeof window === "undefined") return initialStockAuditLogs;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_stock_audit_logs`);
      return stored ? JSON.parse(stored) : initialStockAuditLogs;
    } catch {
      return initialStockAuditLogs;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_masterdata`, JSON.stringify(masterData));
      localStorage.setItem(`${STORAGE_KEY}_enquiries`, JSON.stringify(enquiries));
      localStorage.setItem(`${STORAGE_KEY}_projects`, JSON.stringify(projects));
      localStorage.setItem(`${STORAGE_KEY}_labours`, JSON.stringify(labours));
      localStorage.setItem(`${STORAGE_KEY}_payments`, JSON.stringify(payments));
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(attendance));
      localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(settings));
      localStorage.setItem(`${STORAGE_KEY}_machines`, JSON.stringify(machines));
      localStorage.setItem(`${STORAGE_KEY}_materials`, JSON.stringify(materials));
      localStorage.setItem(`${STORAGE_KEY}_machine_issues`, JSON.stringify(machineIssues));
      localStorage.setItem(`${STORAGE_KEY}_material_issues`, JSON.stringify(materialIssues));
      localStorage.setItem(`${STORAGE_KEY}_stock_audit_logs`, JSON.stringify(stockAuditLogs));
      localStorage.setItem(`${STORAGE_KEY}_engineers`, JSON.stringify(engineers));
      localStorage.setItem(`${STORAGE_KEY}_documents`, JSON.stringify(documents));
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }, [masterData, enquiries, projects, labours, payments, attendance, settings, machines, materials, machineIssues, materialIssues, stockAuditLogs, engineers, documents]);

  // Engineer Actions & Conflict Checking
  const addEngineer = (data: Omit<Engineer, "id">) => {
    const newId = `ENG-${String(engineers.length + 1).padStart(3, "0")}`;
    const newEng: Engineer = { id: newId, status: "Available", ...data };
    setEngineers((prev) => [newEng, ...prev]);
    toast.success(`Engineer ${newEng.name} registered`);
    return newEng;
  };

  const updateEngineer = (id: string, updates: Partial<Engineer>) => {
    setEngineers((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    toast.success("Engineer details updated");
  };

  const deleteEngineer = (id: string) => {
    setEngineers((prev) => prev.filter((e) => e.id !== id));
    toast.success("Engineer deleted");
  };

  const checkEngineerAvailability = (engineerId: string, engineerName?: string, siteVisitDate?: string, excludeEnquiryId?: string) => {
    const eng = engineers.find((e) => e.id === engineerId || e.name === engineerName || e.name === engineerId);
    if (!eng) return { isAvailable: true };

    if (siteVisitDate) {
      const conflictingEnquiry = enquiries.find(
        (e) =>
          e.id !== excludeEnquiryId &&
          (e.assignedEngineerId === eng.id || e.assignedEngineerName === eng.name) &&
          e.siteVisitDate === siteVisitDate &&
          e.siteVisitStatus !== "Completed" &&
          e.customerDecision !== "Cancelled"
      );
      if (conflictingEnquiry) {
        return {
          isAvailable: false,
          conflictMessage: `Engineer ${eng.name} is already scheduled for a site visit on ${siteVisitDate} (${conflictingEnquiry.customerName})`,
        };
      }
    }

    const activeProj = projects.find(
      (p) =>
        (p.assignedEngineerId === eng.id || p.assignedEngineerName === eng.name) &&
        (p.status === "Ongoing" || p.status === "Scheduled")
    );

    if (activeProj) {
      return {
        isAvailable: false,
        currentProject: activeProj,
        conflictMessage: `Already Assigned to ${activeProj.id} (${activeProj.customerName}) | Scheduled: ${activeProj.scheduledDate} | Next Available: ${activeProj.workCommittedDate || "End of Work"}`,
      };
    }
    return { isAvailable: true };
  };

  const checkLabourAvailability = (labourId: string) => {
    const activeProj = projects.find(
      (p) =>
        p.assignedLabourIds.includes(labourId) &&
        (p.status === "Ongoing" || p.status === "Scheduled")
    );

    if (activeProj) {
      return {
        isAvailable: false,
        currentProject: activeProj,
        conflictMessage: `Already Assigned to ${activeProj.id} (${activeProj.customerName}) | Expected Completion: ${activeProj.workCommittedDate || "On Going"}`,
      };
    }
    return { isAvailable: true };
  };

  // Document Artifact Actions
  const addDocument = (data: Omit<ProjectDocument, "id" | "uploadedAt">) => {
    const newId = `DOC-2026-${String(documents.length + 1).padStart(3, "0")}`;
    const newDoc: ProjectDocument = {
      id: newId,
      uploadedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      ...data,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    toast.success(`Document ${newDoc.title} uploaded successfully`);
    return newDoc;
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    toast.success("Document deleted");
  };

  // Master Data Methods
  const getMasterDataByCategory = (category: MasterDataCategory) => {
    return masterData.filter((item) => item.category === category);
  };

  const addMasterDataItem = (category: MasterDataCategory, value: string) => {
    const existing = masterData.find(
      (m) => m.category === category && m.value.toLowerCase().trim() === value.toLowerCase().trim()
    );
    if (existing) {
      if (!existing.isActive) {
        toggleMasterDataItemActive(existing.id);
      }
      return existing;
    }

    const newItem: MasterDataItem = {
      id: `MD-${category.slice(0, 3).toUpperCase()}-${Date.now()}`,
      category,
      value: value.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setMasterData((prev) => [...prev, newItem]);
    toast.success(`"${value}" saved to Master Data (${category})`);
    return newItem;
  };

  const updateMasterDataItem = (id: string, newValue: string) => {
    setMasterData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, value: newValue.trim() } : item))
    );
    toast.success("Master value updated");
  };

  const deleteMasterDataItem = (id: string) => {
    setMasterData((prev) => prev.filter((item) => item.id !== id));
    toast.info("Master value removed");
  };

  const toggleMasterDataItemActive = (id: string) => {
    setMasterData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item))
    );
  };

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();

    const normalize = (name: string, phone: string, location: string) => {
      const key = `${name.toLowerCase().trim()}_${phone.trim()}`;
      if (!map.has(key)) {
        map.set(key, {
          id: `CUST-${Math.abs(key.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0))}`,
          name: name.trim(),
          phone: phone.trim(),
          location: location.trim(),
          createdAt: new Date().toISOString(),
        });
      }
    };

    enquiries.forEach((e) => normalize(e.customerName, e.phone, e.location));
    projects.forEach((p) => normalize(p.customerName, p.phone, p.location));

    return Array.from(map.values());
  }, [enquiries, projects]);

  const recalculateProjectPayment = (
    projectId: string,
    currentProjects: Project[],
    currentPayments: Payment[]
  ): Project[] => {
    const projectPayments = currentPayments.filter((p) => p.projectId === projectId);
    const totalReceived = projectPayments.reduce((sum, p) => sum + p.amount, 0);
    const todayStr = new Date().toISOString().slice(0, 10);

    return currentProjects.map((proj) => {
      if (proj.id !== projectId) return proj;

      const balance = Math.max(0, proj.projectValue - totalReceived);
      
      // Update Payment Stage Allocations automatically
      let remainingPool = totalReceived;
      const updatedStages = (proj.paymentStages || []).map((stage) => {
        let paidAmt = 0;
        let stgStatus: PaymentStageStatus = "Pending";

        if (remainingPool >= stage.amount) {
          paidAmt = stage.amount;
          stgStatus = "Paid";
          remainingPool -= stage.amount;
        } else if (remainingPool > 0) {
          paidAmt = remainingPool;
          stgStatus = "Partial";
          remainingPool = 0;
        } else {
          paidAmt = 0;
          if (stage.dueDate && stage.dueDate < todayStr) {
            stgStatus = "Overdue";
          } else {
            stgStatus = "Pending";
          }
        }

        return {
          ...stage,
          paidAmount: paidAmt,
          status: stgStatus,
        };
      });

      const autoPayStatus: PaymentStatus = computePaymentStatus(
        proj.projectValue,
        totalReceived,
        proj.workCommittedDate,
        updatedStages
      );

      let newStatus = proj.status;
      if (settings.autoUpdateProjectStatusOnPayment && autoPayStatus === "Paid" && proj.status === "Ongoing") {
        newStatus = "Completed";
      }

      return {
        ...proj,
        receivedAmount: totalReceived,
        balanceAmount: balance,
        paymentStatus: autoPayStatus,
        paymentStages: updatedStages,
        status: newStatus,
      };
    });
  };

  const addEnquiry = (e: Omit<Enquiry, "id" | "createdAt" | "customerDecision" | "siteVisitStatus">) => {
    const nextNum = enquiries.length + 1;
    const autoId = `ENQ-2026-${String(nextNum).padStart(3, "0")}`;
    
    let engName = e.assignedEngineerName;
    if (e.assignedEngineerId) {
      const eng = engineers.find((x) => x.id === e.assignedEngineerId);
      if (eng) engName = eng.name;
      if (e.siteVisitDate) {
        const conflict = enquiries.find(
          (x) => x.assignedEngineerId === e.assignedEngineerId && x.siteVisitDate === e.siteVisitDate
        );
        if (conflict) {
          toast.warning(`⚠ Engineer already assigned to another visit (${conflict.id}) on ${e.siteVisitDate}.`);
        }
      }
    }

    const newEnq: Enquiry = {
      ...e,
      id: autoId,
      assignedEngineerName: engName,
      siteVisitStatus: e.assignedEngineerId ? "Assigned" : "Pending",
      customerDecision: "Follow Up",
      customerStatus: e.customerStatus || "Prospective",
      createdAt: new Date().toISOString(),
    };

    // Store smart master data entries automatically
    if (e.leadSource) addMasterDataItem("Lead Source", e.leadSource);
    if (e.leakageType) addMasterDataItem("Leakage Type", e.leakageType);
    if (engName) addMasterDataItem("Engineer Names", engName);

    setEnquiries((prev) => [newEnq, ...prev]);
    toast.success(`Enquiry ${autoId} created for ${e.customerName}`);
    return newEnq;
  };

  // BI-DIRECTIONAL FIELD SYNCHRONIZATION (ENQUIRY -> PROJECT)
  const updateEnquiry = (id: string, e: Partial<Enquiry>) => {
    let resolvedEngName: string | undefined = undefined;

    if (e.assignedEngineerId && e.siteVisitDate) {
      const conflict = enquiries.find(
        (x) => x.id !== id && x.assignedEngineerId === e.assignedEngineerId && x.siteVisitDate === e.siteVisitDate
      );
      if (conflict) {
        toast.warning(`⚠ Engineer already assigned to another visit (${conflict.id}) on ${e.siteVisitDate}.`);
      }
    }

    setEnquiries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        let engName = item.assignedEngineerName;
        if (e.assignedEngineerId) {
          const eng = engineers.find((x) => x.id === e.assignedEngineerId);
          if (eng) engName = eng.name;
        } else if (e.assignedEngineerName) {
          engName = e.assignedEngineerName;
        }
        resolvedEngName = engName;

        return { ...item, ...e, assignedEngineerName: engName };
      })
    );

    // Auto-sync back to linked Project if it exists!
    setProjects((prevProjects) => {
      let linkedProjectFound = false;

      const nextProjects = prevProjects.map((proj) => {
        if (proj.enquiryId !== id) return proj;
        linkedProjectFound = true;

        const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
        const newActivities = [...proj.activities];

        const updatedVal = e.quotationAmount !== undefined ? e.quotationAmount : proj.projectValue;
        const updatedBalance = Math.max(0, updatedVal - proj.receivedAmount);
        let payStatus = proj.paymentStatus;
        if (proj.receivedAmount >= updatedVal && updatedVal > 0) payStatus = "Paid";
        else if (proj.receivedAmount > 0) payStatus = "Partial";
        else payStatus = "Pending";

        let newStatus = proj.status;
        if (e.workCommittedDate && proj.status === "Waiting") {
          newStatus = "Scheduled";
        }

        newActivities.unshift({
          id: `ACT-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowStr,
          event: "Enquiry Bi-Directional Auto-Sync",
          actor: "ERP Workflow Engine",
          details: `Synchronized Enquiry ${id} updates automatically to Project ${proj.id}`,
        });

        return {
          ...proj,
          customerName: e.customerName ?? proj.customerName,
          phone: e.phone ?? proj.phone,
          location: e.location ?? proj.location,
          leadSource: e.leadSource ?? proj.leadSource,
          leakageType: e.leakageType ?? proj.leakageType,
          natureOfWork: e.leakageType ?? proj.natureOfWork,
          assignedEngineerId: e.assignedEngineerId ?? proj.assignedEngineerId,
          assignedEngineerName: resolvedEngName ?? e.assignedEngineerName ?? proj.assignedEngineerName,
          siteVisitDate: e.siteVisitDate ?? proj.siteVisitDate,
          siteVisitStatus: e.siteVisitStatus ?? proj.siteVisitStatus,
          quotationDate: e.quotationDate ?? proj.quotationDate,
          quotationAmount: e.quotationAmount ?? proj.quotationAmount,
          projectValue: updatedVal,
          balanceAmount: updatedBalance,
          paymentStatus: payStatus,
          workCommittedDate: e.workCommittedDate ?? proj.workCommittedDate,
          actualWorkStartedDate: e.actualWorkStartedDate ?? proj.actualWorkStartedDate,
          remarks: e.remarks ?? proj.remarks,
          customerDecision: e.customerDecision ?? proj.customerDecision,
          cancellationReason: e.cancellationReason ?? proj.cancellationReason,
          status: newStatus,
          activities: newActivities,
        };
      });

      if (linkedProjectFound) {
        toast.info(`Enquiry ${id} updates automatically synchronized to linked Project!`);
      }

      return nextProjects;
    });
  };

  const deleteEnquiry = (id: string) => {
    setEnquiries((prev) => prev.filter((item) => item.id !== id));
    toast.success(`Enquiry ${id} deleted successfully`);
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((item) => item.id !== id));
    toast.success(`Project ${id} deleted successfully`);
  };

  // ONE-CLICK PROJECT CONVERSION WITH 100% INHERITED FIELDS (ZERO RE-ENTRY)
  const approveAndConvertEnquiryToProject = (enquiryId: string): Project | undefined => {
    const enq = enquiries.find((x) => x.id === enquiryId);
    if (!enq) {
      toast.error("Enquiry record not found");
      return undefined;
    }

    if (enq.customerDecision !== "Approved") {
      toast.error("Customer Decision must be 'Approved' to convert into a Project");
      return undefined;
    }

    const existingProj = projects.find((p) => p.enquiryId === enquiryId);
    if (existingProj) {
      toast.info(`Project ${existingProj.id} already exists for Enquiry ${enquiryId}`);
      return existingProj;
    }

    const nextProjNum = projects.length + 1;
    const newProjectId = `PRJ-2026-${String(nextProjNum).padStart(3, "0")}`;
    const costValue = enq.quotationAmount || 0;
    const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");

    const initialStatus: ProjectStatus = "Scheduled";

    const initialActivities: ProjectActivity[] = [
      { id: `ACT-${Math.random().toString(36).slice(2, 6)}`, timestamp: enq.createdAt.slice(0, 16).replace("T", " "), event: "Enquiry Created", actor: "System", details: `Logged ${enq.id} via ${enq.leadSource}` },
      { id: `ACT-${Math.random().toString(36).slice(2, 6)}`, timestamp: nowStr, event: "Engineer Assigned", actor: "Service Lead", details: `Assigned ${enq.assignedEngineerName || "Unassigned"}` },
      { id: `ACT-${Math.random().toString(36).slice(2, 6)}`, timestamp: nowStr, event: "Site Visit Done", actor: enq.assignedEngineerName || "Service Engineer", details: `Site visit completed on ${enq.siteVisitDate || "TBD"} (${enq.siteVisitStatus})` },
      { id: `ACT-${Math.random().toString(36).slice(2, 6)}`, timestamp: nowStr, event: "Quotation Sent", actor: "System", details: `Quotation Amount: ₹${costValue.toLocaleString("en-IN")}` },
      { id: `ACT-${Math.random().toString(36).slice(2, 6)}`, timestamp: nowStr, event: "Customer Approved", actor: "Client", details: "Quotation approved by customer" },
      { id: `ACT-${Math.random().toString(36).slice(2, 6)}`, timestamp: nowStr, event: "Project Created", actor: "ERP Workflow Engine", details: `Generated ${newProjectId} inheriting 100% of Enquiry details without re-entry` },
    ];

    const newProject: Project = {
      id: newProjectId,
      enquiryId: enq.id,
      customerName: enq.customerName,
      phone: enq.phone,
      location: enq.location,
      leadSource: enq.leadSource,
      referredBy: enq.referredBy,
      leakageType: enq.leakageType,
      natureOfWork: enq.leakageType,
      assignedEngineerId: enq.assignedEngineerId,
      assignedEngineerName: enq.assignedEngineerName || "",
      siteVisitDate: enq.siteVisitDate,
      siteVisitStatus: enq.siteVisitStatus,
      quotationDate: enq.quotationDate,
      quotationAmount: costValue,
      projectValue: costValue,
      scheduledDate: enq.siteVisitDate || new Date().toISOString().slice(0, 10),
      workCommittedDate: enq.workCommittedDate || "",
      actualWorkStartedDate: enq.actualWorkStartedDate || "",
      customerDecision: "Approved",
      assignedLabourIds: [],
      labourAssignments: [],
      remarks: enq.remarks || `Inherited from Enquiry ${enq.id}`,
      status: initialStatus,
      receivedAmount: 0,
      balanceAmount: costValue,
      paymentStatus: "Pending",
      internalNotes: `Auto-inherited from Approved Enquiry ${enq.id}. Lead Source: ${enq.leadSource}. Work Committed Date: ${enq.workCommittedDate || "Not Specified"}. Actual Work Started Date: ${enq.actualWorkStartedDate || "Not Specified"}.`,
      createdAt: new Date().toISOString(),
      statusHistory: [
        {
          status: initialStatus,
          timestamp: new Date().toISOString(),
          note: `Project created automatically from Approved Enquiry ${enq.id} (Status: ${initialStatus})`,
        },
      ],
      activities: initialActivities,
      labourLogs: [],
    };

    // Update enquiry with reference to project
    setEnquiries((prev) =>
      prev.map((item) => (item.id === enquiryId ? { ...item, projectId: newProjectId } : item))
    );

    setProjects((prev) => [newProject, ...prev]);
    toast.success(`Enquiry ${enq.id} converted! Project ${newProjectId} created with zero re-entry! 🎉`);
    return newProject;
  };

  // BI-DIRECTIONAL FIELD SYNCHRONIZATION (PROJECT -> ENQUIRY)
  const updateProject = (id: string, p: Partial<Project>) => {
    let linkedEnquiryId: string | undefined = undefined;

    setProjects((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        linkedEnquiryId = item.enquiryId;
        const updatedVal = p.projectValue !== undefined ? p.projectValue : item.projectValue;
        const updatedReceived = p.receivedAmount !== undefined ? p.receivedAmount : item.receivedAmount;
        const newBalance = Math.max(0, updatedVal - updatedReceived);
        let payStatus = item.paymentStatus;
        if (updatedReceived >= updatedVal && updatedVal > 0) payStatus = "Paid";
        else if (updatedReceived > 0) payStatus = "Partial";
        else payStatus = "Pending";

        return { ...item, ...p, balanceAmount: newBalance, paymentStatus: payStatus };
      })
    );

    // Auto-sync back to linked Enquiry automatically
    if (linkedEnquiryId) {
      setEnquiries((prevEnquiries) =>
        prevEnquiries.map((enq) => {
          if (enq.id !== linkedEnquiryId) return enq;
          return {
            ...enq,
            ...(p.customerName !== undefined ? { customerName: p.customerName } : {}),
            ...(p.phone !== undefined ? { phone: p.phone } : {}),
            ...(p.location !== undefined ? { location: p.location } : {}),
            ...(p.leadSource !== undefined ? { leadSource: p.leadSource } : {}),
            ...(p.leakageType !== undefined ? { leakageType: p.leakageType } : {}),
            ...(p.natureOfWork !== undefined ? { leakageType: p.natureOfWork } : {}),
            ...(p.assignedEngineerId !== undefined ? { assignedEngineerId: p.assignedEngineerId } : {}),
            ...(p.assignedEngineerName !== undefined ? { assignedEngineerName: p.assignedEngineerName } : {}),
            ...(p.siteVisitDate !== undefined ? { siteVisitDate: p.siteVisitDate } : {}),
            ...(p.siteVisitStatus !== undefined ? { siteVisitStatus: p.siteVisitStatus } : {}),
            ...(p.quotationDate !== undefined ? { quotationDate: p.quotationDate } : {}),
            ...(p.quotationAmount !== undefined ? { quotationAmount: p.quotationAmount } : {}),
            ...(p.projectValue !== undefined ? { quotationAmount: p.projectValue } : {}),
            ...(p.workCommittedDate !== undefined ? { workCommittedDate: p.workCommittedDate } : {}),
            ...(p.actualWorkStartedDate !== undefined ? { actualWorkStartedDate: p.actualWorkStartedDate } : {}),
            ...(p.remarks !== undefined ? { remarks: p.remarks } : {}),
            ...(p.customerDecision !== undefined ? { customerDecision: p.customerDecision } : {}),
            ...(p.cancellationReason !== undefined ? { cancellationReason: p.cancellationReason } : {}),
          };
        })
      );
    }

    toast.success("Project updated & synchronized with Enquiry!");
  };

  const updateProjectStatus = (id: string, status: ProjectStatus, note?: string) => {
    const targetProj = projects.find((p) => p.id === id);
    if (status === "Closed" && targetProj) {
      if (targetProj.balanceAmount > 0) {
        toast.error(`Cannot close project: Outstanding balance (₹${targetProj.balanceAmount.toLocaleString("en-IN")}) must be 0.`);
        return;
      }
      if (targetProj.status !== "Completed") {
        toast.error("Cannot close project: Project must be marked 'Completed' first.");
        return;
      }
    }

    const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");

    setProjects((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newActivity: ProjectActivity = {
          id: `ACT-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowStr,
          event: status === "Completed" ? "Project Completed" : `Status Changed to ${status}`,
          actor: "Manager",
          details: note || `Project status updated to ${status}`,
        };

        return {
          ...item,
          status,
          statusHistory: [
            ...item.statusHistory,
            { status, timestamp: new Date().toISOString(), note: note || `Status changed to ${status}` },
          ],
          activities: [newActivity, ...item.activities],
        };
      })
    );
    toast.success(`Project status changed to ${status}`);
  };

  // LABOUR MANAGEMENT WITH EDITABLE WEEKLY WAGES PER ASSIGNMENT
  const assignLaboursToProject = (
    projectId: string,
    assignments: { labourId: string; weeklyWage: number }[]
  ) => {
    const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
    const todayStr = new Date().toISOString().slice(0, 10);
    const targetProject = projects.find((p) => p.id === projectId);
    const projName = targetProject?.customerName || projectId;

    const validAssignments: { labourId: string; weeklyWage: number }[] = [];
    for (const { labourId, weeklyWage } of assignments) {
      const existingProject = projects.find(
        (p) =>
          p.id !== projectId &&
          (p.status === "Ongoing" || p.status === "Scheduled") &&
          p.assignedLabourIds.includes(labourId)
      );
      if (existingProject) {
        toast.error(`Labour already allocated to Project ${existingProject.id} (${existingProject.customerName}). Choose another labour.`);
        continue;
      }
      validAssignments.push({ labourId, weeklyWage });
    }
    if (validAssignments.length === 0 && assignments.length > 0) {
      return;
    }

    const assignedIds = validAssignments.map((a) => a.labourId);

    const newAssignments: ProjectLabourAssignment[] = [];
    const newLabourLogs: ProjectLabourLog[] = targetProject ? [...targetProject.labourLogs] : [];

    validAssignments.forEach(({ labourId, weeklyWage }) => {
      const lab = labours.find((x) => x.id === labourId);
      if (!lab) return;

      newAssignments.push({
        labourId,
        labourName: lab.name,
        labourType: lab.type,
        weeklyWage,
        assignedDate: todayStr,
      });

      // Ensure a log exists for today
      if (!newLabourLogs.some((lg) => lg.labourId === labourId && lg.date === todayStr)) {
        newLabourLogs.push({
          labourId,
          labourName: lab.name,
          labourType: lab.type,
          weeklyWage,
          dailyWage: Math.round(weeklyWage / 6),
          date: todayStr,
          inTime: "",
          outTime: "",
          attendance: "Absent",
          hoursWorked: 0,
          workDescription: "Assigned to project",
        });
      }
    });

    setProjects((prev) =>
      prev.map((item) => {
        if (item.id !== projectId) return item;

        const newActivity: ProjectActivity = {
          id: `ACT-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowStr,
          event: "Labour Assigned",
          actor: "Project Manager",
          details: `Assigned ${assignments.length} worker(s) with project-specific weekly wages`,
        };

        return {
          ...item,
          assignedLabourIds: assignedIds,
          labourAssignments: newAssignments,
          labourLogs: newLabourLogs,
          activities: [newActivity, ...item.activities],
        };
      })
    );

    // Update Labour status and log wage history on profile
    setLabours((prev) =>
      prev.map((l) => {
        const asgn = assignments.find((a) => a.labourId === l.id);
        if (!asgn) return l;

        const historyItem = {
          projectId,
          projectName: projName,
          weeklyWage: asgn.weeklyWage,
          assignedDate: todayStr,
        };

        const existingHistory = l.wageHistory || [];

        return {
          ...l,
          status: "Assigned",
          wageHistory: [historyItem, ...existingHistory.filter((h) => h.projectId !== projectId)],
        };
      })
    );

    toast.success(`Assigned ${assignments.length} labours with custom weekly wages!`);
  };

  // AUTOMATED LABOUR WORK LOG & ATTENDANCE ENGINE
  const updateProjectLabourLog = (projectId: string, log: ProjectLabourLog) => {
    const hasInTime = Boolean(log.inTime && log.inTime.trim().length > 0);
    const autoAttendance: AttendanceStatus = hasInTime ? "Present" : "Absent";
    const autoHours = hasInTime ? calculateHoursFromTimes(log.inTime, log.outTime) : 0;
    const autoEarned = calculateEarnedWage(log.weeklyWage || 1400, autoHours);
    const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");

    const updatedLog: ProjectLabourLog = {
      ...log,
      attendance: autoAttendance,
      hoursWorked: autoHours,
      earnedMoney: autoEarned,
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;

        const newLogs = p.labourLogs.map((l) =>
          l.labourId === log.labourId && l.date === log.date ? updatedLog : l
        );

        if (!newLogs.some((l) => l.labourId === log.labourId && l.date === log.date)) {
          newLogs.push(updatedLog);
        }

        const newActivity: ProjectActivity = {
          id: `ACT-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowStr,
          event: "Attendance Logged",
          actor: "Site Supervisor",
          details: `Logged ${log.labourName} (${log.inTime || "None"} to ${log.outTime || "None"}) -> Attendance: ${autoAttendance} (${autoHours} hrs | ₹${autoEarned.toLocaleString("en-IN")})`,
        };

        return {
          ...p,
          labourLogs: newLogs,
          activities: [newActivity, ...p.activities],
        };
      })
    );

    const targetProj = projects.find((x) => x.id === projectId);
    const attKey = `${log.labourId}_${log.date}`;

    // Auto sync to central Attendance module without re-entry
    setAttendance((prev) => ({
      ...prev,
      [attKey]: {
        id: attKey,
        labourId: log.labourId,
        labourName: log.labourName,
        projectId: projectId,
        projectName: targetProj ? targetProj.customerName : projectId,
        date: log.date,
        status: autoAttendance,
        inTime: log.inTime,
        outTime: log.outTime,
        hoursWorked: autoHours,
        earnedMoney: autoEarned,
        workDescription: log.workDescription,
        weeklyWage: log.weeklyWage,
      },
    }));

    toast.success(
      `Logged ${log.labourName}! ${autoHours} hrs worked • Earned Wages: ₹${autoEarned.toLocaleString("en-IN")}`
    );
  };

  const addLabour = (l: Omit<Labour, "id">) => {
    const nextNum = labours.length + 1;
    const autoId = `LBR-${String(nextNum).padStart(3, "0")}`;
    const newL: Labour = { ...l, id: autoId, wageHistory: [] };
    setLabours((prev) => [...prev, newL]);
    toast.success(`Labour ${newL.name} (${autoId}) added`);
    return newL;
  };

  const updateLabour = (id: string, l: Partial<Labour>) => {
    setLabours((prev) => prev.map((item) => (item.id === id ? { ...item, ...l } : item)));
    toast.success("Labour updated");
  };

  const deleteLabour = (id: string) => {
    setLabours((prev) => prev.filter((item) => item.id !== id));
    toast.success(`Labour record deleted`);
  };

  const recordAttendance = (record: Omit<AttendanceRecord, "id">) => {
    const key = `${record.labourId}_${record.date}`;
    setAttendance((prev) => ({
      ...prev,
      [key]: {
        ...record,
        id: key,
      },
    }));
    toast.success(`Attendance updated for ${record.date}`);
  };

  const addPayment = (pay: Omit<Payment, "id" | "createdAt">) => {
    // Duplicate reference validations
    if (pay.transactionId && payments.some((p) => p.transactionId === pay.transactionId)) {
      toast.error(`❌ Duplicate Transaction ID: ${pay.transactionId} already exists!`);
      return;
    }
    if (pay.receiptNumber && payments.some((p) => p.receiptNumber === pay.receiptNumber)) {
      toast.error(`❌ Duplicate Receipt Number: ${pay.receiptNumber} already exists!`);
      return;
    }
    if (pay.chequeNumber && payments.some((p) => p.chequeNumber === pay.chequeNumber)) {
      toast.error(`❌ Duplicate Cheque Number: ${pay.chequeNumber} already exists!`);
      return;
    }
    if (pay.utrNumber && payments.some((p) => p.utrNumber === pay.utrNumber)) {
      toast.error(`❌ Duplicate UTR Reference Number: ${pay.utrNumber} already exists!`);
      return;
    }

    const nextNum = payments.length + 1;
    const autoId = `PAY-2026-${String(nextNum).padStart(3, "0")}`;
    const receivedByText = pay.receivedBy || "Accounts & Credit Desk";
    
    const newPayment: Payment = {
      ...pay,
      id: autoId,
      receivedBy: receivedByText,
      createdAt: new Date().toISOString(),
    };

    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);

    const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");

    const updatedProjects = recalculateProjectPayment(pay.projectId, projects, updatedPayments).map((p) => {
      if (p.id !== pay.projectId) return p;

      const newBalance = p.balanceAmount;
      const payActivity: ProjectActivity = {
        id: `ACT-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowStr,
        event: "Payment Recorded",
        actor: receivedByText,
        details: `Payment Recorded: ₹${pay.amount.toLocaleString("en-IN")} via ${pay.mode} (${pay.transactionId || pay.receiptNumber || pay.utrNumber || pay.chequeNumber || pay.referenceNumber}). Outstanding balance updated to ₹${newBalance.toLocaleString("en-IN")}.`,
      };

      // Also update payment stages allocations
      let unallocated = pay.amount;
      const updatedStages = (p.paymentStages || []).map((stg) => {
        if (unallocated <= 0) return stg;
        const stagePaid = stg.paidAmount || 0;
        const dueOnStage = Math.max(0, stg.amount - stagePaid);
        if (dueOnStage <= 0) return stg;

        const fill = Math.min(unallocated, dueOnStage);
        unallocated -= fill;
        const newPaid = stagePaid + fill;
        const newStatus: PaymentStageStatus = newPaid >= stg.amount ? "Paid" : "Partial";
        return {
          ...stg,
          paidAmount: newPaid,
          status: newStatus,
          paidDate: pay.paymentDate,
        };
      });

      return {
        ...p,
        paymentStages: updatedStages,
        activities: [payActivity, ...p.activities],
      };
    });

    setProjects(updatedProjects);
    toast.success(`✅ Payment ${autoId} of ₹${pay.amount.toLocaleString("en-IN")} recorded!`);
    return newPayment;
  };

  const deletePayment = (id: string) => {
    const pay = payments.find((p) => p.id === id);
    if (!pay) return;

    const remainingPayments = payments.filter((p) => p.id !== id);
    setPayments(remainingPayments);

    const updatedProjects = recalculateProjectPayment(pay.projectId, projects, remainingPayments);
    setProjects(updatedProjects);

    toast.info(`Payment ${id} removed.`);
  };

  const addPaymentStage = (projectId: string, stage: Omit<PaymentStageItem, "id" | "status">) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const stageId = `STG-${Math.random().toString(36).slice(2, 7)}`;

    setProjects((prev) => {
      const target = prev.find((p) => p.id === projectId);
      if (!target) return prev;

      const newStage: PaymentStageItem = {
        ...stage,
        id: stageId,
        status: stage.dueDate < todayStr ? "Overdue" : "Pending",
        paidAmount: 0,
      };

      const updatedStages = [...(target.paymentStages || []), newStage];
      const updatedProjList = prev.map((p) => (p.id === projectId ? { ...p, paymentStages: updatedStages } : p));
      return recalculateProjectPayment(projectId, updatedProjList, payments);
    });

    toast.success("Payment stage added successfully");
  };

  const updatePaymentStage = (projectId: string, stageId: string, updates: Partial<PaymentStageItem>) => {
    setProjects((prev) => {
      const updatedProjList = prev.map((p) => {
        if (p.id !== projectId) return p;
        const stages = (p.paymentStages || []).map((s) => (s.id === stageId ? { ...s, ...updates } : s));
        return { ...p, paymentStages: stages };
      });
      return recalculateProjectPayment(projectId, updatedProjList, payments);
    });

    toast.success("Payment stage updated");
  };

  const deletePaymentStage = (projectId: string, stageId: string) => {
    setProjects((prev) => {
      const updatedProjList = prev.map((p) => {
        if (p.id !== projectId) return p;
        const stages = (p.paymentStages || []).filter((s) => s.id !== stageId);
        return { ...p, paymentStages: stages };
      });
      return recalculateProjectPayment(projectId, updatedProjList, payments);
    });

    toast.info("Payment stage removed");
  };

  const applyPresetPaymentPlan = (
    projectId: string,
    presetType: "100_ADVANCE" | "50_50" | "20_30_50" | "100_CREDIT"
  ) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dOffset = (days: number) => {
      const dt = new Date();
      dt.setDate(dt.getDate() + days);
      return dt.toISOString().slice(0, 10);
    };

    setProjects((prev) => {
      const target = prev.find((p) => p.id === projectId);
      if (!target) return prev;

      const val = target.projectValue || 100000;
      let newStages: PaymentStageItem[] = [];

      if (presetType === "100_ADVANCE") {
        newStages = [
          {
            id: `STG-${Math.random().toString(36).slice(2, 7)}`,
            stageName: "100% Advance Payment",
            amount: val,
            dueDate: todayStr,
            status: "Pending",
            paymentNotes: "Full upfront payment prior to work commencement",
          },
        ];
      } else if (presetType === "50_50") {
        newStages = [
          {
            id: `STG-${Math.random().toString(36).slice(2, 7)}`,
            stageName: "50% Advance Booking",
            amount: Math.round(val * 0.5),
            dueDate: todayStr,
            status: "Pending",
            paymentNotes: "Upfront deposit required before technician deployment",
          },
          {
            id: `STG-${Math.random().toString(36).slice(2, 7)}`,
            stageName: "50% Work Completion Balance",
            amount: val - Math.round(val * 0.5),
            dueDate: dOffset(14),
            status: "Pending",
            paymentNotes: "Final balance payable immediately after service sign-off",
          },
        ];
      } else if (presetType === "20_30_50") {
        const amt1 = Math.round(val * 0.2);
        const amt2 = Math.round(val * 0.3);
        const amt3 = val - amt1 - amt2;
        newStages = [
          {
            id: `STG-${Math.random().toString(36).slice(2, 7)}`,
            stageName: "20% Mobilization Advance",
            amount: amt1,
            dueDate: todayStr,
            status: "Pending",
            paymentNotes: "Initial booking and component procurement",
          },
          {
            id: `STG-${Math.random().toString(36).slice(2, 7)}`,
            stageName: "30% Mid-Way Milestone",
            amount: amt2,
            dueDate: dOffset(10),
            status: "Pending",
            paymentNotes: "Payable upon assembly & diagnostic completion",
          },
          {
            id: `STG-${Math.random().toString(36).slice(2, 7)}`,
            stageName: "50% Final Handover & Commissioning",
            amount: amt3,
            dueDate: dOffset(25),
            status: "Pending",
            paymentNotes: "Payable upon site handover & final report approval",
          },
        ];
      } else if (presetType === "100_CREDIT") {
        newStages = [
          {
            id: `STG-${Math.random().toString(36).slice(2, 7)}`,
            stageName: "100% Full Credit Payment (Net 30)",
            amount: val,
            dueDate: dOffset(30),
            status: "Pending",
            paymentNotes: "Corporate credit terms with 30-day invoice clearance window",
          },
        ];
      }

      const updatedProjList = prev.map((p) => (p.id === projectId ? { ...p, paymentStages: newStages } : p));
      return recalculateProjectPayment(projectId, updatedProjList, payments);
    });

    toast.success("Applied preset payment plan template");
  };

  // MACHINE MANAGEMENT ACTIONS
  const addMachine = (m: Omit<Machine, "id" | "createdAt" | "issuedQuantity" | "repairQuantity" | "lostQuantity">) => {
    const autoId = `MCH-2026-${String(machines.length + 1).padStart(3, "0")}`;
    const newMachine: Machine = {
      ...m,
      id: autoId,
      availableQuantity: m.availableQuantity ?? m.currentStock,
      issuedQuantity: 0,
      repairQuantity: 0,
      lostQuantity: 0,
      createdAt: new Date().toISOString(),
    };
    setMachines((prev) => [newMachine, ...prev]);

    const audit: StockAuditLog = {
      id: `AUD-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      itemType: "Machine",
      itemId: autoId,
      itemName: m.toolName,
      actionType: "Stock Addition",
      quantity: m.currentStock,
      previousAvailable: 0,
      newAvailable: newMachine.availableQuantity,
      issuedByOrActor: "Administrator",
      notes: `New machine added: ${m.toolName}`,
    };
    setStockAuditLogs((prev) => [audit, ...prev]);

    toast.success(`Machine ${autoId} created!`);
    return newMachine;
  };

  const updateMachine = (id: string, updates: Partial<Machine>) => {
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m))
    );
    toast.success(`Machine ${id} updated`);
  };

  const deleteMachine = (id: string) => {
    setMachines((prev) => prev.filter((m) => m.id !== id));
    toast.info(`Machine ${id} deleted`);
  };

  const issueMachineToProject = (params: {
    machineId: string;
    projectId: string;
    quantity: number;
    issueDate: string;
    expectedReturnDate: string;
    issuedBy: string;
    remarks?: string;
  }) => {
    const targetMachine = machines.find((m) => m.id === params.machineId);
    if (!targetMachine) {
      toast.error("Machine not found");
      return;
    }
    if (targetMachine.availableQuantity < params.quantity) {
      toast.error("Machine not available. Already allocated.");
      return;
    }

    const targetProject = projects.find((p) => p.id === params.projectId);
    if (!targetProject) {
      toast.error("Project not found");
      return;
    }

    const nextId = `MIR-2026-${String(machineIssues.length + 1).padStart(3, "0")}`;
    const newIssueRecord: MachineIssueRecord = {
      id: nextId,
      machineId: targetMachine.id,
      machineName: targetMachine.toolName,
      category: targetMachine.category,
      brand: targetMachine.brand,
      projectId: targetProject.id,
      projectName: targetProject.customerName,
      customerName: targetProject.customerName,
      quantity: params.quantity,
      issueDate: params.issueDate || new Date().toISOString().slice(0, 10),
      expectedReturnDate: params.expectedReturnDate,
      issuedBy: params.issuedBy,
      returnedQuantity: 0,
      status: "Issued",
      remarks: params.remarks,
    };

    const prevAvailable = targetMachine.availableQuantity;
    const newAvailable = prevAvailable - params.quantity;
    const newIssued = targetMachine.issuedQuantity + params.quantity;

    setMachines((prev) =>
      prev.map((m) =>
        m.id === targetMachine.id
          ? { ...m, availableQuantity: newAvailable, issuedQuantity: newIssued }
          : m
      )
    );

    setMachineIssues((prev) => [newIssueRecord, ...prev]);

    const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
    const activity: ProjectActivity = {
      id: `ACT-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowStr,
      event: "Machine Issued",
      actor: params.issuedBy,
      details: `Issued ${params.quantity}x ${targetMachine.toolName} (${targetMachine.id})`,
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== targetProject.id) return p;
        const currentIssues = p.machineIssues || [];
        return {
          ...p,
          machineIssues: [newIssueRecord, ...currentIssues],
          activities: [activity, ...p.activities],
        };
      })
    );

    const auditLog: StockAuditLog = {
      id: `AUD-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: nowStr,
      itemType: "Machine",
      itemId: targetMachine.id,
      itemName: targetMachine.toolName,
      actionType: "Issue",
      quantity: params.quantity,
      previousAvailable: prevAvailable,
      newAvailable: newAvailable,
      projectId: targetProject.id,
      projectName: targetProject.customerName,
      customerName: targetProject.customerName,
      issuedByOrActor: params.issuedBy,
      condition: targetMachine.condition,
      notes: params.remarks || `Issued to project ${targetProject.id}`,
    };

    setStockAuditLogs((prev) => [auditLog, ...prev]);
    toast.success(`Issued ${params.quantity} unit(s) of ${targetMachine.toolName} to ${targetProject.id}`);
    return newIssueRecord;
  };

  const returnMachineFromProject = (params: {
    issueRecordId: string;
    returnQty: number;
    condition: MachineCondition;
    returnRemarks?: string;
    returnedBy?: string;
  }) => {
    const issueRecord = machineIssues.find((rec) => rec.id === params.issueRecordId);
    if (!issueRecord) {
      toast.error("Machine issue record not found");
      return;
    }

    const remainingToReturn = issueRecord.quantity - issueRecord.returnedQuantity;
    if (params.returnQty > remainingToReturn) {
      toast.error(`Cannot return ${params.returnQty}. Remaining to return: ${remainingToReturn}`);
      return;
    }

    const machine = machines.find((m) => m.id === issueRecord.machineId);
    if (!machine) {
      toast.error("Machine not found");
      return;
    }

    const updatedReturnedQty = issueRecord.returnedQuantity + params.returnQty;
    const isFullyReturned = updatedReturnedQty >= issueRecord.quantity;

    let newStatus: MachineIssueRecord["status"] = isFullyReturned ? "Returned" : "Partially Returned";
    if (params.condition === "Damaged" || params.condition === "Repair Required") {
      newStatus = "Under Repair";
    } else if (params.condition === "Lost") {
      newStatus = "Lost";
    }

    const actualReturnDate = new Date().toISOString().slice(0, 10);
    const updatedIssueRecord: MachineIssueRecord = {
      ...issueRecord,
      returnedQuantity: updatedReturnedQty,
      conditionOnReturn: params.condition,
      actualReturnedDate: actualReturnDate,
      status: newStatus,
      returnRemarks: params.returnRemarks || issueRecord.returnRemarks,
    };

    setMachineIssues((prev) =>
      prev.map((rec) => (rec.id === params.issueRecordId ? updatedIssueRecord : rec))
    );

    const newIssuedQty = Math.max(0, machine.issuedQuantity - params.returnQty);
    let newAvailableQty = machine.availableQuantity;
    let newRepairQty = machine.repairQuantity;
    let newLostQty = machine.lostQuantity;

    let stockActionType: StockActionType = "Return";

    if (params.condition === "Good") {
      newAvailableQty += params.returnQty;
      stockActionType = "Return";
    } else if (params.condition === "Damaged" || params.condition === "Repair Required") {
      newRepairQty += params.returnQty;
      stockActionType = "Repair Move";
    } else if (params.condition === "Lost") {
      newLostQty += params.returnQty;
      stockActionType = "Lost Move";
    }

    setMachines((prev) =>
      prev.map((m) =>
        m.id === machine.id
          ? {
              ...m,
              availableQuantity: newAvailableQty,
              issuedQuantity: newIssuedQty,
              repairQuantity: newRepairQty,
              lostQuantity: newLostQty,
            }
          : m
      )
    );

    const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
    const activity: ProjectActivity = {
      id: `ACT-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowStr,
      event: "Machine Returned",
      actor: params.returnedBy || "Site Manager",
      details: `Returned ${params.returnQty}x ${machine.toolName} (Condition: ${params.condition})`,
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== issueRecord.projectId) return p;
        const currentIssues = p.machineIssues || [];
        const updatedIssues = currentIssues.map((rec) =>
          rec.id === params.issueRecordId ? updatedIssueRecord : rec
        );
        return {
          ...p,
          machineIssues: updatedIssues,
          activities: [activity, ...p.activities],
        };
      })
    );

    const auditLog: StockAuditLog = {
      id: `AUD-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: nowStr,
      itemType: "Machine",
      itemId: machine.id,
      itemName: machine.toolName,
      actionType: stockActionType,
      quantity: params.returnQty,
      previousAvailable: machine.availableQuantity,
      newAvailable: newAvailableQty,
      projectId: issueRecord.projectId,
      projectName: issueRecord.projectName,
      customerName: issueRecord.customerName,
      issuedByOrActor: params.returnedBy || "Site Manager",
      condition: params.condition,
      notes: params.returnRemarks || `Returned ${params.returnQty} unit(s) as ${params.condition}`,
    };

    setStockAuditLogs((prev) => [auditLog, ...prev]);
    toast.success(`Returned ${params.returnQty} unit(s) of ${machine.toolName} (${params.condition})`);
  };

  // MATERIAL MANAGEMENT ACTIONS
  const addMaterial = (m: Omit<Material, "id" | "createdAt">) => {
    const autoId = `MAT-2026-${String(materials.length + 1).padStart(3, "0")}`;
    const newMaterial: Material = {
      ...m,
      id: autoId,
      createdAt: new Date().toISOString(),
    };
    setMaterials((prev) => [newMaterial, ...prev]);

    const audit: StockAuditLog = {
      id: `AUD-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      itemType: "Material",
      itemId: autoId,
      itemName: m.name,
      actionType: "Stock Addition",
      quantity: m.currentStock,
      previousAvailable: 0,
      newAvailable: m.currentStock,
      issuedByOrActor: "Administrator",
      notes: `New material added: ${m.name}`,
    };
    setStockAuditLogs((prev) => [audit, ...prev]);

    toast.success(`Material ${autoId} created!`);
    return newMaterial;
  };

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m))
    );
    toast.success(`Material ${id} updated`);
  };

  const deleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    toast.info(`Material ${id} deleted`);
  };

  const issueMaterialToProject = (params: {
    materialId: string;
    projectId: string;
    quantity: number;
    issueDate: string;
    issuedBy: string;
    remarks?: string;
  }) => {
    const mat = materials.find((m) => m.id === params.materialId);
    if (!mat) {
      toast.error("Material not found");
      return;
    }
    if (mat.currentStock < params.quantity) {
      toast.error(`Insufficient stock! Requested: ${params.quantity} ${mat.unit}, Available: ${mat.currentStock} ${mat.unit}`);
      return;
    }

    const targetProject = projects.find((p) => p.id === params.projectId);
    if (!targetProject) {
      toast.error("Project not found");
      return;
    }

    const nextId = `MAT-ISS-2026-${String(materialIssues.length + 1).padStart(3, "0")}`;
    const totalCost = params.quantity * mat.purchaseCost;

    const newIssueRecord: MaterialIssueRecord = {
      id: nextId,
      materialId: mat.id,
      materialName: mat.name,
      category: mat.category,
      unit: mat.unit,
      projectId: targetProject.id,
      projectName: targetProject.customerName,
      customerName: targetProject.customerName,
      quantity: params.quantity,
      unitCost: mat.purchaseCost,
      totalCost,
      issueDate: params.issueDate || new Date().toISOString().slice(0, 10),
      issuedBy: params.issuedBy,
      remarks: params.remarks,
    };

    const prevStock = mat.currentStock;
    const newStock = prevStock - params.quantity;
    setMaterials((prev) =>
      prev.map((m) => (m.id === mat.id ? { ...m, currentStock: newStock } : m))
    );

    setMaterialIssues((prev) => [newIssueRecord, ...prev]);

    const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
    const activity: ProjectActivity = {
      id: `ACT-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowStr,
      event: "Material Consumed",
      actor: params.issuedBy,
      details: `Consumed ${params.quantity} ${mat.unit} of ${mat.name} (Valued ₹${totalCost.toLocaleString("en-IN")})`,
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== targetProject.id) return p;
        const currentMatIssues = p.materialIssues || [];
        return {
          ...p,
          materialIssues: [newIssueRecord, ...currentMatIssues],
          activities: [activity, ...p.activities],
        };
      })
    );

    const auditLog: StockAuditLog = {
      id: `AUD-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: nowStr,
      itemType: "Material",
      itemId: mat.id,
      itemName: mat.name,
      actionType: "Issue",
      quantity: params.quantity,
      previousAvailable: prevStock,
      newAvailable: newStock,
      projectId: targetProject.id,
      projectName: targetProject.customerName,
      customerName: targetProject.customerName,
      issuedByOrActor: params.issuedBy,
      notes: params.remarks || `Consumed in project ${targetProject.id}`,
    };

    setStockAuditLogs((prev) => [auditLog, ...prev]);
    toast.success(`Issued ${params.quantity} ${mat.unit} of ${mat.name} to ${targetProject.id}`);
    return newIssueRecord;
  };

  const adjustStock = (params: {
    itemType: StockItemType;
    itemId: string;
    newQuantity: number;
    reason: string;
    actor: string;
  }) => {
    const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
    if (params.itemType === "Machine") {
      const m = machines.find((x) => x.id === params.itemId);
      if (!m) return;
      const prevAvailable = m.availableQuantity;
      setMachines((prev) =>
        prev.map((x) =>
          x.id === params.itemId
            ? { ...x, availableQuantity: params.newQuantity, currentStock: params.newQuantity + x.issuedQuantity }
            : x
        )
      );

      const audit: StockAuditLog = {
        id: `AUD-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: nowStr,
        itemType: "Machine",
        itemId: m.id,
        itemName: m.toolName,
        actionType: "Stock Adjustment",
        quantity: Math.abs(params.newQuantity - prevAvailable),
        previousAvailable: prevAvailable,
        newAvailable: params.newQuantity,
        issuedByOrActor: params.actor,
        notes: `Manual stock adjustment: ${params.reason}`,
      };
      setStockAuditLogs((prev) => [audit, ...prev]);
    } else {
      const mat = materials.find((x) => x.id === params.itemId);
      if (!mat) return;
      const prevAvailable = mat.currentStock;
      setMaterials((prev) =>
        prev.map((x) => (x.id === params.itemId ? { ...x, currentStock: params.newQuantity } : x))
      );

      const audit: StockAuditLog = {
        id: `AUD-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: nowStr,
        itemType: "Material",
        itemId: mat.id,
        itemName: mat.name,
        actionType: "Stock Adjustment",
        quantity: Math.abs(params.newQuantity - prevAvailable),
        previousAvailable: prevAvailable,
        newAvailable: params.newQuantity,
        issuedByOrActor: params.actor,
        notes: `Manual stock adjustment: ${params.reason}`,
      };
      setStockAuditLogs((prev) => [audit, ...prev]);
    }

    toast.success("Stock level updated");
  };

  const updateSettings = (s: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...s }));
    toast.success("Settings saved");
  };

  const resetDemoData = () => {
    setMasterData(initialMasterData);
    setEnquiries(initialEnquiries);
    setProjects(initialProjects);
    setLabours(initialLabours);
    setPayments(initialPayments);
    setAttendance(generateInitialAttendance());
    setSettings(defaultSettings);
    setMachines(initialMachines);
    setMaterials(initialMaterials);
    setMachineIssues(initialMachineIssues);
    setMaterialIssues(initialMaterialIssues);
    setStockAuditLogs(initialStockAuditLogs);
    localStorage.clear();
    toast.success("System reset to factory demo state");
  };

  const resetToCleanDemoMode = () => {
    setEnquiries([]);
    setProjects([]);
    setPayments([]);
    setAttendance({});
    setMachineIssues([]);
    setMaterialIssues([]);
    setStockAuditLogs([]);
    setDocuments([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("🧹 ERP Reset to Clean Demo Mode! All records cleared for live demonstration.");
  };

  return (
    <RoboticsContext.Provider
      value={{
        enquiries,
        projects,
        labours,
        payments,
        attendance,
        engineers,
        settings,
        customers,
        masterData,
        machines,
        materials,
        machineIssues,
        materialIssues,
        stockAuditLogs,
        documents,
        addEngineer,
        updateEngineer,
        deleteEngineer,
        checkEngineerAvailability,
        checkLabourAvailability,
        addDocument,
        deleteDocument,
        getMasterDataByCategory,
        addMasterDataItem,
        updateMasterDataItem,
        deleteMasterDataItem,
        toggleMasterDataItemActive,
        addEnquiry,
        updateEnquiry,
        deleteEnquiry,
        approveAndConvertEnquiryToProject,
        updateProject,
        deleteProject,
        updateProjectStatus,
        assignLaboursToProject,
        updateProjectLabourLog,
        addLabour,
        updateLabour,
        deleteLabour,
        recordAttendance,
        addPayment,
        deletePayment,
        addPaymentStage,
        updatePaymentStage,
        deletePaymentStage,
        applyPresetPaymentPlan,
        addMachine,
        updateMachine,
        deleteMachine,
        issueMachineToProject,
        returnMachineFromProject,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        issueMaterialToProject,
        adjustStock,
        updateSettings,
        resetDemoData,
        resetToCleanDemoMode,
      }}
    >
      {children}
    </RoboticsContext.Provider>
  );
}

export function useRobotics() {
  const ctx = useContext(RoboticsContext);
  if (!ctx) throw new Error("useRobotics must be used within RoboticsProvider");
  return ctx;
}
