import assert from "node:assert/strict";
import test from "node:test";
import { createPaymentAdapter, PayPalSandboxAdapter } from "../src/paypal-adapter.js";

const proposal = {
  id: "proposal-001",
  product: { name: "Recycled A5 Notebook — 12 pack" },
  quantity: 2,
  unitPriceCents: 1899,
  totalCents: 3798,
  currency: "USD",
};

test("sandbox adapter exchanges credentials and creates/captures an order", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/v1/oauth2/token")) {
      return { ok: true, status: 200, json: async () => ({ access_token: "test-token", expires_in: 3600 }) };
    }
    if (url.endsWith("/v2/checkout/orders")) {
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: "ORDER123",
          status: "CREATED",
          links: [{ rel: "approve", href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER123" }],
        }),
      };
    }
    if (url.endsWith("/v2/checkout/orders/ORDER123/capture")) {
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: "ORDER123",
          status: "COMPLETED",
          purchase_units: [{ payments: { captures: [{ id: "CAPTURE123", status: "COMPLETED" }] } }],
        }),
      };
    }
    throw new Error(`Unexpected URL ${url}`);
  };

  const adapter = new PayPalSandboxAdapter({ clientId: "client-id", clientSecret: "client-secret", fetchImpl });
  const order = await adapter.createOrder(proposal);
  assert.equal(order.id, "ORDER123");
  assert.match(order.approvalUrl, /sandbox\.paypal\.com/);

  const capture = await adapter.captureOrder(order.id, proposal);
  assert.equal(capture.captureId, "CAPTURE123");
  assert.equal(calls[0].url, "https://api-m.sandbox.paypal.com/v1/oauth2/token");
  assert.equal(calls[1].url, "https://api-m.sandbox.paypal.com/v2/checkout/orders");
  const orderPayload = JSON.parse(calls[1].options.body);
  assert.equal(orderPayload.purchase_units[0].amount.value, "37.98");
});

test("adapter factory refuses live mode", () => {
  assert.throws(
    () => createPaymentAdapter({ PAYPAL_MODE: "live", PAYPAL_CLIENT_ID: "x", PAYPAL_CLIENT_SECRET: "y" }),
    /Unsupported PAYPAL_MODE/,
  );
  assert.throws(
    () => new PayPalSandboxAdapter({ clientId: "x", clientSecret: "y", environment: "live" }),
    /refuses live PayPal mode/,
  );
});
