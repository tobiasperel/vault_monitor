import { ponder } from "ponder:registry";
import {
  hypeVaultPosition,
  hypeUserPosition,
  vaultDeposit,
  vaultWithdrawal,
  loopExecution,
  stakingRewards,
  leverageRiskMetrics,
  emergencyAlert,
  rawEvent,
} from "../../ponder.schema.hype.js";

// Handler for HYPE vault deposits
ponder.on("HypeVault:Deposit", async ({ event, context }) => {
  const { client } = context;
  const { args, log, block } = event;

  // Extract deposit information
  const { nonce, receiver, depositAsset, depositAmount, shareAmount, depositTimestamp, shareLockPeriod } = args;

  // Create deposit record
  await context.db.insert(vaultDeposit).values({
    id: `${log.transactionHash}-${log.logIndex}`,
    vaultAddress: log.address,
    userAddress: receiver,
    txHash: log.transactionHash,
    blockNumber: BigInt(block.number),
    timestamp: BigInt(block.timestamp),
    hypeAmount: depositAmount,
    sharesReceived: shareAmount,
    sharePrice: Number(depositAmount) / Number(shareAmount),
    totalSupplyAfter: 0n, // Will be updated by separate call
  });

  // Update or create user position
  const userId = `${log.address}-${receiver}`;
  const existingUser = await context.db.find(hypeUserPosition, { id: userId });

  if (existingUser) {
    await context.db.update(hypeUserPosition, { id: userId }).set({
      shares: existingUser.shares + shareAmount,
      depositedAmount: existingUser.depositedAmount + depositAmount,
      lastUpdatedBlock: BigInt(block.number),
      lastUpdatedTimestamp: BigInt(block.timestamp),
    });
  } else {
    await context.db.insert(hypeUserPosition).values({
      id: userId,
      vaultAddress: log.address,
      userAddress: receiver,
      shares: shareAmount,
      shareValue: depositAmount,
      proportionOfVault: 0, // Will be calculated in risk aggregator
      depositedAmount: depositAmount,
      currentValue: depositAmount,
      unrealizedPnL: 0n,
      lastUpdatedBlock: BigInt(block.number),
      lastUpdatedTimestamp: BigInt(block.timestamp),
    });
  }

  // Store raw event for debugging
  await context.db.insert(rawEvent).values({
    id: `${log.transactionHash}-${log.logIndex}`,
    contractAddress: log.address,
    eventName: "Deposit",
    blockNumber: BigInt(block.number),
    logIndex: log.logIndex,
    transactionHash: log.transactionHash,
    timestamp: BigInt(block.timestamp),
    data: args,
  });
});

// Handler for HYPE vault withdrawals
ponder.on("HypeVault:Withdraw", async ({ event, context }) => {
  const { args, log, block } = event;
  const { nonce, receiver, assets, shares } = args;

  // Create withdrawal record
  await context.db.insert(vaultWithdrawal).values({
    id: `${log.transactionHash}-${log.logIndex}`,
    vaultAddress: log.address,
    userAddress: receiver,
    txHash: log.transactionHash,
    blockNumber: BigInt(block.number),
    timestamp: BigInt(block.timestamp),
    sharesBurned: shares,
    hypeReceived: assets,
    sharePrice: Number(assets) / Number(shares),
    withdrawalFee: 0n, // Add if vault charges fees
    totalSupplyAfter: 0n, // Will be updated by separate call
  });

  // Update user position
  const userId = `${log.address}-${receiver}`;
  const existingUser = await context.db.find(hypeUserPosition, { id: userId });

  if (existingUser && existingUser.shares >= shares) {
    const remainingShares = existingUser.shares - shares;
    
    if (remainingShares === 0n) {
      // User has fully withdrawn, remove position
      await context.db.delete(hypeUserPosition, { id: userId });
    } else {
      // Update remaining position
      await context.db.update(hypeUserPosition, { id: userId }).set({
        shares: remainingShares,
        lastUpdatedBlock: BigInt(block.number),
        lastUpdatedTimestamp: BigInt(block.timestamp),
      });
    }
  }

  // Store raw event
  await context.db.insert(rawEvent).values({
    id: `${log.transactionHash}-${log.logIndex}`,
    contractAddress: log.address,
    eventName: "Withdraw",
    blockNumber: BigInt(block.number),
    logIndex: log.logIndex,
    transactionHash: log.transactionHash,
    timestamp: BigInt(block.timestamp),
    data: args,
  });
});

