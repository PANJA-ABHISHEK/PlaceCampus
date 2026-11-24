"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Camera,
  CircleAlert,
  EyeOff,
  Loader2,
  LogOut,
  Maximize,
  MessageSquare,
  Mic,
  MicOff,
  Minimize,
  MonitorUp,
  MonitorX,
  MoreHorizontal,
  Phone,
  PhoneOff,
  Play,
  RotateCcw,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  Video,
  VideoOff,
  Volume2,
  WifiOff,
  X,
} from "lucide-react";
import type { InterviewQuestion, MockInterview } from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useEndInterview, useStartInterview } from "../hooks/use-interviews";
import { typeLabel } from "../lib/interview-meta";
import { RoomSidebar, type SidebarTab } from "./room-sidebar";
import { useInterviewRoom } from "./use-interview-room";
import { VideoSurface } from "./video-surface";
import {
  Avatar,
  CampusBackdrop,
  ConnectionStatus,
  ControlButton,
  InterviewHeader,
  MenuItem,
  NameTag,
  Popover,
  RoomModal,
  ShareBadge,
  WaitingState,
  useDraggable,
  useSpeaking,
} from "./meeting-ui";

type Role = "FACULTY" | "STUDENT";
type Call = ReturnType<typeof useInterviewRoom>;

function useElapsed(since?: string) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!since) return null;
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Plays the other person's audio regardless of which tile (or avatar) is visible. */
function RemoteAudio({ stream, sinkId }: { stream: MediaStream | null; sinkId: string }) {
  const ref = React.useRef<HTMLAudioElement>(null);
  React.useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      void ref.current.play().catch(() => undefined);
    }
  }, [stream]);
  React.useEffect(() => {
    const el = ref.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (el?.setSinkId && sinkId) void el.setSinkId(sinkId).catch(() => undefined);
  }, [sinkId]);
  return <audio ref={ref} autoPlay className="hidden" />;
}

function waitingCopy(call: Call, role: Role, peerName: string, status: string): { heading: string; subtitle: string } {
  if (call.phase === "joining") return { heading: "Joining the interview room", subtitle: "Checking your access and connecting securely." };
  if (role === "STUDENT" && !call.room?.admitted)
    return call.room?.peer
      ? { heading: "Waiting for your interviewer", subtitle: "Your interviewer is here and will admit you shortly." }
      : { heading: "Waiting for your interviewer", subtitle: "Your interviewer will join shortly to start the interview." };
  if (!call.room?.peer)
    return role === "FACULTY"
      ? { heading: "Waiting for the student", subtitle: `${peerName} hasn't joined yet. They'll appear here when they enter the waiting room.` }
      : { heading: "Waiting for your interviewer", subtitle: "Your interviewer stepped away and will rejoin shortly." };
  if (role === "FACULTY" && status !== "IN_PROGRESS") return { heading: `${peerName} is in the waiting room`, subtitle: "Start the interview to admit them." };
  if (role === "FACULTY" && call.room.peer.waiting) return { heading: `${peerName} is waiting`, subtitle: "Admit them to begin the interview." };
  if (call.phase === "reconnecting") return { heading: "Reconnecting…", subtitle: "Trying to restore the connection. Please stay on this page." };
  return { heading: `Connecting to ${peerName}…`, subtitle: "Setting up a secure peer-to-peer connection." };
}

/* ------------------------------ Settings modal ------------------------------ */

