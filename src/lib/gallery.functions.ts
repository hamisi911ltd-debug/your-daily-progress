import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { d1All, d1One, d1Run } from "@/integrations/cloudflare/d1";
import { requireAuth } from "@/integrations/cloudflare/auth-middleware";

export const getCreatorGallery = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ creatorId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const rows = await d1All<{
      id: string;
      image_url: string;
      caption: string | null;
      created_at: string;
    }>(
      `SELECT id, image_url, caption, created_at
       FROM creator_gallery
       WHERE creator_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [data.creatorId]
    );
    return { photos: rows };
  });

export const getMyGallery = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const rows = await d1All<{
      id: string;
      image_url: string;
      caption: string | null;
      created_at: string;
    }>(
      `SELECT id, image_url, caption, created_at
       FROM creator_gallery
       WHERE creator_id = ?
       ORDER BY created_at DESC`,
      [context.userId]
    );
    return { photos: rows };
  });

const AddPhotoInput = z.object({
  imageUrl: z.string().min(1).max(5000000), // base64 data URL
  caption: z.string().trim().max(200).optional(),
});

export const addGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => AddPhotoInput.parse(d))
  .handler(async ({ data, context }) => {
    // Verify user is a creator
    const isCreator = await d1One(
      "SELECT 1 FROM creator_profiles WHERE user_id = ?",
      [context.userId]
    );
    if (!isCreator) throw new Error("Only creators can add gallery photos");

    const count = await d1One<{ n: number }>(
      "SELECT COUNT(*) as n FROM creator_gallery WHERE creator_id = ?",
      [context.userId]
    );
    if ((count?.n ?? 0) >= 30) throw new Error("Gallery limit of 30 photos reached");

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await d1Run(
      "INSERT INTO creator_gallery (id, creator_id, image_url, caption, created_at) VALUES (?, ?, ?, ?, ?)",
      [id, context.userId, data.imageUrl, data.caption ?? null, now]
    );
    return { id };
  });

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ photoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const photo = await d1One(
      "SELECT id FROM creator_gallery WHERE id = ? AND creator_id = ?",
      [data.photoId, context.userId]
    );
    if (!photo) throw new Error("Photo not found");
    await d1Run("DELETE FROM creator_gallery WHERE id = ?", [data.photoId]);
    return { ok: true };
  });
