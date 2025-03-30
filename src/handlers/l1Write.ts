// @ts-ignore - ignore missing type declarations
import { ponder } from "ponder:registry";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// Import ONLY the hlpVaultEvent schema table
// @ts-ignore - ignore missing type declarations
import { hlpVaultEvent } from "../../ponder.schema";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// // @ts-ignore - ignore missing type declarations
// ponder.on("HLP:IocOrder", async (params: any) => {
//   try {
//     const { event, context } = params;
//     if (!event.args) return;
    
//     const { user, perp, isBuy, limitPx, sz } = event.args;
    
//   } catch (error) {
//     console.error('Error processing IocOrder:', error);
//   }
// });

// @ts-ignore - ignore missing type declarations
ponder.on("HLP:VaultTransfer", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;

    const { user, vault, isDeposit, usd } = event.args;
    const { db } = context; // Get db from context

    const eventType = isDeposit ? 'vault-deposit' : 'vault-withdraw';

    // --- Supabase Logging (Optional - kept as is) ---
    await supabase.from('hlp_vault_event').insert({
      id: `${event.transaction.hash}-${event.log.logIndex}-${eventType}`,
      eventType: eventType,
      amount: usd.toString(),
      user: user.toLowerCase(),
      vault: vault.toLowerCase(),
      blockNumber: event.block.number.toString(),
      timestamp: new Date(Number(event.block.timestamp) * 1000),
      transactionHash: event.transaction.hash,
    });
    // --- End Supabase Logging ---

    // --- Update Ponder DB Insert to use hlpVaultEvent schema --- 
    await db.insert(hlpVaultEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}-${eventType}`,
      eventType: eventType,
      amount: usd, // Store as BigInt (matches schema)
      user: user, // Store original address
      vault: vault, // Store original address
      blockNumber: event.block.number, // Pass BigInt directly
      timestamp: event.block.timestamp, // Pass BigInt directly
      transactionHash: event.transaction.hash,
    });
    // --- End Ponder DB Insert ---

    console.log(`HLP:VaultTransfer processed into hlpVaultEvent: ${user} -> ${eventType} ${usd}`);
  } catch (error) {
    console.error('Error processing HLP:VaultTransfer for hlpVaultEvent:', error);
  }
});

// // @ts-ignore - ignore missing type declarations
// ponder.on("HLP:TokenDelegate", async (params: any) => {
//   try {
//     const { event, context } = params;
//     if (!event.args) return;
    
//     const { user, validator, wei, isUndelegate } = event.args;
//   } catch (error) {
//     console.error('Error processing TokenDelegate:', error);
//   }
// });

// // @ts-ignore - ignore missing type declarations
// ponder.on("HLP:CDeposit", async (params: any) => {
//   try {
//     const { event, context } = params;
//     if (!event.args) return;
    
//     const { user, wei } = event.args;
//   } catch (error) {
//     console.error('Error processing CDeposit:', error);
//   }
// });

// // @ts-ignore - ignore missing type declarations
// ponder.on("HLP:CWithdrawal", async (params: any) => {
//   try {
//     const { event, context } = params;
//     if (!event.args) return;
    
//     const { user, wei } = event.args;
//   } catch (error) {
//     console.error('Error processing CWithdrawal:', error);
//   }
// });

// @ts-ignore - ignore missing type declarations
ponder.on("HLP:SpotSend", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;

    const { user, destination, token, wei } = event.args; // Keep original arg name `wei`
    const { db } = context; // Get db from context

    // --- Keep the logic to only process transfers TO the specific Boring Vault address ---
    if (destination.toLowerCase() === process.env.BORING_VAULT_ADDRESS?.toLowerCase()) {
      const eventType = 'l1-withdrawal'; // More specific event type

      // --- Supabase Logging (Optional - kept as is) ---
      await supabase.from('hlp_vault_event').insert({
        id: `${event.transaction.hash}-${event.log.logIndex}-${eventType}`,
        eventType: eventType,
        amount: wei.toString(),
        user: user.toLowerCase(),
        vault: destination.toLowerCase(),
        blockNumber: event.block.number.toString(),
        timestamp: new Date(Number(event.block.timestamp) * 1000),
        transactionHash: event.transaction.hash,
      });
      // --- End Supabase Logging ---

      // --- Update Ponder DB Insert to use hlpVaultEvent schema ---
      await db.insert(hlpVaultEvent).values({
        id: `${event.transaction.hash}-${event.log.logIndex}-${eventType}`,
        eventType: eventType,
        amount: wei, // Store as BigInt (matches schema), use original arg `wei`
        user: user,
        vault: destination,
        blockNumber: event.block.number, // Pass BigInt directly
        timestamp: event.block.timestamp, // Pass BigInt directly
        transactionHash: event.transaction.hash,
      });
      // --- End Ponder DB Insert ---

      console.log(`HLP:SpotSend (to Vault) processed into hlpVaultEvent: ${user} sent ${wei} to ${destination}`);
    } else {
       console.log(`HLP:SpotSend skipped (destination was not BORING_VAULT_ADDRESS): ${destination}`);
    }
  } catch (error) {
    console.error('Error processing HLP:SpotSend for hlpVaultEvent:', error);
  }
});

// @ts-ignore - ignore missing type declarations
ponder.on("HLP:UsdClassTransfer", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;

    const { user, ntl, toPerp } = event.args;
    const { db } = context; // Get db from context

    const eventType = toPerp ? 'perp-transfer' : 'spot-transfer';
    const targetVault = process.env.HLP_VAULT_ADDRESS || '0xUnknownHLPVault'; // Use env var or placeholder

    // --- Supabase Logging (Optional - kept as is) ---
    await supabase.from('hlp_vault_event').insert({
      id: `${event.transaction.hash}-${event.log.logIndex}-${eventType}`,
      eventType: eventType,
      amount: ntl.toString(),
      user: user.toLowerCase(),
      vault: targetVault.toLowerCase(),
      blockNumber: event.block.number.toString(),
      timestamp: new Date(Number(event.block.timestamp) * 1000),
      transactionHash: event.transaction.hash,  
    });
    // --- End Supabase Logging ---

    // --- Update Ponder DB Insert to use hlpVaultEvent schema ---
    await db.insert(hlpVaultEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}-${eventType}`,
      eventType: eventType,
      amount: ntl, // Store as BigInt (matches schema)
      user: user,
      vault: targetVault,
      blockNumber: event.block.number, // Pass BigInt directly
      timestamp: event.block.timestamp, // Pass BigInt directly
      transactionHash: event.transaction.hash,
    });
    // --- End Ponder DB Insert ---

    console.log(`HLP:UsdClassTransfer processed into hlpVaultEvent: ${user} -> ${eventType} ${ntl}`);
  } catch (error) {
    console.error('Error processing HLP:UsdClassTransfer for hlpVaultEvent:', error);
  }
});

