"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "../pos/motion";

/**
 * Panels settle in one after another; bars marked data-grow="y" | "x" grow from their baseline.
 * Server markup is fully visible, so without JS or with reduced motion nothing is ever hidden.
 */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const grow = (axis: "x" | "y") => gsap.utils.toArray<HTMLElement>(`[data-grow="${axis}"]`, root.current);
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        tl.from(root.current!.children, { y: 10, autoAlpha: 0, duration: 0.25, stagger: 0.05, clearProps: "all" });
        if (grow("y").length) tl.from(grow("y"), { scaleY: 0, transformOrigin: "50% 100%", duration: 0.4, stagger: 0.02 }, 0.1);
        if (grow("x").length) tl.from(grow("x"), { scaleX: 0, transformOrigin: "0% 50%", duration: 0.4, stagger: 0.04 }, 0.15);
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
