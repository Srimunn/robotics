import { useState } from "react";
import { useRobotics } from "@/lib/robotics-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AppRole = "Admin" | "Manager" | "Labour";

export function LoginPage() {
  const { labours, login } = useRobotics();
  
  const [selectedRole, setSelectedRole] = useState<AppRole>("Admin");
  const [pin, setPin] = useState("");
  const [laborLoginId, setLaborLoginId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleChange = (role: AppRole) => {
    setSelectedRole(role);
    setPin("");
    if (role === "Labour" && labours.length > 0) {
      setLaborLoginId(labours[0].name);
    } else {
      setLaborLoginId("");
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pin.trim()) {
      toast.error("Please enter your 4-digit PIN");
      return;
    }

    setIsSubmitting(true);

    let success = false;
    if (selectedRole === "Admin") {
      success = login("CEO", undefined, pin);
    } else if (selectedRole === "Manager") {
      success = login("Worker", undefined, pin);
    } else if (selectedRole === "Labour") {
      if (!laborLoginId.trim()) {
        toast.error("Please select or enter your Name / Login ID");
        setIsSubmitting(false);
        return;
      }
      success = login("Labor", laborLoginId, pin);
    }

    setIsSubmitting(false);
    if (!success) {
      setPin("");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 p-4 font-sans">
      <Card className="w-full max-w-sm sm:max-w-md rounded-2xl border border-slate-200/80 bg-white shadow-xl p-5 sm:p-8 space-y-6">
        {/* Header with Company Logo & Name */}
        <div className="flex flex-col items-center text-center space-y-3">
          <img src="/logo.png" alt="RPC Logo" className="h-16 w-16 object-contain drop-shadow-md" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Robotics Bricks & Blocks
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Enterprise Resource Planning
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          {/* Role Toggle Selector Pill Buttons */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Role</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["Admin", "Manager", "Labour"] as AppRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`h-9 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                    selectedRole === role
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Name / Login ID for Labour */}
          {selectedRole === "Labour" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Name / Login ID</Label>
              <Select value={laborLoginId} onValueChange={(val) => setLaborLoginId(val)}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-medium bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select Name / Login ID..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {labours.map((lab) => (
                    <SelectItem key={lab.id} value={lab.name} className="text-xs">
                      {lab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* PIN Input Field */}
          <div className="space-y-1.5">
            <Label htmlFor="pin-input" className="text-xs font-semibold text-slate-700">
              PIN
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="pin-input"
                type="password"
                placeholder="••••"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="pl-10 h-10 rounded-xl tracking-widest text-center text-lg font-bold border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 bg-slate-50/50"
                required
              />
            </div>
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            disabled={isSubmitting || (selectedRole === "Labour" && labours.length === 0)}
            className="w-full h-10 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Footer Copyright */}
        <div className="pt-2 text-center">
          <p className="text-[11px] text-muted-foreground font-medium">
            © 2026 Robotics Bricks & Blocks Pvt. Ltd.
          </p>
        </div>
      </Card>
    </div>
  );
}
