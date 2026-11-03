"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { JournalAnswer, JournalQuestion } from "@/lib/schema";

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? "border-white" : "border-[var(--accent)]"}`}
    />
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const submitClass =
  "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium py-2 px-5 rounded-[14px] transition-colors duration-200 disabled:opacity-50";
const cancelClass =
  "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-medium py-2 px-5 rounded-[14px] transition-colors duration-200";
const pillClass =
  "text-xs px-3 py-1 rounded-[14px] border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STRIP_DAYS = 14;

function todayPH(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateStr: string): { long: string; day: string } {
  const date = toLocalDate(dateStr);
  return {
    long: date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    day: date.toLocaleDateString("en-US", { weekday: "long" }),
  };
}

type DayContext = {
  thoughts: { id: number; thought: string; type: string | null }[];
  interactions: {
    id: number;
    personName: string | null;
    personNickname: string | null;
    note: string | null;
    sentiment: number | null;
  }[];
  gymSets: number;
  padelSets: number;
  trips: number;
  expenses: { count: number; total: number };
};

type DayData = {
  date: string;
  questions: JournalQuestion[];
  answers: JournalAnswer[];
  context: DayContext;
};

type DayStatus = { status: "complete" | "partial"; answered: number };
type Draft = { text: string; num: number | null };

const emptyDraft: Draft = { text: "", num: null };

function draftFromAnswer(a: JournalAnswer | undefined): Draft {
  return a ? { text: a.textValue ?? "", num: a.numericValue ?? null } : emptyDraft;
}

function isDraftEmpty(q: JournalQuestion, d: Draft): boolean {
  return q.answerType === "scale" ? d.num == null : !d.text.trim();
}

function toPayload(q: JournalQuestion, d: Draft) {
  return q.answerType === "scale"
    ? { questionId: q.id, numericValue: d.num }
    : { questionId: q.id, textValue: d.text };
}

function AutoTextarea({
  value,
  onChange,
  onSubmit,
  autoFocus,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (onSubmit && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onSubmit();
        }
      }}
      className={`${inputClass} resize-none text-base leading-relaxed`}
    />
  );
}

function ScalePicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`py-3 rounded-[14px] border font-mono text-lg transition-colors duration-200 ${
            value === n
              ? "bg-[var(--accent)] border-[var(--accent)] text-white"
              : "bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function AnswerInput({
  question,
  draft,
  setDraft,
  onSubmit,
  autoFocus,
}: {
  question: JournalQuestion;
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
}) {
  return question.answerType === "scale" ? (
    <ScalePicker value={draft.num} onChange={(num) => setDraft({ ...draft, num })} />
  ) : (
    <AutoTextarea
      value={draft.text}
      onChange={(text) => setDraft({ ...draft, text })}
      onSubmit={onSubmit}
      autoFocus={autoFocus}
      placeholder="Write freely…"
    />
  );
}

