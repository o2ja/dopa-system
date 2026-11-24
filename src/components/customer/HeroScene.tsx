"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Loaded only in the browser, after hydration and an idle moment, so it never competes with the headline or the Order button.
const HeroCup = dynamic(() => import("./HeroCup"), { ssr: false, loading: () => null });

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (cb: () => void) => {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Decorative 3D espresso cup. Static frame under reduced motion, nothing at all without WebGL, paused when scrolled out of view. */
export function HeroScene({ className = "" }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const reduced = useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => true);

  useEffect(() => {
    const t = window.setTimeout(() => hasWebGL() && setReady(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} aria-hidden className={`pointer-events-none ${className}`}>
      {ready && (
        <div className="size-full transition-opacity duration-1000 starting:opacity-0">
          <HeroCup animate={!reduced} running={visible} />
        </div>
      )}
    </div>
  );
}
