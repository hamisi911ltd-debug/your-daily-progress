import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getVideoRoom } from "@/lib/room.functions";
import { useVideoCall } from "@/hooks/useVideoCall";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  PhoneOff,
  Loader2,
  AlertCircle,
  UserRound,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/room/$bookingId")({
  head: () => ({ meta: [{ title: "Live room · Fanmeeet" }] }),
  component: Room,
});

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function useCallDuration(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);
  return seconds;
}

function Room() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const fetchRoom = useServerFn(getVideoRoom);

  const { data: room, isLoading, error: roomError } = useQuery({
    queryKey: ["video-room", bookingId],
    queryFn: () => fetchRoom({ data: { bookingId } }),
    retry: false,
    staleTime: Infinity,
  });

  const {
    status,
    error: callError,
    micEnabled,
    cameraEnabled,
    screenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    localVideoRef,
    remoteVideoRef,
  } = useVideoCall({ bookingId, role: room?.role === "host" ? "host" : "guest", enabled: !!room });

  const duration = useCallDuration(status === "connected");
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest";

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

  if (roomError || !room) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-5 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-display text-xl font-semibold">Cannot enter room</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {(roomError as Error)?.message ?? "Something went wrong. Please check your booking status."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/bookings">Back to bookings</Link>
        </Button>
      </div>
    );
  }

  const peerLabel = room.role === "host" ? "your fan" : "the creator";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-[#0b0a12]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-card/60 px-4 py-3 backdrop-blur">
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
          {status === "connected" && (
            <span className="hidden font-mono text-xs text-muted-foreground sm:block">
              {formatDuration(duration)}
            </span>
          )}
          <span className="hidden text-xs text-muted-foreground sm:block">
            {room.role === "host" ? "You are the creator" : "You are the fan"} · Secure private room
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            LIVE
          </span>
        </div>
      </div>

      {/* Stage */}
      <div className="relative flex-1 overflow-hidden bg-[#0b0a12]">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity",
            status === "connected" ? "opacity-100" : "opacity-0"
          )}
        />

        {status !== "connected" && status !== "failed" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                <UserRound className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold text-foreground">
                Waiting for {peerLabel} to join…
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your camera is ready. They'll appear here as soon as they connect.
              </p>
              <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin text-primary" />
            </div>
          </div>
        )}

        {status === "peer-left" && (
          <div className="absolute inset-x-0 top-4 flex justify-center">
            <div className="rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur">
              {peerLabel} left the call.
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="max-w-sm text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="mt-3 font-display text-lg font-semibold text-foreground">Connection problem</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {callError ?? "We couldn't keep the call connected. Try rejoining."}
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/bookings">Back to bookings</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Local picture-in-picture */}
        <div className="absolute bottom-4 right-4 aspect-video w-40 overflow-hidden rounded-xl border border-white/15 bg-black shadow-lg sm:w-56">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn("h-full w-full object-cover", !cameraEnabled && screenSharing === false && "opacity-0")}
          />
          {!cameraEnabled && !screenSharing && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1a1825]">
              <UserRound className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            {!micEnabled && <MicOff className="h-3 w-3 text-red-400" />}
            <span className="max-w-[6rem] truncate">{displayName} (You)</span>
          </div>
          {screenSharing && (
            <div className="absolute top-1.5 left-1.5 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              Sharing screen
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 border-t border-white/10 bg-card/60 px-4 py-4 backdrop-blur">
        <Button
          variant={micEnabled ? "secondary" : "destructive"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleMic}
          title={micEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button
          variant={cameraEnabled ? "secondary" : "destructive"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleCamera}
          title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        <Button
          variant={screenSharing ? "default" : "secondary"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleScreenShare}
          title={screenSharing ? "Stop sharing your screen" : "Share your screen"}
        >
          {screenSharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
        </Button>
        <Button asChild variant="destructive" size="icon" className="h-12 w-12 rounded-full" title="Leave call">
          <Link to="/bookings">
            <PhoneOff className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
