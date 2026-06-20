import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { d1One, d1All, d1Run } from "@/integrations/cloudflare/d1";
import { requireAuth } from "@/integrations/cloudflare/auth-middleware";

async function assertAdmin(userId: string) {
  const row = await d1One(
    "SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'admin'",
    [userId]
  );
  if (!row) throw new Error("Forbidden: admin access required");
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [users, creators, fans, bookings, revenue] = await Promise.all([
      d1One<{ n: number }>("SELECT COUNT(*) as n FROM users"),
      d1One<{ n: number }>("SELECT COUNT(*) as n FROM user_roles WHERE role = 'creator'"),
      d1One<{ n: number }>("SELECT COUNT(*) as n FROM user_roles WHERE role = 'fan'"),
      d1One<{ n: number }>("SELECT COUNT(*) as n FROM bookings"),
      d1One<{ total: number }>(
        "SELECT COALESCE(SUM(total_kes),0) as total FROM bookings WHERE payment_status = 'paid'"
      ),
    ]);

    const recentBookings = await d1All<{
      id: string;
      status: string;
      payment_status: string;
      total_kes: number;
      created_at: string;
      fan_name: string | null;
      creator_name: string | null;
    }>(
      `SELECT b.id, b.status, b.payment_status, b.total_kes, b.created_at,
              fp.display_name as fan_name, cp.display_name as creator_name
       FROM bookings b
       LEFT JOIN profiles fp ON fp.id = b.fan_id
       LEFT JOIN profiles cp ON cp.id = b.creator_id
       ORDER BY b.created_at DESC LIMIT 10`
    );

    return {
      totalUsers: users?.n ?? 0,
      totalCreators: creators?.n ?? 0,
      totalFans: fans?.n ?? 0,
      totalBookings: bookings?.n ?? 0,
      totalRevenueKes: revenue?.total ?? 0,
      recentBookings,
    };
  });

export const listAllUsers = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ offset: z.number().int().min(0).default(0) }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const rows = await d1All<{
      id: string;
      email: string;
      display_name: string;
      avatar_url: string | null;
      created_at: string;
    }>(
      `SELECT id, email, display_name, avatar_url, created_at
       FROM users ORDER BY created_at DESC LIMIT 50 OFFSET ?`,
      [data.offset]
    );

    const usersWithRoles = await Promise.all(
      rows.map(async (u) => {
        const roleRows = await d1All<{ role: string }>(
          "SELECT role FROM user_roles WHERE user_id = ?",
          [u.id]
        );
        return { ...u, roles: roleRows.map((r) => r.role) };
      })
    );

    const total = await d1One<{ n: number }>("SELECT COUNT(*) as n FROM users");
    return { users: usersWithRoles, total: total?.n ?? 0 };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        role: z.enum(["admin", "creator", "fan"]),
        action: z.enum(["add", "remove"]),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.targetUserId === context.userId && data.role === "admin" && data.action === "remove") {
      throw new Error("Cannot remove your own admin role");
    }
    const now = new Date().toISOString();
    if (data.action === "add") {
      await d1Run(
        "INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, ?, ?)",
        [data.targetUserId, data.role, now]
      );
    } else {
      await d1Run(
        "DELETE FROM user_roles WHERE user_id = ? AND role = ?",
        [data.targetUserId, data.role]
      );
    }
    return { ok: true };
  });

export const listAllCreators = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ offset: z.number().int().min(0).default(0) }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const rows = await d1All<{
      user_id: string;
      display_name: string | null;
      headline: string;
      verified: number;
      average_rating: number;
      total_sessions: number;
      starting_price_kes: number;
      active: number;
      created_at: string;
    }>(
      `SELECT cp.user_id, p.display_name, cp.headline, cp.verified,
              cp.average_rating, cp.total_sessions, cp.starting_price_kes, cp.active, cp.created_at
       FROM creator_profiles cp
       LEFT JOIN profiles p ON p.id = cp.user_id
       ORDER BY cp.created_at DESC LIMIT 50 OFFSET ?`,
      [data.offset]
    );

    const total = await d1One<{ n: number }>("SELECT COUNT(*) as n FROM creator_profiles");
    return { creators: rows, total: total?.n ?? 0 };
  });

export const toggleCreatorVerified = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ creatorId: z.string().uuid(), verified: z.boolean() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await d1Run("UPDATE creator_profiles SET verified = ? WHERE user_id = ?", [
      data.verified ? 1 : 0,
      data.creatorId,
    ]);
    return { ok: true };
  });

export const toggleCreatorActive = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ creatorId: z.string().uuid(), active: z.boolean() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await d1Run("UPDATE creator_profiles SET active = ? WHERE user_id = ?", [
      data.active ? 1 : 0,
      data.creatorId,
    ]);
    return { ok: true };
  });

export const listAllBookings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        offset: z.number().int().min(0).default(0),
        status: z.string().optional(),
      })
      .parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const rows = await d1All<{
      id: string;
      status: string;
      payment_status: string;
      total_kes: number;
      platform_fee_kes: number;
      scheduled_at: string;
      created_at: string;
      fan_name: string | null;
      creator_name: string | null;
      package_title: string | null;
    }>(
      data.status
        ? `SELECT b.id, b.status, b.payment_status, b.total_kes, b.platform_fee_kes,
                  b.scheduled_at, b.created_at,
                  fp.display_name as fan_name, cp.display_name as creator_name,
                  sp.title as package_title
           FROM bookings b
           LEFT JOIN profiles fp ON fp.id = b.fan_id
           LEFT JOIN profiles cp ON cp.id = b.creator_id
           LEFT JOIN session_packages sp ON sp.id = b.package_id
           WHERE b.status = ?
           ORDER BY b.created_at DESC LIMIT 50 OFFSET ?`
        : `SELECT b.id, b.status, b.payment_status, b.total_kes, b.platform_fee_kes,
                  b.scheduled_at, b.created_at,
                  fp.display_name as fan_name, cp.display_name as creator_name,
                  sp.title as package_title
           FROM bookings b
           LEFT JOIN profiles fp ON fp.id = b.fan_id
           LEFT JOIN profiles cp ON cp.id = b.creator_id
           LEFT JOIN session_packages sp ON sp.id = b.package_id
           ORDER BY b.created_at DESC LIMIT 50 OFFSET ?`,
      data.status ? [data.status, data.offset] : [data.offset]
    );

    const total = await d1One<{ n: number }>(
      data.status
        ? "SELECT COUNT(*) as n FROM bookings WHERE status = ?"
        : "SELECT COUNT(*) as n FROM bookings",
      data.status ? [data.status] : []
    );
    return { bookings: rows, total: total?.n ?? 0 };
  });
