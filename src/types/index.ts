export type Station = "coffee" | "kitchen";
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
  | "cancelled";
export type PaymentMethod = "cash" | "cliq" | "card";
export type PaymentStatus = "unpaid" | "pending_verification" | "paid" | "rejected";
export type CategoryKind = "coffee" | "restaurant";

export const ORDER_STATUS_AR: Record<OrderStatus, string> = {
  pending_verification: "بانتظار تأكيد الدفع",
  received: "تم الاستلام",
  preparing: "قيد التحضير",
  ready: "جاهز",
  completed: "مكتمل",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

export const PAYMENT_AR: Record<PaymentMethod, string> = { cash: "كاش", cliq: "CliQ", card: "بطاقة" };

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
  receiptUrl?: string | null; // required for source=pickup (CliQ)
  shiftId?: string | null;
}

export interface OrderItemModifier {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
}

/** JSON stored in PrintJob.payload and consumed by /print-bridge. */
export interface PrintPayload {
  title: string; // تذكرة الكوفي | تذكرة المطبخ | فاتورة الزبون | فتح درج الكاش
  branchName: string;
  orderNumber?: number;
  source?: OrderSource;
  tableNumber?: number | null;
  customerName?: string | null;
  pickupTime?: string | null;
  createdAt: string;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
  items: {
    nameAr: string;
    nameEn: string;
    variant?: string | null;
    modifiers: string[];
    quantity: number;
    notes?: string | null;
    lineTotal: number; // fils
  }[];
  subtotal?: number;
  total?: number;
  reprint?: boolean;
}
