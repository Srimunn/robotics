"use server";

import { createServerFn } from "@tanstack/react-start";
import cloudinary from "~/lib/cloudinary";

export const uploadImage = createServerFn({ method: "POST" })
  .validator((input: { image: string; folder?: string; isRaw?: boolean }) => input)
  .handler(async ({ data }) => {
    try {
      const { image, folder = "robotics-erp", isRaw } = data;
      console.log("[uploadImage] Incoming upload request:", {
        folder,
        isRaw,
        imageType: typeof image,
        imageLength: image?.length,
        imagePrefix: image?.slice(0, 60),
      });

      const isPdf =
        isRaw ||
        image.startsWith("data:application/pdf") ||
        image.includes("application/pdf") ||
        image.toLowerCase().includes(".pdf");

      console.log("[uploadImage] isPdf detected:", isPdf);

      if (isPdf) {
        // Strip base64 data URI header if present and upload via upload_stream buffer
        const base64Clean = image.includes(",") ? image.split(",")[1] : image;
        const fileBuffer = Buffer.from(base64Clean, "base64");
        const publicId = `${folder}/quotation_${Date.now()}.pdf`;

        console.log("[uploadImage PDF] Prepared binary buffer:", {
          publicId,
          bufferByteLength: fileBuffer.length,
          magicBytesHex: fileBuffer.slice(0, 8).toString("hex"),
          magicBytesAscii: fileBuffer.slice(0, 5).toString("utf8"),
        });

        const res = await new Promise<any>((resolve, reject) => {
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
                resolve(result);
              }
            }
          );
          uploadStream.end(fileBuffer);
        });

        console.log("[uploadImage PDF] Cloudinary raw upload response:", {
          public_id: res.public_id,
          resource_type: res.resource_type,
          bytes: res.bytes,
          format: res.format,
          secure_url: res.secure_url,
        });

        return { url: res.secure_url };
      } else {
        console.log("[uploadImage Photo] Uploading standard image to Cloudinary...");
        const res = await cloudinary.uploader.upload(image, {
          folder,
          resource_type: "image",
        });

        console.log("[uploadImage Photo] Cloudinary image upload response:", {
          public_id: res.public_id,
          resource_type: res.resource_type,
          format: res.format,
          bytes: res.bytes,
          secure_url: res.secure_url,
        });

        return { url: res.secure_url };
      }
    } catch (err: any) {
      console.error("[uploadImage] Cloudinary upload error:", err);
      throw new Error(`Upload failed: ${err?.message || String(err)}`);
    }
  });
