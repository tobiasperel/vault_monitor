// @ts-ignore - ignore missing type declarations
import { ponder } from "ponder:registry";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// Import the schema tables
// @ts-ignore - ignore missing type declarations
import { vault, vaultUser, rawEvent } from "../../ponder.schema";

// Initialize Supabase client if credentials are provided
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.log('Supabase credentials not provided, data will only be stored in Ponder DB');
}

// Function to safely insert to Supabase (only if client is initialized)
async function safeSupabaseInsert(table: string, data: any) {
  if (supabase) {
    try {
      await supabase.from(table).insert(data);
    } catch (error) {
      console.error(`Error inserting into Supabase table ${table}:`, error);
    }
  }
}

// Define event context types
interface PonderContext {
  db: any;
  contracts: {
    BoringVault: {
      instance: any;
    }
  };
}

interface PonderEvent {
  args: any;
  block: {
    timestamp: string | number;
    number: string | number;
  };
  transaction: {
    hash: string;
  };
  log: {
    logIndex: string | number;
  };
  address: string;
}

// Handler for Enter events (deposits)
ponder.on("BoringVault:Enter", async ({ event, context }: { event: PonderEvent, context: PonderContext }) => {
  try {
    const { user, token, amount, shares } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Get vault data from the contract
    const totalSupply = await context.contracts.BoringVault.instance.totalSupply();
    const totalAssets = await context.contracts.BoringVault.instance.totalAssets();
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Get current vault state
    const vaultRecord = await context.db.findUnique(vault, {
      where: { id: event.address.toLowerCase() },
    });
    
    // Update vault state
    if (vaultRecord) {
      await context.db.update(vault, {
        where: { id: event.address.toLowerCase() },
        data: {
          totalAssets: vaultRecord.totalAssets + BigInt(amount),
          lastUpdatedBlock: BigInt(blockNumber),
          lastUpdatedTimestamp: new Date(timestamp * 1000),
        },
      });
    } else {
      // Create vault record if it doesn't exist
      await context.db.insert(vault, {
        id: event.address.toLowerCase(),
        totalAssets: BigInt(amount),
        totalShares: BigInt(0), // Will update when we get the shares info
        lastUpdatedBlock: BigInt(blockNumber),
        lastUpdatedTimestamp: new Date(timestamp * 1000),
      });
    }
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'Deposit',
      contract_address: event.address.toLowerCase(),
      user_address: user.toLowerCase(),
      amount: amount.toString(),
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: event,
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent, {
      id: eventId,
      contractAddress: event.address.toLowerCase(),
      eventName: 'Enter',
      blockNumber: BigInt(blockNumber),
      logIndex: event.log.logIndex,
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: event,
    });
  } catch (error) {
    console.error('Error processing BoringVault:Enter event:', error);
  }
});

// Handler for Exit events (withdrawals)
ponder.on("BoringVault:Exit", async ({ event, context }: { event: PonderEvent, context: PonderContext }) => {
  try {
    const { user, token, amount, shares } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Get updated vault data from the contract
    const totalSupply = await context.contracts.BoringVault.instance.totalSupply();
    const totalAssets = await context.contracts.BoringVault.instance.totalAssets();
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Get current vault state
    const vaultRecord = await context.db.findUnique(vault, {
      where: { id: event.address.toLowerCase() },
    });
    
    // Update vault state
    if (vaultRecord) {
      await context.db.update(vault, {
        where: { id: event.address.toLowerCase() },
        data: {
          totalAssets: vaultRecord.totalAssets - BigInt(amount),
          lastUpdatedBlock: BigInt(blockNumber),
          lastUpdatedTimestamp: new Date(timestamp * 1000),
        },
      });
    }
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'Withdraw',
      contract_address: event.address.toLowerCase(),
      user_address: user.toLowerCase(),
      amount: amount.toString(),
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: event,
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent, {
      id: eventId,
      contractAddress: event.address.toLowerCase(),
      eventName: 'Exit',
      blockNumber: BigInt(blockNumber),
      logIndex: event.log.logIndex,
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: event,
    });
  } catch (error) {
    console.error('Error processing BoringVault:Exit event:', error);
  }
});

