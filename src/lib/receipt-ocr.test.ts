import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeReceiptText } from "./receipt-ocr";

test("pre-confirm screen is flagged, not verified", () => {
  const v = analyzeReceiptText("Payment Confirmation\nTo: DOPAJA\nAmount 4.500 JOD\nCONFIRM", 4500, "DOPAJA", false);
  assert.equal(v.status, "failed");
  assert.equal(v.checks.isPreConfirmScreen, true);
  assert.equal(v.checks.isCompleted, false);
  assert.ok(v.reasons.includes("Pre-confirmation screen detected (not completed)"));
});

test("completed transfer with matching amount + alias is verified", () => {
  const v = analyzeReceiptText("Success\nPayment complete\nJOD 0.326\nRecipient Alias: dopaja", 326, "DOPAJA", false);
  assert.equal(v.status, "verified");
  assert.equal(v.checks.extractedAmount, 0.326);
  assert.deepEqual(v.reasons, []);
});

test("wrong amount, missing alias and duplicate are all reported", () => {
  const v = analyzeReceiptText("Transfer Successful 1.50 JD", 4500, "DOPAJA", true);
  assert.equal(v.status, "failed");
  assert.deepEqual(v.reasons, [
    "Amount mismatch (found 1.500 JOD, expected 4.500 JOD)",
    "Branch CliQ alias not found",
    "Duplicate receipt image already used",
  ]);
});
