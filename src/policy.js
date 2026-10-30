export const POLICY_DECISION = Object.freeze({
  AUTO_APPROVED: "AUTO_APPROVED",
  NEEDS_APPROVAL: "NEEDS_APPROVAL",
  REJECTED: "REJECTED",
});

const COUNTED_STATUSES = new Set(["APPROVED", "EXECUTING", "CAPTURED"]);

export function createDefaultPolicy() {
  return {
    currency: "USD",
    perOrderCapCents: 15000,
    dailyCapCents: 25000,
    monthlyBudgetCents: 50000,
    autoApproveLimitCents: 7500,
    allowedMerchants: ["Northwind Supply", "BluePeak Goods", "Cedar Roast Co.", "Summit Workspace"],
    allowedCategories: ["office", "hardware", "pantry", "furniture"],
  };
}

export function validatePolicy(input = {}) {
  const policy = { ...createDefaultPolicy(), ...input };
  const moneyFields = [
    "perOrderCapCents",
    "dailyCapCents",
    "monthlyBudgetCents",
    "autoApproveLimitCents",
  ];

  for (const field of moneyFields) {
    if (!Number.isInteger(policy[field]) || policy[field] < 0) {
      throw new Error(`${field} must be a non-negative integer number of cents.`);
    }
  }
  if (policy.currency !== "USD") {
    throw new Error("This hackathon build currently supports USD only.");
  }
  if (!Array.isArray(policy.allowedMerchants) || !Array.isArray(policy.allowedCategories)) {
    throw new Error("Merchant and category allowlists must be arrays.");
  }

  policy.allowedMerchants = [...new Set(policy.allowedMerchants.map((value) => String(value).trim()).filter(Boolean))];
  policy.allowedCategories = [...new Set(policy.allowedCategories.map((value) => String(value).trim().toLowerCase()).filter(Boolean))];
  return policy;
}

export function formatMoney(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    currency,
    style: "currency",
  }).format(cents / 100);
}

function sameDay(left, right) {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate();
}

function sameMonth(left, right) {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth();
}

export function summarizeSpend(ledger = [], now = new Date()) {
  const counted = ledger.filter((entry) => COUNTED_STATUSES.has(entry.status));
  return {
    todayCents: counted
      .filter((entry) => sameDay(new Date(entry.createdAt), now))
      .reduce((sum, entry) => sum + entry.amountCents, 0),
    monthCents: counted
      .filter((entry) => sameMonth(new Date(entry.createdAt), now))
      .reduce((sum, entry) => sum + entry.amountCents, 0),
    capturedCents: ledger
      .filter((entry) => entry.status === "CAPTURED")
      .reduce((sum, entry) => sum + entry.amountCents, 0),
  };
}

function check(code, label, passed, detail) {
  return { code, label, passed, detail };
}

export function evaluatePurchase({ policy, purchase, ledger = [], now = new Date() }) {
  const cleanPolicy = validatePolicy(policy);
  const spend = summarizeSpend(ledger, now);
  const amountCents = purchase.totalCents;

  const checks = [
    check(
      "CURRENCY_SUPPORTED",
      "Currency is supported",
      purchase.currency === cleanPolicy.currency,
      `${purchase.currency} requested; policy supports ${cleanPolicy.currency}.`,
    ),
    check(
      "MERCHANT_ALLOWLISTED",
      "Merchant is allowlisted",
      cleanPolicy.allowedMerchants.includes(purchase.merchant),
      `${purchase.merchant} ${cleanPolicy.allowedMerchants.includes(purchase.merchant) ? "is" : "is not"} on the merchant allowlist.`,
    ),
    check(
      "CATEGORY_ALLOWLISTED",
      "Category is allowlisted",
      cleanPolicy.allowedCategories.includes(String(purchase.category).toLowerCase()),
      `${purchase.category} ${cleanPolicy.allowedCategories.includes(String(purchase.category).toLowerCase()) ? "is" : "is not"} an approved spending category.`,
    ),
    check(
      "PER_ORDER_CAP",
      "Per-order cap",
      amountCents <= cleanPolicy.perOrderCapCents,
      `${formatMoney(amountCents)} against a ${formatMoney(cleanPolicy.perOrderCapCents)} cap.`,
    ),
    check(
      "DAILY_CAP",
      "Daily cap",
      spend.todayCents + amountCents <= cleanPolicy.dailyCapCents,
      `${formatMoney(spend.todayCents)} already committed today; cap is ${formatMoney(cleanPolicy.dailyCapCents)}.`,
    ),
    check(
      "MONTHLY_BUDGET",
      "Monthly budget",
      spend.monthCents + amountCents <= cleanPolicy.monthlyBudgetCents,
      `${formatMoney(spend.monthCents)} already committed this month; budget is ${formatMoney(cleanPolicy.monthlyBudgetCents)}.`,
    ),
  ];

  const failedChecks = checks.filter((item) => !item.passed);
  const requiresHumanApproval = failedChecks.length === 0 && amountCents > cleanPolicy.autoApproveLimitCents;
  const decision = failedChecks.length > 0
    ? POLICY_DECISION.REJECTED
    : requiresHumanApproval
      ? POLICY_DECISION.NEEDS_APPROVAL
      : POLICY_DECISION.AUTO_APPROVED;

  return {
    decision,
    allowed: failedChecks.length === 0,
    requiresHumanApproval,
    failedChecks,
    checks,
    spend,
    evaluatedAt: now.toISOString(),
    explanation: failedChecks.length > 0
      ? `Blocked by ${failedChecks.map((item) => item.label.toLowerCase()).join(", ")}.`
      : requiresHumanApproval
        ? `Within every hard policy limit, but above the ${formatMoney(cleanPolicy.autoApproveLimitCents)} auto-approval threshold.`
        : `Within every policy limit and below the ${formatMoney(cleanPolicy.autoApproveLimitCents)} auto-approval threshold.`,
  };
}
