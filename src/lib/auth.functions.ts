import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { d1One, d1All, d1Run } from "@/integrations/cloudflare/d1";
import { hashPassword, verifyPassword, signJWT } from "@/integrations/cloudflare/auth.server";

async function fetchUserRoles(userId: string): Promise<string[]> {
  const rows = await d1All<{ role: string }>(
    "SELECT role FROM user_roles WHERE user_id = ?",
    [userId]
  );
  return rows.map((r) => r.role);
}

// ── Email / Password ──────────────────────────────────────────────────────────

const SignUpInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(72),
  phone: z.string().trim().min(9).max(20).optional(),
  role: z.enum(["fan", "creator"]).default("fan"),
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignUpInput.parse(d))
  .handler(async ({ data }) => {
    const existing = await d1One("SELECT id FROM users WHERE email = ?", [data.email]);
    if (existing) throw new Error("An account with this email already exists");

    const id = crypto.randomUUID();
    const passwordHash = hashPassword(data.password);
    const now = new Date().toISOString();

    await d1Run(
      "INSERT INTO users (id, email, password_hash, display_name, phone_number, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, data.email, passwordHash, data.name, data.phone ?? null, now]
    );
    await d1Run(
      "INSERT OR IGNORE INTO profiles (id, display_name, phone_number, created_at) VALUES (?, ?, ?, ?)",
      [id, data.name, data.phone ?? null, now]
    );
    await d1Run(
      "INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'fan', ?)",
      [id, now]
    );
    if (data.role === "creator") {
      await d1Run(
        "INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'creator', ?)",
        [id, now]
      );
    }

    const roles = await fetchUserRoles(id);
    const token = signJWT({ sub: id, email: data.email, name: data.name, roles });
    return { token, isCreator: data.role === "creator" };
  });

const SignInInput = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1),
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignInInput.parse(d))
  .handler(async ({ data }) => {
    const user = await d1One<{
      id: string;
      password_hash: string;
      display_name: string;
      avatar_url: string | null;
    }>("SELECT id, password_hash, display_name, avatar_url FROM users WHERE email = ?", [
      data.email,
    ]);
    if (!user) throw new Error("Invalid email or password");

    if (!user.password_hash) {
      throw new Error("This account uses social sign-in (Google/Facebook/TikTok). Please continue with the same method.");
    }

    if (!verifyPassword(data.password, user.password_hash)) {
      throw new Error("Invalid email or password");
    }

    const roles = await fetchUserRoles(user.id);
    const token = signJWT({
      sub: user.id,
      email: data.email,
      name: user.display_name,
      avatar_url: user.avatar_url ?? undefined,
      roles,
    });
    return { token };
  });

// ── Google OAuth ──────────────────────────────────────────────────────────────

export const getGoogleAuthUrl = createServerFn({ method: "GET" }).handler(async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return { url: null };
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
});

const OAuthCodeInput = z.object({
  code: z.string(),
  redirectUri: z.string().url(),
});

export const googleSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => OAuthCodeInput.parse(d))
  .handler(async ({ data }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Google sign-in is not configured");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: data.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: data.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error("Failed to exchange Google code");
    const { access_token } = (await tokenRes.json()) as any;

    const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) throw new Error("Failed to fetch Google user info");
    const gu = (await userRes.json()) as { sub: string; email: string; name: string; picture?: string };

    return upsertSocialUser({ provider: "google", providerId: gu.sub, email: gu.email, name: gu.name, avatar: gu.picture });
  });

// ── Facebook / Meta OAuth (covers Instagram login via Meta) ──────────────────

export const getFacebookAuthUrl = createServerFn({ method: "GET" }).handler(async () => {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) return { url: null };
  const params = new URLSearchParams({
    client_id: appId,
    response_type: "code",
    scope: "email,public_profile",
  });
  return { url: `https://www.facebook.com/v18.0/dialog/oauth?${params}` };
});