// Handler for Transfer events (tracks user shares)
ponder.on("BoringVault:Transfer", async ({ event, context }: { event: PonderEvent, context: PonderContext }) => {
  try {
    const { from, to, value } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Skip transfers that are not related to user shares
    if (from === '0x0000000000000000000000000000000000000000' || to === '0x0000000000000000000000000000000000000000') {
      // These are minting or burning events, not direct transfers between users
      return;
    }
    
    // Get vault data from the contract
    const totalSupply = await context.contracts.BoringVault.instance.totalSupply();
    const totalAssets = await context.contracts.BoringVault.instance.totalAssets();
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Create composite ID for vaultUser (for the recipient)
    const toVaultUserId = `${event.address.toLowerCase()}-${to.toLowerCase()}`;
    
    // Check if recipient vault user record exists
    const existingToVaultUser = await context.db.findUnique(vaultUser, {
      where: { id: toVaultUserId },
    });
    
    // Update shares for 'to' address (the recipient)
    const toUserShares = await context.contracts.BoringVault.instance.balanceOf(to);
    
    // Try to get unlock time - this function may not exist in all vault contracts
    let unlockTime = 0;
    try {
      unlockTime = await context.contracts.BoringVault.instance.getUnlockTime(to);
    } catch (error) {
      console.log('getUnlockTime function not available, using current time');
      unlockTime = Math.floor(Date.now() / 1000);
    }
    
    if (existingToVaultUser) {
      // Update existing record
      await context.db.update(vaultUser, {
        where: { id: toVaultUserId },
        data: {
          shares: BigInt(toUserShares),
          unlockTime: new Date(Number(unlockTime) * 1000),
          lastUpdatedBlock: BigInt(blockNumber),
        },
      });
    } else {
      // Create new record
      await context.db.insert(vaultUser, {
        id: toVaultUserId,
        userAddress: to.toLowerCase(),
        vaultAddress: event.address.toLowerCase(),
        shares: BigInt(toUserShares),
        unlockTime: new Date(Number(unlockTime) * 1000),
        lastUpdatedBlock: BigInt(blockNumber),
      });
    }
    
    // Do the same for the 'from' address (the sender)
    const fromVaultUserId = `${event.address.toLowerCase()}-${from.toLowerCase()}`;
    const existingFromVaultUser = await context.db.findUnique(vaultUser, {
      where: { id: fromVaultUserId },
    });
    
    const fromUserShares = await context.contracts.BoringVault.instance.balanceOf(from);
    
    // Try to get unlock time for the sender
    let fromUnlockTime = 0;
    try {
      fromUnlockTime = await context.contracts.BoringVault.instance.getUnlockTime(from);
    } catch (error) {
      console.log('getUnlockTime function not available for sender, using current time');
      fromUnlockTime = Math.floor(Date.now() / 1000);
    }
    
    if (existingFromVaultUser) {
      // Update existing record
      await context.db.update(vaultUser, {
        where: { id: fromVaultUserId },
        data: {
          shares: BigInt(fromUserShares),
          unlockTime: new Date(Number(fromUnlockTime) * 1000),
          lastUpdatedBlock: BigInt(blockNumber),
        },
      });
    }
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'Transfer',
      contract_address: event.address.toLowerCase(),
      from_address: from.toLowerCase(),
      to_address: to.toLowerCase(),
      amount: value.toString(),
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: event,
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent, {
      id: eventId,
      contractAddress: event.address.toLowerCase(),
      eventName: 'Transfer',
      blockNumber: BigInt(blockNumber),
      logIndex: event.log.logIndex,
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: event,
    });
  } catch (error) {
    console.error('Error processing BoringVault:Transfer event:', error);
  }
}); 