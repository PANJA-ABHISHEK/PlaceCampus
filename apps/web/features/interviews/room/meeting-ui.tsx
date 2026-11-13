"use client";

import * as React from "react";
import Image from "next/image";
import { Clock, Hourglass, MicOff, ScreenShare, User, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallPhase, ConnectionQuality } from "./use-interview-room";

/* Design tokens for the dark interview room. */
export const ROOM = {
  bg: "bg-[#080D19]",
  surface: "bg-[#111827]",
  border: "border-white/[0.08]",
  muted: "text-[#AAB4C5]",
  accent: "#FF7900",
  accentSoft: "#FF9D32",
  danger: "#E52525",
} as const;

export const initials = (name?: string) =>
  (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export function Avatar({ name, size = "lg" }: { name?: string; size?: "lg" | "sm" }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-[#1B2740] to-[#0E1628] font-bold text-white ring-2 ring-[#FF7900]/60 shadow-[0_0_40px_-8px_rgba(255,121,0,0.55)]",
        size === "lg" ? "h-24 w-24 text-3xl" : "h-11 w-11 text-sm",
      )}
    >
      {initials(name)}
    </div>
  );
}

/* --------------------------------- Header --------------------------------- */

const STATUS_META: Record<CallPhase, { label: string; dot: string }> = {
  joining: { label: "Joining", dot: "bg-[#AAB4C5]" },
  waiting: { label: "Waiting", dot: "bg-[#FF9D32]" },
  connecting: { label: "Connecting", dot: "bg-[#FF9D32] animate-pulse" },
  connected: { label: "Connected", dot: "bg-emerald-400" },
  reconnecting: { label: "Reconnecting", dot: "bg-[#FF7900] animate-pulse" },
  ended: { label: "Ended", dot: "bg-[#AAB4C5]" },
  error: { label: "Disconnected", dot: "bg-[#E52525]" },
};

const QUALITY_META: Record<ConnectionQuality, { bars: number; color: string; label: string }> = {
  good: { bars: 4, color: "bg-emerald-400", label: "Excellent connection" },
  fair: { bars: 3, color: "bg-[#FF9D32]", label: "Fair connection" },
  poor: { bars: 1, color: "bg-[#E52525]", label: "Poor connection" },
  unknown: { bars: 0, color: "bg-white/25", label: "Connection quality appears once the call connects" },
};

