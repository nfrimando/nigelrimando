"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Habit, HabitEntry } from "@/lib/schema";

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? "border-white" : "border-[var(--accent)]"}`}
    />
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 w-full max-w-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading font-bold text-base text-[var(--text)] mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const submitClass =
  "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium py-2 px-5 rounded-[14px] transition-colors duration-200 disabled:opacity-50";
const cancelClass =
  "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-medium py-2 px-5 rounded-[14px] transition-colors duration-200";

const PAGE_SIZE = 200;

function adjustScale(val: string, delta: number): string {
  const current = parseFloat(val) || 0;
  const adjusted = Math.min(1, Math.max(0, current + delta));
  return (Math.round(adjusted * 10) / 10).toFixed(1);
}

function formatDate(dateStr: string): { long: string; day: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    long: date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    day: date.toLocaleDateString("en-US", { weekday: "long" }),
  };
}

type EntryRow = HabitEntry & { habitLabel: string; habitKey: string };
type FormState = { date: string; habitId: string; numericValue: string; textValue: string };
type LogForm = { numericValue: string; textValue: string };

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const defaultForm: FormState = { date: today, habitId: "", numericValue: "", textValue: "" };
const defaultLogForm: LogForm = { numericValue: "", textValue: "" };

export default function HabitEntriesSection() {
  const [data, setData] = useState<EntryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");

  const [habits, setHabits] = useState<Habit[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(defaultForm);
  const [editError, setEditError] = useState("");
  const [saveError, setSaveError] = useState("");

  // Log Habits wizard
  const [showLogModal, setShowLogModal] = useState(false);
  const [logDate, setLogDate] = useState(today);
  const [logStep, setLogStep] = useState(0);
  const [logValues, setLogValues] = useState<Record<number, LogForm>>({});
  const [currentLogForm, setCurrentLogForm] = useState<LogForm>(defaultLogForm);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState("");

  async function fetchHabits() {
    const res = await fetch("/api/admin/habits");
    if (res.ok) setHabits(await res.json());
  }

  async function fetchPage(p: number, q: string) {
    setFetching(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/habit-entries?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? []);
        setTotal(json.total ?? 0);
        setPage(json.page ?? p);
        setTotalPages(json.totalPages || 1);
      }
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    fetchHabits();
    fetchPage(1, "");
  }, []);

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function commitSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length === 0 || trimmed.length >= 3) {
      fetchPage(1, trimmed);
    }
  }

  function goToPage(p: number) {
    fetchPage(p, search.trim());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/habit-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm(defaultForm);
        setShowAddModal(false);
        fetchPage(page, search.trim());
      } else {
        const json = await res.json();
        setAddError(json.error || "Failed to add entry.");
      }
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(row: EntryRow) {
    setEditingId(row.id);
    setEditForm({
      date: row.date,
      habitId: String(row.habitId),
      numericValue: row.numericValue != null ? String(row.numericValue) : "",
      textValue: row.textValue ?? "",
    });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    const id = editingId;
    const originalRow = data.find((r) => r.id === id)!;
    const matchedHabit = habits.find((h) => h.id === Number(editForm.habitId));
    const optimistic: EntryRow = {
      ...originalRow,
      date: editForm.date,
      habitId: Number(editForm.habitId),
      numericValue: editForm.numericValue !== "" ? Number(editForm.numericValue) : null,
      textValue: editForm.textValue || null,
      habitLabel: matchedHabit?.label ?? originalRow.habitLabel,
      habitKey: matchedHabit?.key ?? originalRow.habitKey,
    };

    setData((prev) => prev.map((r) => (r.id === id ? optimistic : r)));
    setEditingId(null);

    const res = await fetch(`/api/admin/habit-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      fetchPage(page, search.trim());
    } else {
      const json = await res.json();
      setData((prev) => prev.map((r) => (r.id === id ? originalRow : r)));
      setEditingId(id);
      setEditError(json.error || "Failed to update entry.");
      setSaveError("Failed to save. Changes reverted.");
      setTimeout(() => setSaveError(""), 3000);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this habit entry? This cannot be undone.")) return;
    await fetch(`/api/admin/habit-entries/${id}`, { method: "DELETE" });
    fetchPage(page, search.trim());
  }

  const dateGroups = useMemo<[string, EntryRow[]][]>(() => {
    const map = new Map<string, EntryRow[]>();
    for (const row of data) {
      if (!map.has(row.date)) map.set(row.date, []);
      map.get(row.date)!.push(row);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  // Log Habits wizard helpers
  const activeHabits = habits.filter((h) => h.isActive);
  const currentHabit = activeHabits[logStep];
  const isLastStep = logStep === activeHabits.length - 1;

  function openLogModal() {
    setLogDate(today);
    setLogStep(0);
    setLogValues({});
    setCurrentLogForm(defaultLogForm);
    setLogError("");
    setShowLogModal(true);
  }

  function logPrev() {
    const newValues = { ...logValues };
    if (currentLogForm.numericValue !== "" || currentLogForm.textValue !== "") {
      newValues[currentHabit.id] = currentLogForm;
    }
    const prevHabit = activeHabits[logStep - 1];
    setLogValues(newValues);
    setCurrentLogForm(newValues[prevHabit.id] ?? defaultLogForm);
    setLogStep((s) => s - 1);
  }

  function advanceStep(includeCurrentValue: boolean) {
    const newValues = { ...logValues };
    if (includeCurrentValue && (currentLogForm.numericValue !== "" || currentLogForm.textValue !== "")) {
      newValues[currentHabit.id] = currentLogForm;
    } else if (!includeCurrentValue) {
      delete newValues[currentHabit.id];
    }

    if (isLastStep) {
      submitLog(newValues);
    } else {
      const nextHabit = activeHabits[logStep + 1];
      setLogValues(newValues);
      setCurrentLogForm(newValues[nextHabit.id] ?? defaultLogForm);
      setLogStep((s) => s + 1);
    }
  }

  const advanceStepRef = useRef(advanceStep);
  advanceStepRef.current = advanceStep;

  const countInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showLogModal || !currentHabit) return;
    if (currentHabit.valueType === "count") {
      countInputRef.current?.focus();
    } else if (currentHabit.valueType === "scaled") {
      setCurrentLogForm((f) => (f.numericValue === "" ? { ...f, numericValue: "0" } : f));
    }
  }, [logStep, showLogModal, currentHabit?.valueType]);

  useEffect(() => {
    if (!showLogModal || !currentHabit) return;
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT";
      if (logLoading) return;
      if (e.key === "Enter") {
        e.preventDefault();
        advanceStepRef.current(true);
      } else if (!isInput) {
        if (currentHabit.valueType === "binary") {
          if (e.key === "1") {
            e.preventDefault();
            setCurrentLogForm((f) => ({ ...f, numericValue: "1" }));
          } else if (e.key === "2") {
            e.preventDefault();
            setCurrentLogForm((f) => ({ ...f, numericValue: "0" }));
          }
        } else if (currentHabit.valueType === "scaled") {
          if (e.key === "0") {
            e.preventDefault();
            setCurrentLogForm((f) => ({ ...f, numericValue: "0" }));
          } else if (e.key === "1") {
            e.preventDefault();
            setCurrentLogForm((f) => ({ ...f, numericValue: "1" }));
          } else if (e.key === "2") {
            e.preventDefault();
            setCurrentLogForm((f) => ({ ...f, numericValue: "0.5" }));
          } else if (e.key === "-") {
            e.preventDefault();
            setCurrentLogForm((f) => ({ ...f, numericValue: adjustScale(f.numericValue, -0.1) }));
          } else if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            setCurrentLogForm((f) => ({ ...f, numericValue: adjustScale(f.numericValue, 0.1) }));
          }
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLogModal, currentHabit, logLoading]);

  async function submitLog(finalValues: Record<number, LogForm>) {
    const entries = Object.entries(finalValues).map(([habitId, vals]) => ({
      date: logDate,
      habitId,
      numericValue: vals.numericValue,
      textValue: vals.textValue,
    }));

    if (entries.length === 0) {
      setShowLogModal(false);
      return;
    }

    setLogLoading(true);
    setLogError("");
    try {
      const results = await Promise.all(
        entries.map((entry) =>
          fetch("/api/admin/habit-entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        setLogError(`${failed.length} entr${failed.length === 1 ? "y" : "ies"} failed to save.`);
      } else {
        setShowLogModal(false);
        fetchPage(page, search.trim());
      }
    } catch {
      setLogError("Failed to save entries. Please try again.");
    } finally {
      setLogLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        {saveError && <p className="text-sm text-red-500 mb-3">{saveError}</p>}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Habit Entries · {dateGroups.length} {dateGroups.length === 1 ? "day" : "days"}
            <span className="text-[var(--text-muted)] font-normal text-sm">({total} entries)</span>
            {fetching && <Spinner />}
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onBlur={(e) => commitSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitSearch(search); }}
              placeholder="Search…"
              className={`${inputClass} max-w-[180px]`}
            />
            <button
              onClick={openLogModal}
              disabled={activeHabits.length === 0}
              className={`${cancelClass} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Log Habits
            </button>
            <button
              onClick={() => { setForm(defaultForm); setAddError(""); setShowAddModal(true); }}
              className={submitClass}
            >
              + Add entry
            </button>
          </div>
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No habit entries found.</p>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {dateGroups.map(([date, entries]) => {
                const { long: longDate, day: dayOfWeek } = formatDate(date);
                const entryByHabitId = new Map(entries.map((e) => [e.habitId, e]));
                // Inactive habits that have entries for this date (show logged, no gap pill)
                const inactiveEntries = entries.filter((e) => !activeHabits.find((h) => h.id === e.habitId));
                return (
                  <div key={date} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="font-mono text-xs text-[var(--text-muted)]">{date}</span>
                      <span className="text-sm font-semibold text-[var(--text)]">{longDate}</span>
                      <span className="text-xs text-[var(--text-muted)]">{dayOfWeek}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {(["binary", "scaled", "count"] as const)
                        .map((vt) => ({ type: vt, habits: activeHabits.filter((h) => h.valueType === vt) }))
                        .filter((g) => g.habits.length > 0)
                        .map((group) => (
                          <div key={group.type}>
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                              {group.type}
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {group.habits.map((habit) => {
                                const entry = entryByHabitId.get(habit.id);
                                if (entry) {
                                  const v = entry.numericValue ?? 0;
                                  let bgClass: string;
                                  let label: string;

                                  if (habit.valueType === "binary") {
                                    bgClass = v === 1
                                      ? "bg-[var(--success)] text-white hover:opacity-80"
                                      : "bg-[var(--warm)] text-white hover:opacity-80";
                                    label = v === 1 ? `✓ ${habit.label}` : `✗ ${habit.label}`;
                                  } else if (habit.valueType === "scaled") {
                                    bgClass = v === 0
                                      ? "bg-[var(--warm)] text-white hover:opacity-80"
                                      : v >= 1
                                      ? "bg-[var(--success)] text-white hover:opacity-80"
                                      : "bg-amber-500 text-white hover:opacity-80";
                                    label = `${habit.label} · ${v}`;
                                  } else {
                                    bgClass = v > 0
                                      ? "bg-[var(--accent)] text-white hover:opacity-80"
                                      : "bg-[var(--surface-alt)] text-[var(--text-muted)] border border-[var(--border)] hover:opacity-80";
                                    label = v > 0 ? `${habit.label} ×${v}` : `${habit.label} · 0`;
                                  }

                                  return (
                                    <button
                                      key={habit.id}
                                      onClick={() => startEdit(entry)}
                                      title={entry.textValue ? `Notes: ${entry.textValue}` : undefined}
                                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${bgClass}`}
                                    >
                                      {label}
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    key={habit.id}
                                    onClick={() => {
                                      setForm({ date, habitId: String(habit.id), numericValue: "", textValue: "" });
                                      setAddError("");
                                      setShowAddModal(true);
                                    }}
                                    className="px-3 py-1 rounded-full text-xs font-medium border border-dashed border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                                  >
                                    {habit.label} —
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      {inactiveEntries.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {inactiveEntries.map((entry) => (
                            <button
                              key={entry.id}
                              onClick={() => startEdit(entry)}
                              title={`${entry.habitLabel}${entry.textValue ? ` · ${entry.textValue}` : ""}`}
                              className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface-alt)] text-[var(--text-muted)] border border-[var(--border)] hover:opacity-80 transition-colors"
                            >
                              {entry.habitLabel} · {entry.numericValue ?? "—"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border)]">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed">
                  ← Prev
                </button>
                <span className="text-sm text-[var(--text-muted)]">Page {page} of {totalPages}</span>
                <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {showAddModal && (
        <Modal title="Add habit entry" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Habit">
                <select
                  value={form.habitId}
                  onChange={(e) => setForm({ ...form, habitId: e.target.value })}
                  required
                  className={inputClass}
                >
                  <option value="">— select —</option>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>{h.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Numeric Value (optional)">
                <input
                  type="number"
                  step="any"
                  value={form.numericValue}
                  onChange={(e) => setForm({ ...form, numericValue: e.target.value })}
                  placeholder="e.g. 0.5"
                  className={inputClass}
                />
              </Field>
              <Field label="Text Value (optional)">
                <input
                  type="text"
                  value={form.textValue}
                  onChange={(e) => setForm({ ...form, textValue: e.target.value })}
                  placeholder="Notes…"
                  className={inputClass}
                />
              </Field>
            </div>
            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={addLoading} className={`${submitClass} inline-flex items-center gap-2`}>
                {addLoading && <Spinner light />}
                {addLoading ? "Adding…" : "Add entry"}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showLogModal && currentHabit && (
        <Modal title="Log Habits" onClose={() => setShowLogModal(false)}>
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className={`${inputClass} w-auto`}
              />
              <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">
                {logStep + 1} / {activeHabits.length}
              </span>
            </div>

            <div className="w-full bg-[var(--surface-alt)] rounded-full h-1">
              <div
                className="bg-[var(--accent)] h-1 rounded-full transition-all duration-200"
                style={{ width: `${((logStep + 1) / activeHabits.length) * 100}%` }}
              />
            </div>

            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{currentHabit.category}</p>
              <h4 className="font-heading font-bold text-base text-[var(--text)]">{currentHabit.label}</h4>
              {currentHabit.description && (
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{currentHabit.description}</p>
              )}
            </div>

            <Field label={currentHabit.valueType === "binary" ? "Did you do it?" : "Value"}>
              {currentHabit.valueType === "binary" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentLogForm((f) => ({ ...f, numericValue: f.numericValue === "1" ? "" : "1" }))}
                    className={`px-4 py-2 rounded-[14px] text-sm font-medium border transition-colors ${
                      currentLogForm.numericValue === "1"
                        ? "bg-[var(--success)] text-white border-transparent"
                        : "bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]"
                    }`}
                  >
                    ✓ Done <span className="opacity-50 text-xs">[1]</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentLogForm((f) => ({ ...f, numericValue: f.numericValue === "0" ? "" : "0" }))}
                    className={`px-4 py-2 rounded-[14px] text-sm font-medium border transition-colors ${
                      currentLogForm.numericValue === "0"
                        ? "bg-[var(--warm)] text-white border-transparent"
                        : "bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]"
                    }`}
                  >
                    ✗ Not done <span className="opacity-50 text-xs">[2]</span>
                  </button>
                </div>
              ) : currentHabit.valueType === "scaled" ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentLogForm((f) => ({ ...f, numericValue: adjustScale(f.numericValue, -0.1) }))}
                      className="w-10 h-10 flex items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] text-lg font-mono transition-colors shrink-0"
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={currentLogForm.numericValue}
                      onChange={(e) => setCurrentLogForm((f) => ({ ...f, numericValue: e.target.value }))}
                      className={`${inputClass} text-center font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setCurrentLogForm((f) => ({ ...f, numericValue: adjustScale(f.numericValue, 0.1) }))}
                      className="w-10 h-10 flex items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] text-lg font-mono transition-colors shrink-0"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    0 → 0 &nbsp;·&nbsp; 1 → 1 &nbsp;·&nbsp; 2 → 0.5 &nbsp;·&nbsp; −/+ adjust by 0.1
                  </p>
                </div>
              ) : (
                <input
                  ref={countInputRef}
                  type="number"
                  step="1"
                  min="0"
                  value={currentLogForm.numericValue}
                  onChange={(e) => setCurrentLogForm((f) => ({ ...f, numericValue: e.target.value }))}
                  placeholder="e.g. 3"
                  className={inputClass}
                />
              )}
            </Field>

            <Field label="Notes (optional)">
              <input
                type="text"
                value={currentLogForm.textValue}
                onChange={(e) => setCurrentLogForm((f) => ({ ...f, textValue: e.target.value }))}
                placeholder="Any notes…"
                className={inputClass}
              />
            </Field>

            {logError && <p className="text-sm text-red-500">{logError}</p>}

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={logPrev}
                disabled={logStep === 0}
                className={`${cancelClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                ← Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => advanceStep(false)}
                  disabled={logLoading}
                  className={cancelClass}
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => advanceStep(true)}
                  disabled={logLoading}
                  className={`${submitClass} inline-flex items-center gap-2`}
                >
                  {logLoading && <Spinner light />}
                  {isLastStep ? "Finish" : "Next →"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {editingId !== null && (
        <Modal title="Edit habit entry" onClose={() => setEditingId(null)}>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Habit">
                <select
                  value={editForm.habitId}
                  onChange={(e) => setEditForm({ ...editForm, habitId: e.target.value })}
                  required
                  className={inputClass}
                >
                  <option value="">— select —</option>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>{h.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Numeric Value (optional)">
                <input
                  type="number"
                  step="any"
                  value={editForm.numericValue}
                  onChange={(e) => setEditForm({ ...editForm, numericValue: e.target.value })}
                  placeholder="e.g. 0.5"
                  className={inputClass}
                />
              </Field>
              <Field label="Text Value (optional)">
                <input
                  type="text"
                  value={editForm.textValue}
                  onChange={(e) => setEditForm({ ...editForm, textValue: e.target.value })}
                  placeholder="Notes…"
                  className={inputClass}
                />
              </Field>
            </div>
            {editError && <p className="text-sm text-red-500">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" className={submitClass}>Save changes</button>
              <button type="button" onClick={() => setEditingId(null)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
