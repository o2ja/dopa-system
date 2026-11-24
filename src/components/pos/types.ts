import type { OrderSource, OrderStatus, PaymentMethod, PaymentStatus, ReceiptVerification } from "@/types";

export interface PosBranch {
  id: string;
  slug: string;
  name: string;
  cliqAlias: string;
  cliqName: string;
  tableCount: number;
}

export interface Variant { id: string; name: string; price: number; isDefault: boolean }
export interface Modifier { id: string; name: string; price: number }
export interface ModifierGroup { id: string; name: string; minSelect: number; maxSelect: number; modifiers: Modifier[] }
export interface PosItem {
  id: string;
  name: string;
  basePrice: number;
  isPopular: boolean;
  variants: Variant[];
  modifierGroups: ModifierGroup[];
}
export interface PosCategory { id: string; name: string; items: PosItem[] }

export interface CartLine {
  key: string;
  item: PosItem;
  variant: Variant | null;
  modifiers: Modifier[];
  quantity: number;
  notes: string;
}

export interface QueueOrder {
  id: string;
  number: number;
  source: OrderSource;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  receiptUrl: string | null;
  receiptVerification: ReceiptVerification | null;
  tableNumber: number | null;
  customerName: string | null;
  customerPhone: string | null;
  pickupTime: string | null;
  notes: string | null;
  total: number;
  createdAt: string;
  items: { id: string; name: string; variantName: string | null; modifiers: string[]; quantity: number; notes: string | null }[];
}

export interface Shift {
  id: string;
  cashierName: string;
  openingFloat: number;
  openedAt: string;
}

export const lineUnit = (l: CartLine) => (l.variant?.price ?? l.item.basePrice) + l.modifiers.reduce((s, m) => s + m.price, 0);
export const lineTotal = (l: CartLine) => lineUnit(l) * l.quantity;
