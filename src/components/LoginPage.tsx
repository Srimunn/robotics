import { useState } from "react";
import { useRobotics } from "@/lib/robotics-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, User, KeyRound, HardHat, Building2, ArrowLeft, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

export function LoginPage() {
  const { labours, login } = useRobotics();
  
  // Step: "select-role" | "enter-credentials"
  const [step, setStep] = useState<"select-role" | "enter-credentials">("select-role");
  const [selectedRole, setSelectedRole] = useState<"CEO" | "Worker" | "Labor" | null>(null);
  
  // Credentials states
  const [pin, setPin] = useState("");
  const [laborLoginId, setLaborLoginId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = (role: "CEO" | "Worker" | "Labor") => {
    setSelectedRole(role);
    setPin("");
    setLaborLoginId("");
    setStep("enter-credentials");
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (!pin.trim()) {
      toast.error("❌ Please enter your 4-digit security PIN");
      return;
    }

    setIsSubmitting(true);
    
    setTimeout(() => {
      let success = false;
      
      if (selectedRole === "CEO") {
        if (pin.trim() === "1234") {
          success = login("CEO");
        } else {
          toast.error("❌ Incorrect Executive PIN. Access Denied.");
        }
      } else if (selectedRole === "Worker") {
        if (pin.trim() === "5678") {
          success = login("Worker");
        } else {
          toast.error("❌ Incorrect Supervisor PIN. Access Denied.");
        }
      } else if (selectedRole === "Labor") {
        if (!laborLoginId.trim()) {
          toast.error("❌ Please enter your Labour Name or Login ID");
        } else {
          success = login("Labor", laborLoginId, pin);
        }
      }

      setIsSubmitting(false);
      if (!success) {
        setPin("");
      }
    }, 250);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-slate-50/50 p-4 font-sans overflow-hidden">
      {/* Decorative background grid and gradients */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60"></div>
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl"></div>

      <div className="w-full max-w-4xl space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Bot className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Robotics ERP Suite
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Enterprise Automation & Field Operations Control
          </p>
        </div>

        {step === "select-role" ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-800">Choose Your Access Portal</h2>
              <p className="text-xs text-slate-500">Select your designated enterprise role to proceed</p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-3">
              {/* CEO Role Card */}
              <button
                onClick={() => handleRoleSelect("CEO")}
                className="group relative flex flex-col text-left rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 cursor-pointer"
              >
                <div className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <User className="h-5 w-5" />
                </div>
                <div className="mt-8 space-y-2">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                    Super Admin
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Executive Portal
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Full ERP systems command. Access configuration settings, analytics dashboards, and billing structures.
                  </p>
                </div>
              </button>

              {/* Supervisor Role Card */}
              <button
                onClick={() => handleRoleSelect("Worker")}
                className="group relative flex flex-col text-left rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 cursor-pointer"
              >
                <div className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="mt-8 space-y-2">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                    Operations
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Supervisor Portal
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Manage enquiries, schedule project engineers, dispatch labours, track materials, and log site operations.
                  </p>
                </div>
              </button>

              {/* Labour Role Card */}
              <button
                onClick={() => handleRoleSelect("Labor")}
                className="group relative flex flex-col text-left rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 cursor-pointer"
              >
                <div className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                  <HardHat className="h-5 w-5" />
                </div>
                <div className="mt-8 space-y-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    Field Crew
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Labour Portal
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Clock in/out from site operations. Log geotagged coordinates and photos. Review weekly performance.
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Card className="w-full max-w-lg rounded-3xl border-slate-200/80 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Premium Gradient Header */}
              <CardHeader className={`p-6 border-b transition-colors duration-300 ${
                selectedRole === "CEO" ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white" :
                selectedRole === "Worker" ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white" :
                "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white"
              }`}>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("select-role")}
                    className="h-8 rounded-xl text-xs font-bold gap-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-xs cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Portals
                  </Button>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-white/90">
                    {selectedRole === "Labor" ? "👷 On-Site Worker Check-In" : "🔐 Secure Verification"}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md border border-white/20 shadow-inner">
                    {selectedRole === "CEO" && <User className="h-6 w-6" />}
                    {selectedRole === "Worker" && <Building2 className="h-6 w-6" />}
                    {selectedRole === "Labor" && <HardHat className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">
                      {selectedRole === "CEO" ? "Executive Systems Command" :
                       selectedRole === "Worker" ? "Supervisor Operations Portal" :
                       "Field Crew Member Check-In"}
                    </h3>
                    <p className="text-xs text-white/80 font-medium mt-0.5">
                      {selectedRole === "Labor" ? "Enter your Labour Name or Login ID & 4-Digit Security PIN" : "Enter your designated 4-digit security PIN to proceed"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <div className="p-6 space-y-5">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {selectedRole === "Labor" ? (
                    <div className="space-y-4">
                      {/* Worker Name or Login ID Input */}
                      <div className="space-y-1.5">
                        <Label htmlFor="labour-login-id" className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                          <span>👤 Labour Name or Login ID</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3 h-4 w-4 text-emerald-600" />
                          <Input
                            id="labour-login-id"
                            type="text"
                            placeholder="e.g. Ramesh or LBR-101"
                            value={laborLoginId}
                            onChange={(e) => setLaborLoginId(e.target.value)}
                            className="pl-10 h-11 rounded-2xl text-xs font-bold border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50"
                            required
                          />
                        </div>
                      </div>

                      {/* 4-Digit Security PIN Input */}
                      <div className="space-y-1.5">
                        <Label htmlFor="labour-pin" className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                          <span>🔑 4-Digit Security PIN</span>
                        </Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-emerald-600" />
                          <Input
                            id="labour-pin"
                            type="password"
                            placeholder="••••"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                            className="pl-10 h-11 rounded-2xl tracking-widest text-center text-lg font-black border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50"
                            required
                          />
                        </div>
                      </div>

                      {/* Registered Labour Profiles Quick Select */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-slate-50 border border-emerald-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-emerald-900 flex items-center gap-1.5">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Registered Field Crew Workers & PINs
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            Click to Select Worker
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pt-1 pr-1">
                          {labours.map(l => {
                            const isSelectedWorker = laborLoginId.toLowerCase() === (l.loginId || l.name.split(" ")[0]).toLowerCase();
                            return (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => {
                                  setLaborLoginId(l.loginId || l.name.split(" ")[0]);
                                  setPin(l.pin || "4827");
                                }}
                                className={`text-left p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 ${
                                  isSelectedWorker
                                    ? "bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20 scale-[1.02]"
                                    : "bg-white border-emerald-200/90 text-slate-800 hover:bg-emerald-100/50 hover:border-emerald-300"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className={`text-xs font-extrabold truncate ${isSelectedWorker ? "text-white" : "text-slate-900"}`}>
                                    {l.name}
                                  </p>
                                  <p className={`text-[10px] font-semibold truncate ${isSelectedWorker ? "text-emerald-100" : "text-slate-500"}`}>
                                    ID: {l.loginId || l.name.split(" ")[0]}
                                  </p>
                                </div>
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md shrink-0 ${
                                  isSelectedWorker ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                }`}>
                                  PIN: {l.pin || "4827"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pin-input" className="text-xs font-extrabold text-slate-700">Enter 4-Digit Security PIN</Label>
                      </div>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="pin-input"
                          type="password"
                          placeholder="••••"
                          maxLength={4}
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                          className="pl-10 h-11 rounded-2xl tracking-widest text-center text-xl font-black border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting || (selectedRole === "Labor" && labours.length === 0)}
                    className={`w-full h-11 rounded-2xl text-xs font-extrabold gap-2 shadow-lg cursor-pointer transition-all duration-300 transform active:scale-95 ${
                      selectedRole === "CEO" ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40" :
                      selectedRole === "Worker" ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40" :
                      "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-emerald-600/25 hover:shadow-emerald-600/40"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Authenticating Session...
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" /> Access Labour Portal
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
