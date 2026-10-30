import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { planPurchase } from "./agent.js";
import { createPaymentAdapter, MockPayPalAdapter } from "./paypal-adapter.js";
import {
  createDefaultPolicy,
  evaluatePurchase,
  summarizeSpend,
  validatePolicy,
} from "./policy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadCatalog() {
  return JSON.parse(readFileSync(join(__dirname, "..", "data", "catalog.json"), "utf8"));
}

function publicProposal(proposal) {
  return { ...proposal };
}

export class AppService {
  constructor({ catalog = loadCatalog(), paymentAdapter = new MockPayPalAdapter(), seed = true } = {}) {
    this.catalog = catalog;
    this.paymentAdapter = paymentAdapter;
    this.policy = createDefaultPolicy();
    this.proposals = [];
    this.audit = [];
    this.sequence = 0;

    if (seed) {
      this.createProposal("Buy 2 packs of recycled notebooks for the team");
      this.createProposal("Buy 2 bags of coffee beans for the office");
      this.createProposal("Buy a $100 gift card from Unlisted Deals");
    }
  }

  ledgerFromProposals(excludeProposalId = null) {
    return this.proposals
      .filter((proposal) => proposal.id !== excludeProposalId)
      .map((proposal) => ({
        amountCents: proposal.totalCents,
        createdAt: proposal.createdAt,
        status: proposal.status === "ORDER_CREATED" ? "APPROVED" : proposal.status,
      }));
  }

  addAudit(type, message, proposalId = null) {
    this.audit.unshift({
      id: `audit-${this.audit.length + 1}`,
      type,
      message,
      proposalId,
      createdAt: new Date().toISOString(),
    });
  }

  evaluate(proposal, excludeProposalId = proposal.id) {
    return evaluatePurchase({
      policy: this.policy,
      purchase: proposal,
      ledger: this.ledgerFromProposals(excludeProposalId),
    });
  }