function Pill({ children, className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-[#111827]/80 px-3.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ConnectionStatus({
  phase,
  online,
  quality,
  elapsed,
}: {
  phase: CallPhase;
  online: boolean;
  quality: ConnectionQuality;
  elapsed: string | null;
}) {
  const q = QUALITY_META[quality];
  const status = online ? STATUS_META[phase] : { label: "Offline", dot: "bg-[#E52525]" };
  return (
    <div className="flex items-center gap-2">
      <Pill className="w-11 justify-center px-0" title={q.label} aria-label={q.label} role="img">
        <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
          {[1, 2, 3, 4].map((b) => (
            <span key={b} className={cn("w-[3px] rounded-sm transition-colors", b <= q.bars ? q.color : "bg-white/20")} style={{ height: `${b * 25}%` }} />
          ))}
        </span>
      </Pill>
      {elapsed && (
        <Pill className="hidden tabular-nums sm:inline-flex" aria-label={`Interview duration ${elapsed}`}>
          <Clock className="h-4 w-4 text-white/80" aria-hidden="true" />
          {elapsed}
        </Pill>
      )}
      <Pill role="status">
        <span className={cn("h-2.5 w-2.5 rounded-full", status.dot)} aria-hidden="true" />
        {status.label}
      </Pill>
    </div>
  );
}

export function InterviewHeader({
  title,
  facultyName,
  studentName,
  right,
}: {
  title: string;
  facultyName: string;
  studentName: string;
  right: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 px-3 py-3 sm:gap-5 sm:px-6">
      {/* Transparent dark-background logo: no box behind it. */}
      <Image
        src="/images/placecampus-logo-dark.png"
        alt="PlaceCampus"
        width={1200}
        height={269}
        priority
        className="hidden h-9 w-auto shrink-0 sm:block lg:h-10"
      />
      <span className="hidden h-10 w-px shrink-0 bg-white/15 sm:block" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">{title}</h1>
        <p className="truncate text-xs text-[#AAB4C5] sm:text-sm">
          {facultyName} (Interviewer) <span className="mx-1 text-white/30">•</span> {studentName} (Student)
        </p>
      </div>
      {right}
    </header>
  );
}

/* ------------------------------- Video area ------------------------------- */

/** Subtle campus skyline and orange light sweeps. Purely decorative, kept behind content. */
export function CampusBackdrop() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="pc-sweep" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#FF7900" stopOpacity="0" />
          <stop offset="0.6" stopColor="#FF7900" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FF9D32" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="pc-corner" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#FF7900" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FF7900" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pc-building" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3A4A6B" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1A2338" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path d="M0 0 H330 L0 230 Z" fill="url(#pc-corner)" opacity="0.55" />
      <path d="M0 220 C 220 120, 380 40, 520 0" stroke="#FF9D32" strokeOpacity="0.35" strokeWidth="2" fill="none" />
      <path d="M560 640 C 820 520, 1040 420, 1200 300" stroke="url(#pc-sweep)" strokeWidth="5" fill="none" opacity="0.8" />
      <path d="M700 640 C 900 560, 1080 470, 1200 420 V640 Z" fill="#FF7900" opacity="0.12" />
      <path d="M1200 360 L 980 640 H1200 Z" fill="url(#pc-corner)" opacity="0.35" transform="rotate(180 1090 500)" />
      {/* campus buildings */}
      <g fill="url(#pc-building)" stroke="#8FA3C7" strokeOpacity="0.18">
        <path d="M40 640 V420 L170 380 L300 420 V640 Z" />
        <path d="M300 640 V470 H470 V640 Z" />
        <path d="M150 640 V520 H220 V640 Z" />
      </g>
      <g stroke="#8FA3C7" strokeOpacity="0.16">
        {Array.from({ length: 6 }, (_, r) =>
          Array.from({ length: 5 }, (_, c) => (
            <rect key={`${r}-${c}`} x={62 + c * 44} y={440 + r * 30} width="26" height="18" fill="none" />
          )),
        )}
        {Array.from({ length: 5 }, (_, r) =>
          Array.from({ length: 4 }, (_, c) => (
            <rect key={`b${r}-${c}`} x={318 + c * 38} y={490 + r * 28} width="22" height="16" fill="none" />
          )),
        )}
      </g>
      <g fill="#FF7900" opacity="0.18">
        <circle cx="60" cy="600" r="26" />
        <circle cx="100" cy="612" r="18" />
        <circle cx="480" cy="614" r="20" />
      </g>
    </svg>
  );
}

