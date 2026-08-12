// ============================================================
// Rewritten for DB backing (Prompt #4B).
// Reads via TanStack Query, writes via server functions in ~/server.
// Public API of useRobotics() kept stable — mutations are now async.
// ============================================================

export { calculateHoursFromTimes, calculateEarnedWage } from "~/server/calculations";

import {
  getSettings,
  updateSettings as updateSettingsFn,
} from "~/server/system-settings";

import {
  listMasterData,
  addMasterDataItem as addMasterDataItemFn,
  updateMasterDataItem as updateMasterDataItemFn,
  deleteMasterDataItem as deleteMasterDataItemFn,
  toggleMasterDataItemActive as toggleMasterDataItemActiveFn,
} from "~/server/master-data";

import {
  listEngineers,
  addEngineer as addEngineerFn,
  updateEngineer as updateEngineerFn,
  deleteEngineer as deleteEngineerFn,
} from "~/server/engineers";

import {
  listLabours,
  addLabour as addLabourFn,
  updateLabour as updateLabourFn,
  deleteLabour as deleteLabourFn,
  deactivateLabour as deactivateLabourFn,
  reactivateLabour as reactivateLabourFn,
  deleteLabourPermanently as deleteLabourPermanentlyFn,
} from "~/server/labours";


import {
  listCustomers,
} from "~/server/customers";

import {
  listDocuments,
  addDocument as addDocumentFn,
  deleteDocument as deleteDocumentFn,
} from "~/server/documents";

import {
  listEnquiries,
  listProjects,
  listPayments,
  listMachines,
  listMachineIssues,
  listMaterials,
  listMaterialIssues,
  listAttendance,
  listStockAuditLogs,
} from "~/server/read-only";

import {
  addMachine as addMachineFn,
  updateMachine as updateMachineFn,
  deleteMachine as deleteMachineFn,
} from "~/server/machines-basic";

import {
  addMaterial as addMaterialFn,
  updateMaterial as updateMaterialFn,
  deleteMaterial as deleteMaterialFn,
} from "~/server/materials-basic";

import {
  addEnquiry as addEnquiryFn,
  updateEnquiry as updateEnquiryFn,
  deleteEnquiry as deleteEnquiryFn,
  approveAndConvertEnquiryToProject as approveAndConvertEnquiryToProjectFn,
} from "~/server/enquiries";

import {
  updateProject as updateProjectFn,
  deleteProject as deleteProjectFn,
  updateProjectStatus as updateProjectStatusFn,
  assignLaboursToProject as assignLaboursToProjectFn,
  unassignLabourFromProject as unassignLabourFromProjectFn,
  updateProjectLabourLog as updateProjectLabourLogFn,
  updateFollowUpTag as updateFollowUpTagFn,
} from "~/server/projects";

import {
  addPayment as addPaymentFn,
  deletePayment as deletePaymentFn,
  addPaymentStage as addPaymentStageFn,
  updatePaymentStage as updatePaymentStageFn,
  deletePaymentStage as deletePaymentStageFn,
  applyPresetPaymentPlan as applyPresetPaymentPlanFn,
} from "~/server/payments";

import {
  issueMachineToProject as issueMachineToProjectFn,
  returnMachineFromProject as returnMachineFromProjectFn,
} from "~/server/machines";

import {
  issueMaterialToProject as issueMaterialToProjectFn,
  adjustStock as adjustStockFn,
} from "~/server/materials";

import {
  recordAttendance as recordAttendanceFn,
  verifyAttendanceRecord as verifyAttendanceRecordFn,
} from "~/server/attendance";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  Enquiry,
  Project,
  Customer,
  Labour,
  AttendanceRecord,
  Payment,
  SystemSettings,
  Engineer,
  ProjectStatus,
  PaymentStageItem,
  CurrentUser,
  ProjectLabourLog,
  MasterDataCategory,
  MasterDataItem,
  Machine,
  MachineIssueRecord,
  MachineCondition,
  Material,
  MaterialIssueRecord,
  StockItemType,
  StockAuditLog,
  ProjectDocument,
} from "./robotics-types";
import { computePaymentStatus } from "./robotics-types";
import {
  mapEnquiryFromDb,
  mapProjectFromDb,
  mapLabourFromDb,
  mapPaymentFromDb,
  mapAttendanceFromDb,
  mapEngineerFromDb,
  mapSystemSettingsFromDb,
  mapCustomerFromDb,
  mapMasterDataFromDb,
  mapMachineFromDb,
  mapMachineIssueFromDb,
  mapMaterialFromDb,
  mapMaterialIssueFromDb,
  mapStockAuditLogFromDb,
  mapProjectDocumentFromDb,
  toDb,
} from "./robotics-mappers";


const SESSION_KEY = "robotics_erp_current_user";

const defaultSettings: SystemSettings = {
  companyName: "Robotics Bricks and Blocks Pvt. Ltd.",
  companyAddress: "",
  phone: "",
  email: "",
  taxId: "",
  autoUpdateProjectStatusOnPayment: true,
  defaultLeadSources: [],
  defaultLeakageTypes: [],
  defaultWeeklyWagePermanent: 14000,
  defaultWeeklyWageContract: 9500,
};

