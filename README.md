# PayGuard Agent

**AI purchasing with a policy seatbelt for PayPal Sandbox.**

PayGuard Agent lets a small team ask an AI purchasing agent to source routine
supplies while a separate policy engine decides what the agent may buy, what
needs a human, and what must never happen. The agent proposes; the policy
engine disposes; PayPal executes only after every gate passes.

> Hackathon build status: working account-free skeleton. The default mode
> uses a PayPal Orders v2-shaped mock adapter and makes no network calls.
> A real PayPal Sandbox adapter is implemented and unit-tested with stubbed
> HTTP, but it needs free PayPal Developer sandbox credentials before it can
> make live sandbox calls.

## Why this exists

AI agents are increasingly able to shop and spend, but a prompt is not a
procurement policy. A useful purchasing agent needs:

- merchant and category allowlists;
- per-order, daily, and monthly caps;
- an auto-approval threshold;
- human approval for larger purchases;
- a second policy check at execution time;
- an inspectable ledger and audit trail.

PayGuard turns those controls into the product experience rather than hiding
them in configuration files.

## Demo flow

1. Ask: “Buy 2 packs of recycled notebooks for the team.”
   - The agent selects a product and explains the choice.
   - The policy engine approves it automatically.
   - Execution creates and captures a mock PayPal order.
2. Ask: “Buy 2 bags of coffee beans for the office.”
   - The purchase is within hard caps but above the auto-approval threshold.
   - A human must approve it before execution.
3. Ask: “Buy a $100 gift card from Unlisted Deals.”
   - The agent finds the item, but the merchant and category are not allowed.
   - The policy engine blocks it.
4. Move the policy sliders and pending proposals are re-evaluated.
5. In sandbox mode, execution creates a real PayPal Sandbox order and returns
   the PayPal approval link; capture happens after sandbox buyer approval.

## Run it — no account needed

Requirements: Node.js 20 or newer. There are no package dependencies.

```bash
npm test
npm start
```

Open http://127.0.0.1:4173

The default adapter is `mock`. It mirrors the PayPal Orders v2 resources used
by the app — order ID, status, approval shape, and capture ID — so judges can
run the complete product flow without credentials.

## Run it against PayPal Sandbox

1. Create or sign into a free PayPal Developer account.
2. In the Developer Dashboard, open **Apps & Credentials**.
3. Use the **Sandbox** environment and create/select a REST API app.
4. Copy `.env.example` to `.env` and set:

```dotenv
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your-sandbox-client-id
PAYPAL_CLIENT_SECRET=your-sandbox-client-secret
PAYPAL_ENV=sandbox
```

5. Start the app:

```bash
npm start
```

The server exchanges the client credentials for an OAuth token at PayPal's
sandbox token endpoint, creates Orders v2 orders, and captures an order only
after it has reached the sandbox approval step.

**Safety:** live mode is intentionally unsupported. The adapter factory and
sandbox adapter reject live configuration. Never commit `.env` or a client
secret.

See `docs/PAYPAL_ACCOUNT_BOUNDARY.md` for exactly which steps need an account
and which do not.

## Architecture

```text
public/                 Dependency-free steerable web UI
src/agent.js            Local deterministic purchasing planner
src/policy.js           Pure policy engine and spend-window calculations
src/app-service.js      Proposal lifecycle, approvals, execution, metrics
src/paypal-adapter.js   Mock adapter + PayPal Sandbox Orders v2 adapter
src/server.js           Node HTTP API and static server
data/catalog.json       Normalized demo product catalog
test/                   Node test suite
docs/                   Hackathon requirements and sponsor-lane analysis
```

The agent and payment provider are separated by explicit contracts:

- the planner returns a product, quantity, alternatives, and reasoning;
- the policy engine returns a machine-readable decision and per-check trace;
- the payment adapter exposes `createOrder`, `captureOrder`, and `getOrder`.

That separation makes later sponsor integrations safer:

- Channel3 can replace the local catalog adapter;
- AG Grid can replace the ledger presentation;
- APIMatic output can replace the hand-written PayPal HTTP client;
- a cloud LLM can replace the local planner without gaining direct payment
  authority.

## Policy model

Default demo policy:

- currency: USD;
- auto-approve up to $75;
- per-order cap: $150;
- daily cap: $250;
- monthly budget: $500;
- allowed merchants: Northwind Supply, BluePeak Goods, Cedar Roast Co.,
  Summit Workspace;
- allowed categories: office, hardware, pantry, furniture.

All money is handled as integer cents inside the policy engine.

## Tests

```bash
npm test
npm run check
```

Current tests cover:

- auto-approval, human-approval, allowlist, cap, and monthly-budget policy
  decisions;
- prompt parsing, product selection, quantities, and budget handling;
- mock proposal approval and capture;
- policy steering and re-evaluation;
- PayPal OAuth/order/capture request shapes with stubbed HTTP;
- refusal of live PayPal mode.

## Hackathon documents

- `docs/HACKATHON_REQUIREMENTS.md` — exact verified Devpost requirements,
  judging criteria, prizes, stacking, and payout conditions.
- `docs/PAYPAL_ACCOUNT_BOUNDARY.md` — account-free build scope versus the
  isolated PayPal Developer account step.
- `docs/SPONSOR_LANES.md` — Channel3, AG Grid, APIMatic, and Bryntum fit.
- `DEMO.md` — under-3-minute video shot list.
- `SUBMISSION.md` — remaining submission steps and draft Devpost copy.

## License

MIT — see `LICENSE`.