export function WaitingState({ heading, subtitle, avatarName }: { heading: string; subtitle: string; avatarName?: string }) {
  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      {avatarName ? (
        <Avatar name={avatarName} />
      ) : (
        <span className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#FF7900]/20 [animation-duration:2.4s] motion-reduce:animate-none" aria-hidden="true" />
          <span className="absolute -inset-3 rounded-full bg-[#FF7900]/20 blur-2xl" aria-hidden="true" />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-[#FF7900] to-[#C24A00] shadow-[0_0_50px_-6px_rgba(255,121,0,0.75)] ring-4 ring-[#FF7900]/25">
            <Hourglass className="h-10 w-10 animate-[pc-hourglass_2.4s_ease-in-out_infinite] text-white motion-reduce:animate-none" strokeWidth={2.2} aria-hidden="true" />
          </span>
        </span>
      )}
      <div className="space-y-1.5">
        <p className="text-xl font-bold text-white sm:text-2xl">{heading}</p>
        <p className="max-w-md text-sm text-[#AAB4C5] sm:text-base">{subtitle}</p>
      </div>
      <style>{`@keyframes pc-hourglass { 0%, 40% { transform: rotate(0deg); } 50%, 90% { transform: rotate(180deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function NameTag({
  name,
  micOff,
  cameraOff,
  speaking,
  className,
}: {
  name: string;
  micOff?: boolean;
  cameraOff?: boolean;
  speaking?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur sm:text-sm", className)}>
      <User className="h-3.5 w-3.5 shrink-0 text-white/80" aria-hidden="true" />
      <span className="truncate">{name}</span>
      {speaking && !micOff && (
        <span className="flex h-3 items-end gap-[2px]" aria-label="Speaking">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-[3px] animate-[pc-eq_0.9s_ease-in-out_infinite] rounded-sm bg-[#FF9D32]" style={{ animationDelay: `${i * 0.15}s`, height: "100%" }} />
          ))}
          <style>{`@keyframes pc-eq { 0%,100% { transform: scaleY(0.35) } 50% { transform: scaleY(1) } }`}</style>
        </span>
      )}
      {micOff && <MicOff className="h-3.5 w-3.5 shrink-0 text-[#ff6b6b]" aria-label="Microphone off" />}
      {cameraOff && <VideoOff className="h-3.5 w-3.5 shrink-0 text-[#ff6b6b]" aria-label="Camera off" />}
    </span>
  );
}

export function ShareBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7900] px-3 py-1.5 text-xs font-bold text-white shadow-[0_8px_24px_-8px_rgba(255,121,0,0.8)]">
      <ScreenShare className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

/* --------------------------- Audio-level detection --------------------------- */

/** True while the stream's audio is above a speaking threshold. */
export function useSpeaking(stream: MediaStream | null, enabled = true) {
  const [speaking, setSpeaking] = React.useState(false);
  const track = enabled ? stream?.getAudioTracks()[0] : undefined;
  React.useEffect(() => {
    if (!track || track.readyState !== "live") return;
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let loud = 0;
    let last = false;
    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += (v - 128) * (v - 128);
      const rms = Math.sqrt(sum / data.length);
      loud = rms > 6 ? Math.min(loud + 1, 4) : Math.max(loud - 1, 0);
      const now = loud >= 2;
      if (now !== last) {
        last = now;
        setSpeaking(now);
      }
    }, 120);
    return () => {
      clearInterval(timer);
      source.disconnect();
      void ctx.close();
      setSpeaking(false);
    };
  }, [track]);
  return !!track && speaking;
}

/* ---------------------------- Draggable self view ---------------------------- */

/**
 * Lets the self-preview be dragged inside its container. Returns style + handlers;
 * position resets to the bottom-right corner when `reset` is called.
 */
export function useDraggable(containerRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const drag = React.useRef<{ dx: number; dy: number; id: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    const container = containerRef.current;
    if (!d || d.id !== e.pointerId || !container) return;
    const c = container.getBoundingClientRect();
    const el = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(8, e.clientX - c.left - d.dx), c.width - el.width - 8);
    const y = Math.min(Math.max(8, e.clientY - c.top - d.dy), c.height - el.height - 8);
    setPos({ x, y });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  return {
    style: pos ? ({ left: pos.x, top: pos.y, right: "auto", bottom: "auto" } as React.CSSProperties) : undefined,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    reset: () => setPos(null),
    moved: !!pos,
  };
}

/* ------------------------------- Control bar ------------------------------- */

export function ControlButton({
  label,
  onClick,
  children,
  state = "default",
  disabled,
  badge,
  className,
  ...rest
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  /** default: neutral, active: orange (feature on), off: red tint (mic/camera off). */
  state?: "default" | "active" | "off";
  disabled?: boolean;
  badge?: number;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children">) {
  return (
    <span className={cn("group relative", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        {...rest}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9D32] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B111F] disabled:cursor-not-allowed disabled:opacity-35 sm:h-12 sm:w-12",
          state === "active"
            ? "border-[#FF7900] bg-gradient-to-b from-[#FF8A1F] to-[#FF7900] text-white shadow-[0_8px_24px_-10px_rgba(255,121,0,0.9)]"
            : state === "off"
              ? "border-[#E52525]/40 bg-[#E52525]/15 text-[#ff7070] hover:bg-[#E52525]/25"
              : "border-white/[0.08] bg-white/[0.06] text-white hover:border-[#FF7900]/50 hover:bg-[#FF7900]/15 hover:text-[#FF9D32]",
        )}
      >
        {children}
        {!!badge && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF7900] px-1 text-[11px] font-bold text-white ring-2 ring-[#0B111F]">
            {badge}
          </span>
        )}
      </button>
      {/* Tooltip */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg border border-white/10 bg-[#111827] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

/** Small anchored menu panel above a control. Closes on outside click and Escape. */
export function Popover({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    // Defer so the click that opened the menu doesn't close it.
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute bottom-full z-40 mb-3 rounded-2xl border border-white/10 bg-[#111827]/95 p-2 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({ icon: Icon, label, onClick, disabled, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; disabled?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white transition-colors hover:bg-[#FF7900]/15 hover:text-[#FF9D32] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-xs text-[#AAB4C5]">{hint}</span>}
    </button>
  );
}

/** Centered dark modal. */
export function RoomModal({
  open,
  onClose,
  labelledBy,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={cn("w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-6 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]", className)}>
        {children}
      </div>
    </div>
  );
}
