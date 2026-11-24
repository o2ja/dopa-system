export interface CategoryData {
  id: string;
  name: string;
  kind: string;
  sortOrder: number;
  itemCount: number;
}

export interface VariantData {
  name: string;
  price: number; // fils
  isDefault: boolean;
}

export interface ItemData {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: string | null;
  basePrice: number; // fils
  station: string;
  isActive: boolean;
  isPopular: boolean;
  variants: VariantData[];
  groupIds: string[];
}

export interface GroupData {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  itemCount: number;
  modifiers: { name: string; price: number }[];
}

export const jod = (fils: number) => String(fils / 1000);

/** "2.5" -> 2500, invalid -> null */
export const parseJod = (s: string) => (/^\d+(\.\d{1,3})?$/.test(s.trim()) ? Math.round(Number(s) * 1000) : null);
