"use server";

import { createServerFn } from "@tanstack/react-start";
import cloudinary from "~/lib/cloudinary";

export const uploadImage = createServerFn({ method: "POST" })
  .validator((input: { image: string; folder?: string; isRaw?: boolean }) => input)
  .handler(async ({ data }) => {
    try {
      const { image, folder = "robotics-erp", isRaw } = data;
      const dataLength = image?.length || 0;
      const dataPrefix = image ? image.slice(0, 40) : "";

      console.log("[uploadImage Server] Received upload request:", {
        dataLength,
        dataPrefix,
        folder,
        isRaw,
      });

      const isPdf =
        isRaw ||
        image.startsWith("data:application/pdf") ||
        image.includes("application/pdf") ||
        image.toLowerCase().includes(".pdf");

      console.log("[uploadImage Server] isPdf detected:", isPdf);

      if (isPdf) {
        const publicId = `${folder}/quotation_${Date.now()}.pdf`;
        const uploadParams = {
          resource_type: "raw" as const,
          public_id: publicId,
        };

        console.log("[uploadImage Server PDF] Calling cloudinary.uploader.upload with params:", {
          publicId,
          resource_type: uploadParams.resource_type,
          dataLength,
          dataPrefix,
        });

        const res = await cloudinary.uploader.upload(image, uploadParams);

        console.log("[uploadImage Server PDF] Cloudinary raw upload success:", {
          public_id: res.public_id,
          resource_type: res.resource_type,
          bytes: res.bytes,
          format: res.format,
          secure_url: res.secure_url,
        });

        return { url: res.secure_url };
      } else {
        const uploadParams = {
          folder,
          resource_type: "image" as const,
        };

        console.log("[uploadImage Server Photo] Calling cloudinary.uploader.upload with params:", uploadParams);

        const res = await cloudinary.uploader.upload(image, uploadParams);

        console.log("[uploadImage Server Photo] Cloudinary image upload success:", {
          public_id: res.public_id,
          resource_type: res.resource_type,
          format: res.format,
          bytes: res.bytes,
          secure_url: res.secure_url,
        });

        return { url: res.secure_url };
      }
    } catch (err: any) {
      console.error("[uploadImage Server] Cloudinary upload error:", err);
      throw new Error(`Upload failed: ${err?.message || String(err)}`);
    }
  });
