import { Link } from "@tanstack/react-router";
import { Star, BadgeCheck } from "lucide-react";

export interface CreatorCardData {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  headline: string;
  hero_image_url: string | null;
  niche_tags: string[];
  verified: boolean;
  average_rating: number;
  total_sessions: number;
  starting_price_kes: number;
}

export function CreatorCard({ creator }: { creator: CreatorCardData }) {
  return (
    <Link
      to="/creators/$creatorId"
      params={{ creatorId: creator.user_id }}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-card shadow-card transition-all duration-500 hover:-translate-y-1 hover:shadow-pop"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {creator.hero_image_url ? (
          <img
            src={creator.hero_image_url}
            alt={creator.display_name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-sunset" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-secondary/95 via-secondary/40 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          {creator.niche_tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur"
            >
              {tag}
            </span>
          ))}
        </div>
        {creator.verified && (
          <span className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-foreground shadow-card">
            <BadgeCheck className="h-4 w-4" />
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5 text-secondary-foreground">
          <h3 className="font-display text-xl font-bold leading-tight">{creator.display_name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-secondary-foreground/85">{creator.headline}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 bg-card px-5 py-3 text-sm">
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-accent text-accent" />
          <span className="font-semibold">{creator.average_rating > 0 ? creator.average_rating.toFixed(1) : "New"}</span>
          <span className="text-muted-foreground">· {creator.total_sessions} sessions</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">from</span>{" "}
          <span className="font-display font-bold text-primary">KES {creator.starting_price_kes.toLocaleString()}</span>
        </div>
      </div>
    </Link>
  );
}
