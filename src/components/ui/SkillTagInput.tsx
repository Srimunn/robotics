import React, { useState } from "react";
import { Plus, X, Sparkles, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRobotics } from "@/lib/robotics-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SkillTagInputProps {
  value: string; // Comma separated string e.g. "PLC Wiring, Hydraulics"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SkillTagInput({
  value,
  onChange,
  placeholder = "Type new skill and click + Add...",
  className,
}: SkillTagInputProps) {
  const { masterData, addMasterDataItem } = useRobotics();
  const [inputSkill, setInputSkill] = useState("");

  // Parse comma-separated string to array
  const activeSkills = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Get master skills for suggestions
  const masterSkills = masterData
    .filter((item) => item.category === "Labour Skills" && item.isActive)
    .map((item) => item.value);

  // Default suggestions if master data is sparse
  const defaultSuggestions = [
    "Robotic Joint Seals",
    "PLC Wiring",
    "Hydraulics",
    "Conveyor Alignment",
    "Motor Repair",
    "SCADA Servicing",
    "Electrical Wiring",
    "Pneumatic Controls",
  ];

  const allSuggestions = Array.from(new Set([...masterSkills, ...defaultSuggestions]));

  const handleAddSkill = (skillToAdd?: string) => {
    const targetSkill = (skillToAdd !== undefined ? skillToAdd : inputSkill).trim();
    if (!targetSkill) return;

    // Duplicate check
    const isDuplicate = activeSkills.some(
      (s) => s.toLowerCase() === targetSkill.toLowerCase()
    );

    if (isDuplicate) {
      toast.info(`"${targetSkill}" is already added to skills list`);
      setInputSkill("");
      return;
    }

    const updatedSkills = [...activeSkills, targetSkill];
    onChange(updatedSkills.join(", "));

    // Save to master data automatically
    addMasterDataItem("Labour Skills", targetSkill);

    setInputSkill("");
    toast.success(`Added skill: "${targetSkill}"`);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = activeSkills.filter(
      (s) => s.toLowerCase() !== skillToRemove.toLowerCase()
    );
    onChange(updatedSkills.join(", "));
  };

  return (
    <div className={cn("space-y-2.5 w-full", className)}>
      {/* TYPE & ADD INPUT ROW */}
      <div className="flex gap-1.5">
        <Input
          value={inputSkill}
          onChange={(e) => setInputSkill(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddSkill();
            }
          }}
          placeholder={placeholder}
          className="h-9 text-xs rounded-xl flex-1 bg-background border-input"
        />
        <Button
          type="button"
          onClick={() => handleAddSkill()}
          disabled={!inputSkill.trim()}
          className="h-9 px-3.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold gap-1 shrink-0 shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
        </Button>
      </div>

      {/* ACTIVE SKILLS BADGES */}
      {activeSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
            Active Skills ({activeSkills.length}):
          </span>
          {activeSkills.map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900 gap-1.5 py-1 px-2.5 rounded-lg font-semibold flex items-center shadow-2xs"
            >
              <span>{skill}</span>
              <button
                type="button"
                onClick={() => handleRemoveSkill(skill)}
                className="hover:text-rose-600 text-blue-500 transition-colors ml-0.5 rounded-full p-0.5"
                title={`Remove ${skill}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* QUICK SUGGESTION TAG PILLS */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>Quick Add Popular Skills:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {allSuggestions.map((sug) => {
            const isAdded = activeSkills.some(
              (s) => s.toLowerCase() === sug.toLowerCase()
            );

            return (
              <button
                type="button"
                key={sug}
                onClick={() => !isAdded && handleAddSkill(sug)}
                disabled={isAdded}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 font-medium cursor-pointer",
                  isAdded
                    ? "bg-slate-100 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                    : "bg-white dark:bg-card hover:bg-blue-50 text-slate-700 dark:text-slate-200 border-slate-200 hover:border-blue-300 hover:text-blue-600 shadow-2xs"
                )}
              >
                {isAdded ? <Check className="h-3 w-3 text-emerald-600" /> : <Plus className="h-3 w-3 text-blue-600" />}
                <span>{sug}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
