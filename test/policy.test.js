import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultPolicy, evaluatePurchase, summarizeSpend } from "../src/policy.js";

const now = new Date("2026-10-30T17:00:00.000Z");

function purchase(overrides = {}) {
  return {
    totalCents: 5000,
    currency: "USD",
    merchant: "Northwind Supply",
    category: "office",
    ...overrides,
  };
}

test("policy auto-approves a small allowlisted purchase", () => {
  const result = evaluatePurchase({ policy: createDefaultPolicy(), purchase: purchase(), now });
  assert.equal(result.decision, "AUTO_APPROVED");
  assert.equal(result.allowed, true);
  assert.equal(result.failedChecks.length, 0);
});

test("policy requires a human above the auto-approval threshold", () => {
  const result = evaluatePurchase({ policy: createDefaultPolicy(), purchase: purchase({ totalCents: 9000 }), now });
  assert.equal(result.decision, "NEEDS_APPROVAL");
  assert.equal(result.requiresHumanApproval, true);
});

test("policy rejects a merchant outside the allowlist", () => {
  const result = evaluatePurchase({ policy: createDefaultPolicy(), purchase: purchase({ merchant: "Unlisted Deals", category: "gift-cards" }), now });
  assert.equal(result.decision, "REJECTED");
  assert.deepEqual(result.failedChecks.map((item) => item.code), ["MERCHANT_ALLOWLISTED", "CATEGORY_ALLOWLISTED"]);
});

test("policy enforces per-order and monthly limits using committed spend", () => {
  const policy = createDefaultPolicy();
  const overCap = evaluatePurchase({ policy, purchase: purchase({ totalCents: 15001 }), now });
  assert.equal(overCap.decision, "REJECTED");
  assert.ok(overCap.failedChecks.some((item) => item.code === "PER_ORDER_CAP"));

  const ledger = [{ amountCents: 47000, status: "CAPTURED", createdAt: now.toISOString() }];
  const overBudget = evaluatePurchase({ policy, purchase: purchase({ totalCents: 4000 }), ledger, now });
  assert.equal(overBudget.decision, "REJECTED");
  assert.ok(overBudget.failedChecks.some((item) => item.code === "MONTHLY_BUDGET"));
  assert.equal(summarizeSpend(ledger, now).monthCents, 47000);
});
