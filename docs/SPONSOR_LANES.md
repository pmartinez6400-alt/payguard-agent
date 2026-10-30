# Sponsor-prize lane assessment

The Official Rules allow one Grand Prize **or** one Honorable Mention Prize,
plus one Sponsor Prize. The strongest natural targets are therefore the
overall/honorable lanes first, with one carefully chosen sponsor integration.

## Strongest non-sponsor stacking targets

### Best Use of Agentic Commerce — strong

PayGuard is an autonomous purchasing workflow with a human-governed policy
layer. The agent searches, compares, proposes, explains, and executes only
after policy and approval gates pass. This is the concept's home lane.

### Best Use of PayPal + AI — strong

PayPal is not a decorative checkout button in the design: proposal state,
approval, order creation, buyer approval, capture, ledger state, and audit
history all revolve around the PayPal order lifecycle. The AI planner and
policy explainer drive that lifecycle.

### Most Impactful — plausible

The audience is specific: small teams, nonprofits, clubs, labs, and operators
who want purchasing automation without giving an agent an unbounded company
payment method. The safety/impact claim is concrete and demonstrable.

### Best Demo Delivery — plausible

The demo has clear before/after moments: a low-value purchase is approved, a
larger purchase stops for a human, and a gift card is blocked even after the
agent finds it. Presentation is one of five equal criteria, so the shot list
in `DEMO.md` matters.

## Sponsor lanes

### Channel3 — strongest sponsor fit, not yet integrated

Official detail page: https://paypalaihackathon.devpost.com/details/channel3

Channel3 supplies normalized product data — titles, images, prices, variants,
availability, and buy links — across many retailers. That maps directly onto
PayGuard's product-search step.

Credibility requirements:

- the project must call the Channel3 API or MCP server as a meaningful part
  of the experience;
- merely mentioning Channel3 does not qualify;
- API keys are available to hackathon participants, with no credit card
  required;
- the sponsor page provides hackathon API credits.

Current build status:

- local catalog entries use normalized product fields;
- most entries are marked `channel3Ready: true`;
- no live Channel3 call is made yet;
- a separate free Channel3 developer key is a later user-side input.

Integration plan: add `Channel3CatalogAdapter` beside the local adapter,
map Channel3 results into the existing product schema, and retain local data
only as an offline fallback clearly labeled in the UI/README.

**Verdict:** credible and natural. This is the first sponsor lane to build if
the goal is one strong sponsor integration rather than several shallow ones.

### AG Grid — strong dashboard fit, not yet eligible

Official detail page: https://paypalaihackathon.devpost.com/details/aggrid

The AG Grid award covers both dashboard quality and build method. It highlights
AG Studio, custom widgets, theming, layout tools, and the Studio Agent
Framework. Suggested patterns include anomaly-alert agents, natural-language
finance agents that generate live widgets, and PayPal analytics dashboards.

PayGuard fit:

- policy/payment ledger is inherently grid-shaped;
- blocked-spend and merchant-risk views are natural custom widgets;
- the agent can generate dashboard views such as “show rejected spend by
  merchant” or “show purchases awaiting approval this week”;
- a polished AG Studio surface would also help the equally weighted Design
  criterion.

Current build status:

- the app exposes an AG Grid-ready ledger data contract;
- the initial UI uses a dependency-free HTML table;
- no AG Grid tool is used yet, so this lane must **not** be claimed yet.

Integration plan: replace the HTML ledger with AG Grid, add themed summary
widgets for committed/captured/blocked spend, and add one agent-generated
view. AG Studio trial licensing may require a free trial step; verify the
license path before committing build time.

**Verdict:** credible and potentially the largest sponsor prize, but a bigger
UI/integration lift than Channel3.

### APIMatic — credible process/integration lane, not a runtime feature

Official detail page: https://paypalaihackathon.devpost.com/details/apimatic

APIMatic's Context Plugin gives AI coding tools PayPal API context so the
agent/developer does not need to manually dig through API references. The
sponsor page says PayPal is already enabled in the plugin and no extra
APIMatic credentials/sign-in details are needed for the plugin itself.

PayGuard fit:

- the PayPal adapter is isolated behind `createOrder`, `captureOrder`, and
  `getOrder` methods;
- an APIMatic-generated SDK or context-assisted refactor can replace the
  hand-written HTTP client without changing the agent, policy engine, or UI;
- the integration process can be documented as evidence.

Current build status:

- adapter boundary is ready;
- APIMatic has **not** been used yet, so this lane must not be claimed yet.

Integration plan: install/use the Context Plugin in the development
environment, regenerate or validate the PayPal client against the adapter
contract, keep all adapter tests green, and record the before/after in an
`APIMATIC_EVIDENCE.md` file.

**Verdict:** credible, comparatively low runtime risk, and stackable in
principle. It is the easiest sponsor lane to add after the core demo works,
provided the final submission can show genuine APIMatic use.

### Bryntum — possible but weakest fit

Official detail page: https://paypalaihackathon.devpost.com/details/bryntum

Bryntum covers Gantt, Scheduler, and Calendar components. Its own ideas
include an agent-driven rescheduler that reacts to PayPal payment events.

PayGuard fit:

- recurring replenishment, delivery checks, and monthly policy reviews have
  a time dimension;
- the skeleton already models a purchase/review timeline;
- a Scheduler could show one row per recurring need, with blocked or late
  payments moving the next task.

Current build status:

- timeline data exists;
- no Bryntum component is used, so this lane is not eligible yet.

Integration plan: only pursue if the recurring-purchase scheduler becomes a
core workflow rather than a decorative timeline. Use the Bryntum Scheduler
trial package and let payment status move/reschedule replenishment blocks.

**Verdict:** credible only with a deliberate scheduling feature. It should not
displace Channel3, AG Grid, or APIMatic work.

### Render — hosting/credits only

Render prizes are credits, not cash. Hosting on Render is an optional way to
provide a live demo URL, but the rules also accept complete repository run
instructions. Do not spend core build time chasing this lane unless deployment
is already easy.

## Recommended stacking order

1. Core: Grand Prize + Best Use of Agentic Commerce / Best Use of PayPal + AI.
2. First sponsor integration: **Channel3** for real product sourcing.
3. If UI time remains: **AG Grid** for the ledger and agent-generated spend
   views; this also lifts Design.
4. In parallel with PayPal hardening: **APIMatic** for the client integration
   story.
5. Skip Bryntum unless the recurring scheduler becomes a headline feature.

Do not claim a sponsor lane in the Devpost form until the named tool is
actually integrated and demonstrable.
