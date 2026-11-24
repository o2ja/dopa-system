"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function LiveRefresh({ at, everyMs = 15_000 }: { at: string; everyMs?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (!document.hidden) start(() => router.refresh());
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, paused]);

  return (
    <button
      type="button"
      onClick={() => setPaused((p) => !p)}
      aria-pressed={!paused}
      title={paused ? "Auto-refresh is paused. Tap to resume." : "Tap to pause auto-refresh"}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-muted transition-colors hover:bg-paper-2"
    >
      <span className={`size-2 rounded-full ${paused ? "bg-line" : "bg-sage"} ${pending ? "animate-pulse" : ""}`} aria-hidden />
      <span className="tabular">{paused ? "Paused" : `Updated ${at}`}</span>
    </button>
  );
}
