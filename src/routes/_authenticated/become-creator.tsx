import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { becomeCreator, getMyCreatorProfile } from "@/lib/creator-onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/become-creator")({
  head: () => ({ meta: [{ title: "Become a creator · CreatorConnect" }] }),
  component: BecomeCreatorPage,
});

function BecomeCreatorPage() {
  const navigate = useNavigate();
  const fetchMine = useServerFn(getMyCreatorProfile);
  const { data: existing } = useQuery({ queryKey: ["my-creator-profile"], queryFn: () => fetchMine() });

  const [headline, setHeadline] = useState("");
  const [longBio, setLongBio] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("2500");

  const apply = useServerFn(becomeCreator);
  const mut = useMutation({
    mutationFn: () => apply({ data: {
      headline,
      longBio,
      nicheTags: tags.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5),
      startingPriceKes: parseInt(price, 10),
    }}),
    onSuccess: () => { toast.success("You're a creator! Set up your packages next."); navigate({ to: "/creator-dashboard" }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if ((existing as any)?.isCreator) {
    return (
      <div className="mx-auto max-w-2xl p-12 text-center">
        <h1 className="font-display text-3xl font-bold">You're already a creator 🎉</h1>
        <p className="mt-2 text-muted-foreground">Manage your profile and packages from your dashboard.</p>
        <Button asChild variant="hero" className="mt-6"><Link to="/creator-dashboard">Open dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold">Become a creator</h1>
      <p className="mt-2 text-muted-foreground">Set up your public profile. You can edit packages and details anytime.</p>

      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="mt-8 space-y-5 rounded-3xl bg-card p-6 shadow-card">
        <div>
          <Label htmlFor="h">Headline</Label>
          <Input id="h" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} minLength={8} required placeholder="Brand strategist helping creators monetise" />
        </div>
        <div>
          <Label htmlFor="b">About you</Label>
          <Textarea id="b" value={longBio} onChange={(e) => setLongBio(e.target.value)} maxLength={2000} minLength={20} required rows={5} placeholder="Share your story, expertise, and what fans will get from a session." />
        </div>
        <div>
          <Label htmlFor="t">Niche tags (comma-separated, up to 5)</Label>
          <Input id="t" value={tags} onChange={(e) => setTags(e.target.value)} required placeholder="Business, Marketing, Coaching" />
        </div>
        <div>
          <Label htmlFor="p">Starting price (KES)</Label>
          <Input id="p" type="number" min={100} max={500000} value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <Button type="submit" variant="hero" size="lg" disabled={mut.isPending}>
          {mut.isPending ? "Submitting…" : "Submit application"}
        </Button>
      </form>
    </div>
  );
}
