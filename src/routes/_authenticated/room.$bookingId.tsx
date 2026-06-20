import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getVideoRoom } from "@/lib/room.functions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2, AlertCircle, Video } from "lucide-react";

export const Route = createFileRoute("/_authenticated/room/$bookingId")({
  head: () => ({ meta: [{ title: "Live room · Fanmeeet" }] }),
  component: Room,
});

const JITSI_DOMAIN = "meet.jit.si";
const JITSI_SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiMeetAPI;
  }
}

interface JitsiMeetAPI {
  addEventListener(event: string, listener: (...args: unknown[]) => void): void;
  executeCommand(command: string, ...args: unknown[]): void;
  dispose(): void;
}

let jitsiScriptPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (jitsiScriptPromise) return jitsiScriptPromise;

  jitsiScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = JITSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the video engine. Check your connection."));
    document.head.appendChild(script);
  });
  return jitsiScriptPromise;
}

function Room() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchRoom = useServerFn(getVideoRoom);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiMeetAPI | null>(null);

  const { data: room, isLoading, error } = useQuery({
    queryKey: ["video-room", bookingId],
    queryFn: () => fetchRoom({ data: { bookingId } }),
    retry: false,
    staleTime: Infinity,
  });

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest";

  useEffect(() => {
    if (!room || !containerRef.current) return;
    let disposed = false;

    loadJitsiScript()
      .then(() => {
        if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: room.roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          configOverwrite: {
            disableDeepLinking: true,
            prejoinPageEnabled: true,
            startWithVideoMuted: false,
            startWithAudioMuted: false,
            enableWelcomePage: false,
            enableClosePage: false,
            disableInviteFunctions: true,
            doNotStoreRoom: true,
            hideConferenceSubject: true,
            disableAddingBackgroundImage: true,
            disablePolls: true,
            disableReactions: false,
            disableSelfView: false,
            // Two-party calls route peer-to-peer instead of through the relay server — the
            // single biggest lever for cutting latency/lag on a free shared Jitsi deployment.
            p2p: { enabled: true },
            channelLastN: -1,
            resolution: 720,
            constraints: {
              video: { height: { ideal: 720, max: 720, min: 240 } },
            },
            disableAudioLevels: true,
            enableNoisyMicDetection: false,
          },
          interfaceConfigOverwrite: {
            APP_NAME: "Fanmeeet",
            NATIVE_APP_NAME: "Fanmeeet",
            PROVIDER_NAME: "Fanmeeet",
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            DEFAULT_BACKGROUND: "#05040a",
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "desktop",
              "fullscreen",
              "fodeviceselection",
              "chat",
              "raisehand",
              "tileview",
              "select-background",
              "settings",
              "hangup",
            ],
            SETTINGS_SECTIONS: ["devices", "profile"],
          },
        });

        apiRef.current = api;
        api.addEventListener("readyToClose", () => navigate({ to: "/bookings" }));
      })
      .catch((err) => {
        console.error(err);
      });

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.roomName]);

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

      {/* Jitsi mounts directly into this node via the IFrame API */}
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}
