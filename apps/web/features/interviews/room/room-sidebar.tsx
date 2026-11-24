"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, ListChecks, Loader2, Lock, MessageSquare, NotebookPen, Send, Trash2 } from "lucide-react";
import type { InterviewQuestion, InterviewRoomRole, RoomChatMessage } from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  addInterviewQuestions,
  removeInterviewQuestion,
  saveFacultyNotes,
  updateInterviewQuestion,
} from "../hooks/use-interviews";
import { QuestionComposer } from "../components/schedule-interview-dialog";

export type SidebarTab = "questions" | "chat" | "notes";

const errorText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : "Please try again.");

function QuestionFeedback({ question, onSave }: { question: InterviewQuestion; onSave: (feedback: string) => void }) {
  const [value, setValue] = React.useState(question.feedback ?? "");
  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value.trim() !== (question.feedback ?? "") && onSave(value)}
      rows={2}
      maxLength={1000}
      placeholder="Private feedback on this answer"
      aria-label={`Feedback on: ${question.text}`}
      className="mt-2 w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[hsl(var(--primary))]"
    />
  );
}

function FacultyQuestions({ interviewId, questions, onChange }: { interviewId: string; questions: InterviewQuestion[]; onChange: (q: InterviewQuestion[]) => void }) {
  const [busy, setBusy] = React.useState<string | null>(null);

  const run = async (key: string, action: () => Promise<InterviewQuestion[]>) => {
    setBusy(key);
    try {
      onChange(await action());
    } catch (e) {
      toast.error("Couldn't update questions", { description: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <p className="rounded-xl bg-[hsl(var(--muted)/0.6)] px-4 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No questions yet. Add your own or pick from the bank below.
        </p>
      ) : (
        <ol className="space-y-2">
          {questions.map((q, i) => (
            <li key={q.id} className={cn("rounded-xl border p-3", q.asked ? "border-emerald-200 bg-emerald-50/50" : "border-[hsl(var(--border))] bg-white")}>
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  disabled={busy === q.id}
                  onClick={() => run(q.id, () => updateInterviewQuestion(interviewId, q.id, { asked: !q.asked }))}
                  aria-pressed={q.asked}
                  aria-label={q.asked ? "Mark as not asked" : "Mark as asked"}
                  className="mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))] hover:text-emerald-600"
                >
                  {busy === q.id ? <Loader2 className="h-5 w-5 animate-spin" /> : q.asked ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[hsl(var(--foreground))]"><span className="font-semibold tabular-nums">{i + 1}.</span> {q.text}</p>
                  <span className="mt-1 inline-block rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[11px] font-semibold text-[hsl(var(--foreground)/0.7)]">{q.category}</span>
                </div>
                <button type="button" aria-label="Remove question" onClick={() => run(`rm-${q.id}`, () => removeInterviewQuestion(interviewId, q.id))} className="shrink-0 rounded p-1 text-[hsl(var(--muted-foreground))] hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <QuestionFeedback key={`${q.id}:${q.feedback ?? ""}`} question={q} onSave={(feedback) => run(`fb-${q.id}`, () => updateInterviewQuestion(interviewId, q.id, { feedback }))} />
            </li>
          ))}
        </ol>
      )}
      <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Add questions</p>
        <QuestionComposer
          questions={questions.map((q) => ({ text: q.text, category: q.category }))}
          onChange={(next) => {
            const added = next.filter((n) => !questions.some((q) => q.text === n.text));
            if (added.length) void run("add", () => addInterviewQuestions(interviewId, added));
          }}
        />
      </div>
      <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" /> The student only sees questions you mark as asked. Feedback stays private.
      </p>
    </div>
  );
}

function StudentQuestions({ questions }: { questions: InterviewQuestion[] }) {
  if (!questions.length)
    return <p className="rounded-xl bg-[hsl(var(--muted)/0.6)] px-4 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">Questions appear here as your interviewer asks them.</p>;
  return (
    <ol className="space-y-2">
      {questions.map((q, i) => (
        <li key={q.id} className="rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-sm">
          <span className="font-semibold tabular-nums">{i + 1}.</span> {q.text}
          <span className="ml-1.5 rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[11px] font-semibold text-[hsl(var(--foreground)/0.7)]">{q.category}</span>
        </li>
      ))}
    </ol>
  );
}

function ChatPanel({ messages, myRole, onSend, disabledReason }: { messages: RoomChatMessage[]; myRole: InterviewRoomRole; onSend: (text: string) => Promise<void>; disabledReason?: string | null }) {
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  // Braces matter: newer browsers return a Promise from scrollIntoView, and an
  // effect may only return a cleanup function.
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setSending(true);
    try {
      await onSend(value);
      setText("");
    } catch (err) {
      toast.error("Message not sent", { description: errorText(err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3" aria-live="polite">
        {messages.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">Messages are only shown during the call and are not saved.</p>
        ) : (
          messages.map((m) => {
            const mine = m.role === myRole;
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                <span className="mb-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                  {mine ? "You" : m.fromName} · {new Date(m.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
                <p className={cn("max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm", mine ? "rounded-br-sm bg-[#FF6500] text-white" : "rounded-bl-sm bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]")}>
                  {m.text}
                </p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-[hsl(var(--border)/0.7)] pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          disabled={!!disabledReason}
          placeholder={disabledReason ?? "Type a message"}
          aria-label="Chat message"
          className="h-10 min-w-0 flex-1 rounded-xl border border-[hsl(var(--border))] bg-white px-3 text-sm outline-none focus:border-[hsl(var(--primary))] disabled:bg-[hsl(var(--muted)/0.5)]"
        />
        <button type="submit" disabled={sending || !text.trim() || !!disabledReason} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6500] text-white disabled:opacity-50">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

function NotesPanel({ interviewId, initial }: { interviewId: string; initial: string }) {
  const [value, setValue] = React.useState(initial);
  const [state, setState] = React.useState<"saved" | "saving" | "dirty" | "error">("saved");
  const latest = React.useRef(initial);

  React.useEffect(() => {
    if (value === latest.current) return;
    setState("dirty");
    const timer = setTimeout(async () => {
      setState("saving");
      try {
        await saveFacultyNotes(interviewId, value);
        latest.current = value;
        setState("saved");
      } catch {
        setState("error");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [value, interviewId]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={5000}
        placeholder="Private notes. Only you can see these."
        aria-label="Private notes"
        className="min-h-0 flex-1 resize-none rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
      />
      <p className={cn("flex items-center gap-1.5 text-xs", state === "error" ? "text-red-600" : "text-[hsl(var(--muted-foreground))]")} aria-live="polite">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        {state === "saving" ? "Saving…" : state === "dirty" ? "Unsaved changes" : state === "error" ? "Couldn't save. Keep typing to retry." : "Saved · visible only to you"}
      </p>
    </div>
  );
}

export function RoomSidebar({
  role,
  tab,
  onTabChange,
  interviewId,
  questions,
  onQuestionsChange,
  notes,
  messages,
  onSendChat,
  chatDisabledReason,
  unread,
}: {
  role: InterviewRoomRole;
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  interviewId: string;
  questions: InterviewQuestion[];
  onQuestionsChange: (q: InterviewQuestion[]) => void;
  notes: string;
  messages: RoomChatMessage[];
  onSendChat: (text: string) => Promise<void>;
  chatDisabledReason?: string | null;
  unread: number;
}) {
  const tabs: { id: SidebarTab; label: string; icon: typeof ListChecks }[] = [
    { id: "questions", label: "Questions", icon: ListChecks },
    { id: "chat", label: "Chat", icon: MessageSquare },
    ...(role === "FACULTY" ? [{ id: "notes" as const, label: "Notes", icon: NotebookPen }] : []),
  ];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Interview panels" className="flex gap-1 border-b border-[hsl(var(--border)/0.7)] p-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => onTabChange(id)}
            className={cn("relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-colors", tab === id ? "bg-[#FFF1E8] text-[#FF6500]" : "text-[hsl(var(--foreground)/0.7)] hover:bg-[hsl(var(--muted)/0.7)]")}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            {id === "chat" && unread > 0 && tab !== "chat" && (
              <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6500] px-1 text-[10px] font-bold text-white">{unread}</span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "questions" ? (
          role === "FACULTY" ? <FacultyQuestions interviewId={interviewId} questions={questions} onChange={onQuestionsChange} /> : <StudentQuestions questions={questions} />
        ) : tab === "chat" ? (
          <ChatPanel messages={messages} myRole={role} onSend={onSendChat} disabledReason={chatDisabledReason} />
        ) : (
          <NotesPanel interviewId={interviewId} initial={notes} />
        )}
      </div>
    </div>
  );
}
