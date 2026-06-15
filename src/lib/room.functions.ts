import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/cloudflare/auth-middleware";
import { d1One } from "@/integrations/cloudflare/d1";

export const getVideoRoom = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .middleware([requireAuth])
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const booking = await d1One<{
      id: string;
      creator_id: string;
      fan_id: string;
      status: string;
      payment_status: string;
    }>(
      `SELECT id, creator_id, fan_id, status, payment_status FROM bookings WHERE id = ?`,
      [data.bookingId]
    );

    if (!booking) throw new Error("Booking not found");
    if (booking.creator_id !== userId && booking.fan_id !== userId)
      throw new Error("You are not a participant in this booking");
    if (booking.payment_status !== "paid")
      throw new Error("Payment has not been completed for this session");

    // Generate a unique, hard-to-guess room name from the booking ID
    const roomName = `cc${booking.id.replace(/-/g, "").slice(0, 20)}`;
    const role = booking.creator_id === userId ? "host" : "guest";

    return { roomName, role };
  });
