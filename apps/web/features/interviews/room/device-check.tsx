"use client";

import * as React from "react";
import {
  Camera,
  CameraOff,
  CircleAlert,
  Loader2,
  LogIn,
  Mic,
  MicOff,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoSurface } from "./video-surface";

type PermissionProblem = { title: string; detail: string } | null;

function describeMediaError(error: unknown): PermissionProblem {
  const name = (error as DOMException | undefined)?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return {
      title: "Camera and microphone are blocked",
      detail: "Allow access using the camera icon in your browser's address bar, then press Retry.",
    };
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return { title: "No camera or microphone found", detail: "Connect a device and press Retry. You can still join with what is available." };
  if (name === "NotReadableError")
    return { title: "Your camera or microphone is busy", detail: "Close other apps that are using it (Zoom, Teams, another tab), then press Retry." };
  return { title: "Couldn't start your devices", detail: "Press Retry, or try a different browser." };
}

/** Live microphone level, 0–1. */
function useMicLevel(stream: MediaStream | null, enabled: boolean) {
  const [level, setLevel] = React.useState(0);
  const track = stream?.getAudioTracks()[0];
  const active = !!track && enabled;
  React.useEffect(() => {
    if (!track || !enabled) return;
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(1, peak / 64));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void ctx.close();
    };
  }, [track, enabled]);
  return active ? level : 0;
}

