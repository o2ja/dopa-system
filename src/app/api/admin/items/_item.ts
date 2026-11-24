import { db } from "@/lib/db";
import { bool, type Body, int, Invalid, list, oneOf, str } from "../_util";

/** Validates the item payload. optional=true allows partial updates (e.g. the active toggle). */
export async function parseItem(b: Body, optional: boolean) {
  const o = { optional };
  const image = b.image === undefined && optional ? undefined : typeof b.image === "string" && b.image ? b.image : null;
  if (image && !/^\/api\/upload\/[\w-]+\.(jpg|png|webp|heic)$/.test(image)) throw new Invalid("Invalid image path");

  const categoryId = str(b, "categoryId", "Category", o);
  if (categoryId && !(await db.category.count({ where: { id: categoryId } }))) throw new Invalid("Category not found");

  const data = {
    categoryId,
    name: str(b, "name", "Name", o),
    description: str(b, "description", "Description", { ...o, allowEmpty: true, max: 500 }),
    image,
    basePrice: int(b, "basePrice", "Price", o),
    station: oneOf(b, "station", "Station", ["coffee", "kitchen"], o),
    isActive: bool(b, "isActive", o),
    isPopular: bool(b, "isPopular", o),
  };

  let variants: { name: string; price: number; isDefault: boolean; sortOrder: number }[] | undefined;
  if (b.variants !== undefined) {
    variants = list(b, "variants", "Variants", 12).map((v, i) => ({
      name: str(v, "name", "Variant name", { max: 40 })!,
      price: int(v, "price", "Variant price")!,
      isDefault: v.isDefault === true,
      sortOrder: i,
    }));
    if (variants.length && !variants.some((v) => v.isDefault)) variants[0].isDefault = true;
    // Exactly one default
    let seen = false;
    for (const v of variants) {
      if (v.isDefault && seen) v.isDefault = false;
      seen ||= v.isDefault;
    }
  }

  let groupIds: string[] | undefined;
  if (b.groupIds !== undefined) {
    if (!Array.isArray(b.groupIds) || b.groupIds.some((g) => typeof g !== "string")) throw new Invalid("Invalid modifier groups");
    groupIds = [...new Set(b.groupIds as string[])];
    if ((await db.modifierGroup.count({ where: { id: { in: groupIds } } })) !== groupIds.length) throw new Invalid("Modifier group not found");
  }

  return { data, variants, groupIds };
}
