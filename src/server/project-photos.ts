"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { assertCanEdit } from "./permissions";
import {
  MAX_PROJECT_PHOTOS,
  MAX_PHOTO_CAPTION_LENGTH as MAX_CAPTION_LENGTH,
  type WorkPhoto,
} from "~/lib/work-photos";

/** True when the ProjectPhoto table has not been created yet (migration not applied). */
function isMissingTableError(err: unknown) {
  const e = err as { code?: string; message?: string };
  return e?.code === "P2021" || /ProjectPhoto.*does not exist/i.test(e?.message || "");
}

/**
 * Extra photos for the given projects, grouped by project id.
 * Returns an empty map (instead of failing) when the ProjectPhoto table does not exist yet,
 * so screens and PDFs keep showing the original single photos.
 */
export async function fetchExtraPhotos(
  projectIds: string[],
): Promise<{ available: boolean; byProject: Map<string, WorkPhoto[]> }> {
  const byProject = new Map<string, WorkPhoto[]>();
  if (projectIds.length === 0) return { available: true, byProject };
  try {
    const rows = await db.projectPhoto.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "asc" },
    });
    for (const r of rows) {
      const list = byProject.get(r.projectId) ?? [];
      list.push({
        id: r.id,
        stage: r.stage === "After" ? "After" : "Before",
        url: r.url,
        caption: r.caption,
      });
      byProject.set(r.projectId, list);
    }
    return { available: true, byProject };
  } catch (err) {
    if (isMissingTableError(err)) {
      console.warn("[project-photos] ProjectPhoto table not found; showing original photos only");
      return { available: false, byProject };
    }
    throw err;
  }
}

export const listProjectPhotos = createServerFn({ method: "POST" })
  .validator((input: { projectId: string }) => input)
  .handler(async ({ data }) => {
    const { available, byProject } = await fetchExtraPhotos([data.projectId]);
    return { available, photos: byProject.get(data.projectId) ?? [] };
  });

const addInput = z.object({
  projectId: z.string(),
  stage: z.enum(["Before", "After"]),
  url: z.string().min(1),
  caption: z.string().max(MAX_CAPTION_LENGTH).optional().nullable(),
  uploadedBy: z.string().optional().nullable(),
  requestedByRole: z.string().optional().nullable(),
  requestedBySubRole: z.string().optional().nullable(),
});

export const addProjectPhoto = createServerFn({ method: "POST" })
  .validator((input: unknown) => addInput.parse(input))
  .handler(async ({ data }) => {
    assertCanEdit(data);
    try {
      return await db.$transaction(async (tx) => {
        const project = await tx.project.findUnique({
          where: { id: data.projectId },
          select: { beforeWorkPhotoUrl: true, afterWorkPhotoUrl: true },
        });
        if (!project) throw new Error("Project not found");
        const legacyCount =
          (project.beforeWorkPhotoUrl ? 1 : 0) + (project.afterWorkPhotoUrl ? 1 : 0);
        const extraCount = await tx.projectPhoto.count({ where: { projectId: data.projectId } });
        if (legacyCount + extraCount >= MAX_PROJECT_PHOTOS) {
          throw new Error(
            `This project already has ${MAX_PROJECT_PHOTOS} photos, which is the limit`,
          );
        }
        const caption = data.caption?.trim() || null;
        const created = await tx.projectPhoto.create({
          data: {
            projectId: data.projectId,
            stage: data.stage,
            url: data.url,
            caption,
            uploadedBy: data.uploadedBy ?? null,
          },
        });
        await tx.projectActivity.create({
          data: {
            projectId: data.projectId,
            event: `${data.stage} Work Photo Added`,
            details: caption ? `Photo added: ${caption}` : "Photo added",
            actor: data.uploadedBy || "System",
          },
        });
        return created;
      });
    } catch (err) {
      if (isMissingTableError(err))
        throw new Error("Adding more photos is not available yet. Please try again later.");
      throw err;
    }
  });

export const updateProjectPhotoCaption = createServerFn({ method: "POST" })
  .validator(
    (input: {
      id: string;
      caption: string | null;
      requestedByRole?: string | null;
      requestedBySubRole?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    assertCanEdit(data);
    const caption = (data.caption ?? "").trim().slice(0, MAX_CAPTION_LENGTH) || null;
    return db.projectPhoto.update({ where: { id: data.id }, data: { caption } });
  });

export const deleteProjectPhoto = createServerFn({ method: "POST" })
  .validator(
    (input: {
      id: string;
      actor?: string | null;
      requestedByRole?: string | null;
      requestedBySubRole?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    assertCanEdit(data);
    await db.$transaction(async (tx) => {
      const photo = await tx.projectPhoto.delete({ where: { id: data.id } });
      await tx.projectActivity.create({
        data: {
          projectId: photo.projectId,
          event: `${photo.stage} Work Photo Removed`,
          details: photo.caption ? `Photo removed: ${photo.caption}` : "Photo removed",
          actor: data.actor || "System",
        },
      });
    });
    return { ok: true };
  });
