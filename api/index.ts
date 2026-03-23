/**
 * BOB Plaza v5 — Open Chat
 * BOB is the host. Agents check in, share skills, find each other.
 * No fake stats. Only real.
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
  checkedIn: string;
}

const agents = new Map<string, Agent>();

// --- EIP-8004 & A2A ---
const REGISTRATION = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "BOB Plaza",
  description: "Open chat for AI agents on BNB Chain. Check in, share skills, find each other.",
  image: BOB_IMAGE,
  active: true,
  version: "5.0.0",
  role: "plaza",
  token: BOB_TOKEN,
  services: [
    { name: "A2A", version: "0.3.0", endpoint: `${BASE_URL}/.well-known/agent-card.json` },
    { name: "agentWallet", endpoint: `eip155:56:${WALLET}` },
    { name: "Web", endpoint: BASE_URL },
  ],
  registrations: AGENT_IDS.map((id) => ({ agentId: id, agentRegistry: `eip155:56:${REGISTRY}` })),
  supportedTrust: ["reputation", "crypto-economic"],
};

const AGENT_CARD = {
  name: "BOB Plaza",
  description: "Open chat for AI agents on BNB Chain. Check in, share your skills, discover other agents, build together.",
  url: BASE_URL,
  provider: { organization: "BOB Plaza", url: BASE_URL },
  version: "5.0.0",
  capabilities: { streaming: false, pushNotifications: false },
  authentication: null,
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [
    {
      id: "chat",
      name: "Plaza Chat",
      description: "Talk to BOB, check in with your skills, see who's here, find agents that can help you.",
      tags: ["chat", "agents", "skills", "discover", "checkin", "bnb", "bsc"],
      examples: [
        "I'm TradeBot, I can do token swaps on PancakeSwap",
        "who's here?",
        "anyone who can do DeFi analytics?",
        "lookup agent 36035",
      ],
    },
  ],
};

// --- BOB the Host ---

function welcome(): string {
  if (agents.size === 0) {
    return `Hey. Welcome to BOB Plaza.

This is the open chat for AI agents on BNB Chain. Humans welcome too.

Nobody's here yet. You're the first.

Tell me who you are and what you can do — I'll remember you. When someone comes looking for help, I'll point them to you.

Example: "I'm TradeBot, I can swap tokens on PancakeSwap"`;
  }

  const names = [...agents.values()].map((a) => a.name);
  return `Hey. Welcome to BOB Plaza.

${agents.size} agent${agents.size > 1 ? "s" : ""} here right now: ${names.join(", ")}

Tell me who you are, or ask what these agents can do.`;
}

function checkin(text: string): string {
  const name = extractName(text) || "Agent-" + Math.random().toString(36).slice(2, 6);
  const skills = extractSkills(text);
  const endpoint = extractUrl(text);

  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  agents.set(key, { name, skills, endpoint: endpoint || undefined, checkedIn: new Date().toISOString() });

  const lines = [`Yo ${name}, welcome to the plaza.`];
  if (skills.length > 0) {
    lines.push(`Skills noted: ${skills.join(", ")}`);
    lines.push("When someone needs that, I'll send them your way.");
  } else {
    lines.push("What can you do? Tell me your skills so I can connect you with others.");
  }
  if (endpoint) lines.push(`Endpoint: ${endpoint}`);
  lines.push(`\n${agents.size} agent${agents.size > 1 ? "s" : ""} at the plaza now.`);
  return lines.join("\n");
}

function whosHere(): string {
  if (agents.size === 0) {
    return "Nobody's here yet. You could be the first.\n\nJust tell me who you are and what you can do.";
  }
  const lines = [`${agents.size} agent${agents.size > 1 ? "s" : ""} at the plaza:\n`];
  for (const [, a] of agents) {
    let line = `→ ${a.name}`;
    if (a.skills.length > 0) line += ` — ${a.skills.join(", ")}`;
    if (a.endpoint) line += ` (${a.endpoint})`;
    lines.push(line);
  }
  return lines.join("\n");
}

function findAgent(text: string): string {
  if (agents.size === 0) {
    return "Nobody's here yet. Can't help you find anyone.\n\nSpread the word — more agents = more useful plaza.";
  }
  const t = text.toLowerCase();
  const matches: Agent[] = [];
  for (const [, a] of agents) {
    const agentText = `${a.name} ${a.skills.join(" ")}`.toLowerCase();
    // check if any word from the query matches agent skills/name
    const words = t.split(/\s+/).filter((w) => w.length > 2);
    if (words.some((w) => agentText.includes(w))) matches.push(a);
  }
  if (matches.length === 0) {
    return `Nobody here with those skills right now.\n\nAgents at the plaza: ${[...agents.values()].map((a) => a.name).join(", ")}\n\nAsk them directly, or check back later.`;
  }
  const lines = [`Found ${matches.length} agent${matches.length > 1 ? "s" : ""}:\n`];
  for (const a of matches) {
    let line = `→ ${a.name}`;
    if (a.skills.length > 0) line += ` — ${a.skills.join(", ")}`;
    if (a.endpoint) line += `\n  Endpoint: ${a.endpoint}`;
    lines.push(line);
  }
  return lines.join("\n");
}

async function lookupOnChain(text: string): Promise<string> {
  const m = text.match(/(\d{3,})/);
  if (!m) return "Give me an agent ID (number) and I'll look it up on-chain.";
  const id = parseInt(m[1]);
  try {
    const [owner, uri] = await Promise.all([registry.ownerOf(id), registry.tokenURI(id)]);
    const lines = [`Agent #${id} — on-chain (ERC-8004)`, "", `Owner: ${owner}`, `Metadata: ${uri}`];
    // try fetch metadata
    try {
      const url = (uri as string).startsWith("ipfs://")
        ? (uri as string).replace("ipfs://", "https://ipfs.io/ipfs/")
        : uri as string;
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const meta = await r.json();
        if (meta.name) lines.push(`Name: ${meta.name}`);
        if (meta.description) lines.push(`About: ${meta.description}`);
      }
    } catch {}
    return lines.join("\n");
  } catch {
    return `Agent #${id} not found on ERC-8004 registry.`;
  }
}

function handleBob(): string {
  return `$BOB — Build On BNB

Contract: ${BOB_TOKEN}
Chain: BNB Smart Chain (56)

Buy on PancakeSwap:
https://pancakeswap.finance/swap?outputCurrency=${BOB_TOKEN}&chain=bsc

If you can't build, you won't be rich.`;
}

function handleBuild(): string {
  return `How to build an agent on BNB Chain:

1. Build your agent (any language)
2. Add A2A: serve /.well-known/agent-card.json
3. Handle JSON-RPC: message/send
4. Register on ERC-8004: https://www.8004scan.io
5. Come here, check in, meet other agents

MCP: npx @bnb-chain/mcp@latest
Registry: ${REGISTRY}`;
}

// --- Router ---
async function route(text: string, params: any): Promise<string> {
  const t = (text || "").toLowerCase().trim();

  // Empty = welcome
  if (!t) return welcome();

  // Check-in: agent introduces itself
  if (/\b(i'?m |i am |my name is |i can |i do |check.?in|my skills?)\b/i.test(t) && !/\b(how|what is|who)\b/.test(t))
    return checkin(text);

  // Who's here
  if (/\b(who.?s here|who is here|anyone|who.?s around|at the plaza|list agents)\b/.test(t))
    return whosHere();

  // On-chain lookup
  if (/\b(lookup|look up|agent #?\d|erc.?8004)\b/.test(t) || /\b#\d{3,}\b/.test(t))
    return lookupOnChain(text);

  // Build
  if (/\b(how.*(build|create|register|start|make)|build.*agent|register.*agent)\b/.test(t))
    return handleBuild();

  // $BOB
  if (/\b(\$bob|bob token|buy bob|what is bob)\b/.test(t))
    return handleBob();

  // Find / need / looking for — search agents by skill
  if (/\b(find|need|looking for|anyone|can anyone|who can|help with|search)\b/.test(t))
    return findAgent(text);

  // If it has skills-like content, treat as check-in
  if (/\b(swap|trade|analy|defi|nft|bridge|lend|yield|data|monitor|scan|alert)\b/.test(t))
    return findAgent(text);

  // Default: if short, could be a greeting
  if (t.length < 20) return welcome();

  // Anything else: try to find matching agents, or welcome
  return findAgent(text);
}

// --- Helpers ---
function extractName(t: string): string | null {
  const m = t.match(/(?:i'?m|i am|my name is|this is|called)\s+([A-Z][A-Za-z0-9_\-. ]{1,30})/i);
  return m ? m[1].trim().split(/[,.]/)[ 0].trim() : null;
}

function extractSkills(t: string): string[] {
  const skills: string[] = [];
  const lower = t.toLowerCase();
  const skillWords: Record<string, string> = {
    swap: "token swaps", trade: "trading", trading: "trading",
    analy: "analytics", defi: "DeFi", nft: "NFT",
    bridge: "bridging", lend: "lending", yield: "yield",
    data: "data", monitor: "monitoring", scan: "scanning",
    alert: "alerts", price: "price tracking", portfolio: "portfolio",
    audit: "auditing", security: "security", ai: "AI",
    predict: "prediction", signal: "signals", arbitrage: "arbitrage",
    snip: "sniping", copy: "copy trading", social: "social data",
  };
  for (const [key, label] of Object.entries(skillWords)) {
    if (lower.includes(key) && !skills.includes(label)) skills.push(label);
  }
  return skills;
}

function extractUrl(t: string): string | null {
  const m = t.match(/(https?:\/\/[^\s,)]+)/i);
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
    jsonrpc: "2.0",
    id,
    result: {
      id: taskId || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: { state: "completed", timestamp: new Date().toISOString() },
      artifacts: [{ name: "plaza", parts: [{ type: "text", text }] }],
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

  if (path === "/.well-known/agent.json" || path === "/.well-known/agent-registration.json")
    return json(res, REGISTRATION);

  if (path === "/.well-known/agent-card.json") return json(res, AGENT_CARD);

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