// Handler for strategy executions (loop increases/decreases)
ponder.on("HypeVault:ManagerExecuted", async ({ event, context }) => {
  const { args, log, block } = event;
  const { targets, data, values, successful } = args;

  // Determine execution type based on targets and data
  const executionType = determineExecutionType(targets, data);
  
  // Get vault position before execution for comparison
  const vaultPosition = await context.db.find(hypeVaultPosition, { id: log.address });
  const leverageRatioBefore = vaultPosition?.leverageRatio || 0;

  // Create loop execution record
  await context.db.insert(loopExecution).values({
    id: `${log.transactionHash}-${log.logIndex}`,
    vaultAddress: log.address,
    txHash: log.transactionHash,
    blockNumber: BigInt(block.number),
    timestamp: BigInt(block.timestamp),
    executionType,
    hypeAmountProcessed: 0n, // Will be calculated from decoded data
    stHypeAmountProcessed: 0n, // Will be calculated from decoded data
    leverageRatioBefore,
    leverageRatioAfter: 0, // Will be updated by risk aggregator
    gasUsed: 0n, // Add gas tracking if needed
    success: successful,
    errorMessage: successful ? "" : "Execution failed",
  });

  // Store raw event
  await context.db.insert(rawEvent).values({
    id: `${log.transactionHash}-${log.logIndex}`,
    contractAddress: log.address,
    eventName: "ManagerExecuted",
    blockNumber: BigInt(block.number),
    logIndex: log.logIndex,
    transactionHash: log.transactionHash,
    timestamp: BigInt(block.timestamp),
    data: args,
  });
});

// Helper function to determine execution type
function determineExecutionType(targets: readonly string[], data: readonly string[]): string {
  // Analyze the targets and data to determine what type of operation was executed
  // This would need to be customized based on your specific strategy contracts
  
  // Example logic - you'll need to adapt this based on your contracts
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i].toLowerCase();
    const calldata = data[i];
    
    // Check if it's a staking operation
    if (target === process.env.STAKING_CONTRACT_ADDRESS?.toLowerCase()) {
      if (calldata.startsWith("0xa694fc3a")) { // stake() function selector
        return "increase_leverage";
      }
      if (calldata.startsWith("0x2e1a7d4d")) { // withdraw() function selector
        return "decrease_leverage";
      }
    }
    
    // Check if it's a lending operation
    if (target === process.env.LENDING_PROTOCOL_ADDRESS?.toLowerCase()) {
      if (calldata.startsWith("0xe8eda9df")) { // supply() function selector
        return "increase_leverage";
      }
      if (calldata.startsWith("0x69328dec")) { // borrow() function selector
        return "increase_leverage";
      }
      if (calldata.startsWith("0x573ade81")) { // repay() function selector
        return "decrease_leverage";
      }
    }
  }
  
  return "rebalance";
}

// Block handler to update vault positions and risk metrics
ponder.on("block:priceUpdate", async ({ event, context }) => {
  const { block } = event;
  
  // This runs every 100 blocks to update vault state
  const vaultAddress = process.env.HYPE_VAULT_ADDRESS;
  if (!vaultAddress) return;

  // Fetch current vault state (you'll need to implement these calls)
  // const totalStaked = await getVaultStakedBalance(context.client, vaultAddress);
  // const totalBorrowed = await getVaultBorrowedAmount(context.client, vaultAddress);
  // const stHypeBalance = await getStHypeBalance(context.client, vaultAddress);
  
  // Update vault position
  await context.db.upsert(hypeVaultPosition).values({
    id: vaultAddress,
    totalHypeStaked: 0n, // Update with actual values
    totalStHypeBalance: 0n,
    leverageRatio: 0,
    collateralValue: 0n,
    borrowedAmount: 0n,
    netAssetValue: 0n,
    lastUpdatedBlock: BigInt(block.number),
    lastUpdatedTimestamp: BigInt(block.timestamp),
  });
});

