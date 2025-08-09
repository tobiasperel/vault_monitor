import axios from 'axios';

/**
 * Script para buscar el token HYPE real usando APIs de datos
 */

async function searchRealHypeToken() {
  console.log('🔍 Buscando token HYPE real en diferentes fuentes...\n');
  
  // 1. Buscar en CoinGecko con más detalle
  console.log('🦎 Buscando en CoinGecko...');
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/hyperliquid');
    
    console.log('📋 Información de CoinGecko:');
    console.log(`  📛 Nombre: ${response.data.name}`);
    console.log(`  🔤 Símbolo: ${response.data.symbol}`);
    console.log(`  💰 Precio actual: $${response.data.market_data.current_price.usd}`);
    
    if (response.data.platforms) {
      console.log('\n📍 Direcciones en diferentes chains:');
      Object.entries(response.data.platforms).forEach(([platform, address]) => {
        if (address) {
          console.log(`  ${platform}: ${address}`);
        }
      });
    }
    
    // Buscar específicamente direcciones de Base
    const baseAddresses = Object.entries(response.data.platforms || {})
      .filter(([platform]) => platform.toLowerCase().includes('base'))
      .map(([platform, address]) => ({ platform, address }));
    
    if (baseAddresses.length > 0) {
      console.log('\n🎯 Direcciones encontradas en Base:');
      baseAddresses.forEach(({ platform, address }) => {
        console.log(`  ${platform}: ${address}`);
      });
    } else {
      console.log('\n⚠️ No se encontraron direcciones específicas de Base');
    }
    
  } catch (error: any) {
    console.log('❌ Error consultando CoinGecko:', error.response?.data || error.message);
  }
  
  // 2. Buscar en DefiLlama
  console.log('\n🦙 Buscando en DefiLlama...');
  try {
    const response = await axios.get('https://api.llama.fi/protocols');
    const hypeProtocols = response.data.filter((protocol: any) => 
      protocol.name.toLowerCase().includes('hyperliquid') || 
      protocol.symbol?.toLowerCase().includes('hype')
    );
    
    if (hypeProtocols.length > 0) {
      console.log('📋 Protocolos relacionados con HYPE:');
      hypeProtocols.forEach((protocol: any) => {
        console.log(`  📛 ${protocol.name} (${protocol.symbol})`);
        console.log(`  🔗 ${protocol.url}`);
        if (protocol.chain) console.log(`  ⛓️ Chain: ${protocol.chain}`);
        console.log('');
      });
    } else {
      console.log('⚠️ No se encontraron protocolos HYPE en DefiLlama');
    }
  } catch (error) {
    console.log('❌ Error consultando DefiLlama');
  }
  
  // 3. Sugerencias para encontrar la dirección correcta
  console.log('\n💡 SUGERENCIAS PARA ENCONTRAR LA DIRECCIÓN CORRECTA:');
  console.log('');
  console.log('1. 🌐 Visita el sitio oficial de Hyperliquid:');
  console.log('   https://hyperliquid.xyz/');
  console.log('   Busca sección "Bridge" o "Tokens" que puede mostrar direcciones');
  console.log('');
  console.log('2. 📱 Conecta wallet a la app de Hyperliquid:');
  console.log('   La dirección del token aparece al hacer transacciones');
  console.log('');
  console.log('3. 🔍 Busca en Basescan:');
  console.log('   https://basescan.org/tokens');
  console.log('   Busca "HYPE" o "Hyperliquid" en la lista de tokens');
  console.log('');
  console.log('4. 💬 Comunidad/Discord de Hyperliquid:');
  console.log('   Pregunta por la dirección oficial del token en Base');
  console.log('');
  console.log('5. 🔄 Verifica si HYPE está realmente en Base:');
  console.log('   Hyperliquid puede estar en su propia L1 chain, no en Base');
  console.log('');
  
  // 4. Instrucciones para continuar
  console.log('📝 MIENTRAS TANTO, PUEDES:');
  console.log('');
  console.log('✅ El monitor YA FUNCIONA con precios reales de CoinGecko');
  console.log('✅ Configura solo Supabase y tendrás monitoreo de precios');
  console.log('✅ Una vez encuentres las direcciones correctas, actualiza .env');
  console.log('');
  console.log('🚀 Para probar ahora mismo:');
  console.log('1. Configura SUPABASE_URL y SUPABASE_SERVICE_KEY en .env');
  console.log('2. Ejecuta: npm run hype-monitor');
  console.log('3. Verás precios reales funcionando (~$41.25)');
}

searchRealHypeToken().catch(console.error);
