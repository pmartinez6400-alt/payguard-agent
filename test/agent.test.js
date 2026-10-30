import assert from "node:assert/strict";
import test from "node:test";
import { planPurchase } from "../src/agent.js";
import { loadCatalog } from "../src/app-service.js";

const catalog = loadCatalog();

test("agent parses quantity and chooses the recycled notebook", () => {
  const plan = planPurchase({ prompt: "Buy 2 packs of recycled notebooks for the team", catalog });
  assert.equal(plan.quantity, 2);
  assert.equal(plan.product.id, "sku-notebook-recycled-a5");
  assert.equal(plan.totalCents, 3798);
  assert.match(plan.reasoning.join(" "), /Compared 2 matching/);
});

test("agent applies a stated budget to a dock request", () => {
  const plan = planPurchase({ prompt: "Buy 1 USB-C dock for the new team laptop under $80", catalog });
  assert.equal(plan.product.id, "sku-usbc-dock");
  assert.equal(plan.totalCents, 6499);
});

test("agent can intentionally surface a blocked gift-card option", () => {
  const plan = planPurchase({ prompt: "Buy a $100 gift card from Unlisted Deals", catalog });
  assert.equal(plan.product.id, "sku-gift-card-marketplace");
  assert.equal(plan.merchant, "Unlisted Deals");
});
