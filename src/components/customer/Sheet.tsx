"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/** Bottom sheet on phones; centred dialog (or right-hand drawer) from md up. */
export function Sheet({
  title,
  onClose,
  side = false,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  side?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/50 transition-opacity duration-200 starting:opacity-0"
      />
      <div
        className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-[1.75rem] bg-card shadow-lift transition-transform duration-300 ease-out starting:translate-y-full ${
          side
            ? "md:absolute md:inset-y-0 md:end-0 md:max-h-none md:w-[26rem] md:rounded-none md:starting:translate-x-full md:starting:translate-y-0"
            : "md:max-h-[88dvh] md:max-w-xl md:rounded-[1.75rem]"
        }`}
      >
        <div className="flex items-center justify-between gap-4 ps-6 pe-3 pt-4 pb-2">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-full bg-paper-2 transition-colors hover:bg-sand active:scale-95"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-6 pb-4">{children}</div>
        {footer && (
          <div className={`bg-paper-2 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${side ? "" : "md:rounded-b-[1.75rem]"}`}>{footer}</div>
        )}
      </div>
    </div>
  );
}
