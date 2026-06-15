import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getCreator } from "@/lib/creators.functions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BadgeCheck, Star, Clock, MapPin, Video, Layers, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const SESSION_TYPE_ICONS: Record<string, React.ReactNode> = {
  online:      <Video className="h-3.5 w-3.5" />,
  "in-person": <MapPin className="h-3.5 w-3.5" />,
  hybrid:      <Layers className="h-3.5 w-3.5" />,
};

const creatorQuery = (id: string) => queryOptions({
  queryKey: ["creator", id],
  queryFn: () => getCreator({ data: { creatorId: id } }),
});

export const Route = createFileRoute("/creators/$creatorId")({
  head: ({ loaderData }: any) => {
    const c = (loaderData as any)?.creator;
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
  const packages: any[] = (data as any).packages ?? [];
  const reviews: any[] = (data as any).reviews ?? [];
  const [selected, setSelected] = useState<string | null>(packages[0]?.id ?? null);

  if (!(data as any).creator) return (
    <div className="mx-auto max-w-2xl p-12 text-center">
      <h1 className="font-display text-3xl font-bold">Creator not found</h1>
      <Button asChild className="mt-6"><Link to="/browse">Back to browse</Link></Button>
    </div>
  );

  const c = (data as any).creator;

  function book() {
    if (!selected) return;
    const pkg = packages.find((p: any) => p.id === selected);
    if (!user) {
      const sessionType = (pkg as any)?.session_type ?? "online";
      const loc = (pkg as any)?.location ?? "";
      const returnTo = `/book/${selected}?sessionType=${sessionType}${loc ? `&location=${encodeURIComponent(loc)}` : ""}`;
      navigate({ to: "/auth", search: { mode: "signup", returnTo } });
      return;
    }
    navigate({
      to: "/book/$packageId",
      params: { packageId: selected },
      search: { sessionType: (pkg as any)?.session_type ?? "online", location: (pkg as any)?.location ?? "" },
    });
  }

  return (
    <div>
      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground">
        {/* Background blurred hero image */}
        {c.hero_image_url && (
          <div className="absolute inset-0">
            <img src={c.hero_image_url} alt="" className="h-full w-full object-cover opacity-25" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6">

          {/* ① Creator identity — full width, at the very top */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2">
              {c.niche_tags.map((t: string) => (
                <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border border-white/15">
                  {t}
                </span>
              ))}
              {c.verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              {c.display_name}
            </h1>
            <p className="mt-2 text-lg text-secondary-foreground/85 sm:text-xl">{c.headline}</p>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-secondary-foreground/70">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-accent text-accent" />
                {c.average_rating > 0 ? c.average_rating.toFixed(1) : "New"} · {c.total_sessions} sessions
              </span>
              {c.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {c.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" /> Escrow protected
              </span>
            </div>
          </div>

          {/* ② Portrait image + Packages — side by side */}
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">

            {/* Creator portrait */}
            <div className="relative overflow-hidden rounded-3xl shadow-glow">
              {c.hero_image_url ? (
                <img
                  src={c.hero_image_url}
                  alt={c.display_name}
                  className="aspect-[4/5] w-full object-cover"
                  width={600}
                  height={750}
                />
              ) : (
                <div className="aspect-[4/5] bg-gradient-sunset" />
              )}
              {/* subtle gradient over bottom of image */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            {/* Packages / Pricing */}
            <div className="flex flex-col justify-start">
              <div className="rounded-3xl bg-card/95 p-6 shadow-pop backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Choose a session
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select a package below and book directly with {c.display_name.split(" ")[0]}.
                </p>

                <div className="mt-5 space-y-3">
                  {packages.length === 0 && (
                    <p className="text-sm text-muted-foreground">No packages available yet.</p>
                  )}
                  {packages.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                      className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                        selected === p.id
                          ? "border-primary bg-primary/8 shadow-card"
                          : "border-border hover:border-primary/40 hover:bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-base font-bold text-foreground">{p.title}</p>
                            {p.session_type && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                {SESSION_TYPE_ICONS[p.session_type]} {p.session_type}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {p.duration_minutes} min
                          </p>
                          {p.description && (
                            <p className="mt-2 text-sm leading-relaxed text-foreground/70">{p.description}</p>
                          )}
                          {p.location && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {p.location}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-display text-xl font-bold text-primary">
                            KES {p.price_kes.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  className="mt-5 w-full"
                  onClick={book}
                  disabled={!selected}
                >
                  {user ? "Book this session" : "Sign up to book"}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Escrow protected · Pay with M-Pesa
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BIO + REVIEWS ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">

          {/* About */}
          <section>
            <h2 className="font-display text-2xl font-bold">About {c.display_name.split(" ")[0]}</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/80">
              {c.long_bio || c.bio || "No bio yet."}
            </p>
          </section>

          {/* Reviews */}
          <section>
            <h2 className="font-display text-2xl font-bold">
              Reviews
              {reviews.length > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                  {reviews.length}
                </span>
              )}
            </h2>
            {reviews.length === 0 ? (
              <p className="mt-4 text-muted-foreground">No reviews yet. Be the first to book a session.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-card p-5 shadow-card">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={r.fan.avatar_url ?? undefined} />
                        <AvatarFallback>{r.fan.display_name?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{r.fan.display_name}</p>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < r.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {r.comment && (
                      <p className="mt-3 text-sm leading-relaxed text-foreground/75">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
