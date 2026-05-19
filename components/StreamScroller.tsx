"use client";

import { useRef, useState, useEffect } from "react";

export default function StreamScroller({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative -mx-6">
      <div
        ref={ref}
        className="flex overflow-x-auto gap-4 pb-4 px-6 scrollbar-none"
      >
        {children}
      </div>

      {/* Left fade + scroll hint */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-28 bg-gradient-to-r from-bg to-transparent flex items-center justify-start pl-3 transition-opacity duration-200"
        style={{ opacity: atStart ? 0 : 1 }}
      >
        <span className="text-xs font-mono text-muted hidden sm:block">← scroll</span>
      </div>

      {/* Right fade + scroll hint */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-28 bg-gradient-to-l from-bg to-transparent flex items-center justify-end pr-3 transition-opacity duration-200"
        style={{ opacity: atEnd ? 0 : 1 }}
      >
        <span className="text-xs font-mono text-muted hidden sm:block">scroll →</span>
      </div>
    </div>
  );
}
