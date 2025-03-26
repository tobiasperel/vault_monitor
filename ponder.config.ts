import { createConfig } from "ponder";
import { http } from "viem";
import fs from "fs";

// Import all ABIs from JSON files and ensure they're properly parsed
const BoringVaultAbi = JSON.parse(fs.readFileSync("./abis/BoringVault.json", "utf8"));
const TellerAbi = JSON.parse(fs.readFileSync("./abis/TellerWithMultiAssetSupport.json", "utf8"));

// Make sure all ABIs are arrays
const ensureAbiArray = (abi: any) => {
  if (!Array.isArray(abi)) {
    // If the ABI is an object with an 'abi' property (common format)
    if (abi && typeof abi === 'object' && Array.isArray(abi.abi)) {
      return abi.abi;
    }
    console.warn('ABI is not an array, returning empty array to prevent errors');
    return [];
  }
  return abi;
};

// For development, use a smaller block range to avoid rate limits
const isDev = process.env.NODE_ENV !== 'production';
const getStartBlock = (envVarName: string) => {
  const startBlock = Number(process.env[envVarName] || "0");
  // In development, only index from the dev start block to reduce RPC calls
  if (isDev) {
    const devStartBlock = process.env.DEV_START_BLOCK ? 
      Number(process.env.DEV_START_BLOCK) : 
      20028000;
      
    // Use a safe number to avoid Infinity
    return Math.max(startBlock, devStartBlock);
  }
  return startBlock;
};

// Create an optimized transport with retries and timeout configuration
const createOptimizedTransport = (url: string) => {
  return http(url, {
    batch: {
      batchSize: 100,          // Start with moderate batch size
      wait: 100,               // Small wait between batches
    },
    timeout: 30000,            // 30s timeout
    retryCount: 3,             // 3 retries
    retryDelay: 1000,          // 1s between retries
    fetchOptions: {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  });
};

export default createConfig({
  networks: {
    hyperliquid: {
      chainId: 998, 
      transport: createOptimizedTransport(process.env.PONDER_RPC_URL_BASE || ""),
    },
  },
  contracts: {
    BoringVault: {
      network: "hyperliquid",
      abi: ensureAbiArray(BoringVaultAbi),
      address: process.env.BORING_VAULT_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('BORING_VAULT_START_BLOCK'),
    },
    Teller: {
      network: "hyperliquid",
      abi: ensureAbiArray(TellerAbi),
      address: process.env.TELLER_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('TELLER_START_BLOCK'),
    },
  },
  database: isDev ? {
    kind: 'pglite',
    directory: 'ponder-db'
  } : {
    kind: 'postgres',
    connectionString: process.env.DATABASE_URL + '?sslmode=require',
  }
});
