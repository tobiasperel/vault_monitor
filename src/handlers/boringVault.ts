// @ts-ignore - ignore missing type declarations
import { ponder } from "ponder:registry";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// Import the schema tables
// @ts-ignore - ignore missing type declarations
import { vault, vaultUser, rawEvent, deposit, vaultEntity, vaultEventEntity, vaultUserEntity } from "../../ponder.schema";

// Initialize Supabase client if credentials are provided
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.log('Supabase credentials not provided, data will only be stored in Ponder DB');
}

// Helper function to safely serialize BigInt values
function serializeEvent(event: any): string {
  const serialized = JSON.stringify(event, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
  return serialized;
}

// Helper function to safely get event name
function getEventName(event: any): string {
  if (!event || !event.eventName) return '';
  return String(event.eventName);
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

// Helper function to update vault entity
async function updateVaultEntity(context: any, vaultAddress: string, event: any, eventType: string) {
  const existingVault = await context.db.find(vaultEntity, { id: vaultAddress });
  const timestamp = new Date(Number(event.block.timestamp));
  
  if (existingVault && existingVault.length > 0) {
    const vault = existingVault[0];
    await context.db.update(vaultEntity).values({
      where: { id: vaultAddress },
      data: {
        depositCount: eventType === 'deposit' ? vault.depositCount + 1 : vault.depositCount,
        withdrawCount: eventType === 'withdraw' ? vault.withdrawCount + 1 : vault.withdrawCount,
        lastEventTimestamp: timestamp,
        lastEventBlock: BigInt(event.block.number),
        lastEventType: eventType,
        lastEventAmount: BigInt(event.args.amount || 0),
        lastEventUser: event.args.from || event.args.to || '',
        totalAssets: vault.totalAssets + BigInt(event.args.amount || 0),
        totalShares: vault.totalShares + BigInt(event.args.shares || 0),
      },
    });
  } else {
    await context.db.insert(vaultEntity).values({
      id: vaultAddress,
      totalAssets: BigInt(event.args.amount || 0),
      totalShares: BigInt(event.args.shares || 0),
      depositCount: eventType === 'deposit' ? 1 : 0,
      withdrawCount: eventType === 'withdraw' ? 1 : 0,
      userCount: 1,
      lastEventTimestamp: timestamp,
      lastEventBlock: BigInt(event.block.number),
      lastEventType: eventType,
      lastEventAmount: BigInt(event.args.amount || 0),
      lastEventUser: event.args.from || event.args.to || '',
    });
  }
}

// Helper function to update vault user entity
async function updateVaultUserEntity(context: any, vaultAddress: string, userAddress: string, event: any, eventType: string) {
  const userId = `${vaultAddress}-${userAddress}`;
  const existingUser = await context.db.find(vaultUserEntity, { id: userId });
  const timestamp = new Date(Number(event.block.timestamp));
  
  if (existingUser && existingUser.length > 0) {
    const user = existingUser[0];
    await context.db.update(vaultUserEntity).values({
      where: { id: userId },
      data: {
        shares: BigInt(event.args.shares || 0),
        depositCount: eventType === 'deposit' ? user.depositCount + 1 : user.depositCount,
        withdrawCount: eventType === 'withdraw' ? user.withdrawCount + 1 : user.withdrawCount,
        lastActionTimestamp: timestamp,
        isActive: true,
      },
    });
  } else {
    await context.db.insert(vaultUserEntity).values({
      id: userId,
      vaultAddress: vaultAddress,
      userAddress: userAddress,
      shares: BigInt(event.args.shares || 0),
      depositCount: eventType === 'deposit' ? 1 : 0,
      withdrawCount: eventType === 'withdraw' ? 1 : 0,
      lastActionTimestamp: timestamp,
      unlockTime: new Date(0), // No lock time for BoringVault
      isActive: true,
    });
  }
}

// Handler for Enter events (deposits)
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("BoringVault:Enter", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    console.log('BoringVault:Enter event received', event);
    const { from, asset, amount, shares } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Safe handling for addresses
    const contractAddress = event.log.address.toLowerCase();
    const safeUserAddress = from && typeof from.toLowerCase === 'function' ? 
      from.toLowerCase() : String(from);
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'Deposit',
      contract_address: contractAddress,
      user_address: safeUserAddress,
      amount: amount ? amount.toString() : "0",
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Create deposit record
    await context.db.insert(deposit).values({
      id: eventId,
      txHash: event.transaction.hash,
      nonce: BigInt(event.transaction.nonce || 0),
      timestamp: timestamp,
      receiver: safeUserAddress,
      depositAsset: asset.toLowerCase(),
      depositAmount: BigInt(amount || 0),
      shareAmount: BigInt(shares || 0),
      depositTimestamp: timestamp,
      shareLockPeriod: 0, // No lock period for BoringVault deposits
      refunded: false,
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: contractAddress,
      eventName: 'Enter',
      blockNumber: BigInt(blockNumber),
      logIndex: Number(event.log.logIndex),
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp),
      data: serializeEvent(event),
    });

    // Store vault event
    await context.db.insert(vaultEventEntity).values({
      id: eventId,
      vaultAddress: contractAddress,
      eventType: 'deposit',
      amount: BigInt(amount || 0),
      shares: BigInt(shares || 0),
      user: safeUserAddress,
      blockNumber: BigInt(blockNumber),
      timestamp: new Date(timestamp),
      transactionHash: event.transaction.hash,
    });

    // Update vault entity
    await updateVaultEntity(context, contractAddress, event, 'deposit');

    // Update vault user entity
    await updateVaultUserEntity(context, contractAddress, safeUserAddress, event, 'deposit');
    
    console.log('BoringVault:Enter event processed');
  } catch (error) {
    console.error('Error processing BoringVault:Enter event:', error);
  }
});

