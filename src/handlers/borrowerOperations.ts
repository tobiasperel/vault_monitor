// This file has been removed as it's not needed for the current contracts 

// @ts-ignore - ignore missing type declarations
import { ponder } from "ponder:registry";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// Import the schema tables
// @ts-ignore - ignore missing type declarations
import { trove, troveEvent, rawEvent } from "../../ponder.schema";

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

// Handler for TroveOperation events
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("TroveManager:TroveOperation", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Safe handling for addresses
    const contractAddress = event.log.address.toLowerCase();
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'TroveOperation',
      contract_address: contractAddress,
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: contractAddress,
      eventName: 'TroveOperation',
      blockNumber: BigInt(blockNumber),
      logIndex: Number(event.log.logIndex),
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });
    console.log('TroveManager:TroveOperation event processed');
  } catch (error) {
    console.error('Error processing TroveManager:TroveOperation event:', error);
  }
});

// Handler for TroveUpdated events
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("TroveManager:TroveUpdated", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Safe handling for addresses
    const contractAddress = event.log.address.toLowerCase();
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'TroveUpdated',
      contract_address: contractAddress,
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: contractAddress,
      eventName: 'TroveUpdated',
      blockNumber: BigInt(blockNumber),
      logIndex: Number(event.log.logIndex),
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });
    console.log('TroveManager:TroveUpdated event processed');
  } catch (error) {
    console.error('Error processing TroveManager:TroveUpdated event:', error);
  }
});

// Handler for BatchUpdated events
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("TroveManager:BatchUpdated", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Safe handling for addresses
    const contractAddress = event.log.address.toLowerCase();
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'BatchUpdated',
      contract_address: contractAddress,
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: contractAddress,
      eventName: 'BatchUpdated',
      blockNumber: BigInt(blockNumber),
      logIndex: Number(event.log.logIndex),
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });
    console.log('TroveManager:BatchUpdated event processed');
  } catch (error) {
    console.error('Error processing TroveManager:BatchUpdated event:', error);
  }
});

// Handler for BatchedTroveUpdated events
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("TroveManager:BatchedTroveUpdated", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Safe handling for addresses
    const contractAddress = event.log.address.toLowerCase();
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'BatchedTroveUpdated',
      contract_address: contractAddress,
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: contractAddress,
      eventName: 'BatchedTroveUpdated',
      blockNumber: BigInt(blockNumber),
      logIndex: Number(event.log.logIndex),
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });
    console.log('TroveManager:BatchedTroveUpdated event processed');
  } catch (error) {
    console.error('Error processing TroveManager:BatchedTroveUpdated event:', error);
  }
});

// Handler for Liquidation events
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("TroveManager:Liquidation", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Safe handling for addresses
    const contractAddress = event.log.address.toLowerCase();
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'Liquidation',
      contract_address: contractAddress,
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: contractAddress,
      eventName: 'Liquidation',
      blockNumber: BigInt(blockNumber),
      logIndex: Number(event.log.logIndex),
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });
    console.log('TroveManager:Liquidation event processed');
  } catch (error) {
    console.error('Error processing TroveManager:Liquidation event:', error);
  }
});

// Handler for Redemption events
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("TroveManager:Redemption", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Safe handling for addresses
    const contractAddress = event.log.address.toLowerCase();
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'Redemption',
      contract_address: contractAddress,
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: contractAddress,
      eventName: 'Redemption',
      blockNumber: BigInt(blockNumber),
      logIndex: Number(event.log.logIndex),
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });
    console.log('TroveManager:Redemption event processed');
  } catch (error) {
    console.error('Error processing TroveManager:Redemption event:', error);
  }
});

// Handler for RedemptionFeePaidToTrove events
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("TroveManager:RedemptionFeePaidToTrove", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Safe handling for addresses
    const contractAddress = event.log.address.toLowerCase();
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'RedemptionFeePaidToTrove',
      contract_address: contractAddress,
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: contractAddress,
      eventName: 'RedemptionFeePaidToTrove',
      blockNumber: BigInt(blockNumber),
      logIndex: Number(event.log.logIndex),
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });
    console.log('TroveManager:RedemptionFeePaidToTrove event processed');
  } catch (error) {
    console.error('Error processing TroveManager:RedemptionFeePaidToTrove event:', error);
  }
}); 