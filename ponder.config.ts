import { createConfig } from "ponder";
import { http, Transport } from "viem";
import fs from "fs";

// Import all ABIs from JSON files and ensure they're properly parsed
const BoringVaultAbi = JSON.parse(fs.readFileSync("./abis/BoringVault.json", "utf8"));
const TellerAbi = JSON.parse(fs.readFileSync("./abis/TellerWithMultiAssetSupport.json", "utf8"));
const TroveManagerAbi = JSON.parse(fs.readFileSync("./abis/ITroveEvents.json", "utf8"));
const AddRemoveManagersAbi = JSON.parse(fs.readFileSync("./abis/AddRemoveManagers.json", "utf8"));
const L1WriteAbi = JSON.parse(fs.readFileSync("./abis/L1Write.json", "utf8"));
const ERC20Abi = JSON.parse(fs.readFileSync("./abis/ERC20.json", "utf8"));

// Ensure ABI format
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

// Get start block from environment
const getStartBlock = (envVarName: string) => {
  return Number(process.env[envVarName] || "0");
};

// Reintroduce the optimized transport with onFetchResponse
const createOptimizedTransport = (url: string): Transport => {
  return http(url, {
    batch: {
      batchSize: 1,          // Process one request at a time
      wait: 500,            // Wait longer between batches
    },
    timeout: 10000,
    retryCount: 0,
    onFetchResponse: async (response: Response) => {
      const requestId = Math.floor(Math.random() * 10000);
      let responseData: any = null;
      let treatAsError = false;
      let errorReason = "";
      try {
        const clonedResponse = response.clone();
        const responseBodyText = await clonedResponse.text();
        if (!response.ok) {
          treatAsError = true;
          errorReason = `HTTP error ${response.status}`;
          console.warn(`[${requestId}] RPC ${errorReason}: ${response.statusText}. Body: ${responseBodyText.substring(0, 200)}`);
        } else {
          try { responseData = JSON.parse(responseBodyText); } catch (parseError: any) {
            treatAsError = true; errorReason = "JSON parse error";
            console.warn(`[${requestId}] RPC ${errorReason}: ${parseError.message}. Body: ${responseBodyText.substring(0, 200)}`);
          }
          if (responseData && responseData.error) {
            treatAsError = true; const responseError = responseData.error; errorReason = `JSON-RPC error ${responseError.code}`;
            // Updated check to include "invalid block range"
            if (responseError.code === -32000 || responseError.message?.includes("requested block number is after latest") || responseError.message?.includes("block not found") || responseError.message?.includes("invalid block range")) {
              console.warn(`[${requestId}] RPC ${errorReason} (Known issue, masking): ${JSON.stringify(responseError)}`);
            } else { console.error(`[${requestId}] RPC ${errorReason} (Unexpected): ${JSON.stringify(responseError)}`); }
          }
        }
      } catch (e: any) { treatAsError = true; errorReason = "Response processing exception"; console.error(`[${requestId}] Error processing RPC response: ${e.message}`); }
      if (treatAsError) {
        const emptySuccessBody = JSON.stringify({ jsonrpc: '2.0', id: responseData?.id ?? null, result: [] });
        return new Response(emptySuccessBody, { status: 200, headers: { 'Content-Type': 'application/json' } });
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
    HLP: {
      network: "hyperliquid",
      abi: ensureAbiArray(L1WriteAbi),
      address: process.env.L1WRITE_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('L1WRITE_START_BLOCK'),
      filter: [{
        event: 'VaultTransfer',
        args: {
          user: process.env.BORING_VAULT_ADDRESS as `0x${string}`,
          vault: process.env.HLP_VAULT_ADDRESS as `0x${string}`,
        },
      },
      {
        event: 'UsdClassTransfer',
        args: {
          user: process.env.BORING_VAULT_ADDRESS as `0x${string}`,
        },
      },
      {
        event: 'SpotSend',
        args: {
          user: process.env.BORING_VAULT_ADDRESS as `0x${string}`,
        },
      },
    ]},
    USDC: {
      network: "hyperliquid",
      abi: ensureAbiArray(ERC20Abi),
      address: process.env.USDC_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('L1READ_START_BLOCK'),
      filter: [{
        event: 'Transfer',
        args: {
          from: process.env.BORING_VAULT_ADDRESS as `0x${string}`,
          to: process.env.HLP_VAULT_ADDRESS as `0x${string}`,
        },
      }],
    },
  },
  blocks: {
    L1Read: {
      network: "hyperliquid",
      startBlock: getStartBlock('L1READ_START_BLOCK'),
      interval: 10000
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
    directory: './db'
  }
});
