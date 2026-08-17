import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRobotics } from "@/lib/robotics-context";
import type { Engineer } from "@/lib/robotics-types";
import {
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Briefcase,
  Phone,
  Pencil,
  Trash2,
  FolderKanban,
  ShieldAlert,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DeleteConfirm } from "@/components/delete-confirm";
import { toast } from "sonner";

export const Route = createFileRoute("/engineers")({
  component: EngineersPageComponent,
});

function EngineersPageComponent() {
  const { engineers, enquiries, projects, addEngineer, updateEngineer, deleteEngineer, currentUser } = useRobotics();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEng, setEditingEng] = useState<Engineer | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSpecialty, setFormSpecialty] = useState("Robotic Welding & Hydraulics Specialist");

  // Availability Conflict Inspector
  const [inspectEng, setInspectEng] = useState<Engineer | null>(null);

  // Calculate real-time availability for engineers based on active projects and site visits
  const engineerRoster = useMemo(() => {
    return engineers.map((eng) => {
      // Find active project assigned to this engineer
      const activeProj = projects.find(
        (p) =>
          p.assignedEngineerName === eng.name &&
          (p.status === "Ongoing" || p.status === "Scheduled" || p.status === "Waiting")
      );

      // Find pending site visit enquiry
      const activeEnquiry = enquiries.find(
        (e) =>
          e.assignedEngineerName === eng.name &&
          e.siteVisitStatus !== "Completed" &&
          e.customerDecision !== "Cancelled"
      );

      const isBusy = Boolean(activeProj || activeEnquiry);
      const currentProjName = activeProj
        ? `${activeProj.id} (${activeProj.customerName})`
        : activeEnquiry
        ? `Site Visit: ${activeEnquiry.id} (${activeEnquiry.customerName})`
        : undefined;

      const nextAvail = activeProj
        ? activeProj.workCommittedDate || "End of Current Assignment"
        : activeEnquiry
        ? activeEnquiry.siteVisitDate || "Tomorrow"
        : "Available Immediately";

      return {
        ...eng,
        status: isBusy ? ("Assigned" as const) : ("Available" as const),
        currentProjectId: activeProj?.id || activeEnquiry?.id,
        currentProjectName: currentProjName,
        nextAvailableDate: nextAvail,
        activeProject: activeProj,
        activeEnquiry,
      };
    });
  }, [engineers, projects, enquiries]);

  const totalEngineers = engineerRoster.length;
  const availableEngineers = engineerRoster.filter((e) => e.status === "Available").length;
  const busyEngineers = engineerRoster.filter((e) => e.status === "Assigned").length;
  const visitsCompletedToday = enquiries.filter((e) => e.siteVisitStatus === "Completed").length;

  const filteredEngineers = useMemo(() => {
    return engineerRoster.filter((eng) => {
      const matchesSearch =
        !searchQuery ||
        eng.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eng.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eng.phone.includes(searchQuery) ||
        eng.specialty.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || eng.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [engineerRoster, searchQuery, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingEng(null);
    setFormName("");
    setFormPhone("");
    setFormSpecialty("Robotic Welding & Hydraulics Specialist");
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (eng: Engineer) => {
    setEditingEng(eng);
    setFormName(eng.name);
    setFormPhone(eng.phone);
    setFormSpecialty(eng.specialty);
    setIsAddModalOpen(true);
  };

  const handleSaveEngineer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Engineer Name is required");
      return;
    }
    const cleanPhone = formPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Phone Number must be at least 10 digits");
      return;
    }
    if (cleanPhone.length > 10) {
      toast.error("Mobile Number cannot exceed 10 digits");
      return;
    }

    if (editingEng) {
      updateEngineer(editingEng.id, {
        name: formName.trim(),
        phone: formPhone.trim(),
        specialty: formSpecialty.trim(),
      });
      toast.success("Engineer Details Updated");
    } else {
      addEngineer({
        name: formName.trim(),
        phone: formPhone.trim(),
        specialty: formSpecialty.trim(),
      });
      toast.success("Engineer Registered Successfully");
    }
    setIsAddModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Engineers</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleOpenAddModal}
            className="text-xs font-semibold h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Engineer
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">{totalEngineers}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 grid place-items-center text-purple-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Available</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">{availableEngineers}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Busy</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-amber-600 dark:text-amber-400">{busyEngineers}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 grid place-items-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Visits Done</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-blue-600 dark:text-blue-400">{visitsCompletedToday}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center text-blue-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-lg"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-[170px] rounded-lg">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Busy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Engineers Table */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold text-muted-foreground w-28">ID</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground min-w-[200px]">NAME</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">SPECIALTY</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-center">STATUS</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">ASSIGNMENT</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">NEXT AVAILABLE</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right pr-4">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEngineers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <UserCheck className="h-8 w-8 text-purple-600/60 stroke-[1.5]" />
                      <p className="text-base font-semibold text-foreground">No engineers assigned.</p>
                      <p className="text-xs text-muted-foreground">Add engineer profiles to enable site visit assignments.</p>
                      <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="mt-2 bg-purple-600 hover:bg-purple-700 text-white gap-1 rounded-lg">
                        <Plus className="h-3.5 w-3.5" /> Add Engineer Profile
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEngineers.map((eng) => (
                  <TableRow key={eng.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                      {eng.id}
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        {eng.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400" /> {eng.phone}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                        {eng.specialty}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        className={`text-[10px] font-bold ${
                          eng.status === "Available"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {eng.status === "Available" ? "Available" : "Already Assigned"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {eng.currentProjectName ? (
                        <div className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 font-medium">
                          <FolderKanban className="h-3.5 w-3.5 text-purple-600" />
                          <span>{eng.currentProjectName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None (Free for dispatch)</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-foreground">
                      {eng.nextAvailableDate}
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {eng.status === "Assigned" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setInspectEng(eng)}
                            className="h-7 text-[11px] font-semibold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 gap-1"
                          >
                            <ShieldAlert className="h-3 w-3" /> View Conflict
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenEditModal(eng)}
                          title="Edit Engineer"
                          className="h-7 w-7 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Remove engineer ${eng.name}?`)) {
                              deleteEngineer(eng.id);
                            }
                          }}
                          title="Delete Engineer"
                          className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ADD / EDIT ENGINEER MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-full sm:max-w-md w-full max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              {editingEng ? `Edit Engineer (${editingEng.id})` : "Add New Field Engineer"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register lead service engineers for site visits, project execution, and assignment conflict prevention.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEngineer} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Engineer Full Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="h-9 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mobile Phone Number *</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                required
                className={`h-9 text-xs rounded-lg ${
                  formPhone.replace(/\D/g, "").length > 10 ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
              {formPhone.replace(/\D/g, "").length > 10 && (
                <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 inline text-red-500 shrink-0" /> Mobile number cannot exceed 10 digits ({formPhone.replace(/\D/g, "").length}/10 digits)
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Technical Specialty / Focus</Label>
              <Input
                value={formSpecialty}
                onChange={(e) => setFormSpecialty(e.target.value)}
                className="h-9 text-xs rounded-lg"
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
              <Button
                type="submit"
                className="h-9 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs w-full sm:w-auto"
              >
                {editingEng ? "Update Engineer" : "Save Engineer"}
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

      {/* INSPECT ASSIGNMENT CONFLICT MODAL */}
      <Dialog open={!!inspectEng} onOpenChange={(open) => !open && setInspectEng(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-700">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Engineer Assignment Warning
            </DialogTitle>
            <DialogDescription className="text-xs">
              Conflict prevention rule: Engineer is currently locked on an active field project.
            </DialogDescription>
          </DialogHeader>

          {inspectEng && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <div className="font-bold text-amber-950">{inspectEng.name} ({inspectEng.id})</div>
                <div className="text-amber-800 text-[11px] font-medium">{inspectEng.specialty}</div>
              </div>

              <div className="space-y-2 border rounded-xl p-3 bg-slate-50 dark:bg-slate-900/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="bg-amber-600 text-white text-[10px]">Already Assigned</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Assignment:</span>
                  <span className="font-bold text-purple-700">{inspectEng.currentProjectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Available Date:</span>
                  <span className="font-bold text-emerald-600">{inspectEng.nextAvailableDate}</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground italic">
                Notice: Double assignment is restricted by ERP workflow policy to prevent scheduling conflicts on site. Admin override is enabled during urgent dispatch.
              </p>

              <DialogFooter>
                <Button
                  onClick={() => setInspectEng(null)}
                  className="h-9 text-xs bg-slate-900 text-white hover:bg-slate-800 rounded-xl w-full"
                >
                  Understood & Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirm
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteEngineer(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title="Delete Engineer Profile?"
        description="Are you sure you want to delete this engineer profile? This action cannot be undone."
      />
    </div>
  );
}
