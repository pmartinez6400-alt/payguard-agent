const SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com";

function moneyValue(cents) {
  return (cents / 100).toFixed(2);
}

function findLink(links = [], candidates = []) {
  return links.find((link) => candidates.includes(link.rel))?.href ?? null;
}

export class MockPayPalAdapter {
  constructor() {
    this.mode = "mock";
    this.sequence = 0;
  }

  isConfigured() {
    return true;
  }

  describe() {
    return {
      mode: this.mode,
      configured: true,
      environment: "sandbox-shaped mock",
      networkCalls: false,
      note: "Responses mirror PayPal Orders v2 resource shapes, but no PayPal account or network call is used.",
    };
  }

  async createOrder(proposal) {
    this.sequence += 1;
    const id = `MOCK-ORDER-${String(this.sequence).padStart(4, "0")}`;
    return {
      id,
      status: "APPROVED",
      mode: this.mode,
      approvalUrl: null,
      raw: {
        id,
        intent: "CAPTURE",
        status: "APPROVED",
        purchase_units: [{
          reference_id: proposal.id,
          amount: { currency_code: proposal.currency, value: moneyValue(proposal.totalCents) },
        }],
        payer: { email_address: "sandbox-buyer@example.test" },
        links: [{ href: `mock://paypal/orders/${id}`, rel: "self", method: "GET" }],
      },
    };
  }

  async captureOrder(orderId, proposal) {
    const captureId = `MOCK-CAPTURE-${orderId.replace("MOCK-ORDER-", "")}`;
    return {
      id: orderId,
      captureId,
      status: "COMPLETED",
      mode: this.mode,
      raw: {
        id: orderId,
        status: "COMPLETED",
        purchase_units: [{
          reference_id: proposal.id,
          payments: {
            captures: [{
              id: captureId,
              status: "COMPLETED",
              amount: { currency_code: proposal.currency, value: moneyValue(proposal.totalCents) },
            }],
          },
        }],
      },
    };
  }
}

export class PayPalSandboxAdapter {
  constructor({ clientId, clientSecret, fetchImpl = globalThis.fetch, environment = "sandbox" } = {}) {
    if (environment !== "sandbox") {
      throw new Error("This project refuses live PayPal mode. Set PAYPAL_ENV=sandbox.");
    }
    this.mode = "sandbox";
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.fetchImpl = fetchImpl;
    this.baseUrl = SANDBOX_BASE_URL;
    this.tokenCache = null;
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  describe() {
    return {
      mode: this.mode,
      configured: this.isConfigured(),
      environment: "PayPal Sandbox",
      networkCalls: this.isConfigured(),
      note: this.isConfigured()
        ? "Sandbox credentials are present. Secrets are never exposed to the browser or API responses."
        : "Sandbox credentials are missing. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to the server environment.",
    };
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error("PayPal Sandbox is not configured. Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET.");
    }
  }

  async getAccessToken() {
    this.assertConfigured();
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.value;
    }

    const response = await this.fetchImpl(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
      throw new Error(`PayPal OAuth failed with HTTP ${response.status}: ${payload.error_description ?? payload.error ?? "unknown error"}`);
    }

    this.tokenCache = {
      value: payload.access_token,
      expiresAt: Date.now() + ((payload.expires_in ?? 3600) * 1000),
    };
    return this.tokenCache.value;
  }

  async request(path, options = {}) {
    const token = await this.getAccessToken();
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`PayPal API ${path} failed with HTTP ${response.status}: ${payload.message ?? payload.name ?? "unknown error"}`);
    }
    return payload;
  }

  async createOrder(proposal) {
    const payload = await this.request("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": `payguard-${proposal.id}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: proposal.id,
          description: `${proposal.quantity} × ${proposal.product.name}`,
          custom_id: proposal.id,
          amount: {
            currency_code: proposal.currency,
            value: moneyValue(proposal.totalCents),
            breakdown: {
              item_total: { currency_code: proposal.currency, value: moneyValue(proposal.totalCents) },
            },
          },
          items: [{
            name: proposal.product.name.slice(0, 127),
            quantity: String(proposal.quantity),
            unit_amount: { currency_code: proposal.currency, value: moneyValue(proposal.unitPriceCents) },
          }],
        }],
        application_context: {
          brand_name: "PayGuard Agent",
          landing_page: "LOGIN",
          user_action: "PAY_NOW",
        },
      }),
    });

    return {
      id: payload.id,
      status: payload.status,
      mode: this.mode,
      approvalUrl: findLink(payload.links, ["approve", "payer-action"]),
      raw: payload,
    };
  }

  async captureOrder(orderId) {
    const payload = await this.request(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: { "PayPal-Request-Id": `payguard-capture-${orderId}` },
      body: JSON.stringify({}),
    });
    const capture = payload.purchase_units?.[0]?.payments?.captures?.[0];
    return {
      id: payload.id,
      captureId: capture?.id ?? null,
      status: payload.status,
      mode: this.mode,
      raw: payload,
    };
  }

  async getOrder(orderId) {
    return this.request(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
  }
}

export function createPaymentAdapter(env = process.env) {
  const mode = (env.PAYPAL_MODE ?? "mock").toLowerCase();
  if (mode === "mock") return new MockPayPalAdapter();
  if (mode === "sandbox") {
    return new PayPalSandboxAdapter({
      clientId: env.PAYPAL_CLIENT_ID,
      clientSecret: env.PAYPAL_CLIENT_SECRET,
      environment: (env.PAYPAL_ENV ?? "sandbox").toLowerCase(),
    });
  }
  throw new Error(`Unsupported PAYPAL_MODE "${mode}". Use mock or sandbox; live mode is intentionally disabled.`);
}
