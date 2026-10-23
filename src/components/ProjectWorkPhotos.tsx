import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PhotoCapture } from "@/components/PhotoCapture";
import type { CurrentUser } from "@/lib/robotics-types";
import {
  combineWorkPhotos,
  MAX_PROJECT_PHOTOS,
  MAX_PHOTO_CAPTION_LENGTH,
  type PhotoStage,
  type WorkPhoto,
} from "@/lib/work-photos";
import {
  listProjectPhotos,
  addProjectPhoto,
  updateProjectPhotoCaption,
  deleteProjectPhoto,
} from "~/server/project-photos";

interface ProjectWorkPhotosProps {
  project: { id: string; beforeWorkPhotoUrl?: string; afterWorkPhotoUrl?: string };
  canEdit: boolean;
  currentUser: CurrentUser | null;
  /** Removes the original single photo stored on the project (same behaviour as before). */
  onRemoveOriginal: (stage: PhotoStage) => void;
}

const STAGE_STYLE: Record<
  PhotoStage,
  {
    box: string;
    title: string;
    badge: string;
    dashed: string;
    border: string;
    heading: string;
    empty: string;
    hint: string;
  }
> = {
  Before: {
    box: "border-amber-200 bg-amber-50/40 dark:bg-amber-950/20",
    title: "text-amber-900 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    dashed: "border-amber-300 dark:border-amber-700/60",
    border: "border-amber-300",
    heading: "1. Before Work Photos (Initial Condition)",
    empty: "No Before Work Photos Uploaded",
    hint: "Pre-servicing condition images.",
  },
  After: {
    box: "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20",
    title: "text-emerald-900 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    dashed: "border-emerald-300 dark:border-emerald-700/60",
    border: "border-emerald-300",
    heading: "2. After Work Photos (Completed Finish)",
    empty: "No After Work Photos Uploaded",
    hint: "Post-servicing completed work verification images.",
  },
};

