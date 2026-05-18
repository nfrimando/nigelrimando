"use client";

import { useEffect, useState } from "react";
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

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const defaultForm: FormState = { entryDate: today, personId: "", rank: "", note: "", sentiment: "" };

function sentimentLabel(s: number | null) {
  if (s === null) return "—";
  if (s > 0) return `+${s}`;
  return String(s);
}

function personDisplay(row: InteractionRow) {
  if (!row.personName) return "—";
  return row.personNickname ? `${row.personName} (${row.personNickname})` : row.personName;
}

export default function InteractionsSection() {
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");

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
      const [iRes, pRes] = await Promise.all([
        fetch("/api/admin/interactions"),
        fetch("/api/admin/persons"),
      ]);
      if (iRes.ok) setInteractions(await iRes.json());
      if (pRes.ok) setPersons(await pRes.json());
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
      const res = await fetch("/api/admin/interactions", {
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
        setAddError(data.error || "Failed to add interaction.");
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
    setEditError("");
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/interactions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        fetchAll();
      } else {
        const data = await res.json();
        setEditError(data.error || "Failed to update interaction.");
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this interaction? This cannot be undone.")) return;
    await fetch(`/api/admin/interactions/${id}`, { method: "DELETE" });
    setInteractions((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = search.trim()
    ? interactions.filter((r) => {
        const q = search.toLowerCase();
        return (
          (r.personName ?? "").toLowerCase().includes(q) ||
          (r.note ?? "").toLowerCase().includes(q) ||
          r.entryDate.includes(q)
        );
      })
    : interactions;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Interactions ({interactions.length})
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
              + Add interaction
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No interactions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Person</th>
                  <th className="pb-2 pr-4 font-medium">Rank</th>
                  <th className="pb-2 pr-4 font-medium">Sentiment</th>
                  <th className="pb-2 pr-4 font-medium">Note</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--border)] last:border-0 align-top">
                    <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap font-mono text-xs">{row.entryDate}</td>
                    <td className="py-2 pr-4 text-[var(--text)] whitespace-nowrap">{personDisplay(row)}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{row.rank ?? "—"}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{sentimentLabel(row.sentiment)}</td>
                    <td className="py-2 pr-4 text-[var(--text)] max-w-xs">{row.note ?? "—"}</td>
                    <td className="py-2">
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
        )}
      </section>

      {showAddModal && (
        <Modal title="Add interaction" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <input
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Person (optional)">
                <select
                  value={form.personId}
                  onChange={(e) => setForm({ ...form, personId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">— none —</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname ? `${p.name} (${p.nickname})` : p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rank (optional)">
                <input
                  type="number"
                  value={form.rank}
                  onChange={(e) => setForm({ ...form, rank: e.target.value })}
                  placeholder="e.g. 1"
                  className={inputClass}
                />
              </Field>
              <Field label="Sentiment (optional)">
                <input
                  type="number"
                  value={form.sentiment}
                  onChange={(e) => setForm({ ...form, sentiment: e.target.value })}
                  placeholder="-5 to +5"
                  min={-5}
                  max={5}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Note (optional)">
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                placeholder="Any notes about this interaction…"
                className={`${inputClass} resize-y`}
              />
            </Field>
            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={addLoading} className={`${submitClass} inline-flex items-center gap-2`}>
                {addLoading && <Spinner light />}
                {addLoading ? "Adding…" : "Add interaction"}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {editingId !== null && (
        <Modal title="Edit interaction" onClose={() => setEditingId(null)}>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
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
                <select
                  value={editForm.personId}
                  onChange={(e) => setEditForm({ ...editForm, personId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">— none —</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname ? `${p.name} (${p.nickname})` : p.name}
                    </option>
                  ))}
                </select>
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
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={editLoading} className={`${submitClass} inline-flex items-center gap-2`}>
                {editLoading && <Spinner light />}
                {editLoading ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={() => setEditingId(null)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
