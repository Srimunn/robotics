"use server";

import { createServerFn } from "@tanstack/react-start";
import cloudinary from "~/lib/cloudinary";

export const uploadImage = createServerFn({ method: "POST" })
  .validator((input: { image: string; folder?: string }) => input)
  .handler(async ({ data }) => {
    const { image, folder = "robotics-erp" } = data;
    const res = await cloudinary.uploader.upload(image, {
      folder,
      resource_type: "auto",
    });
    return { url: res.secure_url };
  });
