# Local Print Bridge Specification (`/print-bridge`) — 100% Local API Polling

## Purpose
A lightweight standalone Node.js service running on a local PC / Mini PC / Raspberry Pi inside each branch on the same LAN as the **Deloo** ESC/POS thermal printers.

## How It Connects (No Supabase Needed)
- Polls our Next.js server API every **2 seconds**:
  - `GET ${API_BASE_URL}/api/print-jobs/pending?branchId=${BRANCH_ID}` (secured with a simple `x-bridge-secret` header).
- Marks jobs complete or failed via:
  - `PATCH ${API_BASE_URL}/api/print-jobs/${jobId}` with `{ status: 'printed' | 'failed', errorMessage? }`.

## Routing & Cash Drawer
- Reads printer IPs from `.env` or from the branch config returned by the API:
  - `station === 'coffee'` -> `COFFEE_PRINTER_IP:9100`
  - `station === 'kitchen'` -> `KITCHEN_PRINTER_IP:9100`
  - `station === 'cashier'` -> `CASHIER_PRINTER_IP:9100`
- **Cash Drawer (`RJ11` plugged into Cashier Printer):**
  - If `jobType === 'open_drawer'` -> send `openCashDrawer()` pulse only.
  - If `openCashDrawer === true` on a `receipt` job -> print receipt, cut paper, then fire `openCashDrawer()`.

## Arabic Printing & Dry-Run Mode
- Include a clean `receipt-renderer.js` that formats Arabic prep tickets (`تذكرة الكوفي` / `تذكرة المطبخ`) and customer receipts (`فاتورة الزبون`) cleanly for 80mm thermal paper (576px width).
- Support `DRY_RUN=true` in `.env` so the developer can test the entire split-printing & cash-drawer flow on their laptop immediately (logging/saving rendered tickets to `./debug-receipts/` without needing a physical Deloo printer plugged in).
