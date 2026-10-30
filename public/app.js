const state = { bootstrap: null };

const elements = {
  adapterMode: document.querySelector("#adapter-mode"),
  adapterNote: document.querySelector("#adapter-note"),
  audit: document.querySelector("#audit"),
  catalog: document.querySelector("#catalog"),
  ledger: document.querySelector("#ledger"),
  message: document.querySelector("#message"),
  metricApproval: document.querySelector("#metric-approval"),
  metricCaptured: document.querySelector("#metric-captured"),
  metricMonth: document.querySelector("#metric-month"),
  metricToday: document.querySelector("#metric-today"),
  missionForm: document.querySelector("#mission-form"),
  missionInput: document.querySelector("#mission-input"),
  policyForm: document.querySelector("#policy-form"),
  proposals: document.querySelector("#proposals"),
  timeline: document.querySelector("#timeline"),
};

function money(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `Request failed with ${response.status}`);
  return payload;
}

function dollarsToCents(value) {
  return Math.round(Number.parseFloat(value || "0") * 100);
}

function listFromInput(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function renderPolicy(policy) {
  document.querySelector("#policy-auto").value = policy.autoApproveLimitCents / 100;
  document.querySelector("#policy-order").value = policy.perOrderCapCents / 100;
  document.querySelector("#policy-daily").value = policy.dailyCapCents / 100;
  document.querySelector("#policy-monthly").value = policy.monthlyBudgetCents / 100;
  document.querySelector("#policy-merchants").value = policy.allowedMerchants.join(", ");
  document.querySelector("#policy-categories").value = policy.allowedCategories.join(", ");
}

function actionButtons(proposal, adapterMode) {
  const buttons = [];
  if (proposal.status === "AWAITING_APPROVAL") {
    buttons.push(`<button data-action="approve" data-id="${proposal.id}">Approve</button>`);
    buttons.push(`<button data-action="reject" data-id="${proposal.id}">Reject</button>`);
  }
  if (proposal.status === "APPROVED") {
    buttons.push(`<button class="primary" data-action="execute" data-id="${proposal.id}">${adapterMode === "sandbox" ? "Create PayPal Sandbox order" : "Execute in mock PayPal"}</button>`);
    buttons.push(`<button data-action="reject" data-id="${proposal.id}">Reject</button>`);
  }
  if (proposal.status === "ORDER_CREATED" && adapterMode === "sandbox") {
    buttons.push(`<button class="primary" data-action="capture" data-id="${proposal.id}">Capture after buyer approval</button>`);
  }
  return buttons.join("");
}

function renderProposals(proposals, adapterMode) {
  elements.proposals.innerHTML = proposals.map((proposal) => {
    const checks = proposal.policyDecision?.checks ?? [];
    const payment = proposal.payment
      ? `<div class="payment"><strong>PayPal ${escapeHtml(proposal.payment.mode)}</strong><br>Order: ${escapeHtml(proposal.payment.orderId)}<br>Status: ${escapeHtml(proposal.payment.orderStatus)}${proposal.payment.captureId ? `<br>Capture: ${escapeHtml(proposal.payment.captureId)}` : ""}${proposal.payment.approvalUrl ? `<br><a href="${escapeHtml(proposal.payment.approvalUrl)}" target="_blank" rel="noreferrer">Open sandbox approval</a>` : ""}</div>`
      : "";
    return `
      <article class="proposal">
        <div class="proposal-header">
          <div><h3>${escapeHtml(proposal.product.name)}</h3><p>${escapeHtml(proposal.id)} · ${escapeHtml(proposal.merchant)}</p></div>
          <span class="status ${escapeHtml(proposal.status)}">${escapeHtml(proposal.status.replaceAll("_", " "))}</span>
        </div>
        <p><strong>${money(proposal.totalCents, proposal.currency)}</strong> · ${proposal.quantity} × ${money(proposal.unitPriceCents, proposal.currency)}</p>
        <p><em>“${escapeHtml(proposal.prompt)}”</em></p>
        <ul class="reasoning">${proposal.reasoning.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
        <p>${escapeHtml(proposal.policyDecision?.explanation ?? "")}</p>
        <div class="checks">${checks.map((item) => `<div><span>${escapeHtml(item.label)}</span><span class="${item.passed ? "pass" : "fail"}">${item.passed ? "PASS" : "BLOCK"}</span></div>`).join("")}</div>
        ${payment}
        <div class="actions">${actionButtons(proposal, adapterMode)}</div>
      </article>`;
  }).join("");
}

function render(bootstrap) {
  state.bootstrap = bootstrap;
  elements.adapterMode.textContent = `${bootstrap.app.mode.mode} mode`;
  elements.adapterNote.textContent = bootstrap.app.mode.note;
  elements.metricToday.textContent = money(bootstrap.metrics.todayCents);
  elements.metricMonth.textContent = money(bootstrap.metrics.monthCents);
  elements.metricCaptured.textContent = money(bootstrap.metrics.capturedCents);
  elements.metricApproval.textContent = bootstrap.metrics.awaitingApprovalCount;

  renderPolicy(bootstrap.policy);
  elements.catalog.innerHTML = bootstrap.catalog.map((product) => `
    <article>
      <h4>${escapeHtml(product.name)}</h4>
      <p>${escapeHtml(product.merchant)} · ${escapeHtml(product.category)} · ${product.stock} in stock</p>
      <p class="price">${money(product.unitPriceCents, product.currency)}</p>
      <p>${product.channel3Ready ? "Normalized product record ready for a Channel3 adapter." : "Deliberately included as a policy-block example."}</p>
    </article>`).join("");

  elements.timeline.innerHTML = bootstrap.timeline.map((item) => `
    <article><time>${escapeHtml(item.date)}</time><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.status)}</span></article>`).join("");

  renderProposals(bootstrap.proposals, bootstrap.app.mode.mode);
  elements.ledger.innerHTML = bootstrap.proposals.map((proposal) => `
    <tr>
      <td>${escapeHtml(proposal.id)}</td><td>${escapeHtml(proposal.product.name)}</td><td>${escapeHtml(proposal.merchant)}</td>
      <td>${escapeHtml(proposal.status)}</td><td>${money(proposal.totalCents, proposal.currency)}</td>
      <td>${escapeHtml(proposal.payment?.orderId ?? "—")}</td><td>${escapeHtml(proposal.payment?.captureId ?? "—")}</td>
    </tr>`).join("");

  elements.audit.innerHTML = bootstrap.audit.map((item) => `<li><strong>${escapeHtml(item.type)}</strong> — ${escapeHtml(item.message)}</li>`).join("");
}

async function refresh() {
  render(await api("/api/bootstrap"));
}

elements.missionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.message.textContent = "Agent is planning and the policy engine is checking…";
  try {
    const result = await api("/api/proposals", {
      method: "POST",
      body: JSON.stringify({ prompt: elements.missionInput.value }),
    });
    elements.message.textContent = `${result.proposal.id} created: ${result.proposal.policyDecision.explanation}`;
    await refresh();
  } catch (error) {
    elements.message.textContent = error.message;
  }
});

