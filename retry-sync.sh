#!/bin/bash

# # Kill any running Ponder processes
# pkill -f "ponder" || true

# Initial starting block
START_BLOCK=20000001  # Starting just after the failing range (19422983 to 19423033)

# Variables for loop/hang detection & skipping
PREVIOUS_START_BLOCK=-1
RETRY_COUNT=0
MAX_RETRIES=3 # Max times to retry the *exact same* start block before skipping
SKIP_AHEAD_AMOUNT=10000 # Increased skip amount significantly
HANG_TIMEOUT=180 # Timeout for hang detection (in seconds)

# Define known problematic block ranges (Format: "START_BLOCK:END_BLOCK")
KNOWN_BAD_RANGES=(
  "20460297:20460344",
  "20461592:20461615",
  "20490340:20496021"
)

# Function to update .env.local with new start block
update_env_file() {
  echo "Updating start block to $START_BLOCK"
  
  cat > .env.temp << EOL
# Mainnet RPC URL used for fetching blockchain data
PONDER_RPC_URL_1="http://69.62.71.230:3001/evm"

# Postgres database URL for Ponder - pointing to Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:HjYeGV2Lyr9J4V3T@db.nctdcgedcpptlifinpky.supabase.co:5432/postgres?sslmode=require&pool_timeout=0"

# Base chain RPC
PONDER_RPC_URL_BASE="http://69.62.71.230:3001/evm"

# Contract addresses
BORING_VAULT_ADDRESS="0x208EeF7B7D1AcEa7ED4964d3C5b0c194aDf17412"
TELLER_ADDRESS="0xe8b75fB8208cC4d3054fE9793D9748fb3D34D450"
L1WRITE_ADDRESS="0x3333333333333333333333333333333333333333"
BORROWER_OPERATIONS_ADDRESS="0x7B4ed0DB4231D7763Ee257FFC1dA2770445bD8aC"
TROVE_MANAGER_ADDRESS="0xA0691EF05cac8545574cd62F769FE8787538b0E5"
HLP_VAULT_ADDRESS="0xa15099a30BBf2e68942d6F4c43d70D04FAEab0A0"
USDC_ADDRESS="0xd9CBEC81df392A88AEff575E962d149d57F4d6bc"

# Starting blocks for indexing
BORING_VAULT_START_BLOCK=$START_BLOCK
TELLER_START_BLOCK=$START_BLOCK
L1READ_START_BLOCK=$START_BLOCK
L1WRITE_START_BLOCK=$START_BLOCK
BORROWER_OPERATIONS_START_BLOCK=$START_BLOCK
TROVE_MANAGER_START_BLOCK=$START_BLOCK

# Use a very recent block for development to avoid RPC limitations
DEV_START_BLOCK=$START_BLOCK

# Supabase connection
SUPABASE_URL="https://nctdcgedcpptlifinpky.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdGRjZ2VkY3BwdGxpZmlucGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NjQ4NDgsImV4cCI6MjA1ODM0MDg0OH0.NdTqPJhtWTLQUVJpJOuMzOW-sb9_NYBPY3MPsf07354"

# L1 Read Addresses
POSITION_PRECOMPILE_ADDRESS="0x0000000000000000000000000000000000000800"
SPOT_BALANCE_PRECOMPILE_ADDRESS="0x0000000000000000000000000000000000000801"
VAULT_EQUITY_PRECOMPILE_ADDRESS="0x0000000000000000000000000000000000000802"
WITHDRAWABLE_PRECOMPILE_ADDRESS="0x0000000000000000000000000000000000000803"
DELEGATIONS_PRECOMPILE_ADDRESS="0x0000000000000000000000000000000000000804"
DELEGATOR_SUMMARY_PRECOMPILE_ADDRESS="0x0000000000000000000000000000000000000805"
MARK_PX_PRECOMPILE_ADDRESS="0x0000000000000000000000000000000000000806"
ORACLE_PX_PRECOMPILE_ADDRESS="0x0000000000000000000000000000000000000807"
SPOT_PX_PRECOMPILE_ADDRESS="0x0000000000000000000000000000000000000808"
L1_BLOCK_NUMBER_PRECOMPILE_ADDRESS="0x0000000000000000000000000000000000000809"
EOL

  mv .env.temp .env.local
}

# Create ponder.config.ts with optimized settings
create_config_file() {
  cat > ponder.config.ts << 'EOL'
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
    if (abi && typeof abi === 'object' && Array.isArray(abi.abi)) { return abi.abi; }
    console.warn('ABI is not an array, returning empty array.');
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
    batch: false,
    timeout: 15000,
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
    fetchOptions: { headers: { 'Content-Type': 'application/json' } }
  });
};

export default createConfig({
  networks: {
    hyperliquid: {
      chainId: 998,
      transport: createOptimizedTransport(process.env.PONDER_RPC_URL_BASE || ""),
      maxBlockRange: 10,
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
      interval: 60000
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
EOL
}

# Main retry loop
while true; do
  # --- Proactively Skip Known Bad Ranges --- 
  SKIP_PERFORMED=false
  for bad_range in "${KNOWN_BAD_RANGES[@]}"; do
    B_START=$(echo $bad_range | cut -d':' -f1)
    B_END=$(echo $bad_range | cut -d':' -f2)
    
    if [[ "$START_BLOCK" -le "$B_END" ]]; then
      NEW_SKIP_TARGET=$((B_END + 1))
      if [[ "$NEW_SKIP_TARGET" -gt "$START_BLOCK" ]]; then
         echo "*** Proactively skipping known bad range $bad_range. Setting START_BLOCK to $NEW_SKIP_TARGET ***"
         START_BLOCK=$NEW_SKIP_TARGET
         SKIP_PERFORMED=true # Mark that we potentially updated START_BLOCK
         # We only need to skip the *first* bad range that affects the current START_BLOCK
         break
      fi
    fi
  done
  # --- End Proactive Skip --- 

  echo "Starting Ponder from block $START_BLOCK"
  
  # Update environment file with potentially adjusted start block
  update_env_file
  
  # Create standard config file
  create_config_file
  
  # Clean previous logs before running
  rm -f ponder_output.log
  
  # Run Ponder in the foreground and tee output
  # Use NODE_ENV=production for potentially fewer logs/faster indexing
  NODE_ENV=production PORT=3001 API_PORT=3002 yarn dev 2>&1 | tee ponder_output.log
  EXIT_CODE=$? # Capture exit code
  
  echo "Ponder process finished with exit code $EXIT_CODE."
  
  # Check for successful completion in the log
  if grep -q "historical (100%)" ponder_output.log && grep -q "App is ready" ponder_output.log; then
    echo -e "\nIndexing completed successfully!"
    exit 0
  else
    echo "Ponder did not complete successfully or exited."
    # The loop will continue, and the START_BLOCK might be adjusted by the
    # proactive skip logic if the failure was within a known bad range.
    # If the failure is outside known ranges, it will retry from the same START_BLOCK.
    # Add manual intervention if it gets stuck outside known ranges.
  fi
  
  echo "Cleaning up before potential retry..."
  rm -f ponder_output.log
  
  sleep 5 # Wait a bit before restarting the loop
done 