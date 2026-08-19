"use server";

import { createServerFn } from "@tanstack/react-start";
import cloudinary from "~/lib/cloudinary";

export const uploadImage = createServerFn({ method: "POST" })
  .validator((input: { image: string; folder?: string; isRaw?: boolean }) => input)
  .handler(async ({ data }) => {
    try {
      const { image, folder = "robotics-erp", isRaw } = data;
      const isPdf =
        isRaw ||
        image.startsWith("data:application/pdf") ||
        image.includes("application/pdf") ||
        image.toLowerCase().includes(".pdf");

      if (isPdf) {
        // Strip base64 data URI header if present and upload via upload_stream buffer
        const base64Clean = image.replace(/^data:[^;]+;base64,/, "");
        const fileBuffer = Buffer.from(base64Clean, "base64");
        const publicId = `${folder}/quotation_${Date.now()}.pdf`;

        const res = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "raw",
              public_id: publicId,
            },
            (error, result) => {
              if (error || !result) {
                console.error("[uploadImage] Cloudinary upload_stream error:", error);
                reject(error || new Error("Cloudinary upload_stream failed"));
              } else {
                resolve({ secure_url: result.secure_url });
              }
            }
          );
          uploadStream.end(fileBuffer);
        });

        return { url: res.secure_url };
      } else {
        const res = await cloudinary.uploader.upload(image, {
          folder,
          resource_type: "image",
        });
        return { url: res.secure_url };
      }
    } catch (err: any) {
      console.error("[uploadImage] Cloudinary upload error:", err);
      throw new Error(`Upload failed: ${err?.message || String(err)}`);
    }
  });
