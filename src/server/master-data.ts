"use server";

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "~/lib/db";
import { assertCanEdit } from "./permissions";

export const listMasterData = createServerFn({ method: "GET" }).handler(async () => {
  return db.masterDataItem.findMany({ orderBy: [{ category: "asc" }, { value: "asc" }] });
});

export const listMasterDataByCategory = createServerFn({ method: "GET" })
  .validator((input: { category: string }) => input)
  .handler(async ({ data }) => {
    return db.masterDataItem.findMany({
      where: { category: data.category },
      orderBy: { value: "asc" },
    });
  });

export const addMasterDataItem = createServerFn({ method: "POST" })
  .validator((input: { category: string; value: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    const category = data.category;
    const value = data.value.trim();
    if (!value) throw new Error("Value required");

    const existing = await db.masterDataItem.findUnique({
      where: { category_value: { category, value } },
    });
    if (existing) {
      if (!existing.isActive) {
        return db.masterDataItem.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      return existing;
    }

    const id = `MD-${category.slice(0, 3).toUpperCase()}-${Date.now()}`;
    return db.masterDataItem.create({
      data: { id, category, value, isActive: true, isDefault: false },
    });
  });

export const updateMasterDataItem = createServerFn({ method: "POST" })
  .validator((input: { id: string; value: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    return db.masterDataItem.update({
      where: { id: data.id },
      data: { value: data.value.trim() },
    });
  });

export const deleteMasterDataItem = createServerFn({ method: "POST" })
  .validator((input: { id: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    await db.masterDataItem.delete({ where: { id: data.id } });
    return { ok: true };
  });

export const toggleMasterDataItemActive = createServerFn({ method: "POST" })
  .validator((input: { id: string; requestedByRole?: string | null; requestedBySubRole?: string | null }) => input)
  .handler(async ({ data }) => {
    assertCanEdit(data);
    const item = await db.masterDataItem.findUnique({ where: { id: data.id } });
    if (!item) throw new Error("Item not found");
    return db.masterDataItem.update({
      where: { id: data.id },
      data: { isActive: !item.isActive },
    });
  });

