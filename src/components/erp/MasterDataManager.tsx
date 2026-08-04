import React, { useState } from "react";
import { useRobotics } from "@/lib/robotics-context";
import type { MasterDataCategory, MasterDataItem } from "@/lib/robotics-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Database,
  Plus,
  Pencil,
  Trash2,
  Power,
  Search,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: MasterDataCategory[] = [
  "Lead Source",
  "Referred By Options",
  "Leakage Type",
  "Nature Of Work",
  "Engineer Names",
  "Labour Types",
  "Cancellation Reasons",
  "Payment Modes",
  "Payment Stage",
  "Customer Status",
  "Project Status",
  "Site Visit Status",
  "Work Descriptions",
  "Remarks Templates",
  "Machine Category",
  "Machine Brand",
  "Machine Attachment",
  "Material Category",
  "Material Unit",
  "Machine Unit",
  "Locations",
  "Customer Category",
  "Engineer Specialization",
  "Quotation Remarks",
  "Project Remarks",
];

export function MasterDataManager() {
  const {
    masterData,
    addMasterDataItem,
    updateMasterDataItem,
    deleteMasterDataItem,
    toggleMasterDataItemActive,
  } = useRobotics();

  const [selectedCategory, setSelectedCategory] = useState<MasterDataCategory>("Lead Source");
  const [searchQuery, setSearchQuery] = useState("");
  const [newValueInput, setNewValueInput] = useState("");

  // Edit dialog state
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [editValueInput, setEditValueInput] = useState("");

  const filteredItems = masterData.filter((item) => {
    const categoryMatch = item.category === selectedCategory;
    const searchMatch = !searchQuery || item.value.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValueInput.trim()) return;

    addMasterDataItem(selectedCategory, newValueInput.trim());
    setNewValueInput("");
  };

  const handleOpenEdit = (item: MasterDataItem) => {
    setEditingItem(item);
    setEditValueInput(item.value);
  };

  const handleSaveEdit = () => {
    if (!editingItem || !editValueInput.trim()) return;
    updateMasterDataItem(editingItem.id, editValueInput.trim());
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card p-5 rounded-xl border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">Smart Master Data Manager</h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 border-blue-200">
              Admin Governance
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage auto-learning combo box values across all 12 system domains. Select, edit, deactivate, or clean master values.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Categories */}
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card lg:col-span-1">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" /> Master Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {CATEGORIES.map((cat) => {
              const count = masterData.filter((i) => i.category === cat && i.isActive).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground"
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0.2 ${
                      isSelected
                        ? "bg-blue-700 text-white border-blue-500"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Content: Selected Category Table & Management */}
        <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card lg:col-span-3">
          <CardHeader className="p-4 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  {selectedCategory}
                  <Badge variant="outline" className="text-xs font-normal">
                    {filteredItems.length} Entries
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Values defined here will auto-populate smart combo dropdowns.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search values..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-44 pl-8 text-xs rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2 border-t border-dashed">
              <Input
                placeholder={`Add new value to ${selectedCategory}...`}
                value={newValueInput}
                onChange={(e) => setNewValueInput(e.target.value)}
                className="h-9 text-xs rounded-lg flex-1"
              />
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-9 rounded-lg px-4">
                <Plus className="h-4 w-4" /> Add Value
              </Button>
            </form>
          </CardHeader>

          <CardContent className="p-0">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <Sparkles className="h-8 w-8 mx-auto text-slate-400" />
                <p className="text-xs font-medium">No master values found for "{selectedCategory}".</p>
                <p className="text-[11px]">Type above to add the first master value!</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Value Name</TableHead>
                    <TableHead className="text-xs font-semibold w-28">Status</TableHead>
                    <TableHead className="text-xs font-semibold w-36">Created At</TableHead>
                    <TableHead className="text-xs font-semibold text-right w-36">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-xs">
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{item.value}</span>
                          {item.isDefault && (
                            <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600">
                              Default System
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40"
                          }
                        >
                          {item.isActive ? "Active" : "Deactivated"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            title="Rename / Edit Value"
                            className="h-7 w-7 text-slate-600 hover:text-blue-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleMasterDataItemActive(item.id)}
                            title={item.isActive ? "Deactivate" : "Activate"}
                            className={`h-7 w-7 ${item.isActive ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"}`}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                          {!item.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMasterDataItem(item.id)}
                              title="Delete Value"
                              className="h-7 w-7 text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Value Dialog */}
      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-blue-600" /> Edit Master Value
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Category</label>
              <Input value={editingItem?.category} disabled className="h-9 rounded-lg bg-muted text-xs font-medium" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Master Value</label>
              <Input
                value={editValueInput}
                onChange={(e) => setEditValueInput(e.target.value)}
                placeholder="Enter value..."
                className="h-9 rounded-lg text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingItem(null)} className="rounded-lg text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
