import { formatMoney } from "./policy.js";

const STOP_WORDS = new Set([
  "a", "an", "and", "buy", "for", "get", "need", "order", "please", "the", "under", "with",
]);

function extractQuantity(prompt) {
  const normalized = prompt.toLowerCase();
  const patterns = [
    /(?:buy|order|get|need)\s+(\d{1,3})\b/,
    /\b(\d{1,3})\s*(?:x|packs?|units?|boxes?|items?)\b/,
    /\bx\s*(\d{1,3})\b/,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return Math.max(1, Number.parseInt(match[1], 10));
  }
  return 1;
}

function extractBudgetCents(prompt) {
  const match = prompt.toLowerCase().match(/(?:under|below|max(?:imum)?|budget(?: of)?)\s*\$\s*(\d+(?:\.\d{1,2})?)/);
  return match ? Math.round(Number.parseFloat(match[1]) * 100) : null;
}

function tokens(text) {
  return text.toLowerCase().split(/[^a-z0-9-]+/).filter((token) => token && !STOP_WORDS.has(token));
}

function relevance(product, promptTokens) {
  const haystack = new Set([
    ...tokens(product.name),
    ...tokens(product.category),
    ...product.keywords.flatMap((keyword) => tokens(keyword)),
  ]);
  return promptTokens.reduce((score, token) => score + (haystack.has(token) ? 1 : 0), 0);
}

export function planPurchase({ prompt, catalog }) {
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    throw new Error("Describe what the agent should buy.");
  }

  const quantity = extractQuantity(prompt);
  const budgetCents = extractBudgetCents(prompt);
  const promptTokens = tokens(prompt);
  const ranked = catalog
    .map((product) => ({ product, score: relevance(product, promptTokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score
      || a.product.unitPriceCents - b.product.unitPriceCents
      || b.product.rating - a.product.rating);

  if (ranked.length === 0) {
    throw new Error("No catalog item matched that request. Try notebooks, coffee, a USB-C dock, a desk, or a gift card.");
  }

  const withinBudget = ranked.filter(({ product }) => product.stock >= quantity
    && (budgetCents === null || product.unitPriceCents * quantity <= budgetCents));
  const selectedEntry = withinBudget[0] ?? ranked.find(({ product }) => product.stock >= quantity) ?? ranked[0];
  const product = selectedEntry.product;
  const totalCents = product.unitPriceCents * quantity;

  const alternatives = ranked
    .filter(({ product: candidate }) => candidate.id !== product.id)
    .slice(0, 2)
    .map(({ product: candidate, score }) => ({
      productId: candidate.id,
      name: candidate.name,
      merchant: candidate.merchant,
      totalCents: candidate.unitPriceCents * quantity,
      relevance: score,
    }));

  const reasoning = [
    `Interpreted the request as ${quantity} × ${product.name}.`,
    `Compared ${ranked.length} matching catalog option${ranked.length === 1 ? "" : "s"}.`,
    budgetCents === null
      ? `Selected the best value match at ${formatMoney(totalCents)} with a ${product.rating}/5 rating.`
      : `Applied the requested ${formatMoney(budgetCents)} ceiling where possible; selected total is ${formatMoney(totalCents)}.`,
    product.stock >= quantity
      ? `${product.stock} units are in stock; estimated lead time is ${product.leadTimeDays} day${product.leadTimeDays === 1 ? "" : "s"}.`
      : `Only ${product.stock} units are in stock, so fulfillment needs review.`,
  ];

  return {
    prompt: prompt.trim(),
    product,
    quantity,
    unitPriceCents: product.unitPriceCents,
    totalCents,
    currency: product.currency,
    merchant: product.merchant,
    category: product.category,
    reasoning,
    alternatives,
    agent: {
      engine: "local-deterministic-planner",
      externalModelRequired: false,
      note: "This account-free planner exposes the same plan/evaluate/approve/execute contract that a cloud LLM tool-caller can drive later.",
    },
  };
}
