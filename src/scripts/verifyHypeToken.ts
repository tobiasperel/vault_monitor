import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

/**
 * Script para verificar el token HYPE en Base usando la dirección encontrada
 */

const HYPE_TOKEN_ADDRESS = '0x3bfc20f0b9afcace800d73d2191166ff16540258';

async function verifyHypeToken() {
  console.log('🔍 Verificando token HYPE en Base chain...\n');
  
  const baseClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org')
  });
  
  try {
    console.log(`📍 Dirección: ${HYPE_TOKEN_ADDRESS}`);
    
    // Verificar si es un contrato
    const code = await baseClient.getBytecode({
      address: HYPE_TOKEN_ADDRESS as `0x${string}`
    });
    
    if (code && code !== '0x') {
      console.log('✅ Es un contrato válido');
      
      // Obtener información del token ERC20
      const erc20Abi = [
        { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
        { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
        { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
        { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
      ] as const;
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        baseClient.readContract({
          address: HYPE_TOKEN_ADDRESS as `0x${string}`,
          abi: erc20Abi,
          functionName: 'name'
        }).catch(() => 'Unknown'),
        baseClient.readContract({
          address: HYPE_TOKEN_ADDRESS as `0x${string}`,
          abi: erc20Abi,
          functionName: 'symbol'
        }).catch(() => 'Unknown'),
        baseClient.readContract({
          address: HYPE_TOKEN_ADDRESS as `0x${string}`,
          abi: erc20Abi,
          functionName: 'decimals'
        }).catch(() => 18),
        baseClient.readContract({
          address: HYPE_TOKEN_ADDRESS as `0x${string}`,
          abi: erc20Abi,
          functionName: 'totalSupply'
        }).catch(() => 0n)
      ]);
      
      console.log('\n📊 Información del Token:');
      console.log(`  📛 Nombre: ${name}`);
      console.log(`  🔤 Símbolo: ${symbol}`);
      console.log(`  🔢 Decimales: ${decimals}`);
      console.log(`  📈 Total Supply: ${totalSupply.toString()}`);
      
      // Verificar si es realmente HYPE
      const symbolStr = symbol.toString().toLowerCase();
      if (symbolStr.includes('hype')) {
        console.log('\n🎯 ¡Confirmado! Este parece ser el token HYPE correcto');
      } else {
        console.log('\n⚠️ El símbolo no contiene "HYPE", verifica que sea el token correcto');
      }
      
      // Verificar en Basescan
      console.log(`\n🔗 Ver en Basescan: https://basescan.org/token/${HYPE_TOKEN_ADDRESS}`);
      
    } else {
      console.log('❌ No es un contrato válido o no existe');
    }
    
  } catch (error) {
    console.error('❌ Error verificando el token:', error);
  }
}

verifyHypeToken().catch(console.error);
