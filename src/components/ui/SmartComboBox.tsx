import React, { useState } from "react";
import { Check, ChevronsUpDown, Plus, Settings, Sparkles, Pencil, Trash2, Power, Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useRobotics } from "@/lib/robotics-context";
import type { MasterDataCategory, MasterDataItem } from "@/lib/robotics-types";
import { toast } from "sonner";

interface SmartComboBoxProps {
  category: MasterDataCategory;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  siteVisitDate?: string;
  excludeEnquiryId?: string;
}

export function SmartComboBox({
  category,
  value,
  onChange,
  placeholder = "Select...",
  className,
  disabled = false,
  siteVisitDate,
  excludeEnquiryId,
}: SmartComboBoxProps) {
  const {
    engineers,
    checkEngineerAvailability,
    getMasterDataByCategory,
    addMasterDataItem,
    updateMasterDataItem,
    deleteMasterDataItem,
    toggleMasterDataItemActive,
  } = useRobotics();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false);
  const [quickAddInput, setQuickAddInput] = useState("");

  // Manage modal internal state
  const [modalSearch, setModalSearch] = useState("");
  const [newMasterInput, setNewMasterInput] = useState("");
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [editingValueInput, setEditingValueInput] = useState("");

  const allMasterItems = getMasterDataByCategory(category);
  const activeMasterItems = allMasterItems.filter((item) => item.isActive);
  const options = activeMasterItems.map((item) => item.value);

  // Case-insensitive exact match check for duplicate prevention
  const exactMatchExists = options.some(
    (opt) => opt.toLowerCase().trim() === inputValue.toLowerCase().trim()
  );

  // METHOD 1: Select Existing
  const handleSelectExisting = (val: string) => {
    onChange(val);
    setOpen(false);
    setInputValue("");
  };

  // METHOD 2: Direct Add to Master & Select
  const handleDirectAddAndSelectMaster = (valToSave?: string) => {
    const targetVal = (valToSave !== undefined ? valToSave : inputValue).trim();
    if (!targetVal) return;

    const existing = allMasterItems.find(
      (m) => m.value.toLowerCase().trim() === targetVal.toLowerCase().trim()
    );

    if (existing) {
      if (!existing.isActive) {
        toggleMasterDataItemActive(existing.id);
      }
      onChange(existing.value);
      toast.info(`Selected existing ${category}: "${existing.value}"`);
    } else {
      addMasterDataItem(category, targetVal);
      onChange(targetVal);
      toast.success(`Added "${targetVal}" to ${category} list & selected!`);
    }

    setOpen(false);
    setInputValue("");
  };

  // METHOD 3: One-Time Custom Entry (Does NOT save to master list)
  const handleOneTimeCustomEntry = (customVal?: string) => {
    const targetVal = (customVal !== undefined ? customVal : inputValue).trim();
    if (!targetVal) return;

    onChange(targetVal);
    setOpen(false);
    setInputValue("");
    toast.success(`Applied one-time value: "${targetVal}"`);
  };

  // Quick Add Modal Handler
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickAddInput.trim();
    if (!trimmed) return;

    handleDirectAddAndSelectMaster(trimmed);
    setQuickAddInput("");
    setQuickAddDialogOpen(false);
  };

  // Manage Modal Handlers
  const handleAddMasterInModal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMasterInput.trim();
    if (!trimmed) return;

    const isDuplicate = allMasterItems.some(
      (m) => m.value.toLowerCase().trim() === trimmed.toLowerCase().trim()
    );
    if (isDuplicate) {
      toast.error(`"${trimmed}" already exists in Master List`);
      return;
    }

    addMasterDataItem(category, trimmed);
    setNewMasterInput("");
    toast.success(`Added "${trimmed}" to ${category} master list`);
  };

  const handleSaveEditInModal = () => {
    if (!editingItem || !editingValueInput.trim()) return;
    updateMasterDataItem(editingItem.id, editingValueInput.trim());
    toast.success(`Updated master value to "${editingValueInput.trim()}"`);
    setEditingItem(null);
  };

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(inputValue.toLowerCase().trim())
  );

  return (
    <div className="flex items-center gap-1 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal text-left h-9 px-3 text-xs rounded-lg border-input bg-background hover:bg-slate-50 transition-colors",
              !value && "text-muted-foreground",
              className
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[340px] p-0 shadow-lg rounded-xl border border-border" align="start">
          <Command className="rounded-xl" shouldFilter={false}>
            {/* Popover Header with Quick Add & Settings */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {category} Options
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    setQuickAddInput(inputValue);
                    setQuickAddDialogOpen(true);
                  }}
                  title={`Add new ${category}`}
                  className="h-6 px-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New</span>
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    setManageModalOpen(true);
                  }}
                  title={`Manage Master List for ${category}`}
                  className="h-6 w-6 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <CommandInput
              placeholder={`Search or type custom ${category.toLowerCase()}...`}
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputValue.trim().length > 0 && !exactMatchExists) {
                  e.preventDefault();
                  handleDirectAddAndSelectMaster(inputValue);
                }
              }}
              className="h-9 text-xs"
            />

            <CommandList className="max-h-[260px] overflow-y-auto p-1">
              {/* ACTION: Direct Add Typed Option if NOT in list */}
              {inputValue.trim().length > 0 && !exactMatchExists && (
                <div className="p-1 border-b border-border mb-1 space-y-1 bg-blue-50/80 dark:bg-blue-950/40 rounded-lg">
                  <Button
                    type="button"
                    onClick={() => handleDirectAddAndSelectMaster(inputValue)}
                    className="w-full justify-start text-xs bg-blue-600 text-white hover:bg-blue-700 font-semibold gap-1.5 h-8 rounded-md shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5 text-white" />
                    <span className="truncate">+ Add "<strong>{inputValue}</strong>" to Master List</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleOneTimeCustomEntry(inputValue)}
                    className="w-full justify-start text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 font-medium gap-1.5 h-7 rounded-md"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="truncate">Use One-Time: "<strong>{inputValue}</strong>"</span>
                  </Button>
                </div>
              )}

              {filteredOptions.length === 0 && !inputValue && (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No predefined items. Type above to add a new option or select one-time.
                </div>
              )}

              {filteredOptions.length === 0 && inputValue && exactMatchExists && (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No matching items found.
                </div>
              )}

              {/* METHOD 1: SELECT EXISTING OPTIONS */}
              {filteredOptions.length > 0 && (
                <CommandGroup heading="Existing Options">
                  {filteredOptions.map((opt) => {
                    let isBooked = false;
                    let bookedReason = "";

                    if (category === "Engineer Names") {
                      const eng = engineers.find((x) => x.name === opt || x.id === opt);
                      if (eng) {
                        const avail = checkEngineerAvailability(eng.id, eng.name, siteVisitDate, excludeEnquiryId);
                        if (!avail.isAvailable) {
                          isBooked = true;
                          bookedReason = avail.currentProject ? `Assigned to ${avail.currentProject.id}` : "Booked for Site Visit";
                        }
                      }
                    }

                    return (
                      <CommandItem
                        key={opt}
                        value={opt}
                        disabled={isBooked}
                        onSelect={() => {
                          if (isBooked) {
                            toast.error(`Cannot select ${opt}: Engineer is booked (${bookedReason})`);
                            return;
                          }
                          handleSelectExisting(opt);
                        }}
                        className={cn(
                          "text-xs flex items-center justify-between py-1.5 px-2 rounded-md transition-colors",
                          isBooked
                            ? "opacity-50 cursor-not-allowed bg-rose-50/50 dark:bg-rose-950/20 text-muted-foreground"
                            : "cursor-pointer hover:bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={cn("truncate font-medium", isBooked && "line-through text-slate-400")}>{opt}</span>
                          {category === "Engineer Names" && (
                            isBooked ? (
                              <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-700 border-rose-200 font-bold shrink-0">
                                Booked ({bookedReason})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold shrink-0">
                                Available
                              </Badge>
                            )
                          )}
                        </div>
                        {value === opt && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-1" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* QUICK INLINE + ADD BUTTON */}
      <Button
        size="icon"
        variant="ghost"
        disabled={disabled}
        onClick={() => {
          setQuickAddInput("");
          setQuickAddDialogOpen(true);
        }}
        title={`Add new option to ${category}`}
        className="h-9 w-9 rounded-lg border border-input bg-background hover:bg-blue-50 text-blue-600 hover:text-blue-700 shrink-0"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* QUICK INLINE SETTINGS GEAR BUTTON */}
      <Button
        size="icon"
        variant="ghost"
        disabled={disabled}
        onClick={() => setManageModalOpen(true)}
        title={`Manage ${category} Master List`}
        className="h-9 w-9 rounded-lg border border-input bg-background hover:bg-slate-100 text-muted-foreground hover:text-foreground shrink-0"
      >
        <Settings className="h-3.5 w-3.5" />
      </Button>

      {/* QUICK ADD NEW MASTER ITEM MODAL */}
      <Dialog open={quickAddDialogOpen} onOpenChange={setQuickAddDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Plus className="h-5 w-5 text-blue-600" /> Add New {category}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Type the new {category.toLowerCase()} option below. It will be added to the master list and selected automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickAddSubmit} className="space-y-4 text-xs">
            <Input
              placeholder={`Enter new ${category.toLowerCase()} name...`}
              value={quickAddInput}
              onChange={(e) => setQuickAddInput(e.target.value)}
              autoFocus
              className="h-9 text-xs rounded-lg"
            />

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1 font-semibold">
                <Plus className="h-4 w-4" /> Add & Select
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* INLINE MANAGE MASTER LIST MODAL */}
      <Dialog open={manageModalOpen} onOpenChange={setManageModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between text-foreground">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <span>Manage Master List: {category}</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                {allMasterItems.length} Total Items
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add, edit, rename, deactivate or clean master values for {category}. Historical project data is automatically preserved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Add New Form */}
            <form onSubmit={handleAddMasterInModal} className="flex gap-2">
              <Input
                placeholder={`Add new ${category.toLowerCase()} option...`}
                value={newMasterInput}
                onChange={(e) => setNewMasterInput(e.target.value)}
                className="h-9 text-xs rounded-lg flex-1"
              />
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </form>

            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search master items..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg"
              />
            </div>

            {/* Master Items List Table */}
            <div className="max-h-[260px] overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b font-medium text-muted-foreground sticky top-0">
                  <tr>
                    <th className="p-2.5 pl-3">Master Value</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allMasterItems
                    .filter((item) => !modalSearch || item.value.toLowerCase().includes(modalSearch.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30">
                        <td className="p-2.5 pl-3 font-semibold text-foreground">
                          {editingItem?.id === item.id ? (
                            <Input
                              value={editingValueInput}
                              onChange={(e) => setEditingValueInput(e.target.value)}
                              className="h-7 text-xs rounded-md"
                            />
                          ) : (
                            <span>{item.value}</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <Badge variant="outline" className={`text-[10px] ${item.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                            {item.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right pr-3">
                          <div className="flex items-center justify-end gap-1">
                            {editingItem?.id === item.id ? (
                              <Button size="sm" onClick={handleSaveEditInModal} className="h-6 text-[10px] bg-emerald-600 text-white rounded-md">
                                Save
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingItem(item);
                                  setEditingValueInput(item.value);
                                }}
                                className="h-6 w-6 text-blue-600 rounded-md"
                                title="Edit / Rename"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleMasterDataItemActive(item.id)}
                              className="h-6 w-6 text-amber-600 rounded-md"
                              title={item.isActive ? "Disable" : "Enable"}
                            >
                              <Power className="h-3 w-3" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Remove "${item.value}" from master list? Existing historical project records will retain this value.`)) {
                                  deleteMasterDataItem(item.id);
                                  toast.success(`Removed "${item.value}" from future selections`);
                                }
                              }}
                              className="h-6 w-6 text-rose-600 rounded-md"
                              title="Delete from Master"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Historical Protection Guarantee: Deleting or disabling a master value only hides it from future dropdown selections. Existing projects and reports will never lose historical data.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setManageModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
