#!/usr/bin/env node

/**
 * SISTEMA DE MONITOREO EN TIEMPO REAL
 * SIN SIMULACIONES - SOLO DATOS REALES
 * Actualización continua y automática
 */

import HypeVaultRiskMonitor from '../src/scripts/hypeVaultMonitor.js';

async function startRealTimeMonitoring() {
  console.log('🚀 ======================================');
  console.log('📊 SISTEMA DE MONITOREO EN TIEMPO REAL');
  console.log('❌ SIN SIMULACIONES');
  console.log('❌ SIN MOCKS');
  console.log('✅ SOLO DATOS REALES');
  console.log('⏰ ACTUALIZACIÓN AUTOMÁTICA');
  console.log('🚀 ======================================');

  try {
    const monitor = new HypeVaultRiskMonitor();
    
    console.log('🔧 Configurando conexiones...');
    console.log('🌐 Conectando a Base Chain (8453)...');
    console.log('💾 Conectando a Supabase...');
    console.log('📊 Conectando APIs de precios reales...');
    
    // Start continuous monitoring
    await monitor.startContinuousMonitoring();
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Deteniendo monitoreo...');
      console.log('✅ Sistema de monitoreo detenido');
      process.exit(0);
    });
    
    // Prevent process from exiting
    setInterval(() => {
      // Just keep alive
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error crítico en el sistema de monitoreo:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startRealTimeMonitoring().catch(console.error);
}

export default startRealTimeMonitoring;
