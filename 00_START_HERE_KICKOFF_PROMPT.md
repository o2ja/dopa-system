# البرومبت الجاهز للبدء فوراً (Copy & Paste into Claude Code)

## قبل ما تلصق البرومبت:
1. فك ضغط الملفات داخل مجلد المشروع.
2. حط ملف الـ Skills تبعك (`claude-skills-use`) داخل نفس المجلد.
3. افتح **Claude Code** على **Opus (Medium)** والصق البرومبت التالي مباشرة:

---

```text
Read CLAUDE.md first. Then use a Haiku sub-agent to:
1. Find and read my custom skills file in the root directory (named `claude-skills-use` or similar) — install, load, and activate ALL skills listed in it so we use them throughout this build.
2. Summarize `01_VISION_AND_ARCHITECTURE.md`, `02_PARALLEL_SPRINT_PLAN.md`, and `03_PRINT_BRIDGE_SPEC.md` so you have the full picture without burning Opus tokens.

We have a 4-hour sprint and a ~$40 API budget. Everything is 100% LOCAL / SELF-HOSTED (Next.js App Router + Prisma ORM with SQLite for instant local dev, ready to switch to MySQL/PostgreSQL on our VPS — NO Supabase, NO external cloud BaaS).

You have full creative freedom to design an impressive, editorial, hospitality-grade UI/UX and add smart features that make this system feel like a real flagship product for a 2-branch Cafe House & Restaurant.

Follow CLAUDE.md's strict delegation (Opus = Orchestrator, Sonnet = 3 parallel builders, Haiku = cheap file reader & build/typecheck verifier).

Start WAVE 0 immediately:
1. Load/apply my skills from the skills file.
2. Initialize Next.js (App Router, TypeScript, Tailwind CSS) and install dependencies (`prisma`, `@prisma/client`, `lucide-react`, `qrcode.react`, `papaparse`, `@types/papaparse`, `zustand`).
3. Design and create a clean `prisma/schema.prisma` (SQLite locally) covering: 2 Branches (with Coffee/Kitchen/Cashier Deloo printer IPs & CliQ alias), Categories, Big Menu Items (with `station: coffee | kitchen`), Variants (S/M/L, Regular/Meal), Modifiers, Branch-specific availability (Quick 86), Cash Shifts (Z-Report), Orders (POS / QR Table / Web Pickup with CliQ receipt verification), Order Items, and Print Jobs queue (Split Printing + RJ11 Cash Drawer trigger).
4. Push the schema (`npx prisma db push`) and run a rich Arabic/English seed script (2 branches, Coffee + Restaurant categories, 16+ items with variants & modifiers).
5. Build shared core files: `src/lib/db.ts`, `src/lib/print-dispatcher.ts` (auto-splits orders into Coffee ticket, Kitchen ticket, and Cashier receipt + Cash Drawer pulse), `src/app/api/upload/route.ts` (saves CliQ receipts locally to `public/uploads/`), and RTL Arabic `layout.tsx` + `globals.css`.

As soon as Wave 0 passes a quick Haiku check, launch WAVE 1 with 3 PARALLEL Sonnet sub-agents (respecting file ownership in CLAUDE.md):
- Sonnet Agent A: Customer Website, Big Menu, Variants/Modifiers Modal, QR/Table routing, Cart, CliQ Pre-Order Checkout (blocking unverified pickup orders), and Live Order Tracking.
- Sonnet Agent B: iPad POS Hub (landscape touch-friendly layout, fast cashier entry, live incoming online/QR queue with audio alert, CliQ receipt verification modal, Split-Print & Cash Drawer trigger, Shift & Z-Report cash reconciliation, Quick 86 out-of-stock toggle, plus any smart UX touches).
- Sonnet Agent C: Admin Panel (2-branch & printer settings, Big Menu CRUD + CSV bulk import, QR Code generator for branches/tables, Live Sales Analytics) AND the standalone `/print-bridge` Node.js ESC/POS service per `03_PRINT_BRIDGE_SPEC.md`.

Then run WAVE 2: Haiku runs `npx tsc --noEmit` and `npm run build`, reports any errors concisely, and Sonnet fixes them until the build is 100% green and runnable with `npm run dev`.

Do not pause for unnecessary confirmations. Begin Wave 0 now.
```
