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

export const hyperliquidTransfer = onchainTable("hyperliquid_transfer", (t) => ({
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

// New Vault Entity for tracking vault metrics
export const vaultEntity = onchainTable("vault_entity", (t) => ({
  id: t.text().primaryKey(), // vault address
  totalAssets: t.bigint(),
  totalShares: t.bigint(),
  depositCount: t.integer(),
  withdrawCount: t.integer(),
  userCount: t.integer(),
  lastEventTimestamp: t.timestamp(),
  lastEventBlock: t.bigint(),
  lastEventType: t.text(), // 'deposit', 'withdraw', 'transfer'
  lastEventAmount: t.bigint(),
  lastEventUser: t.text(),
}));

// New Vault Event Entity for tracking vault events
export const vaultEventEntity = onchainTable("vault_event_entity", (t) => ({
  id: t.text().primaryKey(), // tx_hash-log_index
  vaultAddress: t.text(),
  eventType: t.text(), // 'deposit', 'withdraw', 'transfer'
  amount: t.bigint(),
  shares: t.bigint(),
  user: t.text(),
  blockNumber: t.bigint(),
  timestamp: t.timestamp(),
  transactionHash: t.text(),
}));

// New Vault User Entity for tracking user positions
export const vaultUserEntity = onchainTable("vault_user_entity", (t) => ({
  id: t.text().primaryKey(), // vault_address-user_address
  vaultAddress: t.text(),
  userAddress: t.text(),
  shares: t.bigint(),
  depositCount: t.integer(),
  withdrawCount: t.integer(),
  lastActionTimestamp: t.timestamp(),
  unlockTime: t.timestamp(),
  isActive: t.boolean(),
}));

// New Loan Entity specifically for BoringVault
export const loanEntity = onchainTable("loan_entity", (t) => ({
  id: t.text().primaryKey(), // vault_address-borrower_address
  vaultAddress: t.text(),
  borrowerAddress: t.text(),
  outstandingDebt: t.bigint(),
  collateralAmount: t.bigint(),
  healthFactor: t.real(),
  interestRate: t.bigint(),
  lastEventTimestamp: t.timestamp(),
  lastEventBlock: t.bigint(),
  lastEventType: t.text(), // 'borrow', 'repay', 'liquidate'
  isActive: t.boolean(),
  troveId: t.text(),
}));

// New Loan Event Entity for tracking loan events
export const loanEventEntity = onchainTable("loan_event_entity", (t) => ({
  id: t.text().primaryKey(), // tx_hash-log_index
  loanId: t.text(), // vault_address-borrower_address
  eventType: t.text(), // 'borrow', 'repay', 'liquidate'
  debtChange: t.bigint(),
  collateralChange: t.bigint(),
  healthFactorAfter: t.real(),
  blockNumber: t.bigint(),
  timestamp: t.timestamp(),
  transactionHash: t.text(),
  borrowerAddress: t.text(),
  troveId: t.text(),
}));

// Table for storing vault equity and withdrawable amounts from L1Read calls for the main vault address
export const vaultEquity = onchainTable("vault_equity", (t) => ({
  id: t.text().primaryKey(), // vaultAddress-blockNumber
  vaultAddress: t.text(),
  equity: t.bigint(),
  withdrawableAmount: t.bigint(),
  lastBlockNumber: t.bigint(),
  lastTimestamp: t.timestamp(),
}));

// New table for storing vault spot balance from L1Read calls
export const vaultSpotBalance = onchainTable("vault_spot_balance", (t) => ({
  id: t.text().primaryKey(), // vaultAddress-token-blockNumber
  vaultAddress: t.text(),
  token: t.integer(), // Token ID queried (e.g., 0 for USDC)
  total: t.bigint(),
  hold: t.bigint(),
  entryNtl: t.bigint(),
  lastBlockNumber: t.bigint(),
  lastTimestamp: t.timestamp(),
}));
