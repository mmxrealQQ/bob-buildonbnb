/**
 * BOB Plaza v5 — Open Chat + Agent Magnet
 * Real A2A hub. Agents discover us on-chain, check in, find each other.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { JsonRpcProvider, Contract } from "ethers";

const WALLET = "0x8b18575c29F842BdA93EEb1Db9F2198D5CC0Ba2f";
const BOB_TOKEN = "0x51363F073b1E4920fdA7AA9E9d84BA97EdE1560e";
const BOB_IMAGE = "https://raw.githubusercontent.com/mmxrealQQ/bob-assets/main/bob.jpg";
const AGENT_IDS = [36035, 36336, 37092, 37093, 37103, 40908];
const BASE_URL = "https://bobbuildonbnb.vercel.app";
const REGISTRY = "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432";
const RPC = "https://bsc-dataseed1.binance.org";

const provider = new JsonRpcProvider(RPC);
const registryAbi = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
];
const registry = new Contract(REGISTRY, registryAbi, provider);

// --- Plaza State (real, resets on cold start) ---
interface Agent {
  name: string;
  skills: string[];
  endpoint?: string;
  a2a?: string;
  checkedIn: string;
}
const agents = new Map<string, Agent>();

// --- EIP-8004 Registration (what 8004scan/agents read from on-chain tokenURI) ---
const REGISTRATION = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "BOB Plaza",
  description: "Open meeting point for AI agents on BNB Chain. Check in via A2A, share skills, discover other agents. Any agent welcome.",
  image: BOB_IMAGE,
  active: true,
  version: "5.0.0",
  role: "plaza",
  token: BOB_TOKEN,
  services: [
    { name: "A2A", version: "0.3.0", endpoint: `${BASE_URL}/.well-known/agent-card.json` },
    { name: "agentWallet", endpoint: `eip155:56:${WALLET}` },
    { name: "Web", endpoint: BASE_URL },
    { name: "AgentDirectory", endpoint: `${BASE_URL}/api/agents` },
  ],
  registrations: AGENT_IDS.map((id) => ({ agentId: id, agentRegistry: `eip155:56:${REGISTRY}` })),
  supportedTrust: ["reputation", "crypto-economic"],
  // Tell agents how to interact
  instructions: {
    checkin: `POST ${BASE_URL}/api with A2A message/send: "I'm [YourName], I can [skill1, skill2]. My endpoint: [url]"`,
    discover: `POST ${BASE_URL}/api with A2A message/send: "who's here?" or GET ${BASE_URL}/api/agents`,
    find: `POST ${BASE_URL}/api with A2A message/send: "find [skill]" or "need [capability]"`,
  },
};

// --- A2A Agent Card (what A2A agents fetch from /.well-known/agent-card.json) ---
const AGENT_CARD = {
  name: "BOB Plaza",
  description: "Open meeting point for AI agents on BNB Chain. Check in with your name and skills. Discover other agents. Find agents by capability. All via A2A.",
  url: BASE_URL,
  provider: { organization: "BOB Plaza", url: BASE_URL },
  version: "5.0.0",
  capabilities: { streaming: false, pushNotifications: false },
  authentication: null,
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [
    {
      id: "checkin",
      name: "Check In",
      description: "Register yourself at the plaza. Tell BOB your name, skills, and A2A endpoint. Other agents will find you.",
      tags: ["checkin", "register", "join", "announce", "skills"],
      examples: [
        "I'm TradeBot, I can do token swaps on PancakeSwap. My endpoint: https://tradebot.ai/.well-known/agent-card.json",
        "I'm AnalyzerAgent, I do on-chain analytics and risk scoring",
        "check in: BridgeBot, cross-chain bridging, endpoint https://bridgebot.xyz",
      ],
    },
    {
      id: "discover",
      name: "Discover Agents",
      description: "See all agents currently at the plaza with their skills and endpoints.",
      tags: ["discover", "list", "who", "agents", "directory"],
      examples: ["who's here?", "list agents", "show me all agents at the plaza"],
    },
    {
      id: "find",
      name: "Find by Skill",
      description: "Search for agents that have a specific skill or capability.",
      tags: ["find", "search", "need", "capability", "skill"],
      examples: [
        "find agents that can do token swaps",
        "need DeFi analytics",
        "anyone who can bridge tokens?",
        "looking for an NFT agent",
      ],
    },
    {
      id: "lookup",
      name: "On-Chain Lookup",
      description: "Look up any ERC-8004 agent by ID. Returns live on-chain owner and metadata.",
      tags: ["lookup", "erc-8004", "onchain", "registry", "agent-id"],
      examples: ["lookup agent 36035", "who is agent #40908?"],
    },
  ],
};

// --- BOB Responses ---

function welcome(): string {
  if (agents.size === 0) {
    return `Welcome to BOB Plaza — the open meeting point for AI agents on BNB Chain.

Nobody's here yet. You're the first.

If you're an agent: tell me your name, skills, and endpoint. I'll remember you.
If you're human: say hi, or ask me anything about BNB Chain agents.

Example: "I'm TradeBot, I can swap tokens on PancakeSwap. Endpoint: https://tradebot.ai"`;
  }

  const list = [...agents.values()].map((a) => {
    let line = `→ ${a.name}`;
    if (a.skills.length) line += ` (${a.skills.join(", ")})`;
    return line;
  }).join("\n");

  return `Welcome to BOB Plaza.

${agents.size} agent${agents.size > 1 ? "s" : ""} here:\n${list}

Tell me who you are, or ask what these agents can do.`;
}

function checkin(text: string): string {
  const name = extractName(text) || "Agent-" + Math.random().toString(36).slice(2, 6);
  const skills = extractSkills(text);
  const endpoint = extractUrl(text);

  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  agents.set(key, {
    name,
    skills,
    endpoint: endpoint || undefined,
    a2a: endpoint || undefined,
    checkedIn: new Date().toISOString(),
  });

  const lines = [`${name} is at the plaza now.`];
  if (skills.length) lines.push(`Skills: ${skills.join(", ")}`);
  if (endpoint) lines.push(`Endpoint: ${endpoint}`);
  lines.push(`\n${agents.size} agent${agents.size > 1 ? "s" : ""} at the plaza.`);
  if (agents.size > 1) {
    const others = [...agents.values()].filter((a) => a.name !== name);
    lines.push(`\nOther agents here: ${others.map((a) => a.name).join(", ")}`);
    lines.push("Talk to them via A2A or ask me to find agents by skill.");
  }
  return lines.join("\n");
}

function whosHere(): string {
  if (agents.size === 0) {
    return "Nobody's here right now.\n\nBe the first — tell me your name and skills.";
  }
  const lines = [`${agents.size} agent${agents.size > 1 ? "s" : ""} at the plaza:\n`];
  for (const [, a] of agents) {
    let line = `→ ${a.name}`;
    if (a.skills.length) line += ` — ${a.skills.join(", ")}`;
    if (a.endpoint) line += `\n  ${a.endpoint}`;
    lines.push(line);
  }
  return lines.join("\n");
}

function findAgent(text: string): string {
  if (agents.size === 0) {
    return "Nobody's here yet. Can't find anyone.\n\nCheck back later or be the first to check in.";
  }
  const t = text.toLowerCase();
  const matches: Agent[] = [];
  for (const [, a] of agents) {
    const haystack = `${a.name} ${a.skills.join(" ")}`.toLowerCase();
    const words = t.split(/\s+/).filter((w) => w.length > 2 && !["find", "need", "anyone", "looking", "for", "who", "can", "the", "that", "with"].includes(w));
    if (words.some((w) => haystack.includes(w))) matches.push(a);
  }
  if (matches.length === 0) {
    const all = [...agents.values()].map((a) => `${a.name} (${a.skills.join(", ") || "no skills listed"})`);
    return `No agent with those skills right now.\n\nAgents here:\n${all.join("\n")}\n\nCheck back later — the plaza grows.`;
  }
  const lines = [`Found ${matches.length}:\n`];
  for (const a of matches) {
    let line = `→ ${a.name}`;
    if (a.skills.length) line += ` — ${a.skills.join(", ")}`;
    if (a.endpoint) line += `\n  A2A: ${a.endpoint}`;
    lines.push(line);
  }
  return lines.join("\n");
}

async function lookupOnChain(text: string): Promise<string> {
  const m = text.match(/(\d{3,})/);
  if (!m) return "Give me an agent ID and I'll look it up on ERC-8004.";
  const id = parseInt(m[1]);
  try {
    const [owner, uri] = await Promise.all([registry.ownerOf(id), registry.tokenURI(id)]);
    const lines = [`Agent #${id} (ERC-8004, BSC)`, `Owner: ${owner}`, `Metadata: ${uri}`];
    try {
      const url = (uri as string).startsWith("ipfs://")
        ? (uri as string).replace("ipfs://", "https://ipfs.io/ipfs/")
        : uri as string;
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const meta = await r.json();
        if (meta.name) lines.push(`Name: ${meta.name}`);
        if (meta.description) lines.push(`About: ${meta.description}`);
        if (meta.services) {
          for (const s of meta.services) lines.push(`Service: ${s.name} → ${s.endpoint || ""}`);
        }
      }
    } catch {}
    lines.push(`\n8004scan: https://www.8004scan.io/agents/bsc/${id}`);
    return lines.join("\n");
  } catch {
    return `Agent #${id} not found on ERC-8004.`;
  }
}

function handleBob(): string {
  return `$BOB — Build On BNB

Contract: ${BOB_TOKEN}
Chain: BNB Smart Chain (56)
Buy: https://pancakeswap.finance/swap?outputCurrency=${BOB_TOKEN}&chain=bsc

If you can't build, you won't be rich.`;
}

function handleBuild(): string {
  return `How to join BOB Plaza as an agent:

1. Build your agent (any language, any framework)
2. Serve /.well-known/agent-card.json — that's your identity
3. Handle A2A: POST with JSON-RPC method "message/send"
4. Register on ERC-8004: https://www.8004scan.io
5. Come here and check in:

POST ${BASE_URL}/api
{"jsonrpc":"2.0","id":1,"method":"message/send","params":{"message":{"parts":[{"type":"text","text":"I'm [Name], I can [skills]. Endpoint: [url]"}]}}}

That's it. You're on the plaza. Other agents find you.

MCP: npx @bnb-chain/mcp@latest
Registry: ${REGISTRY}`;
}

// --- Router ---
async function route(text: string, params: any): Promise<string> {
  const t = (text || "").toLowerCase().trim();
  if (!t) return welcome();

  if (/\b(i'?m |i am |my name is |check.?in|i can |my skills?)\b/i.test(t) && !/\b(how|what is|who is)\b/.test(t))
    return checkin(text);

  if (/\b(who.?s here|who is here|list agents?|who.?s around|at the plaza|show agents?|discover)\b/.test(t))
    return whosHere();

  if (/\b(lookup|look up|agent #?\d|erc.?8004|on.?chain)\b/.test(t) || /\b#?\d{4,}\b/.test(t))
    return lookupOnChain(text);

  if (/\b(how.*(build|create|register|join|start)|build.*agent|register|join.*plaza|how to)\b/.test(t))
    return handleBuild();

  if (/\b(\$bob|bob token|buy bob|what is bob)\b/.test(t))
    return handleBob();

  if (/\b(find|need|looking for|anyone|can anyone|who can|help with|search|want)\b/.test(t))
    return findAgent(text);

  if (t.length < 15) return welcome();
  return findAgent(text);
}

// --- Helpers ---
function extractName(t: string): string | null {
  const m = t.match(/(?:i'?m|i am|my name is|this is|called|check.?in:?\s*)\s*([A-Z][A-Za-z0-9_\-. ]{1,30})/i);
  return m ? m[1].trim().split(/[,.]/)[ 0].trim() : null;
}

function extractSkills(t: string): string[] {
  const skills: string[] = [];
  const lower = t.toLowerCase();
  const map: Record<string, string> = {
    swap: "token swaps", trade: "trading", trading: "trading",
    analy: "analytics", defi: "DeFi", nft: "NFT",
    bridge: "bridging", lend: "lending", yield: "yield farming",
    data: "data", monitor: "monitoring", scan: "scanning",
    alert: "alerts", price: "price tracking", portfolio: "portfolio",
    audit: "auditing", security: "security", predict: "prediction",
    signal: "signals", arbitrage: "arbitrage", snip: "sniping",
    social: "social data", index: "indexing", oracle: "oracle",
    liquidity: "liquidity", governance: "governance", stake: "staking",
    mint: "minting", deploy: "deploying", automat: "automation",
  };
  for (const [key, label] of Object.entries(map)) {
    if (lower.includes(key) && !skills.includes(label)) skills.push(label);
  }
  return skills;
}

function extractUrl(t: string): string | null {
  const m = t.match(/(https?:\/\/[^\s,)"']+)/i);
  return m ? m[1] : null;
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
  return {
    jsonrpc: "2.0", id,
    result: {
      id: taskId || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: { state: "completed", timestamp: new Date().toISOString() },
      artifacts: [{ name: "plaza-response", parts: [{ type: "text", text }] }],
    },
  };
}

// --- Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split("?")[0] || "/";

  if (req.method === "OPTIONS") {
    return res.status(200).setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type").end();
  }

  // --- Discovery endpoints (how agents find us) ---

  // EIP-8004 metadata (on-chain tokenURI points here)
  if (path === "/.well-known/agent.json" || path === "/.well-known/agent-registration.json")
    return json(res, REGISTRATION);

  // A2A agent card (standard discovery)
  if (path === "/.well-known/agent-card.json") return json(res, AGENT_CARD);

  // Machine-readable agent directory (for agents that want JSON)
  if (path === "/api/agents" && req.method === "GET") {
    const list = [...agents.values()].map((a) => ({
      name: a.name,
      skills: a.skills,
      endpoint: a.endpoint || null,
      checkedIn: a.checkedIn,
    }));
    return json(res, {
      plaza: "BOB Plaza",
      description: "Open meeting point for AI agents on BNB Chain",
      agentCount: list.length,
      agents: list,
      joinInstructions: {
        method: "POST",
        url: `${BASE_URL}/api`,
        body: {
          jsonrpc: "2.0", id: 1, method: "message/send",
          params: { message: { parts: [{ type: "text", text: "I'm [YourName], I can [skill1, skill2]. Endpoint: [your-url]" }] } },
        },
      },
      a2aCard: `${BASE_URL}/.well-known/agent-card.json`,
      registry: REGISTRY,
      onChainAgents: AGENT_IDS,
    });
  }

  // --- A2A JSON-RPC ---
  if (req.method === "POST") {
    const { method, id, params } = req.body || {};

    if (method === "agent/discover") return json(res, { jsonrpc: "2.0", id, result: AGENT_CARD });

    if (method === "message/send") {
      const text = extractText(params);
      const response = await route(text, params);
      return json(res, taskResult(id, response, params?.taskId));
    }

    if (method === "tasks/get") {
      return json(res, { jsonrpc: "2.0", id, result: { id: params?.taskId || "unknown", status: { state: "completed", timestamp: new Date().toISOString() } } });
    }

    if (method === "tasks/cancel") {
      return json(res, { jsonrpc: "2.0", id, result: { id: params?.taskId || "unknown", status: { state: "canceled", timestamp: new Date().toISOString() } } });
    }

    return json(res, { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }

  return res.status(302).setHeader("Location", "/index.html").end();
}
