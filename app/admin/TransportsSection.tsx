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
  const [rows, setRows] = useState<Transport[]>([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");

  const originSuggestions = [...new Set(rows.map((r) => r.origin).filter(Boolean) as string[])].sort();
  const destinationSuggestions = [...new Set(rows.map((r) => r.destination).filter(Boolean) as string[])].sort();

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(defaultForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  async function fetchAll() {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/transports");
      if (res.ok) setRows(await res.json());
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

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
        fetchAll();
      } else {
        const data = await res.json();
        setAddError(data.error || "Failed to add transport.");
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
    setEditError("");
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/transports/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        fetchAll();
      } else {
        const data = await res.json();
        setEditError(data.error || "Failed to update transport.");
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this transport entry? This cannot be undone.")) return;
    await fetch(`/api/admin/transports/${id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = search.trim()
    ? rows.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.date.includes(q) ||
          r.eventType.toLowerCase().includes(q) ||
          (r.mode ?? "").toLowerCase().includes(q) ||
          (r.origin ?? "").toLowerCase().includes(q) ||
          (r.destination ?? "").toLowerCase().includes(q) ||
          (r.notes ?? "").toLowerCase().includes(q)
        );
      })
    : rows;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Transports ({rows.length})
            {fetching && <Spinner />}
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No transport entries found.</p>
        ) : (
          <div className="overflow-x-auto">
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
                {filtered.map((row) => {
                  const dur = tripDuration(row.startTime, row.endTime);
                  return (
                    <tr key={row.id} className="border-b border-[var(--border)] last:border-0 align-top">
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
                      <td className="py-2">
                        <div className="flex gap-2 items-center">
                          {row.videoUrl ? (
                            <a
                              href={row.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#FF0000] hover:opacity-70 transition-opacity"
                              title="Watch video"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                            </a>
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                          <button onClick={() => startEdit(row)} className="text-xs text-[var(--accent)] hover:underline">Edit</button>
                          <button onClick={() => handleDelete(row.id)} className="text-xs text-[var(--warm)] hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            loading={editLoading}
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
