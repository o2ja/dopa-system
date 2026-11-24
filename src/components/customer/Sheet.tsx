"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "./motion";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]';

/** Bottom sheet on phones; centred dialog (or right-hand drawer) from md up. Open and close run as one GSAP timeline. */
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
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ reduce: "(prefers-reduced-motion: reduce)", wide: "(min-width: 768px)", always: "(min-width: 0px)" }, (ctx) => {
        const { reduce, wide } = ctx.conditions as { reduce: boolean; wide: boolean };
        const el = panel.current;
        if (!el) return;
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(backdrop.current, { autoAlpha: 0, duration: reduce ? 0.15 : 0.3 }, 0);
        if (reduce) tl.from(el, { autoAlpha: 0, duration: 0.15 }, 0);
        else if (!wide) tl.from(el, { yPercent: 100, duration: 0.55, ease: "power4.out" }, 0);
        else if (side) tl.from(el, { xPercent: 100, duration: 0.5, ease: "power4.out" }, 0);
        else tl.from(el, { y: 28, scale: 0.97, autoAlpha: 0, duration: 0.45 }, 0);
        if (!reduce) tl.from(el.querySelectorAll("[data-sheet-in]"), { y: 14, autoAlpha: 0, duration: 0.4, stagger: 0.05 }, 0.18);
        timeline.current = tl;
        return () => {
          timeline.current = null;
        };
      });
    },
    { scope: root },
  );

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const tl = timeline.current;
    if (!tl) return onCloseRef.current();
    tl.eventCallback("onReverseComplete", () => onCloseRef.current());
    tl.timeScale(1.5).reverse();
  }, []);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !root.current) return;
      const nodes = Array.from(root.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.tabIndex >= 0);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!root.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [close]);

  return (
    <div ref={root} className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button ref={backdrop} type="button" aria-label="Close" tabIndex={-1} onClick={close} className="absolute inset-0 cursor-default bg-ink/40" />
      <div
        ref={panel}
        className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-b-0 border-line bg-card shadow-lift md:border-b ${
          side
            ? "md:absolute md:inset-y-0 md:end-0 md:max-h-none md:w-[26rem] md:rounded-none md:border-y-0 md:border-e-0"
            : "md:max-h-[88dvh] md:max-w-xl md:rounded-2xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4 ps-6 pe-4 pt-5 pb-4">
          <h2 id={titleId} className="min-w-0 font-display text-2xl font-medium leading-tight tracking-tight">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-ink-2 transition-[background-color,transform] hover:bg-paper-2 active:scale-95"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && (
          <div className={`border-t border-line bg-card px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${side ? "" : "md:rounded-b-2xl"}`}>{footer}</div>
        )}
      </div>
    </div>
  );
}
