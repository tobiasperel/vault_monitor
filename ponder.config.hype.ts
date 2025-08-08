import { createConfig } from "ponder";
import { http, Transport } from "viem";
import fs from "fs";

// Import ABIs - you'll need to add HYPE-specific ABIs
const BoringVaultAbi = JSON.parse(fs.readFileSync("./abis/BoringVault.json", "utf8"));
const TellerAbi = JSON.parse(fs.readFileSync("./abis/TellerWithMultiAssetSupport.json", "utf8"));
const ERC20Abi = JSON.parse(fs.readFileSync("./abis/ERC20.json", "utf8"));

// You'll need to add these ABIs for HYPE vault monitoring:
// - stHYPE token ABI
// - HYPE staking contract ABI  
// - Lending protocol ABI (Aave, Compound, etc.)
// - Strategy manager ABI

const ensureAbiArray = (abi: any) => {
  if (!Array.isArray(abi)) {
    if (abi && typeof abi === 'object' && Array.isArray(abi.abi)) {
      return abi.abi;
    }
    console.warn('ABI is not an array, returning empty array to prevent errors');
    return [];
  }
  return abi;
};

const getStartBlock = (envVarName: string) => {
  return Number(process.env[envVarName] || "0");
};

const createOptimizedTransport = (url: string): Transport => {
  return http(url, {
    batch: {
      batchSize: 1,
      wait: 500,
    },
    timeout: 10000,
    retryCount: 3,
    onFetchResponse: async (response: Response) => {
      if (!response.ok) {
        console.warn(`RPC error ${response.status}: ${response.statusText}`);
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
    // Update this to match the network where your HYPE vault is deployed
    mainnet: {
      chainId: 1, // Change to appropriate chain ID
      transport: createOptimizedTransport(process.env.PONDER_RPC_URL_BASE || ""),
    },
  },
  contracts: {
    // HYPE Vault contract
    HypeVault: {
      network: "mainnet",
      abi: ensureAbiArray(BoringVaultAbi),
      address: process.env.HYPE_VAULT_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('HYPE_VAULT_START_BLOCK'),
    },
    
    // HYPE token contract
    HypeToken: {
      network: "mainnet", 
      abi: ensureAbiArray(ERC20Abi),
      address: process.env.HYPE_TOKEN_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('HYPE_START_BLOCK'),
      filter: [
        // Track transfers to/from vault
        {
          event: 'Transfer',
          args: {
            from: process.env.HYPE_VAULT_ADDRESS as `0x${string}`,
          },
        },
        {
          event: 'Transfer', 
          args: {
            to: process.env.HYPE_VAULT_ADDRESS as `0x${string}`,
          },
        }
      ]
    },

    // stHYPE token contract
    StHypeToken: {
      network: "mainnet",
      abi: ensureAbiArray(ERC20Abi),
      address: process.env.STHYPE_TOKEN_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('STHYPE_START_BLOCK'),
      filter: [
        // Track stHYPE transfers for vault
        {
          event: 'Transfer',
          args: {
            from: process.env.HYPE_VAULT_ADDRESS as `0x${string}`,
          },
        },
        {
          event: 'Transfer',
          args: {
            to: process.env.HYPE_VAULT_ADDRESS as `0x${string}`,
          },
        }
      ]
    },

    // Teller contract for deposits/withdrawals
    Teller: {
      network: "mainnet",
      abi: ensureAbiArray(TellerAbi),
      address: process.env.TELLER_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('TELLER_START_BLOCK'),
    },

    // Add lending protocol contract
    LendingProtocol: {
      network: "mainnet",
      abi: [], // Add appropriate lending protocol ABI
      address: process.env.LENDING_PROTOCOL_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('LENDING_PROTOCOL_START_BLOCK'),
    },

    // Add staking contract
    StakingContract: {
      network: "mainnet", 
      abi: [], // Add staking contract ABI
      address: process.env.STAKING_CONTRACT_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('STAKING_CONTRACT_START_BLOCK'),
    }
  },

  // Track key accounts
  accounts: {
    hypeVault: {
      network: "mainnet",
      address: process.env.HYPE_VAULT_ADDRESS as `0x${string}`,
      startBlock: getStartBlock('HYPE_VAULT_START_BLOCK'),
    },
  },

  // Block intervals for periodic data fetching
  blocks: {
    priceUpdate: {
      network: "mainnet",
      startBlock: getStartBlock('HYPE_VAULT_START_BLOCK'),
      interval: 100, // Check every 100 blocks (~20 minutes on Ethereum)
    },
    riskCheck: {
      network: "mainnet", 
      startBlock: getStartBlock('HYPE_VAULT_START_BLOCK'),
      interval: 50, // Check every 50 blocks (~10 minutes)
    }
  },

  database: {
    kind: 'pglite',
    directory: './db'
  }
});
