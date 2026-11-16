"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CircleAlert,
  Clock,
  Hourglass,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  PanelRightClose,
  PanelRightOpen,
  PhoneOff,
  Play,
  ScreenShare,
  UserCheck,
  Video,
  VideoOff,
  WifiOff,
} from "lucide-react";
import type { InterviewQuestion, MockInterview } from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useEndInterview, useInterviewRoomDetails, useStartInterview } from "../hooks/use-interviews";
import { canEnterRoom, startTime, START_WINDOW_MS, typeLabel } from "../lib/interview-meta";
import { formatDay, formatTime } from "../components/interview-ui";
import { DeviceCheck } from "./device-check";
import { RoomSidebar, type SidebarTab } from "./room-sidebar";
import { useInterviewRoom, type CallPhase } from "./use-interview-room";
import { VideoSurface } from "./video-surface";

type Role = "FACULTY" | "STUDENT";

const initials = (name?: string) =>
  (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

function Avatar({ name, size = "lg" }: { name?: string; size?: "lg" | "sm" }) {
  return (
    <div className={cn("flex items-center justify-center rounded-full bg-[#10264A] font-bold text-white ring-4 ring-white/10", size === "lg" ? "h-24 w-24 text-3xl" : "h-12 w-12 text-base")}>
      {initials(name)}
    </div>
  );
}

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

const PHASE_META: Record<CallPhase, { label: string; dot: string }> = {
  joining: { label: "Joining…", dot: "bg-slate-400" },
  waiting: { label: "Waiting", dot: "bg-amber-400" },
  connecting: { label: "Connecting…", dot: "bg-amber-400 animate-pulse" },
  connected: { label: "Connected", dot: "bg-emerald-500" },
  reconnecting: { label: "Reconnecting…", dot: "bg-orange-500 animate-pulse" },
  ended: { label: "Ended", dot: "bg-slate-400" },
  error: { label: "Disconnected", dot: "bg-red-500" },
};

/** Plays the other person's audio regardless of which tile (or avatar) is visible. */
function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const ref = React.useRef<HTMLAudioElement>(null);
  React.useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      void ref.current.play().catch(() => undefined);
    }
  }, [stream]);
  return <audio ref={ref} autoPlay className="hidden" />;
}

function ControlButton({
  label,
  active = true,
  danger = false,
  disabled,
  onClick,
  children,
  badge,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "bg-red-600 text-white hover:bg-red-700"
          : active
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-red-500/90 text-white hover:bg-red-600",
      )}
    >
      {children}
      {!!badge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6500] px-1 text-[11px] font-bold">{badge}</span>
      )}
    </button>
  );
}

