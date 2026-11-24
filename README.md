# Dopa — Cafe House & Restaurant System

Customer site + QR/pickup ordering, POS, admin panel and a local ESC/POS print bridge. Next.js 16 + Prisma (SQLite locally).

## Run locally
```bash
npm install
npx prisma db push
npm run db:seed
npm run dev            # http://localhost:3000
```
- `/` customer site · `/b/branch-1?table=5` QR dine-in · `/b/branch-1` pickup (CliQ)
- `/pos` POS · `/admin` admin panel
- `.env`: `DATABASE_URL`, `BRIDGE_SECRET` (shared with print bridges), `STAFF_PASSWORD` (Basic auth for `/pos` + `/admin`; empty = open, dev only)

## Smoke test
With the server running: `npm run smoke -- http://localhost:3000` (creates test orders; re-seed afterwards).

## Print bridge
See [`print-bridge/README.md`](print-bridge/README.md). One per branch, `DRY_RUN=true` writes tickets to `print-bridge/debug-receipts/`.

## VPS
Switch `provider` in `prisma/schema.prisma` to `postgresql`/`mysql`, set `DATABASE_URL`, `npx prisma db push`, `npm run build && npm start`. Set `STAFF_PASSWORD` and a strong `BRIDGE_SECRET`.
