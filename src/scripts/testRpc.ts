import { createPublicClient, http } from 'viem';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const rpcUrl = process.env.PONDER_RPC_URL_BASE;
if (!rpcUrl) {
  console.error('RPC URL not found in environment variables');
  process.exit(1);
}

console.log('Using RPC URL:', rpcUrl);

const client = createPublicClient({
  transport: http(rpcUrl),
  chain: {
    id: 998,
    name: 'hyperliquid',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  },
});

async function main() {
  try {
    console.log('Testing RPC connection...');
    
    const latestBlock = await client.getBlockNumber();
    console.log('Latest block:', latestBlock.toString());
    
    // Try to find earliest available block with binary search
    let left = 19000000n;  // Start from a reasonable point
    let right = latestBlock;
    let earliest = right;
    
    console.log('Searching for earliest available block...');
    while (left <= right) {
      const mid = left + (right - left) / 2n;
      try {
        await client.getBlock({ blockNumber: mid });
        console.log('Block', mid.toString(), 'is available');
        earliest = mid;
        right = mid - 1n;
      } catch (error) {
        console.log('Block', mid.toString(), 'is not available');
        left = mid + 1n;
      }
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('Earliest available block appears to be:', earliest.toString());
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 