// Handler for Exit events (withdrawals)
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("BoringVault:Exit", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    console.log('BoringVault:Exit event received', event);
    
    const { user, token, amount, shares } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Safe handling for addresses
    const contractAddress = event.log.address.toLowerCase();
    const safeUserAddress = user && typeof user.toLowerCase === 'function' ? 
      user.toLowerCase() : String(user);
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'Withdraw',
      contract_address: contractAddress,
      user_address: safeUserAddress,
      amount: amount ? amount.toString() : "0",
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: contractAddress,
      eventName: 'Exit',
      blockNumber: BigInt(blockNumber),
      logIndex: Number(event.log.logIndex),
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });

    // Store vault event
    await context.db.insert(vaultEventEntity).values({
      id: eventId,
      vaultAddress: contractAddress,
      eventType: 'withdraw',
      amount: BigInt(amount || 0),
      shares: BigInt(shares || 0),
      user: safeUserAddress,
      blockNumber: BigInt(blockNumber),
      timestamp: new Date(timestamp * 1000),
      transactionHash: event.transaction.hash,
    });

    // Update vault entity
    await updateVaultEntity(context, contractAddress, event, 'withdraw');

    // Update vault user entity
    await updateVaultUserEntity(context, contractAddress, safeUserAddress, event, 'withdraw');
    
    console.log('BoringVault:Exit event processed');
  } catch (error) {
    console.error('Error processing BoringVault:Exit event:', error);
  }
});

// Handler for Transfer events (tracks user shares)
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("BoringVault:Transfer", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    
    const { from, to, value } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Skip transfers that are not related to user shares
    if (from === '0x0000000000000000000000000000000000000000' || to === '0x0000000000000000000000000000000000000000') {
      // These are minting or burning events, not direct transfers between users
      return;
    }
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Safe handling for addresses
    const contractAddress = event.log.address.toLowerCase();
    const safeFromAddress = from && typeof from.toLowerCase === 'function' ? 
      from.toLowerCase() : String(from);
    const safeToAddress = to && typeof to.toLowerCase === 'function' ? 
      to.toLowerCase() : String(to);
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'Transfer',
      contract_address: contractAddress,
      from_address: safeFromAddress,
      to_address: safeToAddress,
      amount: value ? value.toString() : "0",
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: contractAddress,
      eventName: 'Transfer',
      blockNumber: BigInt(blockNumber),
      logIndex: Number(event.log.logIndex),
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });

    // Store vault event
    await context.db.insert(vaultEventEntity).values({
      id: eventId,
      vaultAddress: contractAddress,
      eventType: 'transfer',
      amount: BigInt(value || 0),
      shares: BigInt(value || 0),
      user: safeFromAddress,
      blockNumber: BigInt(blockNumber),
      timestamp: new Date(timestamp * 1000),
      transactionHash: event.transaction.hash,
    });

    // Update vault entity
    await updateVaultEntity(context, contractAddress, event, 'transfer');

    // Update vault user entities for both from and to addresses
    await updateVaultUserEntity(context, contractAddress, safeFromAddress, event, 'transfer');
    await updateVaultUserEntity(context, contractAddress, safeToAddress, event, 'transfer');
    
    console.log('BoringVault:Transfer event processed');
  } catch (error) {
    console.error('Error processing BoringVault:Transfer event:', error);
  }
}); 