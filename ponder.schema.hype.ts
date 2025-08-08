import { onchainTable } from "ponder";

// HYPE Vault specific tables for monitoring stHYPE looping strategy

// Track HYPE vault positions and loop state
export const hypeVaultPosition = onchainTable("hype_vault_position", (t) => ({
  id: t.text().primaryKey(), // vault_address
  totalHypeStaked: t.bigint(), // Total HYPE tokens staked
  totalStHypeBalance: t.bigint(), // Total stHYPE balance
  leverageRatio: t.real(), // Current leverage ratio
  collateralValue: t.bigint(), // USD value of stHYPE collateral
  borrowedAmount: t.bigint(), // Amount borrowed for leverage
  netAssetValue: t.bigint(), // NAV of the vault
  lastUpdatedBlock: t.bigint(),
  lastUpdatedTimestamp: t.bigint(),
}));

// Track individual user positions in HYPE vault
export const hypeUserPosition = onchainTable("hype_user_position", (t) => ({
  id: t.text().primaryKey(), // vault_address-user_address
  vaultAddress: t.text(),
  userAddress: t.text(),
  shares: t.bigint(), // Vault shares owned
  shareValue: t.bigint(), // USD value of shares
  proportionOfVault: t.real(), // Percentage of vault owned
  depositedAmount: t.bigint(), // Original HYPE deposited
  currentValue: t.bigint(), // Current value including yield
  unrealizedPnL: t.bigint(), // Profit/Loss since deposit
  lastUpdatedBlock: t.bigint(),
  lastUpdatedTimestamp: t.bigint(),
}));

// Track looping strategy executions
export const loopExecution = onchainTable("loop_execution", (t) => ({
  id: t.text().primaryKey(), // tx_hash-log_index
  vaultAddress: t.text(),
  txHash: t.text(),
  blockNumber: t.bigint(),
  timestamp: t.bigint(),
  executionType: t.text(), // 'increase_leverage', 'decrease_leverage', 'rebalance'
  hypeAmountProcessed: t.bigint(), // HYPE amount involved in loop
  stHypeAmountProcessed: t.bigint(), // stHYPE amount involved
  leverageRatioBefore: t.real(),
  leverageRatioAfter: t.real(),
  gasUsed: t.bigint(),
  success: t.boolean(),
  errorMessage: t.text(), // If execution failed
}));

// Track staking rewards and yield
export const stakingRewards = onchainTable("staking_rewards", (t) => ({
  id: t.text().primaryKey(), // vault_address-timestamp
  vaultAddress: t.text(),
  timestamp: t.bigint(),
  blockNumber: t.bigint(),
  rewardsAccrued: t.bigint(), // New stHYPE rewards received
  apr: t.real(), // Annual percentage rate
  apy: t.real(), // Annual percentage yield (compounded)
  cumulativeRewards: t.bigint(), // Total rewards since inception
  stakingRatio: t.real(), // stHYPE/HYPE exchange rate
}));

// Track risk metrics specific to leveraged staking
export const leverageRiskMetrics = onchainTable("leverage_risk_metrics", (t) => ({
  id: t.text().primaryKey(), // vault_address-timestamp
  vaultAddress: t.text(),
  timestamp: t.bigint(),
  leverageRatio: t.real(),
  healthFactor: t.real(), // Distance from liquidation
  liquidationPrice: t.real(), // stHYPE price at which liquidation occurs
  currentStHypePrice: t.real(),
  borrowUtilization: t.real(), // Percentage of max borrowing capacity used
  netYield: t.real(), // Yield after borrowing costs
  riskScore: t.integer(), // 0-100 risk assessment
  alertLevel: t.text(), // 'low', 'medium', 'high', 'critical'
}));

// Track price movements of HYPE and stHYPE
export const tokenPrices = onchainTable("token_prices", (t) => ({
  id: t.text().primaryKey(), // token_address-timestamp
  tokenAddress: t.text(),
  tokenSymbol: t.text(), // 'HYPE' or 'stHYPE'
  price: t.real(), // USD price
  timestamp: t.bigint(),
  source: t.text(), // Price oracle source
  volume24h: t.real(),
  priceChange24h: t.real(),
}));

