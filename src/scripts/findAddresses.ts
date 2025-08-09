import { createPublicClient, http } from "viem";
import { base, mainnet } from "viem/chains";
import axios from "axios";

/**
 * Script para encontrar y verificar direcciones de tokens HYPE
 */

// Direcciones conocidas de diferentes fuentes
const POTENTIAL_ADDRESSES = {
  ETHEREUM: {
    // De tu búsqueda en Google/Etherscan
    HYPE_CANDIDATES: [
      '0xe1223f2d4b67b3e6fe6abcaa63aadf83938f00d81', // De Etherscan search
    ],
    USDC: '0xA0b86a33E6B26B5c24e14C0a2B18DD5fD86Daa90'
  },
  BASE: {
    HYPE_CANDIDATES: [
      // Agregar si encuentras direcciones en Base
    ],
    USDC: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
  }
};

async function findHypeAddresses() {
  console.log('🔍 Buscando direcciones de tokens HYPE...\n');
  
  // Verificar en Ethereum
  console.log('📍 Verificando Ethereum Mainnet...');
  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http('https://mainnet.infura.io/v3/demo')
  });
  
  for (const address of POTENTIAL_ADDRESSES.ETHEREUM.HYPE_CANDIDATES) {
    console.log(`Verificando ${address}...`);
    try {
      // Verificar si es un contrato
      const code = await ethClient.getBytecode({
        address: address as `0x${string}`
      });
      
      if (code && code !== '0x') {
        console.log(`✅ ${address} es un contrato válido en Ethereum`);
        
        // Intentar obtener información del token
        try {
          const [name, symbol, decimals] = await Promise.all([
            ethClient.readContract({
              address: address as `0x${string}`,
              abi: [{ name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }],
              functionName: 'name'
            }),
            ethClient.readContract({
              address: address as `0x${string}`,
              abi: [{ name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }],
              functionName: 'symbol'
            }),
            ethClient.readContract({
              address: address as `0x${string}`,
              abi: [{ name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] }],
              functionName: 'decimals'
            })
          ]);
          
          console.log(`  📊 Nombre: ${name}`);
          console.log(`  🔤 Símbolo: ${symbol}`);
          console.log(`  🔢 Decimales: ${decimals}`);
          
          // Verificar si es realmente HYPE
          if (symbol.toString().toLowerCase().includes('hype')) {
            console.log(`  🎯 ¡Parece ser un token HYPE válido!`);
          }
          
        } catch (tokenError) {
          console.log(`  ⚠️ No se pudieron obtener detalles del token`);
        }
      } else {
        console.log(`❌ ${address} no es un contrato válido`);
      }
    } catch (error) {
      console.log(`❌ Error verificando ${address}: ${error}`);
    }
    console.log('');
  }
  
  // Verificar en Base
  console.log('📍 Verificando Base Mainnet...');
  const baseClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org')
  });
  
  if (POTENTIAL_ADDRESSES.BASE.HYPE_CANDIDATES.length === 0) {
    console.log('⚠️ No hay direcciones candidatas para Base chain');
    console.log('💡 Sugerencia: Busca en https://basescan.org/ el token HYPE');
  }
  
  // Buscar en CoinGecko
  console.log('\n🦎 Buscando en CoinGecko...');
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/search', {
      params: { query: 'hyperliquid' }
    });
    
    console.log('📋 Resultados de CoinGecko:');
    response.data.coins.forEach((coin: any) => {
      console.log(`  • ${coin.name} (${coin.symbol}) - ID: ${coin.id}`);
      if (coin.platforms) {
        Object.entries(coin.platforms).forEach(([platform, address]) => {
          if (address) {
            console.log(`    ${platform}: ${address}`);
          }
        });
      }
    });
  } catch (error) {
    console.log('❌ Error buscando en CoinGecko:', error);
  }
  
  // Sugerencias
  console.log('\n💡 PRÓXIMOS PASOS:');
  console.log('1. Verifica manualmente en:');
  console.log('   • Etherscan: https://etherscan.io/token/[ADDRESS]');
  console.log('   • Basescan: https://basescan.org/token/[ADDRESS]');
  console.log('');
  console.log('2. Busca en exchanges como:');
  console.log('   • Uniswap: https://app.uniswap.org/');
  console.log('   • Hyperliquid official site');
  console.log('');
  console.log('3. Una vez tengas las direcciones correctas:');
  console.log('   • Actualiza el archivo .env');
  console.log('   • Ejecuta: npm run verify-config');
  console.log('   • Ejecuta: npm run hype-monitor');
}

findHypeAddresses().catch(console.error);
