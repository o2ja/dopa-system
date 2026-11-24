"use client";

import { useState } from "react";
import { MenuCategories } from "./menu-categories";
import { MenuGroups } from "./menu-groups";
import { MenuImportPanel } from "./menu-import-panel";
import { MenuItems } from "./menu-items";
import type { CategoryData, GroupData, ItemData } from "./menu-types";

const TABS = [
  ["items", "Items"],
  ["categories", "Categories"],
  ["groups", "Modifiers"],
  ["import", "CSV import"],
] as const;

export function MenuManager({ categories, items, groups }: { categories: CategoryData[]; items: ItemData[]; groups: GroupData[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("items");
  return (
    <>
      <div role="tablist" aria-label="Menu sections" className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px min-h-11 shrink-0 border-b-2 px-4 text-sm transition-colors ${tab === id ? "border-gold font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {label}
            {id === "items" && <span className="tabular ms-1.5 text-xs text-muted">{items.length}</span>}
          </button>
        ))}
      </div>
      {tab === "items" && <MenuItems categories={categories} items={items} groups={groups} />}
      {tab === "categories" && <MenuCategories categories={categories} />}
      {tab === "groups" && <MenuGroups groups={groups} />}
      {tab === "import" && <MenuImportPanel />}
    </>
  );
}
