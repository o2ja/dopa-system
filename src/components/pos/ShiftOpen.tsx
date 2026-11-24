"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "./api";
import { gsap, MOTION_OK, useGSAP } from "./motion";
import { Field, inputCls, press } from "./ui";
import { toFils } from "@/lib/money";
import type { Shift } from "./types";

export default function ShiftOpen({ branchId, branchName, defaultName, onOpen }: { branchId: string; branchName: string; defaultName: string; onOpen: (s: Shift) => void }) {
  const [name, setName] = useState(defaultName);
  const [float, setFloat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const card = useRef<HTMLFormElement>(null);

  useGSAP(() => {
    gsap.matchMedia().add(MOTION_OK, () => {
      gsap.from(card.current, { y: 16, autoAlpha: 0, duration: 0.25, ease: "power2.out" });
    });
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { shift } = await api<{ shift: Shift }>("/api/shifts", { branchId, cashierName: name, openingFloat: toFils(float || 0) });
      localStorage.setItem("pos-cashier", name.trim());
      onOpen(shift);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="grid h-full place-items-center overflow-y-auto bg-paper p-4 sm:p-6">
      <form ref={card} onSubmit={submit} className="w-full max-w-md rounded-card border border-line bg-card p-6 sm:p-8">
        <p className="text-sm text-gold-2">{branchName}</p>
        <h1 className="mt-1 font-display text-3xl font-medium">Open shift</h1>
        <p className="mt-2 text-muted">Enter your name and the cash in the drawer before you start.</p>
        <div className="mt-8 space-y-5">
          <Field label="Cashier name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoFocus />
          </Field>
          <Field label="Opening float (JOD)">
            <input className={`${inputCls} tabular`} inputMode="decimal" value={float} onChange={(e) => setFloat(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.000" required />
          </Field>
        </div>
        {error && <p className="mt-4 text-wine">{error}</p>}
        <button
          disabled={busy || !name.trim() || float === ""}
          className={`mt-8 flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-ink text-lg font-semibold text-paper disabled:opacity-40 ${press}`}
        >
          {busy && <Loader2 className="size-5 animate-spin" />}
          Open shift
        </button>
      </form>
    </div>
  );
}
