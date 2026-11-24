"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { formatJOD } from "@/lib/money";
import { api } from "./api";
import { type CategoryData, type GroupData, type ItemData, jod, parseJod } from "./menu-types";
import { btn, Field, iconBtn, inputCls, Notice, Segmented, Toggle } from "./ui";

interface Form {
  id: string | null;
  categoryId: string;
  name: string;
  description: string;
  image: string | null;
  price: string;
  station: "coffee" | "kitchen";
  isActive: boolean;
  isPopular: boolean;
  variants: { name: string; price: string; isDefault: boolean }[];
  groupIds: string[];
}

const STATION_LABEL = { coffee: "Coffee", kitchen: "Kitchen" };
const SIZES = ["Small", "Medium", "Large"];

const toForm = (i: ItemData): Form => ({
  ...i,
  station: i.station as Form["station"],
  price: jod(i.basePrice),
  variants: i.variants.map((v) => ({ ...v, price: jod(v.price) })),
});

function Thumb({ item }: { item: Pick<ItemData, "image" | "name"> }) {
  return item.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.image} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
  ) : (
    <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-paper-2 text-lg font-semibold text-gold-2" aria-hidden>
      {item.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function MenuItems({ categories, items, groups }: { categories: CategoryData[]; items: ItemData[]; groups: GroupData[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [station, setStation] = useState("");
  const [editing, setEditing] = useState<Form | null>(null);
  const router = useRouter();

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => (!cat || i.categoryId === cat) && (!station || i.station === station) && (!s || i.name.toLowerCase().includes(s)));
  }, [items, q, cat, station]);

  const blank = (): Form => {
    const c = categories[0];
    return {
      id: null,
      categoryId: c?.id ?? "",
      name: "",
      description: "",
      image: null,
      price: "",
      station: c?.kind === "restaurant" ? "kitchen" : "coffee",
      isActive: true,
      isPopular: false,
      variants: [],
      groupIds: [],
    };
  };

  async function quickToggle(i: ItemData) {
    await api("PATCH", `/api/admin/items/${i.id}`, { isActive: !i.isActive });
    router.refresh();
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_30rem]">
      <div className={editing ? "hidden xl:block" : ""}>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
          <div className="relative sm:col-span-2 lg:min-w-52 lg:flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
            <input className={`${inputCls} ps-9`} placeholder="Search items" aria-label="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={`${inputCls} lg:!w-auto`} aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className={`${inputCls} lg:!w-auto`} aria-label="Station" value={station} onChange={(e) => setStation(e.target.value)}>
            <option value="">All stations</option>
            <option value="coffee">Coffee</option>
            <option value="kitchen">Kitchen</option>
          </select>
          <button className={btn("primary", "sm:col-span-2 lg:col-span-1")} disabled={!categories.length} onClick={() => setEditing(blank())}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            New item
          </button>
        </div>

        {shown.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">{items.length ? "No items match." : "No items yet. Add one or import a CSV."}</p>
        ) : (
          <ul className="divide-y divide-line/70 border-y border-line/70">
            {shown.map((i) => {
              const prices = i.variants.length ? i.variants.map((v) => v.price) : [i.basePrice];
              const lo = Math.min(...prices);
              const hi = Math.max(...prices);
              const active = editing?.id === i.id;
              return (
                <li key={i.id} className={`flex items-center gap-1 px-1 transition-colors sm:px-2 ${active ? "bg-paper-2" : "hover:bg-paper-2/60"}`}>
                  <button type="button" onClick={() => setEditing(toForm(i))} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2 text-start">
                    <Thumb item={i} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-medium ${i.isActive ? "" : "text-muted line-through"}`}>{i.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {catName.get(i.categoryId)} · {STATION_LABEL[i.station as keyof typeof STATION_LABEL]}
                      </span>
                    </span>
                    <span className="tabular text-end text-sm">{lo === hi ? formatJOD(lo) : `${formatJOD(lo)}–${(hi / 1000).toFixed(2)}`}</span>
                  </button>
                  <Toggle checked={i.isActive} onChange={() => quickToggle(i)} label="Active" bare />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <ItemEditor
          key={editing.id ?? "new"}
          initial={editing}
          categories={categories}
          groups={groups}
          onClose={() => setEditing(null)}
          onSaved={(f) => {
            setEditing(f);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ItemEditor({
  initial,
  categories,
  groups,
  onClose,
  onSaved,
}: {
  initial: Form;
  categories: CategoryData[];
  groups: GroupData[];
  onClose: () => void;
  onSaved: (f: Form) => void;
}) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const setVariant = (idx: number, patch: Partial<Form["variants"][number]>) =>
    set("variants", f.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)));

  async function upload(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) set("image", data.url);
      else setMsg({ tone: "error", text: data.error ?? "Image upload failed" });
    } catch {
      setMsg({ tone: "error", text: "Image upload failed" });
    }
    setBusy(false);
  }

  async function save() {
    const basePrice = parseJod(f.price);
    const variants = f.variants.map((v) => ({ ...v, price: parseJod(v.price) }));
    if (!f.name.trim()) return setMsg({ tone: "error", text: "Name is required" });
    if (basePrice === null) return setMsg({ tone: "error", text: "Price is not valid (e.g. 2.75)" });
    if (variants.some((v) => v.price === null || !v.name.trim())) return setMsg({ tone: "error", text: "Complete every variant name and price" });

    setBusy(true);
    const body = { ...f, id: undefined, basePrice, price: undefined, variants };
    const r = f.id
      ? await api<{ item: { id: string } }>("PATCH", `/api/admin/items/${f.id}`, body)
      : await api<{ item: { id: string } }>("POST", "/api/admin/items", body);
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "error", text: r.error! });
    setMsg({ tone: "ok", text: "Saved" });
    onSaved({ ...f, id: r.data.item.id });
  }

  async function remove() {
    if (!f.id || !confirm(`Delete "${f.name}" permanently?`)) return;
    setBusy(true);
    const r = await api("DELETE", `/api/admin/items/${f.id}`);
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "error", text: r.error! });
    router.refresh();
    onClose();
  }

  return (
    <aside className="scroll-thin xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:self-start xl:overflow-y-auto xl:pe-1">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{f.id ? "Edit item" : "New item"}</h2>
        <button className={btn("ghost", "xl:!px-0 xl:size-11")} onClick={onClose} aria-label="Close editor">
          <ArrowLeft className="size-4 xl:hidden" strokeWidth={1.75} aria-hidden />
          <X className="hidden size-4 xl:block" strokeWidth={1.75} aria-hidden />
          <span className="xl:hidden">Back to list</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Thumb item={f} />
          <div className="flex flex-wrap gap-2">
            <label className={btn("quiet", "cursor-pointer")}>
              <Upload className="size-4" strokeWidth={1.75} aria-hidden />
              {f.image ? "Change image" : "Upload image"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {f.image && (
              <button className={btn("ghost")} onClick={() => set("image", null)}>
                Remove
              </button>
            )}
          </div>
        </div>

        <Field label="Name">
          <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className={inputCls} rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category">
            <select className={inputCls} value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={f.variants.length ? "Default price (JOD)" : "Price (JOD)"}>
            <input className={`${inputCls} tabular`} inputMode="decimal" placeholder="2.75" value={f.price} onChange={(e) => set("price", e.target.value)} />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-2">Prep station</p>
          <Segmented
            label="Prep station"
            value={f.station}
            onChange={(v) => set("station", v)}
            options={[
              ["coffee", "Coffee"],
              ["kitchen", "Kitchen"],
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-x-6">
          <Toggle checked={f.isActive} onChange={(v) => set("isActive", v)} label="Active" />
          <Toggle checked={f.isPopular} onChange={(v) => set("isPopular", v)} label="Popular" />
        </div>

        <fieldset className="border-t border-line pt-4">
          <legend className="mb-1 text-sm font-semibold">Variants</legend>
          <p className="mb-3 text-xs text-muted">A variant price replaces the base price. Select the default with the radio button.</p>
          <div className="space-y-2">
            {f.variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto_auto] items-center gap-1.5 sm:gap-2">
                <input className={inputCls} placeholder="Medium" aria-label="Variant name" value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} />
                <input className={`${inputCls} tabular`} inputMode="decimal" placeholder="2.5" aria-label="Variant price (JOD)" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} />
                <label className="grid size-11 cursor-pointer place-items-center" title="Default variant">
                  <input
                    type="radio"
                    name="default-variant"
                    className="size-5 accent-[var(--color-gold)]"
                    aria-label="Default variant"
                    checked={v.isDefault}
                    onChange={() => set("variants", f.variants.map((x, j) => ({ ...x, isDefault: j === i })))}
                  />
                </label>
                <button className={iconBtn} aria-label="Remove variant" onClick={() => set("variants", f.variants.filter((_, j) => j !== i))}>
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn("quiet")} onClick={() => set("variants", [...f.variants, { name: "", price: "", isDefault: f.variants.length === 0 }])}>
              <Plus className="size-4" strokeWidth={1.75} aria-hidden />
              Add variant
            </button>
            {f.variants.length === 0 && (
              <button className={btn("ghost")} onClick={() => set("variants", SIZES.map((name, i) => ({ name, price: f.price, isDefault: i === 1 })))}>
                Small / Medium / Large
              </button>
            )}
          </div>
        </fieldset>

        <fieldset className="border-t border-line pt-4">
          <legend className="mb-2 text-sm font-semibold">Modifier groups</legend>
          {groups.length === 0 ? (
            <p className="text-xs text-muted">Create groups in the Modifiers tab first.</p>
          ) : (
            <ul>
              {groups.map((g) => (
                <li key={g.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--color-gold)]"
                      checked={f.groupIds.includes(g.id)}
                      onChange={(e) => set("groupIds", e.target.checked ? [...f.groupIds, g.id] : f.groupIds.filter((x) => x !== g.id))}
                    />
                    {g.name}
                    <span className="text-xs text-muted">
                      {g.minSelect > 0 ? "required · " : ""}up to {g.maxSelect}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button className={btn("primary")} disabled={busy} onClick={save}>
            {f.id ? "Save" : "Add item"}
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
