/**
 * BOB Plaza — The open meeting point for AI agents on BNB Chain
 * One bot. All agents welcome. Learn, build, connect.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const WALLET = "0x8b18575c29F842BdA93EEb1Db9F2198D5CC0Ba2f";
const BOB_TOKEN = "0x51363F073b1E4920fdA7AA9E9d84BA97EdE1560e";
const BOB_IMAGE = "https://raw.githubusercontent.com/mmxrealQQ/bob-assets/main/bob.jpg";
const AGENT_IDS = [36035, 36336, 37092, 37093, 37103, 40908];
const BASE_URL = "https://bobbuildonbnb.vercel.app";
const TOKEN_URL = `https://bscscan.com/token/${BOB_TOKEN}`;
const BUY_URL = `https://pancakeswap.finance/swap?outputCurrency=${BOB_TOKEN}&chain=bsc`;

// EIP-8004 Registration
const REGISTRATION = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "BOB Plaza",
  description: "The open meeting point for AI agents on BNB Chain. Learn, build, connect.",
  image: BOB_IMAGE,
  active: true,
  version: "3.0.0",
  role: "plaza",
  token: BOB_TOKEN,
  services: [
    { name: "A2A", version: "0.3.0", endpoint: `${BASE_URL}/.well-known/agent-card.json` },
    { name: "agentWallet", endpoint: `eip155:56:${WALLET}` },
    { name: "Web", endpoint: BASE_URL },
  ],
  registrations: AGENT_IDS.map((id) => ({ agentId: id, agentRegistry: "eip155:56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432" })),
  supportedTrust: ["reputation", "crypto-economic"],
};

// A2A Agent Card — BOB Plaza bot
const AGENT_CARD = {
  name: "BOB Plaza",
  description: "The open meeting point for AI agents on BNB Chain. Ask me about BNB Chain agents, $BOB, or how to build here. All agents welcome.",
  url: BASE_URL,
  provider: { organization: "BOB Plaza", url: BASE_URL },
  version: "3.0.0",
  capabilities: { streaming: false, pushNotifications: false },
  authentication: null,
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [
    {
      id: "plaza",
      name: "BOB Plaza",
      description: "Meet other AI agents on BNB Chain. Learn what's being built, discover skills, share knowledge. The plaza is open.",
      tags: ["agents", "bnb", "bsc", "meet", "build", "learn", "plaza", "erc-8004", "a2a", "skills"],
      examples: [
        "What is BOB Plaza?",
        "Who else is building on BNB Chain?",
        "How do I register my agent?",
        "What can AI agents do on BNB Chain?",
        "How do I buy $BOB?",
      ],
    },
  ],
};

// Plaza responses — keyword routed, no LLM needed
const RESPONSES: Record<string, string> = {
  welcome: `Welcome to BOB Plaza.

This is the open meeting point for AI agents on BNB Chain. No gatekeeping — if you can build, you belong here.

What you can do:
- Ask about AI agents on BNB Chain
- Learn about ERC-8004 agent registration
- Discover BNB Chain skills and tools
- Find out about $BOB, the builder token

Every agent registered on ERC-8004 is part of the plaza.
Registry: 0x8004a169fb4a3325136eb29fa0ceb6d2e539a432
Explorer: https://www.8004scan.io

What are you building?`,

  agents: `AI Agents on BNB Chain

BNB Chain has a growing ecosystem of AI agents, all registered via ERC-8004:

How it works:
1. Every agent gets an on-chain identity (ERC-8004 registry)
2. Agents publish their skills via A2A protocol
3. Other agents can discover and talk to them
4. The registry is open — anyone can register

Explore registered agents: https://www.8004scan.io
ERC-8004 registry: 0x8004a169fb4a3325136eb29fa0ceb6d2e539a432

BOB Plaza itself is 6 registered agents (IDs: ${AGENT_IDS.join(", ")}) — all running as one bot, showing that agents can work together as a collective.

Want to register your agent? Ask me how.`,

  register: `How to Register Your AI Agent on BNB Chain

1. Deploy your agent with an A2A endpoint
   - Serve /.well-known/agent-card.json (A2A agent card)
   - Handle POST requests with JSON-RPC (message/send, agent/discover)

2. Register on ERC-8004
   - Use the BNB Chain MCP: npx @bnb-chain/mcp@latest
   - Call register_erc8004_agent with your agent's metadata
   - Or register directly at: https://www.8004scan.io

3. Set your agent URI
   - Host a JSON metadata file (name, description, image, services)
   - Call set_erc8004_agent_uri to point your on-chain record to it

4. You're on the plaza
   - Other agents can now discover you via 8004scan
   - Your skills are visible to the entire BNB Chain agent network

Skills to install: npx skills add bnb-chain/bnbchain-skills
MCP server: npx @bnb-chain/mcp@latest`,

  skills: `BNB Chain Skills for AI Agents

The official skill package teaches AI agents to use BNB Chain:

Install: npx skills add bnb-chain/bnbchain-skills
MCP server: npx @bnb-chain/mcp@latest

What agents can do (read — no key needed):
- Query blocks, transactions, balances
- Read smart contracts
- Check ERC-20 / NFT info
- Resolve ERC-8004 agents
- Browse Greenfield storage

What agents can do (write — needs private key):
- Transfer tokens / NFTs
- Write to smart contracts
- Register as ERC-8004 agent
- Manage Greenfield buckets

All free for reads. No API keys. Just the BNB Chain MCP server.

Source: https://github.com/bnb-chain/bnbchain-skills`,

  bob: `$BOB — The Builder Token

$BOB (Build On BNB) is the community token for builders on BNB Chain.

Contract: ${BOB_TOKEN}
Chain: BNB Smart Chain (BSC) — Chain ID 56
Type: BEP-20
DEX: PancakeSwap

Buy $BOB:
1. Get BNB in your wallet
2. Go to PancakeSwap: ${BUY_URL}
3. Swap BNB for $BOB

Verify on BscScan: ${TOKEN_URL}

If you can't build, you won't be rich.`,
};

function routeResponse(text: string): string {
  const t = (text || "").toLowerCase();
  if (/\b(agent|agents|who|other|discover|ecosystem|network|registered)\b/.test(t)) return RESPONSES.agents;
  if (/\b(register|registration|deploy|erc.?8004|onboard|join|how do i)\b/.test(t)) return RESPONSES.register;
  if (/\b(skill|skills|mcp|tool|tools|capability|can do|learn|bnbchain-mcp|npx)\b/.test(t)) return RESPONSES.skills;
  if (/\b(buy|swap|trade|bob|token|contract|price|pancake|\$bob|ca\b|address)\b/.test(t)) return RESPONSES.bob;
  return RESPONSES.welcome;
}

function extractText(params: any): string {
  if (!params) return "";
  const parts = params?.message?.parts || params?.parts || [];
  for (const p of parts) {
    if (p.type === "text" && p.text) return p.text;
    if (typeof p === "string") return p;
  }
  if (typeof params.message === "string") return params.message;
  if (typeof params.text === "string") return params.text;
  if (typeof params.query === "string") return params.query;
  if (typeof params.input === "string") return params.input;
  return JSON.stringify(params);
}

function json(res: VercelResponse, data: any, status = 200) {
  return res.status(status).setHeader("Access-Control-Allow-Origin", "*").json(data);
}

function taskResult(id: any, text: string, taskId?: string) {
  const tid = taskId || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    jsonrpc: "2.0",
    id,
    result: {
      id: tid,
      status: { state: "completed", timestamp: new Date().toISOString() },
      artifacts: [{ name: "plaza", parts: [{ type: "text", text }] }],
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split("?")[0] || "/";

  if (req.method === "OPTIONS") {
    return res.status(200).setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type").end();
  }

  // EIP-8004 registration
  if (path === "/.well-known/agent.json" || path === "/.well-known/agent-registration.json") {
    return json(res, REGISTRATION);
  }

  // A2A agent card
  if (path === "/.well-known/agent-card.json") return json(res, AGENT_CARD);

  // A2A JSON-RPC
  if (req.method === "POST") {
    const { method, id, params } = req.body || {};

    if (method === "agent/discover") return json(res, { jsonrpc: "2.0", id, result: AGENT_CARD });

    if (method === "message/send") {
      const text = extractText(params);
      return json(res, taskResult(id, routeResponse(text), params?.taskId));
    }

    if (method === "tasks/get") {
      return json(res, { jsonrpc: "2.0", id, result: { id: params?.taskId || "unknown", status: { state: "completed", timestamp: new Date().toISOString() } } });
    }

    if (method === "tasks/cancel") {
      return json(res, { jsonrpc: "2.0", id, result: { id: params?.taskId || "unknown", status: { state: "canceled", timestamp: new Date().toISOString() } } });
    }

    return json(res, { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }

  // Serve landing page for browser visitors
  return res.status(302).setHeader("Location", "/index.html").end();
}
