"use server";

import { createServerFn } from "@tanstack/react-start";
import { db } from "~/lib/db";
import { toNumber, toNullableNumber } from "./utils";

function formatEnquiry<T extends Record<string, any>>(e: T | null) {
  if (!e) return null;
  return {
    ...e,
    quotationAmount: toNullableNumber(e.quotationAmount),
  };
}

function formatProject<T extends Record<string, any>>(p: T | null) {
  if (!p) return null;
  return {
    ...p,
    quotationAmount: toNullableNumber(p.quotationAmount),
    projectValue: toNumber(p.projectValue),
    receivedAmount: toNumber(p.receivedAmount),
    balanceAmount: toNumber(p.balanceAmount),
    paymentStages: p.paymentStages?.map((s: any) => ({
      ...s,
      amount: toNumber(s.amount),
      paidAmount: toNullableNumber(s.paidAmount),
    })),
    materialIssues: p.materialIssues?.map((m: any) => ({
      ...m,
      unitCost: toNullableNumber(m.unitCost),
      totalCost: toNullableNumber(m.totalCost),
    })),
    payments: p.payments?.map((pay: any) => ({
      ...pay,
      amount: toNumber(pay.amount),
    })),
  };
}

function formatPayment<T extends Record<string, any>>(pay: T | null) {
  if (!pay) return null;
  return {
    ...pay,
    amount: toNumber(pay.amount),
  };
}

function formatMaterial<T extends Record<string, any>>(m: T | null) {
  if (!m) return null;
  return {
    ...m,
    purchaseCost: toNumber(m.purchaseCost),
  };
}

function formatMaterialIssue<T extends Record<string, any>>(mi: T | null) {
  if (!mi) return null;
  return {
    ...mi,
    unitCost: toNullableNumber(mi.unitCost),
    totalCost: toNullableNumber(mi.totalCost),
  };
}

export const listEnquiries = createServerFn({ method: "GET" }).handler(async () => {
  const items = await db.enquiry.findMany({ orderBy: { createdAt: "desc" } });
  return items.map(formatEnquiry);
});

export const getEnquiryById = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const item = await db.enquiry.findUnique({ where: { id: data.id } });
    return formatEnquiry(item);
  });

export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  const items = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      statusHistory: { orderBy: { timestamp: "asc" } },
      activities: { orderBy: { timestamp: "desc" } },
      labourAssignments: true,
      labourLogs: { orderBy: { date: "desc" } },
      machineIssues: true,
      materialIssues: true,
      paymentStages: { orderBy: { dueDate: "asc" } },
      documents: true,
    },
  });
  return items.map(formatProject);
});

export const getProjectById = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const item = await db.project.findUnique({
      where: { id: data.id },
      include: {
        statusHistory: { orderBy: { timestamp: "asc" } },
        activities: { orderBy: { timestamp: "desc" } },
        labourAssignments: true,
        labourLogs: { orderBy: { date: "desc" } },
        machineIssues: true,
        materialIssues: true,
        paymentStages: { orderBy: { dueDate: "asc" } },
        documents: true,
        payments: { orderBy: { paymentDate: "desc" } },
      },
    });
    return formatProject(item);
  });

export const listPayments = createServerFn({ method: "GET" }).handler(async () => {
  const items = await db.payment.findMany({ orderBy: { paymentDate: "desc" } });
  return items.map(formatPayment);
});

export const listMachines = createServerFn({ method: "GET" }).handler(async () => {
  const machines = await db.machine.findMany({ orderBy: { toolName: "asc" } });
  const activeIssues = await db.machineIssueRecord.findMany({
    where: {
      status: { in: ["Issued", "PartiallyReturned"] },
    },
  });

  const activeQtyByMachine = new Map<string, number>();
  for (const iss of activeIssues) {
    const remaining = Math.max(0, iss.quantity - (iss.returnedQuantity || 0));
    activeQtyByMachine.set(iss.machineId, (activeQtyByMachine.get(iss.machineId) || 0) + remaining);
  }

  return Promise.all(
    machines.map(async (m) => {
      const actualIssued = activeQtyByMachine.get(m.id) || 0;
      if (m.issuedQuantity !== actualIssued) {
        const fixedAvailable = Math.max(0, m.currentStock - actualIssued - m.repairQuantity - m.lostQuantity);
        db.machine
          .update({
            where: { id: m.id },
            data: {
              issuedQuantity: actualIssued,
              availableQuantity: fixedAvailable,
            },
          })
          .catch((err) => console.error("Auto-sync machine error:", err));

        return {
          ...m,
          issuedQuantity: actualIssued,
          availableQuantity: fixedAvailable,
        };
      }
      return m;
    })
  );
});

export const listMachineIssues = createServerFn({ method: "GET" }).handler(async () => {
  return db.machineIssueRecord.findMany({ orderBy: { issueDate: "desc" } });
});

export const listMaterials = createServerFn({ method: "GET" }).handler(async () => {
  const items = await db.material.findMany({ orderBy: { name: "asc" } });
  return items.map(formatMaterial);
});

export const listMaterialIssues = createServerFn({ method: "GET" }).handler(async () => {
  const items = await db.materialIssueRecord.findMany({ orderBy: { issueDate: "desc" } });
  return items.map(formatMaterialIssue);
});

export const listAttendance = createServerFn({ method: "GET" }).handler(async () => {
  return db.attendanceRecord.findMany({ orderBy: { date: "desc" } });
});

export const listStockAuditLogs = createServerFn({ method: "GET" }).handler(async () => {
  return db.stockAuditLog.findMany({ orderBy: { timestamp: "desc" }, take: 500 });
});
