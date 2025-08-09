#!/usr/bin/env node

/**
 * SCRIPT PARA VALIDAR TABLAS SUPABASE Y EJECUTAR CORE METRICS
 * Verifica que las tablas estén creadas y ejecuta monitoreo real
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function validateSupabaseTables() {
  console.log('🔍 VALIDANDO TABLAS DE SUPABASE...\n');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL o SUPABASE_SERVICE_KEY no configurados en .env');
    return false;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Tablas requeridas para Core Metrics según consigna
  const requiredTables = [
    'core_vault_metrics',  // Para Core Metrics principales
    'vault_metrics',       // Para métricas adicionales
    'price_data',          // Para datos de precios
    'risk_assessments',    // Para análisis de riesgo
    'vault_health',        // Para métricas de salud
    'alerts',              // Para alertas
    'monitoring_errors'    // Para errores
  ];

  console.log('📋 Verificando tablas requeridas:\n');

  const tableStatus: Record<string, boolean> = {};
  
  for (const table of requiredTables) {
    try {
      // Intentar hacer una consulta simple para verificar existencia
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        // Tabla no existe
        console.log(`❌ ${table} - NO EXISTE`);
        tableStatus[table] = false;
      } else if (error) {
        // Otro error (permisos, etc)
        console.log(`⚠️ ${table} - ERROR: ${error.message}`);
        tableStatus[table] = false;
      } else {
        // Tabla existe y accesible
        console.log(`✅ ${table} - OK`);
        tableStatus[table] = true;
      }
    } catch (err) {
      console.log(`❌ ${table} - ERROR DE CONEXIÓN`);
      tableStatus[table] = false;
    }
  }

  const allTablesExist = Object.values(tableStatus).every(status => status === true);
  
  console.log('\n📊 RESUMEN:');
  console.log(`✅ Tablas correctas: ${Object.values(tableStatus).filter(s => s).length}/${requiredTables.length}`);
  console.log(`❌ Tablas faltantes: ${Object.values(tableStatus).filter(s => !s).length}/${requiredTables.length}`);

  if (!allTablesExist) {
    console.log('\n🛠️ CREAR TABLAS FALTANTES:');
    console.log('Ejecuta estos comandos SQL en Supabase:');
    console.log(generateCreateTableSQL());
  }

  return allTablesExist;
}

function generateCreateTableSQL(): string {
  return `
-- Core Metrics Table (CONSIGNA PRINCIPAL)
CREATE TABLE IF NOT EXISTS core_vault_metrics (
  id BIGSERIAL PRIMARY KEY,
  vault_address TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Core Metrics según consigna "Monitoring & Reporting"
  total_vault_deposits_hype DECIMAL(20,8),
  total_vault_deposits_usd DECIMAL(20,2),
  sthype_collateral_in_felix DECIMAL(20,8),
  outstanding_hype_borrowed DECIMAL(20,8),
  net_annualized_yield_hype DECIMAL(10,6),
  
  -- Métricas adicionales
  total_staked DECIMAL(20,2),
  total_borrowed DECIMAL(20,2),
  leverage_ratio DECIMAL(10,4),
  health_factor DECIMAL(10,4),
  current_apy DECIMAL(10,6),
  liquidation_price DECIMAL(10,4),
  risk_score INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para core_vault_metrics
CREATE INDEX IF NOT EXISTS idx_core_vault_metrics_vault_timestamp ON core_vault_metrics(vault_address, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_core_vault_metrics_timestamp ON core_vault_metrics(timestamp DESC);

-- Vault Metrics (backward compatibility)
CREATE TABLE IF NOT EXISTS vault_metrics (
  id BIGSERIAL PRIMARY KEY,
  vault_address TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  total_staked DECIMAL(20,2),
  total_borrowed DECIMAL(20,2),
  leverage_ratio DECIMAL(10,4),
  health_factor DECIMAL(10,4),
  current_apy DECIMAL(10,6),
  liquidation_price DECIMAL(10,4),
  risk_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price Data
CREATE TABLE IF NOT EXISTS price_data (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  hype_price DECIMAL(10,4),
  sthype_price DECIMAL(10,4),
  sthype_hype_ratio DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
  id BIGSERIAL PRIMARY KEY,
  vault_address TEXT NOT NULL,
  risk_score INTEGER,
  price_volatility DECIMAL(10,6),
  liquidity_risk DECIMAL(10,6),
  collateral_ratio DECIMAL(10,4),
  utilization_rate DECIMAL(10,4),
  hype_price DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vault Health
CREATE TABLE IF NOT EXISTS vault_health (
  id BIGSERIAL PRIMARY KEY,
  vault_address TEXT NOT NULL,
  health_score INTEGER,
  total_value_locked DECIMAL(20,2),
  active_positions INTEGER,
  pending_liquidations INTEGER,
  system_utilization DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  vault_address TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  trigger_value DECIMAL(20,8),
  threshold DECIMAL(20,8),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monitoring Errors
CREATE TABLE IF NOT EXISTS monitoring_errors (
  id BIGSERIAL PRIMARY KEY,
  vault_address TEXT,
  error_message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real Price Monitoring (para demo)
CREATE TABLE IF NOT EXISTS real_price_monitoring (
  id BIGSERIAL PRIMARY KEY,
  token_symbol TEXT NOT NULL,
  price_usd DECIMAL(10,4),
  source TEXT NOT NULL,
  is_real_data BOOLEAN DEFAULT true,
  is_simulation BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;
}

// Función principal
async function main() {
  console.log('🚀 ====================================');
  console.log('📊 VALIDACIÓN DE TABLAS SUPABASE');
  console.log('📋 CORE METRICS - CONSIGNA');
  console.log('🚀 ====================================\n');

  const tablesValid = await validateSupabaseTables();
  
  if (tablesValid) {
    console.log('\n✅ TODAS LAS TABLAS ESTÁN DISPONIBLES');
    console.log('🚀 Ejecutando monitoreo con Core Metrics...\n');
    
    // Importar y ejecutar el monitor principal
    try {
      const { default: HypeVaultRiskMonitor } = await import('../src/scripts/hypeVaultMonitor.js');
      const monitor = new HypeVaultRiskMonitor();
      await monitor.run();
      
      console.log('\n✅ Core Metrics ejecutadas correctamente');
      console.log('📊 Datos almacenados en Supabase según consigna');
      
    } catch (error) {
      console.error('❌ Error ejecutando Core Metrics:', error);
    }
  } else {
    console.log('\n❌ FALTAN TABLAS EN SUPABASE');
    console.log('🛠️ Crear las tablas faltantes antes de continuar');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default validateSupabaseTables;
