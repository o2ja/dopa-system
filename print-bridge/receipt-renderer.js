import { Doc } from "./escpos.js";

const TZ = "Asia/Amman";
const fmtDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const fmtTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

const jod = (fils) => `JOD ${(Number(fils || 0) / 1000).toFixed(2)}`;
const date = (iso) => (iso ? fmtDate.format(new Date(iso)).replace(",", "") : "");
const PAY = { cash: "CASH", cliq: "CLIQ", card: "CARD / VISA" };

function where(p) {
  if (p.tableNumber != null) return `TABLE ${p.tableNumber}`;
  if (p.source === "pickup") return p.pickupTime ? `PICKUP ${fmtTime.format(new Date(p.pickupTime))}` : "PICKUP";
  if (p.source === "qr") return "QR ORDER";
  return "COUNTER";
}

function banner(doc, p) {
  if (p.reprint) doc.line("** REPRINT **", { align: "center", bold: true, w: 2, h: 2 }).feed(1);
}

/** Kitchen/coffee prep ticket: big order number, big item lines, no prices. */
function ticket(doc, p) {
  banner(doc, p);
  doc.para(p.title ?? "TICKET", { align: "center", bold: true, w: 2, h: 2 });
  doc.line(p.branchName ?? "", { align: "center" });
  doc.feed(1);
  if (p.orderNumber != null) doc.line(`#${p.orderNumber}`, { align: "center", bold: true, w: 6, h: 6 });
  doc.feed(1);
  doc.para(where(p), { align: "center", bold: true, w: 2, h: 2 });
  if (p.customerName) doc.para(p.customerName, { align: "center", bold: true });
  doc.rule("=");
  for (const it of p.items ?? []) {
    doc.para(`${it.quantity} x ${it.name}`, { bold: true, w: 2, h: 2 });
    if (it.variant) doc.para(`  ${it.variant}`, { bold: true, w: 1, h: 2 });
    for (const m of it.modifiers ?? []) doc.para(`  + ${m}`, { bold: true, w: 1, h: 2 });
    if (it.notes) doc.para(`  NOTE: ${it.notes}`, { bold: true, w: 1, h: 2 });
    doc.line("");
  }
  doc.rule("=");
  if (p.notes) doc.para(`ORDER NOTE: ${p.notes}`, { bold: true });
  doc.line(date(p.createdAt), { align: "center" });
  doc.feed(4);
}

/** Customer receipt with prices. */
function receipt(doc, p) {
  banner(doc, p);
  doc.para(p.branchName ?? "Dopa", { align: "center", bold: true, w: 2, h: 2 });
  doc.line(p.title ?? "CUSTOMER RECEIPT", { align: "center", bold: true });
  doc.feed(1);
  doc.row(p.orderNumber != null ? `Order #${p.orderNumber}` : "", date(p.createdAt), { bold: true });
  doc.line(where(p));
  if (p.customerName) doc.line(`Customer: ${p.customerName}`);
  doc.rule();
  for (const it of p.items ?? []) {
    doc.row(`${it.quantity} x ${it.name}${it.variant ? ` (${it.variant})` : ""}`, jod(it.lineTotal));
    for (const m of it.modifiers ?? []) doc.line(`    + ${m}`);
    if (it.notes) doc.line(`    Note: ${it.notes}`);
  }
  doc.rule();
  if (p.subtotal != null && p.subtotal !== p.total) doc.row("Subtotal", jod(p.subtotal));
  doc.row("TOTAL", jod(p.total ?? p.subtotal), { bold: true });
  if (p.paymentMethod) doc.row("Paid by", PAY[p.paymentMethod] ?? String(p.paymentMethod).toUpperCase());
  doc.feed(1);
  doc.line("Thank you for visiting Dopa!", { align: "center", bold: true });
  doc.feed(4);
}

/**
 * Turns one API job into printer bytes (+ a text preview for DRY_RUN).
 * open_drawer -> pulse only. Any other job with openCashDrawer -> print, cut, then pulse.
 */
export function renderJob(job) {
  const doc = new Doc().init();
  const p = job.payload ?? {};
  if (job.jobType === "open_drawer") {
    doc.drawer();
  } else {
    (job.jobType === "receipt" ? receipt : ticket)(doc, p);
    doc.cut();
    if (job.openCashDrawer) doc.drawer();
  }
  return { bytes: doc.bytes(), text: doc.text() };
}
