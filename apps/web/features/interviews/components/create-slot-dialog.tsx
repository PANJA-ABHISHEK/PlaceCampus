"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarPlus, Loader2 } from "lucide-react";
import { INTERVIEW_TYPES } from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { cn, isHttpUrl } from "@/lib/utils";
import {
  FieldError,
  fieldInputClassName,
} from "@/features/student/components/profile/profile-fields";
import { useCreateInterviewSlot } from "../hooks/use-interviews";
import { DialogFrame } from "./interview-ui";

const DURATIONS = [15, 30, 45, 60, 90, 120];

const schema = z
  .object({
    type: z.enum(INTERVIEW_TYPES),
    date: z.string().min(1, "Pick a date"),
    time: z.string().min(1, "Pick a start time"),
    durationMinutes: z.coerce.number().int().min(15).max(120),
    meetingUrl: z
      .string()
      .trim()
      .refine(
        (v) => isHttpUrl(v) && v.startsWith("https://"),
        "Enter a secure https:// meeting link",
      ),
    notes: z.string().trim().max(500, "Keep notes under 500 characters"),
  })
  .refine(
    // Mirrors the API: slots must start at least 5 minutes from now.
    (v) => new Date(`${v.date}T${v.time}`).getTime() > Date.now() + 5 * 60_000,
    { message: "Choose a time at least 5 minutes from now", path: ["time"] },
  );

type Values = z.infer<typeof schema>;

export function CreateSlotDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateInterviewSlot();
  const [tomorrow] = React.useState(() =>
    format(new Date(Date.now() + 24 * 3600_000), "yyyy-MM-dd"),
  );
  const [today] = React.useState(() => format(new Date(), "yyyy-MM-dd"));
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "Technical",
      date: tomorrow,
      time: "10:00",
      durationMinutes: 30,
      meetingUrl: "",
      notes: "",
    },
  });

  const onSubmit = (values: Values) => {
    createMutation.mutate(
      {
        type: values.type,
        startsAt: new Date(`${values.date}T${values.time}`).toISOString(),
        durationMinutes: values.durationMinutes,
        meetingUrl: values.meetingUrl,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Slot opened", {
            description: "Students can now book this time.",
          });
          reset({ ...values, notes: "" });
          onOpenChange(false);
        },
        onError: (error) =>
          toast.error("Couldn't open this slot", {
            description:
              error instanceof ApiError
                ? error.errors?.validation?.[0] || error.message
                : "Please try again.",
          }),
      },
    );
  };

  const field = (hasError: boolean) =>
    cn(fieldInputClassName, "h-11 px-3.5", hasError && "border-red-400");

  return (
    <DialogFrame
      open={open}
      onOpenChange={onOpenChange}
      locked={createMutation.isPending}
      className="max-w-[34rem]"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-col">
        <div className="border-b border-[hsl(var(--border)/0.7)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] px-6 pb-4 pt-6">
          <DialogPrimitive.Title className="text-xl font-bold text-[hsl(var(--foreground))]">
            Open an interview slot
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Students can book this time. They see the meeting link only after
            booking.
          </DialogPrimitive.Description>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="slot-type" className="text-sm font-semibold">Interview type</label>
            <select id="slot-type" className={field(!!errors.type)} {...register("type")}>
              {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="slot-date" className="text-sm font-semibold">Date</label>
            <input id="slot-date" type="date" min={today} className={field(!!errors.date)} {...register("date")} />
            <FieldError id="slot-date-error" message={errors.date?.message} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="slot-time" className="text-sm font-semibold">Start time</label>
            <input id="slot-time" type="time" className={field(!!errors.time)} {...register("time")} />
            <FieldError id="slot-time-error" message={errors.time?.message} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="slot-duration" className="text-sm font-semibold">Duration</label>
            <select id="slot-duration" className={field(false)} {...register("durationMinutes")}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="slot-url" className="text-sm font-semibold">Meeting link</label>
            <input
              id="slot-url"
              type="url"
              inputMode="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              aria-invalid={!!errors.meetingUrl}
              className={field(!!errors.meetingUrl)}
              {...register("meetingUrl")}
            />
            <FieldError id="slot-url-error" message={errors.meetingUrl?.message} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="slot-notes" className="text-sm font-semibold">Notes for students (optional)</label>
            <textarea
              id="slot-notes"
              rows={3}
              placeholder="e.g. Focus on DSA and one project walkthrough."
              className={cn(fieldInputClassName, "resize-none px-3.5 py-2.5")}
              {...register("notes")}
            />
            <FieldError id="slot-notes-error" message={errors.notes?.message} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.25)] px-6 py-4">
          <DialogPrimitive.Close
            type="button"
            disabled={createMutation.isPending}
            className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-[hsl(var(--foreground)/0.8)] hover:bg-white"
          >
            Cancel
          </DialogPrimitive.Close>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98] disabled:opacity-60"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            )}
            Open slot
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}
