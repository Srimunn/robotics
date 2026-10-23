/** Max work photos per project, Before and After together, including the original single photos. */
export const MAX_PROJECT_PHOTOS = 10;
export const MAX_PHOTO_CAPTION_LENGTH = 120;

export type PhotoStage = "Before" | "After";

export interface WorkPhoto {
  /** null for the original single photo stored on the Project row */
  id: string | null;
  stage: PhotoStage;
  url: string;
  caption: string | null;
}

/** All work photos of a project: the original single photo first, then the added ones in upload order. */
export function combineWorkPhotos(
  project: { beforeWorkPhotoUrl?: string | null; afterWorkPhotoUrl?: string | null },
  extra: WorkPhoto[] = [],
): { before: WorkPhoto[]; after: WorkPhoto[] } {
  const before: WorkPhoto[] = [];
  const after: WorkPhoto[] = [];
  if (project.beforeWorkPhotoUrl)
    before.push({ id: null, stage: "Before", url: project.beforeWorkPhotoUrl, caption: null });
  if (project.afterWorkPhotoUrl)
    after.push({ id: null, stage: "After", url: project.afterWorkPhotoUrl, caption: null });
  for (const p of extra) (p.stage === "After" ? after : before).push(p);
  return { before, after };
}
