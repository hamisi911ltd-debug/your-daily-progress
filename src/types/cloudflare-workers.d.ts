// Minimal ambient typing for the runtime-provided `cloudflare:workers` module.
// This project has no @cloudflare/workers-types dependency (see d1.ts's any-cast
// convention) — full Workers types would also collide with DOM's global
// WebSocket/Request/Response used by client-side code. Real shape-checking for
// `ctx` happens locally via casts in signaling-room.ts.
declare module "cloudflare:workers" {
  export class DurableObject<Env = unknown> {
    protected ctx: unknown;
    protected env: Env;
    constructor(ctx: unknown, env: Env);
  }
}
