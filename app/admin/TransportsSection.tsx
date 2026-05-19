"use client";

import { useEffect, useState } from "react";
import type { Transport } from "@/lib/schema";

type FormState = {
  date: string;
  startTime: string;
  endTime: string;
  eventType: string;
  mode: string;
  item: string;
  origin: string;
  destination: string;
  notes: string;
  videoUrl: string;
};

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
        className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto"
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

const EVENT_TYPES = ["trip", "charging"];
const MODES = ["ebike"];
const ITEMS = ["ebike", "helmet"];

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const defaultForm: FormState = {
  date: today,
  startTime: "",
  endTime: "",
  eventType: "trip",
  mode: "ebike",
  item: "",
  origin: "",
  destination: "",
  notes: "",
  videoUrl: "",
};

function tripDuration(startTime: string | null, endTime: string | null): string | null {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function TransportForm({
  form,
  setForm,
  onSubmit,
  loading,
  error,
  submitLabel,
  onCancel,
  idPrefix,
  originSuggestions,
  destinationSuggestions,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
  submitLabel: string;
  onCancel: () => void;
  idPrefix: string;
  originSuggestions: string[];
  destinationSuggestions: string[];
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
        <Field label="Event type">
          <select
            value={form.eventType}
            onChange={(e) => setForm({ ...form, eventType: e.target.value })}
            required
            className={inputClass}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Mode (optional)">
          <select
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
            className={inputClass}
          >
            <option value="">— none —</option>
            {MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Item (optional)">
          <select
            value={form.item}
            onChange={(e) => setForm({ ...form, item: e.target.value })}
            className={inputClass}
          >
            <option value="">— none —</option>
            {ITEMS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </Field>
        <Field label="Start time (optional)">
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="End time (optional)">
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Origin (optional)">
          <input
            type="text"
            list={`${idPrefix}-origins`}
            value={form.origin}
            onChange={(e) => setForm({ ...form, origin: e.target.value })}
            placeholder="e.g. Home"
            className={inputClass}
            autoComplete="off"
          />
          <datalist id={`${idPrefix}-origins`}>
            {originSuggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>
        <Field label="Destination (optional)">
          <input
            type="text"
            list={`${idPrefix}-destinations`}
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            placeholder="e.g. Office"
            className={inputClass}
            autoComplete="off"
          />
          <datalist id={`${idPrefix}-destinations`}>
            {destinationSuggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className={`${inputClass} resize-y`}
        />
      </Field>
      <Field label="Video URL (optional)">
        <input
          type="url"
          value={form.videoUrl}
          onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
          className={inputClass}
        />
      </Field>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={loading} className={`${submitClass} inline-flex items-center gap-2`}>
          {loading && <Spinner light />}
          {loading ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={cancelClass}>Cancel</button>
      </div>
    </form>
  );
}

export default function TransportsSection() {
  const [data, setData] = useState<Transport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");

  const originSuggestions = [...new Set(data.map((r) => r.origin).filter(Boolean) as string[])].sort();
  const destinationSuggestions = [...new Set(data.map((r) => r.destination).filter(Boolean) as string[])].sort();

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(defaultForm);
  const [editError, setEditError] = useState("");
  const [saveError, setSaveError] = useState("");

  async function fetchPage(p: number, q: string) {
    setFetching(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/transports?${params}`);
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
      const res = await fetch("/api/admin/transports", {
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
        setAddError(json.error || "Failed to add transport.");
      }
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(row: Transport) {
    setEditingId(row.id);
    setEditForm({
      date: row.date,
      startTime: row.startTime ?? "",
      endTime: row.endTime ?? "",
      eventType: row.eventType,
      mode: row.mode ?? "",
      item: row.item ?? "",
      origin: row.origin ?? "",
      destination: row.destination ?? "",
      notes: row.notes ?? "",
      videoUrl: row.videoUrl ?? "",
    });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    const id = editingId;
    const originalRow = data.find((r) => r.id === id)!;
    const optimistic: Transport = {
      ...originalRow,
      date: editForm.date,
      startTime: editForm.startTime || null,
      endTime: editForm.endTime || null,
      eventType: editForm.eventType,
      mode: editForm.mode || null,
      item: editForm.item || null,
      origin: editForm.origin || null,
      destination: editForm.destination || null,
      notes: editForm.notes || null,
      videoUrl: editForm.videoUrl || null,
    };

    setData((prev) => prev.map((r) => (r.id === id ? optimistic : r)));
    setEditingId(null);

    const res = await fetch(`/api/admin/transports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setData((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } else {
      const json = await res.json();
      setData((prev) => prev.map((r) => (r.id === id ? originalRow : r)));
      setEditingId(id);
      setEditError(json.error || "Failed to update transport.");
      setSaveError("Failed to save. Changes reverted.");
      setTimeout(() => setSaveError(""), 3000);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this transport entry? This cannot be undone.")) return;
    await fetch(`/api/admin/transports/${id}`, { method: "DELETE" });
    fetchPage(page, search.trim());
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        {saveError && <p className="text-sm text-red-500 mb-3">{saveError}</p>}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Transports ({total})
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
          <p className="text-sm text-[var(--text-muted)]">No transport entries found.</p>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden flex flex-col divide-y divide-[var(--border)]">
              {data.reduce<{ els: React.ReactNode[]; lastDate: string | null }>(
                ({ els, lastDate }, row, i) => {
                  if (row.date !== lastDate) {
                    els.push(
                      <div key={`date-${row.date}-${i}`} className="py-2 px-1 bg-[var(--surface-alt)]">
                        <span className="text-xs font-semibold text-[var(--accent)] tracking-wide uppercase">{row.date}</span>
                      </div>
                    );
                  }
                  const dur = tripDuration(row.startTime, row.endTime);
                  els.push(
                    <div key={row.id} className="py-3" onClick={() => startEdit(row)}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-[var(--text)]">{row.eventType}</span>
                        {(row.origin || row.destination) && (
                          <span className="text-xs text-[var(--text-muted)] shrink-0">{row.origin ?? "?"} → {row.destination ?? "?"}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--text-muted)] mb-2">
                        {[row.mode, row.item].filter(Boolean).length > 0 && (
                          <span>{[row.mode, row.item].filter(Boolean).join(" / ")}</span>
                        )}
                        {row.startTime && (
                          <span className="font-mono">
                            {row.endTime ? `${row.startTime}–${row.endTime}${dur ? ` (${dur})` : ""}` : row.startTime}
                          </span>
                        )}
                        {row.notes && <span className="italic">{row.notes}</span>}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {row.videoUrl ? (
                          <a href={row.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[#FF0000] hover:opacity-70 transition-opacity" title="Watch video" onClick={(e) => e.stopPropagation()}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </a>
                        ) : <span />}
                        <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleDelete(row.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Del</button>
                        </div>
                      </div>
                    </div>
                  );
                  return { els, lastDate: row.date };
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
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Mode / Item</th>
                    <th className="pb-2 pr-4 font-medium">From → To</th>
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">Notes</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.reduce<{ els: React.ReactNode[]; lastDate: string | null }>(
                    ({ els, lastDate }, row, i) => {
                      if (row.date !== lastDate) {
                        els.push(
                          <tr key={`date-${row.date}-${i}`} className="bg-[var(--surface-alt)]">
                            <td colSpan={7} className="py-1.5 px-3">
                              <span className="text-xs font-semibold text-[var(--accent)] tracking-wide uppercase">{row.date}</span>
                            </td>
                          </tr>
                        );
                      }
                      const dur = tripDuration(row.startTime, row.endTime);
                      els.push(
                        <tr key={row.id} className="border-b border-[var(--border)] last:border-0 align-top cursor-pointer hover:bg-[var(--surface-alt)] transition-colors" onClick={() => startEdit(row)}>
                          <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap font-mono text-xs">{row.date}</td>
                          <td className="py-2 pr-4 text-[var(--text)] whitespace-nowrap">{row.eventType}</td>
                          <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap">
                            {[row.mode, row.item].filter(Boolean).join(" / ") || "—"}
                          </td>
                          <td className="py-2 pr-4 text-[var(--text)] whitespace-nowrap">
                            {row.origin || row.destination
                              ? `${row.origin ?? "?"} → ${row.destination ?? "?"}`
                              : "—"}
                          </td>
                          <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap font-mono text-xs">
                            {row.startTime && row.endTime
                              ? `${row.startTime}–${row.endTime}${dur ? ` (${dur})` : ""}`
                              : row.startTime ?? "—"}
                          </td>
                          <td className="py-2 pr-4 text-[var(--text)] max-w-xs">{row.notes ?? "—"}</td>
                          <td className="py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 items-center">
                              {row.videoUrl ? (
                                <a href={row.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[#FF0000] hover:opacity-70 transition-opacity" title="Watch video">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                  </svg>
                                </a>
                              ) : (
                                <span className="text-[var(--text-muted)]">—</span>
                              )}
                              <button onClick={() => handleDelete(row.id)} className="text-xs text-[var(--warm)] hover:underline">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                      return { els, lastDate: row.date };
                    },
                    { els: [], lastDate: null }
                  ).els}
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
        <Modal title="Add transport entry" onClose={() => setShowAddModal(false)}>
          <TransportForm
            form={form}
            setForm={setForm}
            onSubmit={handleAdd}
            loading={addLoading}
            error={addError}
            submitLabel="Add entry"
            onCancel={() => setShowAddModal(false)}
            idPrefix="add"
            originSuggestions={originSuggestions}
            destinationSuggestions={destinationSuggestions}
          />
        </Modal>
      )}

      {editingId !== null && (
        <Modal title="Edit transport entry" onClose={() => setEditingId(null)}>
          <TransportForm
            form={editForm}
            setForm={setEditForm}
            onSubmit={handleEdit}
            loading={false}
            error={editError}
            submitLabel="Save changes"
            onCancel={() => setEditingId(null)}
            idPrefix="edit"
            originSuggestions={originSuggestions}
            destinationSuggestions={destinationSuggestions}
          />
        </Modal>
      )}
    </div>
  );
}
