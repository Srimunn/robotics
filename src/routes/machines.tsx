import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRobotics } from "@/lib/robotics-context";
import type {
  Machine,
  MachineCondition,
  MachineIssueRecord,
  StockAuditLog,
} from "@/lib/robotics-types";
import { SmartComboBox } from "@/components/ui/SmartComboBox";
import { DataPagination } from "@/components/ui/DataPagination";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  ShieldAlert,
  ArrowRightLeft,
  Filter,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Layers,
  Box,
  Send,
  RotateCcw,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/machines")({
  component: MachinesPageComponent,
});

function MachinesPageComponent() {
  const {
    machines,
    machineIssues,
    projects,
    stockAuditLogs,
    addMachine,
    updateMachine,
    deleteMachine,
    issueMachineToProject,
    returnMachineFromProject,
  } = useRobotics();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [historyMachine, setHistoryMachine] = useState<Machine | null>(null);
  const [issueMachineTarget, setIssueMachineTarget] = useState<Machine | null>(null);
  const [returnRecordTarget, setReturnRecordTarget] = useState<MachineIssueRecord | null>(null);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  // Form states
  const [formToolName, setFormToolName] = useState("");
  const [formCategory, setFormCategory] = useState("Welding Equipment");
  const [formBrand, setFormBrand] = useState("Fanuc Robotics");
  const [formAttachment, setFormAttachment] = useState("");
  const [formUnit, setFormUnit] = useState("Nos");
  const [formStock, setFormStock] = useState(1);
  const [formCondition, setFormCondition] = useState<MachineCondition>("Good");
  const [formRemarks, setFormRemarks] = useState("");

  // Issue Machine Form
  const [issueProjectId, setIssueProjectId] = useState("");
  const [issueQty, setIssueQty] = useState(1);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [issueReturnDate, setIssueReturnDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [issueBy, setIssueBy] = useState("Er. Rajesh Kumar");
  const [issueRemarks, setIssueRemarks] = useState("");

  // Return Machine Form
  const [returnQty, setReturnQty] = useState(1);
  const [returnCondition, setReturnCondition] = useState<MachineCondition>("Good");
  const [returnRemarks, setReturnRemarks] = useState("");

  // Unique categories and brands for filtering
  const categories = useMemo(() => {
    const set = new Set(machines.map((m) => m.category).filter(Boolean));
    return Array.from(set);
  }, [machines]);

  const brands = useMemo(() => {
    const set = new Set(machines.map((m) => m.brand).filter(Boolean));
    return Array.from(set);
  }, [machines]);

  // Metrics
  const totalMachines = machines.reduce((acc, m) => acc + m.currentStock, 0);
  const totalAvailable = machines.reduce((acc, m) => acc + m.availableQuantity, 0);
  const totalIssued = machines.reduce((acc, m) => acc + m.issuedQuantity, 0);
  const totalRepair = machines.reduce((acc, m) => acc + m.repairQuantity, 0);
  const totalLost = machines.reduce((acc, m) => acc + m.lostQuantity, 0);

  // Filtered Machines
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.toolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
      const matchesBrand = brandFilter === "all" || m.brand === brandFilter;

      let matchesStatus = true;
      if (statusFilter === "available") matchesStatus = m.availableQuantity > 0;
      else if (statusFilter === "issued") matchesStatus = m.issuedQuantity > 0;
      else if (statusFilter === "repair") matchesStatus = m.repairQuantity > 0;
      else if (statusFilter === "lost") matchesStatus = m.lostQuantity > 0;

      return matchesSearch && matchesCategory && matchesBrand && matchesStatus;
    });
  }, [machines, searchQuery, categoryFilter, brandFilter, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingMachine(null);
    setFormToolName("");
    setFormCategory("Welding Equipment");
    setFormBrand("Fanuc Robotics");
    setFormAttachment("");
    setFormUnit("Nos");
    setFormStock(1);
    setFormCondition("Good");
    setFormRemarks("");
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (m: Machine) => {
    setEditingMachine(m);
    setFormToolName(m.toolName);
    setFormCategory(m.category);
    setFormBrand(m.brand);
    setFormAttachment(m.attachment || "");
    setFormUnit(m.unit);
    setFormStock(m.currentStock);
    setFormCondition(m.condition);
    setFormRemarks(m.remarks || "");
    setIsAddModalOpen(true);
  };

  const handleSaveMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formToolName.trim()) {
      toast.error("Tool Name is required");
      return;
    }

    if (editingMachine) {
      updateMachine(editingMachine.id, {
        toolName: formToolName.trim(),
        category: formCategory,
        brand: formBrand,
        attachment: formAttachment,
        unit: formUnit,
        currentStock: Number(formStock),
        condition: formCondition,
        remarks: formRemarks,
      });
    } else {
      addMachine({
        toolName: formToolName.trim(),
        category: formCategory,
        brand: formBrand,
        attachment: formAttachment,
        unit: formUnit,
        currentStock: Number(formStock),
        availableQuantity: Number(formStock),
        condition: formCondition,
        remarks: formRemarks,
      });
    }
    setIsAddModalOpen(false);
  };

  const handleOpenIssueModal = (m: Machine) => {
    if (m.availableQuantity <= 0) {
      toast.error(`Machine Unavailable! "${m.toolName}" has 0 available units in stock. Cannot assign.`);
      return;
    }
    setIssueMachineTarget(m);
    setIssueQty(1);
    if (projects.length > 0) {
      setIssueProjectId(projects[0].id);
    }
    setIssueDate(new Date().toISOString().slice(0, 10));
    setIssueReturnDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setIssueBy("Er. Rajesh Kumar");
    setIssueRemarks("");
  };

  const handleConfirmIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueMachineTarget || !issueProjectId) {
      toast.error("Please select a valid project");
      return;
    }

    if (issueMachineTarget.availableQuantity <= 0) {
      toast.error(`Machine Unavailable! "${issueMachineTarget.toolName}" is out of stock.`);
      return;
    }

    if (Number(issueQty) > issueMachineTarget.availableQuantity) {
      toast.error(`Cannot issue ${issueQty} units. Only ${issueMachineTarget.availableQuantity} available in stock.`);
      return;
    }

    issueMachineToProject({
      machineId: issueMachineTarget.id,
      projectId: issueProjectId,
      quantity: Number(issueQty),
      issueDate,
      expectedReturnDate: issueReturnDate,
      issuedBy: issueBy,
      remarks: issueRemarks,
    });
    setIssueMachineTarget(null);
  };

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnRecordTarget) return;

    returnMachineFromProject({
      issueRecordId: returnRecordTarget.id,
      returnQty: Number(returnQty),
      condition: returnCondition,
      returnRemarks,
    });
    setReturnRecordTarget(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Tools</h1>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAuditLogOpen(true)}
            className="text-xs font-semibold h-9 rounded-xl gap-1.5"
          >
            <History className="h-3.5 w-3.5 text-slate-500" />
            Audit Logs
          </Button>
          <Button
            onClick={handleOpenAddModal}
            className="text-xs font-semibold h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            + Add Tool
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Equipment</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">{totalMachines}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center text-blue-600">
              <Wrench className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Available Stock</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">{totalAvailable}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Issued to Sites</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-amber-600 dark:text-amber-400">{totalIssued}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 grid place-items-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Under Maintenance</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-rose-600 dark:text-rose-400">{totalRepair}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 grid place-items-center text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs w-[160px] rounded-lg">
                  <SelectValue placeholder="Category: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="h-9 text-xs w-[160px] rounded-lg">
                  <SelectValue placeholder="Brand: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Tabs */}
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
                <TabsList className="h-9 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <TabsTrigger value="all" className="text-xs px-2.5 h-8">All</TabsTrigger>
                  <TabsTrigger value="available" className="text-xs px-2.5 h-8">Available</TabsTrigger>
                  <TabsTrigger value="issued" className="text-xs px-2.5 h-8">Issued</TabsTrigger>
                  <TabsTrigger value="repair" className="text-xs px-2.5 h-8">Repair</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold text-muted-foreground w-28">ID</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground min-w-[220px]">TOOL NAME</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">CATEGORY</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">ATTACHMENT</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">QTY</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">BREAKDOWN</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">CONDITION</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right pr-4">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                        <Wrench className="h-6 w-6 stroke-[1.5]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">Machine inventory is empty.</p>
                        <p className="text-xs text-muted-foreground">Add machinery and equipment to inventory to enable project dispatching.</p>
                      </div>
                      <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-lg shadow-xs">
                        <Plus className="h-4 w-4" /> Add Machine / Tool
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMachines.map((m) => {
                  const isAvailable = m.availableQuantity > 0;

                  return (
                    <TableRow key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {m.id}
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">{m.toolName}</div>
                        {m.remarks && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">{m.remarks}</div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                            {m.category}
                          </Badge>
                          <span className="text-[11px] font-medium text-muted-foreground">{m.brand}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {m.attachment || "Standard Attachment"}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-xs">
                          <span className={m.availableQuantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}>
                            {m.availableQuantity}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span>{m.currentStock} {m.unit}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          {m.issuedQuantity > 0 && (
                            <Badge className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 border-blue-200">
                              Issued: {m.issuedQuantity}
                            </Badge>
                          )}
                          {m.repairQuantity > 0 && (
                            <Badge className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950 border-amber-200">
                              Repair: {m.repairQuantity}
                            </Badge>
                          )}
                          {m.lostQuantity > 0 && (
                            <Badge className="text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950 border-rose-200">
                              Lost: {m.lostQuantity}
                            </Badge>
                          )}
                          {m.issuedQuantity === 0 && m.repairQuantity === 0 && m.lostQuantity === 0 && (
                            <span className="text-[11px] text-muted-foreground font-medium">100% In Stock</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            m.condition === "Good"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : m.condition === "Damaged" || m.condition === "Repair Required"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {m.condition}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            disabled={!isAvailable}
                            onClick={() => handleOpenIssueModal(m)}
                            className="h-7 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1 shadow-xs"
                          >
                            <Send className="h-3 w-3" />
                            Issue
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setHistoryMachine(m)}
                            title="View Machine History"
                            className="h-7 w-7 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(m)}
                            title="Edit Machine"
                            className="h-7 w-7 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteTargetId(m.id)}
                            title="Delete Machine"
                            className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ADD / EDIT MACHINE MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600" />
              {editingMachine ? `Edit Tool (${editingMachine.id})` : "Add Tool"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveMachine} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Name *</Label>
              <Input
                placeholder="Name"
                value={formToolName}
                onChange={(e) => setFormToolName(e.target.value)}
                required
                className="h-9 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <SmartComboBox
                  category="Machine Category"
                  value={formCategory}
                  onChange={setFormCategory}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Brand</Label>
                <SmartComboBox
                  category="Machine Brand"
                  value={formBrand}
                  onChange={setFormBrand}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Attachment</Label>
                <SmartComboBox
                  category="Machine Attachment"
                  value={formAttachment}
                  onChange={setFormAttachment}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unit</Label>
                <SmartComboBox
                  category="Machine Unit"
                  value={formUnit}
                  onChange={setFormUnit}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Stock *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formStock}
                  onChange={(e) => setFormStock(Math.max(1, Number(e.target.value)))}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Condition</Label>
                <Select value={formCondition} onValueChange={(val: MachineCondition) => setFormCondition(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                    <SelectItem value="Repair Required">Repair Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes</Label>
              <Textarea
                placeholder="Notes"
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                rows={2}
                className="text-xs rounded-lg resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                {editingMachine ? "Update Machine" : "Save Machine"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ISSUE MACHINE MODAL */}
      <Dialog open={!!issueMachineTarget} onOpenChange={(open) => !open && setIssueMachineTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Issue Machine to Project
            </DialogTitle>
            <DialogDescription className="text-xs">
              Deploys machine to site. Reduces available stock automatically.
            </DialogDescription>
          </DialogHeader>

          {issueMachineTarget && (
            <form onSubmit={handleConfirmIssue} className="space-y-4 py-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 space-y-1">
                <div className="text-xs font-bold text-blue-950 dark:text-blue-200">{issueMachineTarget.toolName}</div>
                <div className="flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-400">
                  <span>ID: {issueMachineTarget.id}</span>
                  <span className="font-semibold">Available: {issueMachineTarget.availableQuantity} {issueMachineTarget.unit}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Project *</Label>
                <Select value={issueProjectId} onValueChange={setIssueProjectId}>
                  <SelectTrigger className="h-9 text-xs rounded-lg">
                    <SelectValue placeholder="Select Project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.id} - {p.customerName} ({p.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Quantity to Issue *</Label>
                  <Input
                    type="number"
                    min="1"
                    max={issueMachineTarget.availableQuantity}
                    value={issueQty}
                    onChange={(e) => setIssueQty(Math.min(issueMachineTarget.availableQuantity, Math.max(1, Number(e.target.value))))}
                    required
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Issued By</Label>
                  <Input
                    value={issueBy}
                    onChange={(e) => setIssueBy(e.target.value)}
                    required
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Issue Date</Label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Expected Return Date</Label>
                  <Input
                    type="date"
                    value={issueReturnDate}
                    onChange={(e) => setIssueReturnDate(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Remarks</Label>
                <Textarea
                  placeholder="Purpose or deployment site details..."
                  value={issueRemarks}
                  onChange={(e) => setIssueRemarks(e.target.value)}
                  rows={2}
                  className="text-xs rounded-lg resize-none"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIssueMachineTarget(null)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  Issue Machine
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MACHINE HISTORY MODAL */}
      <Dialog open={!!historyMachine} onOpenChange={(open) => !open && setHistoryMachine(null)}>
        <DialogContent className="max-w-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Machine Lifecycle History
            </DialogTitle>
            {historyMachine && (
              <DialogDescription className="text-xs">
                History of all issues and returns for <strong>{historyMachine.toolName} ({historyMachine.id})</strong>
              </DialogDescription>
            )}
          </DialogHeader>

          {historyMachine && (
            <div className="space-y-4 py-2">
              {/* Machine Metrics Summary */}
              <div className="grid grid-cols-4 gap-2.5 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Total Stock</span>
                  <strong className="text-foreground">{historyMachine.currentStock} {historyMachine.unit}</strong>
                </div>
                <div>
                  <span className="text-emerald-600 block text-[10px]">Available</span>
                  <strong className="text-emerald-600">{historyMachine.availableQuantity}</strong>
                </div>
                <div>
                  <span className="text-blue-600 block text-[10px]">Issued</span>
                  <strong className="text-blue-600">{historyMachine.issuedQuantity}</strong>
                </div>
                <div>
                  <span className="text-amber-600 block text-[10px]">Repair / Lost</span>
                  <strong className="text-amber-600">{historyMachine.repairQuantity + historyMachine.lostQuantity}</strong>
                </div>
              </div>

              {/* History Table */}
              <div className="max-h-[350px] overflow-y-auto border rounded-xl">
                <Table>
                  <TableHeader className="bg-slate-100 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold">Project & Customer</TableHead>
                      <TableHead className="text-[11px] font-bold">Qty</TableHead>
                      <TableHead className="text-[11px] font-bold">Issued Date</TableHead>
                      <TableHead className="text-[11px] font-bold">Returned Date</TableHead>
                      <TableHead className="text-[11px] font-bold">Actor</TableHead>
                      <TableHead className="text-[11px] font-bold">Condition</TableHead>
                      <TableHead className="text-[11px] font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machineIssues.filter((rec) => rec.machineId === historyMachine.id).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                          No issuance history logged for this machine yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      machineIssues
                        .filter((rec) => rec.machineId === historyMachine.id)
                        .map((rec) => (
                          <TableRow key={rec.id} className="text-xs">
                            <TableCell className="font-semibold">
                              <div>{rec.customerName}</div>
                              <span className="text-[10px] text-blue-600 font-mono">{rec.projectId}</span>
                            </TableCell>

                            <TableCell className="font-bold">{rec.quantity}</TableCell>

                            <TableCell>{rec.issueDate}</TableCell>

                            <TableCell>{rec.actualReturnedDate || "Active"}</TableCell>

                            <TableCell>{rec.issuedBy}</TableCell>

                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {rec.conditionOnReturn || historyMachine.condition}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <Badge
                                className={`text-[10px] ${
                                  rec.status === "Issued"
                                    ? "bg-blue-600 text-white"
                                    : rec.status === "Returned"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-amber-600 text-white"
                                }`}
                              >
                                {rec.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* STOCK AUDIT LOG DRAWER/MODAL */}
      <Dialog open={isAuditLogOpen} onOpenChange={setIsAuditLogOpen}>
        <DialogContent className="max-w-3xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Complete Inventory Audit Log
            </DialogTitle>
            <DialogDescription className="text-xs">
              Immutable historical record of every machine & material movement.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] overflow-y-auto border rounded-xl py-1">
            <Table>
              <TableHeader className="bg-slate-100 dark:bg-slate-800">
                <TableRow>
                  <TableHead className="text-[11px] font-bold">Timestamp</TableHead>
                  <TableHead className="text-[11px] font-bold">Type</TableHead>
                  <TableHead className="text-[11px] font-bold">Item Name</TableHead>
                  <TableHead className="text-[11px] font-bold">Action</TableHead>
                  <TableHead className="text-[11px] font-bold">Qty</TableHead>
                  <TableHead className="text-[11px] font-bold">Project / Ref</TableHead>
                  <TableHead className="text-[11px] font-bold">Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockAuditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      No audit logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  stockAuditLogs.map((log) => (
                    <TableRow key={log.id} className="text-xs">
                      <TableCell className="text-muted-foreground font-mono text-[11px]">{log.timestamp}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={log.itemType === "Machine" ? "text-blue-700 bg-blue-50" : "text-purple-700 bg-purple-50"}>
                          {log.itemType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{log.itemName}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] ${
                            log.actionType === "Issue"
                              ? "bg-amber-600 text-white"
                              : log.actionType === "Return"
                              ? "bg-emerald-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {log.actionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">{log.quantity}</TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">
                        {log.projectId || "Master Inventory"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.issuedByOrActor}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirm
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMachine(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title="Delete Machine Record?"
        description="Are you sure you want to delete this machine record? This action cannot be undone."
      />
    </div>
  );
}
