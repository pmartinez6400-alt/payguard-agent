# PayGuard Agent — demo video shot list

Target runtime: **2 minutes 45 seconds**. Hard limit: under 3 minutes.
Format: screen recording of the working web app, no copyrighted music, no
third-party trademark overlays. Captions should reinforce the narration.

## Pre-flight

- Run `npm test` and confirm the suite passes.
- Start the app with `npm start`.
- Use mock mode for the reliable on-camera flow unless the real PayPal Sandbox
  order/approval/capture flow has already been rehearsed end-to-end.
- Reset the browser to the pristine seeded state.
- Browser zoom: 90–100%; hide bookmarks and personal information.
- Have these sample prompts ready:
  1. `Buy 1 USB-C dock for the new team laptop under $80`
  2. `Buy 2 bags of coffee beans for the office`
  3. `Buy a $100 gift card from Unlisted Deals`

## Shot list

### 0:00–0:18 — Problem and promise

**Show:** Hero, adapter badge, spending metrics.

**Say:**

> “AI agents can shop, but a prompt is not a purchasing policy. PayGuard Agent
> lets an AI buy routine supplies through PayPal while a separate policy engine
> enforces budgets, merchant allowlists, and human approval.”

### 0:18–0:48 — A purchase the agent may make

**Show:** Enter the USB-C dock prompt and create the proposal. Point to the
agent reasoning and all policy checks passing.

**Say:**

> “The agent compares matching products, explains its choice, and creates a
> proposal. The policy engine checks merchant, category, per-order, daily,
> monthly, and auto-approval limits.”

**Action:** Execute the proposal. Show the mock PayPal order and capture ID in
the proposal and ledger.

### 0:48–1:18 — Human approval for a larger purchase

**Show:** Create the coffee proposal. It should be `AWAITING_APPROVAL`.

**Say:**

> “This order is legal under the hard caps, but it is above the seventy-five
> dollar auto-approval threshold, so the agent must stop and ask a person.”

**Action:** Approve it, then execute it. Show the second captured payment in
the ledger.

### 1:18–1:48 — The policy says no

**Show:** Create the gift-card proposal. Highlight the failed merchant and
category checks and the absence of an execute path.

**Say:**

> “The agent can find a gift card, but finding is not permission. The merchant
> and category are not allowlisted, so the policy engine blocks the purchase
> before PayPal is called.”

### 1:48–2:18 — Steering the agent live

**Show:** Policy controls. Raise the auto-approval limit or monthly budget;
create/re-check a pending proposal. Then show the audit log.

**Say:**

> “Managers steer the system by changing policy, not by rewriting prompts.
> Pending proposals are re-evaluated, and execution checks the policy again.
> Every proposal, approval, block, and capture is written to an audit trail.”

### 2:18–2:45 — PayPal Sandbox and close

**Show:** README sandbox section or a rehearsed real sandbox order screen if
available. End on the ledger and sponsor-ready architecture diagram in the
README.

**Say:**

> “The same adapter contract runs against PayPal Sandbox Orders v2: OAuth,
> order creation, buyer approval, and capture. PayGuard gives AI purchasing a
> useful superpower — initiative — and a necessary limit: it can only spend
> inside the rules.”

## Backup take

If the live sandbox approval step is slow or unreliable during recording:

- record the complete flow in mock mode;
- add one short, clearly labeled cutaway showing the sandbox adapter code and
  its passing stubbed-HTTP tests;
- do not claim a real sandbox capture unless it actually happened in the
  rehearsed flow.

## Upload checklist

- Runtime is under 3:00.
- Video is public on YouTube.
- The project is visibly functioning, not a slide-only walkthrough.
- No real credentials, personal email addresses, or secrets are visible.
- Captions are enabled or burned in.
- Title: `PayGuard Agent — Policy-Guarded AI Purchasing with PayPal Sandbox`
