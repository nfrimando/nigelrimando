"use client";

import { useEffect, useState } from "react";
import type { Exercise, Set as SetRow } from "@/lib/schema";

type CopyDayRow = {
  exerciseId: number;
  value: string;
  measure: string;
  planned: string;
  notes: string;
};

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? "border-white" : "border-[var(--accent)]"}`}
    />
  );
}

const MEASURES = ["kg", "lbs", "km", "reps", "seconds", "minutes"];
const PAGE_SIZE = 50;
const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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
  const [fetching, setFetching] = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof defaultForm>>({});
  const [saveError, setSaveError] = useState("");

  // Row copy modal
  const [showRowCopyModal, setShowRowCopyModal] = useState(false);
  const [rowCopyTarget, setRowCopyTarget] = useState<SetRow | null>(null);
  const [rowCopyDate, setRowCopyDate] = useState(today);
  const [rowCopyBlock, setRowCopyBlock] = useState("");
  const [rowCopyWeek, setRowCopyWeek] = useState("1");
  const [rowCopyPlanned, setRowCopyPlanned] = useState("");
  const [rowCopyValue, setRowCopyValue] = useState("");
  const [rowCopyMeasure, setRowCopyMeasure] = useState("kg");
  const [rowCopyLoading, setRowCopyLoading] = useState(false);

  // Dupe loading
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  // Copy Day modal
  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [copyDaySourceDate, setCopyDaySourceDate] = useState("");
  const [copyDayTargetDate, setCopyDayTargetDate] = useState(today);
  const [copyDayBlock, setCopyDayBlock] = useState("");
  const [copyDayWeek, setCopyDayWeek] = useState("1");
  const [copyDayRows, setCopyDayRows] = useState<CopyDayRow[]>([]);
  const [copyDayLoading, setCopyDayLoading] = useState(false);

  // Log Set modal
  const [showLogSetModal, setShowLogSetModal] = useState(false);
  const [logSetTarget, setLogSetTarget] = useState<SetRow | null>(null);
  const [logSetValue, setLogSetValue] = useState("");
  const [logSetLoading, setLogSetLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const exerciseMap = Object.fromEntries(exercises.map((e) => [e.id, e.name]));

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
  }

  function commitSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length === 0 || trimmed.length >= 3) {
      setPage(1);
      fetchSets(1, trimmed);
    }
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
    setShowEditModal(true);
  }

  async function saveEdit(id: number) {
    const originalRow = sets.find((s) => s.id === id)!;
    const optimistic: SetRow = {
      ...originalRow,
      date: editForm.date ?? originalRow.date,
      block: editForm.block ?? originalRow.block,
      week: editForm.week !== undefined ? Number(editForm.week) : originalRow.week,
      exerciseId: editForm.exerciseId !== undefined ? Number(editForm.exerciseId) : originalRow.exerciseId,
      measure: editForm.measure ?? originalRow.measure,
      value: editForm.value !== undefined && editForm.value !== "" ? Number(editForm.value) : null,
      planned: editForm.planned !== undefined && editForm.planned !== "" ? Number(editForm.planned) : null,
      actual: editForm.actual !== undefined && editForm.actual !== "" ? Number(editForm.actual) : null,
      notes: editForm.notes || null,
    };
    setSets((prev) => prev.map((s) => (s.id === id ? optimistic : s)));
    setEditingId(null);
    setShowEditModal(false);
    const res = await fetch(`/api/admin/sets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setSets((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } else {
      setSets((prev) => prev.map((s) => (s.id === id ? originalRow : s)));
      setSaveError("Failed to save. Changes reverted.");
      setTimeout(() => setSaveError(""), 3000);
    }
  }

  function openRowCopy(s: SetRow) {
    setRowCopyTarget(s);
    setRowCopyDate(today);
    setRowCopyBlock(s.block);
    setRowCopyWeek(String((s.week ?? 0) + 1));
    setRowCopyPlanned(s.planned != null ? String(s.planned) : "");
    setRowCopyValue(s.value != null ? String(s.value) : "");
    setRowCopyMeasure(s.measure ?? "kg");
    setShowRowCopyModal(true);
  }

  async function handleRowCopy() {
    if (!rowCopyTarget) return;
    setRowCopyLoading(true);
    const s = rowCopyTarget;
    await fetch("/api/admin/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: rowCopyDate,
        block: rowCopyBlock,
        week: rowCopyWeek,
        exerciseId: s.exerciseId,
        measure: rowCopyMeasure,
        value: rowCopyValue !== "" ? rowCopyValue : null,
        planned: rowCopyPlanned !== "" ? rowCopyPlanned : null,
        actual: null,
        notes: s.notes,
      }),
    });
    setRowCopyLoading(false);
    setShowRowCopyModal(false);
    setRowCopyTarget(null);
    fetchSets(page, search);
    showToast("Set copied as planned.");
  }

  async function handleDuplicate(s: SetRow) {
    setDuplicatingId(s.id);
    await fetch("/api/admin/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: s.date,
        block: s.block,
        week: s.week,
        exerciseId: s.exerciseId,
        measure: s.measure,
        value: s.value,
        planned: s.planned,
        actual: null,
        notes: s.notes,
      }),
    });
    setDuplicatingId(null);
    fetchSets(page, search);
    showToast("Set duplicated as planned.");
  }

  function openCopyDay(date: string) {
    const daySets = sets.filter((s) => s.date === date);
    if (daySets.length === 0) return;
    const first = daySets[0];
    setCopyDaySourceDate(date);
    setCopyDayTargetDate(today);
    setCopyDayBlock(first.block);
    setCopyDayWeek(String((first.week ?? 0) + 1));
    setCopyDayRows(
      daySets.map((s) => ({
        exerciseId: s.exerciseId,
        value: s.value != null ? String(s.value) : "",
        measure: s.measure ?? "kg",
        planned: s.planned != null ? String(s.planned) : "",
        notes: s.notes ?? "",
      }))
    );
    setShowCopyDayModal(true);
  }

  async function handleCopyDay() {
    if (copyDayRows.length === 0) return;
    setCopyDayLoading(true);
    await Promise.all(
      copyDayRows.map((row) =>
        fetch("/api/admin/sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: copyDayTargetDate,
            block: copyDayBlock,
            week: copyDayWeek,
            exerciseId: row.exerciseId,
            measure: row.measure,
            value: row.value !== "" ? row.value : null,
            planned: row.planned !== "" ? row.planned : null,
            actual: null,
            notes: row.notes || null,
          }),
        })
      )
    );
    setCopyDayLoading(false);
    setShowCopyDayModal(false);
    fetchSets(page, search);
    showToast(`${copyDayRows.length} sets copied as planned.`);
  }

  function openLogSet(s: SetRow) {
    setLogSetTarget(s);
    setLogSetValue(s.planned != null ? String(s.planned) : "");
    setShowLogSetModal(true);
  }

  async function handleLogSet() {
    if (!logSetTarget) return;
    setLogSetLoading(true);
    const res = await fetch(`/api/admin/sets/${logSetTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual: logSetValue }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSets((prev) => prev.map((s) => (s.id === logSetTarget.id ? updated : s)));
    }
    setLogSetLoading(false);
    setShowLogSetModal(false);
    setLogSetTarget(null);
    showToast("Set logged.");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sets Table */}
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        {saveError && <p className="text-sm text-red-500 mb-3">{saveError}</p>}
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
              onBlur={(e) => commitSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitSearch(search); }}
              placeholder="Search exercise…"
              className={`${inputClass} max-w-[180px]`}
            />
            <button onClick={() => { setForm(defaultForm); setError(""); setShowAddModal(true); }} className={submitClass}>
              + Add set
            </button>
          </div>
        </div>

        {sets.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No sets found.</p>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden flex flex-col divide-y divide-[var(--border)]">
              {sets.reduce<{ els: React.ReactNode[]; lastDate: string | null }>(
                ({ els, lastDate }, s, i) => {
                  if (s.date !== lastDate) {
                    els.push(
                      <div key={`date-${s.date}-${i}`} className="py-2 px-1 bg-[var(--surface-alt)] flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--accent)] tracking-wide uppercase">{s.date}</span>
                        <button
                          onClick={() => openCopyDay(s.date)}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        >
                          Copy day →
                        </button>
                      </div>
                    );
                  }

                  const isPlanned = s.actual == null;
                  els.push(
                  <div key={s.id} className="py-3 cursor-pointer" onClick={() => startEdit(s)}>
                    <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`font-medium text-sm truncate ${isPlanned ? "text-[var(--text-muted)] italic" : "text-[var(--text)]"}`}>
                            {exerciseMap[s.exerciseId] ?? s.exerciseId}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] shrink-0">{s.date}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--text-muted)] mb-2">
                          {s.block && <span>{s.block}</span>}
                          <span>Wk {s.week}</span>
                          {s.value != null && <span>{s.value} {s.measure ?? ""}</span>}
                          {s.planned != null && <span>Planned: {s.planned}</span>}
                          {s.notes && <span className="italic">{s.notes}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {isPlanned ? (
                              <button
                                onClick={() => openLogSet(s)}
                                className="px-3 py-1.5 rounded-[10px] text-xs font-medium bg-[var(--warm)] text-white hover:opacity-80 transition-opacity"
                              >
                                Log actual
                              </button>
                            ) : (
                              <span className={`text-xs font-medium ${s.planned != null && s.actual != null && Number(s.actual) < Number(s.planned) ? "text-red-500" : "text-[var(--text)]"}`}>
                                Actual: {s.actual}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => openRowCopy(s)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">Copy</button>
                            <button
                              onClick={() => handleDuplicate(s)}
                              disabled={duplicatingId === s.id}
                              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {duplicatingId === s.id ? <Spinner /> : "Dupe"}
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Del</button>
                          </div>
                        </div>
                    </div>
                  </div>
                  );

                  return { els, lastDate: s.date };
                },
                { els: [], lastDate: null }
              ).els}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
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
                  {sets.reduce<{ els: React.ReactNode[]; lastDate: string | null }>(
                    ({ els, lastDate }, s, i) => {
                      const isPlanned = s.actual == null;
                      const rowBase = isPlanned
                        ? "border-b border-[var(--border)] last:border-0 bg-[var(--surface-alt)] italic"
                        : "border-b border-[var(--border)] last:border-0";

                      if (s.date !== lastDate) {
                        els.push(
                          <tr key={`date-${s.date}-${i}`} className="bg-[var(--surface-alt)]">
                            <td colSpan={9} className="py-1.5 px-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[var(--accent)] tracking-wide uppercase">
                                  {s.date}
                                </span>
                                <button
                                  onClick={() => openCopyDay(s.date)}
                                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                                >
                                  Copy day →
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      els.push(
                      <tr key={s.id} className={`${rowBase} cursor-pointer`} onClick={() => startEdit(s)}>
                        <td className={`py-2 pr-4 ${isPlanned ? "text-[var(--text-muted)]" : "text-[var(--text)]"}`}>{s.date}</td>
                        <td className={`py-2 pr-4 ${isPlanned ? "text-[var(--text-muted)]" : "text-[var(--text)]"}`}>{exerciseMap[s.exerciseId] ?? s.exerciseId}</td>
                        <td className="py-2 pr-4 text-[var(--text-muted)]">{s.block}</td>
                        <td className="py-2 pr-4 text-[var(--text-muted)]">{s.week}</td>
                        <td className="py-2 pr-4 text-[var(--text-muted)]">{s.value != null ? `${s.value} ${s.measure ?? ""}` : "—"}</td>
                        <td className="py-2 pr-4 text-[var(--text-muted)]">{s.planned ?? "—"}</td>
                        <td className="py-2 pr-4" onClick={(e) => e.stopPropagation()}>
                          {isPlanned ? (
                            <button
                              onClick={() => openLogSet(s)}
                              className="inline-block px-2 py-0.5 rounded-full text-xs bg-[var(--warm)] text-white not-italic hover:opacity-75 transition-opacity"
                            >
                              Log
                            </button>
                          ) : (
                            <span className={s.planned != null && s.actual != null && Number(s.actual) < Number(s.planned) ? "text-red-500" : "text-[var(--text-muted)]"}>
                              {s.actual}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-[var(--text-muted)]">{s.notes ?? "—"}</td>
                        <td className="py-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-3">
                            <button onClick={() => openRowCopy(s)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">Copy to…</button>
                            <button
                              onClick={() => handleDuplicate(s)}
                              disabled={duplicatingId === s.id}
                              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {duplicatingId === s.id ? <Spinner /> : "Dupe"}
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                          </div>
                        </td>
                      </tr>
                      );

                      return { els, lastDate: s.date };
                    },
                    { els: [], lastDate: null }
                  ).els}
                </tbody>
              </table>
            </div>
          </>
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

      {/* Edit Set Modal */}
      {showEditModal && editingId !== null && (
        <Modal title="Edit set" onClose={() => setShowEditModal(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <Field label="Date">
              <input type="date" value={editForm.date ?? ""} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Block">
              <input type="text" value={editForm.block ?? ""} onChange={(e) => setEditForm({ ...editForm, block: e.target.value })} placeholder="e.g. Strength A" className={inputClass} />
            </Field>
            <Field label="Week">
              <input type="number" value={editForm.week ?? ""} onChange={(e) => setEditForm({ ...editForm, week: e.target.value })} min={1} className={inputClass} />
            </Field>
            <Field label="Exercise">
              <SearchableSelect
                value={editForm.exerciseId ?? ""}
                onChange={(val) => setEditForm({ ...editForm, exerciseId: val })}
                options={exercises}
                className={inputClass}
              />
            </Field>
            <Field label="Measure">
              <select value={editForm.measure ?? "kg"} onChange={(e) => setEditForm({ ...editForm, measure: e.target.value })} className={inputClass}>
                {MEASURES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Value">
              <input type="number" value={editForm.value ?? ""} onChange={(e) => setEditForm({ ...editForm, value: e.target.value })} step="any" placeholder="e.g. 80" className={inputClass} />
            </Field>
            <Field label="Planned">
              <input type="number" value={editForm.planned ?? ""} onChange={(e) => setEditForm({ ...editForm, planned: e.target.value })} step="any" placeholder="e.g. 5" className={inputClass} />
            </Field>
            <Field label="Actual">
              <input type="number" value={editForm.actual ?? ""} onChange={(e) => setEditForm({ ...editForm, actual: e.target.value })} step="any" placeholder="e.g. 4" className={inputClass} />
            </Field>
            <Field label="Notes (optional)">
              <input type="text" value={editForm.notes ?? ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Any notes" className={inputClass} />
            </Field>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => saveEdit(editingId)} className={`${submitClass} inline-flex items-center gap-2`}>
              Save
            </button>
            <button onClick={() => setShowEditModal(false)} className={cancelClass}>Cancel</button>
          </div>
        </Modal>
      )}

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

      {/* Row Copy Modal */}
      {showRowCopyModal && rowCopyTarget && (
        <Modal title="Copy set as planned" onClose={() => setShowRowCopyModal(false)}>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Creates a planned copy of <strong>{exerciseMap[rowCopyTarget.exerciseId]}</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date">
              <input type="date" value={rowCopyDate} onChange={(e) => setRowCopyDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Block">
              <input type="text" value={rowCopyBlock} onChange={(e) => setRowCopyBlock(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Week">
              <input type="number" value={rowCopyWeek} onChange={(e) => setRowCopyWeek(e.target.value)} min={1} className={inputClass} />
            </Field>
            <Field label="Measure">
              <select value={rowCopyMeasure} onChange={(e) => setRowCopyMeasure(e.target.value)} className={inputClass}>
                {MEASURES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Value">
              <input type="number" value={rowCopyValue} onChange={(e) => setRowCopyValue(e.target.value)} step="any" placeholder="e.g. 80" className={inputClass} />
            </Field>
            <Field label="Planned">
              <input type="number" value={rowCopyPlanned} onChange={(e) => setRowCopyPlanned(e.target.value)} step="any" placeholder="e.g. 5" className={inputClass} />
            </Field>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleRowCopy} disabled={rowCopyLoading} className={`${submitClass} inline-flex items-center gap-2`}>
              {rowCopyLoading && <Spinner light />}
              {rowCopyLoading ? "Copying…" : "Copy set"}
            </button>
            <button onClick={() => setShowRowCopyModal(false)} className={cancelClass}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Log Set Modal */}
      {showLogSetModal && logSetTarget && (
        <Modal title="Log set" onClose={() => setShowLogSetModal(false)}>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Log actual reps for <strong>{exerciseMap[logSetTarget.exerciseId]}</strong>.
          </p>
          <Field label="Actual">
            <input
              type="number"
              value={logSetValue}
              onChange={(e) => setLogSetValue(e.target.value)}
              step="any"
              autoFocus
              className={inputClass}
            />
          </Field>
          <div className="flex gap-3 mt-6">
            <button onClick={handleLogSet} disabled={logSetLoading} className={`${submitClass} inline-flex items-center gap-2`}>
              {logSetLoading && <Spinner light />}
              {logSetLoading ? "Saving…" : "Log set"}
            </button>
            <button onClick={() => setShowLogSetModal(false)} className={cancelClass}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Copy Day Modal */}
      {showCopyDayModal && (
        <Modal title={`Copy day — ${copyDaySourceDate}`} onClose={() => setShowCopyDayModal(false)}>
          <div className="grid grid-cols-3 gap-3 mt-2 mb-5">
            <Field label="Target date">
              <input type="date" value={copyDayTargetDate} onChange={(e) => setCopyDayTargetDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Block">
              <input type="text" value={copyDayBlock} onChange={(e) => setCopyDayBlock(e.target.value)} placeholder="e.g. Strength A" className={inputClass} />
            </Field>
            <Field label="Week">
              <input type="number" value={copyDayWeek} onChange={(e) => setCopyDayWeek(e.target.value)} min={1} className={inputClass} />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_80px_90px_80px_24px] gap-2 px-1 mb-1">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Exercise</span>
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Value</span>
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Measure</span>
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Planned</span>
              <span />
            </div>
            {copyDayRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_90px_80px_24px] gap-2 items-center">
                <span className="text-sm text-[var(--text)] truncate px-1">{exerciseMap[row.exerciseId] ?? row.exerciseId}</span>
                <input
                  type="number"
                  value={row.value}
                  onChange={(e) => setCopyDayRows((prev) => prev.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                  step="any"
                  placeholder="—"
                  className={inputClass}
                />
                <select
                  value={row.measure}
                  onChange={(e) => setCopyDayRows((prev) => prev.map((r, j) => j === i ? { ...r, measure: e.target.value } : r))}
                  className={inputClass}
                >
                  {MEASURES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  type="number"
                  value={row.planned}
                  onChange={(e) => setCopyDayRows((prev) => prev.map((r, j) => j === i ? { ...r, planned: e.target.value } : r))}
                  step="any"
                  placeholder="—"
                  className={inputClass}
                />
                <button
                  onClick={() => setCopyDayRows((prev) => prev.filter((_, j) => j !== i))}
                  className="text-[var(--text-muted)] hover:text-red-500 transition-colors text-base leading-none"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleCopyDay} disabled={copyDayLoading || copyDayRows.length === 0} className={`${submitClass} inline-flex items-center gap-2`}>
              {copyDayLoading && <Spinner light />}
              {copyDayLoading ? "Copying…" : `Copy ${copyDayRows.length} sets`}
            </button>
            <button onClick={() => setShowCopyDayModal(false)} className={cancelClass}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--success)] text-white text-sm font-medium px-4 py-2.5 rounded-[14px] shadow-lg pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}

function SearchableSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  options: Exercise[];
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const sel = options.find((o) => String(o.id) === value);
    setQuery(sel?.name ?? "");
  }, [value, options]);

  const filtered = query
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  function select(opt: Exercise) {
    onChange(String(opt.id));
    setQuery(opt.name);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      e.stopPropagation();
      if (filtered[cursor]) select(filtered[cursor]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      const sel = options.find((o) => String(o.id) === value);
      setQuery(sel?.name ?? "");
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        autoComplete="off"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(0); }}
        onFocus={() => { setOpen(true); setCursor(0); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-[10px] shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((o, i) => (
            <div
              key={o.id}
              onMouseDown={() => select(o)}
              className={`px-3 py-1.5 text-xs cursor-pointer ${
                i === cursor ? "bg-[var(--surface-alt)] text-[var(--text)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-alt)]"
              }`}
            >
              {o.name}
            </div>
          ))}
        </div>
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

const submitClass =
  "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium py-2 px-5 rounded-[14px] transition-colors duration-200 disabled:opacity-50";

const cancelClass =
  "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-medium py-2 px-5 rounded-[14px] transition-colors duration-200";
