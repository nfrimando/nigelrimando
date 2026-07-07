"use client";

import { useEffect, useRef, useState } from "react";
import type { Person } from "@/lib/schema";

type InteractionRow = {
  id: number;
  entryDate: string;
  personId: number | null;
  personName: string | null;
  personNickname: string | null;
  rank: number | null;
  note: string | null;
  sentiment: number | null;
  createdAt: number;
  updatedAt: number;
};

type FormState = {
  entryDate: string;
  personId: string;
  rank: string;
  note: string;
  sentiment: string;
};

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? "border-white" : "border-[var(--accent)]"}`}
    />
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30" onClick={onClose}>
      <div
        className={`bg-[var(--surface)] rounded-[20px] border border-[var(--border)] w-full shadow-lg flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] ${wide ? "max-w-4xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading font-bold text-base text-[var(--text)] px-6 pt-6 pb-4 shrink-0">{title}</h3>
        <div className="overflow-y-auto px-6 pb-6 flex flex-col gap-3">{children}</div>
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

const WINDOW_DAYS = 30;
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const defaultForm: FormState = { entryDate: today, personId: "", rank: "", note: "", sentiment: "" };

// Shift a YYYY-MM-DD string by n days, parsing/formatting as a LOCAL date to avoid UTC drift.
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDateLabel(dateStr: string): { weekday: string; monthDay: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(dt),
    monthDay: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(dt),
  };
}

// Sentiment → name color. 2 green, 1 light green, -1 light red, -2 red (bucketed).
function sentimentClasses(s: number | null): string {
  if (s == null || s === 0) return "text-[var(--text)]";
  if (s >= 2) return "text-[var(--success)] font-semibold";
  if (s === 1) return "text-[var(--success)] opacity-70";
  if (s === -1) return "text-[var(--warm)] opacity-70";
  return "text-[var(--warm)] font-semibold"; // <= -2
}

function personDisplay(row: InteractionRow) {
  if (!row.personName) return "—";
  return row.personNickname ? `${row.personName} (${row.personNickname})` : row.personName;
}

// Compact label for a per-date chip: the person's name, or the note for personless entries.
function chipLabel(row: InteractionRow): string {
  if (row.personName) return row.personName;
  if (row.note) return row.note;
  return "—";
}

function personLabel(p: Person) {
  return p.nickname ? `${p.name} (${p.nickname})` : p.name;
}

