# Vault Monitor

A comprehensive monitoring system for BoringVault, Felix, and HLP events on the Base chain.

## System Architecture

The Vault Monitor consists of several components:

1. **Event Indexing:** Ponder continuously indexes on-chain logs and events from the specified contracts on Base chain.
2. **Data Storage:** Raw events are stored in both Ponder's database and a Supabase database for further processing.
3. **Off-Chain Data Integration:** External APIs are used to fetch price and liquidity data.
4. **Risk Aggregation:** Background jobs compute risk metrics based on both on-chain and off-chain data.
5. **Alerting:** Critical risk conditions trigger notifications in the database.

## Setup

### Prerequisites

- Node.js 18.14 or higher
- npm or yarn
- Supabase account and project
- RPC URLs for Base chain

### Installation

1. Clone the repository
   ```
   git clone https://github.com/0xdgoat/vault_monitor.git
   cd vault_monitor
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Configure environment variables
   - Copy `.env.local` to `.env`
   - Update with your actual RPC URLs, contract addresses, and Supabase credentials

4. Set up Supabase tables
   ```
   npm run setup-supabase
   ```
   This will output the SQL statements to create the necessary tables. Execute them in your Supabase SQL editor.

### Contract Configuration

Update the following in your `.env` file:

```
BORING_VAULT_ADDRESS=0x...  # Actual contract address
FELIX_ADDRESS=0x...         # Actual contract address
HLP_ADDRESS=0x...           # Actual contract address

BORING_VAULT_START_BLOCK=   # Block number when the contract was deployed
FELIX_START_BLOCK=          # Block number when the contract was deployed
HLP_START_BLOCK=            # Block number when the contract was deployed
```

## Running the System

### Indexer

To start the Ponder indexer which captures on-chain events:

```
npm run dev
```

### Background Jobs

To run the scheduled jobs for price data and risk metrics:

```
npm run jobs
```

### Individual Scripts

You can also run each component individually:

- Fetch latest price data: `npm run prices`
- Calculate risk metrics: `npm run risk`

## Development

### Project Structure

- `abis/`: Contract ABIs
- `src/handlers/`: Event handlers for each contract
- `src/scripts/`: Utility scripts for data fetching and processing
- `ponder.schema.ts`: Database schema definition for Ponder
- `ponder.config.ts`: Ponder configuration

### Adding New Contracts

1. Add the contract ABI to the `abis/` directory
2. Update `ponder.config.ts` with the new contract details
3. Create a new handler file in `src/handlers/` for the contract's events

## Monitoring Dashboard

A dashboard can be built on top of the Supabase database to visualize the collected data. The system stores:

- Raw blockchain events
- Price and liquidity data
- User position details and risk metrics
- Protocol-wide health metrics

## License

This project is licensed under the MIT License - see the LICENSE file for details. 