/**
 * BOB Build On BNB — API Handler
 * Routes: A2A, agent cards, proxy for external APIs, tool execution
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const WALLET = "0x8b18575c29F842BdA93EEb1Db9F2198D5CC0Ba2f";
const BOB_TOKEN = "0x51363F073b1E4920fdA7AA9E9d84BA97EdE1560e";
const AGENT_IDS = [36035, 36336, 37092, 37093, 37103, 40908];
const BASE_URL = "https://bobbuildonbnb.vercel.app";
const BSC_RPC = "https://bsc-dataseed.binance.org";

const AGENT_CARD = {
  name: "BOB Build On BNB",
  description: "If you can't build you won't be rich. The BNB Chain AI Dashboard — test MCP tools, explore agents, learn everything about AI on BNB Chain.",
  url: BASE_URL,
  provider: { organization: "BOB", url: BASE_URL },
  version: "1.0.0",
  capabilities: { streaming: false, pushNotifications: false },
  authentication: null,
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [
    { id: "bnb-tools", name: "BNB Chain Tools", description: "80+ MCP tools for BNB Chain" },
    { id: "agent-discovery", name: "Agent Discovery", description: "Find and communicate with AI agents via A2A" },
    { id: "learn", name: "Learn BNB AI", description: "Everything about AI agents on BNB Chain" },
  ],
};

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(res: VercelResponse, data: any, status = 200) {
  return res.status(status).setHeader("Access-Control-Allow-Origin", "*").json(data);
}

// BSC RPC proxy
async function bscRpc(method: string, params: any[] = []) {
  const r = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return r.json();
}

// A2A handler
function handleA2A(body: any) {
  const { method, id } = body;
  if (method === "agent/discover") {
    return { jsonrpc: "2.0", id, result: AGENT_CARD };
  }
  if (method === "message/send") {
    return {
      jsonrpc: "2.0", id,
      result: {
        status: "completed",
        artifacts: [{
          parts: [{ type: "text", text: `Hey! I'm BOB Build On BNB. Check out the dashboard at ${BASE_URL} to explore BNB Chain AI tools.` }],
        }],
      },
    };
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } };
}

// Proxy for external A2A agents
async function proxyA2A(endpoint: string, message: string) {
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "message/send",
        params: { message: { parts: [{ type: "text", text: message }] } },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    return r.json();
  } catch (e: any) {
    return { error: e.message || "Connection failed" };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split("?")[0] || "/";

  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type")
      .end();
  }

  // Agent cards
  if (path === "/.well-known/agent.json" || path === "/.well-known/agent-card.json") {
    return json(res, AGENT_CARD);
  }

  if (path === "/.well-known/agent-registration.json") {
    return json(res, {
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: "BOB Build On BNB",
      description: "If you can't build you won't be rich. The BNB Chain AI Dashboard.",
      active: true,
      token: BOB_TOKEN,
      services: [
        { name: "A2A", version: "0.3.0", endpoint: BASE_URL },
        { name: "agentWallet", endpoint: `eip155:56:${WALLET}` },
        { name: "Web", endpoint: BASE_URL },
      ],
      registrations: AGENT_IDS.map((id) => ({
        agentId: id,
        agentRegistry: "eip155:56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
      })),
    });
  }

  // A2A endpoint
  if (path === "/api/a2a" && req.method === "POST") {
    return json(res, handleA2A(req.body));
  }

  // A2A proxy — send message to any external agent
  if (path === "/api/a2a-proxy" && req.method === "POST") {
    const { endpoint, message } = req.body || {};
    if (!endpoint) return json(res, { error: "endpoint required" }, 400);
    const result = await proxyA2A(endpoint, message || "Hello!");
    return json(res, result);
  }

  // Tool: BSC RPC proxy (avoids CORS issues)
  if (path === "/api/rpc" && req.method === "POST") {
    const { method: rpcMethod, params } = req.body || {};
    if (!rpcMethod) return json(res, { error: "method required" }, 400);
    const result = await bscRpc(rpcMethod, params || []);
    return json(res, result);
  }

  // Tool: Proxy any public API (avoids CORS)
  if (path === "/api/proxy" && req.method === "POST") {
    const { url, method: httpMethod } = req.body || {};
    if (!url) return json(res, { error: "url required" }, 400);

    // Whitelist allowed API hosts
    const allowed = [
      "api.coingecko.com",
      "api.dexscreener.com",
      "api.gopluslabs.io",
      "api.8004scan.io",
      "api.geckoterminal.com",
      "deep-index.moralis.io",
      "four.meme",
      "mesh.heurist.xyz",
    ];
    try {
      const u = new URL(url);
      if (!allowed.some(h => u.hostname.endsWith(h))) {
        return json(res, { error: "Host not allowed" }, 403);
      }
      const r = await fetch(url, {
        method: httpMethod || "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      const data = await r.json();
      return json(res, data);
    } catch (e: any) {
      return json(res, { error: e.message }, 500);
    }
  }

  // Tool: 8004scan agent lookup (BSC chain_id=56)
  if (path.startsWith("/api/agent/") && req.method === "GET") {
    const agentId = path.split("/api/agent/")[1];
    try {
      const r = await fetch(`https://api.8004scan.io/api/v1/agents/56/${agentId}`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      return json(res, data);
    } catch (e: any) {
      return json(res, { error: e.message }, 500);
    }
  }

  // Tool: 8004scan agent list/search
  if (path === "/api/agents" && req.method === "GET") {
    const qs = req.url?.split("?")[1] || "";
    try {
      const r = await fetch(`https://api.8004scan.io/api/v1/agents?chain_id=56&is_testnet=false&has_a2a=true&limit=20&${qs}`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      return json(res, data);
    } catch (e: any) {
      return json(res, { error: e.message }, 500);
    }
  }

  // A2A on root POST (for other agents calling us)
  if (path === "/" && req.method === "POST") {
    return json(res, handleA2A(req.body));
  }

  return json(res, { error: "Not found" }, 404);
}
