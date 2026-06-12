import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyCreatorProfile, upsertPackage } from "@/lib/creator-onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/creator-dashboard")({
  head: () => ({ meta: [{ title: "Creator dashboard · CreatorConnect" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchMine = useServerFn(getMyCreatorProfile);
  const { data, isLoading } = useQuery({ queryKey: ["my-creator-profile"], queryFn: () => fetchMine() });
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  if (!data?.isCreator) {
    return (
      <div className="mx-auto max-w-2xl p-12 text-center">
        <h1 className="font-display text-3xl font-bold">You haven't applied yet</h1>
        <p className="mt-2 text-muted-foreground">Set up your creator profile to start receiving bookings.</p>
        <Button asChild variant="hero" className="mt-6"><Link to="/become-creator">Become a creator</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Creator dashboard</h1>
          <p className="mt-1 text-muted-foreground">{data.profile?.headline}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/bookings">Incoming bookings</Link></Button>
          {data.profile?.user_id && (
            <Button asChild variant="ghost"><Link to="/creators/$creatorId" params={{ creatorId: data.profile.user_id }}>View public profile</Link></Button>
          )}
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Session packages</h2>
          <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> New package</Button>
        </div>

        {showForm && <PackageForm onDone={() => setShowForm(false)} />}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {data.packages.length === 0 && !showForm && (
            <div className="col-span-full rounded-2xl bg-card p-8 text-center shadow-card">
              <Package className="mx-auto h-10 w-10 text-primary" />
              <p className="mt-3 font-display text-lg font-bold">No packages yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add at least one package so fans can book you.</p>
            </div>
          )}
          {data.packages.map((p) => (
            <div key={p.id} className="rounded-2xl bg-card p-5 shadow-card">
              <p className="font-display text-lg font-bold">{p.title}</p>
              <p className="text-sm text-muted-foreground">{p.duration_minutes} min · KES {p.price_kes.toLocaleString()}</p>
              {p.description && <p className="mt-2 text-sm text-foreground/80">{p.description}</p>}
              <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${p.active ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{p.active ? "Active" : "Inactive"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PackageForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("2500");
  const upsert = useServerFn(upsertPackage);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => upsert({ data: { title, description: desc, durationMinutes: parseInt(duration, 10), priceKes: parseInt(price, 10) } }),
    onSuccess: () => { toast.success("Package created"); qc.invalidateQueries({ queryKey: ["my-creator-profile"] }); onDone(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="mt-6 grid gap-4 rounded-2xl bg-card p-6 shadow-card sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} /></div>
      <div className="sm:col-span-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={3} /></div>
      <div><Label>Duration (min)</Label><Input type="number" min={10} max={240} value={duration} onChange={(e) => setDuration(e.target.value)} required /></div>
      <div><Label>Price (KES)</Label><Input type="number" min={100} max={500000} value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
      <div className="sm:col-span-2 flex gap-2">
        <Button type="submit" variant="hero" disabled={mut.isPending}>Save package</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
