"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { toNumber } from "./utils";
import { recalculateProject } from "./recalc";

function formatPayment<T extends Record<string, any>>(p: T | null) {
  if (!p) return null;
  return {
    ...p,
    amount: toNumber(p.amount),
  };
}

const paymentInput = z.object({
  projectId: z.string(),
  paymentDate: z.coerce.date(),
  amount: z.number().positive(),
  mode: z.string(),
  referenceNumber: z.string().default(""),
  remarks: z.string().default(""),
  stageId: z.string().optional().nullable(),
  stageName: z.string().optional().nullable(),
  receivedBy: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  upiApp: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
  upiReferenceNumber: z.string().optional().nullable(),
  utrNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountReceived: z.string().optional().nullable(),
  chequeNumber: z.string().optional().nullable(),
  chequeDate: z.coerce.date().optional().nullable(),
  proofUrl: z.string().optional().nullable(),
  proofName: z.string().optional().nullable(),
});

export const addPayment = createServerFn({ method: "POST" })
  .validator((input: unknown) => paymentInput.parse(input))
  .handler(async ({ data }) => {
    // Duplicate reference check
    const uniqCheck: Array<[string, string | null | undefined]> = [
      ["transactionId", data.transactionId],
      ["receiptNumber", data.receiptNumber],
      ["chequeNumber", data.chequeNumber],
      ["utrNumber", data.utrNumber],
    ];
    for (const [field, val] of uniqCheck) {
      if (val) {
        const dup = await db.payment.findFirst({ where: { [field]: val } as any });
        if (dup) throw new Error(`Duplicate ${field}: ${val} already exists`);
      }
    }

    return db.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const count = await tx.payment.count();
      const id = `PAY-${year}-${String(count + 1).padStart(3, "0")}`;

      const payment = await tx.payment.create({
        data: {
          id,
          projectId: data.projectId,
          paymentDate: data.paymentDate,
          amount: data.amount,
          mode: data.mode,
          referenceNumber: data.referenceNumber,
          remarks: data.remarks,
          stageId: data.stageId ?? undefined,
          stageName: data.stageName ?? undefined,
          receivedBy: data.receivedBy ?? "Accounts & Credit Desk",
          receiptNumber: data.receiptNumber ?? undefined,
          upiApp: data.upiApp ?? undefined,
          transactionId: data.transactionId ?? undefined,
          upiReferenceNumber: data.upiReferenceNumber ?? undefined,
          utrNumber: data.utrNumber ?? undefined,
          bankName: data.bankName ?? undefined,
          accountReceived: data.accountReceived ?? undefined,
          chequeNumber: data.chequeNumber ?? undefined,
          chequeDate: data.chequeDate ?? undefined,
          proofUrl: data.proofUrl ?? undefined,
          proofName: data.proofName ?? undefined,
        },
      });

      await tx.projectActivity.create({
        data: {
          projectId: data.projectId,
          event: "Payment Recorded",
          actor: data.receivedBy ?? "Accounts & Credit Desk",
          details: `Payment ${id}: ₹${data.amount.toLocaleString("en-IN")} via ${data.mode}`,
        },
      });

      await recalculateProject(tx, data.projectId);
      return formatPayment(payment);
    });
  });

export const deletePayment = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      const pay = await tx.payment.findUnique({ where: { id: data.id } });
      if (!pay) throw new Error("Payment not found");
      await tx.payment.delete({ where: { id: data.id } });
      await recalculateProject(tx, pay.projectId);
      return { ok: true };
    });
  });

export const addPaymentStage = createServerFn({ method: "POST" })
  .validator(
    (input: {
      projectId: string;
      stage: { stageName: string; amount: number; dueDate: string; paymentNotes?: string };
    }) => input
  )
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      const stageId = `STG-${Math.random().toString(36).slice(2, 8)}`;
      await tx.paymentStageItem.create({
        data: {
          id: stageId,
          projectId: data.projectId,
          stageName: data.stage.stageName,
          amount: data.stage.amount,
          dueDate: new Date(data.stage.dueDate),
          status: "Pending",
          paymentNotes: data.stage.paymentNotes,
        },
      });
      await recalculateProject(tx, data.projectId);
      return { id: stageId };
    });
  });

export const updatePaymentStage = createServerFn({ method: "POST" })
  .validator(
    (input: {
      projectId: string;
      stageId: string;
      updates: Partial<{ stageName: string; amount: number; dueDate: string; paymentNotes: string }>;
    }) => input
  )
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      await tx.paymentStageItem.update({
        where: { id: data.stageId },
        data: {
          ...data.updates,
          dueDate: data.updates.dueDate ? new Date(data.updates.dueDate) : undefined,
        } as any,
      });
      await recalculateProject(tx, data.projectId);
      return { ok: true };
    });
  });

export const deletePaymentStage = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; stageId: string }) => input)
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      await tx.paymentStageItem.delete({ where: { id: data.stageId } });
      await recalculateProject(tx, data.projectId);
      return { ok: true };
    });
  });

export const applyPresetPaymentPlan = createServerFn({ method: "POST" })
  .validator(
    (input: { projectId: string; presetType: "100_ADVANCE" | "50_50" | "20_30_50" | "100_CREDIT" }) => input
  )
  .handler(async ({ data }) => {
    return db.$transaction(async (tx) => {
      const proj = await tx.project.findUnique({ where: { id: data.projectId } });
      if (!proj) throw new Error("Project not found");
      const val = Number(proj.projectValue) || 100000;
      const today = new Date();
      const dPlus = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d;
      };
      const rand = () => `STG-${Math.random().toString(36).slice(2, 8)}`;

      await tx.paymentStageItem.deleteMany({ where: { projectId: data.projectId } });

      let stages: Array<{ id: string; stageName: string; amount: number; dueDate: Date; paymentNotes: string }> = [];

      if (data.presetType === "100_ADVANCE") {
        stages = [{ id: rand(), stageName: "100% Advance Payment", amount: val, dueDate: today, paymentNotes: "Full upfront payment" }];
      } else if (data.presetType === "50_50") {
        const half = Math.round(val * 0.5);
        stages = [
          { id: rand(), stageName: "50% Advance Booking", amount: half, dueDate: today, paymentNotes: "Upfront deposit" },
          { id: rand(), stageName: "50% Work Completion Balance", amount: val - half, dueDate: dPlus(14), paymentNotes: "Final balance" },
        ];
      } else if (data.presetType === "20_30_50") {
        const a1 = Math.round(val * 0.2);
        const a2 = Math.round(val * 0.3);
        stages = [
          { id: rand(), stageName: "20% Mobilization Advance", amount: a1, dueDate: today, paymentNotes: "Initial booking" },
          { id: rand(), stageName: "30% Mid-Way Milestone", amount: a2, dueDate: dPlus(10), paymentNotes: "Mid completion" },
          { id: rand(), stageName: "50% Final Handover", amount: val - a1 - a2, dueDate: dPlus(25), paymentNotes: "Final commissioning" },
        ];
      } else {
        stages = [{ id: rand(), stageName: "100% Full Credit (Net 30)", amount: val, dueDate: dPlus(30), paymentNotes: "Net 30 credit terms" }];
      }

      for (const s of stages) {
        await tx.paymentStageItem.create({
          data: {
            id: s.id,
            projectId: data.projectId,
            stageName: s.stageName,
            amount: s.amount,
            dueDate: s.dueDate,
            status: "Pending",
            paymentNotes: s.paymentNotes,
          },
        });
      }
      await recalculateProject(tx, data.projectId);
      return { count: stages.length };
    });
  });
