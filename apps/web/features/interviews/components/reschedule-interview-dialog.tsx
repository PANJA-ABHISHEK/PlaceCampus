"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarClock, Loader2 } from "lucide-react";
import { INTERVIEW_DURATIONS, type MockInterview } from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { FieldError, fieldInputClassName } from "@/features/student/components/profile/profile-fields";
import { useRescheduleInterview } from "../hooks/use-interviews";
import { DialogFrame } from "./interview-ui";

export function RescheduleInterviewDialog({
  interview,
  onOpenChange,
}: {
  interview: MockInterview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const reschedule = useRescheduleInterview();
  return (
    <DialogFrame open={!!interview} onOpenChange={onOpenChange} locked={reschedule.isPending}>
      {interview && <RescheduleForm key={interview.id} interview={interview} reschedule={reschedule} onOpenChange={onOpenChange} />}
    </DialogFrame>
  );
}

function RescheduleForm({
  interview,
  reschedule,
  onOpenChange,
}: {
  interview: MockInterview;
  reschedule: ReturnType<typeof useRescheduleInterview>;
  onOpenChange: (open: boolean) => void;
}) {
  const [date, setDate] = React.useState(() => format(new Date(interview.scheduledAt), "yyyy-MM-dd"));
  const [time, setTime] = React.useState(() => format(new Date(interview.scheduledAt), "HH:mm"));
  const [duration, setDuration] = React.useState(interview.durationMinutes ?? 30);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const at = new Date(`${date}T${time}`);
    if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 5 * 60_000) {
      setError("Choose a time at least 5 minutes from now");
      return;
    }
    reschedule.mutate(
      { id: interview.id, scheduledAt: at.toISOString(), durationMinutes: duration, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Interview rescheduled", { description: "The student has been notified of the new time." });
          onOpenChange(false);
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.errors?.validation?.[0] || err.message : "Please try again."),
      },
    );
  };

  const field = cn(fieldInputClassName, "h-11 px-3.5");
  const durations: number[] = [...INTERVIEW_DURATIONS];
  if (interview.durationMinutes && !durations.includes(interview.durationMinutes)) durations.push(interview.durationMinutes);

  return (
      <form onSubmit={submit} noValidate className="flex flex-col">
        <div className="border-b border-[hsl(var(--border)/0.7)] px-6 pb-4 pt-6">
          <DialogPrimitive.Title className="text-xl font-bold">Reschedule interview</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {`${interview.student?.fullName ?? "The student"} will be notified of the new time.`}
          </DialogPrimitive.Description>
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 py-5">
          <div className="space-y-1.5">
            <label htmlFor="res-date" className="text-sm font-semibold">Date</label>
            <input id="res-date" type="date" min={format(new Date(), "yyyy-MM-dd")} value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="res-time" className="text-sm font-semibold">Start time</label>
            <input id="res-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label htmlFor="res-duration" className="text-sm font-semibold">Duration</label>
            <select id="res-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={field}>
              {durations.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <label htmlFor="res-reason" className="text-sm font-semibold">Note for the student (optional)</label>
            <input id="res-reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
          </div>
          <div className="col-span-2"><FieldError id="res-error" message={error ?? undefined} /></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.25)] px-6 py-4">
          <DialogPrimitive.Close type="button" disabled={reschedule.isPending} className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold hover:bg-white">Cancel</DialogPrimitive.Close>
          <button type="submit" disabled={reschedule.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white hover:bg-[hsl(var(--color-primary-600))] disabled:opacity-60">
            {reschedule.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarClock className="h-4 w-4" aria-hidden="true" />}
            Save new time
          </button>
        </div>
      </form>
  );
}
