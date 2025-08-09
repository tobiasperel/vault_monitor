# HYPE Vault Monitor

A comprehensive monitoring system for HYPE vault metrics with real-time data integration and risk assessment.

## Prerequisites

- Node.js 18+
- Supabase database configured
- Environment variables set in `.env`

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables in `.env`
```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
DATABASE_URL=postgresql://...

# Contracts
HYPE_VAULT_ADDRESS=your_vault_address
HYPE_TOKEN_ADDRESS=your_hype_token_address
STHYPE_TOKEN_ADDRESS=your_sthype_token_address

# Network
PONDER_RPC_URL_BASE=https://...
CHAIN_ID=8453
```

### 3. Create database tables
Execute the SQL script in `sql/create_missing_tables.sql` in your Supabase dashboard.

## Main Commands

### Core Metrics Monitoring (Recommended)
```bash
npm run core-metrics-clean    # Run core metrics with fallbacks (RECOMMENDED)
```

This command:
- Fetches real HYPE price from CoinGecko API
- Calculates vault metrics according to assignment specifications
- Stores data in Supabase
- Generates alerts if thresholds are exceeded
- **Has built-in fallbacks for RPC timeouts**

### Alternative Commands
```bash
npm run core-metrics          # Core metrics with direct blockchain calls (may timeout on slow RPCs)
npm run prices-only          # Price monitoring only
npm run hype-monitor         # Single monitoring execution
npm run hype-api             # API server only
npm run hype-jobs            # Background monitoring jobs
```

**Note:** If you get RPC timeout errors with `npm run core-metrics`, use `npm run core-metrics-clean` instead. It has better error handling and fallbacks for slow blockchain RPCs.

### Development Commands
```bash
npm run dev                  # Start development environment
npm run lint                 # Run linter
npm run typecheck            # Type checking
```

## Core Metrics Tracked

The system monitors these key metrics according to the Monitoring & Reporting assignment:

1. **Total vault deposits (HYPE)** - Total HYPE tokens in the vault
2. **Total vault deposits (USD-equivalent)** - USD value of vault deposits
3. **stHYPE supplied as collateral in Felix** - Collateral amount in lending protocol
4. **Outstanding HYPE borrowed** - Current borrowed amount
5. **Net annualized yield on HYPE** - Calculated yield percentage

### Additional Metrics
- Leverage ratio
- Health factor
- Risk score
- Liquidation price
- Price volatility

## API Endpoints

When running the API server (`npm run hype-api`):

```
GET /api/health              # API status
GET /api/vault/status        # Current vault status
GET /api/vault/metrics       # Historical metrics
GET /api/prices             # Price data
GET /api/risk               # Risk analysis
GET /api/alerts             # Active alerts
GET /api/users              # User positions
```

## Database Tables

The system stores data in the following Supabase tables:
- `core_vault_metrics` - Main metrics data (assignment requirements)
- `vault_metrics` - Additional vault data
- `price_data` - Price history
- `risk_assessments` - Risk analysis data
- `vault_health` - System health metrics
- `alerts` - Alert notifications
- `monitoring_errors` - Error logging

## Continuous Monitoring

For production monitoring, run the core metrics command periodically:

```bash
# Example: every 5 minutes
watch -n 300 npm run core-metrics-clean

# Or use a cron job
*/5 * * * * cd /path/to/vault_monitor && npm run core-metrics-clean
```

## Testing Status

### Verified Working Commands
- `npm run core-metrics-clean` - Core metrics with real data
- `npm run hype-monitor` - Single monitoring execution
- `npm run hype-api` - API server functionality
- `npm run prices-only` - Price data fetching

### Verified API Endpoints
- `GET /api/health` - System status
- `GET /api/vault/status` - Vault data
- `GET /api/prices` - Price records
- `GET /api/risk` - Risk assessment
- `GET /api/alerts` - Alert system
