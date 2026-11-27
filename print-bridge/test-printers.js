// Installation-day check: node test-printers.js [--kick-drawer]
// Reads the printer IPs from .env, tests TCP :9100, prints a test ticket on each reachable one.
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendToPrinter } from "./printer.js";

const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const kick = process.argv.includes("--kick-drawer");
const STATIONS = ["cashier", "coffee", "kitchen", "pizza"];

const reachable = (ip) =>
  new Promise((resolve) => {
    const s = net.createConnection({ host: ip, port: 9100, timeout: 3000 });
    s.once("connect", () => (s.destroy(), resolve("")));
    s.once("timeout", () => (s.destroy(), resolve("timeout")));
    s.once("error", (e) => resolve(e.code ?? e.message));
  });

const ticket = (station, ip, drawer) =>
  Buffer.concat([
    Buffer.from([0x1b, 0x40, 0x1b, 0x61, 1, 0x1b, 0x45, 1]),
    Buffer.from(`\nDOPA TEST - ${station.toUpperCase()} STATION\n(${ip})\n${new Date().toLocaleString()}\n\n\n\n`, "ascii"),
    Buffer.from([0x1d, 0x56, 66, 0]),
    ...(drawer ? [Buffer.from([0x1b, 0x70, 0, 25, 250])] : []),
  ]);

const rows = [];
for (const station of STATIONS) {
  const ip = process.env[`${station.toUpperCase()}_PRINTER_IP`]?.trim();
  if (!ip) {
    rows.push({ station, ip: "(not set)", tcp9100: "FAIL", print: "-", note: `set ${station.toUpperCase()}_PRINTER_IP in .env` });
    continue;
  }
  const err = await reachable(ip);
  if (err) {
    rows.push({ station, ip, tcp9100: "FAIL", print: "-", note: err });
    continue;
  }
  const drawer = kick && station === "cashier";
  try {
    await sendToPrinter(ip, ticket(station, ip, drawer));
    rows.push({ station, ip, tcp9100: "PASS", print: "PASS", note: drawer ? "drawer pulse sent" : "" });
  } catch (e) {
    rows.push({ station, ip, tcp9100: "PASS", print: "FAIL", note: e.message });
  }
}

console.table(rows);
if (!kick) console.log("Tip: add --kick-drawer to also pulse the RJ11 cash drawer on the cashier printer.");
process.exit(rows.every((r) => r.print === "PASS") ? 0 : 1);
