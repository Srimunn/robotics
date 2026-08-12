import { useState, useRef } from "react";
import { Camera, Upload, Loader2, CheckCircle2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadImage } from "~/server/upload";

export interface PhotoCaptureProps {
  onUploaded: (url: string) => void;
  folder?: string;
  label?: string;
  currentPhotoUrl?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function PhotoCapture({
  onUploaded,
  folder = "attendance",
  label = "Capture Photo",
  currentPhotoUrl,
  variant = "default",
  size = "default",
  className = "",
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentPhotoUrl || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreviewImage(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleConfirmUpload = async () => {
    if (!previewImage) return;

    setIsUploading(true);
    try {
      const res = await uploadImage({ data: { image: previewImage, folder } });
      if (res?.url) {
        setUploadedUrl(res.url);
        onUploaded(res.url);
        setPreviewImage(null);
        toast.success("Photo uploaded successfully to Cloudinary!");
      } else {
        toast.error("Failed to retrieve uploaded image URL");
      }
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      toast.error(err?.message || "Failed to upload image to Cloudinary");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewImage(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Hidden File Input with Camera capture attribute */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Trigger Button */}
      {!previewImage && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={variant}
            size={size}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 font-bold cursor-pointer transition-all"
          >
            <Camera className="h-4 w-4" />
            <span>{uploadedUrl ? "Change Photo" : label}</span>
          </Button>

          {uploadedUrl && (
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Uploaded</span>
            </div>
          )}
        </div>
      )}

      {/* Preview & Confirm Dialog Box */}
      {previewImage && (
        <div className="p-3 bg-slate-900/90 text-white rounded-xl border border-slate-700 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1 text-amber-400">
              <Camera className="h-3.5 w-3.5" /> Image Captured Preview
            </span>
            <button
              type="button"
              onClick={handleCancelPreview}
              disabled={isUploading}
              className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black flex justify-center max-h-48">
            <img src={previewImage} alt="Captured Preview" className="object-contain max-h-48" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 text-xs gap-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <RefreshCw className="h-3 w-3" /> Retake
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleConfirmUpload}
              disabled={isUploading}
              className="h-8 text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Upload to Cloudinary
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
