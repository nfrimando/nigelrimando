"use client";

import { useEffect, useRef, useState } from "react";
import type { Exercise, Set as SetRow } from "@/lib/schema";

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? "border-white" : "border-[var(--accent)]"}`}
    />
  );
}

const MEASURES = ["kg", "lbs", "km", "reps", "seconds", "minutes"];
const PAGE_SIZE = 25;
const today = new Date().toISOString().split("T")[0];

const defaultForm = {
  date: today,
  block: "",
  week: "1",
  exerciseId: "",
  planned: "",
  actual: "",
  measure: "kg",
  value: "",
  notes: "",
};

export default function SetsSection() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fetching, setFetching] = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof defaultForm>>({});

  // Selection state
  const [selectedIds, setSelectedIds] = useState<globalThis.Set<number>>(new globalThis.Set());

  // Bulk edit modal
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkForm, setBulkForm] = useState({ block: "", week: "", date: "" });
  const [bulkLoading, setBulkLoading] = useState(false);

  // Copy modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyDate, setCopyDate] = useState(today);
  const [copyLoading, setCopyLoading] = useState(false);

  const exerciseMap = Object.fromEntries(exercises.map((e) => [e.id, e.name]));
  const anySelected = selectedIds.size > 0;

  async function fetchExercises() {
    const res = await fetch("/api/admin/exercises");
    if (res.ok) setExercises(await res.json());
  }

  async function fetchSets(p: number, q: string) {
    setFetching(true);
    const params = new URLSearchParams({
      page: String(p),
      limit: String(PAGE_SIZE),
      ...(q ? { q } : {}),
    });
    const res = await fetch(`/api/admin/sets?${params}`);
    if (res.ok) {
      const json = await res.json();
      setSets(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages || 1);
    }
    setFetching(false);
  }

  useEffect(() => {
    fetchExercises();
    fetchSets(1, "");
  }, []);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchSets(1, val);
    }, 300);
  }

  function goToPage(p: number) {
    setPage(p);
    fetchSets(p, search);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setForm(defaultForm);
      setShowAddModal(false);
      fetchSets(1, search);
      setPage(1);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add set.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this set? This cannot be undone.")) return;
    await fetch(`/api/admin/sets/${id}`, { method: "DELETE" });
    setSets((prev: SetRow[]) => prev.filter((s) => s.id !== id));
    setSelectedIds((prev: globalThis.Set<number>) => {
      const next = new globalThis.Set(prev);
      next.delete(id);
      return next;
    });
    setTotal((t) => t - 1);
  }

  function startEdit(s: SetRow) {
    setEditingId(s.id);
    setEditForm({
      date: s.date,
      block: s.block,
      week: String(s.week),
      exerciseId: String(s.exerciseId),
      planned: s.planned != null ? String(s.planned) : "",
      actual: s.actual != null ? String(s.actual) : "",
      measure: s.measure ?? "kg",
      value: s.value != null ? String(s.value) : "",
      notes: s.notes ?? "",
    });
  }

  async function saveEdit(id: number) {
    const res = await fetch(`/api/admin/sets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setSets((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev: globalThis.Set<number>) => {
      const next = new globalThis.Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (sets.every((s) => selectedIds.has(s.id))) {
      setSelectedIds((prev: globalThis.Set<number>) => {
        const next = new globalThis.Set(prev);
        sets.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev: globalThis.Set<number>) => {
        const next = new globalThis.Set(prev);
        sets.forEach((s) => next.add(s.id));
        return next;
      });
    }
  }

  async function handleBulkEdit() {
    const fields: Record<string, string | number> = {};
    if (bulkForm.block) fields.block = bulkForm.block;
    if (bulkForm.week) fields.week = Number(bulkForm.week);
    if (bulkForm.date) fields.date = bulkForm.date;
    if (Object.keys(fields).length === 0) return;

    setBulkLoading(true);
    await fetch("/api/admin/sets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), ...fields }),
    });
    setBulkLoading(false);
    setShowBulkEdit(false);
    setBulkForm({ block: "", week: "", date: "" });
    setSelectedIds(new globalThis.Set());
    fetchSets(page, search);
  }

  async function handleCopyAsPlanned() {
    setCopyLoading(true);
    const selected = sets.filter((s) => selectedIds.has(s.id));
    await Promise.all(
      selected.map((s) =>
        fetch("/api/admin/sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: copyDate,
            block: s.block,
            week: s.week,
            exerciseId: s.exerciseId,
            measure: s.measure,
            value: s.value,
            planned: s.planned,
            actual: null,
            notes: s.notes,
          }),
        })
      )
    );
    setCopyLoading(false);
    setShowCopyModal(false);
    setSelectedIds(new globalThis.Set());
    fetchSets(1, search);
    setPage(1);
  }

  const allPageSelected = sets.length > 0 && sets.every((s) => selectedIds.has(s.id));

  return (
    <div className="flex flex-col gap-6">
      {/* Sets Table */}
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Sets ({total})
            {fetching && <Spinner />}
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search exercise…"
              className={`${inputClass} max-w-[180px]`}
            />
            <button onClick={() => { setForm(defaultForm); setError(""); setShowAddModal(true); }} className={submitClass}>
              + Add set
            </button>
          </div>
        </div>

        {/* Always-visible action bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 px-3 py-2 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--border)]">
          <span className="text-sm text-[var(--text-muted)] min-w-[80px]">
            {anySelected ? `${selectedIds.size} selected` : "0 selected"}
          </span>
          <button
            onClick={() => setShowCopyModal(true)}
            disabled={!anySelected}
            className={actionBtnClass}
          >
            Copy as planned
          </button>
          <button
            onClick={() => setShowBulkEdit(true)}
            disabled={!anySelected}
            className={actionBtnClass}
          >
            Bulk edit
          </button>
          {anySelected && (
            <button
              onClick={() => setSelectedIds(new globalThis.Set())}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] ml-auto transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {sets.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No sets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                  <th className="pb-2 pr-3">
                    <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} className="accent-[var(--accent)]" />
                  </th>
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Exercise</th>
                  <th className="pb-2 pr-4 font-medium">Block</th>
                  <th className="pb-2 pr-4 font-medium">Wk</th>
                  <th className="pb-2 pr-4 font-medium">Value</th>
                  <th className="pb-2 pr-4 font-medium">Planned</th>
                  <th className="pb-2 pr-4 font-medium">Actual</th>
                  <th className="pb-2 pr-4 font-medium">Notes</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sets.map((s) => {
                  const isPlanned = s.actual == null;
                  const isEditing = editingId === s.id;
                  const rowBase = isPlanned
                    ? "border-b border-[var(--border)] last:border-0 bg-[var(--surface-alt)] italic"
                    : "border-b border-[var(--border)] last:border-0";

                  if (isEditing) {
                    return (
                      <tr key={s.id} className={rowBase}>
                        <td className="py-2 pr-3">
                          <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="accent-[var(--accent)]" />
                        </td>
                        <td className="py-1 pr-2"><input type="date" value={editForm.date ?? ""} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className={inlineInputClass} /></td>
                        <td className="py-1 pr-2">
                          <select value={editForm.exerciseId ?? ""} onChange={(e) => setEditForm({ ...editForm, exerciseId: e.target.value })} className={inlineInputClass}>
                            {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                          </select>
                        </td>
                        <td className="py-1 pr-2"><input type="text" value={editForm.block ?? ""} onChange={(e) => setEditForm({ ...editForm, block: e.target.value })} className={inlineInputClass} /></td>
                        <td className="py-1 pr-2"><input type="number" value={editForm.week ?? ""} onChange={(e) => setEditForm({ ...editForm, week: e.target.value })} className={`${inlineInputClass} w-14`} /></td>
                        <td className="py-1 pr-2">
                          <div className="flex gap-1">
                            <input type="number" value={editForm.value ?? ""} onChange={(e) => setEditForm({ ...editForm, value: e.target.value })} step="any" className={`${inlineInputClass} w-16`} />
                            <select value={editForm.measure ?? "kg"} onChange={(e) => setEditForm({ ...editForm, measure: e.target.value })} className={inlineInputClass}>
                              {MEASURES.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="py-1 pr-2"><input type="number" value={editForm.planned ?? ""} onChange={(e) => setEditForm({ ...editForm, planned: e.target.value })} step="any" className={`${inlineInputClass} w-16`} /></td>
                        <td className="py-1 pr-2"><input type="number" value={editForm.actual ?? ""} onChange={(e) => setEditForm({ ...editForm, actual: e.target.value })} step="any" className={`${inlineInputClass} w-16`} /></td>
                        <td className="py-1 pr-2"><input type="text" value={editForm.notes ?? ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className={inlineInputClass} /></td>
                        <td className="py-1">
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(s.id)} className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={s.id} className={rowBase}>
                      <td className="py-2 pr-3">
                        <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="accent-[var(--accent)]" />
                      </td>
                      <td className={`py-2 pr-4 ${isPlanned ? "text-[var(--text-muted)]" : "text-[var(--text)]"}`}>{s.date}</td>
                      <td className={`py-2 pr-4 ${isPlanned ? "text-[var(--text-muted)]" : "text-[var(--text)]"}`}>{exerciseMap[s.exerciseId] ?? s.exerciseId}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{s.block}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{s.week}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{s.value != null ? `${s.value} ${s.measure ?? ""}` : "—"}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{s.planned ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {isPlanned ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-[var(--warm)] text-white not-italic">Planned</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">{s.actual}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{s.notes ?? "—"}</td>
                      <td className="py-2">
                        <div className="flex gap-3">
                          <button onClick={() => startEdit(s)} className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">Edit</button>
                          <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
            <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed">
              ← Prev
            </button>
            <span className="text-sm text-[var(--text-muted)]">Page {page} of {totalPages}</span>
            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed">
              Next →
            </button>
          </div>
        )}
      </section>

      {/* Add Set Modal */}
      {showAddModal && (
        <Modal title="Add set" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date">
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className={inputClass} />
              </Field>
              <Field label="Block">
                <input type="text" value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} required placeholder="e.g. Strength A" className={inputClass} />
              </Field>
              <Field label="Week">
                <input type="number" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} required min={1} className={inputClass} />
              </Field>
              <Field label="Exercise">
                <select value={form.exerciseId} onChange={(e) => setForm({ ...form, exerciseId: e.target.value })} required className={inputClass}>
                  <option value="">Select…</option>
                  {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </select>
              </Field>
              <Field label="Measure">
                <select value={form.measure} onChange={(e) => setForm({ ...form, measure: e.target.value })} className={inputClass}>
                  {MEASURES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Value">
                <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} step="any" placeholder="e.g. 80" className={inputClass} />
              </Field>
              <Field label="Planned">
                <input type="number" value={form.planned} onChange={(e) => setForm({ ...form, planned: e.target.value })} step="any" placeholder="e.g. 5" className={inputClass} />
              </Field>
              <Field label="Actual">
                <input type="number" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} step="any" placeholder="e.g. 4" className={inputClass} />
              </Field>
              <Field label="Notes (optional)">
                <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any notes" className={inputClass} />
              </Field>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className={`${submitClass} inline-flex items-center gap-2`}>
                {loading && <Spinner light />}
                {loading ? "Adding…" : "Add set"}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <Modal title={`Bulk edit ${selectedIds.size} sets`} onClose={() => setShowBulkEdit(false)}>
          <p className="text-sm text-[var(--text-muted)] mb-4">Leave blank to keep existing value.</p>
          <div className="flex flex-col gap-4">
            <Field label="Block">
              <input type="text" value={bulkForm.block} onChange={(e) => setBulkForm({ ...bulkForm, block: e.target.value })} placeholder="New block name" className={inputClass} />
            </Field>
            <Field label="Week">
              <input type="number" value={bulkForm.week} onChange={(e) => setBulkForm({ ...bulkForm, week: e.target.value })} min={1} placeholder="New week" className={inputClass} />
            </Field>
            <Field label="Date">
              <input type="date" value={bulkForm.date} onChange={(e) => setBulkForm({ ...bulkForm, date: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleBulkEdit} disabled={bulkLoading} className={`${submitClass} inline-flex items-center gap-2`}>
              {bulkLoading && <Spinner light />}
              {bulkLoading ? "Saving…" : "Apply changes"}
            </button>
            <button onClick={() => setShowBulkEdit(false)} className={cancelClass}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Copy as Planned Modal */}
      {showCopyModal && (
        <Modal title={`Copy ${selectedIds.size} sets as planned`} onClose={() => setShowCopyModal(false)}>
          <p className="text-sm text-[var(--text-muted)] mb-4">Creates copies without an actual value. Pick the date for the copies.</p>
          <Field label="Date">
            <input type="date" value={copyDate} onChange={(e) => setCopyDate(e.target.value)} className={inputClass} />
          </Field>
          <div className="flex gap-3 mt-6">
            <button onClick={handleCopyAsPlanned} disabled={copyLoading} className={`${submitClass} inline-flex items-center gap-2`}>
              {copyLoading && <Spinner light />}
              {copyLoading ? "Copying…" : "Copy sets"}
            </button>
            <button onClick={() => setShowCopyModal(false)} className={cancelClass}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading font-bold text-base text-[var(--text)] mb-2">{title}</h3>
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

const inlineInputClass =
  "w-full px-2 py-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

const submitClass =
  "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium py-2 px-5 rounded-[14px] transition-colors duration-200 disabled:opacity-50";

const cancelClass =
  "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-medium py-2 px-5 rounded-[14px] transition-colors duration-200";

const actionBtnClass =
  "text-xs font-medium px-3 py-1.5 rounded-[10px] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent)]";
