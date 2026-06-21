import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/cloudflare/auth-middleware";
import { d1One, d1All, d1Run } from "@/integrations/cloudflare/d1";

const Input = z.object({
  headline: z.string().trim().min(8).max(120),
  longBio: z.string().trim().min(20).max(2000),
  nicheTags: z.array(z.string().trim().min(2).max(24)).min(1).max(5),
  startingPriceKes: z.number().int().min(100).max(500_000),
});

export const becomeCreator = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    await d1Run(
      `INSERT INTO creator_profiles
         (user_id, headline, long_bio, niche_tags, starting_price_kes, active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         headline = excluded.headline,
         long_bio = excluded.long_bio,
         niche_tags = excluded.niche_tags,
         starting_price_kes = excluded.starting_price_kes,
         active = 1`,
      [userId, data.headline, data.longBio, JSON.stringify(data.nicheTags), data.startingPriceKes]
    );

    await d1Run(
      "INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'creator', datetime('now'))",
      [userId]
    );

    return { ok: true };
  });

const PackageInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(10).max(240),
  priceKes: z.number().int().min(100).max(500_000),
  // Every session is a live video call now — in-person/hybrid packages
  // are no longer offered, so this is always "online" regardless of input.
  active: z.boolean().optional(),
});

export const upsertPackage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => PackageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const id = data.id ?? crypto.randomUUID();

    await d1Run(
      `INSERT INTO session_packages
         (id, creator_id, title, description, duration_minutes, price_kes, session_type, location, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         duration_minutes = excluded.duration_minutes,
         price_kes = excluded.price_kes,
         session_type = excluded.session_type,
         location = excluded.location,
         active = excluded.active`,
      [
        id,
        userId,
        data.title,
        data.description ?? null,
        data.durationMinutes,
        data.priceKes,
        "online",
        null,
        data.active === false ? 0 : 1,
      ]
    );

    const minRow = await d1One<{ min_price: number }>(
      "SELECT MIN(price_kes) as min_price FROM session_packages WHERE creator_id = ? AND active = 1",
      [userId]
    );
    if (minRow?.min_price != null) {
      await d1Run(
        "UPDATE creator_profiles SET starting_price_kes = ? WHERE user_id = ?",
        [minRow.min_price, userId]
      );
    }

    return { ok: true };
  });

const HeroImageInput = z.object({
  heroImageUrl: z.string().trim().url().max(2_000_000),
});

export const updateCreatorHeroImage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => HeroImageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await d1Run(
      "UPDATE creator_profiles SET hero_image_url = ? WHERE user_id = ?",
      [data.heroImageUrl, userId]
    );
    return { ok: true };
  });

export const getMyCreatorProfile = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const profile = await d1One("SELECT * FROM creator_profiles WHERE user_id = ?", [userId]);
    const packages = await d1All(
      "SELECT * FROM session_packages WHERE creator_id = ? ORDER BY created_at DESC",
      [userId]
    );
    const roles = await d1All<{ role: string }>(
      "SELECT role FROM user_roles WHERE user_id = ?",
      [userId]
    );

    return {
      isCreator: !!profile,
      hasCreatorRole: (roles ?? []).some((r) => r.role === "creator"),
      profile: profile as any,
      packages: (packages ?? []) as any[],
    };
  });

const ProfileUpdateInput = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  location: z.string().trim().max(120).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ProfileUpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const sets: string[] = [];
    const params: unknown[] = [];
    if (data.displayName) { sets.push("display_name = ?"); params.push(data.displayName); }
    if (data.bio !== undefined) { sets.push("bio = ?"); params.push(data.bio); }
    if (data.location !== undefined) { sets.push("location = ?"); params.push(data.location); }
    if (data.avatarUrl !== undefined) { sets.push("avatar_url = ?"); params.push(data.avatarUrl); }
    if (!sets.length) return { ok: true };

    params.push(userId);
    await d1Run(`UPDATE profiles SET ${sets.join(", ")} WHERE id = ?`, params);

    // Keep users table in sync for JWT refresh
    const userSets: string[] = [];
    const userParams: unknown[] = [];
    if (data.displayName) { userSets.push("display_name = ?"); userParams.push(data.displayName); }
    if (data.avatarUrl !== undefined) { userSets.push("avatar_url = ?"); userParams.push(data.avatarUrl); }
    if (userSets.length) {
      userParams.push(userId);
      await d1Run(`UPDATE users SET ${userSets.join(", ")} WHERE id = ?`, userParams);
    }

    return { ok: true };
  });
