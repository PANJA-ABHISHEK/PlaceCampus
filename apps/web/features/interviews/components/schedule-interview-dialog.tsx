"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { BookOpen, CalendarPlus, Check, Loader2, Plus, Search, X } from "lucide-react";
import {
  INTERVIEW_DURATIONS,
  INTERVIEW_QUESTION_CATEGORIES,
  SCHEDULABLE_INTERVIEW_TYPES,
  type InterviewQuestionCategory,
  type InterviewQuestionInput,
} from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { FieldError, fieldInputClassName } from "@/features/student/components/profile/profile-fields";
import { useFacultyStudents } from "@/features/faculty/hooks/use-faculty-portal";
import { useQuestionBank, useScheduleInterview } from "../hooks/use-interviews";
import { typeLabel } from "../lib/interview-meta";
import { DialogFrame } from "./interview-ui";

const schema = z
  .object({
    studentId: z.string().min(1, "Select a student"),
    title: z.string().trim().min(3, "Give the interview a short title").max(120, "Keep the title under 120 characters"),
    type: z.enum(SCHEDULABLE_INTERVIEW_TYPES),
    date: z.string().min(1, "Pick a date"),
    time: z.string().min(1, "Pick a start time"),
    durationMinutes: z.coerce.number().int(),
    instructions: z.string().trim().max(2000, "Keep instructions under 2000 characters"),
  })
  .refine((v) => new Date(`${v.date}T${v.time}`).getTime() > Date.now() + 5 * 60_000, {
    message: "Choose a time at least 5 minutes from now",
    path: ["time"],
  });

type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;

