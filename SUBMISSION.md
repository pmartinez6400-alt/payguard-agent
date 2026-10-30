# PayGuard Agent — submission plan

Deadline: **Nov 12, 2026 at 12:00 PM PT**.

Do not submit until every “required before submission” item below is true.
Nothing in this file authorizes registration, submission, or posting by
itself.

## Current status

Built and locally testable:

- working web UI and HTTP API;
- local agent planner;
- policy engine with allowlists, caps, monthly budget, approval threshold,
  execution-time re-check, ledger, timeline, and audit log;
- PayPal Orders v2-shaped mock adapter;
- PayPal Sandbox adapter implementation with stubbed-HTTP tests;
- MIT license;
- README, requirements analysis, account-boundary analysis, sponsor-lane
  analysis, and demo shot list.

Not yet done:

- real PayPal Sandbox order/approval/capture rehearsal with credentials;
- public repository publication;
- sponsor-tool integration (none should be claimed yet);
- final AI-provider decision and integration;
- hosted demo URL (optional if repository run instructions remain complete);
- YouTube video;
- Devpost project submission.

## User-side inputs still required

These steps require Peter's accounts or identity and must not be improvised:

1. **Free PayPal Developer account**
   - Sign in or create the free developer account.
   - Developer Dashboard → Apps & Credentials → Sandbox.
   - Create/select a REST API app.
   - Provide the sandbox **Client ID** and **Client Secret** through the
     approved secure credential route, not in the public repo or chat logs.
   - Confirm the default sandbox personal/buyer and business/seller test
     accounts are present under Testing Tools → Sandbox Accounts.
2. **Public repository account**
   - GitHub, GitLab, or Bitbucket account.
   - Publish this directory as a public repository with `LICENSE` visible.
3. **Devpost account**
   - Join the PayPal AI Hackathon and create the submission under Peter's
     account.
4. **YouTube account**
   - Upload the final under-3-minute demo as a public video.
5. **Optional sponsor account/key**
   - Channel3 developer key if that lane is integrated.
   - AG Grid trial license if AG Studio/Grid is integrated.
6. **Payout-only forms if the project wins**
   - Winner affidavit / Required Forms within 10 business days after they
     are sent.
   - US residents may need Form W-9.
   - No tax form is needed to build or enter.

## Build completion steps

### 1. Verify the real PayPal Sandbox flow

- Set `PAYPAL_MODE=sandbox` and the sandbox credentials in a local `.env`.
- Confirm `/api/health` reports sandbox mode as configured without exposing
  values.
- Create a small proposal and execute it.
- Confirm a real sandbox order ID is returned.
- Open the PayPal approval URL and approve with the sandbox buyer account.
- Return to the app and capture the order.
- Record the order ID, capture ID, statuses, and screenshots for the demo.
- Remove or rotate any credential accidentally exposed during testing.

### 2. Strengthen the AI integration

The skeleton's local planner is deterministic and account-free. Before
submission, choose one route and document it honestly:

- connect a cloud LLM tool-caller through the existing planner boundary; or
- connect a local/open model; or
- retain the local agent planner and describe it precisely as a rule-based
  agent planner, while identifying all AI tools used in development and in
  the product.

Do not let any model call the payment adapter directly. The model may propose
only; the policy engine and approval state remain authoritative.

### 3. Choose at most one sponsor lane to finish first

Recommended order:

1. **Channel3** — replace/augment the local catalog with live normalized
   product search. Claim only after real API/MCP calls are visible in the
   demo.
2. **AG Grid** — replace the ledger table and add agent-generated spend
   widgets. Claim only after an AG Grid tool is actually integrated.
3. **APIMatic** — use the Context Plugin/SDK path to regenerate or validate
   the PayPal client and document evidence. Claim only after genuine use.
4. **Bryntum** — only if recurring purchase scheduling becomes a core
   workflow.

### 4. Optional hosted demo

A hosted URL is optional because the rules accept complete repository run
instructions. If hosting is added:

- deploy only sandbox/mock configuration;
- never embed the PayPal client secret in frontend code;
- include judge instructions and the mock-mode fallback;
- verify the hosted build from a clean browser session.

### 5. Publish the repository

- Push the final code to a public GitHub, GitLab, or Bitbucket repository.
- Confirm the MIT license is visible at the top/About section.
- Confirm the README run instructions work from a fresh clone.
- Confirm `.env` and credentials are not in git history.
- Add screenshots or a short architecture image if useful.

### 6. Record and upload the video

- Follow `DEMO.md`.
- Keep the final cut under 3 minutes.
- Show the actual app functioning end-to-end.
- Upload publicly to YouTube.
- Paste the final URL into the Devpost draft.

### 7. Complete Devpost

Required fields/materials:

- project name and text description;
- functional demo access (hosted URL or repository instructions);
- code repository URL;
- AI tools used and how;
- demo video URL;
- selected prizes/sponsor lanes — select only lanes actually integrated;
- any judge testing instructions.

Before final submission, open every link in a private/incognito browser and
confirm it is public.

## Draft Devpost copy

### Project name

PayGuard Agent

### Tagline

AI purchasing with a policy seatbelt for PayPal Sandbox.

### Description draft

PayGuard Agent is a policy-guarded AI purchasing system for small teams,
nonprofits, clubs, labs, and operators who want the speed of an autonomous
buyer without giving that buyer unlimited spending authority.

A user gives the agent a natural-language mission, such as buying notebooks,
coffee, or a laptop dock. The agent searches normalized product options,
compares price, rating, stock, merchant, and lead time, and creates a proposal
with a visible explanation. A separate policy engine then checks the merchant
allowlist, category allowlist, per-order cap, daily cap, monthly budget, and
auto-approval threshold.

Small, compliant purchases can proceed automatically. Larger purchases stop
for human approval. Purchases from blocked merchants or categories are
rejected before PayPal is called. The policy is checked again at execution
time, so changing a budget or allowlist changes what the agent is allowed to
do. Every proposal, approval, rejection, PayPal order, and capture is recorded
in a ledger and audit log.

PayGuard integrates the PayPal Developer Platform in sandbox mode through
Orders v2: OAuth token exchange, order creation, buyer approval, and capture.
A mock adapter with the same contract is included so judges can run the full
product flow locally without credentials.

### AI tools draft — update before submitting

Update this section after the final AI-provider decision. Do not submit a
claim that is not true in the final build.

Current skeleton: a local deterministic agent planner parses the mission,
selects a product, produces alternatives and reasoning, and creates a
structured purchase proposal. The final submission must identify the exact
AI model/tool/service used in the submitted product and explain its role.

### Built-with draft

Node.js, PayPal Orders v2, PayPal Sandbox, HTML, CSS, JavaScript.

Add Channel3, AG Grid, APIMatic, Bryntum, or an AI provider only if actually
integrated in the final submission.

## Final go/no-go checklist

- [ ] Real sandbox order and capture rehearsed, or the submission copy clearly
      distinguishes the mock judge flow from the implemented sandbox adapter.
- [ ] AI tool description is exact and truthful.
- [ ] Sponsor selections match actual integrations.
- [ ] Public repo is reachable and licensed.
- [ ] Fresh-clone run instructions pass.
- [ ] Video is public, under 3 minutes, and shows the working app.
- [ ] Devpost description and links are complete.
- [ ] No secrets or personal data appear in the repo, screenshots, or video.
