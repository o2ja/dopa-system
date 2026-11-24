import { type Body, int, Invalid, list, str } from "../_util";

export function parseGroup(b: Body) {
  const modifiers = list(b, "modifiers", "Modifiers", 40).map((m) => ({
    name: str(m, "name", "Modifier name", { max: 60 })!,
    price: int(m, "price", "Modifier price")!,
  }));
  const minSelect = int(b, "minSelect", "Minimum", { max: 20 })!;
  const maxSelect = int(b, "maxSelect", "Maximum", { max: 20 })!;
  if (maxSelect < 1) throw new Invalid("Maximum must be at least 1");
  if (minSelect > maxSelect) throw new Invalid("Minimum cannot exceed maximum");
  if (minSelect > modifiers.length) throw new Invalid("Minimum exceeds the number of modifiers");
  return { name: str(b, "name", "Name", { max: 60 })!, minSelect, maxSelect, modifiers };
}
