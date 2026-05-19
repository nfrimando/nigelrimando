"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

interface Props {
  habits: { id: number; label: string }[];
  selectedId: number;
}

export default function HabitSelector({ habits, selectedId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);

  function handleSelect(id: number) {
    if (id === selectedId || isPending) return;
    setPendingId(id);
    startTransition(() => {
      router.replace(`/journal/habits?habit=${id}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {habits.map((h) => {
        const isSelected = h.id === selectedId;
        const isLoading = isPending && h.id === pendingId;

        return (
          <button
            key={h.id}
            onClick={() => handleSelect(h.id)}
            disabled={isPending}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
              isSelected
                ? "bg-[var(--accent)] text-white"
                : isLoading
                  ? "bg-[var(--surface-alt)] text-[var(--accent)]"
                  : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:bg-[var(--border)]"
            } ${isPending && !isLoading ? "opacity-50" : ""}`}
          >
            {isLoading && (
              <span className="inline-block w-3 h-3 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin shrink-0" />
            )}
            {h.label}
          </button>
        );
      })}
    </div>
  );
}
