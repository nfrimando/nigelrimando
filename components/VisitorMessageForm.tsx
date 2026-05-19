"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function VisitorMessageForm() {
  const [message, setMessage] = useState("");
  const [senderHandle, setSenderHandle] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/visitor-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), senderHandle: senderHandle.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
      setMessage("");
      setSenderHandle("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <div className="p-5 rounded-[14px] bg-[#EFE8DF] border border-[#D8CFC5]">
        <p className="text-sm font-medium text-[#5E8365]">Message sent — thanks for reaching out.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="vm-message" className="block text-sm font-medium text-text mb-1.5">
          Leave a message
        </label>
        <p className="text-xs text-muted mb-2">Ask a question, say hi, or leave a thought — I read everything.</p>
        <textarea
          id="vm-message"
          required
          maxLength={2000}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a question, say hi, or leave a thought…"
          className="w-full rounded-[14px] border border-[#D8CFC5] bg-white px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:border-[#4E6877] transition resize-none"
        />
      </div>

      <div>
        <label htmlFor="vm-handle" className="block text-sm font-medium text-text mb-1.5">
          Your name or email{" "}
          <span className="text-muted font-normal">(optional)</span>
        </label>
        <input
          id="vm-handle"
          type="text"
          maxLength={200}
          value={senderHandle}
          onChange={(e) => setSenderHandle(e.target.value)}
          placeholder="Anonymous"
          className="w-full rounded-[14px] border border-[#D8CFC5] bg-white px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:border-[#4E6877] transition"
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-500">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || !message.trim()}
        className="rounded-[14px] bg-[#4E6877] hover:bg-[#3E5663] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 transition-colors"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
