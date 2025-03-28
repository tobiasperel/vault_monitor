#!/bin/bash

# # Kill any running Ponder processes
# pkill -f "ponder" || true

# Initial starting block
START_BLOCK=20000000  # Starting just after the failing range (19422983 to 19423033)

# Function to update .env.local with new start block
update_env_file() {
  echo "Updating start block to $START_BLOCK"
  
  cat > .env.temp << EOL
# Mainnet RPC URL used for fetching blockchain data
PONDER_RPC_URL_1="http://34.172.169.184:3001/evm"

# Postgres database URL for Ponder - pointing to Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:HjYeGV2Lyr9J4V3T@db.nctdcgedcpptlifinpky.supabase.co:5432/postgres?sslmode=require&pool_timeout=0"

# Base chain RPC
PONDER_RPC_URL_BASE="http://34.172.169.184:3001/evm"

# Contract addresses
BORING_VAULT_ADDRESS="0x208EeF7B7D1AcEa7ED4964d3C5b0c194aDf17412"
TELLER_ADDRESS="0xe8b75fB8208cC4d3054fE9793D9748fb3D34D450"
L1READ_ADDRESS="0x0000000000000000000000000000000000000800"
L1WRITE_ADDRESS="0x3333333333333333333333333333333333333333"
BORROWER_OPERATIONS_ADDRESS="0x7B4ed0DB4231D7763Ee257FFC1dA2770445bD8aC"
TROVE_MANAGER="0xA0691EF05cac8545574cd62F769FE8787538b0E5"

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
EOL

  mv .env.temp .env.local
}

# Create ponder.config.ts with optimized settings
create_config_file() {
  cat > ponder.config.ts << EOL
import { createConfig } from "ponder";
import { http } from "viem";
import fs from "fs";

// Import all ABIs from JSON files and ensure they're properly parsed
const BoringVaultAbi = JSON.parse(fs.readFileSync("./abis/BoringVault.json", "utf8"));
const TellerAbi = JSON.parse(fs.readFileSync("./abis/TellerWithMultiAssetSupport.json", "utf8"));
const TroveManagerAbi = JSON.parse(fs.readFileSync("./abis/ITroveEvents.json", "utf8"));
const AddRemoveManagerAbi = JSON.parse(fs.readFileSync("./abis/AddRemoveManager.json", "utf8"));

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
        console.log(\`RPC error detected: \${response?.error?.message}\`);
        
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
      address: process.env.BORING_VAULT_ADDRESS as \`0x\${string}\`,
      startBlock: getStartBlock('BORING_VAULT_START_BLOCK'),
    },
    Teller: {
      network: "hyperliquid",
      abi: ensureAbiArray(TellerAbi),
      address: process.env.TELLER_ADDRESS as \`0x\${string}\`,
      startBlock: getStartBlock('TELLER_START_BLOCK'),
    },
    TroveManager: {
      network: "hyperliquid",
      abi: ensureAbiArray(TroveManagerAbi),
      address: process.env.TROVE_MANAGER_ADDRESS as \`0x\${string}\`,
      startBlock: getStartBlock('TROVE_MANAGER_START_BLOCK'),
    },
    AddRemoveManager: {
      network: "hyperliquid",
      abi: ensureAbiArray(AddRemoveManagerAbi),
      address: process.env.BORROWER_OPERATIONS_ADDRESS as \`0x\${string}\`,
      startBlock: getStartBlock('ADD_REMOVE_MANAGER_START_BLOCK'),
    },
  },
  database: {
    kind: 'pglite',
    directory: '/Users/archev/Documents/GitHub/vault_monitor/db'
  }
});
EOL
}

# Main retry loop
while true; do
  echo "Starting Ponder from block $START_BLOCK"
  
  # Update environment file with current start block
  update_env_file
  
  # Create fresh config file
  create_config_file
  
  # Run Ponder and capture output to a temporary file
  NODE_ENV=development PORT=3001 API_PORT=42070 yarn dev 2>&1 | tee ponder_output.log &
  PID=$!
  
  # Wait a bit for Ponder to start
  sleep 5
  
  # Monitor for errors
  while true; do
    # Check if process is still running
    if ! ps -p $PID > /dev/null; then
      echo "Ponder process exited unexpectedly"
      break
    fi
    
    # Look for errors - try to extract fromBlock and toBlock in different ways
    if grep -q "Fatal error: Unable to sync" ponder_output.log; then
      echo "Found fatal sync error"
      
      # Try to extract block range from "Unable to sync 'hyperliquid' from X to Y"
      SYNC_ERROR=$(grep -o "Unable to sync 'hyperliquid' from [0-9]* to [0-9]*" ponder_output.log | tail -1)
      
      if [[ -n "$SYNC_ERROR" ]]; then
        TO_BLOCK=$(echo $SYNC_ERROR | grep -o "to [0-9]*" | grep -o "[0-9]*")
        
        if [[ -n "$TO_BLOCK" ]]; then
          NEW_START_BLOCK=$((TO_BLOCK + 1))
          echo "Extracted block range from sync error: $SYNC_ERROR"
          echo "Will restart from block $NEW_START_BLOCK"
          
          # Kill ponder process
          kill $PID
          wait $PID 2>/dev/null
          
          # Update start block for next iteration
          START_BLOCK=$NEW_START_BLOCK
          break
        fi
      fi
      
      # If we couldn't extract from sync error, try to get block range from RPC error
      BLOCK_RANGE=$(grep -o '"fromBlock":"0x[0-9a-f]*","toBlock":"0x[0-9a-f]*"' ponder_output.log | tail -1)
      if [[ -n "$BLOCK_RANGE" ]]; then
        TO_BLOCK_HEX=$(echo $BLOCK_RANGE | grep -o '"toBlock":"0x[0-9a-f]*"' | grep -o '0x[0-9a-f]*')
        
        if [[ -n "$TO_BLOCK_HEX" ]]; then
          TO_BLOCK_DEC=$(printf "%d" $TO_BLOCK_HEX)
          NEW_START_BLOCK=$((TO_BLOCK_DEC + 1))
          echo "Extracted block range from RPC error: $BLOCK_RANGE"
          echo "Will restart from block $NEW_START_BLOCK"
          
          # Kill ponder process
          kill $PID
          wait $PID 2>/dev/null
          
          # Update start block for next iteration
          START_BLOCK=$NEW_START_BLOCK
          break
        fi
      fi
      
      # If all extraction methods failed, just skip ahead 1000 blocks
      NEW_START_BLOCK=$((START_BLOCK + 20))
      echo "Could not extract block range, skipping ahead 20 blocks to $NEW_START_BLOCK"
      
      # Kill ponder process
      kill $PID
      wait $PID 2>/dev/null
      
      # Update start block for next iteration
      START_BLOCK=$NEW_START_BLOCK
      break
    fi
    
    # Check if sync is successful and progressing
    if grep -q "historical (100%)" ponder_output.log; then
      echo "Indexing completed successfully!"
      exit 0
    fi
    
    # Wait a bit before checking again
    sleep 5
  done
  
  # Clean up
  rm -f ponder_output.log
  
  # Wait a bit before restarting
  sleep 2
done 