"use client";

import { useEffect, useState } from "react";
import type { VisitorMessage } from "@/lib/schema";

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? "border-white" : "border-[var(--accent)]"}`}
    />
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const submitClass =
  "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium py-1.5 px-4 rounded-[14px] transition-colors duration-200 disabled:opacity-50 inline-flex items-center gap-2";
const cancelClass =
  "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-medium py-1.5 px-4 rounded-[14px] transition-colors duration-200";

function formatDate(unixSeconds: number) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixSeconds * 1000));
}

function MessageCard({
  msg,
  onSaveReply,
  onDelete,
}: {
  msg: VisitorMessage;
  onSaveReply: (id: number, reply: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState(msg.reply ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(msg.reply ?? "");
  }, [msg.reply]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await onSaveReply(msg.id, draft);
      setReplyOpen(false);
    } catch {
      setError("Failed to save reply.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    await onDelete(msg.id);
  }

  const hasReply = !!msg.reply;

  return (
    <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-[var(--text)]">
            {msg.senderHandle ?? "Anonymous"}
          </span>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {formatDate(msg.createdAt)}
          </span>
          {hasReply ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--success)] bg-[#EAF3EB] px-2 py-0.5 rounded-full">
              Replied
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--warm)] bg-[#F5EDE9] px-2 py-0.5 rounded-full">
              Awaiting reply
            </span>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="text-xs text-[var(--warm)] hover:underline shrink-0"
        >
          Delete
        </button>
      </div>

      <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">
        {msg.message}
      </p>

      {hasReply && !replyOpen && (
        <div className="border-l-2 border-[var(--accent)] pl-3">
          <p className="text-xs text-[var(--text-muted)] mb-1">Your reply</p>
          <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{msg.reply}</p>
          <button
            onClick={() => { setDraft(msg.reply ?? ""); setReplyOpen(true); }}
            className="mt-2 text-xs text-[var(--accent)] hover:underline"
          >
            Edit reply
          </button>
        </div>
      )}

      {!replyOpen && !hasReply && (
        <button
          onClick={() => setReplyOpen(true)}
          className="self-start text-sm text-[var(--accent)] hover:underline font-medium"
        >
          + Reply
        </button>
      )}

      {replyOpen && (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="Write your reply…"
            className={`${inputClass} resize-y`}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className={submitClass}>
              {saving && <Spinner light />}
              {saving ? "Saving…" : "Save reply"}
            </button>
            <button
              onClick={() => { setReplyOpen(false); setDraft(msg.reply ?? ""); }}
              className={cancelClass}
            >
              Cancel
            </button>
            {hasReply && (
              <button
                onClick={async () => {
                  setSaving(true);
                  await onSaveReply(msg.id, "");
                  setSaving(false);
                  setReplyOpen(false);
                }}
                disabled={saving}
                className="text-sm text-[var(--warm)] hover:underline ml-auto"
              >
                Clear reply
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function VisitorMessagesSection() {
  const [messages, setMessages] = useState<VisitorMessage[]>([]);
  const [fetching, setFetching] = useState(false);

  async function load() {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/visitor-messages");
      if (res.ok) setMessages(await res.json());
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSaveReply(id: number, reply: string) {
    const res = await fetch(`/api/admin/visitor-messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    });
    if (!res.ok) throw new Error("Failed");
    const updated: VisitorMessage = await res.json();
    setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }

  async function handleDelete(id: number) {
    await fetch(`/api/admin/visitor-messages/${id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  const unreplied = messages.filter((m) => !m.reply).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-base text-[var(--text)] flex items-center gap-2">
          Visitor Messages ({messages.length})
          {fetching && <Spinner />}
          {unreplied > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--warm)] bg-[#F5EDE9] px-2 py-0.5 rounded-full">
              {unreplied} unreplied
            </span>
          )}
        </h2>
      </div>

      {!fetching && messages.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">No messages yet.</p>
      )}

      {messages.map((msg) => (
        <MessageCard
          key={msg.id}
          msg={msg}
          onSaveReply={handleSaveReply}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
