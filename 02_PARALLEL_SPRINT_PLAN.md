# 4-Hour Parallel Sprint Plan (Local-First)

## Wave 0 — Foundation (30–40 min | Opus + Haiku)
1. Load & activate user's skills from `claude-skills-use` file.
2. Initialize Next.js App Router (TypeScript + Tailwind) + install packages (`prisma`, `@prisma/client`, `lucide-react`, `qrcode.react`, `papaparse`, `@types/papaparse`, `zustand`).
3. Create `prisma/schema.prisma` (SQLite locally for instant speed; standard relational types so switching to MySQL/PostgreSQL on VPS takes 1 line).
4. Run `npx prisma db push` and `npx tsx prisma/seed.ts` with rich Arabic/English seed data for 2 branches + Coffee & Restaurant menus.
5. Build shared core:
   - `src/lib/db.ts` (Prisma singleton)
   - `src/lib/print-dispatcher.ts` (splits order items into `coffee`, `kitchen`, `cashier` `PrintJob` records + sets `openCashDrawer` for cash payments)
   - `src/app/api/upload/route.ts` (local file upload to `public/uploads/`)
   - `src/app/layout.tsx` (RTL Arabic) & `src/app/globals.css`.

## Wave 1 — 3 Parallel Sonnet Sub-Agents (2–2.5 hours)
Launch all 3 simultaneously with strict folder ownership:
- **Sonnet Agent A:** Customer Website (`/`), Interactive Big Menu (`/b/[slug]`), Variants/Modifiers modal, QR Table detection, Zustand Cart, CliQ Pre-Order Checkout + local receipt upload, Live Order Tracker (`/order/[id]`), and `/api/orders/**`.
- **Sonnet Agent B:** iPad POS Hub (`/pos`), Fast Cashier screen, Live Incoming Queue (polling/SSE + audio alert), CliQ Verification modal, Split-Print & Manual Cash Drawer trigger, Shift & Z-Report cash reconciliation, Quick 86 per-branch toggle, and `/api/pos/**`, `/api/shifts/**`.
- **Sonnet Agent C:** Admin Panel (`/admin`, `/admin/menu` with CSV import, `/admin/branches`, `/admin/qr`), Print Jobs API (`/api/print-jobs/**`), AND the standalone `/print-bridge` Node.js ESC/POS service.

## Wave 2 — Verification & Polish (45 min | Haiku + Sonnet)
1. Haiku runs `npx tsc --noEmit` and `npm run build` and reports only concise errors.
2. Sonnet fixes any TypeScript, Prisma, or Next.js build issues.
3. Verify the app starts cleanly with `npm run dev` and all 3 portals (`/`, `/pos`, `/admin`) work end-to-end with zero external cloud dependencies.
