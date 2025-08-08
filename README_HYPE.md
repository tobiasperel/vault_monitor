# HYPE Vault Monitoring System

Monitoring system for HYPE vaults with stHYPE looping strategies.

## Setup

### 1. Configure database
```bash
npm run setup-hype
```
Execute the displayed SQL in Supabase SQL Editor.

### 2. Install dependencies
```bash
npm install
```

## Main Commands

### Complete system
```bash
npm run dev-hype          # API + Background jobs
```

### Individual components
```bash
npm run hype-api           # API server only
npm run hype-jobs          # Monitoring jobs only
npm run hype-monitor       # Single monitoring execution
```

### Additional scripts
```bash
npm run setup-hype         # Show SQL schema for Supabase
npm run risk               # Calculate risk metrics  
npm run prices             # Execute monitoring (includes prices)
npm run test-rpc           # Verify RPC connectivity
```

## Testing Status (2025-08-08)

### Tested Commands ✅
- `npm run setup-hype` ✅ Works - shows SQL schema
- `npm run hype-monitor` ✅ Works - single monitoring 
- `npm run risk` ✅ Works - no active loans
- `npm run prices` ✅ Works - executes complete monitoring
- `npm run dev-hype` ✅ Running in background

### Tested API Endpoints ✅
- `GET /api/health` ✅ Status: OK
- `GET /api/vault/status` ✅ Vault data available
- `GET /api/prices` ✅ 14 price records
- `GET /api/risk` ✅ Score: 100 (low risk)
- `GET /api/alerts` ✅ No active alerts
- `GET /api/users` ✅ No registered users

## API Endpoints

```
GET /api/vault/status       # Current vault status
GET /api/vault/metrics      # Historical metrics
GET /api/prices            # Price data
GET /api/risk              # Risk analysis
GET /api/alerts            # Active alerts
GET /api/users             # User positions
GET /api/health            # API status
```

## .env Configuration

```bash
# Contracts
HYPE_VAULT_ADDRESS=0x...
HYPE_TOKEN_ADDRESS=0x...
STHYPE_TOKEN_ADDRESS=0x...

# Network and database
PONDER_RPC_URL_BASE=https://...
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
```
