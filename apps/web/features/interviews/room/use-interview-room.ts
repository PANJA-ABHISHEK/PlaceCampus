"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import type {
  InterviewQuestion,
  RoomChatMessage,
  RoomMediaState,
  RoomState,
  RtcConfigResponse,
} from "@placecampus/shared-types";
import { apiClient } from "@/lib/api-client";
import { fetchRtcConfig } from "../hooks/use-interviews";

/**
 * Lifecycle of the call as the user sees it.
 * - joining: connecting to the signaling server / validating access
 * - waiting: student waiting to be admitted, or the other person is not here yet
 * - connecting: both present and admitted; WebRTC negotiation in progress
 * - connected: media is flowing (only set from RTCPeerConnection.connectionState)
 * - reconnecting: the network dropped; trying to recover
 * - ended / error: terminal
 */
export type CallPhase = "joining" | "waiting" | "connecting" | "connected" | "reconnecting" | "ended" | "error";

export interface UseInterviewRoomOptions {
  roomId: string;
  /** The stream approved on the device-check screen (may have no video or audio track). */
  localStream: MediaStream;
  initialMedia: { audio: boolean; video: boolean };
}

const DISCONNECT_GRACE_MS = 4_000;

type Ack<T = unknown> = { ok: boolean; error?: string; data?: T };

/** Makes sure the access token is fresh (the API client refreshes on 401). */
async function freshToken() {
  try {
    await apiClient.get("/auth/me");
  } catch {
    /* the socket handshake will report the auth error */
  }
  return apiClient.getAccessToken();
}