  createProposal(prompt) {
    const plan = planPurchase({ prompt, catalog: this.catalog });
    this.sequence += 1;
    const proposal = {
      id: `proposal-${String(this.sequence).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
      prompt: plan.prompt,
      product: plan.product,
      quantity: plan.quantity,
      unitPriceCents: plan.unitPriceCents,
      totalCents: plan.totalCents,
      currency: plan.currency,
      merchant: plan.merchant,
      category: plan.category,
      reasoning: plan.reasoning,
      alternatives: plan.alternatives,
      agent: plan.agent,
      payment: null,
      status: "EVALUATING",
      policyDecision: null,
    };

    const evaluation = this.evaluate(proposal, null);
    proposal.policyDecision = evaluation;
    proposal.status = evaluation.decision === "REJECTED"
      ? "REJECTED"
      : evaluation.decision === "NEEDS_APPROVAL"
        ? "AWAITING_APPROVAL"
        : "APPROVED";

    this.proposals.unshift(proposal);
    this.addAudit("PROPOSAL_CREATED", `${proposal.id}: ${evaluation.explanation}`, proposal.id);
    return publicProposal(proposal);
  }

  findProposal(proposalId) {
    const proposal = this.proposals.find((item) => item.id === proposalId);
    if (!proposal) throw new Error(`Unknown proposal: ${proposalId}`);
    return proposal;
  }

  approveProposal(proposalId) {
    const proposal = this.findProposal(proposalId);
    if (proposal.status !== "AWAITING_APPROVAL") {
      throw new Error(`Proposal ${proposalId} is not awaiting approval.`);
    }
    const evaluation = this.evaluate(proposal);
    proposal.policyDecision = evaluation;
    if (!evaluation.allowed) {
      proposal.status = "REJECTED";
      this.addAudit("POLICY_REJECTED", `${proposal.id}: ${evaluation.explanation}`, proposal.id);
      return publicProposal(proposal);
    }
    proposal.status = "APPROVED";
    proposal.approvedAt = new Date().toISOString();
    this.addAudit("HUMAN_APPROVED", `${proposal.id}: approved by a human reviewer.`, proposal.id);
    return publicProposal(proposal);
  }

  rejectProposal(proposalId) {
    const proposal = this.findProposal(proposalId);
    if (!["AWAITING_APPROVAL", "APPROVED"].includes(proposal.status)) {
      throw new Error(`Proposal ${proposalId} cannot be rejected from ${proposal.status}.`);
    }
    proposal.status = "REJECTED_BY_HUMAN";
    this.addAudit("HUMAN_REJECTED", `${proposal.id}: rejected by a human reviewer.`, proposal.id);
    return publicProposal(proposal);
  }

  async executeProposal(proposalId) {
    const proposal = this.findProposal(proposalId);
    if (proposal.status !== "APPROVED") {
      throw new Error(`Proposal ${proposalId} must be APPROVED before execution; current status is ${proposal.status}.`);
    }

    const evaluation = this.evaluate(proposal);
    proposal.policyDecision = evaluation;
    if (!evaluation.allowed) {
      proposal.status = "REJECTED";
      this.addAudit("POLICY_REJECTED", `${proposal.id}: blocked at execution. ${evaluation.explanation}`, proposal.id);
      return publicProposal(proposal);
    }

    proposal.status = "EXECUTING";
    const order = await this.paymentAdapter.createOrder(proposal);
    proposal.payment = {
      orderId: order.id,
      orderStatus: order.status,
      mode: order.mode,
      approvalUrl: order.approvalUrl,
      captureId: null,
      captureStatus: null,
    };

    if (order.mode === "mock") {
      const capture = await this.paymentAdapter.captureOrder(order.id, proposal);
      proposal.payment.captureId = capture.captureId;
      proposal.payment.captureStatus = capture.status;
      proposal.payment.orderStatus = capture.status;
      proposal.status = "CAPTURED";
      proposal.completedAt = new Date().toISOString();
      this.addAudit("PAYMENT_CAPTURED", `${proposal.id}: mock PayPal order ${order.id} captured as ${capture.captureId}.`, proposal.id);
    } else {
      proposal.status = "ORDER_CREATED";
      this.addAudit("PAYPAL_ORDER_CREATED", `${proposal.id}: PayPal Sandbox order ${order.id} created; buyer approval is still required before capture.`, proposal.id);
    }

    return publicProposal(proposal);
  }

  async captureSandboxProposal(proposalId) {
    const proposal = this.findProposal(proposalId);
    if (proposal.status !== "ORDER_CREATED" || !proposal.payment?.orderId) {
      throw new Error(`Proposal ${proposalId} does not have a sandbox order awaiting capture.`);
    }
    if (typeof this.paymentAdapter.captureOrder !== "function") {
      throw new Error("The configured payment adapter cannot capture orders.");
    }
    const capture = await this.paymentAdapter.captureOrder(proposal.payment.orderId, proposal);
    proposal.payment.captureId = capture.captureId;
    proposal.payment.captureStatus = capture.status;
    proposal.payment.orderStatus = capture.status;
    proposal.status = "CAPTURED";
    proposal.completedAt = new Date().toISOString();
    this.addAudit("PAYMENT_CAPTURED", `${proposal.id}: PayPal Sandbox order ${proposal.payment.orderId} captured.`, proposal.id);
    return publicProposal(proposal);
  }

  updatePolicy(input) {
    this.policy = validatePolicy(input);
    for (const proposal of this.proposals) {
      if (proposal.status === "AWAITING_APPROVAL") {
        const evaluation = this.evaluate(proposal);
        proposal.policyDecision = evaluation;
        if (evaluation.decision === "REJECTED") proposal.status = "REJECTED";
        if (evaluation.decision === "AUTO_APPROVED") proposal.status = "APPROVED";
      }
    }
    this.addAudit("POLICY_UPDATED", "Policy steering controls were updated and pending proposals were re-evaluated.");
    return this.policy;
  }

  timeline() {
    const today = new Date();
    const addDays = (days) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    };
    return [
      { date: addDays(2), title: "Notebook delivery check", type: "delivery", status: "scheduled" },
      { date: addDays(7), title: "Coffee replenishment proposal", type: "recurring-purchase", status: "agent-watch" },
      { date: addDays(14), title: "Monthly policy review", type: "review", status: "human-review" },
      { date: addDays(21), title: "Dock inventory threshold check", type: "inventory", status: "agent-watch" },
    ];
  }

  bootstrap() {
    const spend = summarizeSpend(this.ledgerFromProposals());
    return {
      app: {
        name: "PayGuard Agent",
        tagline: "AI purchasing with a policy seatbelt for PayPal Sandbox.",
        mode: this.paymentAdapter.describe(),
      },
      catalog: this.catalog,
      policy: this.policy,
      proposals: this.proposals.map(publicProposal),
      audit: this.audit.slice(0, 20),
      timeline: this.timeline(),
      metrics: {
        ...spend,
        proposalCount: this.proposals.length,
        capturedCount: this.proposals.filter((proposal) => proposal.status === "CAPTURED").length,
        awaitingApprovalCount: this.proposals.filter((proposal) => proposal.status === "AWAITING_APPROVAL").length,
        rejectedCount: this.proposals.filter((proposal) => proposal.status.startsWith("REJECTED")).length,
      },
      sponsorReadiness: {
        agGrid: "Ledger data contract is ready; AG Grid package integration is the next step before claiming this lane.",
        channel3: "Catalog records use normalized product fields and are marked channel3Ready; live Channel3 calls require its separate free API key.",
        apimatic: "PayPal adapter boundary is isolated so APIMatic Context Plugin/SDK output can replace the hand-written client without changing policy or UI code.",
        bryntum: "A purchase/review timeline is modeled; Bryntum Scheduler is optional and should only be added if the timeline becomes a core workflow.",
      },
    };
  }
}

export function createServiceFromEnv(env = process.env) {
  return new AppService({ paymentAdapter: createPaymentAdapter(env) });
}
