import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { d1One, d1Run } from "@/integrations/cloudflare/d1";
import { hashPassword, verifyPassword, signJWT } from "@/integrations/cloudflare/auth.server";

const SignUpInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(72),
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
      "INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)",
      [id, data.email, passwordHash, data.name, now]
    );
    await d1Run(
      "INSERT OR IGNORE INTO profiles (id, display_name, created_at) VALUES (?, ?, ?)",
      [id, data.name, now]
    );
    await d1Run(
      "INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, 'fan', ?)",
      [id, now]
    );

    const token = signJWT({ sub: id, email: data.email, name: data.name });
    return { token };
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
    if (!user || !verifyPassword(data.password, user.password_hash)) {
      throw new Error("Invalid email or password");
    }

    const token = signJWT({
      sub: user.id,
      email: data.email,
      name: user.display_name,
      avatar_url: user.avatar_url ?? undefined,
    });
    return { token };
  });
