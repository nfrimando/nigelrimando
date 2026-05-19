"use client";

import { useEffect, useState } from "react";
import type { Habit } from "@/lib/schema";

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? "border-white" : "border-[var(--accent)]"}`}
    />
  );
}

const HABIT_CATEGORIES = ["work", "health", "relationships", "hobbies", "lifestyle"];
const HABIT_VALUE_TYPES = ["binary", "scaled", "count"];

const defaultForm = {
  key: "",
  label: "",
  description: "",
  category: "health",
  valueType: "binary",
  isActive: true,
};

export default function HabitsSection() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  async function fetchHabits() {
    setFetching(true);
    const res = await fetch("/api/admin/habits");
    if (res.ok) setHabits(await res.json());
    setFetching(false);
  }

  useEffect(() => {
    fetchHabits();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setForm(defaultForm);
      setShowAddModal(false);
      fetchHabits();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add habit.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this habit? This cannot be undone.")) return;
    await fetch(`/api/admin/habits/${id}`, { method: "DELETE" });
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  const filtered = search
    ? habits.filter(
        (h) =>
          h.label.toLowerCase().includes(search.toLowerCase()) ||
          h.key.toLowerCase().includes(search.toLowerCase()),
      )
    : habits;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            All Habits ({habits.length})
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
              onClick={() => { setForm(defaultForm); setError(""); setShowAddModal(true); }}
              className={submitClass}
            >
              + Add habit
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No habits found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                  <th className="pb-2 pr-4 font-medium">Key</th>
                  <th className="pb-2 pr-4 font-medium">Label</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Active</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={h.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs text-[var(--text-muted)]">{h.key}</td>
                    <td className="py-2 pr-4 text-[var(--text)]">{h.label}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{h.category}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{h.valueType}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${h.isActive ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--surface-alt)] text-[var(--text-muted)]"}`}>
                        {h.isActive ? "yes" : "no"}
                      </span>
                    </td>
                    <td className="py-2">
                      <button onClick={() => handleDelete(h.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAddModal && (
        <Modal title="Add habit" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Key (unique slug)">
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  required
                  placeholder="e.g. exercise"
                  className={inputClass}
                />
              </Field>
              <Field label="Label">
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  required
                  placeholder="e.g. Exercise"
                  className={inputClass}
                />
              </Field>
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputClass}
                >
                  {HABIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Value Type">
                <select
                  value={form.valueType}
                  onChange={(e) => setForm({ ...form, valueType: e.target.value })}
                  className={inputClass}
                >
                  {HABIT_VALUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description (optional)">
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description…"
                className={inputClass}
              />
            </Field>
            <Field label="Active">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text-muted)]">This habit is active</span>
              </label>
            </Field>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className={`${submitClass} inline-flex items-center gap-2`}>
                {loading && <Spinner light />}
                {loading ? "Adding…" : "Add habit"}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 w-full max-w-lg shadow-lg"
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
