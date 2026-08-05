import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpDown,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/lib/project-types";
import { formatCurrency, getBalance, getStatus } from "@/lib/project-types";
import { StatusBadge } from "./status-badge";
import { useProjects } from "@/lib/projects-context";
import { ProjectModal } from "./project-modal";
import { ViewDetailsModal } from "./view-details-modal";
import { DeleteConfirm } from "./delete-confirm";
import { ExportButtons } from "./export-buttons";

type SortKey = "date" | "clientName" | "projectValue" | "paymentReceived" | "balance";
type FilterKey = "all" | "Received" | "Pending" | "Part Payment" | "month" | "year";

export function ProjectsTable({
  title,
  data,
  showAdd = true,
  readOnly = false,
}: {
  title: string;
  data: Project[];
  showAdd?: boolean;
  readOnly?: boolean;
}) {
  const { addProject, updateProject, deleteProject, duplicateProject } = useProjects();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [viewing, setViewing] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    const s = search.trim().toLowerCase();
    let rows = data.filter((p) => {
      if (!s) return true;
      return (
        p.clientName.toLowerCase().includes(s) ||
        p.contactNumber.toLowerCase().includes(s) ||
        p.location.toLowerCase().includes(s) ||
        p.natureOfWork.toLowerCase().includes(s)
      );
    });
    if (filter === "Received" || filter === "Pending" || filter === "Part Payment") {
      rows = rows.filter((p) => getStatus(p) === filter);
    } else if (filter === "month") {
      rows = rows.filter((p) => {
        const d = new Date(p.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (filter === "year") {
      rows = rows.filter((p) => new Date(p.date).getFullYear() === now.getFullYear());
    }
    rows.sort((a, b) => {
      const av =
        sortKey === "balance"
          ? getBalance(a)
          : sortKey === "date"
            ? new Date(a.date).getTime()
            : (a as never)[sortKey as never];
      const bv =
        sortKey === "balance"
          ? getBalance(b)
          : sortKey === "date"
            ? new Date(b.date).getTime()
            : (b as never)[sortKey as never];
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [data, search, filter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * pageSize, curPage * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const SortHead = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 font-semibold hover:text-foreground"
    >
      {children} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const exportRows = filtered.map((p, i) => ({
    SNo: i + 1,
    Date: p.date,
    Client: p.clientName,
    Contact: p.contactNumber,
    Location: p.location,
    Nature: p.natureOfWork,
    Value: p.projectValue,
    Received: p.paymentReceived,
    Balance: getBalance(p),
    Status: getStatus(p),
  }));

  const printInvoice = (p: Project) => {
    const html = `<!doctype html><html><head><title>Invoice - ${p.clientName}</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');body{font-family:'Plus Jakarta Sans', system-ui, sans-serif;padding:40px;color:#111}
    h1{margin:0 0 4px}.muted{color:#666;font-size:14px}
    table{width:100%;border-collapse:collapse;margin-top:24px}
    th,td{padding:10px;border-bottom:1px solid #eee;text-align:left}
    .total{font-size:20px;font-weight:700}</style></head><body>
    <h1>Invoice</h1><div class="muted">Date: ${p.date}</div>
    <div style="margin-top:24px"><strong>${p.clientName}</strong><br/>${p.location}<br/>${p.contactNumber}</div>
    <table><tr><th>Description</th><th style="text-align:right">Amount</th></tr>
    <tr><td>${p.natureOfWork}</td><td style="text-align:right">${formatCurrency(p.projectValue)}</td></tr>
    <tr><td>Payment Received</td><td style="text-align:right">- ${formatCurrency(p.paymentReceived)}</td></tr>
    <tr><td class="total">Balance Due</td><td class="total" style="text-align:right">${formatCurrency(getBalance(p))}</td></tr>
    </table><script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">{title}</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} records</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ExportButtons rows={exportRows} filename={title} />
          {showAdd && !readOnly && (
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              + Add Project
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by client, contact, location, work..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Received">Received</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Part Payment">Part Payment</SelectItem>
            <SelectItem value="month">Current Month</SelectItem>
            <SelectItem value="year">Current Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="max-h-[640px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <TableRow>
                <TableHead>S.No</TableHead>
                <TableHead>
                  <SortHead k="date">Date</SortHead>
                </TableHead>
                <TableHead>
                  <SortHead k="clientName">Client</SortHead>
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Nature of Work</TableHead>
                <TableHead className="text-right">
                  <SortHead k="projectValue">Value</SortHead>
                </TableHead>
                <TableHead className="text-right">
                  <SortHead k="paymentReceived">Received</SortHead>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <SortHead k="balance">Balance</SortHead>
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                    No records found
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((p, idx) => (
                <TableRow
                  key={p.id}
                  className="odd:bg-background even:bg-muted/30 transition-colors hover:bg-accent/40"
                >
                  <TableCell className="font-medium">
                    {(curPage - 1) * pageSize + idx + 1}
                  </TableCell>
                  <TableCell>{p.date}</TableCell>
                  <TableCell className="font-medium">{p.clientName}</TableCell>
                  <TableCell>{p.contactNumber}</TableCell>
                  <TableCell>{p.location}</TableCell>
                  <TableCell>{p.natureOfWork}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(p.projectValue)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(p.paymentReceived)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={getStatus(p)} />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(getBalance(p))}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewing(p)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => printInvoice(p)}>
                          <Printer className="mr-2 h-4 w-4" /> Print Invoice
                        </DropdownMenuItem>
                        {!readOnly && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(p);
                                setModalOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                duplicateProject(p.id);
                                toast.success("Project duplicated");
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(p.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          Page {curPage} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={curPage === 1}
            onClick={() => setPage(curPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={curPage === totalPages}
            onClick={() => setPage(curPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <ProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editing}
        onSubmit={(data) => {
          if (editing) {
            updateProject(editing.id, data);
            toast.success("✅ Project Updated Successfully");
          } else {
            addProject(data);
            toast.success("✅ Project Added Successfully");
          }
          setModalOpen(false);
        }}
      />
      <ViewDetailsModal project={viewing} onOpenChange={(v) => !v && setViewing(null)} />
      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Delete this project?"
        description="Are you sure you want to delete this project? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) {
            deleteProject(deleteId);
            toast.success("🗑 Project Deleted Successfully");
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
