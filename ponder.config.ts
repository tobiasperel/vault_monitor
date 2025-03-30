import { createConfig } from "ponder";
import { http } from "viem";
import fs from "fs";

// Import all ABIs from JSON files and ensure they're properly parsed
const BoringVaultAbi = JSON.parse(fs.readFileSync("./abis/BoringVault.json", "utf8"));
const TellerAbi = JSON.parse(fs.readFileSync("./abis/TellerWithMultiAssetSupport.json", "utf8"));
const TroveManagerAbi = JSON.parse(fs.readFileSync("./abis/ITroveEvents.json", "utf8"));
const AddRemoveManagersAbi = JSON.parse(fs.readFileSync("./abis/AddRemoveManagers.json", "utf8"));
const L1ReadAbi = JSON.parse(fs.readFileSync("./abis/L1Read.json", "utf8"));

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
  // Always use the specified start block from env vars
  const startBlock = Number(process.env[envVarName] || "0");
  return startBlock;
};

const createOptimizedTransport = (url: string) => {
  return http(url, {
    batch: {
      batchSize: 5,          // Process one request at a time
      wait: 500,            // Wait longer between batches
    },
    timeout: 10000,          // 5s timeout
    retryCount: 0,           // No retries - better to fail fast and let our script handle it
    
    // Handle responses to detect missing blocks
    onFetchResponse: (response: any) => {
      // If there's any error, return empty results
      if (response?.error) {
        console.log(`RPC error detected: ${response?.error?.message}`);
        
        // Return empty logs instead of error to prevent hanging
        return { 
          id: response.id,
          jsonrpc: '2.0',
          result: [] 
        };
      }
      return response;
    },
    
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
    TroveManager: {
      network: "hyperliquid",
      abi: ensureAbiArray(TroveManagerAbi),
      address: process.env.TROVE_MANAGER_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('TROVE_MANAGER_START_BLOCK'),
    },
    AddRemoveManagers: {
      network: "hyperliquid",
      abi: ensureAbiArray(AddRemoveManagersAbi),
      address: process.env.BORROWER_OPERATIONS_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('BORROWER_OPERATIONS_START_BLOCK'),
    },
  },
  blocks: {
    L1Read: {
      network: "hyperliquid",
      startBlock: getStartBlock('L1READ_START_BLOCK'),
      interval: 6000
    },
  },
  accounts: {
    feBTCBoringVault: {
      network: "hyperliquid",
      address: process.env.BORING_VAULT_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('BORING_VAULT_START_BLOCK'),
    },
  },
  database: {
    kind: 'pglite',
    directory: '/Users/archev/Documents/GitHub/vault_monitor/db'
  }
});