// ============================================================
// CONTEXT TYPE
// ============================================================

type RoboticsContextType = {
  currentUser: CurrentUser | null;
  login: (role: "CEO" | "Worker" | "Labor", loginIdOrId?: string, pin?: string) => boolean;
  logout: () => void;
  isLoading: boolean;

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

  verifyAttendanceRecord: (attendanceId: string, status: "Verified" | "Rejected", verifierName: string, comments?: string) => Promise<void>;

  addEngineer: (eng: Omit<Engineer, "id">) => Promise<Engineer>;
  updateEngineer: (id: string, updates: Partial<Engineer>) => Promise<void>;
  deleteEngineer: (id: string) => Promise<void>;
  checkEngineerAvailability: (engineerId: string, engineerName?: string, siteVisitDate?: string, excludeEnquiryId?: string) => { isAvailable: boolean; currentProject?: Project; conflictMessage?: string };
  checkLabourAvailability: (labourId: string) => { isAvailable: boolean; currentProject?: Project; conflictMessage?: string };

  addDocument: (doc: Omit<ProjectDocument, "id" | "uploadedAt">) => Promise<ProjectDocument>;
  deleteDocument: (id: string) => Promise<void>;

  getMasterDataByCategory: (category: MasterDataCategory) => MasterDataItem[];
  addMasterDataItem: (category: MasterDataCategory, value: string) => Promise<MasterDataItem>;
  updateMasterDataItem: (id: string, newValue: string) => Promise<void>;
  deleteMasterDataItem: (id: string) => Promise<void>;
  toggleMasterDataItemActive: (id: string) => Promise<void>;

  addEnquiry: (e: Omit<Enquiry, "id" | "createdAt" | "customerDecision" | "siteVisitStatus">) => Promise<Enquiry>;
  updateEnquiry: (id: string, e: Partial<Enquiry>) => Promise<void>;
  deleteEnquiry: (id: string) => Promise<void>;
  approveAndConvertEnquiryToProject: (enquiryId: string) => Promise<Project | undefined>;

  updateProject: (id: string, p: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateProjectStatus: (id: string, status: ProjectStatus, note?: string) => Promise<void>;
  assignLaboursToProject: (projectId: string, assignments: { labourId: string; weeklyWage: number }[]) => Promise<void>;
  unassignLabourFromProject: (projectId: string, labourId: string) => Promise<void>;
  updateProjectLabourLog: (projectId: string, log: ProjectLabourLog) => Promise<void>;
  updateFollowUpTag: (projectId: string, followUpTag: "MD" | "Team" | null) => Promise<void>;

  addLabour: (l: Omit<Labour, "id">) => Promise<Labour>;
  updateLabour: (id: string, l: Partial<Labour>) => Promise<void>;
  deleteLabour: (id: string) => Promise<void>;
  deactivateLabour: (id: string) => Promise<void>;
  reactivateLabour: (id: string) => Promise<void>;
  deleteLabourPermanently: (id: string) => Promise<void>;
  recordAttendance: (record: Omit<AttendanceRecord, "id">) => Promise<void>;


  addPayment: (pay: Omit<Payment, "id" | "createdAt">) => Promise<Payment | undefined>;
  deletePayment: (id: string) => Promise<void>;
  addPaymentStage: (projectId: string, stage: Omit<PaymentStageItem, "id" | "status">) => Promise<void>;
  updatePaymentStage: (projectId: string, stageId: string, updates: Partial<PaymentStageItem>) => Promise<void>;
  deletePaymentStage: (projectId: string, stageId: string) => Promise<void>;
  applyPresetPaymentPlan: (projectId: string, presetType: "100_ADVANCE" | "50_50" | "20_30_50" | "100_CREDIT") => Promise<void>;

  addMachine: (m: Omit<Machine, "id" | "createdAt" | "issuedQuantity" | "repairQuantity" | "lostQuantity">) => Promise<Machine>;
  updateMachine: (id: string, updates: Partial<Machine>) => Promise<void>;
  deleteMachine: (id: string) => Promise<void>;
  issueMachineToProject: (params: { machineId: string; projectId: string; quantity: number; issueDate: string; expectedReturnDate: string; issuedBy: string; remarks?: string }) => Promise<MachineIssueRecord | undefined>;
  returnMachineFromProject: (params: { issueRecordId: string; returnQty: number; condition: MachineCondition; returnRemarks?: string; returnedBy?: string }) => Promise<void>;

  addMaterial: (m: Omit<Material, "id" | "createdAt">) => Promise<Material>;
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  issueMaterialToProject: (params: { materialId: string; projectId: string; quantity: number; issueDate: string; issuedBy: string; remarks?: string }) => Promise<MaterialIssueRecord | undefined>;
  adjustStock: (params: { itemType: StockItemType; itemId: string; newQuantity: number; reason: string; actor: string }) => Promise<void>;

  updateSettings: (s: Partial<SystemSettings>) => Promise<void>;
  resetDemoData: () => void;
  resetToCleanDemoMode: () => void;
};

const RoboticsContext = createContext<RoboticsContextType | null>(null);

function extractArray<T = any>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.result)) return raw.result;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.items)) return raw.items;
  }
  return [];
}

