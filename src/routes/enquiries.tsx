import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useRobotics } from "@/lib/robotics-context";
import type { Enquiry, CustomerDecision, SiteVisitStatus } from "@/lib/robotics-types";
import { SmartComboBox } from "@/components/ui/SmartComboBox";
import { DataPagination } from "@/components/ui/DataPagination";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  PhoneCall,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Calendar,
  DollarSign,
  FileText,
  Sparkles,
  ChevronRight,
  Upload,
  Building2,
  CalendarCheck,
  PlayCircle,
  ArrowRightLeft,
  Trash2,
  AlertTriangle,
  Save,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/enquiries")({
  component: EnquiriesComponent,
});

function EnquiriesComponent() {
  const {
    enquiries,
    engineers,
    settings,
    projects,
    addEnquiry,
    updateEnquiry,
    deleteEnquiry,
    approveAndConvertEnquiryToProject,
    checkEngineerAvailability,
  } = useRobotics();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<string>("ALL");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Delete Confirmation state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Engineer Conflict Alert Modal state
  const [engineerConflict, setEngineerConflict] = useState<{
    message: string;
    engineerName: string;
    targetEnquiryId?: string;
  } | null>(null);

  // Create Enquiry Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createData, setCreateData] = useState({
    enquiryDate: new Date().toISOString().slice(0, 10),
    customerName: "",
    phone: "",
    location: "",
    leadSource: "Phone Call",
    referredBy: "",
    leakageType: "Robotic Arm Oil Leakage & Joint Seal",
    assignedEngineerId: engineers[0]?.id || "",
    assignedEngineerName: engineers[0]?.name || "Er. Rajesh Kumar",
    siteVisitDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    quotationDate: new Date().toISOString().slice(0, 10),
    quotationAmount: 150000,
    workCommittedDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    actualWorkStartedDate: "",
    customerStatus: "Prospective",
    remarks: "",
  });

  // Active Enquiry Cockpit Modal
  const [activeEnquiry, setActiveEnquiry] = useState<Enquiry | null>(null);

  const filteredEnquiries = enquiries.filter((e) => {
    const matchesSearch =
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.phone.includes(searchQuery) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.leakageType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.assignedEngineerName && e.assignedEngineerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDecision = decisionFilter === "ALL" || e.customerDecision === decisionFilter;

    return matchesSearch && matchesDecision;
  });

  // Paginated List
  const totalItems = filteredEnquiries.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedEnquiries = filteredEnquiries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleCreateSubmit = (evt?: React.FormEvent, continueForm = false) => {
    if (evt) evt.preventDefault();

    if (!createData.customerName.trim()) {
      toast.error("Customer Name is required");
      return;
    }
    const cleanPhone = createData.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("❌ Phone Number must be at least 10 digits");
      return;
    }
    if (!createData.location.trim()) {
      toast.error("❌ Location is required");
      return;
    }
    if (!createData.assignedEngineerId && !createData.assignedEngineerName) {
      toast.error("Engineer assignment is required");
      return;
    }
    if (isNaN(Number(createData.quotationAmount)) || Number(createData.quotationAmount) <= 0) {
      toast.error("Quotation Amount must be a positive number");
      return;
    }

    if (createData.assignedEngineerId && createData.siteVisitDate) {
      const avail = checkEngineerAvailability(
        createData.assignedEngineerId,
        createData.assignedEngineerName,
        createData.siteVisitDate
      );
      if (!avail.isAvailable) {
        toast.warning(avail.conflictMessage || "Engineer conflict detected for site visit!");
        setEngineerConflict({
          message: avail.conflictMessage || "Engineer is already scheduled for another site visit on this date.",
          engineerName: createData.assignedEngineerName,
        });
        return;
      }
    }

    setIsSaving(true);
    setTimeout(() => {
      const created = addEnquiry({
        enquiryDate: createData.enquiryDate,
        customerName: createData.customerName,
        phone: createData.phone,
        location: createData.location,
        leadSource: createData.leadSource,
        leakageType: createData.leakageType,
        assignedEngineerId: createData.assignedEngineerId,
        assignedEngineerName: createData.assignedEngineerName,
        siteVisitDate: createData.siteVisitDate,
        quotationDate: createData.quotationDate,
        quotationAmount: createData.quotationAmount,
        workCommittedDate: createData.workCommittedDate,
        actualWorkStartedDate: createData.actualWorkStartedDate,
        customerStatus: createData.customerStatus,
        remarks: createData.remarks,
      });

      setIsSaving(false);

      if (continueForm) {
        toast.success(`Saved ${created.id}. Ready for next enquiry.`);
        setCreateData({
          enquiryDate: new Date().toISOString().slice(0, 10),
          customerName: "",
          phone: "",
          location: "",
          leadSource: "Phone Call",
          referredBy: "",
          leakageType: "Robotic Arm Oil Leakage & Joint Seal",
          assignedEngineerId: engineers[0]?.id || "",
          assignedEngineerName: engineers[0]?.name || "Er. Rajesh Kumar",
          siteVisitDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
          quotationDate: new Date().toISOString().slice(0, 10),
          quotationAmount: 0,
          workCommittedDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
          actualWorkStartedDate: "",
          customerStatus: "Prospective",
          remarks: "",
        });
      } else {
        setCreateOpen(false);
      }
    }, 250);
  };

  const handleConvert = (enquiryId: string) => {
    const proj = approveAndConvertEnquiryToProject(enquiryId);
    if (proj) {
      setActiveEnquiry(null);
      navigate({ to: "/projects" });
    }
  };

  const handleEngineerSelectWithConflictCheck = (
    engName: string,
    isEdit: boolean = false
  ) => {
    const eng = engineers.find((x) => x.name === engName);
    if (eng) {
      const avail = checkEngineerAvailability(eng.id, eng.name);
      if (!avail.isAvailable && avail.conflictMessage) {
        setEngineerConflict({
          message: avail.conflictMessage,
          engineerName: eng.name,
        });
      }
    }

    if (isEdit && activeEnquiry) {
      updateEnquiry(activeEnquiry.id, {
        assignedEngineerName: engName,
        assignedEngineerId: eng?.id || activeEnquiry.assignedEngineerId,
        siteVisitStatus: activeEnquiry.siteVisitStatus === "Pending" ? "Assigned" : activeEnquiry.siteVisitStatus,
      });
      setActiveEnquiry({
        ...activeEnquiry,
        assignedEngineerName: engName,
        assignedEngineerId: eng?.id || activeEnquiry.assignedEngineerId,
      });
    } else {
      setCreateData({
        ...createData,
        assignedEngineerName: engName,
        assignedEngineerId: eng?.id || createData.assignedEngineerId,
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTargetId) {
      deleteEnquiry(deleteTargetId);
      if (activeEnquiry?.id === deleteTargetId) {
        setActiveEnquiry(null);
      }
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Enquiries & Quotations</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
              <ArrowRightLeft className="h-3 w-3" /> Auto Bi-Directional Sync
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Stage 1 of Enterprise ERP. Approved enquiries convert directly into Projects with zero data re-entry.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1.5 shadow-xs"
        >
          <Plus className="h-4 w-4" /> New Customer Enquiry
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Enquiry #, Customer, Engineer, Phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 text-xs rounded-lg h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Decision Filter:</span>
          {["ALL", "Approved", "Thinking", "Follow-up", "Work Scheduled", "Work Started", "Cancelled"].map((dec) => (
            <Button
              key={dec}
              variant={decisionFilter === dec ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDecisionFilter(dec);
                setCurrentPage(1);
              }}
              className={`h-8 text-xs rounded-lg ${
                decisionFilter === dec
                  ? dec === "Approved"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : dec === "Cancelled"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                  : ""
              }`}
            >
              {dec}
            </Button>
          ))}
        </div>
      </div>

      {/* Enquiries Master Table */}
      <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card overflow-hidden">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Customer Enquiry Workflow Records ({filteredEnquiries.length})</CardTitle>
            <CardDescription className="text-xs">Single source of truth with bi-directional project synchronization</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                <tr>
                  <th className="p-3 pl-4">Enquiry ID</th>
                  <th className="p-3">Customer & Location</th>
                  <th className="p-3">Service Need / Leakage</th>
                  <th className="p-3">Assigned Engineer</th>
                  <th className="p-3">Quotation Amount</th>
                  <th className="p-3">Work Committed Date</th>
                  <th className="p-3">Actual Work Started</th>
                  <th className="p-3">Decision</th>
                  <th className="p-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedEnquiries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                          <PhoneCall className="h-6 w-6 stroke-[1.5]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">No enquiries created yet.</p>
                          <p className="text-xs text-muted-foreground">Create your first enquiry to begin tracking leads and converting projects.</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setCreateOpen(true)}
                          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-lg shadow-xs"
                        >
                          <Plus className="h-4 w-4" /> Create Enquiry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEnquiries.map((enq) => {
                    const linkedProj = projects.find((p) => p.enquiryId === enq.id);
                    const isConverted = Boolean(linkedProj);

                    return (
                      <tr
                        key={enq.id}
                        onClick={() => setActiveEnquiry(enq)}
                        className="hover:bg-accent/40 transition-colors cursor-pointer"
                      >
                        <td className="p-3 pl-4 font-bold text-blue-600">
                          <div>{enq.id}</div>
                          {linkedProj && (
                            <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 mt-0.5">
                              🔗 {linkedProj.id}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{enq.customerName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            📞 {enq.phone} • 📍 {enq.location}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">{enq.leakageType}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span>Source: <strong>{enq.leadSource}</strong></span>
                            {enq.referredBy && (
                              <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                                Ref: {enq.referredBy}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {enq.assignedEngineerName ? (
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {enq.assignedEngineerName}
                            </span>
                          ) : (
                            <span className="text-amber-600 text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-foreground">
                          {enq.quotationAmount ? `₹${enq.quotationAmount.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="p-3 font-semibold text-purple-700">
                          {enq.workCommittedDate ? `📅 ${enq.workCommittedDate}` : "Not Set"}
                        </td>
                        <td className="p-3 font-semibold text-emerald-700">
                          {enq.actualWorkStartedDate ? `⚡ ${enq.actualWorkStartedDate}` : "Pending"}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={`text-[10px] ${
                              enq.customerDecision === "Approved"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : enq.customerDecision === "Cancelled"
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : "bg-amber-100 text-amber-800 border-amber-300"
                            }`}
                          >
                            {enq.customerDecision}
                          </Badge>
                        </td>
                        <td className="p-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {enq.customerDecision === "Approved" ? (
                              <Button
                                size="sm"
                                onClick={() => handleConvert(enq.id)}
                                disabled={isConverted}
                                className={`h-7 text-xs gap-1 rounded-lg ${
                                  isConverted
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                              >
                                {isConverted ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Project Created ({linkedProj?.id})
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3.5 w-3.5" /> Convert to Project
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActiveEnquiry(enq)}
                                className="h-7 text-xs text-blue-600 gap-1"
                              >
                                Edit / View <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTargetId(enq.id)}
                              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete Enquiry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* ACTIVE ENQUIRY COCKPIT & EDIT DIALOG */}
      {activeEnquiry && (
        <Dialog open={!!activeEnquiry} onOpenChange={() => setActiveEnquiry(null)}>
          <DialogContent className="max-w-4xl rounded-xl border shadow-xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <DialogHeader className="border-b pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold text-blue-600">{activeEnquiry.id}</span>
                    <Badge
                      className={`text-xs ${
                        activeEnquiry.customerDecision === "Approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : activeEnquiry.customerDecision === "Cancelled"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {activeEnquiry.customerDecision}
                    </Badge>
                  </div>
                  <DialogTitle className="text-lg font-bold text-foreground mt-1">
                    {activeEnquiry.customerName} - {activeEnquiry.leakageType}
                  </DialogTitle>
                </div>

                <div className="flex items-center gap-2">
                  {activeEnquiry.customerDecision === "Approved" && (
                    <Button
                      onClick={() => handleConvert(activeEnquiry.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs gap-1.5 shadow-xs"
                    >
                      <Sparkles className="h-4 w-4" /> Convert To Project
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setActiveEnquiry(null)}
                    className="text-xs rounded-lg gap-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteTargetId(activeEnquiry.id)}
                    className="text-xs rounded-lg gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 pt-2 text-xs">
              {/* STEP 1: Customer Information */}
              <Card className="rounded-xl border border-border">
                <CardHeader className="p-3 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" /> Step 1: Customer Information & Service Need
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Client Name</Label>
                    <Input
                      value={activeEnquiry.customerName}
                      onChange={(e) => {
                        updateEnquiry(activeEnquiry.id, { customerName: e.target.value });
                        setActiveEnquiry({ ...activeEnquiry, customerName: e.target.value });
                      }}
                      className="h-9 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Phone Number</Label>
                    <Input
                      value={activeEnquiry.phone}
                      onChange={(e) => {
                        updateEnquiry(activeEnquiry.id, { phone: e.target.value });
                        setActiveEnquiry({ ...activeEnquiry, phone: e.target.value });
                      }}
                      className="h-9 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Location / Address</Label>
                    <Input
                      value={activeEnquiry.location}
                      onChange={(e) => {
                        updateEnquiry(activeEnquiry.id, { location: e.target.value });
                        setActiveEnquiry({ ...activeEnquiry, location: e.target.value });
                      }}
                      className="h-9 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 col-span-1 sm:col-span-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Lead Source (Smart Combo)</Label>
                      <SmartComboBox
                        category="Lead Source"
                        value={activeEnquiry.leadSource}
                        onChange={(val) => {
                          updateEnquiry(activeEnquiry.id, { leadSource: val });
                          setActiveEnquiry({ ...activeEnquiry, leadSource: val });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Referred By / Reference Person</Label>
                        {["Word of Mouth", "Existing Customer", "Builder Reference", "Engineer Reference", "CEO Reference"].includes(activeEnquiry.leadSource) && (
                          <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                            ★ Recommended
                          </Badge>
                        )}
                        {["Website", "Google Search"].includes(activeEnquiry.leadSource) && (
                          <span className="text-[10px] text-muted-foreground">(Optional)</span>
                        )}
                      </div>
                      <SmartComboBox
                        category="Referred By Options"
                        value={activeEnquiry.referredBy || ""}
                        onChange={(val) => {
                          updateEnquiry(activeEnquiry.id, { referredBy: val });
                          setActiveEnquiry({ ...activeEnquiry, referredBy: val });
                        }}
                      />
                    </div>
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold">Service Need / Lead Type (Smart Combo)</Label>
                    <SmartComboBox
                      category="Leakage Type"
                      value={activeEnquiry.leakageType}
                      onChange={(val) => {
                        updateEnquiry(activeEnquiry.id, { leakageType: val });
                        setActiveEnquiry({ ...activeEnquiry, leakageType: val });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* STEP 2: Engineer Assignment & Site Visit */}
              <Card className="rounded-xl border border-border">
                <CardHeader className="p-3 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-purple-600" /> Step 2: Engineer Assignment & Site Visit
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Assigned Engineer</Label>
                    <SmartComboBox
                      category="Engineer Names"
                      value={activeEnquiry.assignedEngineerName || ""}
                      onChange={(val) => handleEngineerSelectWithConflictCheck(val, true)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Site Visit Date</Label>
                    <Input
                      type="date"
                      value={activeEnquiry.siteVisitDate || ""}
                      onChange={(e) => {
                        updateEnquiry(activeEnquiry.id, { siteVisitDate: e.target.value });
                        setActiveEnquiry({ ...activeEnquiry, siteVisitDate: e.target.value });
                      }}
                      className="h-9 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Site Visit Status</Label>
                    <SmartComboBox
                      category="Site Visit Status"
                      value={activeEnquiry.siteVisitStatus}
                      onChange={(val) => {
                        updateEnquiry(activeEnquiry.id, { siteVisitStatus: val as SiteVisitStatus });
                        setActiveEnquiry({ ...activeEnquiry, siteVisitStatus: val as SiteVisitStatus });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* STEP 3: Quotation & Work Schedule Commitment Dates */}
              <Card className="rounded-xl border border-border">
                <CardHeader className="p-3 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <CalendarCheck className="h-3.5 w-3.5 text-amber-600" /> Step 3: Quotation & Work Commitment Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Quotation Date</Label>
                      <Input
                        type="date"
                        value={activeEnquiry.quotationDate || ""}
                        onChange={(e) => {
                          updateEnquiry(activeEnquiry.id, { quotationDate: e.target.value });
                          setActiveEnquiry({ ...activeEnquiry, quotationDate: e.target.value });
                        }}
                        className="h-9 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Quotation Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="Enter amount (e.g. 150000)"
                        value={activeEnquiry.quotationAmount || ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          updateEnquiry(activeEnquiry.id, { quotationAmount: val });
                          setActiveEnquiry({ ...activeEnquiry, quotationAmount: val });
                        }}
                        className="h-9 rounded-lg font-bold text-blue-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Upload Quotation PDF</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toast.success("Quotation PDF attached to Enquiry")}
                        className="h-9 w-full gap-1 text-xs rounded-lg"
                      >
                        <Upload className="h-3.5 w-3.5" /> Select PDF
                      </Button>
                    </div>
                  </div>

                  {/* Work Dates Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-purple-900 flex items-center gap-1">
                        <CalendarCheck className="h-3.5 w-3.5 text-purple-600" /> Work Committed Date *
                      </Label>
                      <Input
                        type="date"
                        value={activeEnquiry.workCommittedDate || ""}
                        onChange={(e) => {
                          updateEnquiry(activeEnquiry.id, { workCommittedDate: e.target.value });
                          setActiveEnquiry({ ...activeEnquiry, workCommittedDate: e.target.value });
                        }}
                        className="h-9 rounded-lg border-purple-300 font-semibold bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                        <PlayCircle className="h-3.5 w-3.5 text-emerald-600" /> Actual Work Started Date
                      </Label>
                      <Input
                        type="date"
                        value={activeEnquiry.actualWorkStartedDate || ""}
                        onChange={(e) => {
                          updateEnquiry(activeEnquiry.id, { actualWorkStartedDate: e.target.value });
                          setActiveEnquiry({ ...activeEnquiry, actualWorkStartedDate: e.target.value });
                        }}
                        className="h-9 rounded-lg border-emerald-300 font-semibold bg-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* STEP 4: Customer Decision & Status */}
              <Card className="rounded-xl border border-border">
                <CardHeader className="p-3 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Step 4: Customer Decision & Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Customer Decision</Label>
                      <SmartComboBox
                        category="Customer Decision"
                        value={activeEnquiry.customerDecision}
                        onChange={(val) => {
                          const dec = val as CustomerDecision;
                          updateEnquiry(activeEnquiry.id, { customerDecision: dec });
                          setActiveEnquiry({ ...activeEnquiry, customerDecision: dec });
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Customer Account Status</Label>
                      <Input
                        value={activeEnquiry.customerStatus || "Prospective"}
                        onChange={(e) => {
                          updateEnquiry(activeEnquiry.id, { customerStatus: e.target.value });
                          setActiveEnquiry({ ...activeEnquiry, customerStatus: e.target.value });
                        }}
                        className="h-9 rounded-lg"
                        placeholder="e.g. Active Account, Prospective, VIP Account"
                      />
                    </div>

                    {activeEnquiry.customerDecision === "Cancelled" && (
                      <div className="col-span-1 sm:col-span-2 space-y-1">
                        <Label className="text-xs font-semibold text-rose-600">
                          Reason For Cancellation
                        </Label>
                        <SmartComboBox
                          category="Cancellation Reasons"
                          value={activeEnquiry.cancellationReason || ""}
                          onChange={(val) => {
                            updateEnquiry(activeEnquiry.id, { cancellationReason: val });
                            setActiveEnquiry({ ...activeEnquiry, cancellationReason: val });
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Remarks & Special Notes</Label>
                    <SmartComboBox
                      category="Remarks Templates"
                      value={activeEnquiry.remarks || ""}
                      onChange={(val) => {
                        updateEnquiry(activeEnquiry.id, { remarks: val });
                        setActiveEnquiry({ ...activeEnquiry, remarks: val });
                      }}
                    />
                  </div>

                  {activeEnquiry.customerDecision === "Approved" && (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-emerald-950">Customer Has Approved Quotation!</p>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Click "Convert To Project" to generate project record automatically with 100% inherited enquiry data. Zero re-entry required!
                        </p>
                      </div>
                      <Button
                        onClick={() => handleConvert(activeEnquiry.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs gap-1.5 shadow-xs whitespace-nowrap"
                      >
                        <Sparkles className="h-4 w-4" /> Convert To Project
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="pt-3 border-t flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteTargetId(activeEnquiry.id)}
                  className="rounded-lg text-xs gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button type="button" variant="outline" onClick={() => setActiveEnquiry(null)} className="rounded-lg text-xs">
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    toast.success("Enquiry draft saved");
                    setActiveEnquiry(null);
                  }}
                  className="rounded-lg text-xs"
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    toast.success(`Enquiry ${activeEnquiry.id} saved successfully`);
                    setActiveEnquiry(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
                {activeEnquiry.customerDecision === "Approved" && !activeEnquiry.projectId && (
                  <Button
                    type="button"
                    onClick={() => {
                      handleConvert(activeEnquiry.id);
                      setActiveEnquiry(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs gap-1.5 shadow-xs"
                  >
                    <Sparkles className="h-4 w-4" /> Save & Create Project
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE NEW ENQUIRY DIALOG FORM */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl rounded-xl border shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-blue-600" /> Log New Customer Enquiry
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => handleCreateSubmit(e, false)} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Customer Name *</Label>
                <Input
                  required
                  placeholder="e.g. AeroTech Solutions"
                  value={createData.customerName}
                  onChange={(e) => setCreateData({ ...createData, customerName: e.target.value })}
                  className="h-9 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mobile Number *</Label>
                <Input
                  required
                  placeholder="e.g. 9876543210"
                  value={createData.phone}
                  onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                  className="h-9 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Location / Address</Label>
                <Input
                  placeholder="e.g. HITEC City, Hyderabad"
                  value={createData.location}
                  onChange={(e) => setCreateData({ ...createData, location: e.target.value })}
                  className="h-9 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Lead Source (Smart Combo)</Label>
                <SmartComboBox
                  category="Lead Source"
                  value={createData.leadSource}
                  onChange={(val) => setCreateData({ ...createData, leadSource: val })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Referred By / Reference Person</Label>
                {["Word of Mouth", "Existing Customer", "Builder Reference", "Engineer Reference", "CEO Reference"].includes(createData.leadSource) && (
                  <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                    ★ Recommended
                  </Badge>
                )}
                {["Website", "Google Search"].includes(createData.leadSource) && (
                  <span className="text-[10px] text-muted-foreground">(Optional)</span>
                )}
              </div>
              <SmartComboBox
                category="Referred By Options"
                value={createData.referredBy || ""}
                onChange={(val) => setCreateData({ ...createData, referredBy: val })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Service Need / Lead Type</Label>
              <SmartComboBox
                category="Leakage Type"
                value={createData.leakageType}
                onChange={(val) => setCreateData({ ...createData, leakageType: val })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assign Engineer</Label>
                <SmartComboBox
                  category="Engineer Names"
                  value={createData.assignedEngineerName}
                  onChange={(val) => handleEngineerSelectWithConflictCheck(val, false)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Site Visit Date</Label>
                <Input
                  type="date"
                  value={createData.siteVisitDate}
                  onChange={(e) => setCreateData({ ...createData, siteVisitDate: e.target.value })}
                  className="h-9 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Quotation Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 150000"
                  value={createData.quotationAmount || ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                    setCreateData({ ...createData, quotationAmount: val });
                  }}
                  className="h-9 rounded-lg font-bold text-blue-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Work Committed Date & Actual Work Started Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/60 p-3 rounded-xl border border-purple-100">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-purple-900 flex items-center gap-1">
                  <CalendarCheck className="h-3.5 w-3.5 text-purple-600" /> Work Committed Date *
                </Label>
                <Input
                  type="date"
                  value={createData.workCommittedDate}
                  onChange={(e) => setCreateData({ ...createData, workCommittedDate: e.target.value })}
                  className="h-9 rounded-lg bg-white border-purple-300 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                  <PlayCircle className="h-3.5 w-3.5 text-emerald-600" /> Actual Work Started Date
                </Label>
                <Input
                  type="date"
                  value={createData.actualWorkStartedDate}
                  onChange={(e) => setCreateData({ ...createData, actualWorkStartedDate: e.target.value })}
                  className="h-9 rounded-lg bg-white border-emerald-300 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Initial Remarks (Smart Combo)</Label>
              <SmartComboBox
                category="Remarks Templates"
                value={createData.remarks}
                onChange={(val) => setCreateData({ ...createData, remarks: val })}
              />
            </div>

            <DialogFooter className="pt-3 border-t flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-lg text-xs">
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={(e) => handleCreateSubmit(e, true)}
                  className="rounded-lg text-xs gap-1"
                >
                  Save & Continue
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1"
                >
                  {isSaving ? "Saving..." : "Save Enquiry"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ENGINEER CONFLICT ALERT MODAL */}
      {engineerConflict && (
        <Dialog open={!!engineerConflict} onOpenChange={() => setEngineerConflict(null)}>
          <DialogContent className="max-w-md rounded-xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/90 p-5">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" /> Engineer Schedule Conflict Warning
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs text-amber-900 dark:text-amber-300 py-2">
              <p className="font-semibold">
                {engineerConflict.engineerName} is currently busy on an active engagement:
              </p>
              <div className="bg-white/80 dark:bg-black/40 p-3 rounded-lg border border-amber-200 font-mono text-[11px]">
                {engineerConflict.message}
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-400">
                Are you sure you want to reassign this engineer for another site visit / project?
              </p>
            </div>
            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                onClick={() => setEngineerConflict(null)}
                className="text-xs rounded-lg"
              >
                Change Selection
              </Button>
              <Button
                onClick={() => setEngineerConflict(null)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg"
              >
                Confirm Reassignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <DeleteConfirm
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Enquiry Record?"
        description="Are you sure you want to delete this enquiry? This action cannot be undone."
      />
    </div>
  );
}
