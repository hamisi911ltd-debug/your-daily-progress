import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/cloudflare/auth-middleware";

interface IceServersResponse {
  iceServers: RTCIceServer[];
}

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

// Cloudflare Realtime TURN: free up to 1,000 GB/month egress, no card required.
// Without a key configured we fall back to STUN-only — calls still connect
// peer-to-peer on networks that don't need a relay.
export const getTurnCredentials = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<IceServersResponse> => {
    const keyId = process.env.CF_TURN_KEY_ID;
    const apiToken = process.env.CF_TURN_API_TOKEN;
    if (!keyId || !apiToken) return { iceServers: FALLBACK_ICE_SERVERS };

    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttl: 3600 }),
      }
    );
    if (!res.ok) return { iceServers: FALLBACK_ICE_SERVERS };

    return (await res.json()) as IceServersResponse;
  });
