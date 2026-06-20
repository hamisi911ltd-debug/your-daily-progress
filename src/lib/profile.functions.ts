import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { d1One, d1Run } from "@/integrations/cloudflare/d1";
import { requireAuth } from "@/integrations/cloudflare/auth-middleware";
import { signJWT } from "@/integrations/cloudflare/auth.server";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const row = await d1One<{
      id: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      location: string | null;
      instagram_url: string | null;
      tiktok_url: string | null;
      snapchat_url: string | null;
      facebook_url: string | null;
    }>(
      `SELECT id, display_name, avatar_url, bio, location,
              instagram_url, tiktok_url, snapchat_url, facebook_url
       FROM profiles WHERE id = ?`,
      [context.userId]
    );
    return { profile: row };
  });

const UpdateProfileInput = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  location: z.string().trim().max(100).optional(),
  avatarUrl: z.string().max(500000).optional(), // base64 data URL
  instagramUrl: z.string().trim().max(200).optional(),
  tiktokUrl: z.string().trim().max(200).optional(),
  snapchatUrl: z.string().trim().max(200).optional(),
  facebookUrl: z.string().trim().max(200).optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => UpdateProfileInput.parse(d))
  .handler(async ({ data, context }) => {
    if (data.displayName) {
      await d1Run("UPDATE users SET display_name = ? WHERE id = ?", [
        data.displayName,
        context.userId,
      ]);
    }
    if (data.avatarUrl !== undefined) {
      await d1Run("UPDATE users SET avatar_url = ? WHERE id = ?", [
        data.avatarUrl || null,
        context.userId,
      ]);
    }

    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.displayName !== undefined) { sets.push("display_name = ?"); vals.push(data.displayName); }
    if (data.bio !== undefined) { sets.push("bio = ?"); vals.push(data.bio || null); }
    if (data.location !== undefined) { sets.push("location = ?"); vals.push(data.location || null); }
    if (data.avatarUrl !== undefined) { sets.push("avatar_url = ?"); vals.push(data.avatarUrl || null); }
    if (data.instagramUrl !== undefined) { sets.push("instagram_url = ?"); vals.push(data.instagramUrl || null); }
    if (data.tiktokUrl !== undefined) { sets.push("tiktok_url = ?"); vals.push(data.tiktokUrl || null); }
    if (data.snapchatUrl !== undefined) { sets.push("snapchat_url = ?"); vals.push(data.snapchatUrl || null); }
    if (data.facebookUrl !== undefined) { sets.push("facebook_url = ?"); vals.push(data.facebookUrl || null); }

    if (sets.length > 0) {
      vals.push(context.userId);
      await d1Run(`UPDATE profiles SET ${sets.join(", ")} WHERE id = ?`, vals);
    }

    // Re-issue JWT with updated info
    const user = await d1One<{
      display_name: string;
      avatar_url: string | null;
    }>("SELECT display_name, avatar_url FROM users WHERE id = ?", [context.userId]);

    const roles = (
      await import("@/integrations/cloudflare/d1").then(({ d1All }) =>
        d1All<{ role: string }>("SELECT role FROM user_roles WHERE user_id = ?", [context.userId])
      )
    ).map((r) => r.role);

    const token = signJWT({
      sub: context.userId,
      email: context.email,
      name: user?.display_name ?? context.name,
      avatar_url: user?.avatar_url ?? undefined,
      roles,
    });

    return { token };
  });
