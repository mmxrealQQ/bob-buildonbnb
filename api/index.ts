/**
 * BOB Build On BNB — API Handler
 * A2A endpoint + agent card + dashboard API
 */

const WALLET = "0x8b18575c29F842BdA93EEb1Db9F2198D5CC0Ba2f";
const BOB_TOKEN = "0x51363F073b1E4920fdA7AA9E9d84BA97EdE1560e";
const AGENT_IDS = [36035, 36336, 37092, 37093, 37103, 40908];

const AGENT_CARD = {
  name: "BOB Build On BNB",
  description: "If you can't build you won't be rich. The BNB Chain AI Dashboard — test MCP tools, explore agents, learn everything about AI on BNB Chain.",
  url: "https://buildonbnbbob.vercel.app",
  provider: { organization: "BOB", url: "https://buildonbnbbob.vercel.app" },
  version: "1.0.0",
  capabilities: { streaming: false, pushNotifications: false },
  authentication: null,
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [
    {
      id: "bnb-tools",
      name: "BNB Chain Tools",
      description: "80+ MCP tools for BNB Chain: on-chain data, DeFi, token analytics, agent discovery",
    },
    {
      id: "agent-discovery",
      name: "Agent Discovery",
      description: "Find and communicate with AI agents on BNB Chain via A2A protocol",
    },
    {
      id: "learn",
      name: "Learn BNB AI",
      description: "Understand everything about AI agents, MCP, A2A on BNB Chain",
    },
  ],
};

const MCP_TOOLS = {
  "bnbchain-mcp": {
    name: "BNB Chain MCP (Official)",
    repo: "https://github.com/bnb-chain/bnbchain-mcp",
    tools: 44,
    categories: ["Blocks", "Transactions", "Tokens", "NFTs", "Contracts", "ERC-8004", "Greenfield Storage"],
    description: "Official multi-chain EVM interaction. BSC, opBNB, Greenfield, Ethereum, Base, Polygon, Arbitrum.",
  },
  "binance-mcp": {
    name: "Binance Exchange MCP",
    repo: "https://github.com/TermiX-official/binance-mcp",
    tools: 5,
    categories: ["Portfolio", "Order Books", "Trading", "TWAP"],
    description: "Binance CEX API for portfolio management, market data, and algorithmic trading.",
  },
  "heurist-mesh": {
    name: "Heurist Mesh MCP",
    repo: "https://github.com/heurist-network/heurist-mesh-mcp-server",
    tools: 20,
    categories: ["Trending Tokens", "Twitter Intel", "Funding Rates", "Wallet Analysis", "Web Search"],
    description: "30+ specialized crypto analytics agents. Trending tokens, Twitter sentiment, funding rates.",
  },
  "bsc-mcp": {
    name: "BSC MCP (DeFi)",
    repo: "https://github.com/TermiX-official/bsc-mcp",
    tools: 11,
    categories: ["PancakeSwap", "Token Security", "Meme Coins", "Liquidity", "Token Creation"],
    description: "BSC-specific DeFi: PancakeSwap swaps, GoPlus security checks, Four.Meme, liquidity management.",
  },
};

function agentCard() {
  return new Response(JSON.stringify(AGENT_CARD, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function agentRegistration() {
  const reg = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "BOB Build On BNB",
    description: "If you can't build you won't be rich. The BNB Chain AI Dashboard.",
    active: true,
    token: BOB_TOKEN,
    services: [
      { name: "A2A", version: "0.3.0", endpoint: "https://buildonbnbbob.vercel.app" },
      { name: "agentWallet", endpoint: `eip155:56:${WALLET}` },
      { name: "Web", endpoint: "https://buildonbnbbob.vercel.app" },
    ],
    registrations: AGENT_IDS.map((id) => ({
      agentId: id,
      agentRegistry: "eip155:56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
    })),
  };
  return new Response(JSON.stringify(reg, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function toolsApi() {
  return new Response(JSON.stringify(MCP_TOOLS, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function handleA2A(body: any) {
  // Basic A2A JSON-RPC handler
  const { method, id } = body;
  if (method === "agent/discover") {
    return jsonRpc(id, AGENT_CARD);
  }
  if (method === "message/send") {
    return jsonRpc(id, {
      status: "completed",
      artifacts: [{
        parts: [{ type: "text", text: "Hey! I'm BOB Build On BNB. Check out the dashboard at https://buildonbnbbob.vercel.app to explore 80+ BNB Chain AI tools." }],
      }],
    });
  }
  return jsonRpc(id, { error: `Unknown method: ${method}` });
}

function jsonRpc(id: any, result: any) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export default async function handler(req: Request) {
  const url = new URL(req.url, "https://buildonbnbbob.vercel.app");
  const path = url.pathname;

  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // A2A Agent Card
  if (path === "/.well-known/agent.json" || path === "/.well-known/agent-card.json") {
    return agentCard();
  }

  // ERC-8004 Registration
  if (path === "/.well-known/agent-registration.json") {
    return agentRegistration();
  }

  // API
  if (path === "/api/tools") return toolsApi();

  // A2A POST
  if (req.method === "POST" && (path === "/" || path.startsWith("/a2a"))) {
    try {
      const body = await req.json();
      return handleA2A(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
  }

  // Serve static files (handled by Vercel for public/)
  return new Response(null, { status: 404 });
}