// Track deposit and withdrawal events
export const vaultDeposit = onchainTable("vault_deposit", (t) => ({
  id: t.text().primaryKey(), // tx_hash-log_index
  vaultAddress: t.text(),
  userAddress: t.text(),
  txHash: t.text(),
  blockNumber: t.bigint(),
  timestamp: t.bigint(),
  hypeAmount: t.bigint(), // HYPE deposited
  sharesReceived: t.bigint(), // Vault shares minted
  sharePrice: t.real(), // Price per share at deposit
  totalSupplyAfter: t.bigint(), // Total shares after deposit
}));

export const vaultWithdrawal = onchainTable("vault_withdrawal", (t) => ({
  id: t.text().primaryKey(), // tx_hash-log_index
  vaultAddress: t.text(),
  userAddress: t.text(),
  txHash: t.text(),
  blockNumber: t.bigint(),
  timestamp: t.bigint(),
  sharesBurned: t.bigint(), // Vault shares burned
  hypeReceived: t.bigint(), // HYPE received
  sharePrice: t.real(), // Price per share at withdrawal
  withdrawalFee: t.bigint(), // Any fees charged
  totalSupplyAfter: t.bigint(), // Total shares after withdrawal
}));

// Track lending protocol interactions
export const lendingInteraction = onchainTable("lending_interaction", (t) => ({
  id: t.text().primaryKey(), // tx_hash-log_index
  vaultAddress: t.text(),
  lendingProtocol: t.text(), // Protocol name (Aave, Compound, etc.)
  txHash: t.text(),
  blockNumber: t.bigint(),
  timestamp: t.bigint(),
  actionType: t.text(), // 'supply', 'borrow', 'repay', 'withdraw'
  assetAddress: t.text(), // Token address involved
  amount: t.bigint(),
  interestRate: t.real(), // Interest rate at time of action
  totalBorrowedAfter: t.bigint(),
  totalCollateralAfter: t.bigint(),
}));

// Track vault performance metrics
export const vaultPerformance = onchainTable("vault_performance", (t) => ({
  id: t.text().primaryKey(), // vault_address-date
  vaultAddress: t.text(),
  date: t.text(), // YYYY-MM-DD format
  totalValueLocked: t.bigint(), // TVL in USD
  sharePrice: t.real(),
  dailyReturn: t.real(), // Percentage return for the day
  weeklyReturn: t.real(),
  monthlyReturn: t.real(),
  apr: t.real(), // Annualized return
  apy: t.real(), // Compounded annualized return
  sharpeRatio: t.real(), // Risk-adjusted return metric
  maxDrawdown: t.real(), // Maximum historical loss
  volatility: t.real(), // Price volatility
}));

// Track emergency events and alerts
export const emergencyAlert = onchainTable("emergency_alert", (t) => ({
  id: t.text().primaryKey(), // timestamp-alert_type
  vaultAddress: t.text(),
  alertType: t.text(), // 'liquidation_risk', 'price_deviation', 'strategy_failure'
  severity: t.text(), // 'warning', 'critical', 'emergency'
  message: t.text(),
  triggerValue: t.real(), // Value that triggered the alert
  threshold: t.real(), // Threshold that was crossed
  timestamp: t.bigint(),
  resolved: t.boolean(),
  resolvedAt: t.bigint(),
}));

// Original tables from the base monitoring system (keeping for compatibility)
export const deposit = onchainTable("deposit", (t) => ({
  id: t.text().primaryKey(),
  txHash: t.text(),
  nonce: t.bigint(),
  timestamp: t.integer(),
  receiver: t.text(),
  depositAsset: t.text(),
  depositAmount: t.bigint(),
  shareAmount: t.bigint(),
  depositTimestamp: t.integer(),
  shareLockPeriod: t.integer(),
  refunded: t.boolean(),
}));

export const vaultStatus = onchainTable("vault_status", (t) => ({
  id: t.text().primaryKey(),
  totalAssets: t.bigint(),
  totalShares: t.bigint(),
  timestamp: t.integer(),
  isPaused: t.boolean(),
}));

export const rawEvent = onchainTable("raw_event", (t) => ({
  id: t.text().primaryKey(),
  contractAddress: t.text(),
  eventName: t.text(),
  blockNumber: t.bigint(),
  logIndex: t.integer(),
  transactionHash: t.text(),
  timestamp: t.bigint(),
  data: t.json(),
}));
