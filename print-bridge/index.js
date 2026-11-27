import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendToPrinter, writeDebug } from "./printer.js";
import { renderJob } from "./receipt-renderer.js";

const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const { API_BASE_URL, BRANCH_ID, BRIDGE_SECRET } = process.env;
const DRY_RUN = process.env.DRY_RUN === "true";
const POLL_MS = 2000;
const MAX_BACKOFF_MS = 30_000;

if (!API_BASE_URL || !BRANCH_ID || !BRIDGE_SECRET) {
  console.error("Missing config. Copy .env.example to .env and set API_BASE_URL, BRANCH_ID and BRIDGE_SECRET.");
  process.exit(1);
}

const log = (...a) => console.log(new Date().toISOString(), ...a);
const headers = { "x-bridge-secret": BRIDGE_SECRET, "content-type": "application/json" };
const api = (p, init) => fetch(`${API_BASE_URL.replace(/\/+$/, "")}${p}`, { ...init, headers, signal: AbortSignal.timeout(8000) });

const ENV_IP = { coffee: process.env.COFFEE_PRINTER_IP, kitchen: process.env.KITCHEN_PRINTER_IP, pizza: process.env.PIZZA_PRINTER_IP, cashier: process.env.CASHIER_PRINTER_IP };
const printerIp = (station, branch) => ENV_IP[station] || branch[`${station}PrinterIp`] || "";

async function fetchPending() {
  const res = await api(`/api/print-jobs/pending?branchId=${encodeURIComponent(BRANCH_ID)}`);
  if (res.status === 401) throw new Error("401 from server: BRIDGE_SECRET does not match (or is unset on the server)");
  if (!res.ok) throw new Error(`Server answered ${res.status}`);
  return res.json();
}

async function report(id, status, errorMessage) {
  const res = await api(`/api/print-jobs/${id}`, { method: "PATCH", body: JSON.stringify({ status, errorMessage }) });
  if (!res.ok) throw new Error(`PATCH ${id} answered ${res.status}`);
}

// Jobs printed but whose "printed" report failed (API blip). Never print these twice.
const printedNotReported = new Set();

async function handle(job, branch) {
  try {
    if (!printedNotReported.has(job.id)) {
      const out = renderJob(job);
      if (DRY_RUN) {
        log(`DRY_RUN ${job.station}/${job.jobType} ->`, await writeDebug(job, out));
      } else {
        const ip = printerIp(job.station, branch);
        if (!ip) throw new Error(`No IP set for the ${job.station} printer`);
        await sendToPrinter(ip, out.bytes);
        log(`printed ${job.station}/${job.jobType} on ${ip}`);
      }
      printedNotReported.add(job.id);
    }
    await report(job.id, "printed");
    printedNotReported.delete(job.id);
  } catch (err) {
    log(`job ${job.id} failed:`, err.message);
    if (printedNotReported.has(job.id)) throw err; // printed already, only the report failed: retry the report
    await report(job.id, "failed", err.message).catch((e) => log("could not report failure:", e.message));
  }
}

let running = true;
let wake;
const sleep = (ms) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    wake = () => (clearTimeout(t), resolve());
  });

process.on("SIGINT", () => {
  log("SIGINT: finishing the current job, then stopping...");
  running = false;
  wake?.();
});

log(`Print bridge for branch "${BRANCH_ID}" -> ${API_BASE_URL}${DRY_RUN ? " (DRY_RUN: nothing is sent to printers)" : ""}`);

let backoff = POLL_MS;
while (running) {
  try {
    const { branch, jobs } = await fetchPending();
    backoff = POLL_MS;
    for (const job of jobs) {
      if (!running) break;
      await handle(job, branch);
    }
    await sleep(POLL_MS);
  } catch (err) {
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    log(`API unreachable or erroring (${err.message}). Retrying in ${backoff / 1000}s`);
    await sleep(backoff);
  }
}
log("Stopped.");
