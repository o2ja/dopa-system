// End-to-end smoke test against a running server: node scripts/smoke.mjs [baseUrl]
// Mutates the DB (opens a shift, creates orders) — run on a dev DB, then `npm run db:seed` to reset.
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const B = process.argv[2] ?? "http://localhost:3000";
const SECRET = process.env.BRIDGE_SECRET ?? "dev-bridge-secret";
const PASS = process.env.STAFF_PASSWORD;
const db = new PrismaClient();
let staff = {}; // staff cookie header, set after login when the gate is on
const isStaffPath = (p) => /^\/(pos|admin|api\/(pos|admin|shifts))(\/|\?|$)/.test(p);
const j = async (path, init = {}) => {
  const r = await fetch(B + path, { ...init, headers: { "content-type": "application/json", ...(isStaffPath(path) ? staff : {}), ...init.headers } });
  const body = await r.json().catch(() => null);
  return { status: r.status, body };
};

assert.equal((await fetch(B + "/login")).status, 200, "/login");
const mf = await fetch(B + "/manifest.json");
assert.equal(mf.status, 200, "manifest");
assert.match((await mf.json()).name, /Dopa/, "manifest name");

if (PASS) {
  let r = await fetch(B + "/pos", { redirect: "manual" });
  assert.equal(r.status, 307, "/pos gated");
  assert.match(r.headers.get("location") ?? "", /\/login/);
  r = await fetch(B + "/api/pos/queue?branchId=branch-1");
  assert.equal(r.status, 401, "staff api gated");
  const login = (password) => fetch(B + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
  assert.equal((await login(PASS + "x")).status, 401, "wrong password");
  r = await login(PASS);
  assert.equal(r.status, 200, "login");
  const cookie = r.headers.getSetCookie().find((c) => c.startsWith("dopa_staff="));
  assert.ok(cookie, "dopa_staff cookie set");
  assert.ok(!cookie.includes(PASS), "cookie is not the raw password");
  staff = { cookie: cookie.split(";")[0] };
  console.log("gate ok");
}

for (const p of ["/", "/b/branch-1?table=5", "/b/branch-2", "/pos", "/pos?branch=branch-1", "/admin", "/admin/menu", "/admin/branches", "/admin/qr"]) {
  const r = await fetch(B + p, { headers: isStaffPath(p) ? staff : {} });
  assert.equal(r.status, 200, p);
}
console.log("pages ok");

const branch = await db.branch.findUniqueOrThrow({ where: { slug: "branch-1" } });
const latte = await db.menuItem.findFirstOrThrow({ where: { name: "Spanish Latte" }, include: { variants: true } });
const pizza = await db.menuItem.findFirstOrThrow({ where: { name: "Margherita Pizza" }, include: { modifierGroups: { include: { modifiers: true } } } });
const coldBrew = await db.menuItem.findFirstOrThrow({ where: { name: "Cold Brew" } });
const thin = pizza.modifierGroups[0].modifiers.find((m) => m.name === "Thin");
const large = latte.variants.find((v) => v.name === "Large");
const items = [
  { menuItemId: latte.id, variantId: large.id, quantity: 2 },
  { menuItemId: pizza.id, modifierIds: [thin.id], quantity: 1 },
];

// Shift (reuse if one is open)
let { body: cur } = await j(`/api/shifts?branchId=${branch.id}`);
let shift = cur.shift;
if (!shift) shift = (await j("/api/shifts", { method: "POST", body: JSON.stringify({ branchId: branch.id, cashierName: "Smoke", openingFloat: 50000 }) })).body.shift;
assert.ok(shift?.id, "shift open");

// POS cash order -> coffee + kitchen tickets + receipt with drawer
let r = await j("/api/pos/orders", { method: "POST", body: JSON.stringify({ branchId: branch.id, paymentMethod: "cash", items }) });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.total, 2 * large.price + 5500, "server-side price");
const jobs = await db.printJob.findMany({ where: { orderId: r.body.id } });
assert.deepEqual(jobs.map((x) => x.station).sort(), ["cashier", "coffee", "kitchen"]);
assert.ok(jobs.find((x) => x.station === "cashier").openCashDrawer, "drawer on cash");
console.log("pos split print ok");

// 86'd item rejected
r = await j("/api/orders", { method: "POST", body: JSON.stringify({ branchId: branch.id, source: "qr", tableNumber: 3, paymentMethod: "cash", items: [{ menuItemId: coldBrew.id, quantity: 1 }] }) });
assert.equal(r.status, 400, "86 blocks");

// Pickup without receipt rejected; with receipt -> pending, no print
r = await j("/api/orders", { method: "POST", body: JSON.stringify({ branchId: branch.id, source: "pickup", paymentMethod: "cliq", customerName: "Sara", customerPhone: "0791234567", pickupTime: new Date(Date.now() + 3600e3).toISOString(), items }) });
assert.equal(r.status, 400, "receipt required");
const form = new FormData();
form.append("file", new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }), "r.png");
const up = await (await fetch(B + "/api/upload", { method: "POST", body: form })).json();
assert.match(up.url, /^\/api\/upload\//);
assert.equal((await fetch(B + up.url)).status, 200, "receipt served");
r = await j("/api/orders", { method: "POST", body: JSON.stringify({ branchId: branch.id, source: "pickup", paymentMethod: "cliq", customerName: "Sara", customerPhone: "0791234567", pickupTime: new Date(Date.now() + 3600e3).toISOString(), receiptUrl: up.url, items }) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const pickupId = r.body.id;
assert.equal(await db.printJob.count({ where: { orderId: pickupId } }), 0, "no print before verify");
r = await j(`/api/orders/${pickupId}`);
assert.equal(r.body.status, "pending_verification");

// Bridge auth + verify -> printed
assert.equal((await j(`/api/print-jobs/pending?branchId=branch-1`)).status, 401, "bridge auth");
r = await j(`/api/pos/orders/${pickupId}/verify`, { method: "POST", body: JSON.stringify({ approve: true }) });
assert.equal(r.status, 200, JSON.stringify(r.body));
const pj = await db.printJob.findMany({ where: { orderId: pickupId } });
assert.equal(pj.length, 3);
assert.ok(!pj.find((x) => x.station === "cashier").openCashDrawer, "cliq never opens drawer");
r = await j(`/api/print-jobs/pending?branchId=branch-1`, { headers: { "x-bridge-secret": SECRET } });
assert.equal(r.status, 200);
assert.ok(r.body.jobs.some((x) => pj.some((p) => p.id === x.id)), "bridge sees jobs");
r = await j(`/api/print-jobs/${pj[0].id}`, { method: "PATCH", headers: { "x-bridge-secret": SECRET }, body: JSON.stringify({ status: "printed" }) });
assert.equal(r.status, 200);
console.log("cliq verify + bridge ok");

// Z-report
r = await j(`/api/shifts/${shift.id}`);
assert.equal(r.status, 200);
assert.ok(r.body.sales.cash >= 2 * large.price + 5500, "cash in z-report");
console.log("z-report ok\nALL SMOKE TESTS PASSED");
await db.$disconnect();
