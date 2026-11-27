export type Station = "coffee" | "kitchen" | "pizza";
export type PrintStation = Station | "cashier";
export type PrintJobType = "ticket" | "receipt" | "open_drawer";
export type PrintJobStatus = "pending" | "printed" | "failed";
export type OrderSource = "pos" | "qr" | "pickup";
export type OrderStatus =
  | "pending_verification"
  | "received"
  | "preparing"
  | "ready"
  | "completed"
  | "rejected"
  | "cancelled"
  | "voided";
export type PaymentMethod = "cash" | "cliq" | "card";
export type PaymentStatus = "unpaid" | "pending_verification" | "paid" | "rejected";

/** Local OCR pre-check of a CliQ receipt. Advisory only: the cashier still decides. */
export interface ReceiptVerification {
  status: "verified" | "warning" | "failed";
  checks: {
    isCompleted: boolean;
    isPreConfirmScreen: boolean;
    amountMatched: boolean;
    extractedAmount: number | null; // JOD
    aliasMatched: boolean;
    isDuplicate: boolean;
  };
  reasons: string[];
  rawSnippet: string;
}
export type CategoryKind = "coffee" | "restaurant";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_verification: "Awaiting payment",
  received: "Received",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  voided: "Voided",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = { cash: "Cash", cliq: "CliQ", card: "Card / Visa" };

/** What a client sends to create an order. Prices are always recomputed on the server. */
export interface CartLineInput {
  menuItemId: string;
  variantId?: string | null;
  modifierIds?: string[];
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  branchId: string;
  source: OrderSource;
  paymentMethod: PaymentMethod;
  items: CartLineInput[];
  tableNumber?: number | null;
  customerName?: string;
  customerPhone?: string;
  pickupTime?: string | null; // ISO
  notes?: string;
  shiftId?: string | null;
  clientId?: string | null; // POS offline queue id: re-sending the same one returns the existing order
  discount?: { type: "percent" | "fixed"; value: number } | null; // percent 1-100, or fils
  skipReceipt?: boolean; // tickets + drawer still print, customer receipt does not
  printedLocally?: boolean; // offline order already printed through the local bridge
  createdBy?: string;
  approvedBy?: string;
}

export interface OrderItemModifier {
  id: string;
  name: string;
  price: number;
}

/** JSON stored in PrintJob.payload and consumed by /print-bridge. */
export interface PrintPayload {
  title: string; // COFFEE TICKET | KITCHEN TICKET | CUSTOMER RECEIPT | OPEN DRAWER
  branchName: string;
  orderNumber?: number | string;
  source?: OrderSource;
  tableNumber?: number | null;
  customerName?: string | null;
  pickupTime?: string | null;
  createdAt: string;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
  items: {
    name: string;
    variant?: string | null;
    modifiers: string[];
    quantity: number;
    notes?: string | null;
    lineTotal: number; // fils
  }[];
  subtotal?: number;
  discount?: number; // fils
  total?: number;
  reprint?: boolean;
}

export type Role = "SUPER_ADMIN" | "BRANCH_ADMIN" | "CASHIER";
export const ROLES: readonly Role[] = ["SUPER_ADMIN", "BRANCH_ADMIN", "CASHIER"];