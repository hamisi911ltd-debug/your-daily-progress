import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateBookingInput = z.object({
  packageId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  note: z.string().trim().max(500).optional(),
});

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateBookingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pkg, error: pkgErr } = await supabase
      .from("session_packages")
      .select("id, creator_id, price_kes, duration_minutes, active")
      .eq("id", data.packageId)
      .maybeSingle();
    if (pkgErr || !pkg || !pkg.active) throw new Error("Package not found");
    if (pkg.creator_id === userId) throw new Error("You cannot book yourself");

    const platformFee = Math.round(pkg.price_kes * 0.2);
    const payout = pkg.price_kes - platformFee;

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        fan_id: userId,
        creator_id: pkg.creator_id,
        package_id: pkg.id,
        scheduled_at: data.scheduledAt,
        duration_minutes: pkg.duration_minutes,
        total_kes: pkg.price_kes,
        platform_fee_kes: platformFee,
        creator_payout_kes: payout,
        fan_note: data.note ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { bookingId: booking.id };
  });

const PayInput = z.object({
  bookingId: z.string().uuid(),
  phone: z.string().trim().regex(/^(\+?254|0)?7\d{8}$/, "Enter a valid Kenyan number"),
});

export const mockMpesaPay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PayInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Mock M-Pesa STK push — in production this would call Daraja API.
    const ref = `MPK${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        status: "confirmed",
        mpesa_reference: ref,
      })
      .eq("id", data.bookingId)
      .eq("fan_id", userId);
    if (error) throw new Error(error.message);
    return { mpesaReference: ref };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("id, scheduled_at, duration_minutes, total_kes, status, payment_status, meeting_room_id, package_id, creator_id, fan_id, mpesa_reference, created_at")
      .or(`fan_id.eq.${userId},creator_id.eq.${userId}`)
      .order("scheduled_at", { ascending: true });

    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((data ?? []).flatMap((b) => [b.fan_id, b.creator_id])));
    const pkgIds = Array.from(new Set((data ?? []).map((b) => b.package_id)));

    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
      : { data: [] as Array<any> };
    const { data: pkgs } = pkgIds.length
      ? await supabase.from("session_packages").select("id, title").in("id", pkgIds)
      : { data: [] as Array<any> };

    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const kmap = new Map((pkgs ?? []).map((p) => [p.id, p]));

    return {
      userId,
      bookings: (data ?? []).map((b) => ({
        ...b,
        fan: pmap.get(b.fan_id) ?? { display_name: "Fan", avatar_url: null },
        creator: pmap.get(b.creator_id) ?? { display_name: "Creator", avatar_url: null },
        package_title: kmap.get(b.package_id)?.title ?? "Session",
      })),
    };
  });

const UpdateStatusInput = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(["confirmed", "completed", "cancelled", "declined"]),
});

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.bookingId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ReviewInput = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("creator_id, fan_id, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.fan_id !== userId) throw new Error("Not your booking");
    if (booking.status !== "completed") throw new Error("Only completed sessions can be reviewed");
    const { error } = await supabase.from("reviews").insert({
      booking_id: data.bookingId,
      fan_id: userId,
      creator_id: booking.creator_id,
      rating: data.rating,
      comment: data.comment ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