// ============================================================
// PROVIDER
// ============================================================

export function RoboticsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // ---------- Session (browser-local, client-side only to prevent SSR hydration mismatch) ----------
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {}
    setIsSessionLoaded(true);
  }, []);

  useEffect(() => {
    if (!isSessionLoaded) return;
    try {
      if (currentUser) localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  }, [currentUser, isSessionLoaded]);

  // ---------- Queries ----------
  const enquiriesQuery = useQuery({
    queryKey: ["enquiries"],
    queryFn: async () => {
      try {
        const raw = await listEnquiries();
        const arr = extractArray(raw);
        return arr.map((e: any) => mapEnquiryFromDb(e));
      } catch (err) {
        console.error("Error fetching/mapping enquiries:", err);
        throw err;
      }
    },
  });
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      try {
        const raw = await listProjects();
        const arr = extractArray(raw);
        return arr.map((p: any) => mapProjectFromDb(p));
      } catch (err) {
        console.error("Error fetching/mapping projects:", err);
        throw err;
      }
    },
  });
  const laboursQuery = useQuery({
    queryKey: ["labours"],
    queryFn: async () => {
      try {
        const raw = await listLabours();
        const arr = extractArray(raw);
        return arr.map((l: any) => mapLabourFromDb(l));
      } catch (err) {
        console.error("Error fetching/mapping labours:", err);
        throw err;
      }
    },
  });
  const paymentsQuery = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      try {
        const raw = await listPayments();
        const arr = extractArray(raw);
        return arr.map((p: any) => mapPaymentFromDb(p));
      } catch (err) {
        console.error("Error fetching/mapping payments:", err);
        throw err;
      }
    },
  });
  const attendanceQuery = useQuery({
    queryKey: ["attendance"],
    queryFn: async () => {
      try {
        const raw = await listAttendance();
        const arr = extractArray(raw);
        return arr.map((a: any) => mapAttendanceFromDb(a));
      } catch (err) {
        console.error("Error fetching/mapping attendance:", err);
        throw err;
      }
    },
  });
  const engineersQuery = useQuery({
    queryKey: ["engineers"],
    queryFn: async () => {
      try {
        const raw = await listEngineers();
        const arr = extractArray(raw);
        return arr.map((e: any) => mapEngineerFromDb(e));
      } catch (err) {
        console.error("Error fetching/mapping engineers:", err);
        throw err;
      }
    },
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        const raw = await getSettings();
        const obj = raw && typeof raw === "object" && "result" in raw ? (raw as any).result : raw && typeof raw === "object" && "data" in raw ? (raw as any).data : raw;
        return mapSystemSettingsFromDb(obj as any);
      } catch (err) {
        console.error("Error fetching/mapping settings:", err);
        throw err;
      }
    },
  });
  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        const raw = await listCustomers();
        const arr = extractArray(raw);
        return arr.map((c: any) => mapCustomerFromDb(c));
      } catch (err) {
        console.error("Error fetching/mapping customers:", err);
        throw err;
      }
    },
  });
  const masterDataQuery = useQuery({
    queryKey: ["masterData"],
    queryFn: async () => {
      try {
        const raw = await listMasterData();
        const arr = extractArray(raw);
        return arr.map((m: any) => mapMasterDataFromDb(m));
      } catch (err) {
        console.error("Error fetching/mapping masterData:", err);
        throw err;
      }
    },
  });
  const machinesQuery = useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      try {
        const raw = await listMachines();
        const arr = extractArray(raw);
        return arr.map((m: any) => mapMachineFromDb(m));
      } catch (err) {
        console.error("Error fetching/mapping machines:", err);
        throw err;
      }
    },
  });
  const materialsQuery = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      try {
        const raw = await listMaterials();
        const arr = extractArray(raw);
        return arr.map((m: any) => mapMaterialFromDb(m));
      } catch (err) {
        console.error("Error fetching/mapping materials:", err);
        throw err;
      }
    },
  });
  const machineIssuesQuery = useQuery({
    queryKey: ["machineIssues"],
    queryFn: async () => {
      try {
        const raw = await listMachineIssues();
        const arr = extractArray(raw);
        return arr.map((mi: any) => mapMachineIssueFromDb(mi));
      } catch (err) {
        console.error("Error fetching/mapping machineIssues:", err);
        throw err;
      }
    },
  });
  const materialIssuesQuery = useQuery({
    queryKey: ["materialIssues"],
    queryFn: async () => {
      try {
        const raw = await listMaterialIssues();
        const arr = extractArray(raw);
        return arr.map((mi: any) => mapMaterialIssueFromDb(mi));
      } catch (err) {
        console.error("Error fetching/mapping materialIssues:", err);
        throw err;
      }
    },
  });
  const documentsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      try {
        const raw = await listDocuments();
        const arr = extractArray(raw);
        return arr.map((d: any) => mapProjectDocumentFromDb(d));
      } catch (err) {
        console.error("Error fetching/mapping documents:", err);
        throw err;
      }
    },
  });
  const stockAuditLogsQuery = useQuery({
    queryKey: ["stockAuditLogs"],
    queryFn: async () => {
      try {
        const raw = await listStockAuditLogs();
        const arr = extractArray(raw);
        return arr.map((s: any) => mapStockAuditLogFromDb(s));
      } catch (err) {
        console.error("Error fetching/mapping stockAuditLogs:", err);
        throw err;
      }
    },
  });

  const enquiries = enquiriesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const labours = laboursQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const engineers = engineersQuery.data ?? [];
  const settings = settingsQuery.data ?? defaultSettings;
  const customers = customersQuery.data ?? [];
  const masterData = masterDataQuery.data ?? [];
  const machines = machinesQuery.data ?? [];
  const materials = materialsQuery.data ?? [];
  const machineIssues = machineIssuesQuery.data ?? [];
  const materialIssues = materialIssuesQuery.data ?? [];
  const documents = documentsQuery.data ?? [];
  const stockAuditLogs = stockAuditLogsQuery.data ?? [];

  const attendance = useMemo(() => {
    const rec: Record<string, AttendanceRecord> = {};
    for (const a of attendanceQuery.data ?? []) {
      rec[a.id] = a;
      if (a.labourId && a.date) {
        const dateStr = typeof a.date === "string" ? a.date.slice(0, 10) : "";
        if (dateStr) {
          rec[`${a.labourId}_${dateStr}`] = a;
        }
      }
    }
    return rec;
  }, [attendanceQuery.data]);

  const isLoading =
    enquiriesQuery.isLoading || projectsQuery.isLoading || laboursQuery.isLoading ||
    paymentsQuery.isLoading || engineersQuery.isLoading || settingsQuery.isLoading ||
    masterDataQuery.isLoading;

  // ---------- Invalidation helpers ----------
  const invalidate = (...keys: string[]) => {
    for (const k of keys) queryClient.invalidateQueries({ queryKey: [k] });
  };

  // ---------- Login / Logout ----------
  const login = (role: "CEO" | "Worker" | "Labor", loginIdOrId?: string, pin?: string): boolean => {
    if (!pin || !pin.trim()) { toast.error("Security PIN is required"); return false; }
    const trimmedPin = pin.trim();
    if (role === "CEO") {
      if (trimmedPin !== "1234") { toast.error("Incorrect Executive PIN"); return false; }
      setCurrentUser({ role: "CEO", name: "CEO Executive" });
      toast.success("Welcome back, CEO!");
      return true;
    }
    if (role === "Worker") {
      if (trimmedPin !== "5678") { toast.error("Incorrect Supervisor PIN"); return false; }
      setCurrentUser({ role: "Worker", name: "Operations Supervisor" });
      toast.success("Supervisor session initiated");
      return true;
    }
    if (role === "Labor") {
      if (!loginIdOrId || !loginIdOrId.trim()) { toast.error("Labour Name or Login ID is required"); return false; }
      if (laboursQuery.isLoading || labours.length === 0) { toast.error("Please wait for data to load..."); return false; }
      const t = loginIdOrId.trim().toLowerCase();
      const lab = labours.find((l: Labour) => {
        const idMatch = l.id?.toLowerCase() === t;
        const loginIdMatch = l.loginId?.toLowerCase() === t;
        const nameMatch = l.name?.toLowerCase() === t;
        const firstNameMatch = l.name?.toLowerCase().split(" ")[0] === t;
        const pinMatch = (l.pin || "0000") === trimmedPin;
        return (idMatch || loginIdMatch || nameMatch || firstNameMatch) && pinMatch;
      });
      if (!lab) { toast.error("Incorrect Labour Name/ID or PIN"); return false; }
      setCurrentUser({ role: "Labor", id: lab.id, name: lab.name });
      toast.success(`Welcome, ${lab.name}!`);
      return true;
    }
    return false;
  };

  const logout = () => { setCurrentUser(null); toast.info("Logged out successfully"); };

  // ---------- Sync getters (derived from cached data) ----------
  const getMasterDataByCategory = (category: MasterDataCategory) => masterData.filter((m: MasterDataItem) => m.category === category);

  const checkEngineerAvailability = (engineerId: string, engineerName?: string, siteVisitDate?: string, excludeEnquiryId?: string) => {
    const eng = engineers.find((e: Engineer) => e.id === engineerId || e.name === engineerName || e.name === engineerId);
    if (!eng) return { isAvailable: true };
    if (siteVisitDate) {
      const conflicting = enquiries.find((e: Enquiry) =>
        e.id !== excludeEnquiryId &&
        (e.assignedEngineerId === eng.id || e.assignedEngineerName === eng.name) &&
        e.siteVisitDate === siteVisitDate &&
        e.siteVisitStatus !== "Completed" &&
        e.customerDecision !== "Cancelled"
      );
      if (conflicting) return { isAvailable: false, conflictMessage: `Engineer ${eng.name} already scheduled on ${siteVisitDate} (${conflicting.customerName})` };
    }
    const activeProj = projects.find((p: Project) => (p.assignedEngineerId === eng.id || p.assignedEngineerName === eng.name) && (p.status === "Ongoing" || p.status === "Scheduled"));
    if (activeProj) return { isAvailable: false, currentProject: activeProj, conflictMessage: `Already Assigned to ${activeProj.id} (${activeProj.customerName})` };
    return { isAvailable: true };
  };

  const checkLabourAvailability = (labourId: string) => {
    const activeProj = projects.find((p: Project) => p.assignedLabourIds.includes(labourId) && (p.status === "Ongoing" || p.status === "Scheduled"));
    if (activeProj) return { isAvailable: false, currentProject: activeProj, conflictMessage: `Already Assigned to ${activeProj.id} (${activeProj.customerName})` };
    return { isAvailable: true };
  };

  // ---------- Mutations ----------

  // Enquiries
  const addEnquiryM = useMutation({
    mutationFn: async (input: Omit<Enquiry, "id" | "createdAt" | "customerDecision" | "siteVisitStatus">) => {
      const created = await addEnquiryFn({ data: input as any });
      return mapEnquiryFromDb(created as any);
    },
    onSuccess: (created) => { invalidate("enquiries", "customers", "masterData"); toast.success(`Enquiry ${created.id} created for ${created.customerName}`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const updateEnquiryM = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Enquiry> }) => {
      const payload: any = { ...updates };
      if (updates.customerDecision) payload.customerDecision = toDb.customerDecision(updates.customerDecision);
      return updateEnquiryFn({ data: { id, updates: payload } });
    },
    onSuccess: () => { invalidate("enquiries", "projects", "customers"); toast.success("Enquiry updated"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deleteEnquiryM = useMutation({
    mutationFn: async (id: string) => deleteEnquiryFn({ data: { id } }),
    onSuccess: () => { invalidate("enquiries", "customers"); toast.success("Enquiry deleted"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const approveConvertM = useMutation({
    mutationFn: async (enquiryId: string) => {
      const proj = await approveAndConvertEnquiryToProjectFn({ data: { enquiryId } });
      return proj ? mapProjectFromDb(proj as any) : undefined;
    },
    onSuccess: (proj) => { invalidate("enquiries", "projects", "customers"); if (proj) toast.success(`Project ${proj.id} created from Enquiry!`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });

  // Projects
  const updateProjectM = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const payload: any = { ...updates };
      if (updates.customerDecision) payload.customerDecision = toDb.customerDecision(updates.customerDecision);
      return updateProjectFn({ data: { id, updates: payload } });
    },
    onSuccess: () => { invalidate("projects", "enquiries", "customers"); toast.success("Project updated & synchronized"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deleteProjectM = useMutation({
    mutationFn: async (id: string) => deleteProjectFn({ data: { id } }),
    onSuccess: () => { invalidate("projects", "enquiries"); toast.success("Project deleted"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const updateProjectStatusM = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: ProjectStatus; note?: string }) => updateProjectStatusFn({ data: { id, status, note } }),
    onSuccess: (_out, { status }) => { invalidate("projects"); toast.success(`Project status changed to ${status}`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const updateFollowUpTagM = useMutation({
    mutationFn: async ({ projectId, followUpTag }: { projectId: string; followUpTag: "MD" | "Team" | null }) => updateFollowUpTagFn({ data: { projectId, followUpTag } }),
    onSuccess: () => { invalidate("projects"); toast.success("Follow-up tag updated"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const assignLaboursM = useMutation({
    mutationFn: async (v: { projectId: string; assignments: { labourId: string; weeklyWage: number }[] }) => assignLaboursToProjectFn({ data: v }),
    onSuccess: () => { invalidate("projects", "labours"); toast.success("Labours assigned"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const unassignLabourM = useMutation({
    mutationFn: async (v: { projectId: string; labourId: string }) => unassignLabourFromProjectFn({ data: v }),
    onSuccess: () => { invalidate("projects", "labours"); toast.success("Labour unassigned"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const updateProjectLabourLogM = useMutation({
    mutationFn: async ({ projectId, log }: { projectId: string; log: ProjectLabourLog }) =>
      updateProjectLabourLogFn({ data: { projectId, log: {
        labourId: log.labourId,
        date: log.date,
        inTime: log.inTime,
        outTime: log.outTime,
        weeklyWage: log.weeklyWage,
        workDescription: log.workDescription,
        remarks: log.remarks,
        inPhotoUrl: log.inPhotoUrl,
        outPhotoUrl: log.outPhotoUrl,
        inLocation: log.inLocation,
        outLocation: log.outLocation,
        verificationStatus: log.verificationStatus,
        isGpsWarning: log.isGpsWarning,
      } } }),
    onSuccess: () => { invalidate("projects", "attendance"); toast.success("Labour log recorded"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });


  // Labours
  const addLabourM = useMutation({
    mutationFn: async (input: Omit<Labour, "id">) => {
      const created = await addLabourFn({ data: input as any });
      return mapLabourFromDb(created as any);
    },
    onSuccess: (created) => { invalidate("labours"); toast.success(`Labour ${created.name} added! LoginID=${created.loginId} PIN=${created.pin}`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const updateLabourM = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Labour> }) => updateLabourFn({ data: { id, updates: updates as any } }),
    onSuccess: () => { invalidate("labours"); toast.success("Labour updated"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deleteLabourM = useMutation({
    mutationFn: async (id: string) => deleteLabourFn({ data: { id } }),
    onSuccess: () => { invalidate("labours"); toast.success("Labour deleted"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deactivateLabourM = useMutation({
    mutationFn: async (id: string) => deactivateLabourFn({ data: { id } }),
    onSuccess: () => { invalidate("labours"); toast.success("Labour deactivated"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const reactivateLabourM = useMutation({
    mutationFn: async (id: string) => reactivateLabourFn({ data: { id } }),
    onSuccess: () => { invalidate("labours"); toast.success("Labour reactivated!"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deleteLabourPermanentlyM = useMutation({
    mutationFn: async (id: string) => deleteLabourPermanentlyFn({ data: { id } }),
    onSuccess: () => { invalidate("labours"); toast.success("Labour permanently deleted"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });

  const recordAttendanceM = useMutation({
    mutationFn: async (rec: Omit<AttendanceRecord, "id">) => recordAttendanceFn({ data: {
      labourId: rec.labourId,
      date: rec.date,
      status: toDb.attendanceStatus(rec.status) as any,
      projectId: rec.projectId,
      projectName: rec.projectName,
      inTime: rec.inTime,
      outTime: rec.outTime,
      hoursWorked: rec.hoursWorked,
      earnedMoney: rec.earnedMoney,
      workDescription: rec.workDescription,
      weeklyWage: rec.weeklyWage,
      remarks: rec.remarks,
      inPhotoUrl: rec.inPhotoUrl,
      outPhotoUrl: rec.outPhotoUrl,
    } }),
    onSuccess: () => { invalidate("attendance", "projects"); toast.success("Attendance recorded"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });


  // Payments
  const addPaymentM = useMutation({
    mutationFn: async (pay: Omit<Payment, "id" | "createdAt">) => {
      const created = await addPaymentFn({ data: pay as any });
      return mapPaymentFromDb(created as any);
    },
    onSuccess: (pay) => { invalidate("payments", "projects"); toast.success(`Payment ${pay.id} of ₹${pay.amount.toLocaleString("en-IN")} recorded`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deletePaymentM = useMutation({
    mutationFn: async (id: string) => deletePaymentFn({ data: { id } }),
    onSuccess: () => { invalidate("payments", "projects"); toast.success("Payment removed"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const addPaymentStageM = useMutation({
    mutationFn: async ({ projectId, stage }: { projectId: string; stage: Omit<PaymentStageItem, "id" | "status"> }) =>
      addPaymentStageFn({ data: { projectId, stage: { stageName: stage.stageName, amount: stage.amount, dueDate: stage.dueDate, paymentNotes: stage.paymentNotes } } }),
    onSuccess: () => { invalidate("projects"); toast.success("Payment stage added"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const updatePaymentStageM = useMutation({
    mutationFn: async ({ projectId, stageId, updates }: { projectId: string; stageId: string; updates: Partial<PaymentStageItem> }) =>
      updatePaymentStageFn({ data: { projectId, stageId, updates: updates as any } }),
    onSuccess: () => { invalidate("projects"); toast.success("Payment stage updated"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deletePaymentStageM = useMutation({
    mutationFn: async ({ projectId, stageId }: { projectId: string; stageId: string }) => deletePaymentStageFn({ data: { projectId, stageId } }),
    onSuccess: () => { invalidate("projects"); toast.success("Payment stage removed"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const applyPresetM = useMutation({
    mutationFn: async (v: { projectId: string; presetType: "100_ADVANCE" | "50_50" | "20_30_50" | "100_CREDIT" }) => applyPresetPaymentPlanFn({ data: v }),
    onSuccess: () => { invalidate("projects"); toast.success("Preset payment plan applied"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });

  // Engineers
  const addEngineerM = useMutation({
    mutationFn: async (input: Omit<Engineer, "id">) => {
      const created = await addEngineerFn({ data: input as any });
      return mapEngineerFromDb(created);
    },
    onSuccess: (created) => { invalidate("engineers"); toast.success(`Engineer ${created.name} registered`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const updateEngineerM = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Engineer> }) => updateEngineerFn({ data: { id, updates: updates as any } }),
    onSuccess: () => { invalidate("engineers"); toast.success("Engineer updated"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deleteEngineerM = useMutation({
    mutationFn: async (id: string) => deleteEngineerFn({ data: { id } }),
    onSuccess: () => { invalidate("engineers"); toast.success("Engineer deleted"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });

  // Master Data
  const addMasterDataItemM = useMutation({
    mutationFn: async ({ category, value }: { category: MasterDataCategory; value: string }) => {
      const created = await addMasterDataItemFn({ data: { category, value } });
      return mapMasterDataFromDb(created);
    },
    onSuccess: (item) => { invalidate("masterData"); toast.success(`"${item.value}" saved (${item.category})`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const updateMasterDataItemM = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => updateMasterDataItemFn({ data: { id, value } }),
    onSuccess: () => { invalidate("masterData"); toast.success("Value updated"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deleteMasterDataItemM = useMutation({
    mutationFn: async (id: string) => deleteMasterDataItemFn({ data: { id } }),
    onSuccess: () => { invalidate("masterData"); toast.success("Value removed"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const toggleMasterDataItemActiveM = useMutation({
    mutationFn: async (id: string) => toggleMasterDataItemActiveFn({ data: { id } }),
    onSuccess: () => { invalidate("masterData"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });

  // Machines
  const addMachineM = useMutation({
    mutationFn: async (input: Omit<Machine, "id" | "createdAt" | "issuedQuantity" | "repairQuantity" | "lostQuantity">) => {
      const payload: any = { ...input, condition: toDb.machineCondition(input.condition) };
      const created = await addMachineFn({ data: payload });
      return mapMachineFromDb(created);
    },
    onSuccess: (m) => { invalidate("machines", "stockAuditLogs"); toast.success(`Machine ${m.id} created!`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const updateMachineM = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Machine> }) => {
      const payload: any = { ...updates };
      if (updates.condition) payload.condition = toDb.machineCondition(updates.condition);
      return updateMachineFn({ data: { id, updates: payload } });
    },
    onSuccess: () => { invalidate("machines"); toast.success("Machine updated"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deleteMachineM = useMutation({
    mutationFn: async (id: string) => deleteMachineFn({ data: { id } }),
    onSuccess: () => { invalidate("machines"); toast.success("Machine deleted"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const issueMachineM = useMutation({
    mutationFn: async (params: { machineId: string; projectId: string; quantity: number; issueDate: string; expectedReturnDate: string; issuedBy: string; remarks?: string }) => {
      const rec = await issueMachineToProjectFn({ data: params });
      return rec ? mapMachineIssueFromDb(rec as any) : undefined;
    },
    onSuccess: (rec) => { invalidate("machines", "machineIssues", "projects", "stockAuditLogs"); if (rec) toast.success(`Issued ${rec.quantity}× ${rec.machineName}`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const returnMachineM = useMutation({
    mutationFn: async (params: { issueRecordId: string; returnQty: number; condition: MachineCondition; returnRemarks?: string; returnedBy?: string }) =>
      returnMachineFromProjectFn({ data: { ...params, condition: toDb.machineCondition(params.condition) } }),
    onSuccess: (_out, p) => { invalidate("machines", "machineIssues", "projects", "stockAuditLogs"); toast.success(`Returned ${p.returnQty} unit(s)`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });

  // Materials
  const addMaterialM = useMutation({
    mutationFn: async (input: Omit<Material, "id" | "createdAt">) => {
      const created = await addMaterialFn({ data: input as any });
      return mapMaterialFromDb(created as any);
    },
    onSuccess: (m) => { invalidate("materials", "stockAuditLogs"); toast.success(`Material ${m.id} created!`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const updateMaterialM = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Material> }) => updateMaterialFn({ data: { id, updates: updates as any } }),
    onSuccess: () => { invalidate("materials"); toast.success("Material updated"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deleteMaterialM = useMutation({
    mutationFn: async (id: string) => deleteMaterialFn({ data: { id } }),
    onSuccess: () => { invalidate("materials"); toast.success("Material deleted"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const issueMaterialM = useMutation({
    mutationFn: async (params: { materialId: string; projectId: string; quantity: number; issueDate: string; issuedBy: string; remarks?: string }) => {
      const rec = await issueMaterialToProjectFn({ data: params });
      return rec ? mapMaterialIssueFromDb(rec as any) : undefined;
    },
    onSuccess: (rec) => { invalidate("materials", "materialIssues", "projects", "stockAuditLogs"); if (rec) toast.success(`Issued ${rec.quantity} of ${rec.materialName}`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const adjustStockM = useMutation({
    mutationFn: async (params: { itemType: StockItemType; itemId: string; newQuantity: number; reason: string; actor: string }) => adjustStockFn({ data: params }),
    onSuccess: () => { invalidate("machines", "materials", "stockAuditLogs"); toast.success("Stock level updated"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });

  // Documents
  const addDocumentM = useMutation({
    mutationFn: async (input: Omit<ProjectDocument, "id" | "uploadedAt">) => {
      const created = await addDocumentFn({ data: input as any });
      return mapProjectDocumentFromDb(created);
    },
    onSuccess: (doc) => { invalidate("documents"); toast.success(`Document ${doc.title} uploaded`); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });
  const deleteDocumentM = useMutation({
    mutationFn: async (id: string) => deleteDocumentFn({ data: { id } }),
    onSuccess: () => { invalidate("documents"); toast.success("Document deleted"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });

  // Attendance verify
  const verifyAttendanceM = useMutation({
    mutationFn: async ({ attendanceId, status, verifierName, comments }: { attendanceId: string; status: "Verified" | "Rejected"; verifierName: string; comments?: string }) =>
      verifyAttendanceRecordFn({ data: { attendanceId, status, verifierName, comments } }),
    onSuccess: (_out, { status, verifierName }) => {
      invalidate("attendance", "projects");
      toast.success(status === "Verified" ? `Attendance Verified by ${verifierName}` : `Attendance Rejected by ${verifierName}`);
    },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });

  // Settings
  const updateSettingsM = useMutation({
    mutationFn: async (s: Partial<SystemSettings>) => updateSettingsFn({ data: s as any }),
    onSuccess: () => { invalidate("settings"); toast.success("Settings saved"); },
    onError: (err) => toast.error(`${(err as Error).message}`),
  });

  // ---------- Reset (safe stubs; do NOT wipe DB automatically) ----------
  const resetDemoData = () => { toast.info("Reset is disabled in DB mode. Use Prisma Studio to wipe data manually."); };
  const resetToCleanDemoMode = () => { toast.info("Reset is disabled in DB mode. Use Prisma Studio to wipe data manually."); };

  // ---------- Provider value ----------
  return (
    <RoboticsContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isLoading,

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
        documents,
        stockAuditLogs,

        verifyAttendanceRecord: async (attendanceId, status, verifierName, comments) => { await verifyAttendanceM.mutateAsync({ attendanceId, status, verifierName, comments }); },

        addEngineer: (input) => addEngineerM.mutateAsync(input),
        updateEngineer: async (id, updates) => { await updateEngineerM.mutateAsync({ id, updates }); },
        deleteEngineer: async (id) => { await deleteEngineerM.mutateAsync(id); },
        checkEngineerAvailability,
        checkLabourAvailability,

        addDocument: (doc) => addDocumentM.mutateAsync(doc),
        deleteDocument: async (id) => { await deleteDocumentM.mutateAsync(id); },

        getMasterDataByCategory,
        addMasterDataItem: (category, value) => addMasterDataItemM.mutateAsync({ category, value }),
        updateMasterDataItem: async (id, value) => { await updateMasterDataItemM.mutateAsync({ id, value }); },
        deleteMasterDataItem: async (id) => { await deleteMasterDataItemM.mutateAsync(id); },
        toggleMasterDataItemActive: async (id) => { await toggleMasterDataItemActiveM.mutateAsync(id); },

        addEnquiry: (e) => addEnquiryM.mutateAsync(e),
        updateEnquiry: async (id, e) => { await updateEnquiryM.mutateAsync({ id, updates: e }); },
        deleteEnquiry: async (id) => { await deleteEnquiryM.mutateAsync(id); },
        approveAndConvertEnquiryToProject: (enquiryId) => approveConvertM.mutateAsync(enquiryId),

        updateProject: async (id, p) => { await updateProjectM.mutateAsync({ id, updates: p }); },
        deleteProject: async (id) => { await deleteProjectM.mutateAsync(id); },
        updateProjectStatus: async (id, status, note) => { await updateProjectStatusM.mutateAsync({ id, status, note }); },
        assignLaboursToProject: async (projectId, assignments) => { await assignLaboursM.mutateAsync({ projectId, assignments }); },
        unassignLabourFromProject: async (projectId, labourId) => { await unassignLabourM.mutateAsync({ projectId, labourId }); },
        updateProjectLabourLog: async (projectId, log) => { await updateProjectLabourLogM.mutateAsync({ projectId, log }); },
        updateFollowUpTag: async (projectId, followUpTag) => { await updateFollowUpTagM.mutateAsync({ projectId, followUpTag }); },

        addLabour: (l) => addLabourM.mutateAsync(l),
        updateLabour: async (id, l) => { await updateLabourM.mutateAsync({ id, updates: l }); },
        deleteLabour: async (id) => { await deleteLabourM.mutateAsync(id); },
        deactivateLabour: async (id) => { await deactivateLabourM.mutateAsync(id); },
        reactivateLabour: async (id) => { await reactivateLabourM.mutateAsync(id); },
        deleteLabourPermanently: async (id) => { await deleteLabourPermanentlyM.mutateAsync(id); },
        recordAttendance: async (record) => { await recordAttendanceM.mutateAsync(record); },


        addPayment: (pay) => addPaymentM.mutateAsync(pay),
        deletePayment: async (id) => { await deletePaymentM.mutateAsync(id); },
        addPaymentStage: async (projectId, stage) => { await addPaymentStageM.mutateAsync({ projectId, stage }); },
        updatePaymentStage: async (projectId, stageId, updates) => { await updatePaymentStageM.mutateAsync({ projectId, stageId, updates }); },
        deletePaymentStage: async (projectId, stageId) => { await deletePaymentStageM.mutateAsync({ projectId, stageId }); },
        applyPresetPaymentPlan: async (projectId, presetType) => { await applyPresetM.mutateAsync({ projectId, presetType }); },

        addMachine: (m) => addMachineM.mutateAsync(m),
        updateMachine: async (id, updates) => { await updateMachineM.mutateAsync({ id, updates }); },
        deleteMachine: async (id) => { await deleteMachineM.mutateAsync(id); },
        issueMachineToProject: (params) => issueMachineM.mutateAsync(params),
        returnMachineFromProject: async (params) => { await returnMachineM.mutateAsync(params); },

        addMaterial: (m) => addMaterialM.mutateAsync(m),
        updateMaterial: async (id, updates) => { await updateMaterialM.mutateAsync({ id, updates }); },
        deleteMaterial: async (id) => { await deleteMaterialM.mutateAsync(id); },
        issueMaterialToProject: (params) => issueMaterialM.mutateAsync(params),
        adjustStock: async (params) => { await adjustStockM.mutateAsync(params); },

        updateSettings: async (s) => { await updateSettingsM.mutateAsync(s); },
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
