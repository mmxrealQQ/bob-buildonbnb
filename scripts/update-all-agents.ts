/**
 * Update ALL 6 BOB agents on ERC-8004 to unified "BOB Build On BNB" metadata.
 *
 * 1. Build unified metadata JSON
 * 2. Upload to IPFS via Pinata
 * 3. Call setAgentURI for all 6 agent IDs on-chain
 */

import "dotenv/config";
import { ethers } from "ethers";

const AGENT_IDS = [36035, 36336, 37092, 37093, 37103, 40908];
const REGISTRY = "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432";
const BSC_RPC = "https://bsc-dataseed.binance.org";
const WALLET_ADDR = "0x8b18575c29F842BdA93EEb1Db9F2198D5CC0Ba2f";
const BOB_TOKEN = "0x51363F073b1E4920fdA7AA9E9d84BA97EdE1560e";

const REGISTRY_ABI = [
  "function setAgentURI(uint256 agentId, string uri) external",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
];

function log(msg: string) {
  console.log(`[${new Date().toLocaleTimeString("de-DE")}] ${msg}`);
}

function buildMetadata(agentId: number) {
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "BOB Build On BNB",
    description: "If you can't build you won't be rich. The BNB Chain AI Dashboard — test 116+ MCP tools, explore agents, learn everything about AI on BNB Chain. No wallet, no API key, no setup needed.",
    image: "https://raw.githubusercontent.com/mmxrealQQ/bob-assets/main/bob.jpg",
    active: true,
    version: "1.1.0",
    role: "builder",
    token: BOB_TOKEN,
    services: [
      {
        name: "agentWallet",
        endpoint: `eip155:56:${WALLET_ADDR}`,
      },
      {
        name: "A2A",
        version: "0.3.0",
        endpoint: "https://bobbuildonbnb.vercel.app/api/a2a",
        agentCard: "https://bobbuildonbnb.vercel.app/.well-known/agent-card.json",
      },
      {
        name: "MCP",
        version: "1.0.0",
        endpoint: "https://bobbuildonbnb.vercel.app",
        description: "116+ BNB Chain tools from 4 MCP servers",
      },
      {
        name: "Web",
        endpoint: "https://bobbuildonbnb.vercel.app",
      },
    ],
    registrations: [
      {
        agentId,
        agentRegistry: `eip155:56:${REGISTRY}`,
      },
    ],
    supportedTrust: ["reputation", "crypto-economic"],
    updatedAt: Math.floor(Date.now() / 1000),
  };
}

async function uploadToIPFS(metadata: object): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not set");

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: "BOB-Build-On-BNB-agent-metadata" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { IpfsHash: string };
  return `ipfs://${data.IpfsHash}`;
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    log("No PRIVATE_KEY — aborting");
    return;
  }

  const provider = new ethers.JsonRpcProvider(BSC_RPC, 56);
  const wallet = new ethers.Wallet(privateKey, provider);
  const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, wallet);

  log(`Wallet: ${wallet.address}`);

  // Verify ownership of all agents first
  log("Checking ownership of all 6 agents...");
  for (const id of AGENT_IDS) {
    const owner = await registry.ownerOf(id);
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      log(`ERROR: Wallet does not own agent #${id} (owner: ${owner})`);
      return;
    }
  }
  log("All 6 agents owned by this wallet ✓");

  // Upload metadata for each agent (each has its own agentId in registrations)
  // We upload one shared metadata and update the registrations field per agent
  const results: { id: number; ipfsUri: string }[] = [];

  for (const id of AGENT_IDS) {
    const metadata = buildMetadata(id);
    log(`Uploading metadata for agent #${id} to IPFS...`);
    const ipfsUri = await uploadToIPFS(metadata);
    log(`Agent #${id} → ${ipfsUri}`);
    results.push({ id, ipfsUri });
  }

  // Update all on-chain
  log("\nUpdating all agents on-chain...");
  for (const { id, ipfsUri } of results) {
    log(`Setting URI for agent #${id}...`);
    const tx = await registry.setAgentURI(id, ipfsUri);
    log(`TX: ${tx.hash}`);
    const receipt = await tx.wait();
    log(`Agent #${id} updated ✓ (block ${receipt?.blockNumber}, gas ${receipt?.gasUsed})`);
  }

  log("\n=== ALL 6 AGENTS UPDATED TO 'BOB Build On BNB' ===");
  log("8004scan.io will re-index within ~15 minutes.");
}

main().catch((e) => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
