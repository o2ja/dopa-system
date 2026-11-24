"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { api } from "./api";
import { type GroupData, jod, parseJod } from "./menu-types";
import { btn, Field, iconBtn, inputCls, Notice } from "./ui";

interface Form {
  id: string | null;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: { name: string; price: string }[];
}

const toForm = (g: GroupData): Form => ({ ...g, modifiers: g.modifiers.map((m) => ({ ...m, price: jod(m.price) })) });
const blank: Form = { id: null, name: "", minSelect: 0, maxSelect: 1, modifiers: [{ name: "", price: "0" }] };
const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));

export function MenuGroups({ groups }: { groups: GroupData[] }) {
  const [editing, setEditing] = useState<Form | null>(null);
  const router = useRouter();

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_30rem]">
      <div className={editing ? "hidden xl:block" : ""}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-sm text-muted">Groups such as milk type or extras. Attach them to items from the item editor.</p>
          <button className={btn("primary", "max-sm:w-full")} onClick={() => setEditing(blank)}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            New group
          </button>
        </div>
        {groups.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">No modifier groups yet.</p>
        ) : (
          <ul className="divide-y divide-line/70 border-y border-line/70">
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  className={`flex min-h-16 w-full items-center justify-between gap-4 px-2 py-3 text-start transition-colors ${editing?.id === g.id ? "bg-paper-2" : "hover:bg-paper-2/60"}`}
                  onClick={() => setEditing(toForm(g))}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{g.name}</span>
                    <span className="block truncate text-xs text-muted">{g.modifiers.map((m) => m.name).join(", ") || "No modifiers"}</span>
                  </span>
                  <span className="shrink-0 text-end text-xs text-muted">
                    {g.minSelect > 0 ? "Required · " : ""}
                    {g.itemCount} {g.itemCount === 1 ? "item" : "items"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {editing && (
        <GroupEditor
          key={editing.id ?? "new"}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={(f) => {
            setEditing(f);
            router.refresh();
          }}
          onDeleted={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function GroupEditor({ initial, onClose, onSaved, onDeleted }: { initial: Form; onClose: () => void; onSaved: (f: Form) => void; onDeleted: () => void }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const setMod = (i: number, patch: Partial<Form["modifiers"][number]>) => setF({ ...f, modifiers: f.modifiers.map((m, j) => (j === i ? { ...m, ...patch } : m)) });

  async function save() {
    const modifiers = f.modifiers.map((m) => ({ ...m, price: parseJod(m.price) }));
    if (!f.name.trim()) return setMsg({ tone: "error", text: "Name is required" });
    if (modifiers.some((m) => m.price === null || !m.name.trim())) return setMsg({ tone: "error", text: "Complete every modifier name and price" });
    if (f.maxSelect < 1 || f.minSelect > f.maxSelect) return setMsg({ tone: "error", text: "Minimum cannot exceed maximum, and maximum must be at least 1" });
    setBusy(true);
    const body = { name: f.name, minSelect: f.minSelect, maxSelect: f.maxSelect, modifiers };
    const r = f.id
      ? await api<{ group: { id: string } }>("PATCH", `/api/admin/modifier-groups/${f.id}`, body)
      : await api<{ group: { id: string } }>("POST", "/api/admin/modifier-groups", body);
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "error", text: r.error! });
    setMsg({ tone: "ok", text: "Saved" });
    onSaved({ ...f, id: r.data.group.id });
  }

  async function remove() {
    if (!f.id || !confirm(`Delete group "${f.name}"? It will be detached from every item.`)) return;
    setBusy(true);
    const r = await api("DELETE", `/api/admin/modifier-groups/${f.id}`);
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "error", text: r.error! });
    onDeleted();
  }

  return (
    <aside className="scroll-thin xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:self-start xl:overflow-y-auto xl:pe-1">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{f.id ? "Edit group" : "New group"}</h2>
        <button className={btn("ghost", "xl:!px-0 xl:size-11")} onClick={onClose} aria-label="Close editor">
          <ArrowLeft className="size-4 xl:hidden" strokeWidth={1.75} aria-hidden />
          <X className="hidden size-4 xl:block" strokeWidth={1.75} aria-hidden />
          <span className="xl:hidden">Back to list</span>
        </button>
      </div>
      <div className="space-y-4">
        <Field label="Name">
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum choices" hint="0 = optional">
            <input className={`${inputCls} tabular`} type="number" inputMode="numeric" min={0} value={f.minSelect} onChange={(e) => setF({ ...f, minSelect: num(e.target.value) })} />
          </Field>
          <Field label="Maximum choices">
            <input className={`${inputCls} tabular`} type="number" inputMode="numeric" min={1} value={f.maxSelect} onChange={(e) => setF({ ...f, maxSelect: num(e.target.value) })} />
          </Field>
        </div>

        <fieldset className="border-t border-line pt-4">
          <legend className="mb-3 text-sm font-semibold">Modifiers (extra price in JOD, 0 = free)</legend>
          <div className="space-y-2">
            {f.modifiers.map((m, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-center gap-1.5 sm:gap-2">
                <input className={inputCls} placeholder="Oat milk" aria-label="Modifier name" value={m.name} onChange={(e) => setMod(i, { name: e.target.value })} />
                <input className={`${inputCls} tabular`} inputMode="decimal" aria-label="Modifier price (JOD)" value={m.price} onChange={(e) => setMod(i, { price: e.target.value })} />
                <button className={iconBtn} aria-label="Remove modifier" onClick={() => setF({ ...f, modifiers: f.modifiers.filter((_, j) => j !== i) })}>
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
          <button className={btn("quiet", "mt-3")} onClick={() => setF({ ...f, modifiers: [...f.modifiers, { name: "", price: "0" }] })}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            Add modifier
          </button>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button className={btn("primary")} disabled={busy} onClick={save}>
            {f.id ? "Save" : "Create group"}
          </button>
          {f.id && (
            <button className={btn("danger")} disabled={busy} onClick={remove}>
              <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
              Delete
            </button>
          )}
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        </div>
      </div>
    </aside>
  );
}