export function useInterviewRoom({ roomId, localStream, initialMedia }: UseInterviewRoomOptions) {
  const [phase, setPhase] = React.useState<CallPhase>("joining");
  const [error, setError] = React.useState<string | null>(null);
  const [endReason, setEndReason] = React.useState<"ended" | "cancelled" | "left" | null>(null);
  const [room, setRoom] = React.useState<RoomState | null>(null);
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [peerMedia, setPeerMedia] = React.useState<RoomMediaState | null>(null);
  const [media, setMedia] = React.useState<RoomMediaState>({
    audio: initialMedia.audio && localStream.getAudioTracks().length > 0,
    video: initialMedia.video && localStream.getVideoTracks().length > 0,
    screen: false,
  });
  const [screenStream, setScreenStream] = React.useState<MediaStream | null>(null);
  const [messages, setMessages] = React.useState<RoomChatMessage[]>([]);
  const [askedQuestions, setAskedQuestions] = React.useState<InterviewQuestion[] | null>(null);
  const [socketConnected, setSocketConnected] = React.useState(false);

  // Mutable call machinery lives in refs so socket handlers always see the latest.
  const socketRef = React.useRef<Socket | null>(null);
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const pcPeerSessionRef = React.useRef<string | null>(null);
  const pendingCandidatesRef = React.useRef<RTCIceCandidateInit[]>([]);
  const rtcConfigRef = React.useRef<RtcConfigResponse | null>(null);
  const isInitiatorRef = React.useRef(false);
  const mediaRef = React.useRef(media);
  const screenTrackRef = React.useRef<MediaStreamTrack | null>(null);
  const disconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const terminalRef = React.useRef(false);
  const [clientSessionId] = React.useState(() => crypto.randomUUID());

  React.useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  // Apply the device-check choices to the tracks once.
  React.useEffect(() => {
    localStream.getAudioTracks().forEach((t) => (t.enabled = initialMedia.audio));
    localStream.getVideoTracks().forEach((t) => (t.enabled = initialMedia.video));
  }, [localStream, initialMedia.audio, initialMedia.video]);

  const emitMedia = React.useCallback((next: RoomMediaState) => {
    socketRef.current?.emit("media:state", next);
  }, []);

  /* ----------------------------- Peer connection ----------------------------- */

  const closePeer = React.useCallback(() => {
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
    disconnectTimerRef.current = null;
    const pc = pcRef.current;
    pcRef.current = null;
    pcPeerSessionRef.current = null;
    pendingCandidatesRef.current = [];
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    setRemoteStream(null);
  }, []);

  /** Outgoing video is the screen while sharing, otherwise the camera. */
  const outgoingVideoTrack = React.useCallback(
    () => screenTrackRef.current ?? localStream.getVideoTracks()[0] ?? null,
    [localStream],
  );

  const attachLocalTracks = React.useCallback(
    (pc: RTCPeerConnection) => {
      for (const transceiver of pc.getTransceivers()) {
        const kind = transceiver.receiver.track?.kind;
        if (kind !== "audio" && kind !== "video") continue;
        transceiver.direction = "sendrecv";
        const track = kind === "audio" ? (localStream.getAudioTracks()[0] ?? null) : outgoingVideoTrack();
        void transceiver.sender.replaceTrack(track);
      }
    },
    [localStream, outgoingVideoTrack],
  );

  const restartIce = React.useCallback(async () => {
    const pc = pcRef.current;
    const socket = socketRef.current;
    if (!pc || !socket || terminalRef.current) return;
    if (isInitiatorRef.current) {
      try {
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", { description: pc.localDescription, sessionId: clientSessionId });
      } catch {
        /* a new ready event will rebuild the connection */
      }
    } else {
      socket.emit("webrtc:restart");
    }
  }, [clientSessionId]);

  const createPeer = React.useCallback(
    (peerSessionId: string) => {
      closePeer();
      const pc = new RTCPeerConnection({ iceServers: rtcConfigRef.current?.iceServers ?? [] });
      pcRef.current = pc;
      pcPeerSessionRef.current = peerSessionId;

      const inbound = new MediaStream();
      pc.ontrack = (event) => {
        if (!inbound.getTracks().includes(event.track)) inbound.addTrack(event.track);
        setRemoteStream(inbound);
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("webrtc:ice-candidate", { candidate: event.candidate.toJSON(), sessionId: clientSessionId });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc || terminalRef.current) return;
        const state = pc.connectionState;
        if (state === "connected") {
          if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
          setPhase("connected");
        } else if (state === "disconnected") {
          setPhase("reconnecting");
          if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = setTimeout(() => void restartIce(), DISCONNECT_GRACE_MS);
        } else if (state === "failed") {
          setPhase("reconnecting");
          void restartIce();
        } else if (state === "connecting" || state === "new") {
          setPhase((p) => (p === "reconnecting" ? p : "connecting"));
        }
      };
      return pc;
    },
    [clientSessionId, closePeer, restartIce],
  );

  const flushCandidates = React.useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* stale candidate from a previous negotiation */
      }
    }
  }, []);

  /* ------------------------------- Signaling ------------------------------- */

  React.useEffect(() => {
    terminalRef.current = false;
    let disposed = false;

    const socket = io(`${apiClient.origin}/interviews`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
      auth: (cb) => {
        void freshToken().then((token) => cb({ token }));
      },
    });
    socketRef.current = socket;

    const fail = (message: string) => {
      terminalRef.current = true;
      setError(message);
      setPhase("error");
      closePeer();
      socket.disconnect();
    };

    const applyState = (state: RoomState) => {
      setRoom(state);
      if (state.peer) setPeerMedia(state.peer.media);
      else setPeerMedia(null);
      setPhase((current) => {
        if (current === "connected" || current === "reconnecting" || current === "ended" || current === "error") {
          return state.peer ? current : "waiting";
        }
        const studentWaiting = state.you.role === "STUDENT" && !state.admitted;
        if (studentWaiting || !state.peer || !state.admitted) return "waiting";
        return "connecting";
      });
    };

    const join = async () => {
      if (!rtcConfigRef.current) {
        try {
          rtcConfigRef.current = await fetchRtcConfig();
        } catch {
          rtcConfigRef.current = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
        }
      }
      if (disposed) return;
      const res = (await socket
        .timeout(10_000)
        .emitWithAck("interview:join", { roomId, clientSessionId, media: mediaRef.current })
        .catch(() => ({ ok: false, error: "The interview server did not respond" }))) as Ack<RoomState>;
      if (disposed) return;
      if (!res.ok || !res.data) return fail(res.error ?? "You cannot join this interview");
      applyState(res.data);
    };

    socket.on("connect", () => {
      setSocketConnected(true);
      void join();
    });
    socket.on("disconnect", (reason) => {
      setSocketConnected(false);
      if (terminalRef.current || disposed) return;
      // The server closed the socket (e.g. token expiry): reconnect with a fresh token.
      // Media is peer-to-peer and keeps flowing meanwhile.
      if (reason === "io server disconnect") setTimeout(() => !disposed && !terminalRef.current && socket.connect(), 500);
    });
    socket.on("connect_error", () => setSocketConnected(false));
    socket.on("auth:error", () => fail("Your session has expired. Sign in again to rejoin."));
    socket.on("interview:replaced", () => fail("You opened this interview in another tab or device."));
    socket.on("room:state", applyState);
    socket.on("interview:admitted", () => setPhase((p) => (p === "waiting" ? "connecting" : p)));

    socket.on("interview:ready", async ({ initiator, peerSessionId }: { initiator: boolean; peerSessionId: string }) => {
      isInitiatorRef.current = initiator;
      const pc = pcRef.current;
      // Our socket reconnected but the call itself is healthy: keep it.
      if (pc && pcPeerSessionRef.current === peerSessionId && (pc.connectionState === "connected" || pc.connectionState === "connecting")) return;
      setPhase("connecting");
      if (!initiator) {
        // The student waits for the interviewer's offer.
        closePeer();
        pcPeerSessionRef.current = peerSessionId;
        return;
      }
      const next = createPeer(peerSessionId);
      next.addTransceiver("audio", { direction: "sendrecv" });
      next.addTransceiver("video", { direction: "sendrecv" });
      attachLocalTracks(next);
      try {
        const offer = await next.createOffer();
        await next.setLocalDescription(offer);
        socket.emit("webrtc:offer", { description: next.localDescription, sessionId: clientSessionId });
      } catch {
        setPhase("reconnecting");
      }
    });

    socket.on("webrtc:offer", async ({ description, sessionId }: { description: RTCSessionDescriptionInit; sessionId?: string }) => {
      let pc = pcRef.current;
      const peerSession = sessionId ?? pcPeerSessionRef.current ?? "unknown";
      if (!pc || (sessionId && pcPeerSessionRef.current !== sessionId)) pc = createPeer(peerSession);
      try {
        await pc.setRemoteDescription(description);
        attachLocalTracks(pc);
        await flushCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { description: pc.localDescription, sessionId: clientSessionId });
      } catch {
        socket.emit("webrtc:restart");
      }
    });

    socket.on("webrtc:answer", async ({ description }: { description: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc || pc.signalingState !== "have-local-offer") return;
      try {
        await pc.setRemoteDescription(description);
        await flushCandidates(pc);
      } catch {
        void restartIce();
      }
    });

    socket.on("webrtc:ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ignore candidates from an older negotiation */
      }
    });

    socket.on("webrtc:restart", () => void restartIce());
    socket.on("media:state", (state: RoomMediaState) => setPeerMedia(state));
    socket.on("chat:message", (message: RoomChatMessage) => setMessages((m) => [...m, message].slice(-200)));
    socket.on("questions:updated", (questions: InterviewQuestion[]) => setAskedQuestions(questions));

    socket.on("interview:participant-left", () => {
      closePeer();
      setPeerMedia(null);
      setPhase((p) => (p === "ended" || p === "error" ? p : "waiting"));
    });

    socket.on("interview:ended", ({ reason }: { reason: "ended" | "cancelled" }) => {
      terminalRef.current = true;
      setEndReason(reason);
      setPhase("ended");
      closePeer();
      socket.disconnect();
    });

    // Tell the server promptly when the tab closes.
    const onUnload = () => socket.emit("interview:leave");
    window.addEventListener("pagehide", onUnload);

    return () => {
      disposed = true;
      window.removeEventListener("pagehide", onUnload);
      socket.emit("interview:leave");
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      closePeer();
    };
  }, [roomId, clientSessionId, attachLocalTracks, closePeer, createPeer, flushCandidates, restartIce]);

  // Stop any screen share when leaving. The camera/microphone stream is owned and
  // stopped by the page that created it (React dev mode re-runs mount effects,
  // which would otherwise stop the tracks as soon as the room opens).
  React.useEffect(
    () => () => {
      screenTrackRef.current?.stop();
    },
    [],
  );

  /* -------------------------------- Controls -------------------------------- */

  const setVideoSenderTrack = React.useCallback((track: MediaStreamTrack | null) => {
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getTransceivers().find((t) => t.receiver.track?.kind === "video")?.sender;
    void sender?.replaceTrack(track);
  }, []);

  const toggleAudio = React.useCallback(() => {
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMedia((m) => {
      const next = { ...m, audio: track.enabled };
      emitMedia(next);
      return next;
    });
  }, [localStream, emitMedia]);

  const toggleVideo = React.useCallback(() => {
    const track = localStream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMedia((m) => {
      const next = { ...m, video: track.enabled };
      emitMedia(next);
      return next;
    });
  }, [localStream, emitMedia]);

  const stopScreenShare = React.useCallback(() => {
    const track = screenTrackRef.current;
    screenTrackRef.current = null;
    track?.stop();
    setScreenStream(null);
    setVideoSenderTrack(localStream.getVideoTracks()[0] ?? null);
    setMedia((m) => {
      const next = { ...m, screen: false };
      emitMedia(next);
      return next;
    });
  }, [localStream, emitMedia, setVideoSenderTrack]);

  /** Must be called from a click handler: browsers require a user gesture. */
  const startScreenShare = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Screen sharing is not supported in this browser.");
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    track.contentHint = "detail";
    screenTrackRef.current = track;
    // The browser's own "Stop sharing" button ends the track.
    track.addEventListener("ended", () => {
      if (screenTrackRef.current === track) stopScreenShare();
    });
    setScreenStream(stream);
    setVideoSenderTrack(track);
    setMedia((m) => {
      const next = { ...m, screen: true };
      emitMedia(next);
      return next;
    });
  }, [emitMedia, setVideoSenderTrack, stopScreenShare]);

  const sendChat = React.useCallback(async (text: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error("You are offline. Reconnecting…");
    const res = (await socket.timeout(5_000).emitWithAck("chat:message", { text })) as Ack<RoomChatMessage>;
    if (!res.ok || !res.data) throw new Error(res.error ?? "Message not sent");
    setMessages((m) => [...m, res.data!].slice(-200));
  }, []);

  const admit = React.useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) return;
    const res = (await socket.timeout(5_000).emitWithAck("interview:admit")) as Ack;
    if (!res.ok) throw new Error(res.error ?? "Could not admit the student");
  }, []);

  const leave = React.useCallback(() => {
    terminalRef.current = true;
    socketRef.current?.emit("interview:leave");
    socketRef.current?.disconnect();
    closePeer();
    setEndReason("left");
    setPhase("ended");
  }, [closePeer]);

  return {
    phase,
    error,
    endReason,
    room,
    remoteStream,
    peerMedia,
    media,
    screenStream,
    messages,
    askedQuestions,
    socketConnected,
    hasCamera: localStream.getVideoTracks().length > 0,
    hasMicrophone: localStream.getAudioTracks().length > 0,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendChat,
    admit,
    leave,
  };
}
