"use client";

import { useEffect, useRef, useState } from "react";
import type { Thought } from "@/lib/schema";

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
const THOUGHT_TYPES = ["reflection", "idea", "goal", "gratitude", "rant", "other"];

type FormState = { entryDate: string; thought: string; type: string };

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const defaultForm: FormState = { entryDate: today, thought: "", type: "" };

export default function ThoughtsSection() {
  const [data, setData] = useState<Thought[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchPage(p: number, q: string) {
    setFetching(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/thoughts?${params}`);
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPage(1, value.trim());
    }, 300);
  }

  function goToPage(p: number) {
    fetchPage(p, search.trim());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/thoughts", {
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
        setAddError(json.error || "Failed to add thought.");
      }
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(t: Thought) {
    setEditingId(t.id);
    setEditForm({ entryDate: t.entryDate, thought: t.thought, type: t.type ?? "" });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditError("");
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/thoughts/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        fetchPage(page, search.trim());
      } else {
        const json = await res.json();
        setEditError(json.error || "Failed to update thought.");
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this thought? This cannot be undone.")) return;
    await fetch(`/api/admin/thoughts/${id}`, { method: "DELETE" });
    fetchPage(page, search.trim());
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Thoughts ({total})
            {fetching && <Spinner />}
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search…"
              className={`${inputClass} max-w-[180px]`}
            />
            <button
              onClick={() => { setForm(defaultForm); setAddError(""); setShowAddModal(true); }}
              className={submitClass}
            >
              + Add thought
            </button>
          </div>
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No thoughts found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Thought</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--border)] last:border-0 align-top">
                      <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap font-mono text-xs">{t.entryDate}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap">{t.type ?? "—"}</td>
                      <td className="py-2 pr-4 text-[var(--text)] max-w-md">{t.thought}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(t)} className="text-xs text-[var(--accent)] hover:underline">Edit</button>
                          <button onClick={() => handleDelete(t.id)} className="text-xs text-[var(--warm)] hover:underline">Delete</button>
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
        <Modal title="Add thought" onClose={() => setShowAddModal(false)}>
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
              <Field label="Type (optional)">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={inputClass}
                >
                  <option value="">— none —</option>
                  {THOUGHT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Thought">
              <textarea
                value={form.thought}
                onChange={(e) => setForm({ ...form, thought: e.target.value })}
                required
                rows={4}
                placeholder="Write your thought…"
                className={`${inputClass} resize-y`}
              />
            </Field>
            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={addLoading} className={`${submitClass} inline-flex items-center gap-2`}>
                {addLoading && <Spinner light />}
                {addLoading ? "Adding…" : "Add thought"}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {editingId !== null && (
        <Modal title="Edit thought" onClose={() => setEditingId(null)}>
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
              <Field label="Type (optional)">
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className={inputClass}
                >
                  <option value="">— none —</option>
                  {THOUGHT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Thought">
              <textarea
                value={editForm.thought}
                onChange={(e) => setEditForm({ ...editForm, thought: e.target.value })}
                required
                rows={4}
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
