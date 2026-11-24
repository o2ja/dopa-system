# Vision & System Architecture (100% Local / Self-Hosted)

## 1. The Business Context
A **2-branch Cafe House & Restaurant** upgrading from an old legacy cash-register screen to a modern, unified **iPad POS + Customer Ordering Web App** — with **0% commissions** and full ownership on their own VPS.

## 2. Core Pillars (Build These Solidly — Feel Free to Elevate & Innovate!)

### A. Customer Website & Ordering PWA (`/`, `/b/[slug]`, `/order/[id]`)
- **Public Brand Website:** Showcases both branches, opening hours, locations, and full searchable menu.
- **QR Code Dine-in (`/b/branch-1?table=5`):** Auto-detects branch and table number. Allows Cash or CliQ.
- **Student Pre-Order Pickup:** Students order on the way and pick a pickup time.
  - **Anti-Fake-Order Rule:** External pickup orders require **CliQ pre-payment** (display branch CliQ alias + upload receipt screenshot saved to local `public/uploads/`). Order stays `pending_verification` and is **never sent to printers** until cashier approves it on the iPad.
- **Big Menu Support:**
  - Categories, fast search, **Variants** (Small / Medium / Large, Regular / Meal with distinct prices), and **Modifiers** (milk type, sugar, extra shot, no onions, sauces).
- **Live Order Tracking (`/order/[id]`):** Big clear `#order_number` + live status updates via polling/SSE.

### B. iPad POS Hub (`/pos`)
- Built for **iPad Landscape** (the iPad sits at the counter, also connected via Bluetooth to the cafe's Sound System as the single control hub).
- **Fast Cashier Entry:** Touch-friendly category/item grid, quick Variant/Modifier picker, Cash / CliQ / Card checkout.
- **Automatic Split Printing (Coffee vs Kitchen vs Cashier):**
  - Example: Customer orders `Spanish Latte (coffee)` + `Margherita Pizza (kitchen)`.
  - `dispatchPrintJobs()` automatically creates:
    1. `coffee` prep ticket -> Spanish Latte ONLY.
    2. `kitchen` prep ticket -> Margherita Pizza ONLY.
    3. `cashier` receipt -> Full receipt + `open_cash_drawer = true` (when paid Cash, firing the RJ11 cash drawer connected to the cashier printer).
- **Incoming Online/QR Queue:** Live polling/SSE with Web Audio API chime when new orders arrive. Side-by-side CliQ receipt verification modal ("تأكيد الدفع والطباعة" / "رفض").
- **Shift & Cash Drawer Management (Z-Report):** Open shift with Opening Float (العُهدة), track Cash/CliQ/Card sales, manual "فتح درج الكاش" button, and Close Shift cash reconciliation (Expected vs Actual vs Variance).
- **Quick 86:** 1-tap toggle to mark any item Out of Stock for the current branch only.

### C. Admin Panel (`/admin`)
- **2-Branch & Hardware Settings:** Edit hours, CliQ alias, open/closed status, and printer IPs (`coffee_printer_ip`, `kitchen_printer_ip`, `cashier_printer_ip`).
- **Big Menu Manager + CSV Bulk Import:** Full CRUD for categories, items, variants, modifiers, prep station (`coffee` / `kitchen`), plus CSV upload (`papaparse`) for importing large menus fast.
- **QR Code Generator:** Generate printable QR codes for both branches and tables (`1..20`).
- **Sales Analytics:** Daily/weekly revenue per branch, payment method breakdown, and top-selling items.

## 3. Creative Freedom — Ideas You Are Encouraged to Add
- Smart upsell prompts (e.g., "حوّلها لوجبة" badge on sandwiches/burgers).
- Rush-hour order age indicators (color-coded prep timers on POS queue cards).
- Clean "Demo Mode" switcher in the header/footer so the developer can effortlessly demo Customer View, iPad POS, and Admin Panel to the cafe owner tomorrow.
- Smooth, refined Arabic typography (`IBM Plex Sans Arabic` or `Cairo`) with editorial hospitality aesthetics (Warm Off-White, Deep Navy, Muted Gold — **no bright orange**).
