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
import { Textarea } from "@/components/ui/textarea";
import type { OngoingWork } from "@/lib/project-types";

type Form = Omit<OngoingWork, "id" | "createdAt">;

const empty: Form = {
  date: new Date().toISOString().slice(0, 10),
  clientName: "",
  contactNumber: "",
  location: "",
  natureOfWork: "",
  labourCount: 0,
  labourType: "",
  remarks: "",
};

export function OngoingModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: OngoingWork | null;
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
              labourCount: initial.labourCount,
              labourType: initial.labourType,
              remarks: initial.remarks,
            }
          : empty,
      );
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Ongoing Work" : "Add Ongoing Work"}</DialogTitle>
          <DialogDescription>Track active site activity.</DialogDescription>
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
            <Input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Client Name</Label>
            <Input
              required
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Contact Number</Label>
            <Input
              required
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Location</Label>
            <Input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Nature of Work</Label>
            <Input
              required
              value={form.natureOfWork}
              onChange={(e) => setForm({ ...form, natureOfWork: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Labour Count</Label>
            <Input
              type="number"
              min={0}
              required
              value={form.labourCount}
              onChange={(e) => setForm({ ...form, labourCount: Number(e.target.value) })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Labour Type</Label>
            <Input
              required
              value={form.labourType}
              onChange={(e) => setForm({ ...form, labourType: e.target.value })}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{initial ? "Save Changes" : "Add Work"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
