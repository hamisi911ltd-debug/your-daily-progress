import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getCreator } from "@/lib/creators.functions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BadgeCheck, Star, Clock, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const creatorQuery = (id: string) => queryOptions({
  queryKey: ["creator", id],
  queryFn: () => getCreator({ data: { creatorId: id } }),
});

export const Route = createFileRoute("/creators/$creatorId")({
  head: ({ loaderData }) => {
    const c = loaderData?.creator;
    const title = c ? `${c.display_name} on CreatorConnect` : "Creator · CreatorConnect";
    const desc = c?.headline ?? "Book a private 1:1 video session.";
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        ...(c?.hero_image_url ? [{ property: "og:image", content: c.hero_image_url }] : []),
      ],
    };
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(creatorQuery(params.creatorId)),
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Creator not found</div>,
  component: CreatorDetail,
});

function CreatorDetail() {
  const { creatorId } = Route.useParams();
  const { data } = useSuspenseQuery(creatorQuery(creatorId));
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(data.packages[0]?.id ?? null);

  if (!data.creator) return (
    <div className="mx-auto max-w-2xl p-12 text-center">
      <h1 className="font-display text-3xl font-bold">Creator not found</h1>
      <Button asChild className="mt-6"><Link to="/browse">Back to browse</Link></Button>
    </div>
  );

  const c = data.creator;

  function book() {
    if (!selected) return;
    if (!user) { navigate({ to: "/auth", search: { mode: "signup" } }); return; }
    navigate({ to: "/book/$packageId", params: { packageId: selected } });
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground">
        {c.hero_image_url && (
          <div className="absolute inset-0">
            <img src={c.hero_image_url} alt="" className="h-full w-full object-cover opacity-30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-hero opacity-85" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="relative overflow-hidden rounded-3xl shadow-glow">
            {c.hero_image_url ? (
              <img src={c.hero_image_url} alt={c.display_name} className="aspect-[4/5] w-full object-cover" width={768} height={896} />
            ) : <div className="aspect-[4/5] bg-gradient-sunset" />}
          </div>
          <div className="flex flex-col justify-end">
            <div className="flex flex-wrap items-center gap-2">
              {c.niche_tags.map((t) => <span key={t} className="rounded-full bg-secondary-foreground/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">{t}</span>)}
              {c.verified && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>}
            </div>
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-tight sm:text-6xl">{c.display_name}</h1>
            <p className="mt-3 text-xl text-secondary-foreground/90">{c.headline}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-accent text-accent" />{c.average_rating > 0 ? c.average_rating.toFixed(1) : "New"} · {c.total_sessions} sessions</span>
              {c.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {c.location}</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: bio + reviews */}
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-2xl font-bold">About</h2>
            <p className="mt-4 whitespace-pre-line text-foreground/85 leading-relaxed">{c.long_bio || c.bio || "No bio yet."}</p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold">Reviews</h2>
            {data.reviews.length === 0 ? (
              <p className="mt-4 text-muted-foreground">No reviews yet. Be the first to book a session.</p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {data.reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-card p-5 shadow-card">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarImage src={r.fan.avatar_url ?? undefined} /><AvatarFallback>{r.fan.display_name?.slice(0,2)}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{r.fan.display_name}</p>
                        <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />)}</div>
                      </div>
                    </div>
                    {r.comment && <p className="mt-3 text-sm text-foreground/80">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: packages */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-card p-6 shadow-pop">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Choose a package</p>
            <div className="mt-4 space-y-3">
              {data.packages.length === 0 && <p className="text-sm text-muted-foreground">No packages available yet.</p>}
              {data.packages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`w-full rounded-2xl border-2 p-4 text-left transition ${selected === p.id ? "border-primary bg-primary/5 shadow-card" : "border-border hover:border-primary/40"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-bold">{p.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {p.duration_minutes} min</p>
                      {p.description && <p className="mt-2 text-sm text-foreground/75">{p.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-primary">KES {p.price_kes.toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <Button variant="hero" size="lg" className="mt-5 w-full" onClick={book} disabled={!selected}>
              Book this session
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">Escrow protected · M-Pesa or card</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
