import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRobotics } from "@/lib/robotics-context";
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
  const { settings, updateSettings, resetDemoData, resetToCleanDemoMode } = useRobotics();

  const [activeTab, setActiveTab] = useState<"SETTINGS" | "MASTER_DATA">("MASTER_DATA");
  const [formState, setFormState] = useState({ ...settings });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formState);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">System Administration & Master Data</h1>
            <Badge variant="outline" className="bg-slate-100 text-slate-700">
              ERP Configuration
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage company profile, automation rules, and Smart Master Data governance across all system categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Reset ERP to Clean Demo Mode?\n\nAll current enquiry, project, payment, and attendance records will be cleared for a 100% fresh live executive demonstration.")) {
                resetToCleanDemoMode();
              }
            }}
            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg gap-1.5"
          >
            🧹 Clean Demo Reset
          </Button>
          {activeTab === "SETTINGS" && (
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1.5 shadow-xs"
            >
              <Save className="h-4 w-4" /> Save Settings
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
          <Database className="h-3.5 w-3.5" /> Smart Master Data Governance (12 Categories)
        </Button>
        <Button
          variant={activeTab === "SETTINGS" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("SETTINGS")}
          className={`text-xs rounded-lg gap-1.5 ${activeTab === "SETTINGS" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> General ERP Settings & Branding
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
                    className="h-9 rounded-lg"
                  />
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
                <span className="font-bold text-foreground">Default Weekly Wage Rates Master</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Permanent Labour (₹/Week)</Label>
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
                    <Label className="text-xs font-semibold">Contract Labour (₹/Week)</Label>
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
        </form>
      )}
    </div>
  );
}
