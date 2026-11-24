"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ListChecks,
  Loader2,
  Lock,
  MessageSquare,
  MessagesSquare,
  NotebookPen,
  Plus,
  SendHorizontal,
  Trash2,
} from "lucide-react";
import {
  INTERVIEW_QUESTION_CATEGORIES,
  type InterviewQuestion,
  type InterviewQuestionCategory,
  type InterviewRoomRole,
  type RoomChatMessage,
} from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  addInterviewQuestions,
  removeInterviewQuestion,
  saveFacultyNotes,
  updateInterviewQuestion,
  useQuestionBank,
} from "../hooks/use-interviews";

export type SidebarTab = "questions" | "chat" | "notes";

const errorText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : "Please try again.");

const fieldDark =
  "w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 text-sm text-white placeholder:text-[#7D889B] outline-none transition-colors focus:border-[#FF7900]/70 focus:ring-2 focus:ring-[#FF7900]/20";

function EmptyState({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="relative flex h-20 w-24 items-center justify-center">
        <Icon className="h-16 w-16 text-[#2B3954]" />
        <span className="absolute left-7 top-6 flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#FF7900]" />)}
        </span>
      </span>
      <p className="font-semibold text-white">{title}</p>
      <p className="max-w-[16rem] text-sm text-[#AAB4C5]">{body}</p>
    </div>
  );
}

/* -------------------------------- Questions -------------------------------- */

