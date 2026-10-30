import assert from "node:assert/strict";
import test from "node:test";
import { AppService } from "../src/app-service.js";

function service() {
  return new AppService({ seed: false });
}

test("service auto-approves and mock-captures a small purchase", async () => {
  const app = service();
  const proposal = app.createProposal("Buy 2 packs of recycled notebooks for the team");
  assert.equal(proposal.status, "APPROVED");

  const executed = await app.executeProposal(proposal.id);
  assert.equal(executed.status, "CAPTURED");
  assert.match(executed.payment.captureId, /^MOCK-CAPTURE-/);
  assert.equal(app.bootstrap().metrics.capturedCents, 3798);
});

test("service requires human approval before a larger purchase can execute", async () => {
  const app = service();
  const proposal = app.createProposal("Buy 2 bags of coffee beans for the office");
  assert.equal(proposal.status, "AWAITING_APPROVAL");
  await assert.rejects(() => app.executeProposal(proposal.id), /must be APPROVED/);

  const approved = app.approveProposal(proposal.id);
  assert.equal(approved.status, "APPROVED");
});

test("service rejects a gift card from a non-allowlisted merchant", () => {
  const app = service();
  const proposal = app.createProposal("Buy a $100 gift card from Unlisted Deals");
  assert.equal(proposal.status, "REJECTED");
  assert.deepEqual(
    proposal.policyDecision.failedChecks.map((item) => item.code),
    ["MERCHANT_ALLOWLISTED", "CATEGORY_ALLOWLISTED"],
  );
});

test("policy steering re-evaluates a pending proposal", () => {
  const app = service();
  const proposal = app.createProposal("Buy 2 bags of coffee beans for the office");
  assert.equal(proposal.status, "AWAITING_APPROVAL");

  const policy = { ...app.policy, autoApproveLimitCents: 9000 };
  app.updatePolicy(policy);
  assert.equal(app.findProposal(proposal.id).status, "APPROVED");
});
