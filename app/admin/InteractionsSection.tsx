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

const PAGE_SIZE = 25;
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
  const [data, setData] = useState<InteractionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [persons, setPersons] = useState<Person[]>([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");

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
      const res = await fetch(`/api/admin/interactions?${params}`);
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

  async function fetchPersons() {
    const res = await fetch("/api/admin/persons");
    if (res.ok) setPersons(await res.json());
  }

  useEffect(() => {
    fetchPage(1, "");
    fetchPersons();
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
      const res = await fetch("/api/admin/interactions", {
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
        setAddError(json.error || "Failed to add interaction.");
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
    fetchPage(page, search.trim());
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        {saveError && <p className="text-sm text-red-500 mb-3">{saveError}</p>}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Interactions ({total})
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
              + Add interaction
            </button>
          </div>
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No interactions found.</p>
        ) : (
          <>
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
                  {data.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border)] last:border-0 align-top cursor-pointer hover:bg-[var(--surface-alt)] transition-colors" onClick={() => startEdit(row)}>
                      <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap font-mono text-xs">{row.entryDate}</td>
                      <td className="py-2 pr-4 text-[var(--text)] whitespace-nowrap">{personDisplay(row)}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{row.rank ?? "—"}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{sentimentLabel(row.sentiment)}</td>
                      <td className="py-2 pr-4 text-[var(--text)] max-w-xs">{row.note ?? "—"}</td>
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
              <button type="submit" className={submitClass}>Save changes</button>
              <button type="button" onClick={() => setEditingId(null)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
