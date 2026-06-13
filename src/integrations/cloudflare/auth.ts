// Browser-safe auth helpers — no Node.js imports
// Server-only crypto (signJWT, verifyJWT, hashPassword, verifyPassword) → auth.server.ts

export const TOKEN_KEY = "cc_auth_token";

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  avatar_url?: string;
  exp: number;
  iat: number;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: { full_name?: string; avatar_url?: string };
}

export function jwtToUser(payload: JWTPayload): AuthUser {
  return {
    id: payload.sub,
    email: payload.email,
    user_metadata: { full_name: payload.name, avatar_url: payload.avatar_url },
  };
}

// ── Client-side token storage (browser only) ─────────────────────────────────

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event("cc:auth:change"));
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("cc:auth:change"));
}

/** Decode JWT payload from localStorage (no signature check — client-side only). */
export function getTokenPayload(): JWTPayload | null {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const [, body] = token.split(".");
    // base64url → base64
    const b64 = body.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      clearStoredToken();
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
