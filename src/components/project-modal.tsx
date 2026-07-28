import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/project-types";
import { formatCurrency } from "@/lib/project-types";

type Form = Omit<Project, "id" | "createdAt">;

const empty: Form = {
  date: new Date().toISOString().slice(0, 10),
  clientName: "",
  contactNumber: "",
  location: "",
  natureOfWork: "",
  projectValue: 0,
  paymentReceived: 0,
};

export function ProjectModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Project | null;
  onSubmit: (data: Form) => void;
}) {
  const [form, setForm] = useState<Form>(empty);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              date: initial.date,
              clientName: initial.clientName,
              contactNumber: initial.contactNumber,
              location: initial.location,
              natureOfWork: initial.natureOfWork,
              projectValue: initial.projectValue,
              paymentReceived: initial.paymentReceived,
            }
          : empty,
      );
    }
  }, [open, initial]);

  const balance = Math.max(0, (form.projectValue || 0) - (form.paymentReceived || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Project" : "Add New Project"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update project details." : "Fill in the project information."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="grid gap-2">
            <Label>Date</Label>
            <Input type="date" required value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Client Name</Label>
            <Input required value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Contact Number</Label>
            <Input required value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Location</Label>
            <Input required value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Nature of Work</Label>
            <Input required value={form.natureOfWork}
              onChange={(e) => setForm({ ...form, natureOfWork: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Project Value</Label>
            <Input type="number" min={0} required value={form.projectValue}
              onChange={(e) => setForm({ ...form, projectValue: Number(e.target.value) })} />
          </div>
          <div className="grid gap-2">
            <Label>Payment Received</Label>
            <Input type="number" min={0} required value={form.paymentReceived}
              onChange={(e) => setForm({ ...form, paymentReceived: Number(e.target.value) })} />
          </div>
          <div className="rounded-lg bg-muted/60 p-3 sm:col-span-2">
            <div className="text-sm text-muted-foreground">Balance Amount (auto)</div>
            <div className="text-xl font-bold">{formatCurrency(balance)}</div>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{initial ? "Save Changes" : "Add Project"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}