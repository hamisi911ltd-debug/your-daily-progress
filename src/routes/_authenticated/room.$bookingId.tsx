import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getZoomRoomCredentials } from "@/lib/zoom.functions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2, AlertCircle, Video, MapPin } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/_authenticated/room/$bookingId")({
  head: () => ({ meta: [{ title: "Live room · CreatorConnect" }] }),
  component: Room,
});

function Room() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const fetchCreds = useServerFn(getZoomRoomCredentials);

  const { data: creds, isLoading, error } = useQuery({
    queryKey: ["zoom-creds", bookingId],
    queryFn: () => fetchCreds({ data: { bookingId } }),
    retry: false,
    staleTime: Infinity,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [joined, setJoined] = useState(false);
  const [zoomError, setZoomError] = useState<string | null>(null);

  useEffect(() => {
    if (!creds || !containerRef.current) return;

    async function initZoom() {
      try {
        // Dynamic import keeps the heavy SDK out of SSR bundle
        const mod = await import("@zoom/meetingsdk/embedded");
        const ZoomMtgEmbedded = (mod as any).default ?? mod;
        const client = ZoomMtgEmbedded.createClient();

        await client.init({
          zoomAppRoot: containerRef.current!,
          language: "en-US",
          customize: {
            video: { popper: { disableDraggable: true } },
          },
        });

        await client.join({
          meetingNumber: creds!.meetingNumber,
          signature: creds!.signature,
          sdkKey: creds!.sdkKey,
          userName:
            user?.user_metadata?.full_name ||
            user?.email?.split("@")[0] ||
            "Guest",
          userEmail: user?.email ?? "",
          password: creds!.password,
        });

        setJoined(true);
      } catch (err: any) {
        setZoomError(err?.message ?? "Failed to connect to meeting room");
      }
    }

    initZoom();
  }, [creds, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-secondary">
        <div className="text-center text-secondary-foreground">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-3 font-display text-lg font-semibold">Preparing your room…</p>
        </div>
      </div>
    );
  }

  if (error || zoomError) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-secondary px-4 text-secondary-foreground">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="font-display text-lg text-center">
          {(error as Error)?.message ?? zoomError}
        </p>
        <Button asChild variant="outline" className="border-secondary-foreground/30 text-secondary-foreground hover:text-secondary-foreground">
          <Link to="/bookings">Back to bookings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Live session</p>
            <h1 className="font-display text-2xl font-bold">Room #{bookingId.slice(0, 8)}</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive-foreground" /> LIVE
          </span>
        </div>

        {/* Zoom container — SDK renders into this div */}
        <div
          ref={containerRef}
          id="meetingSDKElement"
          className="w-full overflow-hidden rounded-3xl bg-secondary-foreground/5 shadow-glow"
          style={{ minHeight: 580 }}
        >
          {!joined && !zoomError && (
            <div className="flex min-h-[580px] items-center justify-center">
              <div className="text-center text-secondary-foreground/70">
                <Video className="mx-auto h-12 w-12" />
                <p className="mt-3 font-display text-lg font-bold">Connecting to Zoom…</p>
                <p className="mt-1 text-sm">Please allow camera and microphone access.</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <Button asChild variant="destructive" size="sm" className="rounded-full px-5">
            <Link to="/bookings">
              <PhoneOff className="mr-2 h-4 w-4" /> Leave meeting
            </Link>
          </Button>
        </div>

        <p className="mt-3 text-center text-xs text-secondary-foreground/50">
          Powered by Zoom · Session recorded only with both parties' consent.
        </p>
      </div>
    </div>
  );
}
