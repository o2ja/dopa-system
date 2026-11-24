"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { formatJOD } from "@/lib/money";

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Open/close timeline for modals and drawers: backdrop fades, panel travels `from`.
 * `close()` plays the timeline in reverse, then calls onClose. With reduced motion there is no
 * timeline and close() calls onClose at once, so nothing is ever left hidden.
 */
export function useOverlay<P extends HTMLElement = HTMLDivElement>(onClose: () => void, from: gsap.TweenVars = { y: 24 }, locked = false) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<P>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const closing = useRef(false);
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  });

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      tl.current = gsap
        .timeline({ defaults: { ease: "power2.out" } })
        .from(root.current, { autoAlpha: 0, duration: 0.15 })
        .from(panel.current, { ...from, autoAlpha: 0, duration: 0.22 }, 0);
      return () => {
        tl.current = null;
      };
    });
  });

  const close = useCallback(() => {
    if (locked || closing.current) return;
    const t = tl.current;
    if (!t) return latest.current();
    closing.current = true;
    t.timeScale(1.5)
      .eventCallback("onReverseComplete", () => latest.current())
      .reverse();
  }, [locked]);

  return { root, panel, close };
}

const FORMAT = { jod: formatJOD, int: (n: number) => String(n) };

/** Number that tweens to its new value (money by default). Server text is the final value, so it reads fine without JS. */
export function CountUp({ value, kind = "jod", from, duration = 0.4, className }: { value: number; kind?: keyof typeof FORMAT; from?: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef({ v: from ?? value });

  useGSAP(
    () => {
      const node = ref.current?.firstChild;
      const s = shown.current;
      if (!node || reducedMotion() || s.v === value) {
        s.v = value;
        return;
      }
      const fmt = FORMAT[kind];
      node.nodeValue = fmt(Math.round(s.v));
      gsap.to(s, {
        v: value,
        duration,
        ease: "power2.out",
        overwrite: true,
        onUpdate: () => {
          node.nodeValue = fmt(Math.round(s.v));
        },
      });
    },
    { dependencies: [value] },
  );

  return (
    <span ref={ref} className={className}>
      {FORMAT[kind](value)}
    </span>
  );
}
