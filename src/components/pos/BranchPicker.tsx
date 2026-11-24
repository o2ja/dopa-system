"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, MapPin } from "lucide-react";
import { press } from "./ui";

export default function BranchPicker({ branches, auto }: { branches: { slug: string; name: string; address: string }[]; auto: boolean }) {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("pos-branch");
    if (auto && saved && branches.some((b) => b.slug === saved)) router.replace(`/pos?branch=${saved}`);
  }, [auto, branches, router]);

  const pick = (slug: string) => {
    localStorage.setItem("pos-branch", slug);
    router.push(`/pos?branch=${slug}`);
  };

  return (
    <div className="grid h-full place-items-center overflow-y-auto bg-paper p-4 sm:p-6">
      <div className="w-full max-w-xl">
        <p className="text-sm font-medium text-gold-2">Dopa POS</p>
        <h1 className="mt-1 font-display text-3xl font-medium sm:text-4xl">Which branch is this device for?</h1>
        <p className="mt-2 text-muted">We&apos;ll remember your choice on this device.</p>
        <div className="mt-8 space-y-3">
          {branches.map((b) => (
            <button key={b.slug} onClick={() => pick(b.slug)} className={`flex min-h-20 w-full items-center justify-between rounded-xl border border-line bg-card p-5 text-start hover:border-sand ${press}`}>
              <span>
                <span className="block text-xl font-semibold">{b.name}</span>
                {b.address && (
                  <span className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="size-4" /> {b.address}
                  </span>
                )}
              </span>
              <ChevronRight className="size-6 text-muted rtl:rotate-180" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
