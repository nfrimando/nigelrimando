"use client";

import { useEffect, useRef, useState } from "react";
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
const inlineInputClass =
  "w-full px-2 py-1 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

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
  const [setScore, setSetScore] = useState({ gamesWon: "", gamesLost: "", videoUrl: "" });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

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
  });
  const [editLoading, setEditLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function personName(id: number) {
    return persons.find((p) => p.id === id)?.name ?? String(id);
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchRows(1, val);
    }, 300);
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
    setSetScore({ gamesWon: "", gamesLost: "", videoUrl: "" });
    const res = await fetch("/api/admin/padel-sets/next-match-id");
    const json = await res.json();
    setCurrentMatchId(json.nextMatchId);
    setShowAddModal(true);
  }

  function swapSides() {
    setMatchForm((f) => ({
      ...f,
      teammateLeft: f.opponentLeft,
      teammateRight: f.opponentRight,
      opponentLeft: f.teammateLeft,
      opponentRight: f.teammateRight,
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
          courtNumber: matchForm.courtNumber
            ? Number(matchForm.courtNumber)
            : null,
          videoUrl: setScore.videoUrl || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAddError(err.error ?? "Failed to save set");
        return;
      }
      setCurrentSetNumber((n) => n + 1);
      setSetScore({ gamesWon: "", gamesLost: "", videoUrl: "" });
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
      courtNumber: row.courtNumber != null ? String(row.courtNumber) : "",
      videoUrl: row.videoUrl ?? "",
    });
  }

  async function saveEdit(id: number) {
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
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setEditingId(null);
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

  const personSelect = (
    value: string,
    onChange: (v: string) => void,
    placeholder?: string,
  ) => (
    <select
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder ?? "Select person"}</option>
      {persons.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );

  const inlinePersonSelect = (value: string, onChange: (v: string) => void) => (
    <select
      className={inlineInputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      {persons.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          placeholder="Search venue or format…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={inputClass + " max-w-xs"}
        />
        <button onClick={openAddModal} className={submitClass}>
          + Add Match
        </button>
      </div>

      {fetching ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No padel sets found.</p>
      ) : (
        <div className="overflow-x-auto">
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
                <th className="pb-2 pr-3">Video</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) =>
                editingId === row.id ? (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border)] bg-[var(--surface-alt)]"
                  >
                    <td className="py-1 pr-2">
                      <input
                        className={inlineInputClass}
                        style={{ width: 50 }}
                        value={editForm.matchId}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            matchId: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className={inlineInputClass}
                        style={{ width: 40 }}
                        value={editForm.setNumber}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            setNumber: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="date"
                        className={inlineInputClass}
                        value={editForm.date}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, date: e.target.value }))
                        }
                      />
                    </td>
                    <td className="py-1 pr-2">
                      {inlinePersonSelect(editForm.teammateLeft, (v) =>
                        setEditForm((f) => ({ ...f, teammateLeft: v })),
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      {inlinePersonSelect(editForm.teammateRight, (v) =>
                        setEditForm((f) => ({ ...f, teammateRight: v })),
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      {inlinePersonSelect(editForm.opponentLeft, (v) =>
                        setEditForm((f) => ({ ...f, opponentLeft: v })),
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      {inlinePersonSelect(editForm.opponentRight, (v) =>
                        setEditForm((f) => ({ ...f, opponentRight: v })),
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className={inlineInputClass}
                        style={{ width: 40 }}
                        value={editForm.gamesWon}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            gamesWon: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className={inlineInputClass}
                        style={{ width: 40 }}
                        value={editForm.gamesLost}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            gamesLost: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className={inlineInputClass}
                        value={editForm.venue}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, venue: e.target.value }))
                        }
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className={inlineInputClass}
                        style={{ width: 120 }}
                        placeholder="https://..."
                        value={editForm.videoUrl}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, videoUrl: e.target.value }))
                        }
                      />
                    </td>
                    <td className="py-1 flex gap-1">
                      <button
                        onClick={() => saveEdit(row.id)}
                        disabled={editLoading}
                        className={submitClass + " text-xs py-1 px-2"}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className={cancelClass + " text-xs py-1 px-2"}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-alt)] transition-colors"
                  >
                    <td className="py-2 pr-3 text-[var(--text-muted)]">
                      {row.matchId}
                    </td>
                    <td className="py-2 pr-3">{row.setNumber}</td>
                    <td className="py-2 pr-3">{row.date}</td>
                    <td className="py-2 pr-3">
                      {personName(row.teammateLeft)}
                    </td>
                    <td className="py-2 pr-3">
                      {personName(row.teammateRight)}
                    </td>
                    <td className="py-2 pr-3">
                      {personName(row.opponentLeft)}
                    </td>
                    <td className="py-2 pr-3">
                      {personName(row.opponentRight)}
                    </td>
                    <td className="py-2 pr-3 font-mono">{row.gamesWon}</td>
                    <td className="py-2 pr-3 font-mono">{row.gamesLost}</td>
                    <td className="py-2 pr-3 text-[var(--text-muted)]">
                      {row.venue ?? "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {row.videoUrl ? (
                        <a
                          href={row.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FF0000] hover:opacity-70 transition-opacity"
                          title="Watch video"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </a>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-2 flex gap-1">
                      <button
                        onClick={() => startEdit(row)}
                        className="text-xs text-[var(--accent)] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-xs text-[var(--warm)] hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
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
            {addPhase === "set" && (
              <span className="ml-4">Sets added: {currentSetNumber - 1}</span>
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
                <Field label="Court #">
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="e.g. 3"
                    value={matchForm.courtNumber}
                    onChange={(e) =>
                      setMatchForm((f) => ({
                        ...f,
                        courtNumber: e.target.value,
                      }))
                    }
                  />
                </Field>
              </>
            )}

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  Players
                </label>
                {addPhase === "set" && (
                  <button
                    type="button"
                    onClick={swapSides}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    ⇄ Swap sides
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Teammate Left">
                  {personSelect(matchForm.teammateLeft, (v) =>
                    setMatchForm((f) => ({ ...f, teammateLeft: v })),
                  )}
                </Field>
                <Field label="Teammate Right">
                  {personSelect(matchForm.teammateRight, (v) =>
                    setMatchForm((f) => ({ ...f, teammateRight: v })),
                  )}
                </Field>
                <Field label="Opponent Left">
                  {personSelect(matchForm.opponentLeft, (v) =>
                    setMatchForm((f) => ({ ...f, opponentLeft: v })),
                  )}
                </Field>
                <Field label="Opponent Right">
                  {personSelect(matchForm.opponentRight, (v) =>
                    setMatchForm((f) => ({ ...f, opponentRight: v })),
                  )}
                </Field>
              </div>
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
