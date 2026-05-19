"use client";

import { useEffect, useState } from "react";
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

const PAGE_SIZE = 25;

type EntryRow = HabitEntry & { habitLabel: string; habitKey: string };
type FormState = { date: string; habitId: string; numericValue: string; textValue: string };

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const defaultForm: FormState = { date: today, habitId: "", numericValue: "", textValue: "" };

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

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        {saveError && <p className="text-sm text-red-500 mb-3">{saveError}</p>}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Habit Entries ({total})
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Habit</th>
                    <th className="pb-2 pr-4 font-medium">Value</th>
                    <th className="pb-2 pr-4 font-medium">Notes</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--border)] last:border-0 align-top cursor-pointer hover:bg-[var(--surface-alt)] transition-colors"
                      onClick={() => startEdit(row)}
                    >
                      <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap font-mono text-xs">{row.date}</td>
                      <td className="py-2 pr-4 text-[var(--text)]">{row.habitLabel}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{row.numericValue ?? "—"}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)] max-w-xs truncate">{row.textValue ?? "—"}</td>
                      <td className="py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(row)} className="text-xs text-[var(--accent)] hover:underline">Edit</button>
                          <button onClick={() => handleDelete(row.id)} className="text-xs text-[var(--warm)] hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-4 mt-4">
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
