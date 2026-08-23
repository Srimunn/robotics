import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRobotics } from "@/lib/robotics-context";
import { toast } from "sonner";
import { MasterDataManager } from "@/components/erp/MasterDataManager";
import {
  Settings,
  Building2,
  Sliders,
  Wrench,
  RotateCcw,
  Save,
  CheckCircle2,
  Shield,
  Bot,
  Database,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/settings")({
  component: SettingsComponent,
});

function SettingsComponent() {
  const { settings, updateSettings, resetDemoData, resetToCleanDemoMode, currentUser } = useRobotics();

  const [activeTab, setActiveTab] = useState<"SETTINGS" | "MASTER_DATA">("MASTER_DATA");
  const [formState, setFormState] = useState({ ...settings });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== "CEO") {
      toast.error("Access Denied: Only Executive / Super Admin can change system configuration settings");
      return;
    }
    const cleanPhone = formState.phone ? formState.phone.replace(/\D/g, "") : "";
    if (cleanPhone && cleanPhone.length > 10) {
      toast.error("Official Contact Phone cannot exceed 10 digits");
      return;
    }
    updateSettings(formState);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "SETTINGS" && (
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1.5 shadow-xs"
            >
              <Save className="h-4 w-4" /> Save
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 bg-white dark:bg-card p-2 rounded-xl border border-border shadow-xs">
        <Button
          variant={activeTab === "MASTER_DATA" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("MASTER_DATA")}
          className={`text-xs rounded-lg gap-1.5 ${activeTab === "MASTER_DATA" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
        >
          <Database className="h-3.5 w-3.5" /> Master Data
        </Button>
        <Button
          variant={activeTab === "SETTINGS" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("SETTINGS")}
          className={`text-xs rounded-lg gap-1.5 ${activeTab === "SETTINGS" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> General Settings
        </Button>
      </div>

      {activeTab === "MASTER_DATA" && <MasterDataManager />}

      {activeTab === "SETTINGS" && (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Company Profile Settings */}
          <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" /> Company Profile & Branding
              </CardTitle>
              <CardDescription className="text-xs">
                Appears on Quotation PDFs and Official Service Invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Company Name</Label>
                <Input
                  value={formState.companyName}
                  onChange={(e) => setFormState({ ...formState, companyName: e.target.value })}
                  className="h-9 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Address / Corporate Office</Label>
                <Textarea
                  rows={2}
                  value={formState.companyAddress}
                  onChange={(e) => setFormState({ ...formState, companyAddress: e.target.value })}
                  className="rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Official Contact Phone</Label>
                  <Input
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className={`h-9 rounded-lg ${
                      (formState.phone || "").replace(/\D/g, "").length > 10 ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                  />
                  {(formState.phone || "").replace(/\D/g, "").length > 10 && (
                    <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 inline text-red-500 shrink-0" /> Phone number cannot exceed 10 digits ({(formState.phone || "").replace(/\D/g, "").length}/10 digits)
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Support Email</Label>
                  <Input
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="h-9 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tax Identification / GSTIN</Label>
                <Input
                  value={formState.taxId}
                  onChange={(e) => setFormState({ ...formState, taxId: e.target.value })}
                  className="h-9 rounded-lg font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* System Automation Rules */}
          <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-600" /> Automation Rules Engine
              </CardTitle>
              <CardDescription className="text-xs">
                Enforce "Enter Data Once. Use It Everywhere" rules
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5 max-w-sm">
                  <p className="font-bold text-foreground">Auto-Complete Project Status on Full Payment</p>
                  <p className="text-muted-foreground text-[11px]">
                    When payments fully settle a project contract value, automatically advance project status to Completed.
                  </p>
                </div>
                <Switch
                  checked={formState.autoUpdateProjectStatusOnPayment}
                  onCheckedChange={(val) =>
                    setFormState({ ...formState, autoUpdateProjectStatusOnPayment: val })
                  }
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <span className="font-bold text-foreground">Default Daily Wage Rates Master</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Permanent Labour (₹/Day)</Label>
                    <Input
                      type="number"
                      value={formState.defaultWeeklyWagePermanent}
                      onChange={(e) =>
                        setFormState({ ...formState, defaultWeeklyWagePermanent: Number(e.target.value) })
                      }
                      className="h-9 rounded-lg font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Contract Labour (₹/Day)</Label>
                    <Input
                      type="number"
                      value={formState.defaultWeeklyWageContract}
                      onChange={(e) =>
                        setFormState({ ...formState, defaultWeeklyWageContract: Number(e.target.value) })
                      }
                      className="h-9 rounded-lg font-bold"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security & System PIN Management (CEO Only) */}
          {currentUser?.role === "CEO" && (
            <Card className="rounded-xl border border-border shadow-xs bg-white dark:bg-card lg:col-span-2">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-600" /> Security & System PIN Management
                </CardTitle>
                <CardDescription className="text-xs">
                  System Administrator & Manager security access credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Reset Admin PIN */}
                  <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950 dark:text-purple-200 text-xs">Reset Admin PIN</span>
                      <Badge className="bg-purple-600 text-white text-[10px]">CEO / Admin</Badge>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-muted-foreground font-medium">Current Admin PIN:</span>
                      <code className="bg-white dark:bg-purple-900/80 px-2.5 py-1 rounded-lg border border-purple-300 font-extrabold text-purple-700 dark:text-purple-300 text-xs tracking-wider font-mono">1234</code>
                    </div>
                  </div>

                  {/* Reset Manager PIN */}
                  <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950 dark:text-purple-200 text-xs">Reset Manager PIN</span>
                      <Badge className="bg-purple-600 text-white text-[10px]">Supervisor / Manager</Badge>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-muted-foreground font-medium">Current Manager PIN:</span>
                      <code className="bg-white dark:bg-purple-900/80 px-2.5 py-1 rounded-lg border border-purple-300 font-extrabold text-purple-700 dark:text-purple-300 text-xs tracking-wider font-mono">5678</code>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="font-medium">
                    To change admin/manager PINs, contact your system administrator. <span className="text-muted-foreground">(Full PIN change will be implemented with proper user authentication in a future phase.)</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      )}
    </div>
  );
}
