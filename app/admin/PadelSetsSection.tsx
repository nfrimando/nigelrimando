"use client";

import { useEffect, useState } from "react";
import type { PadelSet, Person } from "@/lib/schema";

const PAGE_SIZE = 25;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
        className="bg-[var(--surface)] rounded-[20px] shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading font-bold text-lg text-[var(--text)] mb-4">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </label>
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

function NoteTooltip({ note }: { note: string }) {
  return (
    <span className="relative group inline-flex items-center">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors cursor-default"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-2.5 py-1.5 rounded-xl bg-[var(--text)] text-white text-xs leading-snug opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30 whitespace-pre-wrap break-words shadow-lg">
        {note}
      </span>
    </span>
  );
}

function PersonCombobox({
  value,
  onChange,
  persons,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  persons: Person[];
  placeholder?: string;
  className?: string;
}) {
  const personLabel = (p: Person) => p.nickname ?? p.name;
  const [inputVal, setInputVal] = useState(() => {
    const p = persons.find((p) => String(p.id) === value);
    return p ? personLabel(p) : "";
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const p = persons.find((p) => String(p.id) === value);
    setInputVal(p ? personLabel(p) : "");
  }, [value, persons]);

  const filtered = inputVal
    ? persons.filter((p) =>
        personLabel(p).toLowerCase().includes(inputVal.toLowerCase()) ||
        p.name.toLowerCase().includes(inputVal.toLowerCase()),
      )
    : persons;

  return (
    <div className="relative">
      <input
        type="text"
        className={className ?? inputClass}
        placeholder={placeholder ?? "Type to search…"}
        value={inputVal}
        onChange={(e) => {
          setInputVal(e.target.value);
          onChange("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <li
              key={p.id}
              onMouseDown={() => {
                onChange(String(p.id));
                setInputVal(personLabel(p));
                setOpen(false);
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-[var(--surface-alt)] text-[var(--text)] first:rounded-t-[14px] last:rounded-b-[14px]"
            >
              {personLabel(p)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type MatchForm = {
  date: string;
  teammateLeft: string;
  teammateRight: string;
  opponentLeft: string;
  opponentRight: string;
  venue: string;
  format: string;
  courtNumber: string;
};

type EditForm = {
  date: string;
  matchId: string;
  setNumber: string;
  teammateLeft: string;
  teammateRight: string;
  opponentLeft: string;
  opponentRight: string;
  gamesWon: string;
  gamesLost: string;
  venue: string;
  format: string;
  courtNumber: string;
  videoUrl: string;
  notes: string;
};

export default function PadelSetsSection() {
  const [rows, setRows] = useState<PadelSet[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addPhase, setAddPhase] = useState<"match" | "set">("match");
  const [currentMatchId, setCurrentMatchId] = useState<number>(1);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [matchForm, setMatchForm] = useState<MatchForm>({
    date: today(),
    teammateLeft: "",
    teammateRight: "",
    opponentLeft: "",
    opponentRight: "",
    venue: "",
    format: "",
    courtNumber: "",
  });
  const [setScore, setSetScore] = useState({ gamesWon: "", gamesLost: "", videoUrl: "", notes: "" });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    date: "",
    matchId: "",
    setNumber: "",
    teammateLeft: "",
    teammateRight: "",
    opponentLeft: "",
    opponentRight: "",
    gamesWon: "",
    gamesLost: "",
    venue: "",
    format: "",
    courtNumber: "",
    videoUrl: "",
    notes: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [saveError, setSaveError] = useState("");

  function personDisplay(id: number) {
    const p = persons.find((p) => p.id === id);
    const label = p?.nickname ?? p?.name ?? String(id);
    if (p?.imageUrl) {
      return (
        <span className="flex items-center gap-1">
          <img src={p.imageUrl} alt={label} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          {label}
        </span>
      );
    }
    return <>{label}</>;
  }

  async function fetchRows(p: number, q: string) {
    setFetching(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(PAGE_SIZE),
        ...(q ? { q } : {}),
      });
      const res = await fetch(`/api/admin/padel-sets?${params}`);
      if (!res.ok) {
        setRows([]);
        setTotalPages(1);
        return;
      }
      const json = await res.json();
      setRows(json.data ?? []);
      setTotalPages(json.totalPages ?? 1);
    } finally {
      setFetching(false);
    }
  }

  async function fetchPersons() {
    const res = await fetch("/api/admin/persons");
    const json = await res.json();
    setPersons(json);
  }

  useEffect(() => {
    fetchPersons();
  }, []);

  useEffect(() => {
    fetchRows(page, search);
  }, [page]);

  function handleSearchChange(val: string) {
    setSearch(val);
  }

  function commitSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length === 0 || trimmed.length >= 3) {
      setPage(1);
      fetchRows(1, trimmed);
    }
  }

  async function openAddModal() {
    setAddError("");
    setAddPhase("match");
    setCurrentSetNumber(1);
    setMatchForm({
      date: today(),
      teammateLeft: "",
      teammateRight: "",
      opponentLeft: "",
      opponentRight: "",
      venue: "",
      format: "",
      courtNumber: "",
    });
    setSetScore({ gamesWon: "", gamesLost: "", videoUrl: "", notes: "" });
    const res = await fetch("/api/admin/padel-sets/next-match-id");
    const json = await res.json();
    setCurrentMatchId(json.nextMatchId);
    setShowAddModal(true);
  }

  function swapTeam1() {
    setMatchForm((f) => ({
      ...f,
      teammateLeft: f.teammateRight,
      teammateRight: f.teammateLeft,
    }));
  }

  function swapTeam2() {
    setMatchForm((f) => ({
      ...f,
      opponentLeft: f.opponentRight,
      opponentRight: f.opponentLeft,
    }));
  }

  async function handleSaveSet() {
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/padel-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: matchForm.date,
          matchId: currentMatchId,
          setNumber: currentSetNumber,
          teammateLeft: Number(matchForm.teammateLeft),
          teammateRight: Number(matchForm.teammateRight),
          opponentLeft: Number(matchForm.opponentLeft),
          opponentRight: Number(matchForm.opponentRight),
          gamesWon: Number(setScore.gamesWon),
          gamesLost: Number(setScore.gamesLost),
          venue: matchForm.venue || null,
          format: matchForm.format || null,
          courtNumber: matchForm.courtNumber || null,
          videoUrl: setScore.videoUrl || null,
          notes: setScore.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAddError(err.error ?? "Failed to save set");
        return;
      }
      setCurrentSetNumber((n) => n + 1);
      setSetScore({ gamesWon: "", gamesLost: "", videoUrl: "", notes: "" });
      setAddPhase("set");
      fetchRows(1, search);
      setPage(1);
    } finally {
      setAddLoading(false);
    }
  }

  function handleDone() {
    setShowAddModal(false);
  }

  function openAddSetToMatch(row: PadelSet) {
    const matchSets = rows.filter((r) => r.matchId === row.matchId);
    const maxSetNum = Math.max(...matchSets.map((r) => r.setNumber));
    setAddError("");
    setCurrentMatchId(row.matchId);
    setCurrentSetNumber(maxSetNum + 1);
    setMatchForm({
      date: row.date,
      teammateLeft: String(row.teammateLeft),
      teammateRight: String(row.teammateRight),
      opponentLeft: String(row.opponentLeft),
      opponentRight: String(row.opponentRight),
      venue: row.venue ?? "",
      format: row.format ?? "",
      courtNumber: row.courtNumber ?? "",
    });
    setSetScore({ gamesWon: "", gamesLost: "", videoUrl: "", notes: "" });
    setAddPhase("set");
    setShowAddModal(true);
  }

  function startEdit(row: PadelSet) {
    setEditingId(row.id);
    setEditForm({
      date: row.date,
      matchId: String(row.matchId),
      setNumber: String(row.setNumber),
      teammateLeft: String(row.teammateLeft),
      teammateRight: String(row.teammateRight),
      opponentLeft: String(row.opponentLeft),
      opponentRight: String(row.opponentRight),
      gamesWon: String(row.gamesWon),
      gamesLost: String(row.gamesLost),
      venue: row.venue ?? "",
      format: row.format ?? "",
      courtNumber: row.courtNumber ?? "",
      videoUrl: row.videoUrl ?? "",
      notes: row.notes ?? "",
    });
    setShowEditModal(true);
  }

  async function saveEdit(id: number) {
    const originalRow = rows.find((r) => r.id === id)!;
    const optimistic: PadelSet = {
      ...originalRow,
      date: editForm.date,
      matchId: Number(editForm.matchId),
      setNumber: Number(editForm.setNumber),
      teammateLeft: editForm.teammateLeft ? Number(editForm.teammateLeft) : originalRow.teammateLeft,
      teammateRight: editForm.teammateRight ? Number(editForm.teammateRight) : originalRow.teammateRight,
      opponentLeft: editForm.opponentLeft ? Number(editForm.opponentLeft) : originalRow.opponentLeft,
      opponentRight: editForm.opponentRight ? Number(editForm.opponentRight) : originalRow.opponentRight,
      gamesWon: Number(editForm.gamesWon),
      gamesLost: Number(editForm.gamesLost),
      venue: editForm.venue || null,
      format: editForm.format || null,
      courtNumber: editForm.courtNumber || null,
      videoUrl: editForm.videoUrl || null,
      notes: editForm.notes || null,
    };
    setRows((prev) => prev.map((r) => (r.id === id ? optimistic : r)));
    setEditingId(null);
    setShowEditModal(false);
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/padel-sets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editForm.date,
          matchId: editForm.matchId,
          setNumber: editForm.setNumber,
          teammateLeft: editForm.teammateLeft,
          teammateRight: editForm.teammateRight,
          opponentLeft: editForm.opponentLeft,
          opponentRight: editForm.opponentRight,
          gamesWon: editForm.gamesWon,
          gamesLost: editForm.gamesLost,
          venue: editForm.venue,
          format: editForm.format,
          courtNumber: editForm.courtNumber,
          videoUrl: editForm.videoUrl,
          notes: editForm.notes,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      } else {
        setRows((prev) => prev.map((r) => (r.id === id ? originalRow : r)));
        setSaveError("Failed to save. Changes reverted.");
        setTimeout(() => setSaveError(""), 3000);
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this set?")) return;
    await fetch(`/api/admin/padel-sets/${id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          placeholder="Search venue, format, or player…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onBlur={(e) => commitSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commitSearch(search); }}
          className={inputClass + " max-w-xs"}
        />
        <button onClick={openAddModal} className={submitClass}>
          + Add Match
        </button>
      </div>

      {saveError && <p className="text-sm text-red-500 mb-3">{saveError}</p>}

      {fetching ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No padel sets found.</p>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden flex flex-col divide-y divide-[var(--border)]">
            {rows.reduce<{ els: React.ReactNode[]; lastDate: string | null }>(
              ({ els, lastDate }, row, i) => {
                if (row.date !== lastDate) {
                  els.push(
                    <div key={`date-${row.date}-${i}`} className="py-2 px-1 bg-[var(--surface-alt)]">
                      <span className="text-xs font-semibold text-[var(--accent)] tracking-wide uppercase">{row.date}</span>
                    </div>
                  );
                }
                const won = row.gamesWon > row.gamesLost;
                const lost = row.gamesWon < row.gamesLost;
                els.push(
                  <div key={row.id} className="py-3 cursor-pointer" onClick={() => startEdit(row)}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-[var(--text-muted)]">
                        Match {row.matchId} · Set {row.setNumber}
                        {row.venue ? ` · ${row.venue}` : ""}
                        {row.courtNumber ? ` · ${row.courtNumber}` : ""}
                      </span>
                      <span className={`font-mono font-bold text-sm shrink-0 ${won ? "text-[var(--success)]" : lost ? "text-[var(--warm)]" : "text-[var(--text-muted)]"}`}>
                        {row.gamesWon}–{row.gamesLost}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-1 gap-y-0.5 text-xs text-[var(--text-muted)] mb-2 items-center">
                      <span className="flex items-center gap-1">{personDisplay(row.teammateLeft)}</span>
                      <span>/</span>
                      <span className="flex items-center gap-1">{personDisplay(row.teammateRight)}</span>
                      <span className="mx-1">vs</span>
                      <span className="flex items-center gap-1">{personDisplay(row.opponentLeft)}</span>
                      <span>/</span>
                      <span className="flex items-center gap-1">{personDisplay(row.opponentRight)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {row.videoUrl ? (
                          <a href={row.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[#FF0000] hover:opacity-70 transition-opacity" title="Watch video">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </a>
                        ) : null}
                        {row.notes ? <NoteTooltip note={row.notes} /> : null}
                      </div>
                      <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(row.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Del</button>
                      </div>
                    </div>
                  </div>
                );
                return { els, lastDate: row.date };
              },
              { els: [], lastDate: null }
            ).els}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="pb-2 pr-3">Match</th>
                  <th className="pb-2 pr-3">Set</th>
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">TM L</th>
                  <th className="pb-2 pr-3">TM R</th>
                  <th className="pb-2 pr-3">OPP L</th>
                  <th className="pb-2 pr-3">OPP R</th>
                  <th className="pb-2 pr-3">Won</th>
                  <th className="pb-2 pr-3">Lost</th>
                  <th className="pb-2 pr-3">Venue</th>
                  <th className="pb-2 pr-3">Court</th>
                  <th className="pb-2 pr-3">Video</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.reduce<{ els: React.ReactNode[]; lastDate: string | null }>(
                  ({ els, lastDate }, row, i) => {
                    if (row.date !== lastDate) {
                      els.push(
                        <tr key={`date-${row.date}-${i}`} className="bg-[var(--surface-alt)]">
                          <td colSpan={13} className="py-1.5 px-3">
                            <span className="text-xs font-semibold text-[var(--accent)] tracking-wide uppercase">{row.date}</span>
                          </td>
                        </tr>
                      );
                    }
                    els.push(
                      <tr
                        key={row.id}
                        className="border-b border-[var(--border)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                        onClick={() => startEdit(row)}
                      >
                        <td className="py-2 pr-3 text-[var(--text-muted)]">{row.matchId}</td>
                        <td className="py-2 pr-3">{row.setNumber}</td>
                        <td className="py-2 pr-3">{row.date}</td>
                        <td className="py-2 pr-3">{personDisplay(row.teammateLeft)}</td>
                        <td className="py-2 pr-3">{personDisplay(row.teammateRight)}</td>
                        <td className="py-2 pr-3">{personDisplay(row.opponentLeft)}</td>
                        <td className="py-2 pr-3">{personDisplay(row.opponentRight)}</td>
                        <td className="py-2 pr-3 font-mono">{row.gamesWon}</td>
                        <td className="py-2 pr-3 font-mono">{row.gamesLost}</td>
                        <td className="py-2 pr-3 text-[var(--text-muted)]">{row.venue ?? "—"}</td>
                        <td className="py-2 pr-3 text-[var(--text-muted)]">{row.courtNumber ?? "—"}</td>
                        <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            {row.videoUrl ? (
                              <a href={row.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[#FF0000] hover:opacity-70 transition-opacity" title="Watch video">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                              </a>
                            ) : null}
                            {row.notes ? <NoteTooltip note={row.notes} /> : null}
                            {!row.videoUrl && !row.notes && <span className="text-[var(--text-muted)]">—</span>}
                          </div>
                        </td>
                        <td className="py-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openAddSetToMatch(row)} className="text-xs text-[var(--accent)] hover:underline">+ Set</button>
                          <button onClick={() => handleDelete(row.id)} className="text-xs text-[var(--warm)] hover:underline">Delete</button>
                        </td>
                      </tr>
                    );
                    return { els, lastDate: row.date };
                  },
                  { els: [], lastDate: null }
                ).els}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-3 mt-4 text-sm text-[var(--text-muted)]">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            className={cancelClass + " disabled:opacity-40"}
          >
            ← Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages}
            className={cancelClass + " disabled:opacity-40"}
          >
            Next →
          </button>
        </div>
      )}

      {showEditModal && editingId !== null && (
        <Modal title="Edit Set" onClose={() => setShowEditModal(false)}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Date">
              <input
                type="date"
                className={inputClass}
                value={editForm.date}
                onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
              />
            </Field>
            <Field label="Match ID">
              <input
                className={inputClass}
                value={editForm.matchId}
                onChange={(e) => setEditForm((f) => ({ ...f, matchId: e.target.value }))}
              />
            </Field>
            <Field label="Set Number">
              <input
                className={inputClass}
                value={editForm.setNumber}
                onChange={(e) => setEditForm((f) => ({ ...f, setNumber: e.target.value }))}
              />
            </Field>
            <Field label="Games Won">
              <input
                className={inputClass}
                value={editForm.gamesWon}
                onChange={(e) => setEditForm((f) => ({ ...f, gamesWon: e.target.value }))}
              />
            </Field>
            <Field label="Games Lost">
              <input
                className={inputClass}
                value={editForm.gamesLost}
                onChange={(e) => setEditForm((f) => ({ ...f, gamesLost: e.target.value }))}
              />
            </Field>
            <Field label="Venue">
              <datalist id="edit-venue-options">
                <option value="Alabang Country Club" />
                <option value="Amare Padel Umalas" />
                <option value="Bali Padel Academy" />
                <option value="Bohol Padel Club" />
                <option value="Canggu Padel" />
                <option value="Island Padel" />
                <option value="Manila Polo Club" />
                <option value="Monster Padel" />
                <option value="MPC Arcovia" />
                <option value="MPC BGC" />
                <option value="Nordic House La Union" />
                <option value="Oca Padel Social" />
                <option value="Padel 300" />
                <option value="Palm Beach" />
                <option value="Play Padel Mandaluyong" />
                <option value="Play Padel Mckinley" />
                <option value="Play Padel Taguig" />
                <option value="Pro Padel Bali" />
                <option value="Unilab" />
              </datalist>
              <input
                list="edit-venue-options"
                className={inputClass}
                value={editForm.venue}
                onChange={(e) => setEditForm((f) => ({ ...f, venue: e.target.value }))}
              />
            </Field>
            <Field label="Court">
              <datalist id="edit-court-options">
                <option value="1" />
                <option value="2" />
                <option value="3" />
                <option value="4" />
                <option value="Terracotta" />
                <option value="Glass" />
                <option value="Center" />
                <option value="Indoor" />
                <option value="Outdoor" />
              </datalist>
              <input
                list="edit-court-options"
                className={inputClass}
                value={editForm.courtNumber}
                onChange={(e) => setEditForm((f) => ({ ...f, courtNumber: e.target.value }))}
              />
            </Field>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  Players
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Teammate Left">
                  <PersonCombobox
                    value={editForm.teammateLeft}
                    onChange={(v) => setEditForm((f) => ({ ...f, teammateLeft: v }))}
                    persons={persons}
                  />
                </Field>
                <Field label="Teammate Right">
                  <PersonCombobox
                    value={editForm.teammateRight}
                    onChange={(v) => setEditForm((f) => ({ ...f, teammateRight: v }))}
                    persons={persons}
                  />
                </Field>
                <Field label="Opponent Left">
                  <PersonCombobox
                    value={editForm.opponentLeft}
                    onChange={(v) => setEditForm((f) => ({ ...f, opponentLeft: v }))}
                    persons={persons}
                  />
                </Field>
                <Field label="Opponent Right">
                  <PersonCombobox
                    value={editForm.opponentRight}
                    onChange={(v) => setEditForm((f) => ({ ...f, opponentRight: v }))}
                    persons={persons}
                  />
                </Field>
              </div>
            </div>
            <div className="col-span-2">
              <Field label="Video URL (optional)">
                <input
                  type="url"
                  className={inputClass}
                  placeholder="https://youtube.com/watch?v=..."
                  value={editForm.videoUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, videoUrl: e.target.value }))}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Notes (optional)">
                <textarea
                  className={inputClass + " resize-none"}
                  rows={2}
                  placeholder="e.g. wind was strong, tried new serve…"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </Field>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowEditModal(false)} className={cancelClass}>
              Cancel
            </button>
            <button
              onClick={() => saveEdit(editingId)}
              disabled={editLoading}
              className={submitClass}
            >
              {editLoading ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {showAddModal && (
        <Modal
          title={
            addPhase === "match" ? "Add Match" : `Add Set ${currentSetNumber}`
          }
          onClose={handleDone}
        >
          {addError && <p className="text-sm text-red-600 mb-3">{addError}</p>}

          <div className="text-xs text-[var(--text-muted)] mb-4">
            Match ID:{" "}
            <span className="font-mono font-bold text-[var(--text)]">
              {currentMatchId}
            </span>
            {addPhase === "set" && matchForm.date && (
              <span className="ml-2">· {matchForm.date}</span>
            )}
            {addPhase === "set" && matchForm.venue && (
              <span className="ml-2">· {matchForm.venue}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {addPhase === "match" && (
              <>
                <Field label="Date">
                  <input
                    type="date"
                    className={inputClass}
                    value={matchForm.date}
                    onChange={(e) =>
                      setMatchForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Venue">
                  <datalist id="venue-options">
                    <option value="Alabang Country Club" />
                    <option value="Amare Padel Umalas" />
                    <option value="Bali Padel Academy" />
                    <option value="Bohol Padel Club" />
                    <option value="Canggu Padel" />
                    <option value="Island Padel" />
                    <option value="Manila Polo Club" />
                    <option value="Monster Padel" />
                    <option value="MPC Arcovia" />
                    <option value="MPC BGC" />
                    <option value="Nordic House La Union" />
                    <option value="Oca Padel Social" />
                    <option value="Padel 300" />
                    <option value="Palm Beach" />
                    <option value="Play Padel Mandaluyong" />
                    <option value="Play Padel Mckinley" />
                    <option value="Play Padel Taguig" />
                    <option value="Pro Padel Bali" />
                    <option value="Unilab" />
                  </datalist>
                  <input
                    list="venue-options"
                    className={inputClass}
                    placeholder="Select or type venue"
                    value={matchForm.venue}
                    onChange={(e) =>
                      setMatchForm((f) => ({ ...f, venue: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Format">
                  <datalist id="format-options">
                    <option value="golden point" />
                    <option value="one deuce, one golden" />
                    <option value="regular deuce" />
                    <option value="two deuce, one golden" />
                  </datalist>
                  <input
                    list="format-options"
                    className={inputClass}
                    placeholder="Select or type format"
                    value={matchForm.format}
                    onChange={(e) =>
                      setMatchForm((f) => ({ ...f, format: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Court">
                  <datalist id="court-options">
                    <option value="1" />
                    <option value="2" />
                    <option value="3" />
                    <option value="4" />
                    <option value="Terracotta" />
                    <option value="Glass" />
                    <option value="Center" />
                    <option value="Indoor" />
                    <option value="Outdoor" />
                  </datalist>
                  <input
                    list="court-options"
                    className={inputClass}
                    placeholder="e.g. 3 or Terracotta"
                    value={matchForm.courtNumber}
                    onChange={(e) =>
                      setMatchForm((f) => ({ ...f, courtNumber: e.target.value }))
                    }
                  />
                </Field>
              </>
            )}

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  Players
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={swapTeam1}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    ⇄ Swap T1
                  </button>
                  <button
                    type="button"
                    onClick={swapTeam2}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    ⇄ Swap T2
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Teammate Left">
                  <PersonCombobox
                    value={matchForm.teammateLeft}
                    onChange={(v) => setMatchForm((f) => ({ ...f, teammateLeft: v }))}
                    persons={persons}
                  />
                </Field>
                <Field label="Teammate Right">
                  <PersonCombobox
                    value={matchForm.teammateRight}
                    onChange={(v) => setMatchForm((f) => ({ ...f, teammateRight: v }))}
                    persons={persons}
                  />
                </Field>
                <Field label="Opponent Left">
                  <PersonCombobox
                    value={matchForm.opponentLeft}
                    onChange={(v) => setMatchForm((f) => ({ ...f, opponentLeft: v }))}
                    persons={persons}
                  />
                </Field>
                <Field label="Opponent Right">
                  <PersonCombobox
                    value={matchForm.opponentRight}
                    onChange={(v) => setMatchForm((f) => ({ ...f, opponentRight: v }))}
                    persons={persons}
                  />
                </Field>
              </div>
            </div>

            <div className="col-span-2">
              <Field label="Video URL (optional)">
                <input
                  type="url"
                  className={inputClass}
                  placeholder="https://youtube.com/watch?v=..."
                  value={setScore.videoUrl}
                  onChange={(e) =>
                    setSetScore((s) => ({ ...s, videoUrl: e.target.value }))
                  }
                />
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Notes (optional)">
                <textarea
                  className={inputClass + " resize-none"}
                  rows={2}
                  placeholder="e.g. wind was strong, tried new serve…"
                  value={setScore.notes}
                  onChange={(e) =>
                    setSetScore((s) => ({ ...s, notes: e.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label="Games Won">
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="e.g. 6"
                value={setScore.gamesWon}
                onChange={(e) =>
                  setSetScore((s) => ({ ...s, gamesWon: e.target.value }))
                }
              />
            </Field>
            <Field label="Games Lost">
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="e.g. 4"
                value={setScore.gamesLost}
                onChange={(e) =>
                  setSetScore((s) => ({ ...s, gamesLost: e.target.value }))
                }
              />
            </Field>
          </div>

          <div className="flex gap-2 justify-end">
            {addPhase === "set" && (
              <button onClick={handleDone} className={cancelClass}>
                Done
              </button>
            )}
            <button
              onClick={handleSaveSet}
              disabled={addLoading}
              className={submitClass}
            >
              {addLoading
                ? "Saving…"
                : addPhase === "match"
                  ? "Save Set 1"
                  : `Save Set ${currentSetNumber}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