// Remove the USDC:Transfer handler as it's not part of L1Write
// ponder.on("USDC:Transfer", ...);

// Re-adding the USDC:Transfer handler as requested
// @ts-ignore - ignore missing type declarations
ponder.on("USDC:Transfer", async (params: any) => {
  try {
    const { event, context } = params;
    if (!event.args) return;

    const { from, to, value } = event.args;
    const { db } = context; // Get db from context

    // --- Only process transfers FROM the Boring Vault address ---
    // Note: This logic assumes deposits TO the L1 bridge involve a transfer FROM the Boring Vault
    // Adjust this condition if the deposit mechanism is different.
    if (from.toLowerCase() === process.env.BORING_VAULT_ADDRESS?.toLowerCase()) {
        const eventType = 'l1-deposit'; // Or a more specific name if known

        // --- Supabase Logging (Optional - kept structure) ---
        await supabase.from('hlp_vault_event').insert({
            id: `${event.transaction.hash}-${event.log.logIndex}-${eventType}`,
            eventType: eventType,
            amount: value.toString(),
            user: from.toLowerCase(), // User is the sender (the vault)
            vault: to.toLowerCase(), // Vault here might represent the destination (L1 Bridge?)
            blockNumber: event.block.number.toString(),
            timestamp: new Date(Number(event.block.timestamp) * 1000),
            transactionHash: event.transaction.hash,
        });
        // --- End Supabase Logging ---

        // --- Ponder DB Insert into hlpVaultEvent ---
        await db.insert(hlpVaultEvent).values({
            id: `${event.transaction.hash}-${event.log.logIndex}-${eventType}`,
            eventType: eventType,
            amount: value, 
            user: from, // Store original sender address
            vault: to, // Store original destination address
            blockNumber: event.block.number, // Pass BigInt directly
            timestamp: event.block.timestamp, // Pass BigInt directly
            transactionHash: event.transaction.hash,
        });
        // --- End Ponder DB Insert ---

        console.log(`USDC:Transfer (from Vault) processed into hlpVaultEvent: ${from} sent ${value} to ${to}`);
    } else {
        // Optionally log skipped transfers if needed for debugging
        // console.log(`USDC:Transfer skipped (sender was not BORING_VAULT_ADDRESS): ${from}`);
    }
  } catch (error) {
    console.error('Error processing USDC:Transfer for hlpVaultEvent:', error);
  }
});