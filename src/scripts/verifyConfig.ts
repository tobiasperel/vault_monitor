import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();

/**
 * Script para verificar que toda la configuración esté correcta
 * antes de ejecutar el monitor principal
 */

async function verifyConfiguration() {
  console.log('🔍 Verificando configuración del Vault Monitor...\n');
  
  let errors = [];
  let warnings = [];
  
  // 1. Verificar variables de entorno
  console.log('📋 Verificando variables de entorno...');
  
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'HYPE_VAULT_ADDRESS'
  ];
  
  const optionalEnvVars = [
    'RPC_URL',
    'HYPE_TOKEN_ADDRESS',
    'STHYPE_TOKEN_ADDRESS',
    'ONEINCH_API_KEY',
    'COINGECKO_API_KEY',
    'DISCORD_WEBHOOK_URL'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`❌ Variable requerida faltante: ${envVar}`);
    } else {
      console.log(`✅ ${envVar}: configurada`);
    }
  }
  
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(`⚠️ Variable opcional faltante: ${envVar}`);
    } else {
      console.log(`✅ ${envVar}: configurada`);
    }
  }
  
  // 2. Verificar conexión RPC
  console.log('\n🌐 Verificando conexión RPC...');
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.RPC_URL || 'https://mainnet.base.org')
    });
    
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ RPC conectado. Último bloque: ${blockNumber}`);
  } catch (error) {
    errors.push(`❌ Error conectando RPC: ${error}`);
  }
  
  // 3. Verificar formato de direcciones
  console.log('\n📍 Verificando formato de direcciones...');
  const addresses = {
    'HYPE_VAULT_ADDRESS': process.env.HYPE_VAULT_ADDRESS,
    'HYPE_TOKEN_ADDRESS': process.env.HYPE_TOKEN_ADDRESS,
    'STHYPE_TOKEN_ADDRESS': process.env.STHYPE_TOKEN_ADDRESS
  };
  
  for (const [name, address] of Object.entries(addresses)) {
    if (address) {
      if (address.startsWith('0x') && address.length === 42) {
        console.log(`✅ ${name}: formato válido`);
      } else {
        errors.push(`❌ ${name}: formato inválido (debe ser 0x... con 42 caracteres)`);
      }
    }
  }
  
  // 4. Verificar contrato vault existe
  if (process.env.HYPE_VAULT_ADDRESS && !errors.some(e => e.includes('RPC'))) {
    console.log('\n🏗️ Verificando contrato vault...');
    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(process.env.RPC_URL || 'https://mainnet.base.org')
      });
      
      const code = await publicClient.getBytecode({
        address: process.env.HYPE_VAULT_ADDRESS as `0x${string}`
      });
      
      if (code && code !== '0x') {
        console.log(`✅ Contrato vault encontrado en ${process.env.HYPE_VAULT_ADDRESS}`);
      } else {
        errors.push(`❌ No se encontró contrato en ${process.env.HYPE_VAULT_ADDRESS}`);
      }
    } catch (error) {
      warnings.push(`⚠️ No se pudo verificar contrato: ${error}`);
    }
  }
  
  // 5. Verificar APIs externas
  console.log('\n🌍 Verificando APIs externas...');
  
  // CoinGecko
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/ping');
    if (response.ok) {
      console.log('✅ CoinGecko API: disponible');
    } else {
      warnings.push('⚠️ CoinGecko API: no responde');
    }
  } catch (error) {
    warnings.push('⚠️ CoinGecko API: error de conexión');
  }
  
  // 1inch (si tiene API key)
  if (process.env.ONEINCH_API_KEY) {
    try {
      const response = await fetch('https://api.1inch.dev/price/v1.1/8453/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', {
        headers: {
          'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`
        }
      });
      if (response.ok) {
        console.log('✅ 1inch API: autenticada y disponible');
      } else {
        errors.push('❌ 1inch API: error de autenticación o límite alcanzado');
      }
    } catch (error) {
      warnings.push('⚠️ 1inch API: error de conexión');
    }
  }
  
  // 6. Resumen
  console.log('\n📊 RESUMEN DE VERIFICACIÓN');
  console.log('='.repeat(50));
  
  if (errors.length === 0) {
    console.log('🎉 ¡Configuración lista para producción!');
  } else {
    console.log('❌ Errores encontrados que deben corregirse:');
    errors.forEach(error => console.log(`  ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️ Advertencias (opcional mejorar):');
    warnings.forEach(warning => console.log(`  ${warning}`));
  }
  
  console.log('\n💡 Próximos pasos:');
  if (errors.length > 0) {
    console.log('1. Corrige los errores mostrados arriba');
    console.log('2. Ejecuta este script nuevamente: npm run verify-config');
    console.log('3. Una vez sin errores, ejecuta: npm run hype-monitor');
  } else {
    console.log('1. Tu configuración está lista');
    console.log('2. Ejecuta el monitor: npm run hype-monitor');
    console.log('3. Revisa los logs para confirmar que funciona correctamente');
  }
  
  return errors.length === 0;
}

// Ejecutar verificación
verifyConfiguration().catch(console.error);
