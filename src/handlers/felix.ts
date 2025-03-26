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

// Handler for Deposit events (track as loans)
ponder.on("Teller:Deposit", async ({ event, context }: { event: PonderEvent, context: PonderContext }) => {
  try {
    const { receiver, depositAsset, depositAmount } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Create composite ID for loan
    const loanId = `${event.address.toLowerCase()}-${receiver.toLowerCase()}`;
    
    // Get existing loan data if it exists
    const existingLoan = await context.db.findUnique(loan, {
      where: { id: loanId },
    });
    
    // Get current asset balance
    let collateralAmount = depositAmount;
    
    // Update or create loan record
    if (existingLoan) {
      await context.db.update(loan, {
        where: { id: loanId },
        data: {
          collateralAmount: BigInt(collateralAmount),
          lastUpdatedBlock: BigInt(blockNumber),
          lastUpdatedTimestamp: new Date(timestamp * 1000),
        },
      });
    } else {
      await context.db.insert(loan, {
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
    await context.db.insert(loanEvent, {
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
      contract_address: event.address.toLowerCase(),
      user_address: receiver.toLowerCase(),
      amount: depositAmount.toString(),
      asset: depositAsset.toLowerCase(),
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: event,
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent, {
      id: eventId,
      contractAddress: event.address.toLowerCase(),
      eventName: 'Deposit',
      blockNumber: BigInt(blockNumber),
      logIndex: event.log.logIndex,
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: event,
    });
  } catch (error) {
    console.error('Error processing Teller:Deposit event:', error);
  }
});

// Handler for BulkDeposit events
ponder.on("Teller:BulkDeposit", async ({ event, context }: { event: PonderEvent, context: PonderContext }) => {
  try {
    const { receiver, asset, amount } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Create composite ID for loan
    const loanId = `${event.address.toLowerCase()}-${receiver.toLowerCase()}`;
    
    // Get existing loan data if it exists
    const existingLoan = await context.db.findUnique(loan, {
      where: { id: loanId },
    });
    
    // Update or create loan record
    if (existingLoan) {
      await context.db.update(loan, {
        where: { id: loanId },
        data: {
          collateralAmount: existingLoan.collateralAmount + BigInt(amount),
          lastUpdatedBlock: BigInt(blockNumber),
          lastUpdatedTimestamp: new Date(timestamp * 1000),
        },
      });
    } else {
      await context.db.insert(loan, {
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
    await context.db.insert(loanEvent, {
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
      contract_address: event.address.toLowerCase(),
      user_address: receiver.toLowerCase(),
      amount: amount.toString(),
      asset: asset.toLowerCase(),
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: event,
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent, {
      id: eventId,
      contractAddress: event.address.toLowerCase(),
      eventName: 'BulkDeposit',
      blockNumber: BigInt(blockNumber),
      logIndex: event.log.logIndex,
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: event,
    });
  } catch (error) {
    console.error('Error processing Teller:BulkDeposit event:', error);
  }
});

// Handler for BulkWithdraw events
ponder.on("Teller:BulkWithdraw", async ({ event, context }: { event: PonderEvent, context: PonderContext }) => {
  try {
    const { receiver, asset, amount } = event.args;
    const timestamp = Number(event.block.timestamp);
    const blockNumber = Number(event.block.number);
    
    // Generate unique event ID
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    
    // Create composite ID for loan
    const loanId = `${event.address.toLowerCase()}-${receiver.toLowerCase()}`;
    
    // Get existing loan data if it exists
    const existingLoan = await context.db.findUnique(loan, {
      where: { id: loanId },
    });
    
    // Update loan record if it exists
    if (existingLoan) {
      // Only reduce collateral if there's enough
      const newCollateral = existingLoan.collateralAmount >= BigInt(amount) 
        ? existingLoan.collateralAmount - BigInt(amount)
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
    await context.db.insert(loanEvent, {
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
      contract_address: event.address.toLowerCase(),
      user_address: receiver.toLowerCase(),
      amount: amount.toString(),
      asset: asset.toLowerCase(),
      block_number: blockNumber,
      transaction_hash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000).toISOString(),
      payload: event,
    });
    
    // Also store in Ponder's raw_event table
    await context.db.insert(rawEvent, {
      id: eventId,
      contractAddress: event.address.toLowerCase(),
      eventName: 'BulkWithdraw',
      blockNumber: BigInt(blockNumber),
      logIndex: event.log.logIndex,
      transactionHash: event.transaction.hash,
      timestamp: new Date(timestamp * 1000),
      data: event,
    });
  } catch (error) {
    console.error('Error processing Teller:BulkWithdraw event:', error);
  }
}); 