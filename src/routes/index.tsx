import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CreatorCard } from "@/components/CreatorCard";
import { getFeaturedCreators } from "@/lib/creators.functions";
import { SocialSnow } from "@/components/SocialSnow";
import {
  ArrowRight, Video, Wallet, ShieldCheck, Star,
  Users, BadgeCheck, Quote, Mic, Music, Dumbbell, TrendingUp,
} from "lucide-react";
import heroImg from "@/assets/hero-creator.jpg";

const featuredQuery = queryOptions({
  queryKey: ["featured-creators"],
  queryFn: () => getFeaturedCreators(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fanmeeet — Book live 1:1 sessions with your favourite Kenyan creators" },
      { name: "description", content: "Kenya's first marketplace to book private live video sessions with top creators, coaches & influencers. Pay with M-Pesa. No apps needed." },
      { property: "og:title", content: "Fanmeeet — Book live sessions with your favourite creators" },
      { property: "og:description", content: "Book private 1:1 video sessions with Kenya's top creators. Pay with M-Pesa." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredQuery),
  component: Index,
  errorComponent: ({ error }) => <div className="p-12 text-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

const img = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const EXPERIENCE = [
  {
    step: "01",
    title: "Discover your creator",
    desc: "Browse hundreds of verified Kenyan creators — musicians, fitness coaches, business mentors, and influencers. Filter by niche, price, or rating to find your perfect match.",
    photo: img("1529156069898-49953e39b3ac", 600, 420),
    alt: "Friends scrolling through creators on their phones",
    icon: Users,
  },
  {
    step: "02",
    title: "Book & pay with M-Pesa",
    desc: "Pick a session package, choose your time slot, and pay instantly with Lipa na M-Pesa. Your money is held in secure escrow until the session is done.",
    photo: img("1556742049-0cfed4f6a45d", 600, 420),
    alt: "Fan completing an M-Pesa payment on their phone",
    icon: Wallet,
  },
  {
    step: "03",
    title: "Go live — face to face",
    desc: "At the booked time, join a private 1:1 HD video room built right into the platform. No Zoom links, no installs, no distractions — just you and your creator.",
    photo: img("1588196749597-9ff075ee6b5b", 600, 420),
    alt: "Fan on an exciting video call with their favourite creator",
    icon: Video,
  },
];

const NICHES = [
  { icon: Music, label: "Music & arts" },
  { icon: TrendingUp, label: "Business & finance" },
  { icon: Dumbbell, label: "Fitness & wellness" },
  { icon: Mic, label: "Content creation" },
];

const TESTIMONIALS = [
  {
    quote: "I booked a 30-minute brand strategy session with Zawadi and it completely transformed my business. Worth every shilling — and I've booked three more since.",
    name: "Amina K.",
    role: "Small business owner · Nairobi",
    avatar: img("1494790108377-be9c29b29330", 80, 80),
    rating: 5,
  },
  {
    quote: "As a huge music fan, I never thought I'd get to actually sit with my favourite producer and learn about the industry. Fanmeeet made it happen in 20 minutes.",
    name: "Brian M.",
    role: "Aspiring musician · Mombasa",
    avatar: img("1506794778202-cad84cf45f1d", 80, 80),
    rating: 5,
  },
  {
    quote: "The M-Pesa payment was instant, the video quality was perfect, and my creator was fully present — no distractions. I felt like a VIP. Booked again the same day.",
    name: "Grace W.",
    role: "Content creator · Kisumu",
    avatar: img("1534528741775-53994a69daeb", 80, 80),
    rating: 5,
  },
];

function Index() {
  const { data } = useSuspenseQuery(featuredQuery);
  const featured = data.creators;

  return (
    <div className="overflow-x-hidden">

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[oklch(0.05_0_0)] text-white">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-spotlight" />
        <div className="grain pointer-events-none absolute inset-0" />

        {/* Falling social icons — hero only */}
        <SocialSnow />

        {/* Frost surface over icons — subdues them without full blur */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 2,
            background: "rgba(5, 0, 18, 0.52)",
            backdropFilter: "blur(1px)",
            WebkitBackdropFilter: "blur(1px)",
          }}
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-2 lg:pb-32 lg:pt-10" style={{ zIndex: 3 }}>
          {/* Copy */}
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Your favourite<br />
              creator,{" "}
              <span className="text-gradient">just<br className="hidden lg:block" /> for you.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/75">
              Fanmeeet is Kenya's first marketplace where fans book private 1:1 live video sessions
              with the coaches, musicians, marketers and influencers they actually follow.
              Pay with M-Pesa. No extra apps. Just real connection.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="xl" asChild>
                <Link to="/browse">Browse creators <ArrowRight className="h-5 w-5" /></Link>
              </Button>
              <Button size="xl" asChild className="border-2 border-white/25 bg-transparent text-white hover:bg-white/10">
                <Link to="/auth" search={{ mode: "signup" }}>Get started free</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/55">
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> 4.9 avg rating
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" /> Escrow protected
              </span>
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Lipa na M-Pesa
              </span>
            </div>
          </div>

          {/* Live session mockup */}
          <div className="relative flex justify-center">
            <div className="relative w-full max-w-sm">
              {/* Main creator "screen" */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] shadow-glow">
                <img src={heroImg} alt="Creator live session" className="h-full w-full object-cover" />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                {/* LIVE badge */}
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1 text-xs font-bold backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
                </div>
                {/* Creator info */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-display text-lg font-bold">Zawadi Achieng</p>
                  <p className="text-sm text-white/70">Brand Strategist · Nairobi</p>
                  {/* Mock controls */}
                  <div className="mt-3 flex gap-2">
                    {["🎤","📹","💬"].map((e) => (
                      <span key={e} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-base backdrop-blur">{e}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fan PiP thumbnail */}
              <div className="absolute -bottom-3 -right-3 h-24 w-20 overflow-hidden rounded-2xl border-2 border-white/20 shadow-pop">
                <img
                  src={img("1573497019940-1c28c88b4f3e", 80, 96)}
                  alt="Fan in session"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10" />
              </div>

              {/* Booking confirmed badge */}
              <div className="absolute -left-6 -top-4 hidden rounded-2xl border border-border/60 bg-card p-3 shadow-pop sm:block">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand">
                    <BadgeCheck className="h-4 w-4 text-white" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Session confirmed!</p>
                    <p className="text-[10px] text-muted-foreground">KES 2,500 · escrowed</p>
                  </div>
                </div>
              </div>

              {/* Rating float */}
              <div className="absolute -right-8 top-16 hidden rounded-2xl border border-border/60 bg-card p-3 shadow-card md:block">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((i) => <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-foreground">"Best 30 mins ever!"</p>
                <p className="text-[10px] text-muted-foreground">— Amina K.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STAT BAR ──────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card/60">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border md:grid-cols-4">
          {[
            { k: "200+", v: "Verified creators" },
            { k: "4.9★", v: "Average fan rating" },
            { k: "M-Pesa", v: "Instant, secure checkout" },
            { k: "80%", v: "Goes straight to creators" },
          ].map((s) => (
            <div key={s.v} className="bg-card px-6 py-8 text-center">
              <p className="font-display text-3xl font-bold text-gradient sm:text-4xl">{s.k}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── WHAT IS CREATORCONNECT ────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Text */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">What is Fanmeeet?</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
              The direct line between fans and the{" "}
              <span className="text-gradient">creators they love.</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Fanmeeet is Kenya's first marketplace for booking private, paid live video sessions with your favourite creators.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Whether you want business advice from a top marketer, vocal coaching from a musician you admire,
              a fitness plan from your go-to trainer, or just 30 minutes of real conversation with someone who inspires you —
              we make it possible, affordable, and safe.
            </p>

            {/* Niches */}
            <div className="mt-8 flex flex-wrap gap-3">
              {NICHES.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-card">
                  <Icon className="h-4 w-4 text-primary" /> {label}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              {[
                { icon: Video, t: "Private HD video rooms" },
                { icon: ShieldCheck, t: "Escrow payment protection" },
                { icon: BadgeCheck, t: "Identity-verified creators" },
                { icon: Wallet, t: "Lipa na M-Pesa checkout" },
              ].map(({ icon: Icon, t }) => (
                <div key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 shrink-0 text-accent" />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Photo collage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="row-span-2 overflow-hidden rounded-3xl shadow-glow">
              <img
                src={img("1611162617213-7d7a39e9b1d7", 400, 560)}
                alt="Creator recording live content"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-3xl shadow-card">
              <img
                src={img("1529156069898-49953e39b3ac", 300, 230)}
                alt="Fans connecting via video"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-brand p-6 shadow-pop">
              <div className="text-center text-white">
                <p className="font-display text-4xl font-extrabold">1:1</p>
                <p className="mt-1 text-sm font-semibold opacity-90">Private sessions</p>
                <p className="text-xs opacity-70">just you + your creator</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAN EXPERIENCE — 3 photo steps ───────────────────────────────── */}
      <section className="bg-muted/20 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The fan experience</p>
            <h2 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
              From fan to{" "}
              <span className="text-gradient">face-to-face</span>{" "}
              in minutes.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Three simple steps separate you from a private conversation with the creators you've followed, watched, and been inspired by.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {EXPERIENCE.map(({ step, title, desc, photo, alt, icon: Icon }) => (
              <div key={step} className="group relative flex flex-col overflow-hidden rounded-3xl bg-card shadow-card transition-all duration-500 hover:-translate-y-2 hover:shadow-glow">
                {/* Photo */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={photo}
                    alt={alt}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {/* Step badge */}
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-bold text-white shadow-pop">
                    <Icon className="h-3.5 w-3.5" /> Step {step}
                  </div>
                </div>
                {/* Content */}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-xl font-bold">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/browse">Find your creator now <ArrowRight className="h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
            <h2 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
              From scroll to session<br />in three taps.
            </h2>
          </div>
          <Button variant="outline" asChild>
            <Link to="/browse">Start browsing <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { n: "01", t: "Find your creator", d: "Filter by niche, price, or rating. Verified profiles tell you exactly what you're booking.", tag: null },
            { n: "02", t: "Pay with M-Pesa", d: "Choose a package, pick a time, confirm. Funds are held in secure escrow until the session ends.", tag: "Escrow" },
            { n: "03", t: "Join the live room", d: "Join the private in-app video room at the booked time. No Zoom, no installs, no external links.", tag: null },
          ].map((step) => (
            <div key={step.n} className="group relative overflow-hidden rounded-3xl bg-card p-8 shadow-card transition hover:-translate-y-1 hover:shadow-pop">
              <p className="font-display text-7xl font-extrabold text-primary/10 transition-colors group-hover:text-primary/25">{step.n}</p>
              <h3 className="mt-2 font-display text-2xl font-bold">{step.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.d}</p>
              {step.tag && (
                <div className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                  {step.tag}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURED CREATORS ─────────────────────────────────────────────── */}
      <section className="bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Featured creators</p>
              <h2 className="mt-2 font-display text-4xl font-bold sm:text-5xl">The ones to watch.</h2>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/browse">View all <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          {featured.length === 0 ? (
            <div className="mt-10 rounded-3xl bg-card p-12 text-center shadow-card">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-display text-2xl font-bold">Be the first creator</h3>
              <p className="mt-2 text-muted-foreground">
                We're launching soon. Apply now and we'll feature you on day one.
              </p>
              <Button variant="hero" className="mt-6" asChild>
                <Link to="/become-creator">Apply to become a creator</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((c) => <CreatorCard key={c.user_id} creator={c} />)}
            </div>
          )}
        </div>
      </section>

      {/* ─── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Fan stories</p>
          <h2 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Real sessions.{" "}
            <span className="text-gradient">Real moments.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Thousands of Kenyan fans have already had their first private session. Here's what they said.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="flex flex-col rounded-3xl bg-card p-7 shadow-card">
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <Quote className="mb-2 h-7 w-7 text-primary/30" />
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">"{t.quote}"</p>
              <div className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/30"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const fallback = el.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CREATOR CTA ───────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-sunset p-10 text-white shadow-pop sm:p-16">
          <div className="grain pointer-events-none absolute inset-0" />
          {/* Background radial glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-black/20 blur-3xl" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur">
                For creators
              </span>
              <h2 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
                Turn your audience<br />into income.
              </h2>
              <p className="mt-3 text-lg font-semibold opacity-90">80% of every booking goes directly to you.</p>
              <p className="mt-3 max-w-lg leading-relaxed opacity-80">
                Set your own price. Approve every booking. Get paid automatically after each session via M-Pesa.
                Your audience is already waiting — they just need a way to reach you.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                {["Set your own price", "Approve every booking", "Paid via M-Pesa instantly", "Keep 80% of earnings"].map((f) => (
                  <span key={f} className="flex items-center gap-2 opacity-90">
                    <ShieldCheck className="h-4 w-4 shrink-0" /> {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="xl" asChild className="bg-white text-gray-900 font-bold hover:bg-white/90 hover:scale-[1.02]">
                <Link to="/become-creator">Apply to be a creator <ArrowRight className="h-5 w-5" /></Link>
              </Button>
              <Button size="xl" variant="outline" asChild className="border-white/40 text-white hover:bg-white/10 hover:border-white">
                <Link to="/browse">Explore the platform</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
