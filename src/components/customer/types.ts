import type { OrderSource, OrderStatus, PaymentMethod } from "@/types";

export interface BranchDTO {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  isOpen: boolean;
  cliqAlias: string;
  cliqName: string;
  tableCount: number;
}

export interface ModifierDTO {
  id: string;
  name: string;
  price: number;
}

export interface GroupDTO {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: ModifierDTO[];
}

export interface VariantDTO {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
}

export interface ItemDTO {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  isPopular: boolean;
  available: boolean;
  variants: VariantDTO[];
  groups: GroupDTO[];
}

export interface CategoryDTO {
  id: string;
  name: string;
  items: ItemDTO[];
}

export interface OrderDTO {
  id: string;
  number: number;
  status: OrderStatus;
  source: OrderSource;
  paymentMethod: PaymentMethod;
  tableNumber: number | null;
  pickupTime: string | null;
  rejectReason: string | null;
  total: number;
  branch: { name: string; phone: string; slug: string };
  items: { name: string; variantName: string | null; modifiers: string[]; quantity: number; lineTotal: number; notes: string | null }[];
}

export const TERMINAL_STATUSES: OrderStatus[] = ["completed", "rejected", "cancelled"];

export const defaultVariant = (item: ItemDTO) => item.variants.find((v) => v.isDefault) ?? item.variants[0];

export function fromPrice(item: ItemDTO) {
  if (!item.variants.length) return { price: item.basePrice, from: false };
  const prices = item.variants.map((v) => v.price);
  const min = Math.min(...prices);
  return { price: min, from: prices.some((p) => p !== min) };
}

export const isSimple = (item: ItemDTO) => item.variants.length <= 1 && item.groups.length === 0;
