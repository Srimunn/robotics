import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRobotics } from "@/lib/robotics-context";
import type { Material, MaterialIssueRecord, StockAuditLog } from "@/lib/robotics-types";
import { SmartComboBox } from "@/components/ui/SmartComboBox";
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  History,
  Pencil,
  Trash2,
  Send,
  Layers,
  ShieldAlert,
  ArrowRightLeft,
  PackageCheck,
  PlusCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";

export const Route = createFileRoute("/materials")({
  component: MaterialsPageComponent,
});

function MaterialsPageComponent() {
  const {
    materials,
    materialIssues,
    projects,
    stockAuditLogs,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    issueMaterialToProject,
    adjustStock,
  } = useRobotics();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [issueMaterialTarget, setIssueMaterialTarget] = useState<Material | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Material | null>(null);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  // Add/Edit Form
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Oils & Lubricants");
  const [formUnit, setFormUnit] = useState("Ltr");
  const [formStock, setFormStock] = useState(50);
  const [formMinStock, setFormMinStock] = useState(15);
  const [formSupplier, setFormSupplier] = useState("Shell Lubricants India");
  const [formCost, setFormCost] = useState(450);
  const [formRemarks, setFormRemarks] = useState("");

  // Issue Form
  const [issueProjectId, setIssueProjectId] = useState("");
  const [issueQty, setIssueQty] = useState(1);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [issueBy, setIssueBy] = useState("");
  const [issueRemarks, setIssueRemarks] = useState("");

  // Stock Adjust Form
  const [adjustNewQty, setAdjustNewQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("Restock purchase invoice update");

  // Metrics
  const totalMaterialTypes = materials.length;
  const totalStockUnits = materials.reduce((acc, m) => acc + m.currentStock, 0);
  const lowStockCount = materials.filter((m) => m.currentStock <= m.minimumStock).length;
  const totalValuation = materials.reduce((acc, m) => acc + m.currentStock * m.purchaseCost, 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayConsumptionCost = materialIssues
    .filter((mi) => mi.issueDate === todayStr)
    .reduce((acc, mi) => acc + (mi.totalCost || 0), 0);

  const categories = useMemo(() => {
    const set = new Set(materials.map((m) => m.category).filter(Boolean));
    return Array.from(set);
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.supplier.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
      const matchesLowStock = !lowStockOnly || m.currentStock <= m.minimumStock;

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [materials, searchQuery, categoryFilter, lowStockOnly]);

  const handleOpenAddModal = () => {
    setEditingMaterial(null);
    setFormName("");
    setFormCategory("Oils & Lubricants");
    setFormUnit("Ltr");
    setFormStock(50);
    setFormMinStock(15);
    setFormSupplier("Shell Lubricants India");
    setFormCost(450);
    setFormRemarks("");
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (m: Material) => {
    setEditingMaterial(m);
    setFormName(m.name);
    setFormCategory(m.category);
    setFormUnit(m.unit);
    setFormStock(m.currentStock);
    setFormMinStock(m.minimumStock);
    setFormSupplier(m.supplier);
    setFormCost(m.purchaseCost);
    setFormRemarks(m.remarks || "");
    setIsAddModalOpen(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Material Name is required");
      return;
    }

    if (editingMaterial) {
      updateMaterial(editingMaterial.id, {
        name: formName.trim(),
        category: formCategory,
        unit: formUnit,
        currentStock: Number(formStock),
        minimumStock: Number(formMinStock),
        supplier: formSupplier,
        purchaseCost: Number(formCost),
        remarks: formRemarks,
      });
    } else {
      addMaterial({
        name: formName.trim(),
        category: formCategory,
        unit: formUnit,
        currentStock: Number(formStock),
        minimumStock: Number(formMinStock),
        supplier: formSupplier,
        purchaseCost: Number(formCost),
        remarks: formRemarks,
      });
    }
    setIsAddModalOpen(false);
  };

  const handleOpenIssueModal = (m: Material) => {
    setIssueMaterialTarget(m);
    setIssueQty(1);
    if (projects.length > 0) {
      setIssueProjectId(projects[0].id);
    }
    setIssueDate(new Date().toISOString().slice(0, 10));
    setIssueBy("");
    setIssueRemarks("");
  };

  const handleConfirmIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueMaterialTarget || !issueProjectId) {
      toast.error("Please select a project");
      return;
    }

    issueMaterialToProject({
      materialId: issueMaterialTarget.id,
      projectId: issueProjectId,
      quantity: Number(issueQty),
      issueDate,
      issuedBy: issueBy,
      remarks: issueRemarks,
    });
    setIssueMaterialTarget(null);
  };

  const handleOpenAdjustModal = (m: Material) => {
    setAdjustTarget(m);
    setAdjustNewQty(m.currentStock);
    setAdjustReason("Purchase restock / physical stock count audit");
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    adjustStock({
      itemType: "Material",
      itemId: adjustTarget.id,
      newQuantity: Number(adjustNewQty),
      reason: adjustReason,
      actor: "Inventory Manager",
    });
    setAdjustTarget(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Material Management & Consumables</h1>
              <p className="text-xs text-muted-foreground">
                Consumable inventory tracking, automatic stock deduction & cost calculation.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAuditLogOpen(true)}
            className="text-xs font-semibold h-9 rounded-xl gap-1.5"
          >
            <History className="h-3.5 w-3.5 text-purple-600" />
            Audit Trail
          </Button>
          <Button
            onClick={handleOpenAddModal}
            className="text-xs font-semibold h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add New Material
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Material Masters</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">{totalMaterialTypes}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{totalStockUnits} total units in stock</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Low Stock Alerts</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-rose-600 dark:text-rose-400">{lowStockCount}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Below minimum threshold</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 grid place-items-center text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Inventory Value</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">
                ₹{totalValuation.toLocaleString("en-IN")}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total stock valuation</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Today's Consumption</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-purple-600 dark:text-purple-400">
                ₹{todayConsumptionCost.toLocaleString("en-IN")}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Used in active projects today</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 grid place-items-center text-purple-600">
              <Send className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Consumed</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-blue-600 dark:text-blue-400">
                {materialIssues.length}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Project issue transactions</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center text-blue-600">
              <PackageCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Material Name, ID, Category, Supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs w-[170px] rounded-lg">
                  <SelectValue placeholder="Category: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <Switch
                  id="low-stock"
                  checked={lowStockOnly}
                  onCheckedChange={setLowStockOnly}
                />
                <Label htmlFor="low-stock" className="text-xs font-semibold cursor-pointer">
                  Low Stock Only
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Material Master Table */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold text-muted-foreground w-28">Material ID</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground min-w-[220px]">Material Name</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Category</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">Current Stock / Min</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Supplier</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Unit Cost</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Total Value</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                        <Boxes className="h-6 w-6 stroke-[1.5]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">Material stock is empty.</p>
                        <p className="text-xs text-muted-foreground">Add consumable parts and materials to track inventory and job costing.</p>
                      </div>
                      <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-lg shadow-xs">
                        <Plus className="h-4 w-4" /> Add Material Stock
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaterials.map((m) => {
                  const isLowStock = m.currentStock <= m.minimumStock;
                  const totalVal = m.currentStock * m.purchaseCost;

                  return (
                    <TableRow key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                        {m.id}
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">{m.name}</div>
                        {m.remarks && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">{m.remarks}</div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                          {m.category}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isLowStock
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                          }`}>
                            <span>{m.currentStock} {m.unit}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5">Min Threshold: {m.minimumStock} {m.unit}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">{m.supplier}</TableCell>

                      <TableCell className="text-right font-mono text-xs font-semibold">
                        ₹{m.purchaseCost.toLocaleString("en-IN")}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{totalVal.toLocaleString("en-IN")}
                      </TableCell>

                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            disabled={m.currentStock <= 0}
                            onClick={() => handleOpenIssueModal(m)}
                            className="h-7 px-2 text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg gap-1 shadow-xs"
                          >
                            <Send className="h-3 w-3" />
                            Issue
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenAdjustModal(m)}
                            title="Adjust / Restock"
                            className="h-7 w-7 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(m)}
                            title="Edit Material"
                            className="h-7 w-7 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete material ${m.name} (${m.id})?`)) {
                                deleteMaterial(m.id);
                              }
                            }}
                            title="Delete Material"
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

      {/* ADD / EDIT MATERIAL MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-full sm:max-w-md w-full max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-purple-600" />
              {editingMaterial ? `Edit Material (${editingMaterial.id})` : "Add New Consumable Material"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define material details, minimum reorder thresholds and purchase unit costs.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMaterial} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Material Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="h-9 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category (Smart Search)</Label>
                <SmartComboBox
                  category="Material Category"
                  value={formCategory}
                  onChange={setFormCategory}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unit (Smart Search)</Label>
                <SmartComboBox
                  category="Material Unit"
                  value={formUnit}
                  onChange={setFormUnit}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Current Stock *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formStock}
                  onChange={(e) => setFormStock(Math.max(0, Number(e.target.value)))}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Minimum Stock Alert *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formMinStock}
                  onChange={(e) => setFormMinStock(Math.max(1, Number(e.target.value)))}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Supplier Name</Label>
                <Input
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Purchase Cost (₹) per Unit *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formCost}
                  onChange={(e) => setFormCost(Math.max(0, Number(e.target.value)))}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remarks</Label>
              <Textarea
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                rows={2}
                className="text-xs rounded-lg resize-none"
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
              <Button
                type="submit"
                className="h-9 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs w-full sm:w-auto"
              >
                {editingMaterial ? "Update Material" : "Save Material"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="h-9 text-xs rounded-xl w-full sm:w-auto"
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ISSUE MATERIAL MODAL */}
      <Dialog open={!!issueMaterialTarget} onOpenChange={(open) => !open && setIssueMaterialTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-600" />
              Issue Material to Project
            </DialogTitle>
            <DialogDescription className="text-xs">
              Consumable materials will be deducted from stock permanently.
            </DialogDescription>
          </DialogHeader>

          {issueMaterialTarget && (
            <form onSubmit={handleConfirmIssue} className="space-y-4 py-2">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900 space-y-1">
                <div className="text-xs font-bold text-purple-950 dark:text-purple-200">{issueMaterialTarget.name}</div>
                <div className="flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-400">
                  <span>ID: {issueMaterialTarget.id}</span>
                  <span className="font-semibold">Available Stock: {issueMaterialTarget.currentStock} {issueMaterialTarget.unit}</span>
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
                  <Label className="text-xs font-semibold">Quantity Consumed *</Label>
                  <Input
                    type="number"
                    min="1"
                    max={issueMaterialTarget.currentStock}
                    value={issueQty}
                    onChange={(e) => setIssueQty(Math.min(issueMaterialTarget.currentStock, Math.max(1, Number(e.target.value))))}
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

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border flex items-center justify-between text-xs font-semibold">
                <span>Calculated Material Expense:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{(issueQty * issueMaterialTarget.purchaseCost).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Remarks</Label>
                <Textarea
                  placeholder="Application details or notes..."
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
                  onClick={() => setIssueMaterialTarget(null)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs"
                >
                  Confirm Material Issue
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* RESTOCK / ADJUST STOCK MODAL */}
      <Dialog open={!!adjustTarget} onOpenChange={(open) => !open && setAdjustTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-emerald-600" />
              Restock / Adjust Material Stock
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update physical stock levels directly and log adjustment audit reason.
            </DialogDescription>
          </DialogHeader>

          {adjustTarget && (
            <form onSubmit={handleConfirmAdjust} className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border text-xs space-y-1">
                <div className="font-bold text-foreground">{adjustTarget.name} ({adjustTarget.id})</div>
                <div className="text-muted-foreground">Current Stock in System: {adjustTarget.currentStock} {adjustTarget.unit}</div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Revised Stock Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  value={adjustNewQty}
                  onChange={(e) => setAdjustNewQty(Math.max(0, Number(e.target.value)))}
                  required
                  className="h-9 text-xs rounded-lg font-bold text-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Adjustment Reason *</Label>
                <Input
                  placeholder="e.g. Received new shipment from supplier PO-481"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustTarget(null)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  Update Stock Level
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* AUDIT LOG MODAL */}
      <Dialog open={isAuditLogOpen} onOpenChange={setIsAuditLogOpen}>
        <DialogContent className="max-w-3xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" />
              Material & Stock Audit History
            </DialogTitle>
            <DialogDescription className="text-xs">
              Every stock movement, issue and manual adjustment logged with timestamp and user.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] overflow-y-auto border rounded-xl py-1">
            <Table>
              <TableHeader className="bg-slate-100 dark:bg-slate-800">
                <TableRow>
                  <TableHead className="text-[11px] font-bold">Timestamp</TableHead>
                  <TableHead className="text-[11px] font-bold">Item Name</TableHead>
                  <TableHead className="text-[11px] font-bold">Action</TableHead>
                  <TableHead className="text-[11px] font-bold">Quantity</TableHead>
                  <TableHead className="text-[11px] font-bold">New Available</TableHead>
                  <TableHead className="text-[11px] font-bold">Project / Ref</TableHead>
                  <TableHead className="text-[11px] font-bold">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockAuditLogs.filter((log) => log.itemType === "Material").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      No material audit logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  stockAuditLogs
                    .filter((log) => log.itemType === "Material")
                    .map((log) => (
                      <TableRow key={log.id} className="text-xs">
                        <TableCell className="text-muted-foreground font-mono text-[11px]">{log.timestamp}</TableCell>
                        <TableCell className="font-medium text-foreground">{log.itemName}</TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] ${
                              log.actionType === "Issue"
                                ? "bg-amber-600 text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {log.actionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold">{log.quantity}</TableCell>
                        <TableCell className="font-bold text-emerald-600">{log.newAvailable}</TableCell>
                        <TableCell className="text-[11px] font-mono text-muted-foreground">
                          {log.projectId || "Inventory"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{log.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