export function DeviceCheck({
  title,
  subtitle,
  joinLabel,
  joinDisabledReason,
  onJoin,
}: {
  title: string;
  subtitle?: React.ReactNode;
  joinLabel: string;
  /** When set, the join button is disabled and this explains why. */
  joinDisabledReason?: string | null;
  onJoin: (stream: MediaStream, media: { audio: boolean; video: boolean }) => void;
}) {
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [problem, setProblem] = React.useState<PermissionProblem>(null);
  const [loading, setLoading] = React.useState<boolean>(() => typeof navigator === "undefined" || !!navigator.mediaDevices?.getUserMedia);
  const [cameras, setCameras] = React.useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = React.useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = React.useState<string>("");
  const [micId, setMicId] = React.useState<string>("");
  const [videoOn, setVideoOn] = React.useState(true);
  const [audioOn, setAudioOn] = React.useState(true);
  const [testing, setTesting] = React.useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);
  const handedOff = React.useRef(false);
  const requestRef = React.useRef(0);
  const level = useMicLevel(stream, audioOn);

  const secure = typeof window === "undefined" || window.isSecureContext;

  const unsupported = typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia;

  /** Callers set loading/problem first; this only updates state after the browser answers. */
  const acquire = React.useCallback(async (camera?: string, mic?: string) => {
    // Only the latest request may keep its stream; older ones are released.
    const request = ++requestRef.current;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const video: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, ...(camera ? { deviceId: { exact: camera } } : {}) };
    const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, ...(mic ? { deviceId: { exact: mic } } : {}) };
    let next: MediaStream | null = null;
    let firstError: unknown = null;
    // Prefer both; fall back to whichever device works so nobody is locked out.
    for (const constraints of [{ video, audio }, { audio }, { video }] as MediaStreamConstraints[]) {
      try {
        next = await navigator.mediaDevices.getUserMedia(constraints);
        if (request !== requestRef.current) {
          next.getTracks().forEach((t) => t.stop());
          return;
        }
        break;
      } catch (error) {
        firstError ??= error;
        if ((error as DOMException)?.name === "NotAllowedError") break;
      }
    }
    if (!next) {
      setProblem(describeMediaError(firstError));
      setStream(null);
      streamRef.current = null;
      setLoading(false);
      return;
    }
    if (!next.getVideoTracks().length || !next.getAudioTracks().length) setProblem(describeMediaError(firstError));
    streamRef.current = next;
    setStream(next);
    const devices = await navigator.mediaDevices.enumerateDevices();
    setCameras(devices.filter((d) => d.kind === "videoinput"));
    setMics(devices.filter((d) => d.kind === "audioinput"));
    setCameraId(next.getVideoTracks()[0]?.getSettings().deviceId ?? "");
    setMicId(next.getAudioTracks()[0]?.getSettings().deviceId ?? "");
    setLoading(false);
  }, []);

  const reacquire = (camera?: string, mic?: string) => {
    setLoading(true);
    setProblem(null);
    void acquire(camera, mic);
  };

  React.useEffect(() => {
    // State is only set once the browser answers the permission prompt.
    if (!unsupported) void Promise.resolve().then(() => acquire());
    return () => {
      // Cancel any request still waiting for the browser.
      requestRef.current++;
      // Tracks belong to the room once joined; otherwise release the devices.
      if (!handedOff.current) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [acquire, unsupported]);

  React.useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = videoOn));
    stream?.getAudioTracks().forEach((t) => (t.enabled = audioOn));
  }, [stream, videoOn, audioOn]);

  const testDevices = async () => {
    setTesting(true);
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 523.25;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1);
      await new Promise((r) => setTimeout(r, 1100));
      await ctx.close();
    } finally {
      setTesting(false);
    }
  };

  const hasVideo = !!stream?.getVideoTracks().length;
  const hasAudio = !!stream?.getAudioTracks().length;
  const cameraLabel = stream?.getVideoTracks()[0]?.label;
  const micLabel = stream?.getAudioTracks()[0]?.label;

  const join = () => {
    if (!stream) return;
    handedOff.current = true;
    onJoin(stream, { audio: audioOn && hasAudio, video: videoOn && hasVideo });
  };

  const select = "h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3 text-sm";

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-3">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#0B1A33]">
          {stream && hasVideo && videoOn ? (
            <VideoSurface stream={stream} muted mirrored className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white/70">
              {loading ? <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" /> : <CameraOff className="h-10 w-10" aria-hidden="true" />}
              <p className="text-sm">{loading ? "Starting your camera…" : hasVideo ? "Camera is off" : "No camera"}</p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent p-4">
            <button
              type="button"
              onClick={() => setAudioOn((v) => !v)}
              disabled={!hasAudio}
              aria-pressed={!audioOn}
              aria-label={audioOn ? "Turn microphone off" : "Turn microphone on"}
              className={cn("flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-40", audioOn && hasAudio ? "bg-white/20 text-white hover:bg-white/30" : "bg-red-600 text-white hover:bg-red-700")}
            >
              {audioOn && hasAudio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setVideoOn((v) => !v)}
              disabled={!hasVideo}
              aria-pressed={!videoOn}
              aria-label={videoOn ? "Turn camera off" : "Turn camera on"}
              className={cn("flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-40", videoOn && hasVideo ? "bg-white/20 text-white hover:bg-white/30" : "bg-red-600 text-white hover:bg-red-700")}
            >
              {videoOn && hasVideo ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-[hsl(var(--border))]">
          <Mic className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]" role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <span className="w-24 text-right text-xs text-[hsl(var(--muted-foreground))]">{hasAudio ? (audioOn ? "Speak to test" : "Muted") : "No microphone"}</span>
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[hsl(var(--border)/0.8)]">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#10264A]">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{subtitle}</div>}
        </div>

        {!secure && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Camera access needs a secure connection (HTTPS or localhost).
          </p>
        )}
        {unsupported && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            This browser can&apos;t access cameras. Use a recent version of Chrome, Edge, Firefox or Safari over HTTPS.
          </p>
        )}
        {problem && (
          <div role="alert" className="flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">{problem.title}</p>
              <p className="mt-0.5 text-amber-900/80">{problem.detail}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Camera</span>
            <select
              className={select}
              value={cameraId}
              disabled={!cameras.length || loading}
              onChange={(e) => { setCameraId(e.target.value); reacquire(e.target.value, micId || undefined); }}
            >
              {cameras.length === 0 && <option value="">No camera detected</option>}
              {cameras.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Microphone</span>
            <select
              className={select}
              value={micId}
              disabled={!mics.length || loading}
              onChange={(e) => { setMicId(e.target.value); reacquire(cameraId || undefined, e.target.value); }}
            >
              {mics.length === 0 && <option value="">No microphone detected</option>}
              {mics.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
            </select>
          </label>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Using: {cameraLabel || "no camera"} · {micLabel || "no microphone"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={testDevices} disabled={testing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold hover:border-[hsl(var(--primary)/0.5)] disabled:opacity-60">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
            {testing ? "Playing test sound…" : "Test Devices"}
          </button>
          {(problem || !stream) && !loading && (
            <button type="button" onClick={() => reacquire(cameraId || undefined, micId || undefined)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
            </button>
          )}
        </div>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={join}
            disabled={!stream || loading || !!joinDisabledReason}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6500] text-base font-semibold text-white shadow-[0_10px_24px_-12px_rgba(255,101,0,0.8)] transition-colors hover:bg-[#E85C00] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn className="h-5 w-5" aria-hidden="true" />
            {joinLabel}
          </button>
          {joinDisabledReason ? (
            <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">{joinDisabledReason}</p>
          ) : !stream && !loading ? (
            <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">Allow a camera or microphone to join.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
