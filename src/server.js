import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServiceFromEnv } from "./app-service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

if (existsSync(join(__dirname, "..", ".env"))) {
  process.loadEnvFile(join(__dirname, "..", ".env"));
}

const service = createServiceFromEnv();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function serveStatic(requestPath, response) {
  const requested = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = normalize(requested).replace(/^([/\\])+/, "");
  const filePath = join(publicDir, safePath);
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream" });
  response.end(readFileSync(filePath));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  try {
    if (url.pathname === "/api/health" && request.method === "GET") {
      sendJson(response, 200, { ok: true, adapter: service.paymentAdapter.describe() });
      return;
    }

    if (url.pathname === "/api/bootstrap" && request.method === "GET") {
      sendJson(response, 200, service.bootstrap());
      return;
    }

    if (url.pathname === "/api/proposals" && request.method === "POST") {
      const body = await readJson(request);
      sendJson(response, 201, { proposal: service.createProposal(body.prompt) });
      return;
    }

    const proposalAction = url.pathname.match(/^\/api\/proposals\/([^/]+)\/(approve|reject|execute|capture)$/);
    if (proposalAction && request.method === "POST") {
      const [, proposalId, action] = proposalAction;
      let proposal;
      if (action === "approve") proposal = service.approveProposal(proposalId);
      if (action === "reject") proposal = service.rejectProposal(proposalId);
      if (action === "execute") proposal = await service.executeProposal(proposalId);
      if (action === "capture") proposal = await service.captureSandboxProposal(proposalId);
      sendJson(response, 200, { proposal, bootstrap: service.bootstrap() });
      return;
    }

    if (url.pathname === "/api/policy" && request.method === "PUT") {
      const body = await readJson(request);
      const policy = service.updatePolicy(body.policy ?? body);
      sendJson(response, 200, { policy, bootstrap: service.bootstrap() });
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "Unknown API route." });
      return;
    }

    if (request.method === "GET") {
      serveStatic(url.pathname, response);
      return;
    }

    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
});

const port = Number.parseInt(process.env.PORT ?? "4173", 10);
server.listen(port, "127.0.0.1", () => {
  console.log(`PayGuard Agent running at http://127.0.0.1:${port}`);
  console.log(`Payment adapter: ${service.paymentAdapter.describe().mode}`);
});
