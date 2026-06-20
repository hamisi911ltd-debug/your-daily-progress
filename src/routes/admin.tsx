import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminStats,
  listAllUsers,
  updateUserRole,
  listAllCreators,
  toggleCreatorVerified,
  toggleCreatorActive,
  listAllBookings,
} from "@/lib/admin.functions";
import { getTokenPayload } from "@/integrations/cloudflare/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users, BarChart2, BookOpen, BadgeCheck, TrendingUp,
  UserCheck, ShieldAlert, Star, Activity, ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin · Fanmeeet" }] }),
  beforeLoad: () => {
    const payload = getTokenPayload();
    if (!payload) throw redirect({ to: "/auth", search: { returnTo: "/admin" } });
    if (!payload.roles?.includes("admin")) throw redirect({ to: "/" });
  },
  component: AdminPage,
});

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "users", label: "Users", icon: Users },
  { id: "creators", label: "Creators", icon: BadgeCheck },
  { id: "bookings", label: "Bookings", icon: BookOpen },
] as const;

type Tab = (typeof TABS)[number]["id"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
  declined: "bg-red-100 text-red-800",
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  paid: "bg-green-50 text-green-700",
  refunded: "bg-purple-50 text-purple-700",
  failed: "bg-red-50 text-red-700",
};

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function OverviewTab() {
  const fetchStats = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetchStats(),
  });

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Loading stats…</p>;
  const s = data as any;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Users" value={s.totalUsers} icon={Users} />
        <StatCard label="Creators" value={s.totalCreators} icon={BadgeCheck} />
        <StatCard label="Fans" value={s.totalFans} icon={UserCheck} />
        <StatCard label="Bookings" value={s.totalBookings} icon={BookOpen} />
        <StatCard
          label="Platform Revenue"
          value={`KES ${(s.totalRevenueKes * 0.125).toLocaleString()}`}
          icon={TrendingUp}
          sub="12.5% of paid bookings"
        />
      </div>

      <div>
        <h2 className="mb-4 font-display text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Recent Bookings
        </h2>
        <div className="overflow-hidden rounded-2xl bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Fan</th>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(s.recentBookings ?? []).map((b: any) => (
                <tr key={b.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{b.fan_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.creator_name ?? "—"}</td>
                  <td className="px-4 py-3">KES {b.total_kes.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${PAYMENT_COLORS[b.payment_status] ?? "bg-gray-100 text-gray-600"}`}>
                      {b.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const fetchUsers = useServerFn(listAllUsers);
  const doUpdateRole = useServerFn(updateUserRole);
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", offset],
    queryFn: () => fetchUsers({ data: { offset } }),
  });

  const roleMut = useMutation({
    mutationFn: (vars: { targetUserId: string; role: "admin" | "creator" | "fan"; action: "add" | "remove" }) =>
      doUpdateRole({ data: vars }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const users: any[] = (data as any)?.users ?? [];
  const total: number = (data as any)?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} total users</p>
      </div>
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : (
              users.map((u: any) => (
                <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{u.display_name?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{u.display_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.roles ?? []).map((r: string) => (
                        <span key={r} className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${r === "admin" ? "bg-red-100 text-red-700" : r === "creator" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {!(u.roles ?? []).includes("admin") && (
                        <button
                          onClick={() => roleMut.mutate({ targetUserId: u.id, role: "admin", action: "add" })}
                          className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition"
                        >
                          Make admin
                        </button>
                      )}
                      {(u.roles ?? []).includes("admin") && (
                        <button
                          onClick={() => roleMut.mutate({ targetUserId: u.id, role: "admin", action: "remove" })}
                          className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-200 transition"
                        >
                          Remove admin
                        </button>
                      )}
                      {!(u.roles ?? []).includes("creator") && (
                        <button
                          onClick={() => roleMut.mutate({ targetUserId: u.id, role: "creator", action: "add" })}
                          className="rounded-lg bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-600 hover:bg-purple-100 transition"
                        >
                          Make creator
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setOffset(Math.max(0, offset - 50))} disabled={offset === 0}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Showing {offset + 1}–{Math.min(offset + 50, total)} of {total}</span>
        <Button variant="outline" size="sm" onClick={() => setOffset(offset + 50)} disabled={offset + 50 >= total}>
          Next
        </Button>
      </div>
    </div>
  );
}

function CreatorsTab() {
  const fetchCreators = useServerFn(listAllCreators);
  const doVerify = useServerFn(toggleCreatorVerified);
  const doActive = useServerFn(toggleCreatorActive);
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-creators", offset],
    queryFn: () => fetchCreators({ data: { offset } }),
  });

  const verifyMut = useMutation({
    mutationFn: (vars: { creatorId: string; verified: boolean }) => doVerify({ data: vars }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-creators"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const activeMut = useMutation({
    mutationFn: (vars: { creatorId: string; active: boolean }) => doActive({ data: vars }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-creators"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const creators: any[] = (data as any)?.creators ?? [];
  const total: number = (data as any)?.total ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{total} total creators</p>
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Headline</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Sessions</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : (
              creators.map((c: any) => (
                <tr key={c.user_id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link to="/creators/$creatorId" params={{ creatorId: c.user_id }} className="hover:text-primary transition-colors">
                      {c.display_name || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{c.headline}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {Number(c.average_rating).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.total_sessions}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {c.verified === 1 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">Unverified</span>
                      )}
                      {c.active === 1 ? (
                        <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">Active</span>
                      ) : (
                        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">Inactive</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.verified !== 1 ? (
                        <button
                          onClick={() => verifyMut.mutate({ creatorId: c.user_id, verified: true })}
                          className="rounded-lg bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-100 transition"
                        >
                          Verify
                        </button>
                      ) : (
                        <button
                          onClick={() => verifyMut.mutate({ creatorId: c.user_id, verified: false })}
                          className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-200 transition"
                        >
                          Unverify
                        </button>
                      )}
                      {c.active === 1 ? (
                        <button
                          onClick={() => activeMut.mutate({ creatorId: c.user_id, active: false })}
                          className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => activeMut.mutate({ creatorId: c.user_id, active: true })}
                          className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 transition"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setOffset(Math.max(0, offset - 50))} disabled={offset === 0}>Previous</Button>
        <span className="text-sm text-muted-foreground">Showing {offset + 1}–{Math.min(offset + 50, total)} of {total}</span>
        <Button variant="outline" size="sm" onClick={() => setOffset(offset + 50)} disabled={offset + 50 >= total}>Next</Button>
      </div>
    </div>
  );
}

function BookingsTab() {
  const fetchBookings = useServerFn(listAllBookings);
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings", statusFilter, offset],
    queryFn: () => fetchBookings({ data: { status: statusFilter || undefined, offset } }),
  });

  const bookings: any[] = (data as any)?.bookings ?? [];
  const total: number = (data as any)?.total ?? 0;

  const STATUSES = ["", "pending", "confirmed", "completed", "cancelled", "declined"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setOffset(0); }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${statusFilter === s ? "bg-primary text-white" : "bg-secondary hover:bg-muted"}`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">{total} bookings</span>
      </div>
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Fan</th>
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Platform fee</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Scheduled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No bookings found</td></tr>
            ) : (
              bookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{b.fan_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.creator_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">{b.package_title ?? "—"}</td>
                  <td className="px-4 py-3">KES {b.total_kes.toLocaleString()}</td>
                  <td className="px-4 py-3 text-primary font-medium">KES {b.platform_fee_kes.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${PAYMENT_COLORS[b.payment_status] ?? "bg-gray-100 text-gray-600"}`}>
                      {b.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(b.scheduled_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setOffset(Math.max(0, offset - 50))} disabled={offset === 0}>Previous</Button>
        <span className="text-sm text-muted-foreground">Showing {offset + 1}–{Math.min(offset + 50, total)} of {total}</span>
        <Button variant="outline" size="sm" onClick={() => setOffset(offset + 50)} disabled={offset + 50 >= total}>Next</Button>
      </div>
    </div>
  );
}

function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30">
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">Manage users, creators, and platform activity</p>
            </div>
            <Link to="/bookings">
              <Button variant="outline" size="sm">Back to app</Button>
            </Link>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-1 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
                  tab === id
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {tab === "overview" && <OverviewTab />}
        {tab === "users" && <UsersTab />}
        {tab === "creators" && <CreatorsTab />}
        {tab === "bookings" && <BookingsTab />}
      </div>
    </div>
  );
}
