import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/cloudflare/auth-middleware";
import { d1One, d1All, d1Run } from "@/integrations/cloudflare/d1";

const CreateBookingInput = z.object({
  packageId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  note: z.string().trim().max(500).optional(),
});

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CreateBookingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const pkg = await d1One<{
      id: string;
      creator_id: string;
      price_kes: number;
      duration_minutes: number;
      active: number;
    }>(
      "SELECT id, creator_id, price_kes, duration_minutes, active FROM session_packages WHERE id = ? AND active = 1",
      [data.packageId]
    );
    if (!pkg) throw new Error("Package not found");
    if (pkg.creator_id === userId) throw new Error("You cannot book yourself");

    // 12.5% platform fee
    const platformFee = Math.round(pkg.price_kes * 0.125);
    const payout = pkg.price_kes - platformFee;
    const bookingId = crypto.randomUUID();

    await d1Run(
      `INSERT INTO bookings
         (id, fan_id, creator_id, package_id, scheduled_at, duration_minutes,
          total_kes, platform_fee_kes, creator_payout_kes, fan_note,
          status, payment_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', datetime('now'))`,
      [
        bookingId,
        userId,
        pkg.creator_id,
        pkg.id,
        data.scheduledAt,
        pkg.duration_minutes,
        pkg.price_kes,
        platformFee,
        payout,
        data.note ?? null,
      ]
    );

    return { bookingId };
  });

const PayInput = z.object({
  bookingId: z.string().uuid(),
  phone: z.string().trim().regex(/^(\+?254|0)?7\d{8}$/, "Enter a valid Kenyan number"),
});

export const mockMpesaPay = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => PayInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const ref = `MPK${Date.now().toString(36).toUpperCase()}`;

    const changes = await d1Run(
      "UPDATE bookings SET payment_status = 'paid', status = 'confirmed', mpesa_reference = ? WHERE id = ? AND fan_id = ?",
      [ref, data.bookingId, userId]
    );
    if (!changes) throw new Error("Booking not found");

    if (process.env.ZOOM_ACCOUNT_ID) {
      try {
        const booking = await d1One<{ duration_minutes: number }>(
          "SELECT duration_minutes FROM bookings WHERE id = ?",
          [data.bookingId]
        );
        const { createZoomMeeting } = await import("@/lib/zoom.server");
        const meeting = await createZoomMeeting(
          "CreatorConnect Live Session",
          booking?.duration_minutes ?? 60
        );
        await d1Run(
          "UPDATE bookings SET zoom_meeting_id = ?, zoom_meeting_password = ? WHERE id = ?",
          [meeting.meetingId, meeting.password, data.bookingId]
        );
      } catch {
        // Zoom failure must never roll back a successful payment
      }
    }

    return { mpesaReference: ref };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    type BookingRow = {
      id: string;
      scheduled_at: string;
      duration_minutes: number;
      total_kes: number;
      status: string;
      payment_status: string;
      meeting_room_id: string | null;
      package_id: string;
      creator_id: string;
      fan_id: string;
      mpesa_reference: string | null;
      created_at: string;
      fan_name: string | null;
      fan_avatar: string | null;
      creator_name: string | null;
      creator_avatar: string | null;
      package_title: string | null;
    };

    const bookings = await d1All<BookingRow>(
      `SELECT b.id, b.scheduled_at, b.duration_minutes, b.total_kes, b.status, b.payment_status,
              b.meeting_room_id, b.package_id, b.creator_id, b.fan_id, b.mpesa_reference, b.created_at,
              fp.display_name as fan_name, fp.avatar_url as fan_avatar,
              cp.display_name as creator_name, cp.avatar_url as creator_avatar,
              sp.title as package_title
       FROM bookings b
       LEFT JOIN profiles fp ON fp.id = b.fan_id
       LEFT JOIN profiles cp ON cp.id = b.creator_id
       LEFT JOIN session_packages sp ON sp.id = b.package_id
       WHERE b.fan_id = ? OR b.creator_id = ?
       ORDER BY b.scheduled_at ASC`,
      [userId, userId]
    );

    return {
      userId,
      bookings: bookings.map((b) => ({
        ...b,
        fan: { display_name: b.fan_name ?? "Fan", avatar_url: b.fan_avatar },
        creator: { display_name: b.creator_name ?? "Creator", avatar_url: b.creator_avatar },
        package_title: b.package_title ?? "Session",
      })),
    };
  });

const UpdateStatusInput = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(["confirmed", "completed", "cancelled", "declined"]),
});

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => UpdateStatusInput.parse(d))
  .handler(async ({ data }) => {
    await d1Run("UPDATE bookings SET status = ? WHERE id = ?", [data.status, data.bookingId]);
    return { ok: true };
  });

const ReviewInput = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const booking = await d1One<{ creator_id: string; fan_id: string; status: string }>(
      "SELECT creator_id, fan_id, status FROM bookings WHERE id = ?",
      [data.bookingId]
    );
    if (!booking || booking.fan_id !== userId) throw new Error("Not your booking");
    if (booking.status !== "completed") throw new Error("Only completed sessions can be reviewed");

    const reviewId = crypto.randomUUID();
    await d1Run(
      "INSERT INTO reviews (id, booking_id, fan_id, creator_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
      [reviewId, data.bookingId, userId, booking.creator_id, data.rating, data.comment ?? null]
    );

    // Recompute creator stats
    await d1Run(
      `UPDATE creator_profiles SET
         average_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE creator_id = ?),
         total_sessions = (SELECT COUNT(*) FROM bookings WHERE creator_id = ? AND status = 'completed')
       WHERE user_id = ?`,
      [booking.creator_id, booking.creator_id, booking.creator_id]
    );

    return { ok: true };
  });
