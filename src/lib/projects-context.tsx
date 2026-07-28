import { createContext, useContext, useState, type ReactNode } from "react";
import type { Project, OngoingWork } from "./project-types";

type Ctx = {
  projects: Project[];
  ongoing: OngoingWork[];
  addProject: (p: Omit<Project, "id" | "createdAt">) => void;
  updateProject: (id: string, p: Omit<Project, "id" | "createdAt">) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  addOngoing: (p: Omit<OngoingWork, "id" | "createdAt">) => void;
  updateOngoing: (id: string, p: Omit<OngoingWork, "id" | "createdAt">) => void;
  deleteOngoing: (id: string) => void;
};

const ProjectsContext = createContext<Ctx | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);

const today = new Date();
const d = (offset: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() - offset);
  return x.toISOString().slice(0, 10);
};

const seedProjects: Project[] = [
  {
    id: uid(), date: d(2), clientName: "Ravi Kumar", contactNumber: "9876543210",
    location: "Chennai", natureOfWork: "Interior Painting", projectValue: 250000,
    paymentReceived: 250000, createdAt: new Date().toISOString(),
  },
  {
    id: uid(), date: d(20), clientName: "Priya Sharma", contactNumber: "9123456780",
    location: "Bangalore", natureOfWork: "Flooring & Tiling", projectValue: 480000,
    paymentReceived: 300000, createdAt: new Date().toISOString(),
  },
  {
    id: uid(), date: d(45), clientName: "Anil Verma", contactNumber: "9988776655",
    location: "Hyderabad", natureOfWork: "Roof Waterproofing", projectValue: 175000,
    paymentReceived: 0, createdAt: new Date().toISOString(),
  },
  {
    id: uid(), date: d(70), clientName: "Sneha Iyer", contactNumber: "9445566778",
    location: "Coimbatore", natureOfWork: "Kitchen Renovation", projectValue: 620000,
    paymentReceived: 620000, createdAt: new Date().toISOString(),
  },
  {
    id: uid(), date: d(100), clientName: "Mohammed Ali", contactNumber: "9812345670",
    location: "Madurai", natureOfWork: "Bathroom Remodel", projectValue: 210000,
    paymentReceived: 120000, createdAt: new Date().toISOString(),
  },
  {
    id: uid(), date: d(130), clientName: "Lakshmi Rao", contactNumber: "9765432109",
    location: "Vizag", natureOfWork: "Structural Repair", projectValue: 890000,
    paymentReceived: 500000, createdAt: new Date().toISOString(),
  },
];

const seedOngoing: OngoingWork[] = [
  {
    id: uid(), date: d(3), clientName: "Karan Malhotra", contactNumber: "9900112233",
    location: "Chennai - Anna Nagar", natureOfWork: "Foundation Work", labourCount: 12,
    labourType: "Masons + Helpers", remarks: "Slab pouring scheduled Friday",
    createdAt: new Date().toISOString(),
  },
  {
    id: uid(), date: d(8), clientName: "Meera Nair", contactNumber: "9887766554",
    location: "Bangalore - HSR", natureOfWork: "Electrical Wiring", labourCount: 6,
    labourType: "Electricians", remarks: "Phase-1 complete", createdAt: new Date().toISOString(),
  },
  {
    id: uid(), date: d(1), clientName: "Sanjay Patel", contactNumber: "9765001122",
    location: "Hyderabad - Kondapur", natureOfWork: "Plastering", labourCount: 8,
    labourType: "Skilled Masons", remarks: "Client approved finish", createdAt: new Date().toISOString(),
  },
];

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [ongoing, setOngoing] = useState<OngoingWork[]>(seedOngoing);

  const value: Ctx = {
    projects,
    ongoing,
    addProject: (p) =>
      setProjects((prev) => [
        { ...p, id: uid(), createdAt: new Date().toISOString() },
        ...prev,
      ]),
    updateProject: (id, p) =>
      setProjects((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x))),
    deleteProject: (id) => setProjects((prev) => prev.filter((x) => x.id !== id)),
    duplicateProject: (id) =>
      setProjects((prev) => {
        const src = prev.find((x) => x.id === id);
        if (!src) return prev;
        return [
          {
            ...src,
            id: uid(),
            clientName: `${src.clientName} (Copy)`,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ];
      }),
    addOngoing: (p) =>
      setOngoing((prev) => [
        { ...p, id: uid(), createdAt: new Date().toISOString() },
        ...prev,
      ]),
    updateOngoing: (id, p) =>
      setOngoing((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x))),
    deleteOngoing: (id) => setOngoing((prev) => prev.filter((x) => x.id !== id)),
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
  return ctx;
}