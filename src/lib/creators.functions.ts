import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ListInput = z
  .object({
    search: z.string().trim().max(80).optional(),
    niche: z.string().trim().max(40).optional(),
  })
  .partial();

export const listCreators = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { d1All } = await import("@/integrations/cloudflare/d1");

    type Row = {
      user_id: string;
      headline: string;
      hero_image_url: string | null;
      niche_tags: string;
      verified: number;
      average_rating: number;
      total_sessions: number;
      starting_price_kes: number;
      display_name: string | null;
      avatar_url: string | null;
      location: string | null;
    };

    const rows = await d1All<Row>(
      data.niche
        ? `SELECT cp.user_id, cp.headline, cp.hero_image_url, cp.niche_tags, cp.verified,
                  cp.average_rating, cp.total_sessions, cp.starting_price_kes,
                  p.display_name, p.avatar_url, p.location
           FROM creator_profiles cp
           LEFT JOIN profiles p ON p.id = cp.user_id
           WHERE cp.active = 1
             AND EXISTS (SELECT 1 FROM json_each(cp.niche_tags) je WHERE je.value = ?)
           ORDER BY cp.verified DESC, cp.average_rating DESC
           LIMIT 60`
        : `SELECT cp.user_id, cp.headline, cp.hero_image_url, cp.niche_tags, cp.verified,
                  cp.average_rating, cp.total_sessions, cp.starting_price_kes,
                  p.display_name, p.avatar_url, p.location
           FROM creator_profiles cp
           LEFT JOIN profiles p ON p.id = cp.user_id
           WHERE cp.active = 1
           ORDER BY cp.verified DESC, cp.average_rating DESC
           LIMIT 60`,
      data.niche ? [data.niche] : []
    );

    let merged = rows.map((c) => ({
      user_id: c.user_id,
      display_name: c.display_name ?? "Creator",
      avatar_url: c.avatar_url ?? null,
      location: c.location ?? null,
      headline: c.headline,
      hero_image_url: c.hero_image_url ?? null,
      niche_tags: (typeof c.niche_tags === "string" ? JSON.parse(c.niche_tags) : c.niche_tags ?? []) as string[],
      verified: c.verified === 1,
      average_rating: Number(c.average_rating) || 0,
      total_sessions: c.total_sessions ?? 0,
      starting_price_kes: c.starting_price_kes ?? 0,
    }));

    if (data.search) {
      const q = data.search.toLowerCase();
      merged = merged.filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          c.headline.toLowerCase().includes(q) ||
          c.niche_tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    return { creators: merged };
  });

const GetInput = z.object({ creatorId: z.string().uuid() });

export const getCreator = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GetInput.parse(d))
  .handler(async ({ data }) => {
    const { d1One, d1All } = await import("@/integrations/cloudflare/d1");

    type CreatorRow = {
      user_id: string;
      headline: string;
      long_bio: string | null;
      hero_image_url: string | null;
      niche_tags: string;
      verified: number;
      average_rating: number;
      total_sessions: number;
      starting_price_kes: number;
      active: number;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      location: string | null;
    };

    const creator = await d1One<CreatorRow>(
      `SELECT cp.user_id, cp.headline, cp.long_bio, cp.hero_image_url, cp.niche_tags, cp.verified,
              cp.average_rating, cp.total_sessions, cp.starting_price_kes, cp.active,
              p.display_name, p.avatar_url, p.bio, p.location
       FROM creator_profiles cp
       LEFT JOIN profiles p ON p.id = cp.user_id
       WHERE cp.user_id = ? AND cp.active = 1`,
      [data.creatorId]
    );
    if (!creator) return { creator: null };

    const packages = await d1All(
      `SELECT id, title, description, duration_minutes, price_kes, session_type, location
       FROM session_packages
       WHERE creator_id = ? AND active = 1
       ORDER BY price_kes ASC`,
      [data.creatorId]
    );

    type ReviewRow = {
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      fan_id: string;
      fan_name: string | null;
      fan_avatar: string | null;
    };

    const reviews = await d1All<ReviewRow>(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.fan_id,
              p.display_name as fan_name, p.avatar_url as fan_avatar
       FROM reviews r
       LEFT JOIN profiles p ON p.id = r.fan_id
       WHERE r.creator_id = ?
       ORDER BY r.created_at DESC
       LIMIT 8`,
      [data.creatorId]
    );

    return {
      creator: {
        user_id: creator.user_id,
        display_name: creator.display_name ?? "Creator",
        avatar_url: creator.avatar_url ?? null,
        bio: creator.bio ?? null,
        location: creator.location ?? null,
        headline: creator.headline,
        long_bio: creator.long_bio,
        hero_image_url: creator.hero_image_url,
        niche_tags: (typeof creator.niche_tags === "string"
          ? JSON.parse(creator.niche_tags)
          : creator.niche_tags ?? []) as string[],
        verified: creator.verified === 1,
        average_rating: Number(creator.average_rating) || 0,
        total_sessions: creator.total_sessions ?? 0,
        starting_price_kes: creator.starting_price_kes ?? 0,
      },
      packages: (packages ?? []) as any[],
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        fan_id: r.fan_id,
        fan: { display_name: r.fan_name ?? "Fan", avatar_url: r.fan_avatar },
      })),
    };
  });

export const getFeaturedCreators = createServerFn({ method: "GET" }).handler(async () => {
  const { d1All } = await import("@/integrations/cloudflare/d1");

  type Row = {
    user_id: string;
    headline: string;
    hero_image_url: string | null;
    niche_tags: string;
    verified: number;
    average_rating: number;
    total_sessions: number;
    starting_price_kes: number;
    display_name: string | null;
    avatar_url: string | null;
  };

  const rows = await d1All<Row>(
    `SELECT cp.user_id, cp.headline, cp.hero_image_url, cp.niche_tags, cp.verified,
            cp.average_rating, cp.total_sessions, cp.starting_price_kes,
            p.display_name, p.avatar_url
     FROM creator_profiles cp
     LEFT JOIN profiles p ON p.id = cp.user_id
     WHERE cp.active = 1
     ORDER BY cp.verified DESC, cp.average_rating DESC
     LIMIT 8`
  );

  return {
    creators: rows.map((c) => ({
      user_id: c.user_id,
      display_name: c.display_name ?? "Creator",
      avatar_url: c.avatar_url ?? null,
      headline: c.headline,
      hero_image_url: c.hero_image_url ?? null,
      niche_tags: (typeof c.niche_tags === "string" ? JSON.parse(c.niche_tags) : c.niche_tags ?? []) as string[],
      verified: c.verified === 1,
      average_rating: Number(c.average_rating) || 0,
      total_sessions: c.total_sessions ?? 0,
      starting_price_kes: c.starting_price_kes ?? 0,
    })),
  };
});
