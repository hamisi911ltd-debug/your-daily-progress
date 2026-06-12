import { createFileRoute, Link } from "@tanstack/react-router";
import { Video, Mic, MicOff, VideoOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/room/$bookingId")({
  head: () => ({ meta: [{ title: "Live room · CreatorConnect" }] }),
  component: Room,
});

function Room() {
  const { bookingId } = Route.useParams();
  const [micOn, setMic] = useState(true);
  const [camOn, setCam] = useState(true);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Live session</p>
            <h1 className="font-display text-2xl font-bold">Room #{bookingId.slice(0, 8)}</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive-foreground" /> LIVE
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="relative aspect-video overflow-hidden rounded-3xl bg-gradient-hero shadow-glow">
            <div className="absolute inset-0 grid place-items-center text-secondary-foreground/70">
              <div className="text-center">
                <Video className="mx-auto h-12 w-12" />
                <p className="mt-3 font-display text-lg font-bold">Creator's video stream</p>
                <p className="text-sm">Demo placeholder — wire LiveKit / Daily.co for real video.</p>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 aspect-video w-48 overflow-hidden rounded-xl bg-secondary-foreground/15 backdrop-blur grid place-items-center text-xs">
              You
            </div>
          </div>
          <div className="rounded-3xl bg-secondary-foreground/5 p-5 backdrop-blur">
            <h3 className="font-display text-lg font-bold">Chat</h3>
            <p className="mt-3 text-sm text-secondary-foreground/70">Realtime chat coming soon.</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setMic(!micOn)} className="h-14 w-14 rounded-full border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground">
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCam(!camOn)} className="h-14 w-14 rounded-full border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground">
            {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          <Button asChild variant="destructive" size="icon" className="h-14 w-14 rounded-full">
            <Link to="/bookings"><PhoneOff className="h-5 w-5" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