export default function JournalShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useMemo(() => todayPH(), []);
  const dateParam = searchParams.get("date");
  const date = dateParam && DATE_RE.test(dateParam) && dateParam <= today ? dateParam : today;

  const [data, setData] = useState<DayData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, DayStatus>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Start screen: which questions to ask tonight (not persisted).
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Interview: an ordered queue of question ids and the current step.
  const [queue, setQueue] = useState<number[] | null>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  // Review: inline editing of a single answer.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);

  const [exportFrom, setExportFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [exportTo, setExportTo] = useState(today);

  // The strip shows the 14 days ending today, or ending at the selected date if it's older.
  const stripEnd = date > addDays(today, -STRIP_DAYS) ? today : date;
  const stripDays = useMemo(
    () => Array.from({ length: STRIP_DAYS }, (_, i) => addDays(stripEnd, i - STRIP_DAYS + 1)),
    [stripEnd],
  );

  const fetchStatuses = useCallback(async () => {
    const params = new URLSearchParams({ from: stripDays[0], to: stripDays[stripDays.length - 1] });
    const res = await fetch(`/api/admin/journal?${params}`);
    if (res.ok) setStatuses((await res.json()).days ?? {});
  }, [stripDays]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    setError("");
    setQueue(null);
    setEditingId(null);
    fetch(`/api/admin/journal/${date}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError("Failed to load this day.");
          return;
        }
        const json: DayData = await res.json();
        setData(json);
        setSelected(
          new Set(json.questions.filter((q) => q.isActive && (q.isRequired || q.isDefaultOn)).map((q) => q.id)),
        );
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  function goToDate(d: string) {
    if (d > today) return;
    router.replace(`/admin/journal?date=${d}`, { scroll: false });
  }

  const questions = data?.questions ?? [];
  const answerMap = useMemo(
    () => new Map((data?.answers ?? []).map((a) => [a.questionId, a])),
    [data?.answers],
  );
  const activeQuestions = questions.filter((q) => q.isActive);
  const requiredQuestions = activeQuestions.filter((q) => q.isRequired);
  const requiredDone = requiredQuestions.every((q) => answerMap.has(q.id));

  async function saveAnswers(items: ReturnType<typeof toPayload>[]): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/journal/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: items }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save.");
        return false;
      }
      setData((prev) => (prev ? { ...prev, answers: json.answers } : prev));
      fetchStatuses();
      return true;
    } finally {
      setSaving(false);
    }
  }

  // ── Interview ──────────────────────────────────────────────────────────────

  function startInterview(ids: number[]) {
    // Required questions first, so the minimum entry is done before anything optional.
    const ordered = questions
      .filter((q) => ids.includes(q.id))
      .sort((a, b) => Number(b.isRequired) - Number(a.isRequired));
    if (ordered.length === 0) return;
    setQueue(ordered.map((q) => q.id));
    setStep(0);
    setDraft(draftFromAnswer(answerMap.get(ordered[0].id)));
  }

  function goToStep(i: number) {
    if (!queue) return;
    if (i >= queue.length) {
      setQueue(null);
      return;
    }
    setStep(i);
    setDraft(draftFromAnswer(answerMap.get(queue[i])));
  }

  const currentQuestion = queue ? questions.find((q) => q.id === queue[step]) : undefined;

  async function handleNext() {
    if (!currentQuestion) return;
    if (isDraftEmpty(currentQuestion, draft)) {
      if (currentQuestion.isRequired) return;
      goToStep(step + 1);
      return;
    }
    if (await saveAnswers([toPayload(currentQuestion, draft)])) goToStep(step + 1);
  }

  async function handleDone() {
    if (currentQuestion && !isDraftEmpty(currentQuestion, draft)) {
      if (!(await saveAnswers([toPayload(currentQuestion, draft)]))) return;
    }
    setQueue(null);
  }

  // After saving the current draft, would the minimum entry be complete?
  const requiredDoneWithDraft =
    currentQuestion != null &&
    requiredQuestions.every(
      (q) => answerMap.has(q.id) || (q.id === currentQuestion.id && !isDraftEmpty(q, draft)),
    );

  // ── Review ────────────────────────────────────────────────────────────────

  function openEdit(q: JournalQuestion) {
    setEditingId(q.id);
    setEditDraft(draftFromAnswer(answerMap.get(q.id)));
  }

  async function saveEdit(q: JournalQuestion) {
    if (await saveAnswers([toPayload(q, editDraft)])) setEditingId(null);
  }

  const answeredQuestions = questions.filter((q) => answerMap.has(q.id));
  const unansweredQuestions = activeQuestions.filter((q) => !answerMap.has(q.id));
  const hasAnswers = answeredQuestions.length > 0;
  const { long, day } = formatDate(date);
  const ctx = data?.context;
  const hasContext =
    ctx != null &&
    (ctx.thoughts.length > 0 ||
      ctx.interactions.length > 0 ||
      ctx.gymSets > 0 ||
      ctx.padelSets > 0 ||
      ctx.trips > 0 ||
      ctx.expenses.count > 0);

  function renderEditor(q: JournalQuestion) {
    return (
      <div className="flex flex-col gap-3 mt-3">
        <AnswerInput
          question={q}
          draft={editDraft}
          setDraft={setEditDraft}
          onSubmit={() => saveEdit(q)}
          autoFocus
        />
        {answerMap.has(q.id) && isDraftEmpty(q, editDraft) && (
          <p className="text-xs text-[var(--text-muted)]">Saving an empty answer removes it.</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => saveEdit(q)}
            disabled={saving || (!answerMap.has(q.id) && isDraftEmpty(q, editDraft))}
            className={`${submitClass} inline-flex items-center gap-2`}
          >
            {saving && <Spinner light />}
            Save
          </button>
          <button onClick={() => setEditingId(null)} className={cancelClass}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-bold text-lg text-[var(--text)]">Journal</h1>
            <a href="/admin" className={pillClass}>
              ← Admin
            </a>
          </div>
          {fetching && <Spinner />}
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Date navigation */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {date === today ? "Tonight" : day}
              </p>
              <h2 className="font-heading font-bold text-2xl tracking-tight text-[var(--text)]">{long}</h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => goToDate(addDays(date, -1))}
                className={`${pillClass} px-2.5 py-1.5`}
                aria-label="Previous day"
              >
                ←
              </button>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => e.target.value && goToDate(e.target.value)}
                className="w-9 sm:w-auto px-2 py-1 rounded-[14px] border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)] text-xs"
                aria-label="Pick a date"
              />
              <button
                onClick={() => goToDate(addDays(date, 1))}
                disabled={date >= today}
                className={`${pillClass} px-2.5 py-1.5 disabled:opacity-30`}
                aria-label="Next day"
              >
                →
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {stripDays.map((d) => {
              const s = statuses[d]?.status;
              const isSelected = d === date;
              return (
                <button
                  key={d}
                  onClick={() => goToDate(d)}
                  className={`shrink-0 w-11 py-2 rounded-[14px] flex flex-col items-center gap-1 transition-colors duration-200 ${
                    isSelected
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="text-[10px] uppercase">
                    {toLocalDate(d).toLocaleDateString("en-US", { weekday: "narrow" })}
                  </span>
                  <span className="font-mono text-sm">{Number(d.slice(8))}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      s === "complete"
                        ? isSelected ? "bg-white" : "bg-[var(--success)]"
                        : s === "partial"
                          ? isSelected ? "bg-white/60" : "bg-[var(--warm)]"
                          : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {data && data.date === date && (
          <>
            {activeQuestions.length === 0 && !hasAnswers ? (
              <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
                <p className="text-sm text-[var(--text-muted)]">
                  No active questions. Add some in{" "}
                  <a href="/admin?tab=Journal%20Questions" className="text-[var(--accent)] underline">
                    Setup → Journal Questions
                  </a>
                  .
                </p>
              </section>
            ) : queue && currentQuestion ? (
              /* Interview — one question at a time */
              <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="font-mono">
                      {step + 1} / {queue.length}
                    </span>
                    {currentQuestion.isRequired ? (
                      <span className="uppercase tracking-wide">Required</span>
                    ) : (
                      <span className="uppercase tracking-wide opacity-60">Optional</span>
                    )}
                  </div>
                  <div className="h-1 rounded-full bg-[var(--surface-alt)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-200"
                      style={{ width: `${((step + 1) / queue.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-heading font-bold text-xl tracking-tight text-[var(--text)]">
                    {currentQuestion.prompt}
                  </h3>
                  {currentQuestion.helpText && (
                    <p className="text-sm text-[var(--text-muted)] mt-1">{currentQuestion.helpText}</p>
                  )}
                </div>

                <AnswerInput
                  key={currentQuestion.id}
                  question={currentQuestion}
                  draft={draft}
                  setDraft={setDraft}
                  onSubmit={handleNext}
                  autoFocus
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => goToStep(step - 1)}
                    disabled={step === 0}
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors disabled:opacity-30"
                  >
                    ← Back
                  </button>
                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    {requiredDoneWithDraft && step < queue.length - 1 && (
                      <button onClick={handleDone} disabled={saving} className={cancelClass}>
                        Done for tonight
                      </button>
                    )}
                    {!currentQuestion.isRequired && isDraftEmpty(currentQuestion, draft) ? (
                      <button onClick={handleNext} className={cancelClass}>
                        Skip
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        disabled={saving || isDraftEmpty(currentQuestion, draft)}
                        className={`${submitClass} inline-flex items-center gap-2`}
                      >
                        {saving && <Spinner light />}
                        {step === queue.length - 1 ? "Finish" : "Next"}
                      </button>
                    )}
                  </div>
                </div>
                {currentQuestion.answerType === "text" && (
                  <p className="hidden sm:block text-[11px] text-[var(--text-muted)] opacity-60 -mt-2">
                    ⌘/Ctrl + Enter to continue
                  </p>
                )}
              </section>
            ) : !hasAnswers ? (
              /* Start screen — pick tonight's questions */
              <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 flex flex-col gap-5">
                <div>
                  <h3 className="font-heading font-bold text-lg tracking-tight text-[var(--text)]">
                    {date === today ? "Tonight's questions" : "Questions for this day"}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Tap to turn optional ones off. Required ones are the minimum entry.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {activeQuestions.map((q) => {
                    const on = q.isRequired || selected.has(q.id);
                    return (
                      <button
                        key={q.id}
                        disabled={q.isRequired}
                        onClick={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(q.id)) next.delete(q.id);
                            else next.add(q.id);
                            return next;
                          })
                        }
                        className={`text-left px-4 py-3 rounded-[14px] border text-sm flex items-start gap-3 transition-colors duration-200 ${
                          on
                            ? "border-[var(--accent)]/40 bg-[var(--accent)]/5 text-[var(--text)]"
                            : "border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)] opacity-60"
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 shrink-0 rounded-[5px] border flex items-center justify-center text-[10px] ${
                            on ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--border)]"
                          }`}
                        >
                          {on && "✓"}
                        </span>
                        <span className="flex-1">{q.prompt}</span>
                        {q.isRequired && (
                          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] shrink-0 mt-0.5">
                            Required
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      startInterview(activeQuestions.filter((q) => q.isRequired || selected.has(q.id)).map((q) => q.id))
                    }
                    className={submitClass}
                  >
                    Start
                  </button>
                  <button
                    onClick={() => startInterview(requiredQuestions.map((q) => q.id))}
                    className={cancelClass}
                  >
                    Minimum only
                  </button>
                </div>
              </section>
            ) : (
              /* Review / edit */
              <>
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        requiredDone
                          ? "bg-[var(--success)]/10 text-[var(--success)]"
                          : "bg-[var(--warm)]/10 text-[var(--warm)]"
                      }`}
                    >
                      {requiredDone ? "Complete" : "Partial"} · {answeredQuestions.length} answered
                    </span>
                    {unansweredQuestions.length > 0 && (
                      <button
                        onClick={() => startInterview(unansweredQuestions.map((q) => q.id))}
                        className={`${submitClass} py-1.5 px-4`}
                      >
                        Answer the rest ({unansweredQuestions.length})
                      </button>
                    )}
                  </div>

                  {answeredQuestions.map((q) => {
                    const a = answerMap.get(q.id)!;
                    return (
                      <article
                        key={q.id}
                        className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-medium text-[var(--text-muted)]">
                            {a.promptSnapshot}
                            {!q.isActive && <span className="ml-2 text-[10px] uppercase opacity-60">retired</span>}
                          </h3>
                          {editingId !== q.id && (
                            <button
                              onClick={() => openEdit(q)}
                              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] shrink-0"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        {editingId === q.id ? (
                          renderEditor(q)
                        ) : q.answerType === "scale" ? (
                          <p className="mt-2 font-mono text-2xl text-[var(--text)]">
                            {a.numericValue}
                            <span className="text-sm text-[var(--text-muted)]"> / 5</span>
                          </p>
                        ) : (
                          <p className="mt-2 text-[var(--text)] leading-relaxed whitespace-pre-wrap">{a.textValue}</p>
                        )}
                      </article>
                    );
                  })}
                </section>

                {unansweredQuestions.length > 0 && (
                  <details className="group bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-5">
                    <summary className="cursor-pointer text-sm font-medium text-[var(--text-muted)] list-none flex items-center justify-between">
                      Not answered ({unansweredQuestions.length})
                      <span className="transition-transform duration-200 group-open:rotate-90">›</span>
                    </summary>
                    <div className="flex flex-col divide-y divide-[var(--border)] mt-3">
                      {unansweredQuestions.map((q) => (
                        <div key={q.id} className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm text-[var(--text)]">{q.prompt}</span>
                            {editingId !== q.id && (
                              <button
                                onClick={() => openEdit(q)}
                                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] shrink-0"
                              >
                                Answer
                              </button>
                            )}
                          </div>
                          {editingId === q.id && renderEditor(q)}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}

            {/* Context: what else was logged that day */}
            {!queue && hasContext && ctx && (
              <details className="group bg-[var(--surface-alt)] rounded-[20px] border border-[var(--border)] p-5">
                <summary className="cursor-pointer text-sm font-medium text-[var(--text-muted)] list-none flex items-center justify-between">
                  Also logged this day
                  <span className="transition-transform duration-200 group-open:rotate-90">›</span>
                </summary>
                <div className="flex flex-col gap-4 mt-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {ctx.gymSets > 0 && <span className={pillClass}>{ctx.gymSets} gym sets</span>}
                    {ctx.padelSets > 0 && <span className={pillClass}>{ctx.padelSets} padel sets</span>}
                    {ctx.trips > 0 && <span className={pillClass}>{ctx.trips} e-bike trips</span>}
                    {ctx.expenses.count > 0 && (
                      <span className={pillClass}>
                        ₱{ctx.expenses.total.toLocaleString("en-PH", { maximumFractionDigits: 0 })} spent
                      </span>
                    )}
                  </div>
                  {ctx.thoughts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                        Thoughts
                      </p>
                      <ul className="flex flex-col gap-2">
                        {ctx.thoughts.map((t) => (
                          <li key={t.id} className="text-[var(--text)] whitespace-pre-wrap">
                            {t.type && <span className="text-xs text-[var(--text-muted)] mr-1.5">[{t.type}]</span>}
                            {t.thought}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ctx.interactions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                        People
                      </p>
                      <ul className="flex flex-col gap-1">
                        {ctx.interactions.map((i) => (
                          <li key={i.id} className="text-[var(--text)]">
                            <span className="font-medium">{i.personNickname || i.personName || "Unknown"}</span>
                            {i.note && <span className="text-[var(--text-muted)]"> — {i.note}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            )}
          </>
        )}

        {/* Export for LLM analysis */}
        {!queue && (
          <section className="border-t border-[var(--border)] pt-6 flex flex-col gap-3">
            <div>
              <h3 className="font-heading font-bold text-sm text-[var(--text)]">Export</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Markdown of journal answers, thoughts and interactions — ready to paste into an LLM.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={exportFrom}
                max={exportTo}
                onChange={(e) => setExportFrom(e.target.value)}
                className={`${inputClass} w-auto`}
              />
              <span className="text-xs text-[var(--text-muted)]">to</span>
              <input
                type="date"
                value={exportTo}
                min={exportFrom}
                max={today}
                onChange={(e) => setExportTo(e.target.value)}
                className={`${inputClass} w-auto`}
              />
              <a
                href={`/api/admin/journal/export?${new URLSearchParams({ from: exportFrom, to: exportTo })}`}
                className={cancelClass}
              >
                Download .md
              </a>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
