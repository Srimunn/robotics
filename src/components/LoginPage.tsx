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
    if (role === "Labor" && labours.length > 0) {
      setLaborLoginId(labours[0].name);
    } else {
      setLaborLoginId("");
    }
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
        success = login("CEO", undefined, pin);
      } else if (selectedRole === "Worker") {
        success = login("Worker", undefined, pin);
      } else if (selectedRole === "Labor") {
        if (!laborLoginId.trim()) {
          toast.error("❌ Please enter or select your Labour Name / Login ID");
          setIsSubmitting(false);
          return;
        }
        success = login("Labor", laborLoginId, pin);
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
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-800">Choose Your Access Portal</h2>
              <p className="text-xs text-slate-500">Select your role. Security PIN is strictly required to open the system.</p>
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
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                      Super Admin
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                      🔒 PIN Protected
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Executive Portal
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Full ERP systems command. Requires Executive security PIN to unlock settings, analytics, and billing.
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
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                      Operations
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                      🔒 PIN Protected
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Supervisor Portal
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Manage enquiries, schedule engineers, dispatch labours & track projects. Requires Supervisor PIN.
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
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      Field Crew
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                      🔒 PIN Protected
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Labour Portal
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Clock in/out from site operations. Log geotagged coordinates & photos. Requires Labour Login ID & 4-digit PIN.
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Card className="w-full max-w-md rounded-3xl border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <CardHeader className={`p-6 border-b transition-colors duration-300 ${
                selectedRole === "CEO" ? "bg-blue-50/80 border-blue-100 text-slate-900" :
                selectedRole === "Worker" ? "bg-indigo-50/80 border-indigo-100 text-slate-900" :
                "bg-emerald-50/80 border-emerald-100 text-slate-900"
              }`}>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("select-role")}
                    className="h-8 rounded-xl text-xs font-bold gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Portals
                  </Button>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    selectedRole === "CEO" ? "bg-blue-100/80 text-blue-800 border-blue-200" :
                    selectedRole === "Worker" ? "bg-indigo-100/80 text-indigo-800 border-indigo-200" :
                    "bg-emerald-100/80 text-emerald-800 border-emerald-200"
                  }`}>
                    {selectedRole === "Labor" ? "On-Site Check-In" : "Identity Verification"}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3.5">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                    selectedRole === "CEO" ? "bg-blue-100 text-blue-700 border-blue-200" :
                    selectedRole === "Worker" ? "bg-indigo-100 text-indigo-700 border-indigo-200" :
                    "bg-emerald-100 text-emerald-700 border-emerald-200"
                  }`}>
                    {selectedRole === "CEO" && <User className="h-5 w-5" />}
                    {selectedRole === "Worker" && <Building2 className="h-5 w-5" />}
                    {selectedRole === "Labor" && <HardHat className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
                      {selectedRole === "CEO" ? "Executive Portal" :
                       selectedRole === "Worker" ? "Supervisor Operations" :
                       "Labour Crew Portal"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {selectedRole === "Labor" ? "Enter your Labour ID & PIN to log in" : "Enter your designated 4-digit security PIN to unlock"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <div className="p-6 space-y-4">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {selectedRole === "Labor" ? (
                    <div className="space-y-4">
                      {/* Labour Select Dropdown */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Select Labour Profile</Label>
                        <Select
                          value={laborLoginId}
                          onValueChange={(val) => setLaborLoginId(val)}
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs font-semibold bg-slate-50/50 border-slate-200">
                            <SelectValue placeholder="Choose Labour Profile..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {labours.map((lab) => (
                              <SelectItem key={lab.id} value={lab.name} className="text-xs font-medium">
                                {lab.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 4-Digit Security PIN Input */}
                      <div className="space-y-1.5">
                        <Label htmlFor="labour-pin" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span>4-Digit Security PIN</span>
                          <span className="text-[10px] text-slate-400 font-normal">PIN is required</span>
                        </Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="labour-pin"
                            type="password"
                            placeholder="••••"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                            className="pl-10 h-10 rounded-xl tracking-widest text-center text-base font-extrabold border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 bg-slate-50/50"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pin-input" className="text-xs font-bold text-slate-700">Enter 4-Digit Security PIN</Label>
                        <span className="text-[10px] text-rose-500 font-semibold">Required to open portal</span>
                      </div>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="pin-input"
                          type="password"
                          placeholder="••••"
                          maxLength={4}
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                          className="pl-10 h-10 rounded-xl tracking-widest text-center text-lg font-bold border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting || (selectedRole === "Labor" && labours.length === 0)}
                    className={`w-full h-10 rounded-xl text-xs font-bold gap-2 shadow-xs cursor-pointer transition-all duration-200 ${
                      selectedRole === "CEO" ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10" :
                      selectedRole === "Worker" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/10" :
                      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying Credentials...
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" /> Access Portal
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
