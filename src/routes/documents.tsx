import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useRobotics } from "@/lib/robotics-context";
import type { ProjectDocument, DocumentCategory } from "@/lib/robotics-types";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Trash2,
  FolderKanban,
  Download,
  FileCheck,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  Filter,
  CheckCircle2,
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
import { DeleteConfirm } from "@/components/delete-confirm";
import { toast } from "sonner";

export const Route = createFileRoute("/documents")({
  component: DocumentsPageComponent,
});

function DocumentsPageComponent() {
  const { projects, documents, addDocument, deleteDocument } = useRobotics();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form State
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || "");
  const [formCategory, setFormCategory] = useState<DocumentCategory>("Quotation PDF");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const categories: DocumentCategory[] = [
    "Quotation PDF",
    "Invoice PDF",
    "Site Visit Photos",
    "Before Work Photos",
    "After Work Photos",
    "Completion Photos",
    "Other Artifacts",
  ];

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        !searchQuery ||
        doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.projectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.customerName && doc.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === "all" || doc.category === categoryFilter;
      const matchesProj = projectFilter === "all" || doc.projectId === projectFilter;

      return matchesSearch && matchesCat && matchesProj;
    });
  }, [documents, searchQuery, categoryFilter, projectFilter]);

  const totalDocs = documents.length;
  const quotationDocsCount = documents.filter((d) => d.category === "Quotation PDF").length;
  const invoiceDocsCount = documents.filter((d) => d.category === "Invoice PDF").length;
  const photoDocsCount = documents.filter((d) => d.category.includes("Photos")).length;

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Document Title is required");
      return;
    }

    const proj = projects.find((p) => p.id === formProjectId);

    addDocument({
      projectId: formProjectId,
      projectName: proj ? `${proj.id} (${proj.customerName})` : formProjectId,
      customerName: proj?.customerName || "Customer",
      category: formCategory,
      title: formTitle.trim(),
      fileUrl: formUrl.trim() || `https://robotics-erp-cdn.com/artifacts/${formCategory.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.pdf`,
      uploadedBy: "Er. Rajesh Kumar",
      notes: formNotes,
      fileSize: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
    });

    setIsUploadOpen(false);
    setFormTitle("");
    setFormUrl("");
    setFormNotes("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Project Document Management Hub</h1>
              <p className="text-xs text-muted-foreground">
                Centralized artifact repository: Quotation PDFs, Invoices, Site Inspection Photos & Completion Documents with in-app preview.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="text-xs font-semibold h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Upload Document Artifact
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Documents</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">{totalDocs}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Stored under projects</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Quotation PDFs</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-blue-600 dark:text-blue-400">{quotationDocsCount}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Enquiry quotations</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center text-blue-600">
              <FileCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Invoice PDFs</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">{invoiceDocsCount}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tax invoices & billing</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center text-emerald-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Site & Work Photos</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-purple-600 dark:text-purple-400">{photoDocsCount}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Before/After completion evidence</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 grid place-items-center text-purple-600">
              <ImageIcon className="h-5 w-5" />
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
              placeholder="Search Document Title, ID, Project, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-lg"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-xs w-[180px] rounded-lg">
                <SelectValue placeholder="Category: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-9 text-xs w-[180px] rounded-lg">
                <SelectValue placeholder="Project: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.id} - {p.customerName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Document Master Table */}
      <Card className="rounded-xl border border-border/80 bg-white dark:bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold text-muted-foreground w-28">Doc ID</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground min-w-[220px]">Document Title & Notes</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Category</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Project Reference</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">Uploaded Date & User</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-purple-50 text-purple-600">
                        <FileText className="h-6 w-6 stroke-[1.5]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">No project documents uploaded.</p>
                        <p className="text-xs text-muted-foreground">Upload quotations, invoices, site visit inspection photos or engineering drawings.</p>
                      </div>
                      <Button size="sm" onClick={() => setIsUploadOpen(true)} className="mt-2 bg-purple-600 hover:bg-purple-700 text-white gap-1.5 rounded-lg shadow-xs">
                        <Plus className="h-4 w-4" /> Upload Document
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                      {doc.id}
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        {doc.category.includes("Photos") ? (
                          <ImageIcon className="h-3.5 w-3.5 text-purple-600" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-blue-600" />
                        )}
                        <span>{doc.title}</span>
                      </div>
                      {doc.notes && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">{doc.notes}</div>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          doc.category === "Quotation PDF"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : doc.category === "Invoice PDF"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {doc.category}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="font-bold text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <FolderKanban className="h-3.5 w-3.5 text-purple-600" />
                        <span>{doc.projectId}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{doc.customerName}</div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      <div>{doc.uploadedAt}</div>
                      <div className="text-[10px] text-slate-500">By: {doc.uploadedBy}</div>
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() => setPreviewDoc(doc)}
                          className="h-7 px-2.5 text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg gap-1 shadow-xs"
                        >
                          <Eye className="h-3 w-3" />
                          Preview Without Download
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTargetId(doc.id)}
                          title="Delete Document"
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

      {/* UPLOAD DOCUMENT MODAL */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-600" />
              Upload Project Artifact / Document
            </DialogTitle>
            <DialogDescription className="text-xs">
              Attach files, PDF quotations, invoices, or site completion evidence to a project.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Project *</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id} - {p.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Document Category *</Label>
              <Select value={formCategory} onValueChange={(val: DocumentCategory) => setFormCategory(val)}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Document Title *</Label>
              <Input
                placeholder="e.g. Final Site Inspection Photo & Signoff"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="h-9 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">File URL / Attachment Reference</Label>
              <Input
                placeholder="e.g. https://cdn.robotics.com/docs/quotation_982.pdf"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="h-9 text-xs rounded-lg font-mono text-[11px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes / Context</Label>
              <Textarea
                placeholder="Any special remarks or supervisor signature notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                className="text-xs rounded-lg resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs"
              >
                Upload & Save Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PREVIEW WITHOUT DOWNLOAD MODAL */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              In-App Document Preview (Without Download)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Secure enterprise document viewer linked to Project {previewDoc?.projectId}.
            </DialogDescription>
          </DialogHeader>

          {previewDoc && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-purple-950 dark:text-purple-200">{previewDoc.title}</div>
                  <div className="text-[11px] text-purple-700 dark:text-purple-400">
                    Category: {previewDoc.category} • Project: {previewDoc.projectId} ({previewDoc.customerName})
                  </div>
                </div>
                <Badge className="bg-purple-600 text-white text-[10px]">{previewDoc.fileSize || "1.8 MB"}</Badge>
              </div>

              {/* Simulated Document Preview Canvas */}
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 bg-slate-50 dark:bg-slate-900/60 min-h-[320px] flex flex-col items-center justify-center text-center space-y-3">
                <FileText className="h-16 w-16 text-purple-600 opacity-80 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground text-sm">{previewDoc.title}</h4>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Official enterprise document preview mode. All watermarks & signature metadata intact.
                  </p>
                </div>

                <div className="bg-white dark:bg-card p-4 rounded-xl border text-left w-full max-w-lg text-xs space-y-2 font-mono">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Document ID:</span>
                    <span className="font-bold">{previewDoc.id}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Project Reference:</span>
                    <span className="font-bold text-purple-600">{previewDoc.projectId}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Uploaded By:</span>
                    <span>{previewDoc.uploadedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span>{previewDoc.uploadedAt}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => toast.success(`Downloading ${previewDoc.title}...`)}
                  className="h-9 text-xs rounded-xl gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" /> Download File Copy
                </Button>

                <Button
                  onClick={() => setPreviewDoc(null)}
                  className="h-9 text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 rounded-xl"
                >
                  Close Preview
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
            deleteDocument(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title="Delete Document Artifact?"
        description="Are you sure you want to delete this document artifact? This action cannot be undone."
      />
    </div>
  );
}