function Meeting({
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
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [tab, setTab] = React.useState<SidebarTab>(role === "FACULTY" ? "questions" : "chat");
  const [questions, setQuestions] = React.useState<InterviewQuestion[]>(interview.questions ?? []);
  const [seenMessages, setSeenMessages] = React.useState(0);
  const [confirmEnd, setConfirmEnd] = React.useState(false);
  const [admitting, setAdmitting] = React.useState(false);

  // Students get asked questions pushed live; faculty edit their own list.
  const shownQuestions = role === "STUDENT" && call.askedQuestions ? call.askedQuestions : questions;
  const chatVisible = sidebarOpen && tab === "chat";
  /** Counts messages as read when the chat panel stops being visible. */
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
  const facultyName = interview.interviewer?.fullName ?? (role === "FACULTY" ? call.room?.you.fullName : peer?.fullName);
  const studentName = interview.student?.fullName ?? (role === "STUDENT" ? call.room?.you.fullName : peer?.fullName);
  const peerName = peer?.fullName ?? (role === "FACULTY" ? studentName : facultyName) ?? "Participant";
  const status = call.room?.status ?? interview.status;
  const studentWaiting = role === "FACULTY" && !!peer && peer.waiting;
  const unread = chatVisible ? 0 : Math.max(0, call.messages.length - seenMessages);

  const start = () =>
    startMutation.mutate(interview.id, {
      onSuccess: async () => {
        toast.success("Interview started");
        if (studentWaiting) await admit();
      },
      onError: (e) => toast.error("Couldn't start", { description: e instanceof ApiError ? e.message : "Please try again." }),
    });

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

  const toggleShare = async () => {
    if (call.media.screen) return call.stopScreenShare();
    try {
      await call.startScreenShare();
    } catch (e) {
      // Cancelling the browser's picker is not an error worth shouting about.
      if ((e as DOMException)?.name !== "NotAllowedError") toast.error("Couldn't share your screen", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const endInterview = () =>
    endMutation.mutate(interview.id, {
      onSuccess: () => router.replace(`/faculty/interviews/${interview.id}?evaluate=1`),
      onError: (e) => toast.error("Couldn't end the interview", { description: e instanceof ApiError ? e.message : "Please try again." }),
    });

  /* --------------------------- Terminal screens --------------------------- */

  if (call.phase === "ended" || call.phase === "error") {
    const back = role === "FACULTY" ? `/faculty/interviews/${interview.id}` : "/student/interviews";
    const title =
      call.phase === "error"
        ? "You're not in the interview"
        : call.endReason === "cancelled"
          ? "This interview was cancelled"
          : call.endReason === "left"
            ? "You left the interview"
            : "The interview has ended";
    const detail =
      call.phase === "error"
        ? call.error
        : call.endReason === "left"
          ? "You can rejoin while the interview is still running."
          : role === "STUDENT"
            ? "Thank you. Your interviewer's feedback will appear in Mock Interviews once it is submitted."
            : "Open the interview to submit your evaluation.";
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F7FA] p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[var(--shadow-card)] ring-1 ring-[hsl(var(--border)/0.8)]">
          <span className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl", call.phase === "error" ? "bg-red-50 text-red-600" : "bg-[#FFF1E8] text-[#FF6500]")}>
            {call.phase === "error" ? <CircleAlert className="h-7 w-7" /> : <PhoneOff className="h-7 w-7" />}
          </span>
          <h1 className="mt-4 text-xl font-bold text-[#10264A]">{title}</h1>
          {detail && <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {call.endReason === "left" && (
              <button type="button" onClick={() => window.location.reload()} className="inline-flex h-11 items-center justify-center rounded-xl border border-[hsl(var(--border))] px-5 text-sm font-semibold">
                Rejoin
              </button>
            )}
            <Link href={back} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#FF6500] px-5 text-sm font-semibold text-white hover:bg-[#E85C00]">
              {role === "FACULTY" && call.phase === "ended" && call.endReason !== "left" ? "Evaluate the interview" : "Back to interviews"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ Video stage ------------------------------ */

  const localVideoOn = call.media.video && call.hasCamera;
  const remoteVisible = !!call.remoteStream && (call.phase === "connected" || call.phase === "reconnecting");
  const remoteMedia = peerMedia(call);
  const remoteHasVideo = remoteVisible && (remoteMedia.video || remoteMedia.screen);
  const localSharing = call.media.screen && !!call.screenStream;

  const remoteTile = (main: boolean) =>
    remoteVisible && remoteHasVideo ? (
      <VideoSurface stream={call.remoteStream!} muted className={cn("h-full w-full", main && call.peerMedia?.screen ? "object-contain" : "object-cover")} />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/80">
        {peer ? <Avatar name={peerName} size={main ? "lg" : "sm"} /> : <Hourglass className={main ? "h-10 w-10" : "h-6 w-6"} aria-hidden="true" />}
        {main && <WaitingText call={call} role={role} peerName={peerName} status={status} />}
      </div>
    );

  const localTile = (main: boolean) =>
    localSharing ? (
      <VideoSurface stream={call.screenStream!} muted className="h-full w-full object-contain" />
    ) : localVideoOn ? (
      <VideoSurface stream={localStream} muted mirrored className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center"><Avatar name={call.room?.you.fullName} size={main ? "lg" : "sm"} /></div>
    );

  const peerMuted = call.peerMedia && !call.peerMedia.audio;
  const showLocalInMain = localSharing;

  return (
    <div className="flex h-dvh flex-col bg-[#0B1A33] text-white">
      <RemoteAudio stream={call.remoteStream} />

      {/* Top navigation */}
      <header className="flex items-center gap-4 border-b border-white/10 bg-[#10264A] px-4 py-2.5">
        <Image src="/images/placecampus-logo-trimmed.png" alt="PlaceCampus" width={1200} height={269} className="hidden h-8 w-auto rounded bg-white px-1.5 py-1 sm:block" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold sm:text-base">{interview.title || `${typeLabel(interview.type)}`}</p>
          <p className="truncate text-xs text-white/60">
            {facultyName ?? "Interviewer"} (Interviewer) · {studentName ?? "Student"} (Student)
          </p>
        </div>
        {elapsed && status === "IN_PROGRESS" && (
          <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold tabular-nums sm:inline-flex" aria-label="Interview duration">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {elapsed}
          </span>
        )}
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold" role="status">
          <span className={cn("h-2 w-2 rounded-full", call.socketConnected ? PHASE_META[call.phase].dot : "bg-red-500")} aria-hidden="true" />
          {call.socketConnected ? PHASE_META[call.phase].label : "Offline"}
        </span>
      </header>

      {/* Faculty controls for starting and admitting */}
      {role === "FACULTY" && status === "SCHEDULED" && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FF6500] px-4 py-2.5 text-sm">
          <span className="font-semibold">{studentWaiting ? `${peerName} is in the waiting room.` : "The interview hasn't started yet."} Start it to admit the student.</span>
          <button type="button" onClick={start} disabled={startMutation.isPending} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-4 font-semibold text-[#FF6500] disabled:opacity-60">
            {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {studentWaiting ? "Start and admit" : "Start interview"}
          </button>
        </div>
      )}
      {role === "FACULTY" && status === "IN_PROGRESS" && studentWaiting && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-violet-600 px-4 py-2.5 text-sm">
          <span className="font-semibold">{peerName} is waiting to join.</span>
          <button type="button" onClick={admit} disabled={admitting} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-4 font-semibold text-violet-700 disabled:opacity-60">
            {admitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Admit
          </button>
        </div>
      )}
      {call.phase === "reconnecting" && (
        <div className="flex items-center gap-2 bg-orange-600 px-4 py-2 text-sm font-semibold" role="alert">
          <WifiOff className="h-4 w-4" aria-hidden="true" /> Connection lost. Trying to reconnect…
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Main video area */}
        <main className="relative flex min-w-0 flex-1 flex-col p-3 sm:p-4">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#081325]">
            {showLocalInMain ? localTile(true) : remoteTile(true)}

            {(call.peerMedia?.screen || localSharing) && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#FF6500] px-3 py-1 text-xs font-bold">
                <ScreenShare className="h-3.5 w-3.5" aria-hidden="true" />
                {localSharing ? "You are sharing your screen" : `${peerName} is sharing their screen`}
              </span>
            )}
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-semibold">
              {showLocalInMain ? "You (screen)" : peer ? peerName : role === "FACULTY" ? "Student" : "Interviewer"}
              {!showLocalInMain && peerMuted && <MicOff className="h-3.5 w-3.5 text-red-400" aria-label="Microphone off" />}
              {!showLocalInMain && call.peerMedia && !call.peerMedia.video && !call.peerMedia.screen && <VideoOff className="h-3.5 w-3.5 text-red-400" aria-label="Camera off" />}
            </span>

            {/* Picture-in-picture */}
            <div className="absolute bottom-3 right-3 aspect-video w-36 overflow-hidden rounded-xl bg-[#10264A] shadow-2xl ring-2 ring-white/15 sm:w-56">
              {showLocalInMain ? remoteTile(false) : localTile(false)}
              <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold">
                {showLocalInMain ? peerName : "You"}
                {!showLocalInMain && !call.media.audio && <MicOff className="h-3 w-3 text-red-400" aria-label="Your microphone is off" />}
              </span>
            </div>
          </div>

          {/* Bottom toolbar */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <ControlButton label={call.media.audio ? "Mute microphone" : "Unmute microphone"} active={call.media.audio} disabled={!call.hasMicrophone} onClick={call.toggleAudio}>
              {call.media.audio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </ControlButton>
            <ControlButton label={call.media.video ? "Turn camera off" : "Turn camera on"} active={call.media.video} disabled={!call.hasCamera} onClick={call.toggleVideo}>
              {call.media.video ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </ControlButton>
            <ControlButton label={call.media.screen ? "Stop sharing" : "Share screen"} active={!call.media.screen} onClick={toggleShare} disabled={role === "STUDENT" && !call.room?.admitted}>
              {call.media.screen ? <MonitorX className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
              <span className="hidden md:inline">{call.media.screen ? "Stop sharing" : "Share screen"}</span>
            </ControlButton>
            <ControlButton
              label={sidebarOpen && tab === "chat" ? "Close chat" : "Open chat"}
              onClick={() => {
                if (chatVisible) toggleSidebar(false);
                else { setSidebarOpen(true); setTab("chat"); }
              }}
              badge={unread}
            >
              <MessageSquare className="h-5 w-5" />
            </ControlButton>
            <ControlButton label={sidebarOpen ? "Hide panel" : "Show panel"} onClick={() => toggleSidebar(!sidebarOpen)}>
              {sidebarOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
            </ControlButton>
            {role === "FACULTY" ? (
              <ControlButton label="End interview" danger onClick={() => setConfirmEnd(true)} disabled={status !== "IN_PROGRESS"}>
                <PhoneOff className="h-5 w-5" />
                <span className="hidden sm:inline">End Interview</span>
              </ControlButton>
            ) : (
              <ControlButton label="Leave interview" danger onClick={call.leave}>
                <PhoneOff className="h-5 w-5" />
                <span className="hidden sm:inline">Leave</span>
              </ControlButton>
            )}
          </div>
        </main>

        {/* Right sidebar */}
        {sidebarOpen && (
          <aside className="fixed inset-x-0 bottom-0 top-[56px] z-30 flex w-full flex-col bg-white text-[hsl(var(--foreground))] md:static md:w-[22rem] md:shrink-0 lg:w-[24rem]">
            <button type="button" onClick={() => toggleSidebar(false)} className="flex items-center gap-1.5 border-b px-4 py-2 text-sm font-semibold md:hidden">
              <ArrowLeft className="h-4 w-4" /> Back to video
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

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="end-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-[hsl(var(--foreground))]">
            <h2 id="end-title" className="text-lg font-bold">End the interview for everyone?</h2>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">The call closes for both of you and you&apos;ll go to the evaluation form.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmEnd(false)} className="h-10 rounded-xl px-4 text-sm font-semibold hover:bg-[hsl(var(--muted))]">Keep going</button>
              <button type="button" onClick={endInterview} disabled={endMutation.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
                {endMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} End interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function peerMedia(call: ReturnType<typeof useInterviewRoom>) {
  return call.peerMedia ?? { audio: true, video: true, screen: false };
}

function WaitingText({ call, role, peerName, status }: { call: ReturnType<typeof useInterviewRoom>; role: Role; peerName: string; status: string }) {
  let text: string;
  if (call.phase === "joining") text = "Joining the interview room…";
  else if (role === "STUDENT" && !call.room?.admitted)
    text = call.room?.peer ? "Your interviewer will admit you shortly." : "Waiting for your interviewer to start the interview.";
  else if (!call.room?.peer) text = role === "FACULTY" ? "Waiting for the student to join." : "Waiting for your interviewer to rejoin.";
  else if (role === "FACULTY" && status !== "IN_PROGRESS") text = `${peerName} is waiting. Start the interview to admit them.`;
  else if (call.phase === "connecting") text = `Connecting to ${peerName}…`;
  else if (call.phase === "reconnecting") text = "Reconnecting…";
  else text = `${peerName}'s camera is off`;
  return <p className="max-w-xs text-center text-sm">{text}</p>;
}

/** Device check, then the meeting. Shared by the faculty and student room pages. */
export function InterviewRoomPage({ roomId, role }: { roomId: string; role: Role }) {
  const details = useInterviewRoomDetails(roomId);
  const [joined, setJoined] = React.useState<{ stream: MediaStream; media: { audio: boolean; video: boolean } } | null>(null);
  // This page owns the camera/microphone once joined: release them when leaving the page.
  const joinedStream = joined?.stream;
  React.useEffect(() => {
    if (!joinedStream) return;
    return () => joinedStream.getTracks().forEach((t) => t.stop());
  }, [joinedStream]);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const back = role === "FACULTY" ? "/faculty/interviews" : "/student/interviews";

  if (details.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F7FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6500]" aria-label="Loading interview" />
      </div>
    );
  }

  const interview = details.data;
  if (details.isError || !interview) {
    const status = details.error instanceof ApiError ? details.error.status : 0;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F7FA] p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-[hsl(var(--border))]">
          <CircleAlert className="mx-auto h-10 w-10 text-red-600" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-bold text-[#10264A]">{status === 403 ? "You can't join this interview" : "Interview room not found"}</h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Only the assigned interviewer and the invited student can enter this room.</p>
          <Link href={back} className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#FF6500] px-5 text-sm font-semibold text-white">Back to interviews</Link>
        </div>
      </div>
    );
  }

  if (joined) return <Meeting interview={interview} role={role} localStream={joined.stream} initialMedia={joined.media} />;

  const opensAt = startTime(interview) - START_WINDOW_MS;
  const closed = interview.status === "COMPLETED" || interview.status === "CANCELLED" || interview.status === "NO_SHOW" || !!interview.endedAt;
  const reason = closed
    ? interview.status === "CANCELLED"
      ? "This interview was cancelled."
      : "This interview has ended."
    : !canEnterRoom(interview, now)
      ? `The room opens at ${formatTime(new Date(opensAt).toISOString())} on ${formatDay(new Date(opensAt).toISOString())} (15 minutes before the start).`
      : null;
  const other = role === "FACULTY" ? interview.student?.fullName : interview.interviewer?.fullName;

  return (
    <div className="min-h-dvh bg-[#F5F7FA] px-4 py-6 sm:py-10">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between">
        <Link href={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10264A] hover:text-[#FF6500]">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Image src="/images/placecampus-logo-trimmed.png" alt="PlaceCampus" width={1200} height={269} className="h-8 w-auto" />
      </div>
      <DeviceCheck
        title={interview.title || typeLabel(interview.type)}
        subtitle={
          <>
            <p>
              {typeLabel(interview.type)} with {other ?? (role === "FACULTY" ? "your student" : "your interviewer")}
            </p>
            <p>
              {formatDay(interview.scheduledAt)} · {formatTime(interview.scheduledAt)} · {interview.durationMinutes ?? 60} min
            </p>
            {role === "STUDENT" && interview.instructions && (
              <p className="mt-3 whitespace-pre-line rounded-xl bg-[#FFF1E8] px-3 py-2 text-[#10264A]">{interview.instructions}</p>
            )}
            {role === "STUDENT" && <p className="mt-3">After you join, you&apos;ll wait until your interviewer admits you.</p>}
          </>
        }
        joinLabel={role === "FACULTY" ? "Enter Interview Room" : "Join Interview"}
        joinDisabledReason={reason}
        onJoin={(stream, media) => setJoined({ stream, media })}
      />
    </div>
  );
}
