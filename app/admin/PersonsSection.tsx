"use client";

import { useEffect, useState } from "react";
import type { Person } from "@/lib/schema";

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-[20px] shadow-lg w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading font-bold text-lg text-[var(--text)] mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const submitClass =
  "px-4 py-2 rounded-[14px] bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors";
const cancelClass =
  "px-4 py-2 rounded-[14px] bg-[var(--surface-alt)] text-[var(--text-muted)] text-sm font-medium hover:text-[var(--text)] transition-colors";
const inlineInputClass =
  "px-2 py-1 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

export default function PersonsSection() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [fetching, setFetching] = useState(false);
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  async function fetchPersons() {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/persons");
      const json = await res.json();
      setPersons(json);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    fetchPersons();
  }, []);

  async function handleAdd() {
    setAddError("");
    if (!addName.trim()) {
      setAddError("Name is required");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAddError(err.error ?? "Failed to add person");
        return;
      }
      setAddName("");
      setShowAddModal(false);
      fetchPersons();
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(person: Person) {
    setEditingId(person.id);
    setEditName(person.name);
    setDeleteError(null);
  }

  async function saveEdit(id: number) {
    if (!editName.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPersons((prev) => prev.map((p) => (p.id === id ? updated : p)));
        setEditingId(null);
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    setDeleteError(null);
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/admin/persons/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPersons((prev) => prev.filter((p) => p.id !== id));
    } else {
      const err = await res.json();
      setDeleteError({ id, message: err.error ?? "Failed to delete" });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">{persons.length} persons</h2>
        <button onClick={() => { setShowAddModal(true); setAddName(""); setAddError(""); }} className={submitClass}>
          + Add Person
        </button>
      </div>

      {fetching ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : persons.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No persons found.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="pb-2 pr-4">ID</th>
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {persons.map((person) => (
              <tr key={person.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-alt)] transition-colors">
                <td className="py-2 pr-4 text-[var(--text-muted)] font-mono text-xs">{person.id}</td>
                <td className="py-2 pr-4">
                  {editingId === person.id ? (
                    <input
                      autoFocus
                      className={inlineInputClass}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(person.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <span>{person.name}</span>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex flex-col gap-1 items-start">
                    {editingId === person.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(person.id)} disabled={editLoading} className="text-xs text-[var(--accent)] hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-[var(--text-muted)] hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(person)} className="text-xs text-[var(--accent)] hover:underline">Edit</button>
                        <button onClick={() => handleDelete(person.id, person.name)} className="text-xs text-[var(--warm)] hover:underline">Delete</button>
                      </div>
                    )}
                    {deleteError?.id === person.id && (
                      <span className="text-xs text-red-600">{deleteError.message}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddModal && (
        <Modal title="Add Person" onClose={() => setShowAddModal(false)}>
          {addError && <p className="text-sm text-red-600 mb-3">{addError}</p>}
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <input
                autoFocus
                className={inputClass}
                placeholder="Full name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </Field>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddModal(false)} className={cancelClass}>Cancel</button>
              <button onClick={handleAdd} disabled={addLoading} className={submitClass}>
                {addLoading ? "Adding…" : "Add Person"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
