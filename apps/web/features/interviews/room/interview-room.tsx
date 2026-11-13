"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CircleAlert, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useInterviewRoomDetails } from "../hooks/use-interviews";
import { canEnterRoom, startTime, START_WINDOW_MS, typeLabel } from "../lib/interview-meta";
import { formatDay, formatTime } from "../components/interview-ui";
import { DeviceCheck } from "./device-check";
import { Meeting } from "./meeting-room";

type Role = "FACULTY" | "STUDENT";

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
