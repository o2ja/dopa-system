// Offline self-test: renders a coffee ticket, a kitchen ticket, a cash receipt and a drawer pulse
// into ./debug-receipts/ and checks the ESC/POS bytes. No server, no printer.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { writeDebug } from "./printer.js";
import { renderJob } from "./receipt-renderer.js";

const base = {
  branchName: "Dopa - Abdoun",
  orderNumber: 42,
  source: "qr",
  tableNumber: 5,
  customerName: null,
  createdAt: new Date().toISOString(),
  items: [
    { name: "Latte", variant: "Medium", modifiers: ["Oat milk", "Extra shot"], quantity: 2, notes: "No sugar", lineTotal: 6500 },
    { name: "Croissant", variant: null, modifiers: [], quantity: 1, notes: null, lineTotal: 1750 },
  ],
};

const jobs = [
  { id: "t-coffee", station: "coffee", jobType: "ticket", openCashDrawer: false, payload: { ...base, title: "COFFEE TICKET" } },
  { id: "t-kitchen", station: "kitchen", jobType: "ticket", openCashDrawer: false, payload: { ...base, title: "KITCHEN TICKET", reprint: true } },
  {
    id: "t-receipt",
    station: "cashier",
    jobType: "receipt",
    openCashDrawer: true,
    payload: { ...base, title: "CUSTOMER RECEIPT", paymentMethod: "cash", subtotal: 8250, total: 8250 },
  },
  { id: "t-drawer", station: "cashier", jobType: "open_drawer", openCashDrawer: true, payload: { title: "OPEN DRAWER", items: [] } },
];

for (const job of jobs) {
  const out = renderJob(job);
  const file = await writeDebug(job, out);
  assert.ok(existsSync(file), `missing ${file}`);
  assert.ok(existsSync(file.replace(/\.txt$/, ".bin")), "missing .bin");
  assert.deepEqual([...out.bytes.subarray(0, 2)], [0x1b, 0x40], "must start with ESC @");
  if (job.jobType === "open_drawer") {
    assert.ok(out.bytes.includes(Buffer.from([0x1b, 0x70, 0, 25, 250])), "drawer pulse missing");
    assert.ok(!out.bytes.includes(Buffer.from([0x1d, 0x56, 66, 0])), "drawer-only job must not cut");
  } else {
    assert.ok(out.bytes.includes(Buffer.from([0x1d, 0x56, 66, 0])), "cut missing");
    const cut = out.bytes.indexOf(Buffer.from([0x1d, 0x56, 66, 0]));
    const pulse = out.bytes.indexOf(Buffer.from([0x1b, 0x70, 0, 25, 250]));
    assert.equal(pulse > cut, job.openCashDrawer, "drawer pulse must follow the cut, and only when requested");
  }
  for (const line of out.text.split("\n")) assert.ok(line.replace(/\s*\[[^\]]*\]$/, "").length <= 48, `line too wide: ${line}`);
  console.log("ok", file);
}
console.log("All render checks passed.");
