// Durable Object: pairs exactly two WebSocket connections (a booking's host + guest)
// and relays whatever they send each other — SDP offers/answers, ICE candidates,
// presence pings. It never inspects message contents; the browsers own the WebRTC
// state machine. Role is decided server-side (see signal-handler.ts) and trusted here.
//
// Must extend the runtime's `DurableObject` base class — Cloudflare's deploy-time
// validation (error 10021, "prototype chain does not end in Object") rejects a
// SQLite-backed DO class that doesn't. This project has no @cloudflare/workers-types
// dependency (see d1.ts's any-cast convention), so `cloudflare:workers` is typed here
// with a minimal local ambient declaration instead of pulling in the full package.
import { DurableObject } from "cloudflare:workers";

type Role = "host" | "guest";

interface Attachment {
  role: Role;
}

interface HibernatableWebSocket extends WebSocket {
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown;
}

interface DurableObjectCtx {
  acceptWebSocket(ws: WebSocket): void;
  getWebSockets(): HibernatableWebSocket[];
}

declare const WebSocketPair: new () => [WebSocket, WebSocket];

function roleOf(ws: HibernatableWebSocket): Role | null {
  const attachment = ws.deserializeAttachment() as Attachment | null;
  return attachment?.role ?? null;
}

export class SignalingRoom extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 });
    }

    const role = new URL(request.url).searchParams.get("role");
    if (role !== "host" && role !== "guest") {
      return new Response("Missing or invalid role", { status: 400 });
    }

    const ctx = this.ctx as unknown as DurableObjectCtx;

    // A page refresh/reconnect can leave a stale socket for the same role behind.
    for (const ws of ctx.getWebSockets()) {
      if (roleOf(ws) === role) ws.close(4000, "replaced-by-new-connection");
    }

    const [client, server] = new WebSocketPair();
    ctx.acceptWebSocket(server);
    (server as HibernatableWebSocket).serializeAttachment({ role });

    const oppositeRole: Role = role === "host" ? "guest" : "host";
    const oppositeSockets = ctx.getWebSockets().filter((ws) => ws !== server && roleOf(ws) === oppositeRole);
    if (oppositeSockets.length > 0) {
      const peerJoined = JSON.stringify({ type: "peer-joined" });
      (server as HibernatableWebSocket).send(peerJoined);
      for (const ws of oppositeSockets) ws.send(peerJoined);
    }

    return new Response(null, { status: 101, webSocket: client } as ResponseInit & { webSocket: WebSocket });
  }

  private relayFrom(sender: HibernatableWebSocket, message: string) {
    const senderRole = roleOf(sender);
    if (!senderRole) return;
    const oppositeRole: Role = senderRole === "host" ? "guest" : "host";
    const ctx = this.ctx as unknown as DurableObjectCtx;
    for (const ws of ctx.getWebSockets()) {
      if (roleOf(ws) === oppositeRole) {
        try {
          ws.send(message);
        } catch {
          // peer socket already gone — nothing to relay to
        }
      }
    }
  }

  async webSocketMessage(ws: HibernatableWebSocket, message: string | ArrayBuffer) {
    if (typeof message === "string") this.relayFrom(ws, message);
  }

  async webSocketClose(ws: HibernatableWebSocket) {
    this.relayFrom(ws, JSON.stringify({ type: "peer-left" }));
  }

  async webSocketError(ws: HibernatableWebSocket) {
    this.relayFrom(ws, JSON.stringify({ type: "peer-left" }));
  }
}
