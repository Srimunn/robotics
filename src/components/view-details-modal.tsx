import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Project } from "@/lib/project-types";
import { formatCurrency, getBalance, getStatus } from "@/lib/project-types";
import { StatusBadge } from "./status-badge";
import { Calendar, MapPin, Phone, User, Briefcase, IndianRupee } from "lucide-react";

export function ViewDetailsModal({
  project,
  onOpenChange,
}: {
  project: Project | null;
  onOpenChange: (v: boolean) => void;
}) {
  if (!project) return null;
  const balance = getBalance(project);
  const status = getStatus(project);

  const Row = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-start gap-3 rounded-lg border bg-card/50 p-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-medium">{value}</div>
      </div>
    </div>
  );

  return (
    <Dialog open={!!project} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-xl">{project.clientName}</DialogTitle>
            <StatusBadge status={status} />
          </div>
          <DialogDescription>{project.natureOfWork}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Row icon={User} label="Client" value={project.clientName} />
          <Row icon={Phone} label="Contact" value={project.contactNumber} />
          <Row icon={MapPin} label="Location" value={project.location} />
          <Row icon={Briefcase} label="Nature of Work" value={project.natureOfWork} />
          <Row icon={Calendar} label="Project Date" value={project.date} />
          <Row
            icon={Calendar}
            label="Created"
            value={new Date(project.createdAt).toLocaleDateString()}
          />
        </div>

        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IndianRupee className="h-3.5 w-3.5" /> Project Value
            </div>
            <div className="mt-1 text-lg font-bold">{formatCurrency(project.projectValue)}</div>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-4">
            <div className="text-xs text-emerald-700 dark:text-emerald-400">Received</div>
            <div className="mt-1 text-lg font-bold">{formatCurrency(project.paymentReceived)}</div>
          </div>
          <div className="rounded-xl bg-orange-500/10 p-4">
            <div className="text-xs text-orange-700 dark:text-orange-400">Balance</div>
            <div className="mt-1 text-lg font-bold">{formatCurrency(balance)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
