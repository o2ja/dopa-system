"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useRef, type ReactNode } from "react";
import { gsap, MOTION_OK, ScrollTrigger, SplitText, useGSAP } from "./motion";

/**
 * Landing-page motion: smooth scroll, the hero entrance and ScrollTrigger reveals.
 * Markup hooks: [data-hero-title], [data-hero] (hero parts, in order), [data-reveal] > [data-r] (staggered group), [data-foot-word].
 * Everything is added only under no-preference; with reduced motion the page is plain, fully visible and natively scrolled.
 */
export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // One loop for both: GSAP's ticker drives Lenis, Lenis feeds ScrollTrigger.
        const lenis = new Lenis({ anchors: true });
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (t: number) => lenis.raf(t * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        const title = root.current?.querySelector<HTMLElement>("[data-hero-title]");
        if (title) {
          SplitText.create(title, {
            type: "lines",
            autoSplit: true,
            onSplit: (self) => gsap.from(self.lines, { y: 56, autoAlpha: 0, duration: 1.1, stagger: 0.1, ease: "power4.out" }),
          });
        }
        gsap.from("[data-hero]", { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.12, ease: "power3.out", delay: 0.35 });

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((group) => {
          gsap.from(group.querySelectorAll("[data-r]"), {
            y: 32,
            autoAlpha: 0,
            duration: 0.9,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: { trigger: group, start: "top 82%", once: true },
          });
        });

        gsap.from("[data-foot-word]", {
          yPercent: 24,
          ease: "none",
          scrollTrigger: { trigger: "[data-foot-word]", start: "top bottom", end: "bottom bottom", scrub: true },
        });

        void document.fonts.ready.then(() => ScrollTrigger.refresh());

        return () => {
          gsap.ticker.remove(tick);
          gsap.ticker.lagSmoothing(500, 33);
          lenis.destroy();
        };
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="flex flex-1 flex-col">
      {children}
    </div>
  );
}
