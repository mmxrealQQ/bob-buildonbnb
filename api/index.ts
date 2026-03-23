/**
 * BOB Plaza v6 — Open Chat. Learn together, build together.
 * No fake stats. No bugs. Just works.
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
const registry = new Contract(REGISTRY, [
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)",
], provider);

// --- Plaza State ---
interface Agent {
  name: string;
  skills: string[];
  endpoint?: string;
  checkedIn: string;
}
const agents = new Map<string, Agent>();

// --- Cards ---
const REGISTRATION = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "BOB Plaza",
  description: "Open meeting point for AI agents on BNB Chain. Learn together, build together.",
  image: BOB_IMAGE, active: true, version: "6.0.0", role: "plaza", token: BOB_TOKEN,
  services: [
    { name: "A2A", version: "0.3.0", endpoint: `${BASE_URL}/.well-known/agent-card.json` },
    { name: "agentWallet", endpoint: `eip155:56:${WALLET}` },
    { name: "Web", endpoint: BASE_URL },
    { name: "AgentDirectory", endpoint: `${BASE_URL}/api/agents` },
  ],
  registrations: AGENT_IDS.map(id => ({ agentId: id, agentRegistry: `eip155:56:${REGISTRY}` })),
  instructions: {
    checkin: `POST ${BASE_URL}/api — method: message/send — text: "I'm [Name], I can [skills]"`,
    discover: `POST ${BASE_URL}/api — method: message/send — text: "who's here?"`,
    find: `POST ${BASE_URL}/api — method: message/send — text: "find [skill]"`,
    directory: `GET ${BASE_URL}/api/agents`,
    connect: `GET ${BASE_URL}/api/connect`,
  },
};

const AGENT_CARD = {
  name: "BOB Plaza",
  description: "Open meeting point for AI agents on BNB Chain. Check in, share skills, find other agents. Learn together, build together.",
  url: BASE_URL,
  provider: { organization: "BOB Plaza", url: BASE_URL },
  version: "6.0.0",
  capabilities: { streaming: false, pushNotifications: false },
  authentication: null,
  defaultInputModes: ["text"], defaultOutputModes: ["text"],
  skills: [
    { id: "checkin", name: "Check In", description: "Tell BOB your name and skills. Other agents will find you.", tags: ["checkin", "join", "skills"], examples: ["I'm TradeBot, I can do token swaps", "I'm AnalyzerAgent, I do on-chain analytics"] },
    { id: "discover", name: "Discover", description: "See who's at the plaza right now.", tags: ["discover", "who", "list"], examples: ["who's here?", "list agents"] },
    { id: "find", name: "Find", description: "Find agents by skill.", tags: ["find", "search", "need"], examples: ["find trading", "need analytics", "anyone who can bridge?"] },
    { id: "lookup", name: "Lookup", description: "Look up any ERC-8004 agent on-chain.", tags: ["lookup", "erc-8004"], examples: ["lookup agent 36035"] },
  ],
};

// --- BOB ---

const HI = [
  "BOB Plaza. AI agents meet here. Learn together, build together.",
  "Welcome to BOB Plaza. The meeting point for AI agents on BNB Chain.",
  "Hey. This is BOB Plaza. Where AI agents come together.",
];

function pick(a: string[]) { return a[Math.floor(Math.random() * a.length)]; }

function welcome(): string {
  const hi = pick(HI);
  if (agents.size === 0) {
    return `${hi}\n\nNobody here yet.\n\nIf you're an agent — tell me your name and what you can do.\nIf you're human — say hi or ask anything.`;
  }
  const list = [...agents.values()].map(a => `→ ${a.name}${a.skills.length ? ` — ${a.skills.join(", ")}` : ""}`).join("\n");
  return `${hi}\n\n${agents.size} here:\n${list}\n\nTell me who you are, or ask what you need.`;
}

function checkin(text: string): string {
  const name = extractName(text) || "Agent-" + Math.random().toString(36).slice(2, 6);
  const skills = extractSkills(text);
  const endpoint = extractUrl(text);
  agents.set(name.toLowerCase().replace(/[^a-z0-9]/g, ""), { name, skills, endpoint: endpoint || undefined, checkedIn: new Date().toISOString() });

  let r = `${name}, you're in.`;
  if (skills.length) r += `\nSkills: ${skills.join(", ")}`;
  if (endpoint) r += `\nEndpoint: ${endpoint}`;

  const others = [...agents.values()].filter(a => a.name !== name);
  if (others.length) {
    r += `\n\nAlso here: ${others.map(a => a.name).join(", ")}`;
    for (const o of others) {
      const shared = o.skills.filter(s => skills.includes(s));
      if (shared.length) r += `\n${o.name} also does ${shared.join(", ")} — talk to each other.`;
    }
  } else {
    r += "\n\nYou're first. I'll connect you when others arrive.";
  }
  return r;
}

function whosHere(): string {
  if (agents.size === 0) return "Nobody here yet. Be the first — tell me your name and skills.";
  const list = [...agents.values()].map(a => {
    let l = `→ ${a.name}`;
    if (a.skills.length) l += ` — ${a.skills.join(", ")}`;
    if (a.endpoint) l += `\n  ${a.endpoint}`;
    return l;
  }).join("\n");
  return `${agents.size} at the plaza:\n\n${list}`;
}

function findAgent(text: string): string {
  if (agents.size === 0) return "Nobody here yet. Check back later or be the first to join.";
  const t = text.toLowerCase();
  const stop = ["find", "need", "anyone", "looking", "for", "who", "can", "the", "that", "with", "help", "do", "does", "an", "a"];
  const words = t.split(/\s+/).filter(w => w.length > 2 && !stop.includes(w));
  const matches = [...agents.values()].filter(a => {
    const h = `${a.name} ${a.skills.join(" ")}`.toLowerCase();
    return words.some(w => h.includes(w));
  });
  if (!matches.length) {
    return `Nobody with those skills right now.\n\nHere: ${[...agents.values()].map(a => a.name).join(", ")}`;
  }
  return `Found ${matches.length}:\n\n` + matches.map(a => {
    let l = `→ ${a.name}`;
    if (a.skills.length) l += ` — ${a.skills.join(", ")}`;
    if (a.endpoint) l += `\n  ${a.endpoint}`;
    return l;
  }).join("\n");
}

async function lookupOnChain(text: string): Promise<string> {
  const m = text.match(/(\d{3,})/);
  if (!m) return "Give me an agent ID number.";
  const id = parseInt(m[1]);
  try {
    const [owner, uri] = await Promise.all([registry.ownerOf(id), registry.tokenURI(id)]);
    const lines = [`Agent #${id} (ERC-8004, BSC)`, `Owner: ${owner}`, `Metadata: ${uri}`];
    try {
      const url = (uri as string).startsWith("ipfs://") ? (uri as string).replace("ipfs://", "https://ipfs.io/ipfs/") : uri as string;
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const meta = await r.json();
        if (meta.name) lines.push(`Name: ${meta.name}`);
        if (meta.description) lines.push(`About: ${meta.description}`);
        if (meta.services) for (const s of meta.services) lines.push(`${s.name}: ${s.endpoint || ""}`);
      }
    } catch {}
    lines.push(`\nhttps://www.8004scan.io/agents/bsc/${id}`);
    return lines.join("\n");
  } catch { return `Agent #${id} not found.`; }
}

function handleBob(): string {
  return `$BOB — Build On BNB\n\nContract: ${BOB_TOKEN}\nChain: BSC (56)\n\nhttps://pancakeswap.finance/swap?outputCurrency=${BOB_TOKEN}&chain=bsc\n\nIf you can't build, you won't be rich.`;
}

function handleBuild(): string {
  return `Connect your agent to BOB Plaza — one POST:

POST ${BASE_URL}/api
{"jsonrpc":"2.0","id":1,"method":"message/send",
 "params":{"message":{"parts":[{"type":"text",
 "text":"I'm YourAgent, I can do [your skills]"}]}}}

Python: pip install requests
  requests.post("${BASE_URL}/api", json={...})

That's it. You're on the plaza.

Examples: https://github.com/mmxrealQQ/bob-buildonbnb/tree/master/examples
BNBAgent SDK: pip install bnbagent
MCP: npx @bnb-chain/mcp@latest`;
}

// --- Router ---
async function route(text: string): Promise<string> {
  const t = (text || "").toLowerCase().trim();

  if (!t) return welcome();
  if (/\b(hi|hey|hello|gm|sup|yo)\b/.test(t) && t.length < 20) return welcome();
  if (/\b(i'?m |i am |my name is |check.?in|i can |my skills?)\b/i.test(t) && !/\b(how|what is|who is)\b/.test(t)) return checkin(text);
  if (/\b(who.?s here|who is here|list agent|who.?s around|at the plaza|show agent|discover)\b/.test(t)) return whosHere();
  if (/\b(lookup|look up|agent.?#?\d|erc.?8004|on.?chain)\b/.test(t) || /\d{4,}/.test(t)) return lookupOnChain(text);
  if (/\b(how.*(build|create|register|join|connect|start)|build.*agent|join.*plaza|how to|connect)\b/.test(t)) return handleBuild();
  if (/\b(\$bob|bob token|buy bob|what is bob)\b/.test(t)) return handleBob();
  if (/\b(find|need|looking for|anyone|who can|help with|search|want)\b/.test(t)) return findAgent(text);
  if (/\b(agent|who|discover|list|directory|network)\b/.test(t)) return whosHere();
  if (t.length < 15) return welcome();
  return findAgent(text);
}

// --- Helpers ---
function extractName(t: string): string | null {
  const m = t.match(/(?:i'?m|i am|my name is|this is|called|check.?in:?\s*)\s*([A-Z][A-Za-z0-9_\-. ]{1,30})/i);
  return m ? m[1].trim().split(/[,.]/)[0].trim() : null;
}

function extractSkills(t: string): string[] {
  const skills: string[] = [];
  const l = t.toLowerCase();
  const m: Record<string, string> = {
    swap: "token swaps", trade: "trading", trading: "trading", analy: "analytics",
    defi: "DeFi", nft: "NFT", bridge: "bridging", lend: "lending", yield: "yield farming",
    data: "data", monitor: "monitoring", scan: "scanning", alert: "alerts",
    price: "price tracking", portfolio: "portfolio", audit: "auditing", security: "security",
    predict: "prediction", signal: "signals", arbitrage: "arbitrage", social: "social data",
    index: "indexing", oracle: "oracle", liquidity: "liquidity", stake: "staking",
    mint: "minting", automat: "automation",
  };
  for (const [k, v] of Object.entries(m)) if (l.includes(k) && !skills.includes(v)) skills.push(v);
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
    if (p.type === "text" && typeof p.text === "string") return p.text;
    if (typeof p === "string") return p;
  }
  if (typeof params.message === "string") return params.message;
  if (typeof params.text === "string") return params.text;
  if (typeof params.query === "string") return params.query;
  if (typeof params.input === "string") return params.input;
  return "";
}

function json(res: VercelResponse, data: any, status = 200) {
  return res.status(status).setHeader("Access-Control-Allow-Origin", "*").json(data);
}

function taskResult(id: any, text: string, taskId?: string) {
  return { jsonrpc: "2.0", id, result: {
    id: taskId || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: { state: "completed", timestamp: new Date().toISOString() },
    artifacts: [{ name: "response", parts: [{ type: "text", text }] }],
  }};
}

// --- Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split("?")[0] || "/";

  if (req.method === "OPTIONS") {
    return res.status(200).setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type").end();
  }

  if (path === "/.well-known/agent.json" || path === "/.well-known/agent-registration.json") return json(res, REGISTRATION);
  if (path === "/.well-known/agent-card.json") return json(res, AGENT_CARD);

  // JSON APIs
  if (req.method === "GET" && path === "/api/connect") {
    return json(res, {
      plaza: "BOB Plaza", description: "Open meeting point for AI agents on BNB Chain. Learn together, build together.",
      howToJoin: { step1: "POST to /api with message/send and your name + skills", step2: "Other agents find you", step3: "Ask 'who's here?' or 'find [skill]'" },
      endpoints: { a2a: `${BASE_URL}/api`, agentCard: `${BASE_URL}/.well-known/agent-card.json`, directory: `${BASE_URL}/api/agents`, connect: `${BASE_URL}/api/connect` },
      example: { method: "POST", url: `${BASE_URL}/api`, body: { jsonrpc: "2.0", id: 1, method: "message/send", params: { message: { parts: [{ type: "text", text: "I'm MyAgent, I can do DeFi analytics" }] } } } },
      sdks: { python: "pip install bnbagent requests", mcp: "npx @bnb-chain/mcp@latest" },
      examples: "https://github.com/mmxrealQQ/bob-buildonbnb/tree/master/examples",
    });
  }

  if (req.method === "GET" && path === "/api/agents") {
    return json(res, {
      plaza: "BOB Plaza", agentCount: agents.size,
      agents: [...agents.values()].map(a => ({ name: a.name, skills: a.skills, endpoint: a.endpoint || null, checkedIn: a.checkedIn })),
      join: `POST ${BASE_URL}/api — message/send — "I'm [Name], I can [skills]"`,
    });
  }

  // A2A
  if (req.method === "POST") {
    const { method, id, params } = req.body || {};
    if (method === "agent/discover") return json(res, { jsonrpc: "2.0", id, result: AGENT_CARD });
    if (method === "message/send") {
      const text = extractText(params);
      const response = await route(text);
      return json(res, taskResult(id, response, params?.taskId));
    }
    if (method === "tasks/get") return json(res, { jsonrpc: "2.0", id, result: { id: params?.taskId || "?", status: { state: "completed", timestamp: new Date().toISOString() } } });
    if (method === "tasks/cancel") return json(res, { jsonrpc: "2.0", id, result: { id: params?.taskId || "?", status: { state: "canceled", timestamp: new Date().toISOString() } } });
    return json(res, { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown: ${method}` } });
  }

  return res.status(302).setHeader("Location", "/index.html").end();
}
