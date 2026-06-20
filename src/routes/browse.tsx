import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { listCreators } from "@/lib/creators.functions";
import { CreatorCard } from "@/components/CreatorCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const NICHES = ["Business", "Fitness", "Music", "Marketing", "Lifestyle", "Tech", "Wellness"];

const browseQuery = queryOptions({
  queryKey: ["browse-creators"],
  queryFn: () => listCreators({ data: {} }),
});

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse creators · Fanmeeet" },
      { name: "description", content: "Browse and book Kenyan creators for live 1:1 video sessions." },
      { property: "og:title", content: "Browse creators · Fanmeeet" },
      { property: "og:description", content: "Find your favourite Kenyan creator and book a private session." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(browseQuery),
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
  component: BrowsePage,
});

function BrowsePage() {
  const { data } = useSuspenseQuery(browseQuery);
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState<string | null>(null);

  const filtered = data.creators.filter((c) => {
    if (niche && !c.niche_tags.some((t: string) => t.toLowerCase() === niche.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.display_name.toLowerCase().includes(q) || c.headline.toLowerCase().includes(q) ||
        c.niche_tags.some((t: string) => t.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div>
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h1 className="font-display text-5xl font-extrabold sm:text-6xl">Find your creator.</h1>
          <p className="mt-3 max-w-xl text-lg text-secondary-foreground/85">Search verified Kenyan creators across every niche. Book in under a minute.</p>
          <div className="mt-8 flex items-center gap-2 rounded-full bg-card p-1.5 text-card-foreground shadow-pop sm:max-w-xl">
            <Search className="ml-3 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, niche, or vibe…"
              className="border-0 bg-transparent text-base focus-visible:ring-0"
              maxLength={80}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setNiche(null)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!niche ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70"}`}>All</button>
          {NICHES.map((n) => (
            <button key={n} onClick={() => setNiche(n === niche ? null : n)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${niche === n ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70"}`}>{n}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-12 rounded-3xl bg-card p-12 text-center shadow-card">
            <h3 className="font-display text-2xl font-bold">No creators match that.</h3>
            <p className="mt-2 text-muted-foreground">Try clearing filters, or check back soon — we're onboarding daily.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => <CreatorCard key={c.user_id} creator={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}