function StudentPicker({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (id: string) => void;
  invalid: boolean;
}) {
  const students = useFacultyStudents();
  const [query, setQuery] = React.useState("");
  const list = students.data ?? [];
  const selected = list.find((s) => s.id === value);
  const q = query.trim().toLowerCase();
  const matches = list.filter(
    (s) => !q || s.fullName.toLowerCase().includes(q) || (s.registrationNumber ?? "").toLowerCase().includes(q),
  );

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.05)] px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{selected.fullName}</p>
          <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
            {[selected.registrationNumber, selected.program].filter(Boolean).join(" · ") || selected.email}
          </p>
        </div>
        <button type="button" onClick={() => onChange("")} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-white">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border", invalid ? "border-red-400" : "border-[hsl(var(--border))]")}>
      <div className="relative border-b border-[hsl(var(--border)/0.7)]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or registration number"
          aria-label="Search students"
          className="h-10 w-full bg-white pl-9 pr-3 text-sm outline-none"
        />
      </div>
      <ul role="listbox" aria-label="Assigned students" className="max-h-44 overflow-y-auto bg-white">
        {students.isLoading ? (
          <li className="flex items-center gap-2 px-3.5 py-3 text-sm text-[hsl(var(--muted-foreground))]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your students…
          </li>
        ) : students.isError ? (
          <li className="px-3.5 py-3 text-sm text-red-600">Couldn&apos;t load your students.</li>
        ) : matches.length === 0 ? (
          <li className="px-3.5 py-3 text-sm text-[hsl(var(--muted-foreground))]">
            {list.length === 0 ? "No students are assigned to you yet." : "No students match your search."}
          </li>
        ) : (
          matches.map((s) => (
            <li key={s.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => onChange(s.id)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[hsl(var(--primary)/0.05)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[hsl(var(--foreground))]">{s.fullName}</span>
                  <span className="block truncate text-xs text-[hsl(var(--muted-foreground))]">
                    {[s.registrationNumber, s.program, s.batch].filter(Boolean).join(" · ") || s.email}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

/** Custom questions plus picks from the question bank. */
export function QuestionComposer({
  questions,
  onChange,
}: {
  questions: InterviewQuestionInput[];
  onChange: (questions: InterviewQuestionInput[]) => void;
}) {
  const [text, setText] = React.useState("");
  const [category, setCategory] = React.useState<InterviewQuestionCategory>("DSA");
  const [bankOpen, setBankOpen] = React.useState(false);
  const bank = useQuestionBank(bankOpen);
  const has = (t: string) => questions.some((q) => q.text === t);

  const add = () => {
    const trimmed = text.trim();
    if (!trimmed || has(trimmed)) return;
    onChange([...questions, { text: trimmed, category }]);
    setText("");
  };

  return (
    <div className="space-y-2.5">
      {questions.length > 0 && (
        <ol className="space-y-1.5">
          {questions.map((q, i) => (
            <li key={q.text} className="flex items-start gap-2 rounded-lg bg-[hsl(var(--muted)/0.5)] px-3 py-2 text-sm">
              <span className="mt-px font-semibold tabular-nums text-[hsl(var(--muted-foreground))]">{i + 1}.</span>
              <span className="min-w-0 flex-1">
                {q.text}
                <span className="ml-1.5 rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[hsl(var(--color-primary-700))]">{q.category}</span>
              </span>
              <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => onChange(questions.filter((x) => x !== q))} className="rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <select aria-label="Question category" value={category} onChange={(e) => setCategory(e.target.value as InterviewQuestionCategory)} className={cn(fieldInputClassName, "h-10 px-3 sm:w-44")}>
          {INTERVIEW_QUESTION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          maxLength={500}
          placeholder="Type a question and press Enter"
          aria-label="New question"
          className={cn(fieldInputClassName, "h-10 flex-1 px-3")}
        />
        <button type="button" onClick={add} disabled={!text.trim()} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-white px-3 text-sm font-semibold hover:border-[hsl(var(--primary)/0.5)] disabled:opacity-50">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add
        </button>
      </div>
      <button type="button" onClick={() => setBankOpen((o) => !o)} aria-expanded={bankOpen} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        {bankOpen ? "Hide question bank" : "Pick from question bank"}
      </button>
      {bankOpen && (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-white">
          {bank.isLoading ? (
            <p className="flex items-center gap-2 px-3.5 py-3 text-sm text-[hsl(var(--muted-foreground))]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : (
            INTERVIEW_QUESTION_CATEGORIES.map((cat) => {
              const entries = (bank.data ?? []).filter((q) => q.category === cat);
              if (!entries.length) return null;
              return (
                <div key={cat}>
                  <p className="sticky top-0 bg-[hsl(var(--muted))] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[hsl(var(--foreground)/0.7)]">{cat}</p>
                  {entries.map((q) => {
                    const picked = has(q.text);
                    return (
                      <button
                        key={q.text}
                        type="button"
                        disabled={picked}
                        onClick={() => onChange([...questions, { text: q.text, category: q.category }])}
                        className="flex w-full items-start gap-2 px-3.5 py-2 text-left text-sm hover:bg-[hsl(var(--primary)/0.05)] disabled:cursor-default disabled:text-[hsl(var(--muted-foreground))] disabled:hover:bg-transparent"
                      >
                        {picked ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <Plus className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />}
                        {q.text}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const schedule = useScheduleInterview();
  const [today] = React.useState(() => format(new Date(), "yyyy-MM-dd"));
  const [tomorrow] = React.useState(() => format(new Date(Date.now() + 24 * 3600_000), "yyyy-MM-dd"));
  const [questions, setQuestions] = React.useState<InterviewQuestionInput[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: "",
      title: "",
      type: "Technical",
      date: tomorrow,
      time: "10:00",
      durationMinutes: 30,
      instructions: "",
    },
  });
  const studentId = useWatch({ control, name: "studentId" });

  const onSubmit = (values: Output) => {
    schedule.mutate(
      {
        studentId: values.studentId,
        title: values.title,
        type: values.type,
        scheduledAt: new Date(`${values.date}T${values.time}`).toISOString(),
        durationMinutes: values.durationMinutes,
        instructions: values.instructions || undefined,
        questions: questions.length ? questions : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Interview scheduled", { description: "The student has been notified." });
          reset();
          setQuestions([]);
          onOpenChange(false);
        },
        onError: (error) =>
          toast.error("Couldn't schedule the interview", {
            description: error instanceof ApiError ? error.errors?.validation?.[0] || error.message : "Please try again.",
          }),
      },
    );
  };

  const field = (hasError: boolean) => cn(fieldInputClassName, "h-11 px-3.5", hasError && "border-red-400");

  return (
    <DialogFrame open={open} onOpenChange={onOpenChange} locked={schedule.isPending} className="max-w-[40rem]">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-col">
        <div className="border-b border-[hsl(var(--border)/0.7)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] px-6 pb-4 pt-6">
          <DialogPrimitive.Title className="text-xl font-bold text-[hsl(var(--foreground))]">Schedule a mock interview</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            The interview runs in the built-in PlaceCampus video room. The student is notified straight away.
          </DialogPrimitive.Description>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <span id="sched-student-label" className="text-sm font-semibold">Student</span>
            <input type="hidden" {...register("studentId")} />
            <div aria-labelledby="sched-student-label">
              <StudentPicker
                value={studentId}
                onChange={(id) => setValue("studentId", id, { shouldValidate: true })}
                invalid={!!errors.studentId}
              />
            </div>
            <FieldError id="sched-student-error" message={errors.studentId?.message} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="sched-title" className="text-sm font-semibold">Interview title</label>
            <input id="sched-title" placeholder="e.g. DSA round 1: arrays and linked lists" className={field(!!errors.title)} {...register("title")} />
            <FieldError id="sched-title-error" message={errors.title?.message} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sched-type" className="text-sm font-semibold">Interview type</label>
            <select id="sched-type" className={field(false)} {...register("type")}>
              {SCHEDULABLE_INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sched-duration" className="text-sm font-semibold">Duration</label>
            <select id="sched-duration" className={field(false)} {...register("durationMinutes")}>
              {INTERVIEW_DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sched-date" className="text-sm font-semibold">Date</label>
            <input id="sched-date" type="date" min={today} className={field(!!errors.date)} {...register("date")} />
            <FieldError id="sched-date-error" message={errors.date?.message} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sched-time" className="text-sm font-semibold">Start time</label>
            <input id="sched-time" type="time" className={field(!!errors.time)} {...register("time")} />
            <FieldError id="sched-time-error" message={errors.time?.message} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="sched-instructions" className="text-sm font-semibold">Instructions for the student (optional)</label>
            <textarea
              id="sched-instructions"
              rows={3}
              placeholder="e.g. Keep a pen and paper ready. Be prepared to share your screen and walk through one project."
              className={cn(fieldInputClassName, "resize-none px-3.5 py-2.5")}
              {...register("instructions")}
            />
            <FieldError id="sched-instructions-error" message={errors.instructions?.message} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-semibold">Interview questions (optional)</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Only you see these. The student sees a question once you mark it as asked.</p>
            <QuestionComposer questions={questions} onChange={setQuestions} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.25)] px-6 py-4">
          <DialogPrimitive.Close type="button" disabled={schedule.isPending} className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-[hsl(var(--foreground)/0.8)] hover:bg-white">
            Cancel
          </DialogPrimitive.Close>
          <button
            type="submit"
            disabled={schedule.isPending}
            className="inline-flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98] disabled:opacity-60"
          >
            {schedule.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarPlus className="h-4 w-4" aria-hidden="true" />}
            Schedule Interview
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}