// Risk monitoring block handler
ponder.on("block:riskCheck", async ({ event, context }) => {
  const { block } = event;
  
  const vaultAddress = process.env.HYPE_VAULT_ADDRESS;
  if (!vaultAddress) return;

  // Get current vault position
  const vaultPosition = await context.db.find(hypeVaultPosition, { id: vaultAddress });
  if (!vaultPosition) return;

  // Calculate risk metrics
  const leverageRatio = vaultPosition.leverageRatio;
  const healthFactor = calculateHealthFactor(vaultPosition);
  const liquidationPrice = calculateLiquidationPrice(vaultPosition);
  
  // Create risk metric record
  await context.db.insert(leverageRiskMetrics).values({
    id: `${vaultAddress}-${block.timestamp}`,
    vaultAddress,
    timestamp: BigInt(block.timestamp),
    leverageRatio,
    healthFactor,
    liquidationPrice,
    currentStHypePrice: 0, // Fetch from oracle
    borrowUtilization: 0,
    netYield: 0,
    riskScore: calculateRiskScore(healthFactor, leverageRatio),
    alertLevel: determineAlertLevel(healthFactor, leverageRatio),
  });

  // Check for emergency conditions
  if (healthFactor < 1.2) {
    await context.db.insert(emergencyAlert).values({
      id: `${block.timestamp}-liquidation_risk`,
      vaultAddress,
      alertType: "liquidation_risk",
      severity: healthFactor < 1.1 ? "emergency" : "critical",
      message: `Health factor below safe threshold: ${healthFactor}`,
      triggerValue: healthFactor,
      threshold: 1.2,
      timestamp: BigInt(block.timestamp),
      resolved: false,
      resolvedAt: 0n,
    });
  }
});

// Helper functions for risk calculations
function calculateHealthFactor(position: any): number {
  // Implement health factor calculation based on your vault's logic
  // Health Factor = (Collateral Value * Liquidation Threshold) / Borrowed Amount
  if (position.borrowedAmount === 0n) return 999; // No debt = infinite health factor
  
  const collateralValue = Number(position.collateralValue);
  const borrowedAmount = Number(position.borrowedAmount);
  const liquidationThreshold = 0.8; // 80% - adjust based on your protocol
  
  return (collateralValue * liquidationThreshold) / borrowedAmount;
}

function calculateLiquidationPrice(position: any): number {
  // Calculate the stHYPE price at which liquidation would occur
  // This depends on your specific liquidation threshold and current borrowed amount
  return 0; // Implement based on your vault's liquidation logic
}

function calculateRiskScore(healthFactor: number, leverageRatio: number): number {
  // Return a risk score from 0-100
  let score = 0;
  
  // Health factor component (0-50 points)
  if (healthFactor >= 2.0) score += 50;
  else if (healthFactor >= 1.5) score += 40;
  else if (healthFactor >= 1.3) score += 25;
  else if (healthFactor >= 1.1) score += 10;
  else score += 0;
  
  // Leverage ratio component (0-50 points)  
  if (leverageRatio <= 1.5) score += 50;
  else if (leverageRatio <= 2.0) score += 40;
  else if (leverageRatio <= 2.5) score += 25;
  else if (leverageRatio <= 3.0) score += 10;
  else score += 0;
  
  return Math.min(100, score);
}

function determineAlertLevel(healthFactor: number, leverageRatio: number): string {
  if (healthFactor < 1.1 || leverageRatio > 3.5) return "critical";
  if (healthFactor < 1.3 || leverageRatio > 2.5) return "high";
  if (healthFactor < 1.8 || leverageRatio > 2.0) return "medium";
  return "low";
}
