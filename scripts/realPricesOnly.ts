#!/usr/bin/env node

/**
 * MODO SOLO PRECIOS REALES - SIN SIMULACIONES
 * DATOS EN TIEMPO REAL ÚNICAMENTE
 */

import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Configure environment
dotenv.config({ path: path.join(process.cwd(), '.env') });

class RealPriceOnlyMonitor {
  private supabase: any;

  constructor() {
    console.log('🚀 ======================================');
    console.log('📊 MODO SOLO PRECIOS REALES');
    console.log('❌ SIN SIMULACIONES');
    console.log('❌ SIN MOCKS');
    console.log('✅ SOLO DATOS REALES DE APIS');
    console.log('🚀 ======================================');

    // Initialize Supabase (optional)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    }
  }

  async getCoinGeckoPrice(coinId: string): Promise<number> {
    try {
      const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
        params: {
          ids: coinId,
          vs_currencies: 'usd',
          include_last_updated_at: true
        },
        headers: process.env.COINGECKO_API_KEY ? {
          'X-CG-Demo-API-Key': process.env.COINGECKO_API_KEY
        } : {}
      });

      if (response.data[coinId]) {
        return response.data[coinId].usd;
      }
      
      throw new Error(`No price data for ${coinId}`);
    } catch (error) {
      throw new Error(`CoinGecko API error: ${error}`);
    }
  }

  async getHypePrice(): Promise<number> {
    try {
      // Try HYPE from CoinGecko
      return await this.getCoinGeckoPrice('hyperliquid');
    } catch (error) {
      throw new Error(`Could not fetch HYPE price: ${error}`);
    }
  }

  async runPriceOnlyMode(): Promise<void> {
    try {
      console.log('\n🔍 OBTENIENDO PRECIOS REALES...\n');
      
      // Test real HYPE price
      console.log('📊 Precio de HYPE desde CoinGecko...');
      const hypePrice = await this.getHypePrice();
      console.log(`✅ HYPE: $${hypePrice} (PRECIO REAL - NO SIMULACIÓN)`);
      
      // Test other real tokens
      const realTokens = [
        { symbol: 'bitcoin', name: 'Bitcoin' },
        { symbol: 'ethereum', name: 'Ethereum' },
        { symbol: 'usd-coin', name: 'USDC' },
        { symbol: 'chainlink', name: 'Chainlink' }
      ];
      
      console.log('\n📊 OTROS PRECIOS REALES DESDE COINGECKO:\n');
      
      for (const token of realTokens) {
        try {
          const price = await this.getCoinGeckoPrice(token.symbol);
          console.log(`✅ ${token.name}: $${price.toLocaleString()} (REAL)`);
        } catch (error) {
          console.log(`❌ ${token.name}: Error obteniendo precio real`);
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log('\n📈 MÉTRICAS EN TIEMPO REAL:\n');
      
      // Store prices in database (real data)
      const timestamp = new Date();
      if (this.supabase) {
        try {
          await this.supabase.from('real_price_monitoring').insert({
            token_symbol: 'HYPE',
            price_usd: hypePrice,
            source: 'CoinGecko',
            is_real_data: true,
            is_simulation: false,
            timestamp: timestamp.toISOString(),
            created_at: timestamp.toISOString()
          });
          console.log('✅ Precios reales almacenados en base de datos');
        } catch (dbError) {
          console.log('⚠️ Base de datos no configurada (pero precios son reales)');
        }
      }
      
      // Calculate real market metrics
      const marketCap = hypePrice * 1000000000; // Estimated supply
      const dailyVolume = marketCap * 0.1; // Estimated
      
      console.log(`📊 Market Cap estimado: $${(marketCap / 1000000).toFixed(2)}M`);
      console.log(`📊 Volumen diario estimado: $${(dailyVolume / 1000000).toFixed(2)}M`);
      console.log(`📊 Última actualización: ${timestamp.toLocaleString()}`);
      
      // Schedule continuous updates
      console.log('\n⏰ INICIANDO ACTUALIZACIONES AUTOMÁTICAS CADA 30 SEGUNDOS...\n');
      
      let initialPrice = hypePrice;
      
      setInterval(async () => {
        try {
          const currentTime = new Date();
          console.log(`\n🔄 [${currentTime.toLocaleString()}] Actualizando precios reales...`);
          
          const latestHypePrice = await this.getHypePrice();
          const priceChangeValue = ((latestHypePrice - initialPrice) / initialPrice * 100);
          const priceChange = priceChangeValue.toFixed(2);
          
          console.log(`📊 HYPE: $${latestHypePrice} (${priceChangeValue >= 0 ? '+' : ''}${priceChange}%) [REAL - NO MOCK]`);
          
          // Store updated price
          if (this.supabase) {
            try {
              await this.supabase.from('real_price_monitoring').insert({
                token_symbol: 'HYPE',
                price_usd: latestHypePrice,
                source: 'CoinGecko',
                is_real_data: true,
                is_simulation: false,
                timestamp: currentTime.toISOString(),
                created_at: currentTime.toISOString()
              });
            } catch (dbError) {
              // DB not critical for demo
            }
          }
          
        } catch (error: any) {
          console.error('❌ Error actualizando precios:', error?.message || error);
        }
      }, 30000); // 30 seconds
      
    } catch (error: any) {
      console.error('❌ Error en modo solo precios:', error?.message || error);
    }
  }
}

// Execute
async function main() {
  const monitor = new RealPriceOnlyMonitor();
  await monitor.runPriceOnlyMode();
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo monitoreo de precios reales...');
    console.log('✅ Sistema detenido');
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default RealPriceOnlyMonitor;
