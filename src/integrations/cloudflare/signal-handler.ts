// Authenticates a WebSocket upgrade for /api/signal/{bookingId} and forwards it to
// the booking's SignalingRoom Durable Object. Lives outside TanStack Start's server
// functions because those don't support WebSocket upgrades — this runs directly in
// the Worker fetch handler (see server.ts).
import { verifyJWT } from "./auth.server";
import { d1One } from "./d1";

// No @cloudflare/workers-types dependency in this project (see d1.ts) — minimal
// local shims for the bits of the Durable Object namespace API used here.
interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}
interface DurableObjectNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStub;
}

interface SignalEnv {
  SIGNAL_ROOM?: DurableObjectNamespace;
}

export async function handleSignal(request: Request, env: unknown, url: URL): Promise<Response> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("Expected websocket upgrade", { status: 426 });
  }

  const ns = (env as SignalEnv).SIGNAL_ROOM;
  if (!ns) return new Response("Signaling is not configured", { status: 503 });

  const bookingId = decodeURIComponent(url.pathname.replace("/api/signal/", ""));
  const token = url.searchParams.get("token");
  if (!bookingId || !token) return new Response("Missing bookingId or token", { status: 400 });

  const claims = verifyJWT(token);
  if (!claims) return new Response("Unauthorized", { status: 401 });

  const booking = await d1One<{ creator_id: string; fan_id: string; payment_status: string }>(
    `SELECT creator_id, fan_id, payment_status FROM bookings WHERE id = ?`,
    [bookingId]
  );
  if (!booking) return new Response("Booking not found", { status: 404 });
  if (booking.creator_id !== claims.sub && booking.fan_id !== claims.sub) {
    return new Response("Forbidden", { status: 403 });
  }
  if (booking.payment_status !== "paid") return new Response("Payment required", { status: 402 });

  const role = booking.creator_id === claims.sub ? "host" : "guest";

  const forwardUrl = new URL(request.url);
  forwardUrl.searchParams.set("role", role);

  const stub = ns.get(ns.idFromName(bookingId));
  return stub.fetch(new Request(forwardUrl, request));
}
