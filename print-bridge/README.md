# Dopa print bridge

A small Node.js service that runs on a mini PC / Raspberry Pi in each branch, on the same LAN as the Deloo ESC/POS printers. It polls the Dopa server every 2 seconds, prints the pending jobs over raw TCP (port 9100) and reports the result back. No npm dependencies.

Tickets are plain English ESC/POS text (80mm paper, 48 columns, Font A). No bitmaps, no fonts to install.

## Requirements

- Node.js 20.12 or newer (`node --version`)
- The server must have `BRIDGE_SECRET` set in its own `.env`; the bridge sends it as the `x-bridge-secret` header.

## Setup

```bash
cd print-bridge
cp .env.example .env     # PowerShell: Copy-Item .env.example .env
# edit .env
node test-render.js      # offline self-test, writes samples to ./debug-receipts/
node index.js
```

## Configuration (`.env`)

| Variable | Meaning |
| --- | --- |
| `API_BASE_URL` | Dopa server URL, e.g. `http://192.168.1.10:3000` |
| `BRANCH_ID` | This branch's slug (`branch-1`) or id. One bridge per branch. |
| `BRIDGE_SECRET` | Must match the server's `BRIDGE_SECRET` |
| `DRY_RUN` | `true` writes `.txt` previews and `.bin` ESC/POS bytes to `./debug-receipts/` and sends nothing to printers. Jobs are still reported as printed. |
| `COFFEE_PRINTER_IP`, `KITCHEN_PRINTER_IP`, `PIZZA_PRINTER_IP`, `CASHIER_PRINTER_IP` | Optional overrides. If empty, the IPs saved in Admin > Branches are used. |

## What gets printed

| Job | Output |
| --- | --- |
| `ticket` (coffee / kitchen) | `COFFEE TICKET` / `KITCHEN TICKET`: huge order number, table or pickup time, large item lines with variant, modifiers and notes. No prices. |
| `receipt` (cashier) | `CUSTOMER RECEIPT`: items with prices in JOD, total, payment method. |
| `open_drawer` | Drawer pulse only (`ESC p 0 25 250`), no paper. |
| Receipt with `openCashDrawer` | Print, cut, then pulse the drawer. |
| Reprint | `** REPRINT **` banner at the top. |

Non-ASCII characters in names print as `?` because the printers have no UTF-8 code page.

## Retries

A failed print is reported to the server, which puts the job back in the queue. After 3 failed attempts it stays `failed` and shows in Admin > Branches, where it can be retried. If the API is down the bridge backs off (4s, 8s ... up to 30s) and keeps trying. If a job printed but the "printed" report failed, the bridge will not print it a second time; it only retries the report.

## Run as a service

pm2:

```bash
npm i -g pm2
cd /path/to/print-bridge
pm2 start index.js --name dopa-bridge
pm2 save && pm2 startup
```

systemd (`/etc/systemd/system/dopa-bridge.service`):

```ini
[Unit]
Description=Dopa print bridge
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/dopa/print-bridge
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
User=pi

[Install]
WantedBy=multi-user.target
```

then `sudo systemctl enable --now dopa-bridge`. On Ctrl+C (SIGINT) the bridge finishes the current job, then exits.

## Troubleshooting

- **`401 from server`**: `BRIDGE_SECRET` differs from the server's, or is not set on the server.
- **`API unreachable`**: wrong `API_BASE_URL`, firewall, or the server is down. The bridge keeps retrying.
- **`timed out after 5s` / `ECONNREFUSED`**: wrong printer IP, printer off, or on another subnet. Check from this machine: `Test-NetConnection <ip> -Port 9100` (PowerShell) or `nc -vz <ip> 9100`. Print the printer's self-test page to read its IP and give it a fixed address in the router.
- **`No IP set for the ... printer`**: fill the IP in Admin > Branches or the `.env` override.
- **Garbled characters**: the printer is not in ESC/POS mode or uses an unusual code page. Names are sent as plain ASCII.
- **Drawer does not open**: it must be plugged into the cashier printer's RJ11 port. Receipts only open it for paid cash orders; use "Open drawer" from the POS otherwise.
- **Preview first**: set `DRY_RUN=true` and read the files in `./debug-receipts/`.
