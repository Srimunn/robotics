import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Create Enquiry Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createData, setCreateData] = useState({
    enquiryDate: new Date().toISOString().slice(0, 10),
    customerName: "",
    phone: "",
    phone2: "",
    location: "",
    leadSource: "Phone Call",
    referredBy: "",
    leakageType: "Robotic Arm Oil Leakage & Joint Seal",
    quotationAmount: 0 as number | string,
    remarks: "",
  });

  // Active Enquiry Cockpit Modal
  const [activeEnquiry, setActiveEnquiry] = useState<Enquiry | null>(null);

  const filteredEnquiries = enquiries.filter((e) => {
    const matchesSearch =
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.phone.includes(searchQuery) ||
      (e.phone2 && e.phone2.includes(searchQuery)) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.leakageType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.assignedEngineerName && e.assignedEngineerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDecision =
      decisionFilter === "ALL"
        ? true
        : decisionFilter === "Follow-up" || decisionFilter === "Follow Up"
        ? e.customerDecision === "Follow Up" || e.customerDecision === "Follow-up" || (e.customerDecision as string) === "FollowUp"
        : e.customerDecision === decisionFilter;

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
      toast.error("Phone 1 must be at least 10 digits");
      return;
    }
    if (cleanPhone.length > 10) {
      toast.error("Phone 1 cannot exceed 10 digits");
      return;
    }
    if (createData.phone2) {
      const cleanPhone2 = createData.phone2.replace(/\D/g, "");
      if (cleanPhone2.length > 10) {
        toast.error("Phone 2 cannot exceed 10 digits");
        return;
      }
    }
    if (!createData.location.trim()) {
      toast.error("Location is required");
      return;
    }

    setIsSaving(true);
    setTimeout(async () => {
      const created = await addEnquiry({
        enquiryDate: createData.enquiryDate,
        customerName: createData.customerName,
        phone: createData.phone,
        phone2: createData.phone2 || undefined,
        location: createData.location,
        leadSource: createData.leadSource,
        referredBy: createData.referredBy || undefined,
        leakageType: createData.leakageType,
        quotationAmount: (createData.quotationAmount as any) === "" || createData.quotationAmount === null || createData.quotationAmount === undefined ? undefined : Number(createData.quotationAmount),
        remarks: createData.remarks,
      });

      setIsSaving(false);

      if (continueForm) {
        toast.success(`Saved ${created.id}. Ready for next enquiry.`);
        setCreateData({
          enquiryDate: new Date().toISOString().slice(0, 10),
          customerName: "",
          phone: "",
          phone2: "",
          location: "",
          leadSource: "Phone Call",
          referredBy: "",
          leakageType: "Robotic Arm Oil Leakage & Joint Seal",
          quotationAmount: 0,
          remarks: "",
        });
      } else {
        setCreateOpen(false);
      }
    }, 250);
  };

  const handleConvert = async (enquiryId: string) => {
    const proj = await approveAndConvertEnquiryToProject(enquiryId);
    if (proj) {
      setActiveEnquiry(null);
      navigate({ to: "/projects" });
    }
  };

  const handleEngineerSelectInEdit = (engName: string) => {
    const eng = engineers.find(
      (x) => x.name.toLowerCase().trim() === engName.toLowerCase().trim() || x.id === engName
    );
    const engId = eng ? eng.id : undefined;

    if (activeEnquiry) {
      updateEnquiry(activeEnquiry.id, {
        assignedEngineerName: engName,
        assignedEngineerId: engId,
        siteVisitStatus: activeEnquiry.siteVisitStatus === "Pending" ? "Assigned" : activeEnquiry.siteVisitStatus,
      });
      setActiveEnquiry({
        ...activeEnquiry,
        assignedEngineerName: engName,
        assignedEngineerId: engId,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Enquiries</h1>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1.5 shadow-xs"
        >
          <Plus className="h-4 w-4" /> New Enquiry
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 text-xs rounded-lg h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Filter:</span>
          {["ALL", "Follow-up", "Approved", "Cancelled"].map((dec) => (
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
            <CardTitle className="text-sm font-semibold">Enquiries ({filteredEnquiries.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/50 text-muted-foreground border-b text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 pl-4 whitespace-nowrap">ID</th>
                  <th className="p-3 whitespace-nowrap min-w-[160px]">CUSTOMER</th>
                  <th className="p-3 whitespace-nowrap min-w-[200px]">WORK TYPE</th>
                  <th className="p-3 whitespace-nowrap">ENGINEER</th>
                  <th className="p-3 whitespace-nowrap">AMOUNT</th>
                  <th className="p-3 whitespace-nowrap">START DATE</th>
                  <th className="p-3 whitespace-nowrap">STARTED</th>
                  <th className="p-3 whitespace-nowrap">STATUS</th>
                  <th className="p-3 text-right pr-4 whitespace-nowrap">ACTION</th>
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
                    const targetProjectId = enq.projectId || linkedProj?.id;
                    const isConverted = Boolean(targetProjectId);

                    const cleanCustomerName = (() => {
                      if (!enq.customerName) return "";
                      const parts = enq.customerName.trim().split(/\s+/);
                      const unique: string[] = [];
                      parts.forEach((p) => {
                        if (unique.length === 0 || unique[unique.length - 1].toLowerCase() !== p.toLowerCase()) {
                          unique.push(p);
                        }
                      });
                      return unique.join(" ");
                    })();

                    return (
                      <tr
                        key={enq.id}
                        onClick={() => setActiveEnquiry(enq)}
                        className="hover:bg-accent/40 transition-colors cursor-pointer"
                      >
                        <td className="p-3 pl-4 font-bold text-blue-600 whitespace-nowrap">
                          <div>{enq.id}</div>
                          {linkedProj && (
                            <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 mt-0.5">
                              {linkedProj.id}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-xs text-foreground truncate max-w-[160px]" title={cleanCustomerName}>
                            {cleanCustomerName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[190px]" title={`${enq.phone} • ${enq.location}`}>
                            {enq.phone} {enq.location ? `• ${enq.location}` : ""}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-xs text-foreground truncate max-w-[210px]" title={enq.leakageType}>
                            {enq.leakageType}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 whitespace-nowrap mt-0.5">
                            <span>Source: <strong>{enq.leadSource}</strong></span>
                            {enq.referredBy && (
                              <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 py-0">
                                Ref: {enq.referredBy}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {enq.assignedEngineerName ? (
                            <span className="font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 whitespace-nowrap inline-block">
                              {enq.assignedEngineerName}
                            </span>
                          ) : (
                            <span className="text-amber-600 text-[11px] font-medium">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-xs text-foreground whitespace-nowrap">
                          {enq.quotationAmount ? `₹${enq.quotationAmount.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="p-3 font-semibold text-xs text-purple-700 whitespace-nowrap font-mono">
                          {enq.workCommittedDate ? enq.workCommittedDate : "Not Set"}
                        </td>
                        <td className="p-3 font-semibold text-xs text-emerald-700 whitespace-nowrap font-mono">
                          {enq.actualWorkStartedDate ? enq.actualWorkStartedDate : "Pending"}
                        </td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={enq.customerDecision || "Follow Up"}
                            onValueChange={(val: CustomerDecision) => {
                              updateEnquiry(enq.id, { customerDecision: val });
                            }}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-7 w-28 text-xs font-semibold rounded-lg border px-2 shadow-2xs cursor-pointer",
                                enq.customerDecision === "Approved"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : enq.customerDecision === "Cancelled"
                                  ? "bg-rose-50 text-rose-800 border-rose-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Follow Up">Follow Up</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {targetProjectId ? (
                              <Button
                                size="sm"
                                onClick={() => navigate({ to: "/projects", search: { openId: targetProjectId } })}
                                className="h-7 text-xs gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> View Project &rarr;
                              </Button>
                            ) : enq.customerDecision === "Approved" ? (
                              <Button
                                size="sm"
                                onClick={() => handleConvert(enq.id)}
                                className="h-7 text-xs gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                              >
                                <Sparkles className="h-3.5 w-3.5" /> Convert to Project
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActiveEnquiry(enq)}
                                className="h-7 text-xs text-blue-600 gap-1 font-medium"
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
                  {(() => {
                    const activeTargetProjId = activeEnquiry.projectId || projects.find((p) => p.enquiryId === activeEnquiry.id)?.id;
                    if (activeTargetProjId) {
                      return (
                        <Button
                          onClick={() => {
                            setActiveEnquiry(null);
                            navigate({ to: "/projects", search: { openId: activeTargetProjId } });
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs gap-1.5 shadow-xs font-semibold"
                        >
                          <CheckCircle2 className="h-4 w-4" /> View Project &rarr;
                        </Button>
                      );
                    }
                    if (activeEnquiry.customerDecision === "Approved") {
                      return (
                        <Button
                          onClick={() => handleConvert(activeEnquiry.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs gap-1.5 shadow-xs font-semibold"
                        >
                          <Sparkles className="h-4 w-4" /> Convert To Project
                        </Button>
                      );
                    }
                    return null;
                  })()}
                  <Button
                    variant="outline"
                    onClick={() => setActiveEnquiry(null)}
                    className="text-xs rounded-lg gap-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
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
                    <Label className="text-xs font-semibold">Phone 1</Label>
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
                    <Label className="text-xs font-semibold">Phone 2 (Optional)</Label>
                    <Input
                      value={activeEnquiry.phone2 || ""}
                      onChange={(e) => {
                        updateEnquiry(activeEnquiry.id, { phone2: e.target.value });
                        setActiveEnquiry({ ...activeEnquiry, phone2: e.target.value });
                      }}
                      className="h-9 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
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
                            Recommended
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
                      onChange={(val) => handleEngineerSelectInEdit(val)}
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
                        value={activeEnquiry.quotationAmount === undefined || activeEnquiry.quotationAmount === null ? "" : activeEnquiry.quotationAmount}
                        onChange={(e) => {
                          const val = e.target.value === "" ? (null as any) : Number(e.target.value);
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
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Customer Decision *</Label>
                      <Select
                        value={activeEnquiry.customerDecision || "Follow Up"}
                        onValueChange={(val: CustomerDecision) => {
                          updateEnquiry(activeEnquiry.id, { customerDecision: val });
                          setActiveEnquiry({ ...activeEnquiry, customerDecision: val });
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs rounded-xl border-input bg-background font-medium">
                          <SelectValue placeholder="Select Decision..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Follow Up">Follow Up</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Reason For Cancellation Box - Enabled ONLY when Cancelled is selected */}
                    {activeEnquiry.customerDecision === "Cancelled" && (
                      <div className="space-y-1.5 p-3 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl transition-all">
                        <Label className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Reason For Cancellation *
                        </Label>
                        <SmartComboBox
                          category="Cancellation Reasons"
                          value={activeEnquiry.cancellationReason || ""}
                          placeholder="Select or enter reason for cancellation..."
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

            <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              {activeEnquiry.customerDecision === "Approved" && !activeEnquiry.projectId && (
                <Button
                  type="button"
                  onClick={() => {
                    handleConvert(activeEnquiry.id);
                    setActiveEnquiry(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs gap-1.5 shadow-xs w-full sm:w-auto"
                >
                  <Sparkles className="h-4 w-4" /> Save & Create Project
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  toast.success(`Enquiry ${activeEnquiry.id} saved successfully`);
                  setActiveEnquiry(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1 font-bold shadow-xs px-4 w-full sm:w-auto"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setActiveEnquiry(null)} className="rounded-lg text-xs w-full sm:w-auto">
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE NEW ENQUIRY DIALOG FORM */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-full sm:max-w-3xl w-full rounded-2xl border border-border shadow-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto bg-background">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-extrabold flex items-center justify-between text-foreground">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <span>New Enquiry</span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => handleCreateSubmit(e, false)} className="space-y-4 text-xs pt-2">
            {/* SECTION 1: CUSTOMER CONTACT INFORMATION */}
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-blue-600" /> Customer
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Name *</Label>
                  <Input
                    required
                    value={createData.customerName}
                    onChange={(e) => setCreateData({ ...createData, customerName: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Phone 1 *</Label>
                    <Input
                      required
                      value={createData.phone}
                      onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                      className={`h-9 text-xs rounded-xl bg-background ${
                        createData.phone.replace(/\D/g, "").length > 10 ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                    />
                    {createData.phone.replace(/\D/g, "").length > 10 && (
                      <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 inline text-red-500 shrink-0" /> Phone 1 cannot exceed 10 digits ({createData.phone.replace(/\D/g, "").length}/10 digits)
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Phone 2</Label>
                    <Input
                      value={createData.phone2}
                      onChange={(e) => setCreateData({ ...createData, phone2: e.target.value })}
                      className={`h-9 text-xs rounded-xl bg-background ${
                        createData.phone2.replace(/\D/g, "").length > 10 ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                    />
                    {createData.phone2.replace(/\D/g, "").length > 10 && (
                      <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 inline text-red-500 shrink-0" /> Phone 2 cannot exceed 10 digits ({createData.phone2.replace(/\D/g, "").length}/10 digits)
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Location</Label>
                  <Input
                    value={createData.location}
                    onChange={(e) => setCreateData({ ...createData, location: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: WORK DETAILS */}
            <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600" /> Work Details
                </h3>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Work Type *</Label>
                  <SmartComboBox
                    category="Leakage Type"
                    value={createData.leakageType}
                    onChange={(val) => setCreateData({ ...createData, leakageType: val })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Lead Source</Label>
                    <SmartComboBox
                      category="Lead Source"
                      value={createData.leadSource}
                      onChange={(val) => setCreateData({ ...createData, leadSource: val })}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Referred By</Label>
                      {["Word of Mouth", "Existing Customer", "Builder Reference", "Engineer Reference", "CEO Reference"].includes(createData.leadSource) && (
                        <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <SmartComboBox
                      category="Referred By Options"
                      value={createData.referredBy || ""}
                      onChange={(val) => setCreateData({ ...createData, referredBy: val })}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: NOTES */}
              <div className="space-y-1 pt-1">
                <Label className="text-xs font-semibold">Notes</Label>
                <SmartComboBox
                  category="Remarks Templates"
                  value={createData.remarks}
                  onChange={(val) => setCreateData({ ...createData, remarks: val })}
                />
              </div>

              {/* SECTION 4: AMOUNT (₹) */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount (e.g. 150000)"
                  value={createData.quotationAmount === undefined || createData.quotationAmount === null ? "" : createData.quotationAmount}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : Number(e.target.value);
                    setCreateData({ ...createData, quotationAmount: val as any });
                  }}
                  className="h-9 text-xs rounded-xl font-bold text-amber-700 dark:text-amber-400 bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <DialogFooter className="pt-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs gap-1 font-bold shadow-md px-5 w-full sm:w-auto"
                >
                  {isSaving ? "Saving..." : "Save Enquiry"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl text-xs w-full sm:w-auto">
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
