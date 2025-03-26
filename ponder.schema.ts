import { onchainTable } from "ponder";

// Define tables with onchainTable
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

export const bulkTransaction = onchainTable("bulk_transaction", (t) => ({
  id: t.text().primaryKey(),
  txHash: t.text(),
  timestamp: t.integer(),
  transactionType: t.text(), // 'deposit' or 'withdraw'
  asset: t.text(),
  amount: t.bigint(),
  receiver: t.text(),
  caller: t.text(),
}));

export const assetConfig = onchainTable("asset_config", (t) => ({
  id: t.text().primaryKey(), // asset address
  allowDeposits: t.boolean(),
  allowWithdraws: t.boolean(),
  sharePremium: t.integer(),
  lastUpdated: t.integer(),
}));

export const vaultStatus = onchainTable("vault_status", (t) => ({
  id: t.text().primaryKey(), // "latest"
  totalAssets: t.bigint(),
  totalShares: t.bigint(),
  timestamp: t.integer(),
  isPaused: t.boolean(),
}));

export const vault = onchainTable("vault", (t) => ({
  id: t.text().primaryKey(),
  totalAssets: t.bigint(),
  totalShares: t.bigint(),
  lastUpdatedBlock: t.bigint(),
  lastUpdatedTimestamp: t.timestamp(),
}));

export const vaultUser = onchainTable("vault_user", (t) => ({
  id: t.text().primaryKey(), // vaultAddress-userAddress
  vaultAddress: t.text(),
  userAddress: t.text(),
  shares: t.bigint(),
  unlockTime: t.timestamp(),
  lastUpdatedBlock: t.bigint(),
}));

export const userPosition = onchainTable("user_position", (t) => ({
  id: t.text().primaryKey(), // user address
  shares: t.bigint(),
  shareValue: t.bigint(),
  shareLockUntil: t.integer(),
  lastUpdated: t.integer(),
}));

export const strategyExecution = onchainTable("strategy_execution", (t) => ({
  id: t.text().primaryKey(),
  txHash: t.text(),
  timestamp: t.integer(),
  strategyName: t.text(), // 'BtcCarryLeg1Felix', 'BtcCarryLeg2Curve', etc.
  executor: t.text(),
  successful: t.boolean(),
  targets: t.text(), // JSON string of target addresses
  actions: t.text(), // JSON string describing actions
}));

export const loan = onchainTable("loan", (t) => ({
  id: t.text().primaryKey(),
  borrowerAddress: t.text(),
  borrowedAmount: t.bigint(),
  collateralAmount: t.bigint(),
  healthFactor: t.bigint(),
  lastUpdatedBlock: t.bigint(),
  lastUpdatedTimestamp: t.timestamp(),
}));

export const trove = onchainTable("trove", (t) => ({
  id: t.text().primaryKey(), // troveId as string
  borrower: t.text(),
  debt: t.bigint(),
  collateral: t.bigint(),
  stake: t.bigint(),
  status: t.integer(),
  interestRate: t.bigint(),
  lastUpdatedBlock: t.bigint(),
  lastUpdatedTimestamp: t.timestamp(),
}));

export const troveEvent = onchainTable("trove_event", (t) => ({
  id: t.text().primaryKey(), // tx_hash-log_index
  troveId: t.text(),
  borrower: t.text(),
  eventType: t.text(), // Created, Updated, Liquidated, etc.
  debt: t.bigint(),
  collateral: t.bigint(),
  stake: t.bigint(),
  fee: t.bigint(),
  blockNumber: t.bigint(),
  transactionHash: t.text(),
  timestamp: t.timestamp(),
}));

export const loanEvent = onchainTable("loan_event", (t) => ({
  id: t.text().primaryKey(),
  borrowerAddress: t.text(),
  eventType: t.text(), // 'borrow', 'repay', 'liquidation'
  amount: t.bigint(),
  blockNumber: t.bigint(),
  timestamp: t.timestamp(),
  transactionHash: t.text(),
  liquidatorAddress: t.text(),
}));

export const loanPosition = onchainTable("loan_position", (t) => ({
  id: t.text().primaryKey(),
  txHash: t.text(),
  timestamp: t.integer(),
  borrower: t.text(),
  collateralAmount: t.bigint(),
  debtAmount: t.bigint(),
  interestRate: t.bigint(),
  isLiquidated: t.boolean(),
  createdAt: t.integer(),
  updatedAt: t.integer(),
  healthFactor: t.real(),
}));

export const hlp = onchainTable("hlp", (t) => ({
  id: t.text().primaryKey(),
  userAddress: t.text(),
  depositAmount: t.bigint(),
  unlockTime: t.timestamp(),
  yieldAccrued: t.bigint(),
  lastUpdatedBlock: t.bigint(),
  lastUpdatedTimestamp: t.timestamp(),
}));

export const hyperliquidDeposit = onchainTable("hyperliquid_deposit", (t) => ({
  id: t.text().primaryKey(),
  txHash: t.text(),
  timestamp: t.integer(),
  user: t.text(),
  amount: t.bigint(),
  isDeposit: t.boolean(),
}));

export const riskMetric = onchainTable("risk_metric", (t) => ({
  id: t.text().primaryKey(),
  timestamp: t.integer(),
  collateralRatio: t.real(),
  liquidationPrice: t.real(),
  currentPrice: t.real(),
  liquidationRisk: t.real(), // 0-100 score
  profitLoss: t.real(),
  apy: t.real(),
  shareLockPeriod: t.integer(),
}));

export const assetPrice = onchainTable("asset_price", (t) => ({
  id: t.text().primaryKey(), // assetAddress + timestamp
  asset: t.text(),
  price: t.real(),
  timestamp: t.integer(),
  source: t.text(),
}));

export const rawEvent = onchainTable("raw_event", (t) => ({
  id: t.text().primaryKey(),
  contractAddress: t.text(),
  eventName: t.text(),
  blockNumber: t.bigint(),
  logIndex: t.integer(),
  transactionHash: t.text(),
  timestamp: t.timestamp(),
  data: t.json(),
}));