function PersonCombobox({
  persons,
  value,
  onChange,
}: {
  persons: Person[];
  value: string;
  onChange: (personId: string) => void;
}) {
  const selected = persons.find((p) => String(p.id) === value) ?? null;
  const [query, setQuery] = useState(selected ? personLabel(selected) : "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = persons.find((p) => String(p.id) === value) ?? null;
    setQuery(p ? personLabel(p) : "");
  }, [value, persons]);

  const filtered = query.trim()
    ? persons.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.nickname ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : [];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    setActiveIndex(-1);
    if (!e.target.value.trim()) onChange("");
  }

  function handleSelect(p: Person) {
    onChange(String(p.id));
    setQuery(personLabel(p));
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min(i + 1, filtered.length - 1);
        scrollItemIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.max(i - 1, 0);
        scrollItemIntoView(next);
        return next;
      });
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function scrollItemIntoView(index: number) {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false);
      setActiveIndex(-1);
      const p = persons.find((p) => String(p.id) === value) ?? null;
      setQuery(p ? personLabel(p) : "");
    }, 120);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => { if (query.trim()) setOpen(true); }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Search person…"
        autoComplete="off"
        className={inputClass}
      />
      {open && filtered.length > 0 && (
        <div ref={listRef} className="absolute z-20 top-full mt-1 w-full bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => handleSelect(p)}
              className={`w-full text-left px-3 py-2 text-sm text-[var(--text)] first:rounded-t-[14px] last:rounded-b-[14px] ${i === activeIndex ? "bg-[var(--surface-alt)]" : "hover:bg-[var(--surface-alt)]"}`}
            >
              {personLabel(p)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InteractionsSection() {
  const [data, setData] = useState<InteractionRow[]>([]);
  const [fromDate, setFromDate] = useState(() => addDays(today, -WINDOW_DAYS));
  const [earliestDate, setEarliestDate] = useState<string | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [rows, setRows] = useState<FormState[]>([defaultForm]);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(defaultForm);
  const [editError, setEditError] = useState("");
  const [saveError, setSaveError] = useState("");

  async function fetchRange(from: string, to: string) {
    setFetching(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/admin/interactions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? []);
        setEarliestDate(json.earliestDate ?? null);
      }
    } finally {
      setFetching(false);
    }
  }

  async function fetchPersons() {
    const res = await fetch("/api/admin/persons");
    if (res.ok) setPersons(await res.json());
  }

  useEffect(() => {
    fetchRange(addDays(today, -WINDOW_DAYS), today);
    fetchPersons();
  }, []);

  function loadOlder() {
    const next = addDays(fromDate, -WINDOW_DAYS);
    setFromDate(next);
    fetchRange(next, today);
  }

  function openAddForDate(date: string) {
    setRows([{ ...defaultForm, entryDate: date }]);
    setAddError("");
    setShowAddModal(true);
  }

  function updateRow(index: number, patch: Partial<FormState>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...defaultForm }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interactions: rows }),
      });
      if (res.ok) {
        setRows([{ ...defaultForm }]);
        setShowAddModal(false);
        fetchRange(fromDate, today);
      } else {
        const json = await res.json();
        setAddError(json.error || "Failed to add interactions.");
      }
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(row: InteractionRow) {
    setEditingId(row.id);
    setEditForm({
      entryDate: row.entryDate,
      personId: row.personId != null ? String(row.personId) : "",
      rank: row.rank != null ? String(row.rank) : "",
      note: row.note ?? "",
      sentiment: row.sentiment != null ? String(row.sentiment) : "",
    });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    const id = editingId;
    const originalRow = data.find((r) => r.id === id)!;
    const person = persons.find((p) => String(p.id) === editForm.personId);
    const optimistic: InteractionRow = {
      ...originalRow,
      entryDate: editForm.entryDate,
      personId: editForm.personId ? Number(editForm.personId) : null,
      personName: person?.name ?? null,
      personNickname: person?.nickname ?? null,
      rank: editForm.rank ? Number(editForm.rank) : null,
      note: editForm.note || null,
      sentiment: editForm.sentiment ? Number(editForm.sentiment) : null,
    };

    setData((prev) => prev.map((r) => (r.id === id ? optimistic : r)));
    setEditingId(null);

    const res = await fetch(`/api/admin/interactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (!res.ok) {
      const json = await res.json();
      setData((prev) => prev.map((r) => (r.id === id ? originalRow : r)));
      setEditingId(id);
      setEditError(json.error || "Failed to update interaction.");
      setSaveError("Failed to save. Changes reverted.");
      setTimeout(() => setSaveError(""), 3000);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this interaction? This cannot be undone.")) return;
    await fetch(`/api/admin/interactions/${id}`, { method: "DELETE" });
    setEditingId(null);
    fetchRange(fromDate, today);
  }

  const yesterday = addDays(today, -1);
  const q = search.trim().toLowerCase();
  const filtering = q.length > 0;

  const personsById = new Map(persons.map((p) => [p.id, p]));

  // Group the loaded window into { date -> interactions }, applying the client-side filter.
  const byDate = new Map<string, InteractionRow[]>();
  for (const row of data) {
    if (
      filtering &&
      !(
        (row.personName ?? "").toLowerCase().includes(q) ||
        (row.personNickname ?? "").toLowerCase().includes(q) ||
        (row.note ?? "").toLowerCase().includes(q)
      )
    ) {
      continue;
    }
    const arr = byDate.get(row.entryDate) ?? [];
    arr.push(row);
    byDate.set(row.entryDate, arr);
  }
  // Within a day, order by rank ascending (rank #1 leftmost); unranked fall last, newest first.
  for (const arr of byDate.values()) {
    arr.sort((a, b) => {
      const ra = a.rank ?? Number.POSITIVE_INFINITY;
      const rb = b.rank ?? Number.POSITIVE_INFINITY;
      if (ra !== rb) return ra - rb;
      return b.createdAt - a.createdAt;
    });
  }

  // Every date in the window, newest first — empty days included so gaps stay visible.
  const allDates: string[] = [];
  for (let d = today; d >= fromDate; d = addDays(d, -1)) {
    allDates.push(d);
  }
  const visibleDates = filtering ? allDates.filter((d) => (byDate.get(d)?.length ?? 0) > 0) : allDates;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        {saveError && <p className="text-sm text-red-500 mb-3">{saveError}</p>}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Interactions ({data.length})
            {fetching && <Spinner />}
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter people…"
              className={`${inputClass} max-w-[180px]`}
            />
            <button onClick={() => openAddForDate(today)} className={submitClass}>
              + Add interaction
            </button>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-[var(--border)]">
          {visibleDates.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-2">No interactions match “{search.trim()}”.</p>
          ) : (
            visibleDates.map((date) => {
              const dayRows = byDate.get(date) ?? [];
              const { weekday, monthDay } = formatDateLabel(date);
              const isToday = date === today;
              const isYesterday = date === yesterday;
              return (
                <div key={date} className="group flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-4 py-3">
                  <div className="sm:w-36 shrink-0 flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {weekday} · {monthDay}
                    </span>
                    {isToday && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-[var(--accent)]">Today</span>
                    )}
                    {isYesterday && (
                      <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Yest</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-y-1.5">
                    {dayRows.length === 0 ? (
                      <button
                        onClick={() => openAddForDate(date)}
                        className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                      >
                        <span className="opacity-40">—</span>
                        <span className="font-medium">+ Add interaction</span>
                      </button>
                    ) : (
                      <>
                        {dayRows.map((row, idx) => {
                          const person = row.personId != null ? personsById.get(row.personId) : undefined;
                          return (
                            <span key={row.id} className="inline-flex items-center">
                              <button
                                onClick={() => startEdit(row)}
                                title={personDisplay(row)}
                                className="inline-flex items-center gap-1.5 rounded-full -mx-0.5 px-1 py-0.5 hover:bg-[var(--surface-alt)] transition-colors"
                              >
                                {person?.imageUrl && (
                                  <img
                                    src={person.imageUrl}
                                    alt={person.name}
                                    className="w-5 h-5 rounded-full object-cover shrink-0"
                                  />
                                )}
                                <span
                                  className={`text-sm ${row.personName ? sentimentClasses(row.sentiment) : "italic text-[var(--text-muted)]"}`}
                                >
                                  {chipLabel(row)}
                                </span>
                              </button>
                              {idx < dayRows.length - 1 && <span className="text-[var(--text-muted)] mr-1.5">,</span>}
                            </span>
                          );
                        })}
                        <button
                          onClick={() => openAddForDate(date)}
                          aria-label="Add interaction"
                          className="ml-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] text-base leading-none transition-colors"
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!filtering && (!earliestDate || fromDate > earliestDate) && (
          <div className="mt-4">
            <button
              onClick={loadOlder}
              disabled={fetching}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {fetching && <Spinner />}
              Load older
            </button>
          </div>
        )}
      </section>

      {showAddModal && (
        <Modal title="Add interactions" onClose={() => setShowAddModal(false)} wide>
          <form
            onSubmit={handleAdd}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                addRow();
              }
            }}
            className="flex flex-col gap-3"
          >
            {/* Desktop column headers */}
            <div className="hidden sm:grid grid-cols-[120px_1fr_70px_80px_1fr_28px] gap-x-2 gap-y-1 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide pb-1 border-b border-[var(--border)]">
              <span>Date</span>
              <span>Person</span>
              <span>Rank</span>
              <span>Sentiment</span>
              <span>Note</span>
              <span />
            </div>

            {rows.map((row, i) => (
              <div key={i}>
                {/* Mobile: stacked card */}
                <div className="sm:hidden flex flex-col gap-3 p-3 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Entry {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                      className="text-[var(--text-muted)] hover:text-[var(--warm)] disabled:opacity-0 text-base leading-none"
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </div>
                  <Field label="Date">
                    <input type="date" value={row.entryDate} onChange={(e) => updateRow(i, { entryDate: e.target.value })} required className={inputClass} />
                  </Field>
                  <Field label="Person">
                    <PersonCombobox persons={persons} value={row.personId} onChange={(v) => updateRow(i, { personId: v })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Rank">
                      <input type="number" value={row.rank} onChange={(e) => updateRow(i, { rank: e.target.value })} placeholder="—" className={inputClass} />
                    </Field>
                    <Field label="Sentiment">
                      <input type="number" value={row.sentiment} onChange={(e) => updateRow(i, { sentiment: e.target.value })} placeholder="—" min={-5} max={5} className={inputClass} />
                    </Field>
                  </div>
                  <Field label="Note">
                    <input type="text" value={row.note} onChange={(e) => updateRow(i, { note: e.target.value })} placeholder="Note…" className={inputClass} />
                  </Field>
                </div>

                {/* Desktop: grid row */}
                <div className="hidden sm:grid grid-cols-[120px_1fr_70px_80px_1fr_28px] gap-x-2 items-center">
                  <input
                    type="date"
                    value={row.entryDate}
                    onChange={(e) => updateRow(i, { entryDate: e.target.value })}
                    required
                    className={inputClass}
                  />
                  <PersonCombobox
                    persons={persons}
                    value={row.personId}
                    onChange={(v) => updateRow(i, { personId: v })}
                  />
                  <input
                    type="number"
                    value={row.rank}
                    onChange={(e) => updateRow(i, { rank: e.target.value })}
                    placeholder="—"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={row.sentiment}
                    onChange={(e) => updateRow(i, { sentiment: e.target.value })}
                    placeholder="—"
                    min={-5}
                    max={5}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={row.note}
                    onChange={(e) => updateRow(i, { note: e.target.value })}
                    placeholder="Note…"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    className="text-[var(--text-muted)] hover:text-[var(--warm)] disabled:opacity-0 text-sm leading-none"
                    aria-label="Remove row"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="self-start text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium mt-1"
            >
              + Add another <span className="text-[var(--text-muted)] font-normal">⇧↵</span>
            </button>
            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
              <button type="submit" disabled={addLoading} className={`${submitClass} inline-flex items-center gap-2`}>
                {addLoading && <Spinner light />}
                {addLoading ? "Adding…" : `Add ${rows.length} interaction${rows.length !== 1 ? "s" : ""}`}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {editingId !== null && (
        <Modal title="Edit interaction" onClose={() => setEditingId(null)}>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date">
                <input
                  type="date"
                  value={editForm.entryDate}
                  onChange={(e) => setEditForm({ ...editForm, entryDate: e.target.value })}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Person (optional)">
                <PersonCombobox
                  persons={persons}
                  value={editForm.personId}
                  onChange={(v) => setEditForm({ ...editForm, personId: v })}
                />
              </Field>
              <Field label="Rank (optional)">
                <input
                  type="number"
                  value={editForm.rank}
                  onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}
                  placeholder="e.g. 1"
                  className={inputClass}
                />
              </Field>
              <Field label="Sentiment (optional)">
                <input
                  type="number"
                  value={editForm.sentiment}
                  onChange={(e) => setEditForm({ ...editForm, sentiment: e.target.value })}
                  placeholder="-5 to +5"
                  min={-5}
                  max={5}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Note (optional)">
              <textarea
                value={editForm.note}
                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </Field>
            {editError && <p className="text-sm text-red-500">{editError}</p>}
            <div className="flex items-center gap-3 pt-1">
              <button type="submit" className={submitClass}>Save changes</button>
              <button type="button" onClick={() => setEditingId(null)} className={cancelClass}>Cancel</button>
              <button
                type="button"
                onClick={() => { if (editingId != null) handleDelete(editingId); }}
                className="ml-auto text-sm text-[var(--warm)] hover:underline"
              >
                Delete
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
