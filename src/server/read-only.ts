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
  return db.machine.findMany({ orderBy: { toolName: "asc" } });
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
