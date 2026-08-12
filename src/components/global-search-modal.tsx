import { useState, useMemo } from "react";
import { useRobotics } from "@/lib/robotics-context";
import { Search, FileText, FolderKanban, Users, Phone, MapPin, Wrench, ChevronRight, UserCheck, Boxes, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "@tanstack/react-router";

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const { enquiries, projects, customers, labours, engineers, machines, payments } = useRobotics();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const items: {
      type: "enquiry" | "project" | "customer" | "labour" | "engineer" | "machine";
      id: string;
      title: string;
      subtitle: string;
      badge: string;
      url: string;
      details: string;
    }[] = [];

    // Search Enquiries & Quotations
    enquiries.forEach((item) => {
      if (
        item.id.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.location.toLowerCase().includes(q) ||
        (item.leakageType && item.leakageType.toLowerCase().includes(q)) ||
        (item.assignedEngineerName && item.assignedEngineerName.toLowerCase().includes(q))
      ) {
        items.push({
          type: "enquiry",
          id: item.id,
          title: `${item.id} - ${item.customerName}`,
          subtitle: `${item.leakageType || "Service"} • ${item.location}`,
          badge: item.customerDecision,
          url: `/enquiries`,
          details: `Quotation: ₹${(item.quotationAmount || 0).toLocaleString("en-IN")} • Date: ${item.enquiryDate}`,
        });
      }
    });

    // Search Projects
    projects.forEach((item) => {
      if (
        item.id.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.location.toLowerCase().includes(q) ||
        (item.natureOfWork && item.natureOfWork.toLowerCase().includes(q)) ||
        (item.assignedEngineerName && item.assignedEngineerName.toLowerCase().includes(q))
      ) {
        items.push({
          type: "project",
          id: item.id,
          title: `${item.id} - ${item.customerName}`,
          subtitle: `${item.natureOfWork} • ${item.location}`,
          badge: item.status,
          url: `/projects`,
          details: `Contract: ₹${item.projectValue.toLocaleString("en-IN")} • Scheduled: ${item.scheduledDate}`,
        });
      }
    });

    // Search Customers
    customers.forEach((item) => {
      if (
        item.name.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.location.toLowerCase().includes(q)
      ) {
        items.push({
          type: "customer",
          id: item.id,
          title: item.name,
          subtitle: `${item.phone} • ${item.location}`,
          badge: "Customer",
          url: `/customers`,
          details: `Master Client Account`,
        });
      }
    });

    // Search Engineers
    engineers.forEach((item) => {
      if (
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.specialty.toLowerCase().includes(q)
      ) {
        items.push({
          type: "engineer",
          id: item.id,
          title: `${item.id} - ${item.name}`,
          subtitle: `${item.specialty} • ${item.phone}`,
          badge: item.status || "Available",
          url: `/engineers`,
          details: item.currentProjectName ? `Assigned to: ${item.currentProjectName}` : "Ready for Field Assignment",
        });
      }
    });

    // Search Labours
    labours.forEach((item) => {
      if (
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.skills && item.skills.some((s) => s.toLowerCase().includes(q)))
      ) {
        items.push({
          type: "labour",
          id: item.id,
          title: `${item.id} - ${item.name}`,
          subtitle: `${item.type} Labour • ₹${item.defaultWeeklyWage || 14000}/week`,
          badge: item.status,
          url: `/labours`,
          details: `Skills: ${item.skills?.join(", ") || "General Servicing"}`,
        });
      }
    });

    // Search Machines & Tools
    machines.forEach((item) => {
      if (
        item.id.toLowerCase().includes(q) ||
        item.toolName.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      ) {
        items.push({
          type: "machine",
          id: item.id,
          title: `${item.id} - ${item.toolName}`,
          subtitle: `${item.brand} • ${item.category}`,
          badge: `${item.availableQuantity}/${item.currentStock} Avail`,
          url: `/machines`,
          details: `Condition: ${item.condition}`,
        });
      }
    });

    // Search Payments & References
    payments.forEach((item) => {
      if (
        item.id.toLowerCase().includes(q) ||
        item.projectId.toLowerCase().includes(q) ||
        (item.referenceNumber && item.referenceNumber.toLowerCase().includes(q)) ||
        (item.mode && item.mode.toLowerCase().includes(q))
      ) {
        items.push({
          type: "project",
          id: item.id,
          title: `${item.id} - Payment Ref: ${item.referenceNumber || item.mode}`,
          subtitle: `Project ${item.projectId} • Amount: ₹${item.amount.toLocaleString("en-IN")}`,
          badge: item.mode,
          url: `/payments`,
          details: `Payment Date: ${item.paymentDate}`,
        });
      }
    });

    return items;
  }, [query, enquiries, projects, customers, labours, engineers, machines, payments]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    navigate({ to: url });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b bg-white dark:bg-card">
          <DialogTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Global Search across Enterprise ERP (Ctrl + K)
          </DialogTitle>
          <div className="relative mt-2 flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Customer, Project, Engineer, Labour, Phone, Machine, Enquiry, Quotation..."
              className="pl-9 pr-4 py-2 border-0 bg-slate-100 dark:bg-slate-800 focus-visible:ring-1 focus-visible:ring-primary text-sm rounded-xl"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto p-2 bg-white dark:bg-card">
          {!query.trim() ? (
            <div className="py-10 text-center text-sm text-muted-foreground space-y-2">
              <Search className="h-8 w-8 mx-auto opacity-30 text-blue-600" />
              <p className="font-semibold text-foreground">Type to search everything in the ERP</p>
              <p className="text-xs text-muted-foreground">Customers, Projects, Engineers, Labours, Phone #, Machines & Quotations</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching records found for "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((res) => (
                <div
                  key={`${res.type}-${res.id}`}
                  onClick={() => handleSelect(res.url)}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-xl cursor-pointer transition-colors group border border-transparent hover:border-border/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 group-hover:text-blue-600 transition-colors">
                      {res.type === "enquiry" && <FileText className="h-4 w-4" />}
                      {res.type === "project" && <FolderKanban className="h-4 w-4" />}
                      {res.type === "customer" && <Users className="h-4 w-4" />}
                      {res.type === "engineer" && <UserCheck className="h-4 w-4" />}
                      {res.type === "labour" && <Wrench className="h-4 w-4" />}
                      {res.type === "machine" && <Boxes className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate text-foreground">
                          {res.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5"
                        >
                          {res.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{res.subtitle}</p>
                      <p className="text-[11px] text-muted-foreground/80 font-medium">{res.details}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 px-4 border-t text-[11px] text-muted-foreground flex justify-between items-center font-medium">
          <span>Found {results.length} record(s)</span>
          <span>Press ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
