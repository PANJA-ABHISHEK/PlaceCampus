"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import {
  CalendarX2,
  Clock,
  Loader2,
  RotateCcw,
  UserRound,
} from "lucide-react";
import {
  INTERVIEW_TYPES,
  type InterviewSlot,
  type InterviewType,
  type MockInterview,
} from "@placecampus/shared-types";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  useBookInterviewSlot,
  useOpenInterviewSlots,
} from "../hooks/use-interviews";
import { endTime, startTime } from "../lib/interview-meta";
import { DialogFrame, formatDay, formatTime } from "./interview-ui";

/** Must match MAX_UPCOMING_BOOKINGS in the API. */
const MAX_UPCOMING = 3;
const MINUTE = 60_000;

export function BookInterviewDialog({
  open,
  onOpenChange,
  upcoming,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The student's own upcoming interviews, to flag clashes. */
  upcoming: MockInterview[];
}) {
  const slotsQuery = useOpenInterviewSlots(open);
  const bookMutation = useBookInterviewSlot();
  const [type, setType] = React.useState<InterviewType | "ALL">("ALL");
  const [bookingId, setBookingId] = React.useState<string | null>(null);

  const atLimit = upcoming.length >= MAX_UPCOMING;

  const clashes = (slot: InterviewSlot) => {
    const start = new Date(slot.startsAt).getTime();
    const end = start + slot.durationMinutes * MINUTE;
    return upcoming.some((iv) => startTime(iv) < end && endTime(iv) > start);
  };

  const groups = React.useMemo(() => {
    const slots = (slotsQuery.data ?? []).filter(
      (slot) => type === "ALL" || slot.type === type,
    );
    const byDay = new Map<string, InterviewSlot[]>();
    for (const slot of slots) {
      const day = formatDay(slot.startsAt);
      byDay.set(day, [...(byDay.get(day) ?? []), slot]);
    }
    return [...byDay.entries()];
  }, [slotsQuery.data, type]);

  const book = (slot: InterviewSlot) => {
    setBookingId(slot.id);
    bookMutation.mutate(slot.id, {
      onSuccess: (interview) => {
        toast.success("Interview booked", {
          description: `${interview.type} · ${formatDay(interview.scheduledAt)} at ${formatTime(interview.scheduledAt)}`,
        });
        onOpenChange(false);
      },
      onError: (error) =>
        toast.error("Couldn't book this slot", {
          description:
            error instanceof ApiError ? error.message : "Please try again.",
        }),
      onSettled: () => setBookingId(null),
    });
  };

  return (
    <DialogFrame
      open={open}
      onOpenChange={onOpenChange}
      locked={bookMutation.isPending}
      className="max-w-[40rem]"
    >
      <div className="border-b border-[hsl(var(--border)/0.7)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] px-6 pb-4 pt-6">
        <DialogPrimitive.Title className="text-xl font-bold text-[hsl(var(--foreground))]">
          Book a mock interview
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Pick a time a faculty member has opened. You&apos;ll get the meeting
          link once it&apos;s booked. Times are shown in your local time.
        </DialogPrimitive.Description>
        <div className="mt-4 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {(["ALL", ...INTERVIEW_TYPES] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                type === value
                  ? "bg-[hsl(var(--primary))] text-white"
                  : "bg-white text-[hsl(var(--foreground)/0.75)] ring-1 ring-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]",
              )}
            >
              {value === "ALL" ? "All types" : value}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[16rem] flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {atLimit && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You already have {MAX_UPCOMING} upcoming interviews, the maximum.
            Attend or cancel one to book another.
          </p>
        )}

        {slotsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[68px] rounded-xl" />
            ))}
          </div>
        ) : slotsQuery.isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              We couldn&apos;t load available slots.
            </p>
            <button
              type="button"
              onClick={() => slotsQuery.refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold hover:bg-[hsl(var(--muted))]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
              <CalendarX2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="font-semibold text-[hsl(var(--foreground))]">
              No open slots{type !== "ALL" ? ` for ${type}` : ""} right now
            </p>
            <p className="max-w-[24rem] text-sm text-[hsl(var(--muted-foreground))]">
              Faculty add new interview times regularly. Check back soon.
            </p>
          </div>
        ) : (
          groups.map(([day, slots]) => (
            <section key={day} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                {day}
              </h3>
              <ul className="space-y-2">
                {slots.map((slot) => {
                  const clash = clashes(slot);
                  const disabledReason = clash
                    ? "Clashes with one of your interviews"
                    : atLimit
                      ? "Booking limit reached"
                      : null;
                  const busy = bookingId === slot.id;
                  return (
                    <li
                      key={slot.id}
                      className="flex flex-col gap-3 rounded-xl border border-[hsl(var(--border)/0.8)] p-3.5 transition-colors hover:border-[hsl(var(--primary)/0.35)] sm:flex-row sm:items-center"
                    >
                      <div className="flex w-24 shrink-0 flex-col">
                        <span className="text-base font-bold tabular-nums text-[hsl(var(--foreground))]">
                          {formatTime(slot.startsAt)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {slot.durationMinutes} min
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[hsl(var(--foreground))]">
                          {slot.type} interview
                        </p>
                        <p className="flex items-center gap-1.5 truncate text-sm text-[hsl(var(--muted-foreground))]">
                          <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {slot.interviewer?.fullName ?? "Faculty interviewer"}
                        </p>
                        {slot.notes && (
                          <p className="mt-1 line-clamp-2 text-xs text-[hsl(var(--foreground)/0.7)]">
                            {slot.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-stretch gap-1 sm:items-end">
                        <button
                          type="button"
                          onClick={() => book(slot)}
                          disabled={!!disabledReason || bookMutation.isPending}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[hsl(var(--primary)/0.4)]"
                        >
                          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                          {busy ? "Booking…" : "Book"}
                        </button>
                        {disabledReason && (
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            {disabledReason}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </DialogFrame>
  );
}
