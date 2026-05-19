"use client";

import { useEffect, useState } from "react";
import type { Exercise } from "@/lib/schema";

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? "border-white" : "border-[var(--accent)]"}`}
    />
  );
}

const EXERCISE_TYPES = ["reps", "seconds", "distance", "duration"];

const defaultForm = {
  name: "",
  type: "reps",
  primaryTarget: "",
  secondaryTarget: "",
};

export default function ExercisesSection() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  async function fetchExercises() {
    setFetching(true);
    const res = await fetch("/api/admin/exercises");
    if (res.ok) setExercises(await res.json());
    setFetching(false);
  }

  useEffect(() => {
    fetchExercises();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setForm(defaultForm);
      setShowAddModal(false);
      fetchExercises();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add exercise.");
    }
  }

  function openEdit(ex: Exercise) {
    setEditingExercise(ex);
    setForm({
      name: ex.name,
      type: ex.type,
      primaryTarget: ex.primaryTarget,
      secondaryTarget: ex.secondaryTarget ?? "",
    });
    setError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExercise) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/admin/exercises/${editingExercise.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      const updated: Exercise = await res.json();
      setExercises((prev) => prev.map((ex) => (ex.id === updated.id ? updated : ex)));
      setEditingExercise(null);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update exercise.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this exercise? This cannot be undone.")) return;
    await fetch(`/api/admin/exercises/${id}`, { method: "DELETE" });
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  const filtered = search
    ? exercises.filter((ex) => ex.name.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            All Exercises ({exercises.length})
            {fetching && <Spinner />}
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name…"
              className={`${inputClass} max-w-[180px]`}
            />
            <button
              onClick={() => { setForm(defaultForm); setError(""); setShowAddModal(true); }}
              className={submitClass}
            >
              + Add exercise
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No exercises found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Primary</th>
                  <th className="pb-2 pr-4 font-medium">Secondary</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ex) => (
                  <tr key={ex.id} className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-alt)] transition-colors" onClick={() => openEdit(ex)}>
                    <td className="py-2 pr-4 text-[var(--text)]">{ex.name}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{ex.type}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{ex.primaryTarget}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{ex.secondaryTarget ?? "—"}</td>
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(ex.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit Exercise Modal */}
      {editingExercise && (
        <Modal title="Edit exercise" onClose={() => setEditingExercise(null)}>
          <form onSubmit={handleEdit} className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name">
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Squat" className={inputClass} />
              </Field>
              <Field label="Type">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                  {EXERCISE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Primary Target">
                <input type="text" value={form.primaryTarget} onChange={(e) => setForm({ ...form, primaryTarget: e.target.value })} required placeholder="e.g. Quads" className={inputClass} />
              </Field>
              <Field label="Secondary Target (optional)">
                <input type="text" value={form.secondaryTarget} onChange={(e) => setForm({ ...form, secondaryTarget: e.target.value })} placeholder="e.g. Glutes" className={inputClass} />
              </Field>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className={`${submitClass} inline-flex items-center gap-2`}>
                {loading && <Spinner light />}
                {loading ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={() => setEditingExercise(null)} className={cancelClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Exercise Modal */}
      {showAddModal && (
        <Modal title="Add exercise" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name">
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Squat" className={inputClass} />
              </Field>
              <Field label="Type">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                  {EXERCISE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Primary Target">
                <input type="text" value={form.primaryTarget} onChange={(e) => setForm({ ...form, primaryTarget: e.target.value })} required placeholder="e.g. Quads" className={inputClass} />
              </Field>
              <Field label="Secondary Target (optional)">
                <input type="text" value={form.secondaryTarget} onChange={(e) => setForm({ ...form, secondaryTarget: e.target.value })} placeholder="e.g. Glutes" className={inputClass} />
              </Field>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className={`${submitClass} inline-flex items-center gap-2`}>
                {loading && <Spinner light />}
                {loading ? "Adding…" : "Add exercise"}
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