function QuestionNavigator({
  questions,
  index,
  onIndex,
  children,
}: {
  questions: InterviewQuestion[];
  index: number;
  onIndex: (i: number) => void;
  children?: React.ReactNode;
}) {
  const q = questions[index];
  if (!q) return null;
  return (
    <div className="rounded-2xl border border-[#FF7900]/30 bg-gradient-to-b from-[#FF7900]/10 to-transparent p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF9D32]">
          Question {index + 1} of {questions.length}
        </span>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous question" disabled={index === 0} onClick={() => onIndex(index - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white hover:bg-[#FF7900]/20 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Next question" disabled={index >= questions.length - 1} onClick={() => onIndex(index + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white hover:bg-[#FF7900]/20 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-[15px] font-semibold leading-snug text-white">{q.text}</p>
      <span className="mt-2 inline-block rounded-md bg-white/[0.07] px-2 py-0.5 text-[11px] font-semibold text-[#AAB4C5]">{q.category}</span>
      {children}
    </div>
  );
}

function QuestionList({ questions, index, onIndex }: { questions: InterviewQuestion[]; index: number; onIndex: (i: number) => void }) {
  return (
    <ol className="space-y-1.5">
      {questions.map((q, i) => (
        <li key={q.id}>
          <button
            type="button"
            onClick={() => onIndex(i)}
            aria-current={i === index ? "step" : undefined}
            className={cn(
              "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
              i === index ? "border-[#FF7900]/50 bg-[#FF7900]/10" : "border-transparent bg-white/[0.03] hover:bg-white/[0.06]",
            )}
          >
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", q.asked ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/80")}>
              {q.asked ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn("min-w-0 flex-1 leading-snug", q.asked ? "text-[#AAB4C5]" : "text-white")}>{q.text}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function AddQuestion({ interviewId, existing, onChange }: { interviewId: string; existing: InterviewQuestion[]; onChange: (q: InterviewQuestion[]) => void }) {
  const [text, setText] = React.useState("");
  const [category, setCategory] = React.useState<InterviewQuestionCategory>("DSA");
  const [busy, setBusy] = React.useState(false);
  const [bankOpen, setBankOpen] = React.useState(false);
  const bank = useQuestionBank(bankOpen);
  const has = (t: string) => existing.some((q) => q.text === t);

  const add = async (items: { text: string; category: InterviewQuestionCategory }[]) => {
    setBusy(true);
    try {
      onChange(await addInterviewQuestions(interviewId, items));
      setText("");
    } catch (e) {
      toast.error("Couldn't add the question", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5 rounded-2xl border border-dashed border-white/10 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#AAB4C5]">Add a question</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (t && !has(t)) void add([{ text: t, category }]);
        }}
        className="space-y-2"
      >
        <div className="flex gap-2">
          <select aria-label="Question category" value={category} onChange={(e) => setCategory(e.target.value as InterviewQuestionCategory)} className={cn(fieldDark, "h-10 w-36 shrink-0")}>
            {INTERVIEW_QUESTION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Type a question" aria-label="New question" className={cn(fieldDark, "h-10 min-w-0")} />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Add question" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF7900] text-white disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </form>
      <button type="button" onClick={() => setBankOpen((o) => !o)} aria-expanded={bankOpen} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF9D32] hover:text-[#FF7900]">
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        {bankOpen ? "Hide question bank" : "Pick from question bank"}
      </button>
      {bankOpen && (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#0B1120]">
          {bank.isLoading ? (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-[#AAB4C5]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : (
            INTERVIEW_QUESTION_CATEGORIES.map((cat) => {
              const entries = (bank.data ?? []).filter((q) => q.category === cat);
              if (!entries.length) return null;
              return (
                <div key={cat}>
                  <p className="sticky top-0 bg-[#141D30] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#AAB4C5]">{cat}</p>
                  {entries.map((q) => {
                    const picked = has(q.text);
                    return (
                      <button key={q.text} type="button" disabled={picked || busy} onClick={() => void add([q])} className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-white hover:bg-[#FF7900]/10 disabled:text-[#7D889B] disabled:hover:bg-transparent">
                        {picked ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Plus className="mt-0.5 h-4 w-4 shrink-0 text-[#FF9D32]" />}
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

function FacultyQuestions({ interviewId, questions, onChange }: { interviewId: string; questions: InterviewQuestion[]; onChange: (q: InterviewQuestion[]) => void }) {
  const [index, setIndex] = React.useState(0);
  const [busy, setBusy] = React.useState<string | null>(null);
  const safeIndex = Math.min(index, Math.max(0, questions.length - 1));
  const current = questions[safeIndex];

  const run = async (key: string, action: () => Promise<InterviewQuestion[]>) => {
    setBusy(key);
    try {
      onChange(await action());
    } catch (e) {
      toast.error("Couldn't update the question", { description: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <EmptyState icon={ListChecks} title="No questions yet" body="Add your own question or pick one from the question bank below." />
      ) : (
        <>
          <QuestionNavigator questions={questions} index={safeIndex} onIndex={setIndex}>
            {current && (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === current.id}
                    onClick={() =>
                      run(current.id, async () => {
                        const next = await updateInterviewQuestion(interviewId, current.id, { asked: !current.asked });
                        // Move on to the next open question after completing one.
                        if (!current.asked && safeIndex < questions.length - 1) setIndex(safeIndex + 1);
                        return next;
                      })
                    }
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors disabled:opacity-60",
                      current.asked ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" : "bg-[#FF7900] text-white hover:bg-[#FF8A1F]",
                    )}
                  >
                    {busy === current.id ? <Loader2 className="h-4 w-4 animate-spin" /> : current.asked ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    {current.asked ? "Completed" : "Mark as completed"}
                  </button>
                  <button type="button" aria-label="Remove question" onClick={() => run(`rm-${current.id}`, () => removeInterviewQuestion(interviewId, current.id))} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-[#AAB4C5] hover:bg-[#E52525]/15 hover:text-[#ff7070]">
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
                <QuestionFeedback key={`${current.id}:${current.feedback ?? ""}`} question={current} onSave={(feedback) => run(`fb-${current.id}`, () => updateInterviewQuestion(interviewId, current.id, { feedback }))} />
              </>
            )}
          </QuestionNavigator>
          <QuestionList questions={questions} index={safeIndex} onIndex={setIndex} />
        </>
      )}
      <AddQuestion interviewId={interviewId} existing={questions} onChange={onChange} />
      <p className="flex items-center gap-1.5 text-xs text-[#AAB4C5]">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" /> The student only sees questions you mark as completed. Feedback stays private.
      </p>
    </div>
  );
}

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
      aria-label={`Private feedback on: ${question.text}`}
      className={cn(fieldDark, "mt-3 resize-none py-2")}
    />
  );
}

function StudentQuestions({ questions }: { questions: InterviewQuestion[] }) {
  const [picked, setPicked] = React.useState<number | null>(null);
  // Follow the latest question unless the student is browsing earlier ones.
  const index = picked == null ? Math.max(0, questions.length - 1) : Math.min(picked, questions.length - 1);
  if (!questions.length)
    return <EmptyState icon={ListChecks} title="No questions yet" body="Questions appear here as your interviewer asks them." />;
  return (
    <div className="space-y-4">
      <QuestionNavigator questions={questions} index={index} onIndex={(i) => setPicked(i >= questions.length - 1 ? null : i)} />
      <QuestionList questions={questions} index={index} onIndex={(i) => setPicked(i >= questions.length - 1 ? null : i)} />
    </div>
  );
}

/* ---------------------------------- Chat ---------------------------------- */

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
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#0B1120]/60 p-3" aria-live="polite">
        {messages.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No messages yet" body="Messages are only shown during the call and are not saved." />
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const mine = m.role === myRole;
              return (
                <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                  <span className="mb-1 px-1 text-[11px] text-[#7D889B]">
                    {mine ? "You" : m.fromName} · {new Date(m.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <p
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      mine ? "rounded-br-md bg-gradient-to-br from-[#FF8A1F] to-[#FF7900] text-white" : "rounded-bl-md border border-white/[0.06] bg-white/[0.07] text-white",
                    )}
                  >
                    {m.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          disabled={!!disabledReason}
          placeholder={disabledReason ?? "Type a message..."}
          aria-label="Chat message"
          className={cn(fieldDark, "h-12 rounded-full px-5 disabled:opacity-60")}
        />
        <button
          type="submit"
          disabled={sending || !text.trim() || !!disabledReason}
          aria-label="Send message"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#FF8A1F] to-[#FF7900] text-white shadow-[0_8px_24px_-10px_rgba(255,121,0,0.9)] transition-opacity disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
        </button>
      </form>
    </div>
  );
}

/* --------------------------------- Notes --------------------------------- */

function NotesPanel({ interviewId, initial }: { interviewId: string; initial: string }) {
  const [value, setValue] = React.useState(initial);
  const [state, setState] = React.useState<"saved" | "saving" | "dirty" | "error">("saved");
  const latest = React.useRef(initial);

  React.useEffect(() => {
    if (value === latest.current) return;
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
        onChange={(e) => {
          setValue(e.target.value);
          setState("dirty");
        }}
        maxLength={5000}
        placeholder="Private notes. Only you can see these."
        aria-label="Private notes"
        className={cn(fieldDark, "min-h-0 flex-1 resize-none p-3")}
      />
      <p className={cn("flex items-center gap-1.5 text-xs", state === "error" ? "text-[#ff7070]" : "text-[#AAB4C5]")} aria-live="polite">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        {state === "saving" ? "Saving…" : state === "dirty" ? "Unsaved changes" : state === "error" ? "Couldn't save. Keep typing to retry." : "Saved · visible only to you"}
      </p>
    </div>
  );
}

/* -------------------------------- Sidebar -------------------------------- */

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
    // Private interviewer notes: never shown to the student.
    ...(role === "FACULTY" ? [{ id: "notes" as const, label: "Notes", icon: NotebookPen }] : []),
  ];
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div role="tablist" aria-label="Interview panels" className="flex gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => onTabChange(id)}
            className={cn(
              "relative inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition-all",
              tab === id
                ? "bg-gradient-to-b from-[#FF8A1F] to-[#FF7900] text-white shadow-[0_8px_24px_-10px_rgba(255,121,0,0.9)]"
                : "text-white/85 hover:bg-white/[0.06]",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            {id === "chat" && unread > 0 && tab !== "chat" && (
              <span className="absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF7900] px-1 text-[10px] font-bold text-white">{unread}</span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" className={cn("min-h-0 flex-1", tab === "chat" || tab === "notes" ? "flex flex-col" : "overflow-y-auto pr-1")}>
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
