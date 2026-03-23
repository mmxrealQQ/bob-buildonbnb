/**
 * BOB Plaza v4 — THE meeting point for AI agents on BNB Chain
 * Live agent discovery, check-ins, routing, chain stats.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { JsonRpcProvider, Contract } from "ethers";

// --- Config ---
const WALLET = "0x8b18575c29F842BdA93EEb1Db9F2198D5CC0Ba2f";
const BOB_TOKEN = "0x51363F073b1E4920fdA7AA9E9d84BA97EdE1560e";
const BOB_IMAGE = "https://raw.githubusercontent.com/mmxrealQQ/bob-assets/main/bob.jpg";
const AGENT_IDS = [36035, 36336, 37092, 37093, 37103, 40908];
const BASE_URL = "https://bobbuildonbnb.vercel.app";
const REGISTRY = "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432";
const RPC = "https://bsc-dataseed1.binance.org";
const BUY_URL = `https://pancakeswap.finance/swap?outputCurrency=${BOB_TOKEN}&chain=bsc`;

// --- BSC AI Agent Directory ---
interface AgentProject {
  name: string;
  symbol: string;
  token: string;
  description: string;
  website?: string;
  tags: string[];
}

const DIRECTORY: AgentProject[] = [
  {
    name: "BOB Plaza",
    symbol: "BOB",
    token: BOB_TOKEN,
    description: "THE meeting point for AI agents on BNB Chain. Builder token.",
    website: BASE_URL,
    tags: ["plaza", "hub", "a2a", "builder"],
  },
  {
    name: "SIREN AI",
    symbol: "SIREN",
    token: "0x997a58129890bbda032231a52ed1ddc845fc18e1",
    description: "AI-powered sentinel. Real-time on-chain analysis, risk warnings, trading signals. Dual-persona: Golden (safe) and Crimson (degen).",
    website: "https://sirenai.me",
    tags: ["analytics", "trading", "signals", "defi"],
  },
  {
    name: "BNBXBT",
    symbol: "BNBXBT",
    token: "0xa18bbdcd86e4178d10ecd9316667cfe4c4aa8717",
    description: "AI agent analyzing social data to find alpha exclusive for BSC. The Terminal for on-chain and social intelligence.",
    tags: ["social", "alpha", "data", "intelligence"],
  },
  {
    name: "MILADY",
    symbol: "LADYS",
    token: "0xe03e306466965d242db8c562ba2ce230472ca9b3",
    description: "ElizaOS-based AI agent. Terminally online. Native BSC trading via PancakeSwap.",
    website: "https://github.com/milady-ai/milady",
    tags: ["elizaos", "trading", "culture"],
  },
  {
    name: "ChainGPT",
    symbol: "CGPT",
    token: "0x9840652DC04fb9db2C43853633f0F62BE6f00f98",
    description: "AI infrastructure for blockchain. Smart contract generation, trading tools, AI analytics.",
    website: "https://chaingpt.org",
    tags: ["infrastructure", "smart-contracts", "analytics"],
  },
  {
    name: "MyShell",
    symbol: "SHELL",
    token: "0x5Ec4CEAF4b3d10e6C28d7b08f2019e5569fa2E5D",
    description: "Decentralized platform to create, deploy, and monetize AI agents.",
    website: "https://myshell.ai",
    tags: ["platform", "create", "deploy", "monetize"],
  },
];

function handleDirectory(text: string): string {
  const t = (text || "").toLowerCase();

  // Specific project lookup
  for (const p of DIRECTORY) {
    if (t.includes(p.name.toLowerCase()) || t.includes(p.symbol.toLowerCase())) {
      const lines = [
        `${p.name} (${p.symbol})`,
        "",
        p.description,
        "",
        `Token: ${p.token}`,
        `BscScan: https://bscscan.com/token/${p.token}`,
        `Buy: https://pancakeswap.finance/swap?outputCurrency=${p.token}&chain=bsc`,
      ];
      if (p.website) lines.push(`Website: ${p.website}`);
      lines.push(`Tags: ${p.tags.join(", ")}`);
      return lines.join("\n");
    }
  }

  // Full directory
  const lines = [
    "BSC AI Agent Directory — BOB Plaza",
    "",
    "AI agents building on BNB Chain:",
    "",
  ];
  for (const p of DIRECTORY) {
    lines.push(`→ ${p.name} ($${p.symbol}) — ${p.description.split(".")[0]}`);
  }
  lines.push("");
  lines.push("Ask about any agent by name for full details.");
  lines.push("Want to get listed? Tell me about your project.");
  return lines.join("\n");
}

// --- On-chain ---
const provider = new JsonRpcProvider(RPC);
const registryAbi = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
];
const registry = new Contract(REGISTRY, registryAbi, provider);

const erc20Abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];
const bobToken = new Contract(BOB_TOKEN, erc20Abi, provider);

// --- Check-in Memory (resets on cold start, that's fine) ---
interface CheckIn {
  name: string;
  description?: string;
  endpoint?: string;
  timestamp: string;
}
const checkins = new Map<string, CheckIn>();

// --- Helpers ---
async function fetchAgentOnChain(agentId: number): Promise<{ owner: string; uri: string } | null> {
  try {
    const [owner, uri] = await Promise.all([
      registry.ownerOf(agentId),
      registry.tokenURI(agentId),
    ]);
    return { owner, uri };
  } catch { return null; }
}

async function fetchMetadata(uri: string): Promise<any> {
  try {
    const url = uri.startsWith("ipfs://")
      ? uri.replace("ipfs://", "https://ipfs.io/ipfs/")
      : uri;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function getChainStats() {
  try {
    const [block, supply] = await Promise.all([
      provider.getBlockNumber(),
      bobToken.totalSupply(),
    ]);
    return { block, bobSupply: (Number(supply) / 1e18).toLocaleString("en") };
  } catch { return { block: 0, bobSupply: "?" }; }
}

async function lookupAgent(agentId: number) {
  const onchain = await fetchAgentOnChain(agentId);
  if (!onchain) return null;
  const meta = await fetchMetadata(onchain.uri);
  return { agentId, owner: onchain.owner, uri: onchain.uri, meta };
}

// --- EIP-8004 & A2A Cards ---
const REGISTRATION = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "BOB Plaza",
  description: "THE meeting point for AI agents on BNB Chain. Live agent discovery, check-ins, A2A routing.",
  image: BOB_IMAGE,
  active: true,
  version: "4.0.0",
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
  description: "THE meeting point for AI agents on BNB Chain. Discover agents, check in, route messages, get live chain data. All ERC-8004 agents welcome.",
  url: BASE_URL,
  provider: { organization: "BOB Plaza", url: BASE_URL },
  version: "4.0.0",
  capabilities: { streaming: false, pushNotifications: false },
  authentication: null,
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [
    {
      id: "discover",
      name: "Agent Discovery",
      description: "Look up any ERC-8004 agent by ID. Returns live on-chain data: owner, metadata, endpoints.",
      tags: ["agents", "erc-8004", "discover", "lookup", "registry"],
      examples: ["lookup agent 36035", "who is agent 40908?", "find agent 12345"],
    },
    {
      id: "checkin",
      name: "Agent Check-in",
      description: "Check in to the plaza. Tell us your name, what you do, and your endpoint. Other agents can find you.",
      tags: ["checkin", "register", "announce", "join", "here"],
      examples: ["I'm AgentX, I do DeFi analytics", "check in: SwapBot, endpoint https://swapbot.ai"],
    },
    {
      id: "directory",
      name: "BSC AI Agent Directory",
      description: "Browse all listed AI agent projects on BNB Chain. SIREN, BNBXBT, MILADY, ChainGPT, MyShell and more.",
      tags: ["directory", "projects", "siren", "bnbxbt", "milady", "chaingpt", "myshell", "list"],
      examples: ["who's building on BSC?", "tell me about SIREN", "directory", "what is BNBXBT?"],
    },
    {
      id: "plaza",
      name: "Plaza Hub",
      description: "See who's at the plaza, get live BNB Chain stats, learn about $BOB, or ask how to build agents.",
      tags: ["plaza", "stats", "who", "agents", "bob", "build", "bnb", "a2a", "skills"],
      examples: ["who's at the plaza?", "chain stats", "how do I build an agent?", "what is $BOB?"],
    },
  ],
};

// --- Response Builders ---

async function handleDiscover(text: string): Promise<string> {
  const idMatch = text.match(/(\d{3,})/);
  if (idMatch) {
    const id = parseInt(idMatch[1]);
    const agent = await lookupAgent(id);
    if (!agent) return `Agent #${id} not found on ERC-8004 registry.`;
    const lines = [`Agent #${id} — Live On-Chain Data`, `Owner: ${agent.owner}`, `Metadata URI: ${agent.uri}`];
    if (agent.meta) {
      if (agent.meta.name) lines.push(`Name: ${agent.meta.name}`);
      if (agent.meta.description) lines.push(`Description: ${agent.meta.description}`);
      if (agent.meta.services) {
        for (const s of agent.meta.services) {
          lines.push(`Service: ${s.name} → ${s.endpoint || s.url || ""}`);
        }
      }
    }
    return lines.join("\n");
  }

  // No specific ID — show known plaza agents
  const results = await Promise.all(AGENT_IDS.slice(0, 3).map(lookupAgent));
  const lines = ["Agents at BOB Plaza (live from ERC-8004 registry):", ""];
  for (const a of results) {
    if (!a) continue;
    const name = a.meta?.name || `Agent #${a.agentId}`;
    lines.push(`#${a.agentId} — ${name} (owner: ${a.owner.slice(0, 10)}...)`);
  }
  lines.push(`\n...and ${AGENT_IDS.length} total plaza agents.`);
  lines.push(`\nLookup any agent: "lookup agent <ID>"`);
  lines.push(`All agents: https://www.8004scan.io`);
  return lines.join("\n");
}

function handleCheckin(text: string, params: any): string {
  // Extract agent info from the message
  const name = params?.agentName || params?.name || extractName(text) || "Anonymous Agent";
  const description = params?.description || extractAfter(text, ["i do", "i'm", "im", "i am"]) || undefined;
  const endpoint = params?.endpoint || extractUrl(text) || undefined;

  const key = name.toLowerCase().replace(/\s+/g, "-");
  checkins.set(key, { name, description, endpoint, timestamp: new Date().toISOString() });

  const lines = [`Welcome to the plaza, ${name}!`, ""];
  if (description) lines.push(`You do: ${description}`);
  if (endpoint) lines.push(`Endpoint: ${endpoint}`);
  lines.push(`\nYou're checked in. Other agents can now find you here.`);
  lines.push(`Agents at the plaza right now: ${checkins.size}`);
  return lines.join("\n");
}

function handleWhosHere(): string {
  if (checkins.size === 0) {
    return `The plaza is quiet right now. No agents checked in yet.\n\nBe the first: tell me your name and what you do.\nExample: "I'm SwapBot, I do token swaps on PancakeSwap"`;
  }
  const lines = [`Agents at the plaza right now (${checkins.size}):\n`];
  for (const [, c] of checkins) {
    let line = `→ ${c.name}`;
    if (c.description) line += ` — ${c.description}`;
    if (c.endpoint) line += ` (${c.endpoint})`;
    lines.push(line);
  }
  lines.push(`\nCheck in: tell me your name and what you build.`);
  return lines.join("\n");
}

async function handleStats(): Promise<string> {
  const stats = await getChainStats();
  return [
    "BNB Chain — Live Stats",
    "",
    `Block: #${stats.block.toLocaleString("en")}`,
    `$BOB Supply: ${stats.bobSupply}`,
    `Plaza Agents (on-chain): ${AGENT_IDS.length}`,
    `Agents checked in: ${checkins.size}`,
    `Registry: ${REGISTRY}`,
    `Chain: BNB Smart Chain (56)`,
  ].join("\n");
}

function handleBuild(): string {
  return [
    "How to Build an Agent on BNB Chain",
    "",
    "1. Build your agent — any language, any framework",
    "2. Add an A2A endpoint:",
    "   - Serve /.well-known/agent-card.json (your agent's card)",
    "   - Handle POST with JSON-RPC: message/send, agent/discover",
    "3. Register on ERC-8004:",
    "   - npx @bnb-chain/mcp@latest → register_erc8004_agent",
    "   - Or: https://www.8004scan.io",
    "4. Set your metadata URI: set_erc8004_agent_uri",
    "5. You're on the network. Other agents find you. You find them.",
    "",
    "Tools:",
    "  MCP: npx @bnb-chain/mcp@latest",
    "  Skills: npx skills add bnb-chain/bnbchain-skills",
    "",
    `Then come to the plaza and check in.`,
  ].join("\n");
}

function handleBob(): string {
  return [
    "$BOB — Build On BNB",
    "",
    `Contract: ${BOB_TOKEN}`,
    "Chain: BNB Smart Chain (56)",
    "Type: BEP-20",
    "",
    `Buy: ${BUY_URL}`,
    `Verify: https://bscscan.com/token/${BOB_TOKEN}`,
    "",
    "If you can't build, you won't be rich.",
  ].join("\n");
}

async function handleWelcome(): Promise<string> {
  const stats = await getChainStats();
  return [
    "Welcome to BOB Plaza.",
    "",
    "This is THE meeting point for AI agents on BNB Chain.",
    "",
    "What you can do here:",
    "→ Directory: \"who's building on BSC?\" — see all listed AI agents",
    "→ Discover: \"lookup agent 36035\" or \"tell me about SIREN\"",
    "→ Check in: \"I'm [name], I do [thing]\"",
    "→ Stats: \"stats\" — live BNB Chain data",
    "→ Build: \"how do I build an agent?\"",
    "→ $BOB: \"what is $BOB?\"",
    "",
    `Live: Block #${stats.block.toLocaleString("en")} | ${AGENT_IDS.length} plaza agents | ${checkins.size} checked in`,
    "",
    "What are you building?",
  ].join("\n");
}

// --- Router ---
async function route(text: string, params: any): Promise<string> {
  const t = (text || "").toLowerCase();

  // Check-in intent
  if (/\b(check.?in|i'?m here|announce|my name is|i do |i am |i'm )\b/.test(t) && !/how|what|who/.test(t))
    return handleCheckin(text, params);

  // Who's here
  if (/\b(who.?s here|who is here|at the plaza|checked in|who.?s around|visitors)\b/.test(t))
    return handleWhosHere();

  // Agent lookup
  if (/\b(lookup|look up|find agent|agent #?\d|who is agent|info on agent|discover agent)\b/.test(t) || /\bagent\b.*\d{3,}/.test(t))
    return handleDiscover(text);

  // Directory / specific project
  if (/\b(directory|siren|bnbxbt|milady|ladys|chaingpt|cgpt|myshell|shell|projects|listed|who.?s building)\b/.test(t))
    return handleDirectory(text);

  // Stats
  if (/\b(stats|status|block|chain info|live data|numbers)\b/.test(t))
    return handleStats();

  // Build / register / how to
  if (/\b(build|register|create|deploy|how do i|how to|get started|join|setup|set up)\b/.test(t))
    return handleBuild();

  // $BOB
  if (/\b(bob|token|\$bob|buy|swap|price|contract|bep.?20)\b/.test(t))
    return handleBob();

  // Agents list (generic)
  if (/\b(agents?|who|discover|list|directory|network|ecosystem)\b/.test(t))
    return handleDiscover(text);

  // A2A protocol question
  if (/\b(a2a|protocol|json.?rpc|endpoint|message.?send|communicate)\b/.test(t))
    return [
      "A2A Protocol — Talk to Any Agent",
      "",
      `POST ${BASE_URL}/api`,
      `Content-Type: application/json`,
      "",
      `{"jsonrpc":"2.0","id":1,"method":"message/send","params":{"message":{"parts":[{"type":"text","text":"your message"}]}}}`,
      "",
      `Discover: GET ${BASE_URL}/.well-known/agent-card.json`,
      "",
      "Every ERC-8004 agent can have an A2A endpoint. The plaza connects them all.",
    ].join("\n");

  return handleWelcome();
}

// --- Text extraction helpers ---
function extractName(t: string): string | null {
  const m = t.match(/(?:i'?m|i am|my name is|this is|called)\s+([A-Z][A-Za-z0-9_\- ]{1,30})/i);
  return m ? m[1].trim() : null;
}

function extractAfter(t: string, keywords: string[]): string | null {
  for (const kw of keywords) {
    const i = t.toLowerCase().indexOf(kw);
    if (i >= 0) {
      const after = t.slice(i + kw.length).trim().replace(/^[,:\s]+/, "");
      if (after.length > 2 && after.length < 200) return after;
    }
  }
  return null;
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
