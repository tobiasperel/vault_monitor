// @ts-ignore - ignore missing type declarations
import { ponder } from "ponder:registry";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// Import the schema tables
// @ts-ignore - ignore missing type declarations
import { loan, loanEvent, rawEvent } from "../../ponder.schema";

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
    Teller: {
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

// Handler for Deposit events (track as loans)
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("Teller:Deposit", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    console.log('Teller:Deposit event received', event);
    
    const { receiver, depositAsset, depositAmount } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Create composite ID for loan
    const loanId = `${event.log.address.toLowerCase()}-${receiver.toLowerCase()}`;
    
    // Get existing loan data if it exists
    const existingLoan = await context.db.find(loan, { id: loanId });
    
    // Get current asset balance
    let collateralAmount = depositAmount;
    
    // Update or create loan record
    if (existingLoan && existingLoan.length > 0) {
      await context.db.update(loan).values({
        where: { id: loanId },
        data: {
          collateralAmount: BigInt(collateralAmount),
          lastUpdatedBlock: BigInt(blockNumber),
          lastUpdatedTimestamp: new Date(timestamp * 1000),
        },
      });
    } else {
      await context.db.insert(loan).values({
        id: loanId,
        borrowerAddress: receiver.toLowerCase(),
        borrowedAmount: BigInt(0), // No borrowed amount for deposits
        collateralAmount: BigInt(collateralAmount),
        healthFactor: BigInt(100), // Safe health factor for collateral only
        lastUpdatedBlock: BigInt(blockNumber),
        lastUpdatedTimestamp: new Date(timestamp * 1000),
      });
    }
    
    // Store loan event
    await context.db.insert(loanEvent).values({
      id: eventId,
      borrowerAddress: receiver.toLowerCase(),
      eventType: 'deposit',
      amount: BigInt(depositAmount),
      blockNumber: BigInt(blockNumber),
      timestamp: new Date(timestamp * 1000),
      transactionHash: event.transaction.hash,
      liquidatorAddress: '', // No liquidator for deposits
    });
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'Deposit',
      contract_address: event.log.address.toLowerCase(),
      user_address: receiver.toLowerCase(),
      amount: depositAmount.toString(),
      asset: depositAsset.toLowerCase(),
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // // Create deposit record
    // await context.db.insert(deposit, {
    //   id: eventId,
    //   txHash: event.transaction.hash,
    //   nonce: BigInt(event.transaction.nonce || 0),
    //   timestamp: timestamp,
    //   receiver: receiver.toLowerCase(),
    //   depositAsset: depositAsset.toLowerCase(),
    //   depositAmount: BigInt(depositAmount),
    //   shareAmount: BigInt(0), // No share amount for Teller deposits
    //   depositTimestamp: timestamp,
    //   shareLockPeriod: 0, // No lock period for Teller deposits
    //   refunded: false,
    // });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: event.log.address.toLowerCase(),
      eventName: 'Deposit',
      blockNumber: BigInt(blockNumber),
      logIndex: event.log.logIndex,
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });
    console.log('Teller:Deposit event processed');
  } catch (error) {
    console.error('Error processing Teller:Deposit event:', error);
  }
});

// Handler for BulkDeposit events
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("Teller:BulkDeposit", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    
    const { receiver, asset, amount } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Create composite ID for loan
    const loanId = `${event.log.address.toLowerCase()}-${receiver.toLowerCase()}`;
    
    // Get existing loan data if it exists
    const existingLoan = await context.db.find(loan, { id: loanId });
    
    // Update or create loan record
    if (existingLoan && existingLoan.length > 0) {
      await context.db.update(loan).values({
        where: { id: loanId },
        data: {
          collateralAmount: existingLoan[0].collateralAmount + BigInt(amount),
          lastUpdatedBlock: BigInt(blockNumber),
          lastUpdatedTimestamp: new Date(timestamp * 1000),
        },
      });
    } else {
      await context.db.insert(loan).values({
        id: loanId,
        borrowerAddress: receiver.toLowerCase(),
        borrowedAmount: BigInt(0), // No borrowed amount for deposits
        collateralAmount: BigInt(amount),
        healthFactor: BigInt(100), // Safe health factor for collateral only
        lastUpdatedBlock: BigInt(blockNumber),
        lastUpdatedTimestamp: new Date(timestamp * 1000),
      });
    }
    
    // Store loan event
    await context.db.insert(loanEvent).values({
      id: eventId,
      borrowerAddress: receiver.toLowerCase(),
      eventType: 'bulk_deposit',
      amount: BigInt(amount),
      blockNumber: BigInt(blockNumber),
      timestamp: new Date(timestamp * 1000),
      transactionHash: event.transaction.hash,
      liquidatorAddress: '', // No liquidator for deposits
    });
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'BulkDeposit',
      contract_address: event.log.address.toLowerCase(),
      user_address: receiver.toLowerCase(),
      amount: amount.toString(),
      asset: asset.toLowerCase(),
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: event.log.address.toLowerCase(),
      eventName: 'BulkDeposit',
      blockNumber: BigInt(blockNumber),
      logIndex: event.log.logIndex,
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });
    console.log('Teller:BulkDeposit event processed');
  } catch (error) {
    console.error('Error processing Teller:BulkDeposit event:', error);
  }
});

// Handler for BulkWithdraw events
// @ts-ignore - TypeScript type error with event handler signature
ponder.on("Teller:BulkWithdraw", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;
    
    const { receiver, asset, amount } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Create composite ID for loan
    const loanId = `${event.log.address.toLowerCase()}-${receiver.toLowerCase()}`;
    
    // Get existing loan data if it exists
    const existingLoan = await context.db.find(loan, { id: loanId });
    
    // Update loan record if it exists
    if (existingLoan && existingLoan.length > 0) {
      // Only reduce collateral if there's enough
      const newCollateral = existingLoan[0].collateralAmount >= BigInt(amount) 
        ? existingLoan[0].collateralAmount - BigInt(amount)
        : BigInt(0);
        
      await context.db.update(loan, {
        where: { id: loanId },
        data: {
          collateralAmount: newCollateral,
          lastUpdatedBlock: BigInt(blockNumber),
          lastUpdatedTimestamp: new Date(timestamp * 1000),
        },
      });
    }
    
    // Store loan event
    await context.db.insert(loanEvent).values({
      id: eventId,
      borrowerAddress: receiver.toLowerCase(),
      eventType: 'bulk_withdraw',
      amount: BigInt(amount),
      blockNumber: BigInt(blockNumber),
      timestamp: new Date(timestamp * 1000),
      transactionHash: event.transaction.hash,
      liquidatorAddress: '', // No liquidator for withdrawals
    });
    
    // Store raw event data in Supabase
    await safeSupabaseInsert('raw_events', {
      id: eventId,
      event_type: 'BulkWithdraw',
      contract_address: event.log.address.toLowerCase(),
      user_address: receiver.toLowerCase(),
      amount: amount.toString(),
      asset: asset.toLowerCase(),
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: serializeEvent(event),
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent).values({
      id: eventId,
      contractAddress: event.log.address.toLowerCase(),
      eventName: 'BulkWithdraw',
      blockNumber: BigInt(blockNumber),
      logIndex: event.log.logIndex,
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: serializeEvent(event),
    });
    console.log('Teller:BulkWithdraw event processed');
  } catch (error) {
    console.error('Error processing Teller:BulkWithdraw event:', error);
  }
}); 