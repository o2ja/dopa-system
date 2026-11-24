import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createWorker } from "tesseract.js";
import { db } from "@/lib/db";
import type { ReceiptVerification } from "@/types";

// English model shipped in node_modules: nothing is fetched from a CDN at runtime.
const LANG_PATH = path.join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0");

const COMPLETED = /success|payment complete|completed/i; // covers Successful / successfully processed
const PRE_CONFIRM = /payment confirmation|\bCONFIRM\b/;
const AMOUNTS = [/(?:JOD|JD)\s*(\d+(?:\.\d{1,3})?)/gi, /(\d+(?:\.\d{1,3})?)\s*(?:JOD|JD)/gi];
const jod = (n: number) => `${n.toFixed(3)} JOD`;

/** Pure text checks (unit-tested). expectedFils is the order total in fils. */
export function analyzeReceiptText(text: string, expectedFils: number, cliqAlias: string, isDuplicate: boolean): ReceiptVerification {
  const completeHit = COMPLETED.test(text);
  const isPreConfirmScreen = PRE_CONFIRM.test(text) && !completeHit;
  const isCompleted = completeHit && !isPreConfirmScreen;

  const found = AMOUNTS.flatMap((re) => [...text.matchAll(re)].map((m) => Number(m[1])));
  const hit = found.find((a) => Math.abs(a * 1000 - expectedFils) <= 10); // 0.01 JOD tolerance
  const amountMatched = hit !== undefined;
  const extractedAmount = hit ?? found[0] ?? null;

  const alias = cliqAlias.trim().toLowerCase();
  const aliasMatched = !!alias && text.toLowerCase().includes(alias);

  const reasons: string[] = [];
  if (isPreConfirmScreen) reasons.push("Pre-confirmation screen detected (not completed)");
  else if (!isCompleted) reasons.push("No completed-transfer message found");
  if (!amountMatched)
    reasons.push(extractedAmount === null ? "No JOD amount found" : `Amount mismatch (found ${jod(extractedAmount)}, expected ${jod(expectedFils / 1000)})`);
  if (!aliasMatched) reasons.push("Branch CliQ alias not found");
  if (isDuplicate) reasons.push("Duplicate receipt image already used");

  const status = isPreConfirmScreen || isDuplicate ? "failed" : reasons.length ? "warning" : "verified";
  return {
    status,
    checks: { isCompleted, isPreConfirmScreen, amountMatched, extractedAmount, aliasMatched, isDuplicate },
    reasons,
    rawSnippet: text.replace(/\s+/g, " ").trim().slice(0, 300),
  };
}

async function ocr(image: Buffer) {
  // shortcut: one worker per receipt (~1s start-up); keep a shared worker if CliQ volume ever makes this a bottleneck.
  const worker = await createWorker("eng", 1, { langPath: LANG_PATH, gzip: true, cacheMethod: "none" });
  try {
    return (await worker.recognize(image)).data.text;
  } finally {
    await worker.terminate();
  }
}

const unreadable = (isDuplicate: boolean): ReceiptVerification => ({
  status: isDuplicate ? "failed" : "warning",
  checks: { isCompleted: false, isPreConfirmScreen: false, amountMatched: false, extractedAmount: null, aliasMatched: false, isDuplicate },
  reasons: ["Could not read receipt text automatically — verify manually", ...(isDuplicate ? ["Duplicate receipt image already used"] : [])],
  rawSnippet: "",
});

/** Hash + OCR the order's receipt and store the result. Never throws: any failure leaves a "verify manually" warning. */
export async function verifyReceipt(orderId: string) {
  let isDuplicate = false;
  let result: ReceiptVerification;
  try {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { branch: true } });
    if (!order?.receiptUrl) return;
    const image = await readFile(path.join(process.cwd(), "public", "uploads", path.basename(order.receiptUrl)));
    const receiptHash = createHash("sha256").update(image).digest("hex");
    isDuplicate = !!(await db.order.findFirst({ where: { receiptHash, id: { not: orderId } }, select: { id: true } }));
    await db.order.update({ where: { id: orderId }, data: { receiptHash } });
    result = analyzeReceiptText(await ocr(image), order.total, order.branch.cliqAlias, isDuplicate);
  } catch (e) {
    console.error("receipt OCR failed", e);
    result = unreadable(isDuplicate);
  }
  await db.order.update({ where: { id: orderId }, data: { receiptVerification: JSON.stringify(result) } }).catch(console.error);
}

