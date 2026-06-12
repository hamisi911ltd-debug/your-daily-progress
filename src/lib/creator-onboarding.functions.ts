import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  headline: z.string().trim().min(8).max(120),
  longBio: z.string().trim().min(20).max(2000),
  nicheTags: z.array(z.string().trim().min(2).max(24)).min(1).max(5),
  startingPriceKes: z.number().int().min(100).max(500_000),
});

export const becomeCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error: cpErr } = await supabase
      .from("creator_profiles")
      .upsert({
        user_id: userId,
        headline: data.headline,
        long_bio: data.longBio,
        niche_tags: data.nicheTags,
        starting_price_kes: data.startingPriceKes,
        active: true,
      });
    if (cpErr) throw new Error(cpErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "creator" }, { onConflict: "user_id,role" });

    return { ok: true };
  });

const PackageInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(10).max(240),
  priceKes: z.number().int().min(100).max(500_000),
  active: z.boolean().optional(),
});

export const upsertPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PackageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      id: data.id,
      creator_id: userId,
      title: data.title,
      description: data.description ?? null,
      duration_minutes: data.durationMinutes,
      price_kes: data.priceKes,
      active: data.active ?? true,
    };
    const { error } = await supabase.from("session_packages").upsert(payload);
    if (error) throw new Error(error.message);

    // refresh starting_price_kes on creator profile
    const { data: minRow } = await supabase
      .from("session_packages")
      .select("price_kes")
      .eq("creator_id", userId)
      .eq("active", true)
      .order("price_kes", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (minRow) {
      await supabase
        .from("creator_profiles")
        .update({ starting_price_kes: minRow.price_kes })
        .eq("user_id", userId);
    }
    return { ok: true };
  });

export const getMyCreatorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: packages } = await supabase
      .from("session_packages")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    return {
      isCreator: !!profile,
      hasCreatorRole: (roles ?? []).some((r) => r.role === "creator"),
      profile,
      packages: packages ?? [],
    };
  });

const ProfileUpdateInput = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  location: z.string().trim().max(120).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProfileUpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const update: Record<string, unknown> = {};
    if (data.displayName) update.display_name = data.displayName;
    if (data.bio !== undefined) update.bio = data.bio;
    if (data.location !== undefined) update.location = data.location;
    if (data.avatarUrl !== undefined) update.avatar_url = data.avatarUrl;
    const { error } = await supabase.from("profiles").update(update).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
