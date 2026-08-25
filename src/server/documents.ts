"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { generateSafeId } from "./utils";
import { assertCanEdit } from "./permissions";

export const listDocuments = createServerFn({ method: "GET" }).handler(async () => {
  return db.projectDocument.findMany({ orderBy: { uploadedAt: "desc" } });
});

const docInput = z.object({
  projectId: z.string(),
  projectName: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  category: z.string(),
  title: z.string(),
  fileUrl: z.string(),
  uploadedBy: z.string(),
  fileSize: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  requestedByRole: z.string().optional().nullable(),
  requestedBySubRole: z.string().optional().nullable(),
});

export const addDocument = createServerFn({ method: "POST" })
  .validator((input: unknown) => docInput.parse(input))
  .handler(async ({ data }) => {
    assertCanEdit(data);
    const year = new Date().getFullYear();
    const id = await generateSafeId(db.projectDocument, `DOC-${year}`);
    return db.projectDocument.create({
      data: {
        id,
        projectId: data.projectId,
        projectName: data.projectName ?? undefined,
        customerName: data.customerName ?? undefined,
        category: data.category,
        title: data.title,
        fileUrl: data.fileUrl,
        uploadedBy: data.uploadedBy,
        fileSize: data.fileSize ?? undefined,
        notes: data.notes ?? undefined,
      },
    });
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .validator((input: { id: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    await db.projectDocument.delete({ where: { id: data.id } });
    return { ok: true };
  });

