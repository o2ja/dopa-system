import net from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEBUG_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "debug-receipts");
const PORT = 9100;
const TIMEOUT_MS = 5000;

/** Raw TCP to the printer. Resolves once the bytes are flushed and the socket is closed. */
export function sendToPrinter(ip, bytes) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: ip, port: PORT });
    socket.setTimeout(TIMEOUT_MS);
    socket.once("timeout", () => socket.destroy(new Error(`Printer ${ip}:${PORT} timed out after ${TIMEOUT_MS / 1000}s`)));
    socket.once("error", reject);
    socket.once("close", (hadError) => !hadError && resolve());
    socket.once("connect", () => socket.end(bytes));
  });
}

/** DRY_RUN: write a readable preview and the exact ESC/POS bytes instead of printing. */
export async function writeDebug(job, { bytes, text }) {
  await mkdir(DEBUG_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.join(DEBUG_DIR, `${stamp}-${job.station}-${job.jobType}-${String(job.id).slice(-6)}`);
  await Promise.all([writeFile(`${base}.txt`, text, "utf8"), writeFile(`${base}.bin`, bytes)]);
  return `${base}.txt`;
}
