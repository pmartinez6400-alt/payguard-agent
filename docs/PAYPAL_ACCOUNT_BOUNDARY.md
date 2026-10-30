# Architecture and PayPal account boundary

## Product flow

```text
Natural-language mission
        ↓
Agent planner ──→ normalized product options ──→ proposal + reasoning
        ↓                                               ↓
Human steering UI ←──────── policy decision ──── policy engine
        ↓                         │
Approve / reject                  ├─ merchant allowlist
        ↓                         ├─ category allowlist
Execute ───────────────────────── ├─ per-order cap
        ↓                         ├─ daily cap
PayPal adapter                    └─ monthly budget
  ├─ mock adapter (default, no account/network)
  └─ PayPal Sandbox Orders v2 adapter (credentials required)
        ↓
Order created → buyer approval (real sandbox flow) → capture → ledger/audit
```

The policy engine is intentionally outside the agent. The agent can recommend
and explain, but it cannot authorize its own purchase. Hard policy checks run
when a proposal is created and again immediately before payment execution.

## What is already buildable with no account

Everything in this initial build works without a PayPal account:

- local web UI and HTTP API;
- deterministic local agent planner;
- product catalog and proposal flow;
- policy engine, steering controls, approval queue, ledger, timeline, and
  audit log;
- PayPal Orders v2-shaped mock adapter;
- real PayPal Sandbox adapter code, tested with a stubbed `fetch` implementation;
- unit/integration tests;
- README, demo script, Devpost copy, and submission checklist.

No real funds, live credentials, wallet, or payment instrument are involved.

## Exactly what needs a free PayPal Developer account

A PayPal Developer account is needed only when switching from mock mode to
real PayPal Sandbox calls.

### 1. REST API app credentials

The server-side adapter needs:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

These come from a REST API app in the PayPal Developer Dashboard under
**Apps & Credentials**, with the environment set to **Sandbox**. The client ID
identifies the app; the client secret authenticates it. Never commit either
value, expose the secret to browser code, or put it in the public repository.

The adapter exchanges those credentials for an OAuth access token at:

- `POST https://api-m.sandbox.paypal.com/v1/oauth2/token`

### 2. Orders v2 calls

With the access token, the adapter uses:

- `POST https://api-m.sandbox.paypal.com/v2/checkout/orders`
- `GET https://api-m.sandbox.paypal.com/v2/checkout/orders/{order_id}`
- `POST https://api-m.sandbox.paypal.com/v2/checkout/orders/{order_id}/capture`

The current skeleton creates an `intent: "CAPTURE"` order with the proposal ID
as `reference_id` and `custom_id`.

### 3. Sandbox buyer and seller accounts

PayPal Developer accounts include sandbox test accounts, managed in the
Developer Dashboard under **Testing Tools → Sandbox Accounts**:

- a personal/buyer sandbox account to approve a hosted PayPal checkout;
- a business/seller sandbox account associated with the REST app/API caller.

Creating an order server-to-server does not require typing the buyer password
into this app. Completing the browser approval step in the real sandbox flow
does require signing in with the sandbox buyer test account in PayPal's own
sandbox checkout UI. Do not publish sandbox passwords in the repository. For
judge testing, the README should tell judges to use their own free PayPal
Developer sandbox credentials, or the submission should supply test access
through a private testing field if Devpost provides one.

### 4. Optional items not used by the skeleton

- Webhooks: not required for the initial order/create/capture demonstration.
  A production-grade version would add webhook registration and signature
  verification.
- PayPal JavaScript SDK: the client ID alone can render PayPal buttons. The
  skeleton uses a server-led flow so the policy and capture logic remain
  server-side. Adding buttons later does not remove the need for the secret
  on the server for OAuth/capture.
- Live mode: intentionally refused by the adapter factory and sandbox adapter.

## Other account boundaries

These are separate from PayPal:

- **Devpost account:** required to join and submit the hackathon.
- **GitHub, GitLab, or Bitbucket account:** required to publish the public,
  licensed repository.
- **YouTube account:** required to upload the public under-3-minute demo.
- **Optional AI provider account/API key:** the skeleton's local planner needs
  no external model. A later version can connect a cloud LLM through the same
  plan/evaluate/approve/execute boundary. This would strengthen the AI story
  but is not needed to build the skeleton or PayPal adapter.
- **Optional sponsor accounts/keys:** Channel3 and AG Grid are covered in
  `docs/SPONSOR_LANES.md`.

## Judge-run design

The repository must run in mock mode with only Node.js:

```bash
npm test
npm start
```

That gives judges a functional policy/agent/payment-shaped demo without
requiring them to create credentials just to see the product. Sandbox mode is
an additional configuration layer for verifying the real PayPal integration.
