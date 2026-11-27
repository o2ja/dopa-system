// Shared by the CSV preview (client) and the import endpoint (server): same rules, one place.

export const CSV_COLUMNS = ["category", "kind", "name", "description", "station", "price", "variants"] as const;

export const CSV_TEMPLATE = [
  CSV_COLUMNS.join(","),
  "Hot Coffee,coffee,Latte,Steamed milk and espresso,coffee,2.75,Small:2.5|Medium:2.75|Large:3.25",
  "Kitchen,restaurant,Croissant,,kitchen,1.75,",
  "Pizza,restaurant,Margherita,,pizza,5.5,Small:4.5|Large:7",
].join("\n");

export interface ImportRow {
  category: string;
  kind: "coffee" | "restaurant";
  name: string;
  description: string;
  station: "coffee" | "kitchen" | "pizza";
  basePrice: number; // fils
  variants: { name: string; price: number; isDefault: boolean; sortOrder: number }[];
}

const jodToFils = (s: string) => (/^\d+(\.\d{1,3})?$/.test(s) ? Math.round(Number(s) * 1000) : null);

/** Returns the normalized row or a list of errors. */
export function parseImportRow(raw: Record<string, unknown>): { row: ImportRow } | { errors: string[] } {
  const g = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string).trim() : "");
  const errors: string[] = [];
  if (!g("category")) errors.push("category is required");
  if (!g("name")) errors.push("name is required");
  if (g("category").length > 200 || g("name").length > 200 || g("description").length > 500) errors.push("text is too long");
  const kind = g("kind");
  if (kind !== "coffee" && kind !== "restaurant") errors.push("kind must be coffee or restaurant");
  const station = g("station");
  if (station !== "coffee" && station !== "kitchen" && station !== "pizza") errors.push("station must be coffee, kitchen or pizza");

  const variants: ImportRow["variants"] = [];
  const vs = g("variants");
  if (vs) {
    for (const part of vs.split("|")) {
      const [label, p, ...rest] = part.split(":").map((x) => x.trim());
      const price = p === undefined ? null : jodToFils(p);
      if (!label || price === null || rest.length) errors.push(`bad variant "${part}" (format Small:2.5)`);
      else variants.push({ name: label, price, isDefault: false, sortOrder: variants.length });
    }
    if (variants.length > 12) errors.push("too many variants");
  }

  let base = g("price") ? jodToFils(g("price")) : null;
  if (g("price") && base === null) errors.push("price is not valid (e.g. 2.75)");
  if (!g("price") && !variants.length) errors.push("price is required");
  if (base === null && variants.length) base = variants[0].price;
  if (variants.length) (variants.find((v) => v.price === base) ?? variants[0]).isDefault = true;

  if (errors.length) return { errors };
  return {
    row: { category: g("category"), kind: kind as ImportRow["kind"], name: g("name"), description: g("description"), station: station as ImportRow["station"], basePrice: base!, variants },
  };
}
