import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRobotics } from "@/lib/robotics-context";
import { canEdit } from "@/lib/permissions";
import type { PaymentMode, PaymentStatus, Project } from "@/lib/robotics-types";
import { DataPagination } from "@/components/ui/DataPagination";
import { DeleteConfirm } from "@/components/delete-confirm";
import {
  Wallet,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Trash2,
  Clock,
  ShieldAlert,
  Calendar,
  Filter,
  FolderKanban,
  User,
  Sparkles,
  ArrowUpRight,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/payments")({
  component: PaymentsComponent,
});

function getProjectNextDue(proj: Project) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const pendingStages = (proj.paymentStages || []).filter(
    (s) => (s.paidAmount || 0) < s.amount
  );
  if (pendingStages.length > 0) {
    const sorted = [...pendingStages].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return { dueDate: sorted[0].dueDate, stageName: sorted[0].stageName };
  }
  return { dueDate: proj.workCommittedDate || proj.scheduledDate || todayStr, stageName: "Contract Settlement" };
}

function getDaysOverdue(dueDate: string, balance: number) {
  if (balance <= 0 || !dueDate || dueDate === "-") return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - due.getTime();
  if (diffTime > 0) {
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
}

function PaymentsComponent() {
  const { payments, projects, customers, addPayment, deletePayment, updateFollowUpTag, currentUser } = useRobotics();

  const canFullEdit = canEdit(currentUser);

  const [activeTab, setActiveTab] = useState<"RECEIVABLES" | "HISTORY" | "CUSTOMER">("RECEIVABLES");
  const [searchQuery, setSearchQuery] = useState("");
  const [creditFilter, setCreditFilter] = useState<string>("ALL");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>("ALL");
  const [followUpTagFilter, setFollowUpTagFilter] = useState<"ALL" | "MD" | "Team">("ALL");

  const [currentPageReceivables, setCurrentPageReceivables] = useState(1);
  const [pageSizeReceivables, setPageSizeReceivables] = useState(10);
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const [pageSizeHistory, setPageSizeHistory] = useState(10);
  const [deletePaymentTargetId, setDeletePaymentTargetId] = useState<string | null>(null);

  // Receive Payment Dialog
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payMode, setPayMode] = useState<PaymentMode>("Bank Transfer");
  const [payRef, setPayRef] = useState("");
  const [payRemarks, setPayRemarks] = useState("");
  const [payReceivedBy, setPayReceivedBy] = useState("Accounts & Credit Desk");
  const [payProofName, setPayProofName] = useState("");

  const totalContractValue = projects.reduce((acc, p) => acc + p.projectValue, 0);
  const totalCollectedSum = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstandingSum = projects.reduce((acc, p) => acc + p.balanceAmount, 0);
  const totalOverdueCount = projects.filter((p) => p.paymentStatus === "Overdue" || (p.balanceAmount > 0 && getDaysOverdue(getProjectNextDue(p).dueDate, p.balanceAmount) > 0)).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const sevenDaysLaterStr = sevenDaysLater.toISOString().slice(0, 10);

  // Unique Customers List for Dropdown Filter
  const customerOptions = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.customerName) set.add(p.customerName);
    });
    return Array.from(set);
  }, [projects]);

  // Read-Only Filtered Accounts Receivable Projects
  const filteredReceivables = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone.includes(searchQuery) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCustomer =
        selectedCustomerFilter === "ALL" ||
        p.customerName.toLowerCase() === selectedCustomerFilter.toLowerCase();

      const matchesTag =
        followUpTagFilter === "ALL" ||
        (followUpTagFilter === "MD" && p.followUpTag === "MD") ||
        (followUpTagFilter === "Team" && p.followUpTag === "Team");

      if (!matchesSearch || !matchesCustomer || !matchesTag) return false;

      const nextDue = getProjectNextDue(p);
      const daysOver = getDaysOverdue(nextDue.dueDate, p.balanceAmount);

      if (creditFilter === "DUE_TODAY") return nextDue.dueDate === todayStr && p.balanceAmount > 0;
      if (creditFilter === "DUE_THIS_WEEK") return nextDue.dueDate >= todayStr && nextDue.dueDate <= sevenDaysLaterStr && p.balanceAmount > 0;
      if (creditFilter === "OVERDUE") return p.paymentStatus === "Overdue" || daysOver > 0;
      if (creditFilter === "PARTIAL") return p.paymentStatus === "Partial";
      if (creditFilter === "PAID") return p.paymentStatus === "Paid";
      if (creditFilter === "OUTSTANDING") return p.balanceAmount > 0;

      return true;
    });
  }, [projects, searchQuery, creditFilter, selectedCustomerFilter, followUpTagFilter, todayStr, sevenDaysLaterStr]);

  // Immutable Payment History
  const filteredPaymentHistory = useMemo(() => {
    return payments.filter((pay) => {
      const matchesSearch =
        !searchQuery ||
        pay.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pay.projectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pay.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pay.remarks && pay.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

      const proj = projects.find((p) => p.id === pay.projectId);
      const matchesCustomer =
        selectedCustomerFilter === "ALL" ||
        (proj && proj.customerName.toLowerCase() === selectedCustomerFilter.toLowerCase());

      return matchesSearch && matchesCustomer;
    });
  }, [payments, searchQuery, selectedCustomerFilter, projects]);

  const totalReceivables = filteredReceivables.length;
  const totalReceivablesPages = Math.ceil(totalReceivables / pageSizeReceivables);
  const paginatedReceivables = filteredReceivables.slice(
    (currentPageReceivables - 1) * pageSizeReceivables,
    currentPageReceivables * pageSizeReceivables
  );

  const totalHistory = filteredPaymentHistory.length;
  const totalHistoryPages = Math.ceil(totalHistory / pageSizeHistory);
  const paginatedHistory = filteredPaymentHistory.slice(
    (currentPageHistory - 1) * pageSizeHistory,
    currentPageHistory * pageSizeHistory
  );

  const handleOpenReceivePayment = (projId?: string, defaultAmt?: number) => {
    const targetId = projId || (projects[0] ? projects[0].id : "");
    const proj = projects.find((p) => p.id === targetId);
    setSelectedProjectId(targetId);
    setPayAmount(defaultAmt || proj?.balanceAmount || 50000);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMode("Bank Transfer");
    setPayRef("");
    setPayRemarks("Collection received via Accounts Receivable Cockpit");
    setPayReceivedBy("Accounts & Credit Desk");
    setReceiveOpen(true);
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (payAmount <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }

    const targetProj = projects.find((p) => p.id === selectedProjectId);
    if (targetProj && Number(payAmount) > targetProj.balanceAmount) {
      toast.error(`Payment Amount cannot exceed project balance (₹${targetProj.balanceAmount.toLocaleString("en-IN")})`);
      return;
    }

    addPayment({
      projectId: selectedProjectId,
      paymentDate: payDate || new Date().toISOString().slice(0, 10),
      amount: Number(payAmount),
      mode: payMode,
      referenceNumber: payRef || `PAY-REF-${Math.floor(Math.random() * 1000000)}`,
      remarks: payRemarks || "Payment receipt logged via AR Cockpit",
      receivedBy: payReceivedBy || "Accounts & Credit Desk",
    });

    toast.success(`Payment Added Successfully`);
    setReceiveOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Payments</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canFullEdit && (
            <Button
              onClick={() => handleOpenReceivePayment()}
              className="text-xs font-semibold h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Receive Payment
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Contract Value</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">₹{totalContractValue.toLocaleString("en-IN")}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center text-blue-600">
              <FolderKanban className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Collected Amount</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">
                ₹{totalCollectedSum.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Outstanding Balance</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-amber-600 dark:text-amber-400">
                ₹{totalOutstandingSum.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 grid place-items-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Overdue Accounts</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-rose-600 dark:text-rose-400">
                {totalOverdueCount}
              </h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 grid place-items-center text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation Bar */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("RECEIVABLES")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "RECEIVABLES"
                    ? "bg-white dark:bg-card text-emerald-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Receivables
              </button>
              <button
                onClick={() => setActiveTab("HISTORY")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "HISTORY"
                    ? "bg-white dark:bg-card text-emerald-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab("CUSTOMER")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === "CUSTOMER"
                    ? "bg-white dark:bg-card text-emerald-600 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ledger
              </button>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto justify-start sm:justify-end">
              <div className="relative w-full sm:w-64 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-lg"
                />
              </div>

              {/* Customer Filter */}
              <Select value={selectedCustomerFilter} onValueChange={setSelectedCustomerFilter}>
                <SelectTrigger className="h-9 text-xs w-[160px] rounded-lg shrink-0">
                  <SelectValue placeholder="Customer: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Customers</SelectItem>
                  {customerOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Follow-up Tag Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                <span className="text-[11px] font-bold text-slate-500 px-1.5">Tag:</span>
                {(["ALL", "MD", "Team"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFollowUpTagFilter(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      followUpTagFilter === t
                        ? t === "MD"
                          ? "bg-blue-600 text-white shadow-xs"
                          : t === "Team"
                          ? "bg-slate-700 text-white shadow-xs"
                          : "bg-white dark:bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "ALL" ? "All" : t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Filter Badges for Accounts Receivable */}
          {activeTab === "RECEIVABLES" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t text-xs scrollbar-none">
              <span className="text-muted-foreground font-semibold text-[11px] whitespace-nowrap mr-1">Filter:</span>
              {[
                { id: "ALL", label: "All Projects" },
                { id: "DUE_TODAY", label: "Due Today" },
                { id: "DUE_THIS_WEEK", label: "Due This Week" },
                { id: "OVERDUE", label: "Overdue" },
                { id: "PARTIAL", label: "Partial" },
                { id: "PAID", label: "Fully Paid" },
              ].map((f) => (
                <Button
                  key={f.id}
                  variant={creditFilter === f.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCreditFilter(f.id)}
                  className={`h-7 text-[11px] rounded-md whitespace-nowrap shrink-0 ${
                    creditFilter === f.id
                      ? f.id === "OVERDUE"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : f.id === "PAID"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-blue-600 hover:bg-blue-700"
                      : ""
                  }`}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TAB 1: ACCOUNTS RECEIVABLE READ-ONLY COCKPIT */}
      {activeTab === "RECEIVABLES" && (
        <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-muted-foreground whitespace-nowrap min-w-[150px]">CUSTOMER</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground whitespace-nowrap min-w-[180px]">PROJECT</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-right whitespace-nowrap">VALUE</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-right whitespace-nowrap">RECEIVED</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-right whitespace-nowrap">BALANCE</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground whitespace-nowrap min-w-[130px]">DUE DATE</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-center whitespace-nowrap">OVERDUE</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-center whitespace-nowrap">STATUS</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-right pr-4 whitespace-nowrap">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReceivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <Wallet className="h-6 w-6 stroke-[1.5]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">No payments recorded.</p>
                          <p className="text-xs text-muted-foreground">Record project advance or milestone stage payments to populate receivables ledger.</p>
                        </div>
                        {canFullEdit && (
                          <Button
                            size="sm"
                            onClick={() => setReceiveOpen(true)}
                            className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-lg shadow-xs"
                          >
                            <Plus className="h-4 w-4" /> Receive Payment
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedReceivables.map((proj) => {
                    const nextDue = getProjectNextDue(proj);
                    const daysOver = getDaysOverdue(nextDue.dueDate, proj.balanceAmount);

                    return (
                      <TableRow key={proj.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-xs text-foreground flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground shrink-0" /> {proj.customerName}
                            </div>
                            {canFullEdit ? (
                              <Select
                                value={proj.followUpTag || "NONE"}
                                onValueChange={async (val) => {
                                  const newTag = val === "NONE" ? null : (val as "MD" | "Team");
                                  await updateFollowUpTag(proj.id, newTag);
                                }}
                              >
                                <SelectTrigger className="h-5 text-[10px] px-1.5 py-0 font-bold rounded border-0 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 shadow-none w-auto gap-0.5">
                                  {proj.followUpTag === "MD" ? (
                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-extrabold text-[10px] px-1.5 py-0">MD</Badge>
                                  ) : proj.followUpTag === "Team" ? (
                                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-extrabold text-[10px] px-1.5 py-0">Team</Badge>
                                  ) : (
                                    <span className="text-slate-400 font-medium text-[10px] hover:underline">+ Tag</span>
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE" className="text-xs font-medium">No Tag</SelectItem>
                                  <SelectItem value="MD" className="text-xs font-bold text-blue-700">MD</SelectItem>
                                  <SelectItem value="Team" className="text-xs font-bold text-slate-700">Team</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : proj.followUpTag ? (
                              <Badge className={proj.followUpTag === "MD" ? "bg-blue-100 text-blue-800 border-blue-200 font-extrabold text-[10px] px-1.5 py-0" : "bg-slate-100 text-slate-700 border-slate-200 font-extrabold text-[10px] px-1.5 py-0"}>
                                {proj.followUpTag}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{proj.phone}</span>
                            <span>•</span>
                            <span>{proj.location}</span>
                          </div>
                        </TableCell>

                        <TableCell className="min-w-[180px] max-w-[240px]">
                          <Link
                            to="/projects"
                            search={{ openId: proj.id }}
                            className="font-mono font-bold text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
                          >
                            {proj.id}
                          </Link>
                          <div className="text-[11px] text-muted-foreground truncate" title={proj.natureOfWork}>{proj.natureOfWork}</div>
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                          ₹{proj.projectValue.toLocaleString("en-IN")}
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          ₹{proj.receivedAmount.toLocaleString("en-IN")}
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          ₹{proj.balanceAmount.toLocaleString("en-IN")}
                        </TableCell>

                        <TableCell className="text-xs font-semibold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                          <div className="whitespace-nowrap flex items-center gap-1">{nextDue.dueDate}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[130px]">{nextDue.stageName}</div>
                        </TableCell>

                        <TableCell className="text-center whitespace-nowrap">
                          {daysOver > 0 ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] animate-pulse whitespace-nowrap">
                              {daysOver} days overdue
                            </Badge>
                          ) : proj.balanceAmount <= 0 ? (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground whitespace-nowrap">
                              Settled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 whitespace-nowrap">
                              On Schedule
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center whitespace-nowrap">
                          <Badge
                            className={`text-[10px] font-bold whitespace-nowrap ${
                              proj.paymentStatus === "Paid"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : proj.paymentStatus === "Partial"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : proj.paymentStatus === "Overdue"
                                ? "bg-rose-100 text-rose-800 border-rose-200"
                                : "bg-amber-100 text-amber-800 border-amber-200"
                            }`}
                          >
                            {proj.paymentStatus}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right pr-4 whitespace-nowrap">
                          {canFullEdit && proj.balanceAmount > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenReceivePayment(proj.id, proj.balanceAmount)}
                              className="h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 shadow-xs whitespace-nowrap"
                            >
                              <Plus className="h-3 w-3" /> Receive
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DataPagination
            currentPage={currentPageReceivables}
            totalPages={totalReceivablesPages}
            totalItems={totalReceivables}
            pageSize={pageSizeReceivables}
            onPageChange={setCurrentPageReceivables}
            onPageSizeChange={(sz) => {
              setPageSizeReceivables(sz);
              setCurrentPageReceivables(1);
            }}
          />
        </Card>
      )}

      {/* TAB 2: IMMUTABLE PAYMENT HISTORY LEDGER */}
      {activeTab === "HISTORY" && (
        <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-muted-foreground w-28">Payment ID</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Date & Timestamp</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-right">Amount (₹)</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Payment Method</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Reference #</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Customer & Project</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Received By</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Remarks</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-xs">
                      No payment transactions recorded in ledger.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedHistory.map((pay) => {
                    const proj = projects.find((p) => p.id === pay.projectId);

                    return (
                      <TableRow key={pay.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {pay.id}
                        </TableCell>

                        <TableCell className="text-xs text-foreground">
                          <div className="font-bold">{pay.paymentDate}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {pay.createdAt ? new Date(pay.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "10:00 AM"}
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          ₹{pay.amount.toLocaleString("en-IN")}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-800 border-slate-300">
                            {pay.mode}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                          {pay.referenceNumber}
                        </TableCell>

                        <TableCell>
                          <Link
                            to="/projects"
                            search={{ openId: pay.projectId }}
                            className="font-bold text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                          >
                            {pay.projectId}
                          </Link>
                          <div className="text-[10px] text-muted-foreground">{proj?.customerName}</div>
                        </TableCell>

                        <TableCell className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                          {pay.receivedBy || "Accounts Lead"}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {pay.remarks || "-"}
                        </TableCell>

                        <TableCell className="text-right pr-4">
                          {canFullEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletePaymentTargetId(pay.id)}
                              title="Delete Payment Record"
                              className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DataPagination
            currentPage={currentPageHistory}
            totalPages={totalHistoryPages}
            totalItems={totalHistory}
            pageSize={pageSizeHistory}
            onPageChange={setCurrentPageHistory}
            onPageSizeChange={(sz) => {
              setPageSizeHistory(sz);
              setCurrentPageHistory(1);
            }}
          />
        </Card>
      )}

      {/* TAB 3: CUSTOMER ACCOUNT LEDGER */}
      {activeTab === "CUSTOMER" && (
        <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-muted-foreground min-w-[200px]">Customer Name</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-center">Active Projects</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-right">Lifetime Contract Value</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-right">Total Collected</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-right font-bold text-rose-600">Outstanding Balance</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Last Payment Date</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground">Next Due Date</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground text-center">Credit Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <Wallet className="h-6 w-6 stroke-[1.5]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">No customer ledger accounts found.</p>
                          <p className="text-xs text-muted-foreground">Customer accounts populate automatically as projects and payments are created.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((c) => {
                    const cProjs = projects.filter(
                      (p) => p.customerName.toLowerCase().trim() === c.name.toLowerCase().trim()
                    );
                    const totalVal = cProjs.reduce((s, p) => s + p.projectValue, 0);
                    const totalRec = cProjs.reduce((s, p) => s + p.receivedAmount, 0);
                    const bal = Math.max(0, totalVal - totalRec);
                    const cPayments = payments.filter((pay) => cProjs.some((p) => p.id === pay.projectId));
                    const lastPay = cPayments.sort((a, b) => (b.paymentDate > a.paymentDate ? 1 : -1))[0];
                    const isOverdue = cProjs.some((p) => p.paymentStatus === "Overdue");
                    const isPaid = bal === 0 && totalVal > 0;

                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                        <TableCell>
                          <div className="font-bold text-xs text-foreground">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground">{c.phone} • {c.location}</div>
                        </TableCell>

                        <TableCell className="text-center font-bold text-blue-600">
                          {cProjs.length}
                        </TableCell>

                        <TableCell className="text-right font-bold text-foreground">
                          ₹{totalVal.toLocaleString("en-IN")}
                        </TableCell>

                        <TableCell className="text-right font-bold text-emerald-600">
                          ₹{totalRec.toLocaleString("en-IN")}
                        </TableCell>

                        <TableCell className="text-right font-extrabold text-rose-600">
                          ₹{bal.toLocaleString("en-IN")}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {lastPay ? lastPay.paymentDate : "No payments yet"}
                        </TableCell>

                        <TableCell className="text-xs text-foreground font-semibold">
                          {cProjs[0] ? getProjectNextDue(cProjs[0]).dueDate : "N/A"}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge className={`text-[10px] ${
                            isPaid ? "bg-emerald-100 text-emerald-800 border-emerald-300" : isOverdue ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-amber-100 text-amber-800 border-amber-300"
                          }`}>
                            {isPaid ? "Clear Account" : isOverdue ? "Account Overdue" : "Active Credit"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* RECEIVE PAYMENT POPUP DIALOG */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-full sm:max-w-md w-full max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6 bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Receive Stage Payment & Update Balances
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleReceiveSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Project *</Label>
              <Select
                value={selectedProjectId}
                onValueChange={(id) => {
                  setSelectedProjectId(id);
                  const p = projects.find((x) => x.id === id);
                  if (p) setPayAmount(p.balanceAmount || 50000);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id} - {p.customerName} (Bal: ₹{p.balanceAmount.toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Amount Received (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  required
                  className="h-9 text-xs rounded-lg font-bold text-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Date *</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Method *</Label>
              <Select value={payMode} onValueChange={(val: PaymentMode) => setPayMode(val)}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI Payment</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Credit Collection">Credit Collection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Received By</Label>
                <Input
                  value={payReceivedBy}
                  onChange={(e) => setPayReceivedBy(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Upload Payment Proof</Label>
                <Input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPayProofName(e.target.files[0].name);
                      toast.success(`Attached proof file: ${e.target.files[0].name}`);
                    }
                  }}
                  className="h-9 text-xs rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
              <Button
                type="submit"
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs w-full sm:w-auto"
              >
                Record Payment
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReceiveOpen(false)}
                className="h-9 text-xs rounded-xl w-full sm:w-auto"
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <DeleteConfirm
        open={Boolean(deletePaymentTargetId)}
        onOpenChange={(open) => {
          if (!open) setDeletePaymentTargetId(null);
        }}
        onConfirm={() => {
          if (deletePaymentTargetId) {
            deletePayment(deletePaymentTargetId);
            setDeletePaymentTargetId(null);
          }
        }}
        title="Revert & Delete Payment Record?"
        description="Are you sure you want to revert this payment record? Collected & outstanding balances will recalculate automatically."
      />
    </div>
  );
}
