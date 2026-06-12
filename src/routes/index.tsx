import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CreatorCard } from "@/components/CreatorCard";
import { getFeaturedCreators } from "@/lib/creators.functions";
import { ArrowRight, Video, Wallet, ShieldCheck, Sparkles, Star } from "lucide-react";
import heroImg from "@/assets/hero-creator.jpg";

const featuredQuery = queryOptions({
  queryKey: ["featured-creators"],
  queryFn: () => getFeaturedCreators(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CreatorConnect — Book Kenyan creators for live video sessions" },
      { name: "description", content: "Pay with M-Pesa to spend 1:1 time with your favourite Kenyan creators, coaches, and influencers. Verified profiles. Secure escrow." },
      { property: "og:title", content: "CreatorConnect — Book Kenyan creators for live video sessions" },
      { property: "og:description", content: "Pay with M-Pesa to spend 1:1 time with your favourite Kenyan creators." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredQuery),
  component: Index,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function Index() {
  const { data } = useSuspenseQuery(featuredQuery);
  const featured = data.creators;

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-gradient-spotlight" />
        <div className="grain pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-secondary-foreground/20 bg-secondary-foreground/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Launching in Kenya · Powered by M-Pesa
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Book a session.<br />
              <span className="text-gradient">Meet your favourite</span><br />
              creator.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-secondary-foreground/85">
              Private 1:1 live video with the coaches, musicians, marketers and influencers you actually follow.
              Pay with M-Pesa. Hop into a secure meeting room — no Zoom links required.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="xl" asChild>
                <Link to="/browse">Browse creators <ArrowRight className="h-5 w-5" /></Link>
              </Button>
              <Button variant="outline" size="xl" asChild className="border-secondary-foreground/30 text-secondary-foreground hover:border-accent hover:text-accent">
                <Link to="/become-creator">Become a creator</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-secondary-foreground/75">
              <div className="flex items-center gap-2"><Star className="h-4 w-4 fill-accent text-accent" /> 4.9 avg rating</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Escrow protected</div>
              <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" /> M-Pesa & cards</div>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-glow">
              <img src={heroImg} alt="Featured creator" className="h-full w-full object-cover" width={1024} height={1280} />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-card p-4 text-card-foreground shadow-pop sm:block">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground"><Video className="h-5 w-5" /></div>
                <div>
                  <p className="font-display text-sm font-bold">Live in 12 min</p>
                  <p className="text-xs text-muted-foreground">@zawadi · Brand strategy</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 top-12 hidden rounded-2xl bg-accent p-4 text-accent-foreground shadow-card md:block">
              <p className="font-display text-2xl font-bold leading-none">KES 2,500</p>
              <p className="mt-1 text-xs font-medium">30-min session</p>
            </div>
          </div>
        </div>
      </section>

      {/* STAT STRIP */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border md:grid-cols-4">
          {[
            { k: "200+", v: "verified creators" },
            { k: "20%", v: "platform fee" },
            { k: "M-Pesa", v: "instant checkout" },
            { k: "0", v: "external apps needed" },
          ].map((s) => (
            <div key={s.v} className="bg-card px-6 py-8 text-center">
              <p className="font-display text-3xl font-bold text-gradient sm:text-4xl">{s.k}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
            <h2 className="mt-2 font-display text-4xl font-bold sm:text-5xl">From scroll to session<br /> in three taps.</h2>
          </div>
          <Button variant="outline" asChild><Link to="/browse">Start browsing <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { n: "01", t: "Find your creator", d: "Filter by niche, price, or rating. Verified profiles tell you exactly what you're booking." },
            { n: "02", t: "Pay with M-Pesa", d: "Choose a package, pick a time, confirm. Funds are held in escrow until the session ends." },
            { n: "03", t: "Join the live room", d: "Join the in-app meeting room at the booked time. No Zoom, no extra installs." },
          ].map((step, i) => (
            <div key={step.n} className="group relative overflow-hidden rounded-3xl bg-gradient-card p-8 shadow-card transition hover:-translate-y-1 hover:shadow-pop">
              <p className="font-display text-7xl font-extrabold text-primary/15 group-hover:text-primary/30 transition-colors">{step.n}</p>
              <h3 className="mt-2 font-display text-2xl font-bold">{step.t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{step.d}</p>
              {i === 1 && <div className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">Escrow</div>}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED CREATORS */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Featured creators</p>
              <h2 className="mt-2 font-display text-4xl font-bold sm:text-5xl">The ones to watch.</h2>
            </div>
            <Button variant="ghost" asChild><Link to="/browse">View all <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>

          {featured.length === 0 ? (
            <div className="mt-10 rounded-3xl bg-card p-12 text-center shadow-card">
              <h3 className="font-display text-2xl font-bold">No creators yet</h3>
              <p className="mt-2 text-muted-foreground">Be the first — apply as a creator and we'll feature you on launch.</p>
              <Button variant="hero" className="mt-6" asChild><Link to="/become-creator">Apply now</Link></Button>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((c) => <CreatorCard key={c.user_id} creator={c} />)}
            </div>
          )}
        </div>
      </section>

      {/* CREATOR CTA */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-sunset p-10 text-primary-foreground shadow-pop sm:p-16">
          <div className="grain pointer-events-none absolute inset-0" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur">For creators</span>
              <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">Turn your audience into income — 80% of every booking is yours.</h2>
              <p className="mt-4 max-w-xl text-primary-foreground/90">Set your own price. Approve every booking. Get paid automatically after each session via M-Pesa.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button size="xl" asChild className="bg-card text-foreground hover:bg-card hover:scale-[1.02]">
                <Link to="/become-creator">Apply to be a creator <ArrowRight className="h-5 w-5" /></Link>
              </Button>
              <Button size="xl" variant="outline" asChild className="border-primary-foreground/40 text-primary-foreground hover:border-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/browse">See who's on the platform</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
