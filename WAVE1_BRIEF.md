# Wave 1 shared brief (read fully before coding)

Project: D:\dopa_system — "Dopa" 2-branch Cafe House & Restaurant (Amman, Jordan). Next.js 16 App Router + TS + Tailwind v4 + Prisma 6 (SQLite). 100% local, no external services. Windows + PowerShell.

## Next.js 16 is NOT the version you know
- Read the relevant guide in `node_modules/next/dist/docs/` before using an API you're unsure of.
- `params` and `searchParams` are Promises: `const { id } = await params`. Global helpers exist: `PageProps<"/b/[slug]">`, `LayoutProps<"/">`, `RouteContext<"/api/x/[id]">` (see src/app/api/upload/[file]/route.ts).
- `middleware` is now `src/proxy.ts` (already written: HTTP Basic auth on /pos, /admin, /api/pos, /api/admin, /api/shifts when STAFF_PASSWORD is set). Don't touch it.

## Wave 0 files — READ, DO NOT EDIT (report needed changes in your final message instead)
- `prisma/schema.prisma` — all models. String enums; allowed values in `src/types/index.ts`. **Money = Int fils** (1 JOD = 1000 fils).
- `src/lib/db.ts` — `db` Prisma singleton.
- `src/lib/money.ts` — `formatJOD(fils)`, `toFils(jod)`.
- `src/types/index.ts` — unions, `ORDER_STATUS_LABEL`, `PAYMENT_LABEL`, `CreateOrderInput`, `PrintPayload`.
- `src/lib/orders.ts` — `createOrder(input)` (server-side pricing, Quick 86, CliQ rule, daily order number, auto-dispatch) and `verifyOrder(id, approve, reason)`; throws `OrderError(message, status)` with English messages → return `{error}` JSON with that status.
- `src/lib/print-dispatcher.ts` — `dispatchPrintJobs(orderId, {reprint?})` (coffee ticket / kitchen ticket / cashier receipt; drawer pulse on paid cash) and `openCashDrawer(branchId)`.
- `src/app/api/upload/route.ts` — POST multipart `file` → `{url: "/api/upload/<name>"}` (images ≤6MB). GET `/api/upload/<name>` serves it.
- `src/app/layout.tsx` (LTR, `lang="en"`, Plus Jakarta Sans), `src/app/globals.css`.
- Seed: `npx tsx prisma/seed.ts` (2 branches `branch-1`, `branch-2`; 22 items; Cold Brew is 86'd at branch-1). DB = `prisma/dev.db`.

## Business rules (already enforced in createOrder — rely on them, don't duplicate)
- Order source `pos | qr | pickup`. Pickup must be CliQ + receipt → `pending_verification`, never printed until the cashier approves (`verifyOrder`). QR+CliQ same. QR+cash → `received`, printed now, `paymentStatus: unpaid` (paid later at counter). POS → `paid`, printed now, requires an open shift.
- Status flow: `pending_verification → received → preparing → ready → completed`, or `rejected` / `cancelled`.
- Variant price is absolute (replaces basePrice). Modifiers add their price. Modifier groups have minSelect/maxSelect.
- Quick 86 = `BranchItemAvailability` row with `isAvailable=false` for that branch; no row = available.

## Visual direction
- **100% English. No Arabic anywhere** (UI, seed, receipts, tickets, comments). LTR.
- **Fully responsive on phones, tablets AND laptop/desktop** for every portal (/, /b/[slug], /pos, /admin): adaptive grids, drawers/bottom sheets on mobile, 44px+ touch targets, keyboard/mouse ergonomics on desktop.
- Schema uses single `name` / `description` / `address` / `variantName` fields (no Ar/En pairs).
- Tailwind tokens from globals.css: `bg-paper`, `bg-paper-2`, `bg-card`, `text-ink`, `bg-ink`, `text-muted`, `border-line`, `bg-sand`, `text-gold`, `bg-gold`, `text-sage`, `text-wine`, `text-sky`, `shadow-soft`, `shadow-lift`, `rounded-card`, class `tabular` for numbers.
- Editorial, warm, hospitality-grade: generous whitespace, strong type hierarchy, hairline borders, subtle motion with CSS transitions only. **No orange, no purple gradients, no glossy AI-template look, no emoji as icons** (use `lucide-react`).
- Use logical spacing (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`).
- Images: items have no images in seed. Design a tasteful typographic/initial or icon placeholder, not broken <img>.

## Rules
- Only create/edit files in your owned folders (listed in your task). Need a shared helper? Put it inside your own folder.
- Available deps: next, react 19, @prisma/client, lucide-react, qrcode.react, papaparse, zustand. **Do not add dependencies** (exception noted for Agent C's print-bridge, which has its own package.json).
- Realtime = polling with `fetch` in `useEffect` (2–3s), no SWR.
- Server Components read Prisma directly; client components call your API routes.
- Validate all request bodies at API boundaries; never trust client prices.
- Do NOT run `next build` or `next dev` (other agents work in parallel and share `.next`). Verify with `npx tsc --noEmit`; ignore errors in files you don't own.
- Keep code lean: no speculative abstractions, no unused options. Comment only non-obvious "why".
- Final message: list files created, API endpoints (method, path, body, response), anything other agents must know, and any Wave 0 change you need.
