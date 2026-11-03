"use client";

import React, { useEffect, useState } from "react";
import type { JournalAnswerType, JournalQuestion } from "@/lib/schema";

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? "border-white" : "border-[var(--accent)]"}`}
    />
  );
}

const QUESTION_CATEGORIES = ["day", "work", "relationships", "self", "health"];

type FormState = {
  key: string;
  prompt: string;
  helpText: string;
  category: string;
  answerType: JournalAnswerType;
  isRequired: boolean;
  isDefaultOn: boolean;
  isActive: boolean;
};

const defaultForm: FormState = {
  key: "",
  prompt: "",
  helpText: "",
  category: "day",
  answerType: "text",
  isRequired: false,
  isDefaultOn: true,
  isActive: true,
};

type Flag = "isRequired" | "isDefaultOn" | "isActive";
const FLAGS: { key: Flag; label: string; hint: string }[] = [
  { key: "isRequired", label: "Required", hint: "Part of the minimum entry" },
  { key: "isDefaultOn", label: "On by default", hint: "Pre-selected each night" },
  { key: "isActive", label: "Active", hint: "Off = retired, old answers kept" },
];

export default function JournalQuestionsSection() {
  const [questions, setQuestions] = useState<JournalQuestion[]>([]);
  const [fetching, setFetching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<JournalQuestion | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchQuestions() {
    setFetching(true);
    const res = await fetch("/api/admin/journal-questions");
    if (res.ok) setQuestions(await res.json());
    setFetching(false);
  }

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function patch(id: number, body: Partial<JournalQuestion>) {
    return fetch(`/api/admin/journal-questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function handleToggle(q: JournalQuestion, flag: Flag) {
    setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, [flag]: !q[flag] } : x)));
    const res = await patch(q.id, { [flag]: !q[flag] });
    if (!res.ok) fetchQuestions();
  }

  // Swap sort order with the neighbour above/below.
  async function handleMove(index: number, dir: -1 | 1) {
    const a = questions[index];
    const b = questions[index + dir];
    if (!a || !b) return;
    const next = [...questions];
    next[index] = b;
    next[index + dir] = a;
    // Re-number everything so duplicate sort orders can't stall a move.
    const renumbered = next.map((q, i) => ({ ...q, sortOrder: i + 1 }));
    setQuestions(renumbered);
    const changed = renumbered.filter((q) => questions.find((o) => o.id === q.id)?.sortOrder !== q.sortOrder);
    await Promise.all(changed.map((q) => patch(q.id, { sortOrder: q.sortOrder })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/journal-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setShowAddModal(false);
      fetchQuestions();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add question.");
    }
  }

  function openEdit(q: JournalQuestion) {
    setEditing(q);
    setError("");
    setForm({
      key: q.key,
      prompt: q.prompt,
      helpText: q.helpText ?? "",
      category: q.category ?? "",
      answerType: q.answerType,
      isRequired: q.isRequired,
      isDefaultOn: q.isDefaultOn,
      isActive: q.isActive,
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    setLoading(true);
    const { key: _, ...body } = form;
    const res = await patch(editing.id, body);
    setLoading(false);
    if (res.ok) {
      setEditing(null);
      fetchQuestions();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save.");
    }
  }

  async function handleDelete(q: JournalQuestion) {
    if (!confirm(`Delete "${q.prompt}"?`)) return;
    const res = await fetch(`/api/admin/journal-questions/${q.id}`, { method: "DELETE" });
    if (res.ok) {
      fetchQuestions();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete.");
    }
  }

  function renderForm(onSubmit: (e: React.FormEvent) => void, isEdit: boolean) {
    return (
      <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-2">
        <Field label="Prompt">
          <textarea
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            required
            rows={2}
            placeholder="e.g. What made you laugh today?"
            className={`${inputClass} resize-none`}
          />
        </Field>
        {isEdit && (
          <p className="text-xs text-[var(--text-muted)] -mt-2">
            Rewording is safe — past answers keep the prompt they were written against.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Key (unique slug)">
            <input
              type="text"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              required
              disabled={isEdit}
              placeholder="e.g. laughed"
              className={`${inputClass} disabled:opacity-50`}
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
            >
              <option value="">—</option>
              {QUESTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Answer type">
            <select
              value={form.answerType}
              onChange={(e) => setForm({ ...form, answerType: e.target.value as JournalAnswerType })}
              className={inputClass}
            >
              <option value="text">text</option>
              <option value="scale">scale (1–5)</option>
            </select>
          </Field>
        </div>
        <Field label="Help text (optional)">
          <input
            type="text"
            value={form.helpText}
            onChange={(e) => setForm({ ...form, helpText: e.target.value })}
            placeholder="A nudge shown under the question…"
            className={inputClass}
          />
        </Field>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {FLAGS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 cursor-pointer" title={f.hint}>
              <input
                type="checkbox"
                checked={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                className="w-4 h-4 accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-muted)]">{f.label}</span>
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className={`${submitClass} inline-flex items-center gap-2`}>
            {loading && <Spinner light />}
            {loading ? "Saving…" : isEdit ? "Save changes" : "Add question"}
          </button>
          <button
            type="button"
            onClick={() => (isEdit ? setEditing(null) : setShowAddModal(false))}
            className={cancelClass}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
          <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
            Journal Questions ({questions.length})
            {fetching && <Spinner />}
          </h2>
          <div className="flex items-center gap-3">
            <a href="/admin/journal" className={cancelClass}>Open journal</a>
            <button
              onClick={() => { setForm(defaultForm); setError(""); setShowAddModal(true); }}
              className={submitClass}
            >
              + Add question
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Asked in this order each night (required ones first). Tap a flag to toggle it.
        </p>

        {questions.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No questions yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {questions.map((q, i) => (
              <div key={q.id} className={`py-3 flex items-start gap-3 ${q.isActive ? "" : "opacity-50"}`}>
                <div className="flex flex-col shrink-0 -my-1">
                  <button
                    onClick={() => handleMove(i, -1)}
                    disabled={i === 0}
                    className="text-xs px-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-20"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMove(i, 1)}
                    disabled={i === questions.length - 1}
                    className="text-xs px-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-20"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(q)}>
                  <p className="text-sm text-[var(--text)]">{q.prompt}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--text-muted)] mt-0.5">
                    <span className="font-mono">{q.key}</span>
                    {q.category && <span>{q.category}</span>}
                    <span>{q.answerType === "scale" ? "scale 1–5" : "text"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                    {FLAGS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => handleToggle(q, f.key)}
                        title={f.hint}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                          q[f.key]
                            ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                            : "bg-[var(--surface-alt)] text-[var(--text-muted)]"
                        }`}
                      >
                        {f.label.toLowerCase()}: {q[f.key] ? "on" : "off"}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(q)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <Modal title={`Edit: ${editing.key}`} onClose={() => setEditing(null)}>
          {renderForm(handleEdit, true)}
        </Modal>
      )}

      {showAddModal && (
        <Modal title="Add question" onClose={() => setShowAddModal(false)}>
          {renderForm(handleSubmit, false)}
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
