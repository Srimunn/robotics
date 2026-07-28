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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useProjects } from "@/lib/projects-context";
import type { OngoingWork } from "@/lib/project-types";
import { OngoingModal } from "./ongoing-modal";
import { DeleteConfirm } from "./delete-confirm";
import { ExportButtons } from "./export-buttons";

export function OngoingTable() {
  const { ongoing, addOngoing, updateOngoing, deleteOngoing } = useProjects();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OngoingWork | null>(null);
  const [viewing, setViewing] = useState<OngoingWork | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return ongoing;
    return ongoing.filter(
      (p) =>
        p.clientName.toLowerCase().includes(s) ||
        p.contactNumber.toLowerCase().includes(s) ||
        p.location.toLowerCase().includes(s) ||
        p.natureOfWork.toLowerCase().includes(s),
    );
  }, [ongoing, search]);

  const exportRows = filtered.map((p) => ({
    Date: p.date,
    Client: p.clientName,
    Contact: p.contactNumber,
    Location: p.location,
    Nature: p.natureOfWork,
    Labour: p.labourCount,
    Type: p.labourType,
    Remarks: p.remarks,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">Ongoing Works</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} active sites</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ExportButtons rows={exportRows} filename="Ongoing Works" />
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + Add Work
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search ongoing works..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="max-h-[640px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Nature of Work</TableHead>
                <TableHead>Labour</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    No ongoing works
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className="odd:bg-background even:bg-muted/30 hover:bg-accent/40"
                >
                  <TableCell>{p.date}</TableCell>
                  <TableCell className="font-medium">{p.clientName}</TableCell>
                  <TableCell>{p.contactNumber}</TableCell>
                  <TableCell>{p.location}</TableCell>
                  <TableCell>{p.natureOfWork}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" /> {p.labourCount}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.labourType}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{p.remarks}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setViewing(p)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => {
                          setEditing(p);
                          setModalOpen(true);
                        }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <OngoingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editing}
        onSubmit={(data) => {
          if (editing) {
            updateOngoing(editing.id, data);
            toast.success("✅ Work Updated Successfully");
          } else {
            addOngoing(data);
            toast.success("✅ Work Added Successfully");
          }
          setModalOpen(false);
        }}
      />
      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Delete this work entry?"
        onConfirm={() => {
          if (deleteId) {
            deleteOngoing(deleteId);
            toast.success("🗑 Work Deleted Successfully");
            setDeleteId(null);
          }
        }}
      />
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.clientName}</DialogTitle>
            <DialogDescription>{viewing?.natureOfWork}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-2 text-sm">
              <div><strong>Date:</strong> {viewing.date}</div>
              <div><strong>Contact:</strong> {viewing.contactNumber}</div>
              <div><strong>Location:</strong> {viewing.location}</div>
              <div><strong>Labour:</strong> {viewing.labourCount} {viewing.labourType}</div>
              <div><strong>Remarks:</strong> {viewing.remarks || "—"}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}