document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => {
    elements.missionInput.value = button.dataset.sample;
    elements.missionInput.focus();
  });
});

elements.policyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const policy = {
    currency: "USD",
    autoApproveLimitCents: dollarsToCents(document.querySelector("#policy-auto").value),
    perOrderCapCents: dollarsToCents(document.querySelector("#policy-order").value),
    dailyCapCents: dollarsToCents(document.querySelector("#policy-daily").value),
    monthlyBudgetCents: dollarsToCents(document.querySelector("#policy-monthly").value),
    allowedMerchants: listFromInput(document.querySelector("#policy-merchants").value),
    allowedCategories: listFromInput(document.querySelector("#policy-categories").value),
  };
  try {
    const result = await api("/api/policy", { method: "PUT", body: JSON.stringify({ policy }) });
    render(result.bootstrap);
    elements.message.textContent = "Policy updated. Pending proposals were re-evaluated; execution will check the policy again.";
  } catch (error) {
    elements.message.textContent = error.message;
  }
});

elements.proposals.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  button.disabled = true;
  try {
    const result = await api(`/api/proposals/${button.dataset.id}/${button.dataset.action}`, { method: "POST", body: "{}" });
    render(result.bootstrap);
    elements.message.textContent = `${result.proposal.id} is now ${result.proposal.status}.`;
  } catch (error) {
    elements.message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

refresh().catch((error) => {
  elements.message.textContent = error.message;
});
