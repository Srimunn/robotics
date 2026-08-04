export type Project = {
  id: string;
  date: string; // YYYY-MM-DD
  clientName: string;
  contactNumber: string;
  location: string;
  natureOfWork: string;
  projectValue: number;
  paymentReceived: number;
  createdAt: string;
};

export type OngoingWork = {
  id: string;
  date: string;
  clientName: string;
  contactNumber: string;
  location: string;
  natureOfWork: string;
  labourCount: number;
  labourType: string;
  remarks: string;
  createdAt: string;
};

export type PaymentStatus = "Received" | "Part Payment" | "Pending";

export function getStatus(p: Pick<Project, "projectValue" | "paymentReceived">): PaymentStatus {
  if (p.paymentReceived >= p.projectValue && p.projectValue > 0) return "Received";
  if (p.paymentReceived > 0) return "Part Payment";
  return "Pending";
}

export function getBalance(p: Pick<Project, "projectValue" | "paymentReceived">) {
  return Math.max(0, p.projectValue - p.paymentReceived);
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
