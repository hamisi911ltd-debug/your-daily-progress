import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/cloudflare/auth-middleware";
import { d1One, d1Run } from "@/integrations/cloudflare/d1";

export const getZoomRoomCredentials = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .middleware([requireAuth])
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const booking = await d1One<{
      id: string;
      creator_id: string;
      fan_id: string;
      duration_minutes: number;
      status: string;
      payment_status: string;
      zoom_meeting_id: string | null;
      zoom_meeting_password: string | null;
    }>(
      `SELECT id, creator_id, fan_id, duration_minutes, status, payment_status,
              zoom_meeting_id, zoom_meeting_password
       FROM bookings WHERE id = ?`,
      [data.bookingId]
    );

    if (!booking) throw new Error("Booking not found");
    if (booking.creator_id !== userId && booking.fan_id !== userId) throw new Error("Not authorised");
    if (booking.payment_status !== "paid") throw new Error("Payment not yet completed");

    const sdkKey = process.env.ZOOM_SDK_KEY;
    if (!sdkKey) throw new Error("Zoom is not yet configured on this server");

    let meetingId = booking.zoom_meeting_id;
    let password = booking.zoom_meeting_password;

    if (!meetingId || !password) {
      const { createZoomMeeting } = await import("@/lib/zoom.server");
      const meeting = await createZoomMeeting(
        "CreatorConnect Session",
        booking.duration_minutes ?? 60
      );
      meetingId = meeting.meetingId;
      password = meeting.password;

      await d1Run(
        "UPDATE bookings SET zoom_meeting_id = ?, zoom_meeting_password = ? WHERE id = ?",
        [meetingId, password, data.bookingId]
      );
    }

    const role: 0 | 1 = booking.creator_id === userId ? 1 : 0;
    const { generateZoomSignature } = await import("@/lib/zoom.server");
    const signature = generateZoomSignature(meetingId!, role);

    return { meetingNumber: meetingId!, signature, sdkKey, password: password!, role };
  });
