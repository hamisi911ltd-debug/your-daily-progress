import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public reads. We use the service-role admin client behind a server fn
// so we can do explicit safe-column projection and avoid leaking PII.

const ListInput = z.object({
  search: z.string().trim().max(80).optional(),
  niche: z.string().trim().max(40).optional(),
}).partial();

export const listCreators = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("creator_profiles")
      .select("user_id, headline, hero_image_url, niche_tags, verified, average_rating, total_sessions, starting_price_kes")
      .eq("active", true)
      .order("verified", { ascending: false })
      .order("average_rating", { ascending: false })
      .limit(60);

    if (data.niche) query = query.contains("niche_tags", [data.niche]);

    const { data: creators, error } = await query;
    if (error) throw new Error(error.message);

    const userIds = creators?.map((c) => c.user_id) ?? [];
    if (userIds.length === 0) return { creators: [] as Array<any> };

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url, location")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    let merged = (creators ?? []).map((c) => {
      const p = profileMap.get(c.user_id);
      return {
        user_id: c.user_id,
        display_name: p?.display_name ?? "Creator",
        avatar_url: p?.avatar_url ?? null,
        location: p?.location ?? null,
        headline: c.headline,
        hero_image_url: c.hero_image_url,
        niche_tags: c.niche_tags ?? [],
        verified: c.verified,
        average_rating: Number(c.average_rating) || 0,
        total_sessions: c.total_sessions ?? 0,
        starting_price_kes: c.starting_price_kes ?? 0,
      };
    });

    if (data.search) {
      const q = data.search.toLowerCase();
      merged = merged.filter((c) =>
        c.display_name.toLowerCase().includes(q) ||
        c.headline.toLowerCase().includes(q) ||
        c.niche_tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return { creators: merged };
  });

const GetInput = z.object({ creatorId: z.string().uuid() });

export const getCreator = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GetInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: creator } = await supabaseAdmin
      .from("creator_profiles")
      .select("user_id, headline, long_bio, hero_image_url, niche_tags, verified, average_rating, total_sessions, starting_price_kes, active")
      .eq("user_id", data.creatorId)
      .maybeSingle();

    if (!creator || !creator.active) return { creator: null };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url, bio, location")
      .eq("id", data.creatorId)
      .maybeSingle();

    const { data: packages } = await supabaseAdmin
      .from("session_packages")
      .select("id, title, description, duration_minutes, price_kes")
      .eq("creator_id", data.creatorId)
      .eq("active", true)
      .order("price_kes", { ascending: true });

    const { data: reviews } = await supabaseAdmin
      .from("reviews")
      .select("id, rating, comment, created_at, fan_id")
      .eq("creator_id", data.creatorId)
      .order("created_at", { ascending: false })
      .limit(8);

    const fanIds = (reviews ?? []).map((r) => r.fan_id);
    const { data: fanProfiles } = fanIds.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", fanIds)
      : { data: [] as Array<any> };
    const fanMap = new Map((fanProfiles ?? []).map((f) => [f.id, f]));

    return {
      creator: {
        user_id: creator.user_id,
        display_name: profile?.display_name ?? "Creator",
        avatar_url: profile?.avatar_url ?? null,
        bio: profile?.bio ?? null,
        location: profile?.location ?? null,
        headline: creator.headline,
        long_bio: creator.long_bio,
        hero_image_url: creator.hero_image_url,
        niche_tags: creator.niche_tags ?? [],
        verified: creator.verified,
        average_rating: Number(creator.average_rating) || 0,
        total_sessions: creator.total_sessions ?? 0,
        starting_price_kes: creator.starting_price_kes ?? 0,
      },
      packages: packages ?? [],
      reviews: (reviews ?? []).map((r) => ({
        ...r,
        fan: fanMap.get(r.fan_id) ?? { display_name: "Fan", avatar_url: null },
      })),
    };
  });

export const getFeaturedCreators = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: creators } = await supabaseAdmin
    .from("creator_profiles")
    .select("user_id, headline, hero_image_url, niche_tags, verified, average_rating, total_sessions, starting_price_kes")
    .eq("active", true)
    .order("verified", { ascending: false })
    .order("average_rating", { ascending: false })
    .limit(8);

  const ids = (creators ?? []).map((c) => c.user_id);
  if (!ids.length) return { creators: [] };

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));

  return {
    creators: (creators ?? []).map((c) => ({
      user_id: c.user_id,
      display_name: map.get(c.user_id)?.display_name ?? "Creator",
      avatar_url: map.get(c.user_id)?.avatar_url ?? null,
      headline: c.headline,
      hero_image_url: c.hero_image_url,
      niche_tags: c.niche_tags ?? [],
      verified: c.verified,
      average_rating: Number(c.average_rating) || 0,
      total_sessions: c.total_sessions ?? 0,
      starting_price_kes: c.starting_price_kes ?? 0,
    })),
  };
});
