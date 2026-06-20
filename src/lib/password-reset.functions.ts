import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { d1One, d1Run } from "@/integrations/cloudflare/d1";
import { hashPassword } from "@/integrations/cloudflare/auth.server";
import { randomBytes } from "crypto";

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().transform((v) => v.toLowerCase()) }).parse(d)
  )
  .handler(async ({ data }) => {
    const user = await d1One<{ id: string }>(
      "SELECT id FROM users WHERE email = ?",
      [data.email]
    );

    // Always return success to prevent email enumeration
    if (!user) return { ok: true, resetUrl: null };

    // Invalidate old tokens
    await d1Run(
      "UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0",
      [user.id]
    );

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await d1Run(
      "INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      [id, user.id, token, expiresAt, now]
    );

    // In production this would send an email. For dev, return the URL directly.
    const siteUrl = process.env.SITE_URL ?? "http://localhost:8080";
    const resetUrl = `${siteUrl}/reset-password?token=${token}`;

    return { ok: true, resetUrl };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(64).max(64),
        newPassword: z.string().min(8).max(72),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const row = await d1One<{
      id: string;
      user_id: string;
      expires_at: string;
      used: number;
    }>(
      "SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ?",
      [data.token]
    );

    if (!row) throw new Error("Invalid or expired reset link");
    if (row.used === 1) throw new Error("This reset link has already been used");
    if (new Date(row.expires_at) < new Date()) throw new Error("This reset link has expired. Please request a new one.");

    const newHash = hashPassword(data.newPassword);
    await d1Run("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, row.user_id]);
    await d1Run("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", [row.id]);

    return { ok: true };
  });

export const validateResetToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string().min(1) }).parse(d)
  )
  .handler(async ({ data }) => {
    const row = await d1One<{
      user_id: string;
      expires_at: string;
      used: number;
    }>(
      "SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ?",
      [data.token]
    );

    if (!row || row.used === 1 || new Date(row.expires_at) < new Date()) {
      return { valid: false };
    }

    const user = await d1One<{ email: string; display_name: string }>(
      "SELECT email, display_name FROM users WHERE id = ?",
      [row.user_id]
    );

    return { valid: true, email: user?.email, name: user?.display_name };
  });
