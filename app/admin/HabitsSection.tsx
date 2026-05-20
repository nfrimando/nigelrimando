"use client";

import React, { useEffect, useState } from "react";
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

type EditForm = {
  label: string;
  description: string;
  category: string;
  valueType: string;
  isActive: boolean;
  isPublic: boolean;
};

export default function HabitsSection() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [editForm, setEditForm] = useState<EditForm>({
    label: "",
    description: "",
    category: "health",
    valueType: "binary",
    isActive: true,
    isPublic: false,
  });
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

  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setEditForm({
      label: habit.label,
      description: habit.description ?? "",
      category: habit.category,
      valueType: habit.valueType,
      isActive: habit.isActive,
      isPublic: habit.isPublic ?? false,
    });
    setError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingHabit) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/admin/habits/${editingHabit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setLoading(false);
    if (res.ok) {
      const updated: Habit = await res.json();
      setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setEditingHabit(null);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update habit.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this habit? This cannot be undone.")) return;
    await fetch(`/api/admin/habits/${id}`, { method: "DELETE" });
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  async function handleTogglePublic(id: number, current: boolean) {
    setHabits((prev) => prev.map((h) => h.id === id ? { ...h, isPublic: !current } : h));
    const res = await fetch(`/api/admin/habits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !current }),
    });
    if (!res.ok) {
      setHabits((prev) => prev.map((h) => h.id === id ? { ...h, isPublic: current } : h));
    }
  }

  const filtered = search
    ? habits.filter(
        (h) =>
          h.label.toLowerCase().includes(search.toLowerCase()) ||
          h.key.toLowerCase().includes(search.toLowerCase()),
      )
    : habits;

  const grouped = HABIT_VALUE_TYPES.map((vt) => ({
    type: vt,
    habits: filtered.filter((h) => h.valueType === vt),
  })).filter((g) => g.habits.length > 0);

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
          <>
            {/* Mobile card list */}
            <div className="sm:hidden flex flex-col">
              {grouped.map((group) => (
                <div key={group.type}>
                  <div className="py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
                    {group.type}
                  </div>
                  <div className="flex flex-col divide-y divide-[var(--border)]">
                    {group.habits.map((h) => (
                      <div key={h.id} className="py-3 cursor-pointer" onClick={() => openEdit(h)}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <span className="font-medium text-sm text-[var(--text)]">{h.label}</span>
                            <span className="ml-2 font-mono text-xs text-[var(--text-muted)]">{h.key}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${h.isActive ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--surface-alt)] text-[var(--text-muted)]"}`}>
                              {h.isActive ? "active" : "inactive"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--text-muted)] mb-2">
                          <span>{h.category}</span>
                          {h.description && <span className="italic">{h.description}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleTogglePublic(h.id, h.isPublic ?? false)}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${h.isPublic ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--surface-alt)] text-[var(--text-muted)]"}`}
                          >
                            {h.isPublic ? "public: on" : "public: off"}
                          </button>
                          <button onClick={() => handleDelete(h.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                    <th className="pb-2 pr-4 font-medium">Key</th>
                    <th className="pb-2 pr-4 font-medium">Label</th>
                    <th className="pb-2 pr-4 font-medium">Description</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Active</th>
                    <th className="pb-2 pr-4 font-medium">Public</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((group) => (
                    <React.Fragment key={group.type}>
                      <tr>
                        <td colSpan={7} className="pt-4 pb-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{group.type}</span>
                        </td>
                      </tr>
                      {group.habits.map((h) => (
                        <tr
                          key={h.id}
                          className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-alt)] transition-colors"
                          onClick={() => openEdit(h)}
                        >
                          <td className="py-2 pr-4 font-mono text-xs text-[var(--text-muted)]">{h.key}</td>
                          <td className="py-2 pr-4 text-[var(--text)]">{h.label}</td>
                          <td className="py-2 pr-4 text-[var(--text-muted)] max-w-xs">{h.description ?? "—"}</td>
                          <td className="py-2 pr-4 text-[var(--text-muted)]">{h.category}</td>
                          <td className="py-2 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${h.isActive ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--surface-alt)] text-[var(--text-muted)]"}`}>
                              {h.isActive ? "yes" : "no"}
                            </span>
                          </td>
                          <td className="py-2 pr-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleTogglePublic(h.id, h.isPublic ?? false)}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${h.isPublic ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--surface-alt)] text-[var(--text-muted)]"}`}
                            >
                              {h.isPublic ? "on" : "off"}
                            </button>
                          </td>
                          <td className="py-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleDelete(h.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Edit Habit Modal */}
      {editingHabit && (
        <Modal title={`Edit: ${editingHabit.key}`} onClose={() => setEditingHabit(null)}>
          <form onSubmit={handleEdit} className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Label">
                <input
                  type="text"
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Category">
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className={inputClass}
                >
                  {HABIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Value Type">
                <select
                  value={editForm.valueType}
                  onChange={(e) => setEditForm({ ...editForm, valueType: e.target.value })}
                  className={inputClass}
                >
                  {HABIT_VALUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description (optional)">
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Short description…"
                className={inputClass}
              />
            </Field>
            <div className="flex items-center gap-6">
              <Field label="Active">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--text-muted)]">Active</span>
                </label>
              </Field>
              <Field label="Public">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isPublic}
                    onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--text-muted)]">Public</span>
                </label>
              </Field>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className={`${submitClass} inline-flex items-center gap-2`}>
                {loading && <Spinner light />}
                {loading ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={() => setEditingHabit(null)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Habit Modal */}
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
