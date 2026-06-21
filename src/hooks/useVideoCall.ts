import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTurnCredentials } from "@/lib/turn.functions";
import { getStoredToken } from "@/integrations/cloudflare/auth";

export type CallStatus = "connecting" | "waiting-for-peer" | "connected" | "peer-left" | "failed";

type SignalMessage =
  | { type: "peer-joined" }
  | { type: "peer-left" }
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit };

interface UseVideoCallOptions {
  bookingId: string;
  role: "host" | "guest";
  enabled: boolean;
}

export function useVideoCall({ bookingId, role, enabled }: UseVideoCallOptions) {
  const fetchTurnCredentials = useServerFn(getTurnCredentials);

  const [status, setStatus] = useState<CallStatus>("connecting");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSetRef = useRef(false);

  const send = useCallback((message: SignalMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    async function start() {
      const token = getStoredToken();
      if (!token) {
        setError("You must be signed in to join this call.");
        setStatus("failed");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        setError("Could not access your camera/microphone. Check your browser permissions.");
        setStatus("failed");
        return;
      }
      if (disposed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const { iceServers } = await fetchTurnCredentials();
      if (disposed) return;

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        setStatus("connected");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) send({ type: "ice-candidate", candidate: event.candidate.toJSON() });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          setError("Connection failed. Check your network and try rejoining.");
          setStatus("failed");
        }
      };

      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(
        `${wsProtocol}://${window.location.host}/api/signal/${bookingId}?token=${encodeURIComponent(token)}`
      );
      wsRef.current = ws;

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data) as SignalMessage;

        if (message.type === "peer-joined") {
          setStatus((current) => (current === "connected" ? current : "connecting"));
          if (role === "host") {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send({ type: "offer", sdp: offer.sdp! });
          }
          return;
        }

        if (message.type === "peer-left") {
          setStatus("peer-left");
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          remoteDescriptionSetRef.current = false;
          return;
        }

        if (message.type === "offer") {
          await pc.setRemoteDescription({ type: "offer", sdp: message.sdp });
          remoteDescriptionSetRef.current = true;
          await flushPendingCandidates(pc, pendingCandidatesRef);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ type: "answer", sdp: answer.sdp! });
          return;
        }

        if (message.type === "answer") {
          await pc.setRemoteDescription({ type: "answer", sdp: message.sdp });
          remoteDescriptionSetRef.current = true;
          await flushPendingCandidates(pc, pendingCandidatesRef);
          return;
        }

        if (message.type === "ice-candidate") {
          if (remoteDescriptionSetRef.current) {
            await pc.addIceCandidate(message.candidate);
          } else {
            pendingCandidatesRef.current.push(message.candidate);
          }
        }
      };

      ws.onopen = () => setStatus((current) => (current === "connecting" ? "waiting-for-peer" : current));
      ws.onerror = () => {
        setError("Lost connection to the call server.");
        setStatus("failed");
      };
    }

    start();

    return () => {
      disposed = true;
      wsRef.current?.close();
      wsRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      pendingCandidatesRef.current = [];
      remoteDescriptionSetRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, bookingId, role]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextEnabled = !micEnabled;
    stream.getAudioTracks().forEach((t) => (t.enabled = nextEnabled));
    setMicEnabled(nextEnabled);
  }, [micEnabled]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextEnabled = !cameraEnabled;
    stream.getVideoTracks().forEach((t) => (t.enabled = nextEnabled));
    setCameraEnabled(nextEnabled);
  }, [cameraEnabled]);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    if (screenSharing) {
      const cameraTrack = cameraTrackRef.current;
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setScreenSharing(false);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(screenTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = displayStream;
      screenTrack.onended = () => toggleScreenShare();
      setScreenSharing(true);
    } catch {
      // user cancelled the screen-share picker
    }
  }, [screenSharing]);

  return {
    status,
    error,
    micEnabled,
    cameraEnabled,
    screenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    localVideoRef,
    remoteVideoRef,
  };
}

async function flushPendingCandidates(
  pc: RTCPeerConnection,
  pendingRef: RefObject<RTCIceCandidateInit[]>
) {
  for (const candidate of pendingRef.current) {
    await pc.addIceCandidate(candidate);
  }
  pendingRef.current = [];
}