export const facebookSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => OAuthCodeInput.parse(d))
  .handler(async ({ data }) => {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) throw new Error("Facebook sign-in is not configured");

    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", data.redirectUri);
    tokenUrl.searchParams.set("code", data.code);

    const tokenResponse = await fetch(tokenUrl.toString());
    if (!tokenResponse.ok) throw new Error("Failed to exchange Facebook code");
    const { access_token } = (await tokenResponse.json()) as any;

    const meRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.width(400)&access_token=${access_token}`
    );
    if (!meRes.ok) throw new Error("Failed to fetch Facebook user info");
    const fb = (await meRes.json()) as { id: string; name: string; email?: string; picture?: { data?: { url?: string } } };

    if (!fb.email) throw new Error("Facebook account must have a public email address. Please use another sign-in method.");

    return upsertSocialUser({
      provider: "facebook",
      providerId: fb.id,
      email: fb.email,
      name: fb.name,
      avatar: fb.picture?.data?.url,
    });
  });

// ── TikTok OAuth ──────────────────────────────────────────────────────────────

export const getTikTokAuthUrl = createServerFn({ method: "GET" }).handler(async () => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) return { url: null };
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: "user.info.basic,user.info.email",
  });
  return { url: `https://www.tiktok.com/v2/auth/authorize/?${params}` };
});

export const tiktokSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => OAuthCodeInput.parse(d))
  .handler(async ({ data }) => {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientKey || !clientSecret) throw new Error("TikTok sign-in is not configured");

    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code: data.code,
        grant_type: "authorization_code",
        redirect_uri: data.redirectUri,
      }),
    });
    if (!tokenRes.ok) throw new Error("Failed to exchange TikTok code");
    const { access_token } = (await tokenRes.json()) as any;

    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,email",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!userRes.ok) throw new Error("Failed to fetch TikTok user info");
    const { data: tt } = (await userRes.json()) as any;
    const user = tt?.user;

    if (!user?.email) throw new Error("TikTok account must have an email. Please add an email to your TikTok account first.");

    return upsertSocialUser({
      provider: "tiktok",
      providerId: user.open_id,
      email: user.email,
      name: user.display_name,
      avatar: user.avatar_url,
    });
  });

// ── Shared social sign-in helper ──────────────────────────────────────────────

async function upsertSocialUser({
  provider,
  providerId,
  email,
  name,
  avatar,
}: {
  provider: "google" | "facebook" | "tiktok";
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}): Promise<{ token: string }> {
  const emailLower = email.toLowerCase();
  const now = new Date().toISOString();
  const idCol = provider === "google" ? "google_id" : provider === "facebook" ? "facebook_id" : "tiktok_id";

  let user = await d1One<{ id: string; display_name: string; avatar_url: string | null }>(
    "SELECT id, display_name, avatar_url FROM users WHERE email = ?",
    [emailLower]
  );

  if (!user) {
    const id = crypto.randomUUID();
    await d1Run(
      `INSERT INTO users (id, email, password_hash, display_name, avatar_url, ${idCol}, created_at) VALUES (?, ?, '', ?, ?, ?, ?)`,
      [id, emailLower, name, avatar ?? null, providerId, now]
    );
    await d1Run(
      "INSERT OR IGNORE INTO profiles (id, display_name, avatar_url, created_at) VALUES (?, ?, ?, ?)",
      [id, name, avatar ?? null, now]
    );
    await d1Run(
      "INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'fan', ?)",
      [id, now]
    );
    user = { id, display_name: name, avatar_url: avatar ?? null };
  } else {
    await d1Run(`UPDATE users SET ${idCol} = ? WHERE id = ? AND ${idCol} IS NULL`, [
      providerId,
      user.id,
    ]);
  }

  const roles = await fetchUserRoles(user.id);
  const token = signJWT({
    sub: user.id,
    email: emailLower,
    name: user.display_name,
    avatar_url: user.avatar_url ?? undefined,
    roles,
  });
  return { token };
}
