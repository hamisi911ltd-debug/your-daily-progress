import { createHmac } from "crypto";

async function getZoomToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom not configured. Add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET to .env");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(
    `https://api.zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    { method: "POST", headers: { Authorization: `Basic ${credentials}` } }
  );
  if (!res.ok) throw new Error("Failed to get Zoom access token");
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function createZoomMeeting(
  topic: string,
  durationMinutes: number
): Promise<{ meetingId: string; password: string }> {
  const token = await getZoomToken();
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      type: 1, // instant meeting
      duration: durationMinutes,
      settings: {
        waiting_room: false,
        participant_video: true,
        host_video: true,
        join_before_host: true,
        mute_upon_entry: false,
        audio: "both",
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(`Failed to create Zoom meeting: ${err.message ?? res.statusText}`);
  }
  const meeting = await res.json() as { id: number; password: string };
  return { meetingId: String(meeting.id), password: meeting.password };
}

export function generateZoomSignature(meetingNumber: string, role: 0 | 1): string {
  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;
  if (!sdkKey || !sdkSecret) {
    throw new Error("Zoom SDK credentials not configured. Add ZOOM_SDK_KEY and ZOOM_SDK_SECRET to .env");
  }

  const iat = Math.round(Date.now() / 1000) - 30;
  const exp = iat + 7200;

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sdkKey, appKey: sdkKey, mn: meetingNumber, role, tokenExp: exp, iat, exp })
  ).toString("base64url");

  const msg = `${header}.${payload}`;
  const sig = createHmac("sha256", sdkSecret).update(msg).digest("base64url");
  return `${msg}.${sig}`;
}
