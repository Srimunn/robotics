import type { Prisma } from "@prisma/client";
import { allocateToStages, computePaymentStatus } from "./calculations";

/** Recalculate one project's receivedAmount, balance, stage allocations, payment status, and possibly project status.
 *  Call this INSIDE a transaction after any payment / stage / value change. */
export async function recalculateProject(
  tx: Prisma.TransactionClient,
  projectId: string
): Promise<void> {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    include: { paymentStages: { orderBy: { dueDate: "asc" } }, payments: true },
  });
  if (!project) return;

  const settings = await tx.systemSettings.findUnique({ where: { id: "singleton" } });

  const totalReceived = project.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const projectValue = Number(project.projectValue);
  const balance = Math.max(0, projectValue - totalReceived);

  const allocations = allocateToStages(
    totalReceived,
    project.paymentStages.map((s) => ({ id: s.id, amount: Number(s.amount), dueDate: s.dueDate }))
  );

  for (const alloc of allocations) {
    await tx.paymentStageItem.update({
      where: { id: alloc.id },
      data: { paidAmount: alloc.paidAmount, status: alloc.status },
    });
  }

  const paymentStatus = computePaymentStatus(
    projectValue,
    totalReceived,
    project.workCommittedDate,
    project.paymentStages.map((s) => ({
      dueDate: s.dueDate,
      amount: Number(s.amount),
      paidAmount: s.paidAmount ? Number(s.paidAmount) : 0,
    }))
  );

  let newStatus = project.status;
  if (
    settings?.autoUpdateProjectStatusOnPayment &&
    paymentStatus === "Paid" &&
    project.status === "Ongoing"
  ) {
    newStatus = "Completed";
  }

  await tx.project.update({
    where: { id: projectId },
    data: {
      receivedAmount: totalReceived,
      balanceAmount: balance,
      paymentStatus,
      status: newStatus,
    },
  });
}
