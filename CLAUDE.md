# CLAUDE.md — Local-First Multi-Agent Sprint (Cafe House & Restaurant POS + Ordering System)

## 1. Mission & Creative Freedom
We are building a **2-Branch Cafe House & Restaurant System** (Customer Website + QR/Pickup Ordering + iPad POS Hub + Admin Panel + Local Deloo Print Bridge) in a **4-hour sprint** on a **~$40 API budget**.
Target: **85–95% functional, runnable, polished completion**.

**Creative Freedom Mandate:**
You are NOT a rigid code-monkey. You have full creative and architectural freedom to:
- Invent smart hospitality features, smooth micro-interactions, and thoughtful UX touches that will genuinely impress the cafe owner.
- Choose clean, expressive naming, component structures, and visual themes (staying editorial, refined, and human-designed — never generic AI templates, never bright orange).
- Add practical operational enhancements (e.g., quick combos/upsells, order rush indicators, kitchen prep timers, shift summaries, smart search, keyboard/touch shortcuts) wherever they elevate the product.

## 2. FIRST STEP — Load User's Custom Skills File
Before writing code, check the project root for the user's skills file (named `claude-skills-use`, `claude-skills-use.md`, `claude_skills_use.md`, or similar `*skills*use*`).
- Read it immediately (via Haiku).
- Install, load, and activate ALL skills/tools listed inside it, and actively apply them throughout the entire build.

## 3. Strict Multi-Agent Delegation Rules (Token & Budget Optimization)
You (Opus) are the **Architect & Orchestrator**. Preserve your ~$40 budget and 4-hour window:
- **`Haiku` sub-agents (Cheap & Fast):**
  - Reading spec files, inspecting directories, reading the user's skills file.
  - Running `npx tsc --noEmit`, `npm run build`, `npx prisma validate`, and returning only concise error summaries.
- **`Sonnet` sub-agents (Parallel Builders):**
  - Writing all TypeScript, React/Next.js pages, API routes, Prisma queries, and `/print-bridge` code.
  - Spawn up to **3 Sonnet sub-agents in parallel** across non-overlapping folders.
- **`Opus` (Orchestrator):**
  - Wave 0 foundation (Next.js init, Prisma schema + seed, shared utilities, layout).
  - Spawning parallel Sonnet sub-agents with clear ownership and creative goals.
  - Final integration review & resolving cross-module blockers.

## 4. 100% Local / Self-Hosted Tech Stack (ZERO Supabase / ZERO External BaaS)
Everything runs locally now and deploys cleanly to a single **VPS (Ubuntu)** later:
- **Framework:** Next.js (App Router, TypeScript, Tailwind CSS)
- **Database & ORM:** **Prisma ORM** with **SQLite** (`file:./dev.db`) for zero-friction local development today (designed so switching to **MySQL / PostgreSQL** on the VPS is a 1-line `provider` change).
- **Real-time Updates (iPad POS & Live Order Tracker):** Next.js **SSE (Server-Sent Events)** endpoint (`/api/events`) or clean 2–3s smart polling with `SWR` / `fetch` — rock-solid, zero external dependencies.
- **File Uploads (CliQ Payment Receipts & Menu Images):** Local filesystem storage in `public/uploads/` via Next.js API route (`/api/upload`).
- **State & Utilities:** `zustand`, `lucide-react`, `qrcode.react`, `papaparse` (CSV menu import).
- **Print Bridge:** Standalone Node.js service in `/print-bridge` polling our local Next.js API (`/api/print-jobs/pending`) and routing ESC/POS jobs to **Deloo** thermal printers + **RJ11 Cash Drawer**.

## 5. File Ownership (Prevent Conflicts Between Parallel Sonnet Agents)
- **Wave 0 (Shared Core):** `prisma/**`, `src/lib/db.ts`, `src/lib/print-dispatcher.ts`, `src/types/**`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/api/upload/**`
- **Sonnet Agent A (Customer Website + QR + Pickup):** `src/app/(customer)/**`, `src/components/customer/**`, `src/store/cart.ts`, `src/app/api/orders/**`
- **Sonnet Agent B (iPad POS Hub + Shifts + Realtime Queue):** `src/app/pos/**`, `src/components/pos/**`, `src/app/api/shifts/**`, `src/app/api/pos/**`
- **Sonnet Agent C (Admin Panel + Print Bridge):** `src/app/admin/**`, `src/components/admin/**`, `src/app/api/admin/**`, `src/app/api/print-jobs/**`, `print-bridge/**`

## 6. Visual Direction
- Primary Language: **Arabic (`dir="rtl"`, `lang="ar"`)** with clean English labels where natural (S/M/L, POS, QR, CliQ).
- Aesthetic: Warm, editorial hospitality design (Warm Off-White, Deep Navy/Charcoal, Muted Sand/Gold, crisp typography like `IBM Plex Sans Arabic` or `Cairo`).
- **Strictly NO bright orange** and no generic glossy AI styling.
