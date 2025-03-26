// @ts-ignore - ignore missing type declarations
import { ponder } from "ponder:registry";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// Import the schema tables
// @ts-ignore - ignore missing type declarations
import { vault, depositWithdrawal, yield as yieldTable, rawEvent } from "../../ponder.schema";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define event context types
interface PonderContext {
  db: any;
  contracts: {
    L1Read: {
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

// Since L1Read ABI doesn't have any events defined, we can't listen for events
// Instead, we'll create some utility functions to fetch data from the contract directly

// Function to fetch user data
export async function fetchUserData(userAddress: string, context: any) {
  try {
    // Call the contract to get user data
    const userSchedule = await context.contracts.L1Read.instance.getUserSchedule(userAddress);
    const [depositAmount, unlockTime, yieldAccrued] = userSchedule;
    
    // Check if user record exists
    const existingUser = await context.db.findUnique(vault, {
      where: { id: userAddress.toLowerCase() },
    });
    
    const timestamp = Math.floor(Date.now() / 1000);
    
    if (existingUser) {
      // Update existing record
      await context.db.update(vault, {
        where: { id: userAddress.toLowerCase() },
        data: {
          depositAmount: BigInt(depositAmount),
          unlockTime: new Date(Number(unlockTime) * 1000),
          yieldAccrued: BigInt(yieldAccrued),
          lastUpdatedTimestamp: new Date(timestamp * 1000),
        },
      });
    } else {
      // Create new record
      await context.db.insert(vault, {
        id: userAddress.toLowerCase(),
        userAddress: userAddress.toLowerCase(),
        depositAmount: BigInt(depositAmount),
        unlockTime: new Date(Number(unlockTime) * 1000),
        yieldAccrued: BigInt(yieldAccrued),
        lastUpdatedBlock: BigInt(0),
        lastUpdatedTimestamp: new Date(timestamp * 1000),
      });
    }
    
    return {
      depositAmount,
      unlockTime,
      yieldAccrued
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

// Function to fetch contract state
export async function fetchContractState(context: any) {
  try {
    // Call contract to get total supply and assets
    const totalSupply = await context.contracts.L1Read.instance.totalSupply();
    const totalAssets = await context.contracts.L1Read.instance.totalAssets();
    
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Store in Supabase for monitoring
    await supabase.from('contract_state').insert({
      id: `l1read-${timestamp}`,
      contract_address: context.contracts.L1Read.address.toLowerCase(),
      total_supply: totalSupply.toString(),
      total_assets: totalAssets.toString(),
      timestamp: new Date(timestamp * 1000).toISOString(),
    });
    
    return {
      totalSupply,
      totalAssets
    };
  } catch (error) {
    console.error('Error fetching contract state:', error);
    return null;
  }
} 