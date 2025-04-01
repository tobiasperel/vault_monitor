#!/usr/bin/env node
// src/handlers/l1ReadIntervalHandler.ts
// @ts-ignore - ignore missing type declarations
import { ponder } from "ponder:registry";
// @ts-ignore - ignore missing type declarations
import { hyperliquidTransfer, vaultEquity, vaultSpotBalance } from "../../ponder.schema"; // Import schemas
// Import the ABI
import fs from "fs";
const L1ReadAbi = JSON.parse(fs.readFileSync("./abis/L1Read.json", "utf8"));
// Import viem utils for manual encoding/decoding
import { encodeAbiParameters, decodeAbiParameters, parseAbiParameters, Hex } from 'viem';
// Import Drizzle functions for filtering
import { eq, and } from 'drizzle-orm';

// Define the type for your context if needed (Ponder might infer this)
interface L1ReadUpdateContext {
  db: any; // Ponder DB client
  client: any; // Add client to the context type
  contracts: {
    //    L1Read: { // Provided because L1Read is in ponder.config.ts contracts
    //      read: any; // Use the read-only proxy for calls
    //    }
  };
  network: { name: string; chainId: number; };
}

// Use a more general type for the args to satisfy the ponder.on signature,
// then use type assertions internally where needed.
// @ts-ignore - ignore missing type declarations
ponder.on("L1Read:block", async (args: any) => {
  // Assert types for block and context internally for better type safety within the function
  const block = args.event.block as any; // Or a more specific block type if available
  const context = args.context as L1ReadUpdateContext; // Use our defined context type

  const blockNumber = block.number;
  const timestamp = block.timestamp;

  console.log(`Running L1ReadUserDataUpdate interval handler at block ${blockNumber}`);

  // --- Get Addresses --- 
  const vaultAddress = process.env.BORING_VAULT_ADDRESS;
  const vaultEquityPrecompileAddress = process.env.VAULT_EQUITY_PRECOMPILE_ADDRESS as `0x${string}` | undefined;
  const withdrawablePrecompileAddress = process.env.WITHDRAWABLE_PRECOMPILE_ADDRESS as `0x${string}` | undefined;
  const spotBalancePrecompileAddress = process.env.SPOT_BALANCE_PRECOMPILE_ADDRESS as `0x${string}` | undefined;
  const hlpVaultAddress = process.env.HLP_VAULT_ADDRESS as `0x${string}` | undefined;

  if (!vaultAddress) {
    console.error("BORING_VAULT_ADDRESS not found in environment variables. Skipping vault equity update.");
    return;
  }

  if (!vaultEquityPrecompileAddress) {
    console.error("VAULT_EQUITY_PRECOMPILE_ADDRESS not found in environment variables. Skipping vault equity update.");
    return;
  }

  if (!withdrawablePrecompileAddress) {
    console.error("WITHDRAWABLE_PRECOMPILE_ADDRESS not found in environment variables. Skipping vault equity update.");
    return;
  }

  if (!spotBalancePrecompileAddress) {
    console.error("SPOT_BALANCE_PRECOMPILE_ADDRESS not found in environment variables. Skipping vault equity update.");
    return;
  }

  if (!hlpVaultAddress) {
    console.error("HLP_VAULT_ADDRESS not found in environment variables. Skipping vault equity update.");
    return;
  }

  try {
    console.log(`Updating equity for vault: ${vaultAddress}`);

    // --- Manually construct selectorless call data --- 
    const userVaultEquityData = encodeAbiParameters(
      parseAbiParameters('address user, address vault'),
      [vaultAddress as Hex, hlpVaultAddress as Hex]
    );
    const withdrawableData = encodeAbiParameters(
      parseAbiParameters('address user'),
      [vaultAddress as Hex]
    );
    const spotBalanceData = encodeAbiParameters(
      parseAbiParameters('address user, uint64 token'),
      [vaultAddress as Hex, 0n] // Assuming token ID 0
    );

    // --- Make selectorless calls using context.client.call --- 
    const [equityCallResult, withdrawableCallResult, spotBalanceCallResult] = await Promise.all([
      context.client.call({
        to: vaultEquityPrecompileAddress,
        data: userVaultEquityData
      }),
      context.client.call({
        to: withdrawablePrecompileAddress,
        data: withdrawableData
      }),
      context.client.call({
        to: spotBalancePrecompileAddress,
        data: spotBalanceData
      })
    ]);

    // --- Decode results --- 
    // Note: Define the output structure precisely for decoding
    const [equityResult] = decodeAbiParameters(
      parseAbiParameters('(uint64 equity)'), 
      equityCallResult?.data ?? '0x'
    ) as [{ equity: bigint }];
    const [withdrawableResult] = decodeAbiParameters(
      parseAbiParameters('(uint64 withdrawable)'), 
      withdrawableCallResult?.data ?? '0x'
    ) as [{ withdrawable: bigint }];
    const [spotBalanceResult] = decodeAbiParameters(
      parseAbiParameters('(uint64 total, uint64 hold, uint64 entryNtl)'),
      spotBalanceCallResult?.data ?? '0x'
    ) as [{ total: bigint, hold: bigint, entryNtl: bigint }];

    // --- Process and Store results --- 
    // Ensure results are valid BigInts or handle potential errors/formats
    // Access nested properties based on ABI output structure
    const equity = BigInt(equityResult?.equity ?? 0n);
    const withdrawableAmount = BigInt(withdrawableResult?.withdrawable ?? 0n);

    const spotTotal = BigInt(spotBalanceResult?.total ?? 0n);
    const spotHold = BigInt(spotBalanceResult?.hold ?? 0n);
    const spotEntryNtl = BigInt(spotBalanceResult?.entryNtl ?? 0n);
    const spotTokenId = 0; // Hardcoded for now

    // --- Always Insert for History --- 

    // Create new ID for each entry based on vault and block number
    const vaultEquityId = `${vaultAddress.toLowerCase()}-${blockNumber}`;
    
    // Insert with raw timestamp as BigInt
    await context.db.insert(vaultEquity).values({
        id: vaultEquityId,
        vaultAddress: vaultAddress.toLowerCase(),
        equity: equity,
        withdrawableAmount: withdrawableAmount,
        lastBlockNumber: BigInt(blockNumber),
        lastTimestamp: BigInt(timestamp), // Store as raw BigInt
      });
    console.log(`Inserted vaultEquity history ${equity} for ${vaultAddress} at block ${blockNumber}`);

    // Create new ID for spot balance based on vault, token, and block number
    const spotBalanceId = `${vaultAddress.toLowerCase()}-${spotTokenId}-${blockNumber}`;
    
    // Insert with raw timestamp as BigInt
    await context.db.insert(vaultSpotBalance).values({
        id: spotBalanceId,
        vaultAddress: vaultAddress.toLowerCase(),
        token: spotTokenId,
        total: spotTotal,
        hold: spotHold,
        entryNtl: spotEntryNtl,
        lastBlockNumber: BigInt(blockNumber),
        lastTimestamp: BigInt(timestamp), // Store as raw BigInt
      });
    console.log(`Inserted vaultSpotBalance history for ${vaultAddress}, token ${spotTokenId} at block ${blockNumber}`);

  } catch (error) {
    console.error(`Error fetching/storing equity for vault ${vaultAddress} at block ${blockNumber}:`, error);
  }
  console.log(`Finished L1Read interval handler for block ${blockNumber}`);
}); 