export function ProjectWorkPhotos({
  project,
  canEdit,
  currentUser,
  onRemoveOriginal,
}: ProjectWorkPhotosProps) {
  const queryClient = useQueryClient();
  const queryKey = ["projectPhotos", project.id];
  const photosQuery = useQuery({
    queryKey,
    queryFn: () => listProjectPhotos({ data: { projectId: project.id } }),
  });

  const extra = (photosQuery.data?.photos ?? []) as WorkPhoto[];
  const available = photosQuery.data?.available ?? false;
  const { before, after } = combineWorkPhotos(project, extra);
  const total = before.length + after.length;
  const atLimit = total >= MAX_PROJECT_PHOTOS;

  const meta = { requestedByRole: currentUser?.role, requestedBySubRole: currentUser?.subRole };
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const handleAdd = async (stage: PhotoStage, url: string, caption: string) => {
    try {
      await addProjectPhoto({
        data: {
          projectId: project.id,
          stage,
          url,
          caption: caption || null,
          uploadedBy: currentUser?.name ?? null,
          ...meta,
        },
      });
      toast.success(`${stage} Work Photo added`);
    } catch (err) {
      toast.error((err as Error).message || "Failed to add photo");
    } finally {
      refresh();
    }
  };

  const handleRemove = async (photo: WorkPhoto) => {
    if (!window.confirm(`Remove this ${photo.stage} Work photo?`)) return;
    if (photo.id === null) {
      onRemoveOriginal(photo.stage);
      return;
    }
    try {
      await deleteProjectPhoto({
        data: { id: photo.id, actor: currentUser?.name ?? null, ...meta },
      });
      toast.success(`${photo.stage} Work photo removed`);
    } catch (err) {
      toast.error((err as Error).message || "Failed to remove photo");
    } finally {
      refresh();
    }
  };

  const handleCaption = async (photo: WorkPhoto, caption: string) => {
    if (photo.id === null || (photo.caption ?? "") === caption.trim()) return;
    try {
      await updateProjectPhotoCaption({ data: { id: photo.id, caption, ...meta } });
      toast.success("Caption saved");
    } catch (err) {
      toast.error((err as Error).message || "Failed to save caption");
    } finally {
      refresh();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>
          {total} of {MAX_PROJECT_PHOTOS} photos used
        </span>
        {photosQuery.isLoading && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading photos...
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(["Before", "After"] as PhotoStage[]).map((stage) => (
          <StageGallery
            key={stage}
            stage={stage}
            photos={stage === "Before" ? before : after}
            canEdit={canEdit}
            canAdd={canEdit && available && !atLimit}
            atLimit={atLimit}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onCaption={handleCaption}
          />
        ))}
      </div>
    </div>
  );
}

function StageGallery({
  stage,
  photos,
  canEdit,
  canAdd,
  atLimit,
  onAdd,
  onRemove,
  onCaption,
}: {
  stage: PhotoStage;
  photos: WorkPhoto[];
  canEdit: boolean;
  canAdd: boolean;
  atLimit: boolean;
  onAdd: (stage: PhotoStage, url: string, caption: string) => Promise<void>;
  onRemove: (photo: WorkPhoto) => void;
  onCaption: (photo: WorkPhoto, caption: string) => void;
}) {
  const s = STAGE_STYLE[stage];
  const [newCaption, setNewCaption] = useState("");
  // Remount PhotoCapture after each upload so the button reads "Add Photo" again.
  const [captureKey, setCaptureKey] = useState(0);
  const Icon = stage === "Before" ? Camera : CheckCircle2;

  return (
    <div
      className={`p-3.5 rounded-xl border space-y-3 ${s.box}`}
      data-testid={`work-photos-${stage.toLowerCase()}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-extrabold flex items-center gap-1.5 ${s.title}`}>
          {s.heading}
        </span>
        {photos.length > 0 && (
          <Badge className={`text-[9px] font-bold ${s.badge}`}>
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </Badge>
        )}
      </div>

      {photos.length === 0 ? (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center space-y-1 bg-white dark:bg-card ${s.dashed}`}
        >
          <Icon
            className={`h-8 w-8 mx-auto ${stage === "Before" ? "text-amber-500" : "text-emerald-500"}`}
          />
          <p className={`text-xs font-bold ${s.title}`}>{s.empty}</p>
          <p className="text-[10px] text-muted-foreground">{s.hint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo, idx) => (
            <div
              key={photo.id ?? `original-${idx}`}
              className={`rounded-lg overflow-hidden border bg-white dark:bg-card shadow-2xs ${s.border}`}
            >
              <div className="relative group">
                <img
                  src={photo.url}
                  alt={photo.caption || `${stage} work photo ${idx + 1}`}
                  className="w-full h-28 object-cover cursor-pointer"
                  onClick={() => window.open(photo.url, "_blank", "noopener")}
                />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onRemove(photo)}
                    className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white rounded-md p-1 cursor-pointer"
                    title="Remove photo"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              {(photo.caption || (photo.id !== null && canEdit)) && (
                <div className="p-1.5">
                  {photo.id !== null && canEdit ? (
                    <Input
                      defaultValue={photo.caption ?? ""}
                      maxLength={MAX_PHOTO_CAPTION_LENGTH}
                      placeholder="Add caption (optional)"
                      className="h-7 text-[11px] px-2"
                      onBlur={(e) => onCaption(photo, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                    />
                  ) : (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate min-h-[1rem]">
                      {photo.caption}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="space-y-2 pt-1">
          <Input
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            maxLength={MAX_PHOTO_CAPTION_LENGTH}
            placeholder="Caption for next photo (optional), e.g. Pump room"
            className="h-8 text-xs bg-white dark:bg-card"
          />
          <PhotoCapture
            key={captureKey}
            folder="project-work"
            label={`Add ${stage} Photo`}
            onUploaded={async (url) => {
              await onAdd(stage, url, newCaption.trim());
              setNewCaption("");
              setCaptureKey((k) => k + 1);
            }}
            className="flex justify-center"
          />
        </div>
      )}
      {canEdit && atLimit && (
        <p className="text-[10px] text-muted-foreground text-center">
          Photo limit of {MAX_PROJECT_PHOTOS} per project reached. Remove a photo to add another.
        </p>
      )}
    </div>
  );
}
