"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "./api";
import type { CategoryData } from "./menu-types";
import { btn, iconBtn, inputCls, Notice } from "./ui";

type Row = Omit<CategoryData, "id"> & { id: string | null };

function CategoryRow({ initial, onDone }: { initial: Row; onDone: () => void }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);

  async function save() {
    setBusy(true);
    const body = { name: f.name, kind: f.kind, sortOrder: f.sortOrder };
    const r = f.id ? await api("PATCH", `/api/admin/categories/${f.id}`, body) : await api("POST", "/api/admin/categories", body);
    setBusy(false);
    if (!r.ok) return setErr(r.error!);
    setErr("");
    router.refresh();
    onDone();
  }

  async function remove() {
    if (!f.id || !confirm(`Delete category "${f.name}" and all of its items?`)) return;
    setBusy(true);
    const r = await api("DELETE", `/api/admin/categories/${f.id}`);
    setBusy(false);
    if (!r.ok) return setErr(r.error!);
    router.refresh();
  }

  return (
    <li className="py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-2 md:grid-cols-[minmax(0,1fr)_9rem_6rem_auto]">
        <input className={`${inputCls} col-span-2 md:col-span-1`} aria-label="Category name" placeholder="Category name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select className={inputCls} aria-label="Kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          <option value="coffee">Coffee</option>
          <option value="restaurant">Restaurant</option>
        </select>
        <input
          className={`${inputCls} tabular`}
          type="number"
          inputMode="numeric"
          min={0}
          aria-label="Sort order"
          title="Sort order"
          value={f.sortOrder}
          onChange={(e) => setF({ ...f, sortOrder: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
        />
        <div className="col-span-2 flex items-center gap-1.5 md:col-span-1">
          <button className={btn("primary", "max-md:flex-1")} disabled={busy || (!dirty && !!f.id)} onClick={save}>
            {f.id ? "Save" : "Add"}
          </button>
          {f.id && (
            <button className={iconBtn} disabled={busy} onClick={remove} aria-label="Delete category" title={`${f.itemCount} items`}>
              <Trash2 className="size-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
      {err && <Notice tone="error">{err}</Notice>}
    </li>
  );
}

export function MenuCategories({ categories }: { categories: CategoryData[] }) {
  const [adding, setAdding] = useState(false);
  const next = Math.max(0, ...categories.map((c) => c.sortOrder)) + 1;
  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Lower sort order appears first on the menu.</p>
        <button className={btn("primary", "max-sm:w-full")} onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          New category
        </button>
      </div>
      <ul className="divide-y divide-line/70 border-y border-line/70">
        {adding && <CategoryRow initial={{ id: null, name: "", kind: "coffee", sortOrder: next, itemCount: 0 }} onDone={() => setAdding(false)} />}
        {categories.map((c) => (
          <CategoryRow key={`${c.id}:${c.name}:${c.kind}:${c.sortOrder}`} initial={c} onDone={() => {}} />
        ))}
      </ul>
    </div>
  );
}
