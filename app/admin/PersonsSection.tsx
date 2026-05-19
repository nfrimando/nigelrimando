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
  "px-2 py-[7px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] w-full";

type EditState = {
  name: string;
  nickname: string;
  imageUrl: string;
};

export default function PersonsSection() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [fetching, setFetching] = useState(false);
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addNickname, setAddNickname] = useState("");
  const [addImageUrl, setAddImageUrl] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", nickname: "", imageUrl: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [saveError, setSaveError] = useState("");

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
        body: JSON.stringify({ name: addName.trim(), nickname: addNickname.trim(), imageUrl: addImageUrl.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAddError(err.error ?? "Failed to add person");
        return;
      }
      setAddName("");
      setAddNickname("");
      setAddImageUrl("");
      setShowAddModal(false);
      fetchPersons();
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(person: Person) {
    setEditingId(person.id);
    setEditState({
      name: person.name,
      nickname: person.nickname ?? "",
      imageUrl: person.imageUrl ?? "",
    });
    setDeleteError(null);
  }

  async function saveEdit(id: number) {
    if (!editState.name.trim()) return;
    const originalPerson = persons.find((p) => p.id === id)!;
    const optimistic: Person = {
      ...originalPerson,
      name: editState.name.trim(),
      nickname: editState.nickname.trim() || null,
      imageUrl: editState.imageUrl.trim() || null,
    };
    setPersons((prev) => prev.map((p) => (p.id === id ? optimistic : p)));
    setEditingId(null);
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editState.name.trim(),
          nickname: editState.nickname.trim(),
          imageUrl: editState.imageUrl.trim(),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPersons((prev) => prev.map((p) => (p.id === id ? updated : p)));
      } else {
        setPersons((prev) => prev.map((p) => (p.id === id ? originalPerson : p)));
        setEditingId(id);
        setSaveError("Failed to save. Changes reverted.");
        setTimeout(() => setSaveError(""), 3000);
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

  function commitSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length === 0 || trimmed.length >= 3) {
      setCommittedSearch(trimmed);
    }
  }

  const filtered = committedSearch
    ? persons.filter((p) => {
        const q = committedSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.nickname ?? "").toLowerCase().includes(q)
        );
      })
    : persons;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">{persons.length} persons</h2>
        <button
          onClick={() => { setShowAddModal(true); setAddName(""); setAddNickname(""); setAddImageUrl(""); setAddError(""); }}
          className={submitClass}
        >
          + Add Person
        </button>
      </div>

      {saveError && <p className="text-sm text-red-500 mb-3">{saveError}</p>}
      <div className="mb-3">
        <input
          className={inputClass}
          placeholder="Search by name or nickname…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={(e) => commitSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commitSearch(search); }}
        />
      </div>

      {fetching ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{search ? "No matches." : "No persons found."}</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="pb-2 pr-4">ID</th>
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Nickname</th>
              <th className="pb-2 pr-4">Image</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((person) => (
              <tr key={person.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer" onClick={() => editingId !== person.id && startEdit(person)}>
                <td className="py-2 pr-4 text-[var(--text-muted)] font-mono text-xs">{person.id}</td>

                {editingId === person.id ? (
                  <>
                    <td className="py-0 pr-2">
                      <input
                        autoFocus
                        className={inlineInputClass}
                        value={editState.name}
                        onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(person.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    </td>
                    <td className="py-0 pr-2">
                      <input
                        className={inlineInputClass}
                        placeholder="Nickname"
                        value={editState.nickname}
                        onChange={(e) => setEditState((s) => ({ ...s, nickname: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(person.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    </td>
                    <td className="py-0 pr-2">
                      <input
                        className={inlineInputClass}
                        placeholder="https://…"
                        value={editState.imageUrl}
                        onChange={(e) => setEditState((s) => ({ ...s, imageUrl: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(person.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-4">{person.name}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{person.nickname ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {person.imageUrl ? (
                        <img src={person.imageUrl} alt={person.name} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </>
                )}

                <td className="py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-1 items-start">
                    {editingId === person.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(person.id)} disabled={editLoading} className="text-xs text-[var(--accent)] hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-[var(--text-muted)] hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
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
            <Field label="Name *">
              <input
                autoFocus
                className={inputClass}
                placeholder="Full name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </Field>
            <Field label="Nickname">
              <input
                className={inputClass}
                placeholder="e.g. Nige"
                value={addNickname}
                onChange={(e) => setAddNickname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </Field>
            <Field label="Image URL">
              <input
                className={inputClass}
                placeholder="https://…"
                value={addImageUrl}
                onChange={(e) => setAddImageUrl(e.target.value)}
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
