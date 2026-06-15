import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getVideoRoom } from "@/lib/room.functions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2, AlertCircle, Video } from "lucide-react";

export const Route = createFileRoute("/_authenticated/room/$bookingId")({
  head: () => ({ meta: [{ title: "Live room · CreatorConnect" }] }),
  component: Room,
});

function Room() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const fetchRoom = useServerFn(getVideoRoom);

  const { data: room, isLoading, error } = useQuery({
    queryKey: ["video-room", bookingId],
    queryFn: () => fetchRoom({ data: { bookingId } }),
    retry: false,
    staleTime: Infinity,
  });

  const displayName = encodeURIComponent(
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest"
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-3 font-display text-lg font-semibold">Preparing your room…</p>
          <p className="mt-1 text-sm text-muted-foreground">Setting up a private video space for you.</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-5 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-display text-xl font-semibold">Cannot enter room</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {(error as Error)?.message ?? "Something went wrong. Please check your booking status."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/bookings">Back to bookings</Link>
        </Button>
      </div>
    );
  }

  const jitsiSrc = [
    `https://meet.jit.si/${room.roomName}`,
    `#config.disableDeepLinking=true`,
    `&config.prejoinPageEnabled=true`,
    `&config.startWithVideoMuted=false`,
    `&config.startWithAudioMuted=false`,
    `&config.defaultRemoteDisplayName=Participant`,
    `&userInfo.displayName=${displayName}`,
    `&interfaceConfig.SHOW_JITSI_WATERMARK=false`,
    `&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false`,
  ].join("");

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
            <Video className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Live session</p>
            <p className="font-display text-sm font-bold text-foreground">Room #{bookingId.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:block">
            {room.role === "host" ? "You are the creator" : "You are the fan"} · Secure private room
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            LIVE
          </span>
          <Button asChild variant="destructive" size="sm" className="rounded-full">
            <Link to="/bookings">
              <PhoneOff className="mr-1.5 h-3.5 w-3.5" /> Leave
            </Link>
          </Button>
        </div>
      </div>

      {/* Jitsi iframe — takes all remaining height */}
      <iframe
        src={jitsiSrc}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="flex-1 w-full border-0"
        title="CreatorConnect video session"
      />
    </div>
  );
}