function SettingsModal({ open, onClose, call, sinkId, onSinkId }: { open: boolean; onClose: () => void; call: Call; sinkId: string; onSinkId: (id: string) => void }) {
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [perms, setPerms] = React.useState<{ camera?: string; microphone?: string }>({});
  const [busy, setBusy] = React.useState<"audio" | "video" | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const list = await navigator.mediaDevices?.enumerateDevices().catch(() => []);
      const query = async (name: string) => {
        try {
          return (await navigator.permissions.query({ name: name as PermissionName })).state;
        } catch {
          return undefined;
        }
      };
      const [camera, microphone] = await Promise.all([query("camera"), query("microphone")]);
      if (!cancelled) {
        setDevices(list ?? []);
        setPerms({ camera, microphone });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const current = (kind: "audio" | "video") =>
    (kind === "audio" ? call.localStream.getAudioTracks()[0] : call.localStream.getVideoTracks()[0])?.getSettings().deviceId ?? "";

  const change = async (kind: "audio" | "video", deviceId: string) => {
    setBusy(kind);
    try {
      await call.switchDevice(kind, deviceId);
      toast.success(kind === "audio" ? "Microphone changed" : "Camera changed");
    } catch {
      toast.error("Couldn't switch device", { description: "It may be in use by another app." });
    } finally {
      setBusy(null);
    }
  };

  const select = "h-11 w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 text-sm text-white outline-none focus:border-[#FF7900]/70";
  const supportsSink = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
  const permLabel = (s?: string) => (s === "granted" ? "Allowed" : s === "denied" ? "Blocked" : s === "prompt" ? "Will ask" : "Unknown");

  return (
    <RoomModal open={open} onClose={onClose} labelledBy="settings-title" className="max-w-lg">
      <div className="mb-5 flex items-center justify-between">
        <h2 id="settings-title" className="text-lg font-bold">Meeting settings</h2>
        <button type="button" onClick={onClose} aria-label="Close settings" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4 text-[#FF9D32]" /> Camera {busy === "video" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}</span>
          <select className={select} value={current("video")} disabled={!call.hasCamera || busy !== null} onChange={(e) => void change("video", e.target.value)}>
            {devices.filter((d) => d.kind === "videoinput").map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
            {!call.hasCamera && <option value="">No camera available</option>}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="flex items-center gap-2 text-sm font-semibold"><Mic className="h-4 w-4 text-[#FF9D32]" /> Microphone {busy === "audio" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}</span>
          <select className={select} value={current("audio")} disabled={!call.hasMicrophone || busy !== null} onChange={(e) => void change("audio", e.target.value)}>
            {devices.filter((d) => d.kind === "audioinput").map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
            {!call.hasMicrophone && <option value="">No microphone available</option>}
          </select>
        </label>
        {supportsSink && (
          <label className="block space-y-1.5">
            <span className="flex items-center gap-2 text-sm font-semibold"><Volume2 className="h-4 w-4 text-[#FF9D32]" /> Speaker</span>
            <select className={select} value={sinkId} onChange={(e) => onSinkId(e.target.value)}>
              <option value="">System default</option>
              {devices.filter((d) => d.kind === "audiooutput" && d.deviceId !== "default").map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Speaker ${i + 1}`}</option>)}
            </select>
          </label>
        )}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm">
          <p className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Permissions</p>
          <p className="flex justify-between text-[#AAB4C5]"><span>Camera</span><span className={perms.camera === "denied" ? "text-[#ff7070]" : "text-white"}>{permLabel(perms.camera)}</span></p>
          <p className="mt-1 flex justify-between text-[#AAB4C5]"><span>Microphone</span><span className={perms.microphone === "denied" ? "text-[#ff7070]" : "text-white"}>{permLabel(perms.microphone)}</span></p>
          <p className="mt-3 text-xs text-[#7D889B]">The call is peer-to-peer and is not recorded.</p>
        </div>
      </div>
    </RoomModal>
  );
}

/* ---------------------------------- Meeting ---------------------------------- */

export function Meeting({
  interview,
  role,
  localStream,
  initialMedia,
}: {
  interview: MockInterview;
  role: Role;
  localStream: MediaStream;
  initialMedia: { audio: boolean; video: boolean };
}) {
  const router = useRouter();
  const call = useInterviewRoom({ roomId: interview.roomId!, localStream, initialMedia });
  const startMutation = useStartInterview();
  const endMutation = useEndInterview();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const selfView = useDraggable(stageRef);

  // Phones start on the video; the panel opens from the chat button.
  const [sidebarOpen, setSidebarOpen] = React.useState(() => typeof window === "undefined" || window.matchMedia("(min-width: 768px)").matches);
  const [tab, setTab] = React.useState<SidebarTab>(role === "FACULTY" ? "questions" : "chat");
  const [questions, setQuestions] = React.useState<InterviewQuestion[]>(interview.questions ?? []);
  const [seenMessages, setSeenMessages] = React.useState(0);
  const [menu, setMenu] = React.useState<"more" | "participants" | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const [admitting, setAdmitting] = React.useState(false);
  const [swapped, setSwapped] = React.useState(false);
  const [selfHidden, setSelfHidden] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [sinkId, setSinkId] = React.useState("");

  React.useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Students get asked questions pushed live; faculty edit their own list.
  const shownQuestions = role === "STUDENT" && call.askedQuestions ? call.askedQuestions : questions;
  const chatVisible = sidebarOpen && tab === "chat";
  const leaveChat = () => {
    if (chatVisible) setSeenMessages(call.messages.length);
  };
  const changeTab = (next: SidebarTab) => {
    leaveChat();
    setTab(next);
  };
  const toggleSidebar = (open: boolean) => {
    if (!open) leaveChat();
    setSidebarOpen(open);
  };

  const elapsed = useElapsed(call.room?.startedAt ?? interview.startedAt);
  const peer = call.room?.peer ?? null;
  const facultyName = interview.interviewer?.fullName ?? (role === "FACULTY" ? call.room?.you.fullName : peer?.fullName) ?? "Interviewer";
  const studentName = interview.student?.fullName ?? (role === "STUDENT" ? call.room?.you.fullName : peer?.fullName) ?? "Student";
  const peerName = peer?.fullName ?? (role === "FACULTY" ? studentName : facultyName);
  const myName = call.room?.you.fullName ?? (role === "FACULTY" ? facultyName : studentName);
  const status = call.room?.status ?? interview.status;
  const studentWaiting = role === "FACULTY" && !!peer && peer.waiting;
  const unread = chatVisible ? 0 : Math.max(0, call.messages.length - seenMessages);

  const remoteSpeaking = useSpeaking(call.remoteStream, !!call.peerMedia?.audio);
  const localSpeaking = useSpeaking(localStream, call.media.audio);

  const admit = async () => {
    setAdmitting(true);
    try {
      await call.admit();
    } catch (e) {
      toast.error("Couldn't admit the student", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setAdmitting(false);
    }
  };

  const start = () =>
    startMutation.mutate(interview.id, {
      onSuccess: async () => {
        toast.success("Interview started");
        if (studentWaiting) await admit();
      },
      onError: (e) => toast.error("Couldn't start", { description: e instanceof ApiError ? e.message : "Please try again." }),
    });

  const toggleShare = async () => {
    if (call.media.screen) return call.stopScreenShare();
    try {
      await call.startScreenShare();
    } catch (e) {
      // Cancelling the browser's picker is not an error worth reporting.
      if ((e as DOMException)?.name !== "NotAllowedError") toast.error("Couldn't share your screen", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const toggleFullscreen = async () => {
    setMenu(null);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      toast.error("Fullscreen isn't available here");
    }
  };

  const endForEveryone = () =>
    endMutation.mutate(interview.id, {
      onSuccess: () => router.replace(`/faculty/interviews/${interview.id}?evaluate=1`),
      onError: (e) => toast.error("Couldn't end the interview", { description: e instanceof ApiError ? e.message : "Please try again." }),
    });

  /* --------------------------- Terminal screens --------------------------- */

  if (call.phase === "ended" || call.phase === "error") {
    const back = role === "FACULTY" ? `/faculty/interviews/${interview.id}` : "/student/interviews";
    const title =
      call.phase === "error" ? "You're not in the interview" : call.endReason === "cancelled" ? "This interview was cancelled" : call.endReason === "left" ? "You left the interview" : "The interview has ended";
    const detail =
      call.phase === "error"
        ? call.error
        : call.endReason === "left"
          ? "Your camera and microphone are off. You can rejoin while the interview is still running."
          : role === "STUDENT"
            ? "Thank you. Your interviewer's feedback will appear in Mock Interviews once it is submitted."
            : "Open the interview to submit your evaluation.";
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#080D19] p-6 text-white">
        <CampusBackdrop />
        <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111827]/90 p-8 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur">
          <span className={cn("mx-auto flex h-16 w-16 items-center justify-center rounded-full", call.phase === "error" ? "bg-[#E52525]/15 text-[#ff7070]" : "bg-[#FF7900]/15 text-[#FF9D32]")}>
            {call.phase === "error" ? <CircleAlert className="h-8 w-8" /> : <PhoneOff className="h-8 w-8" />}
          </span>
          <h1 className="mt-4 text-xl font-bold">{title}</h1>
          {detail && <p className="mt-2 text-sm text-[#AAB4C5]">{detail}</p>}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {call.endReason === "left" && (
              <button type="button" onClick={() => window.location.reload()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold hover:bg-white/10">
                <RotateCcw className="h-4 w-4" /> Rejoin
              </button>
            )}
            <Link href={back} className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#FF8A1F] to-[#FF7900] px-6 text-sm font-semibold text-white">
              {role === "FACULTY" && call.phase === "ended" && call.endReason !== "left" ? "Evaluate the interview" : "Back to interviews"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ Video stage ------------------------------ */

  const remoteMedia = call.peerMedia ?? { audio: true, video: true, screen: false };
  const remoteLive = !!call.remoteStream && (call.phase === "connected" || call.phase === "reconnecting");
  const remoteHasVideo = remoteLive && (remoteMedia.video || remoteMedia.screen);
  const localSharing = call.media.screen && !!call.screenStream;
  const localVideoOn = call.media.video && call.hasCamera;
  // The person sharing their screen always takes the main stage.
  const localInMain = localSharing || (swapped && remoteLive && !call.peerMedia?.screen);

  const remoteView = (main: boolean) =>
    remoteHasVideo ? (
      <VideoSurface stream={call.remoteStream!} muted className={cn("h-full w-full", remoteMedia.screen ? "object-contain" : "object-cover")} />
    ) : main ? (
      remoteLive ? (
        <WaitingState heading={`${peerName}'s camera is off`} subtitle={remoteMedia.audio ? "You can still hear each other." : "Their microphone is muted too."} avatarName={peerName} />
      ) : (
        <WaitingState {...waitingCopy(call, role, peerName, status)} />
      )
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-[#0E1628]"><Avatar name={peerName} size="sm" /></div>
    );

  const localView = (main: boolean) =>
    localSharing ? (
      <VideoSurface stream={call.screenStream!} muted className="h-full w-full object-contain" />
    ) : localVideoOn ? (
      <VideoSurface stream={localStream} muted mirrored className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-[#0E1628]"><Avatar name={myName} size={main ? "lg" : "sm"} /></div>
    );

  const mainSpeaking = localInMain ? localSpeaking : remoteSpeaking && remoteLive;

  const participantsPanel = (
    <div className="w-72 space-y-1" role="menu" aria-label="Participants">
      <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-[#AAB4C5]">In this interview</p>
      {[
        { name: `${myName} (You)`, roleLabel: role === "FACULTY" ? "Interviewer" : "Student", state: "In the room", audio: call.media.audio, video: call.media.video },
        {
          name: peerName,
          roleLabel: role === "FACULTY" ? "Student" : "Interviewer",
          state: !peer ? "Not joined yet" : peer.waiting ? "In the waiting room" : remoteLive ? (call.phase === "reconnecting" ? "Reconnecting" : "Connected") : "Joining…",
          audio: peer ? remoteMedia.audio : undefined,
          video: peer ? remoteMedia.video : undefined,
        },
      ].map((p) => (
        <div key={p.name} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <Avatar name={p.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{p.name}</p>
            <p className="truncate text-xs text-[#AAB4C5]">{p.roleLabel} · {p.state}</p>
          </div>
          {p.audio !== undefined && (p.audio ? <Mic className="h-4 w-4 text-white/70" aria-label="Microphone on" /> : <MicOff className="h-4 w-4 text-[#ff7070]" aria-label="Microphone off" />)}
          {p.video !== undefined && (p.video ? <Video className="h-4 w-4 text-white/70" aria-label="Camera on" /> : <VideoOff className="h-4 w-4 text-[#ff7070]" aria-label="Camera off" />)}
        </div>
      ))}
      {studentWaiting && status === "IN_PROGRESS" && (
        <button type="button" onClick={() => { setMenu(null); void admit(); }} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF7900] py-2.5 text-sm font-semibold text-white">
          <UserCheck className="h-4 w-4" /> Admit {peerName}
        </button>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="relative flex h-dvh flex-col overflow-hidden bg-[#080D19] text-white">
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#FF7900]/10 blur-3xl" />
      <RemoteAudio stream={call.remoteStream} sinkId={sinkId} />

      <InterviewHeader
        title={interview.title || typeLabel(interview.type)}
        facultyName={facultyName}
        studentName={studentName}
        right={<ConnectionStatus phase={call.phase} online={call.socketConnected} quality={call.quality} elapsed={status === "IN_PROGRESS" ? elapsed : null} />}
      />

      <div className="relative flex min-h-0 flex-1 gap-4 px-2 pb-3 sm:px-4">
        <main className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Main video area */}
          <div
            ref={stageRef}
            className={cn(
              "relative min-h-0 flex-1 overflow-hidden rounded-[22px] border bg-[#080D18] transition-[border-color,box-shadow] duration-300",
              mainSpeaking ? "border-[#FF7900]/80 shadow-[0_0_0_1px_rgba(255,121,0,0.5),0_0_40px_-10px_rgba(255,121,0,0.6)]" : "border-white/[0.06]",
            )}
          >
            <div className="absolute inset-0">{localInMain ? localView(true) : remoteView(true)}</div>

            {/* Faculty actions: start / admit */}
            {role === "FACULTY" && status === "SCHEDULED" && (
              <div className="absolute left-1/2 top-4 z-20 flex w-[min(92%,34rem)] -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FF7900]/40 bg-[#111827]/90 px-4 py-3 text-sm shadow-xl backdrop-blur">
                <span className="font-semibold">{studentWaiting ? `${peerName} is in the waiting room.` : "The interview hasn't started yet."}</span>
                <button type="button" onClick={start} disabled={startMutation.isPending} className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-b from-[#FF8A1F] to-[#FF7900] px-4 font-semibold text-white disabled:opacity-60">
                  {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {studentWaiting ? "Start and admit" : "Start interview"}
                </button>
              </div>
            )}
            {role === "FACULTY" && status === "IN_PROGRESS" && studentWaiting && (
              <div className="absolute left-1/2 top-4 z-20 flex w-[min(92%,30rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-[#FF7900]/40 bg-[#111827]/90 px-4 py-3 text-sm shadow-xl backdrop-blur">
                <span className="font-semibold">{peerName} is waiting to join.</span>
                <button type="button" onClick={admit} disabled={admitting} className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-b from-[#FF8A1F] to-[#FF7900] px-4 font-semibold text-white disabled:opacity-60">
                  {admitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Admit
                </button>
              </div>
            )}
            {call.phase === "reconnecting" && (
              <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#FF7900] px-4 py-2 text-sm font-semibold shadow-xl" role="alert">
                <WifiOff className="h-4 w-4" /> Connection lost. Reconnecting…
              </div>
            )}

            {(call.peerMedia?.screen || localSharing) && (
              <div className="absolute left-4 top-4 z-10">
                <ShareBadge label={localSharing ? "You are sharing your screen" : `${peerName} is sharing their screen`} />
              </div>
            )}

            {/* Main tile label */}
            <div className="absolute bottom-4 left-4 z-10 max-w-[calc(100%-2rem)] sm:max-w-[45%]">
              <NameTag
                name={localInMain ? (localSharing ? "You (screen)" : "You") : peer ? peerName : role === "FACULTY" ? "Student" : "Interviewer"}
                micOff={localInMain ? !call.media.audio : !!peer && !remoteMedia.audio}
                cameraOff={!localInMain && remoteLive && !remoteMedia.video && !remoteMedia.screen}
                speaking={mainSpeaking}
              />
            </div>

            {/* Floating self preview (draggable) */}
            {!selfHidden && (
              <div
                {...selfView.handlers}
                style={selfView.style}
                title="Drag to move"
                className={cn(
                  "absolute bottom-4 right-4 z-20 aspect-video w-32 cursor-grab touch-none select-none overflow-hidden rounded-2xl border-2 bg-[#0E1628] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.8)] transition-[border-color,box-shadow] active:cursor-grabbing sm:w-52 lg:w-64",
                  (localInMain ? remoteSpeaking : localSpeaking) ? "border-[#FF9D32] shadow-[0_0_30px_-6px_rgba(255,121,0,0.8)]" : "border-[#FF7900]/60",
                )}
              >
                {localInMain ? remoteView(false) : localView(false)}
                <span className="absolute left-2 top-2 flex gap-1">
                  {(localInMain ? !remoteMedia.audio : !call.media.audio) && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur" aria-label="Microphone off"><MicOff className="h-3.5 w-3.5 text-[#ff7070]" /></span>
                  )}
                  {(localInMain ? !remoteMedia.video : !call.media.video) && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur" aria-label="Camera off"><VideoOff className="h-3.5 w-3.5 text-[#ff7070]" /></span>
                  )}
                </span>
                <span className="absolute inset-x-2 bottom-2 flex">
                  <NameTag name={localInMain ? peerName : "You"} className="px-2 py-1 text-[11px] sm:text-xs" />
                </span>
              </div>
            )}
          </div>

          {/* Bottom meeting controls */}
          <div className="flex justify-center">
            <div className="relative flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#111827]/90 px-2.5 py-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:gap-2.5 sm:px-4 sm:py-2.5">
              <ControlButton label={call.media.audio ? "Mute microphone" : "Unmute microphone"} state={call.media.audio ? "default" : "off"} disabled={!call.hasMicrophone} onClick={call.toggleAudio}>
                {call.media.audio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </ControlButton>
              <ControlButton label={call.media.video ? "Turn camera off" : "Turn camera on"} state={call.media.video ? "default" : "off"} disabled={!call.hasCamera} onClick={call.toggleVideo}>
                {call.media.video ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </ControlButton>
              <ControlButton
                label={call.media.screen ? "Stop sharing" : "Share screen"}
                state={call.media.screen ? "active" : "default"}
                onClick={toggleShare}
                disabled={role === "STUDENT" && !call.room?.admitted}
              >
                {call.media.screen ? <MonitorX className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
              </ControlButton>
              <span className="relative">
                <ControlButton label="More options" state={menu === "more" ? "active" : "default"} onClick={() => setMenu(menu === "more" ? null : "more")} aria-haspopup="menu" aria-expanded={menu === "more"}>
                  <MoreHorizontal className="h-5 w-5" />
                </ControlButton>
                <Popover open={menu === "more"} onClose={() => setMenu(null)} className="left-1/2 w-64 -translate-x-1/2">
                  <div role="menu" aria-label="More options">
                    <MenuItem icon={fullscreen ? Minimize : Maximize} label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen} />
                    <MenuItem icon={ArrowLeftRight} label="Swap main view" disabled={!remoteLive || localSharing || !!call.peerMedia?.screen} onClick={() => { setSwapped((s) => !s); setMenu(null); }} />
                    <MenuItem icon={EyeOff} label={selfHidden ? "Show self view" : "Hide self view"} onClick={() => { setSelfHidden((h) => !h); setMenu(null); }} />
                    <MenuItem icon={RotateCcw} label="Reset self view position" disabled={!selfView.moved} onClick={() => { selfView.reset(); setMenu(null); }} />
                    <div className="sm:hidden">
                      <div className="my-1 h-px bg-white/10" />
                      <MenuItem icon={Users} label="Participants" onClick={() => setMenu("participants")} />
                      <MenuItem icon={Settings} label="Meeting settings" onClick={() => { setMenu(null); setSettingsOpen(true); }} />
                    </div>
                  </div>
                </Popover>
              </span>

              <span className="mx-0.5 hidden h-8 w-px bg-white/10 sm:block" aria-hidden="true" />

              <ControlButton
                label={chatVisible ? "Close chat" : "Open chat"}
                state={chatVisible ? "active" : "default"}
                badge={unread}
                onClick={() => {
                  if (chatVisible) toggleSidebar(false);
                  else {
                    setSidebarOpen(true);
                    setTab("chat");
                  }
                }}
              >
                <MessageSquare className="h-5 w-5" />
              </ControlButton>
              <span className="relative hidden sm:inline-flex">
                <ControlButton
                  label="Participants"
                  state={menu === "participants" ? "active" : "default"}
                  badge={studentWaiting ? 1 : 0}
                  onClick={() => setMenu(menu === "participants" ? null : "participants")}
                  aria-haspopup="menu"
                  aria-expanded={menu === "participants"}
                >
                  <Users className="h-5 w-5" />
                </ControlButton>
              </span>
              <ControlButton label="Meeting settings" className="hidden sm:inline-flex" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-5 w-5" />
              </ControlButton>
              {/* Participants panel anchored to the bar so it also works from the mobile More menu. */}
              <Popover open={menu === "participants"} onClose={() => setMenu(null)} className="right-0 sm:right-24">
                {participantsPanel}
              </Popover>

              <button
                type="button"
                onClick={() => setLeaveOpen(true)}
                aria-label={role === "FACULTY" ? "Leave or end interview" : "Leave interview"}
                className="ml-1 inline-flex h-11 items-center gap-2 rounded-full bg-[#E52525] px-4 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(229,37,37,0.9)] transition-colors hover:bg-[#C91E1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 sm:h-12 sm:px-7 sm:text-base"
              >
                <Phone className="h-5 w-5 rotate-[135deg]" aria-hidden="true" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>
        </main>

        {/* Right sidebar */}
        {sidebarOpen && (
          <aside className="absolute inset-x-2 bottom-3 top-0 z-30 flex flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0D1424]/95 shadow-2xl backdrop-blur-xl md:static md:inset-auto md:w-[21rem] md:shrink-0 lg:w-[24rem]">
            <button type="button" onClick={() => toggleSidebar(false)} className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5 text-sm font-semibold text-[#AAB4C5] md:hidden">
              <X className="h-4 w-4" /> Back to video
            </button>
            <RoomSidebar
              role={role}
              tab={tab}
              onTabChange={changeTab}
              interviewId={interview.id}
              questions={shownQuestions}
              onQuestionsChange={setQuestions}
              notes={interview.facultyNotes ?? ""}
              messages={call.messages}
              onSendChat={call.sendChat}
              chatDisabledReason={role === "STUDENT" && !call.room?.admitted ? "Chat opens once you are admitted" : null}
              unread={unread}
            />
          </aside>
        )}
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} call={call} sinkId={sinkId} onSinkId={setSinkId} />

      {/* Leave interview */}
      <RoomModal open={leaveOpen} onClose={() => setLeaveOpen(false)} labelledBy="leave-title">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E52525]/15 text-[#ff7070]"><PhoneOff className="h-6 w-6" /></span>
        <h2 id="leave-title" className="mt-4 text-lg font-bold">{role === "FACULTY" ? "Leave the interview?" : "Leave the interview?"}</h2>
        <p className="mt-2 text-sm text-[#AAB4C5]">
          {role === "FACULTY"
            ? "End the interview for everyone to close the room and go to the evaluation, or step out and rejoin later."
            : "Your camera and microphone will turn off. You can rejoin while the interview is running."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {role === "FACULTY" && (
            <button type="button" onClick={endForEveryone} disabled={endMutation.isPending || status !== "IN_PROGRESS"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#E52525] text-sm font-bold text-white hover:bg-[#C91E1E] disabled:opacity-50">
              {endMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />} End interview for everyone
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setLeaveOpen(false);
              call.leave();
            }}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold",
              role === "FACULTY" ? "border border-white/15 text-white hover:bg-white/10" : "bg-[#E52525] text-white hover:bg-[#C91E1E]",
            )}
          >
            <LogOut className="h-4 w-4" /> {role === "FACULTY" ? "Leave for now" : "Leave interview"}
          </button>
          <button type="button" onClick={() => setLeaveOpen(false)} className="h-10 rounded-full text-sm font-semibold text-[#AAB4C5] hover:text-white">
            Stay in the interview
          </button>
        </div>
      </RoomModal>
    </div>
  );
}
