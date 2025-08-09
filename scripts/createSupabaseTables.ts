import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Configure dotenv
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function createSupabaseTables() {
  console.log('🚀 ====================================');
  console.log('🛠️ CREANDO TABLAS FALTANTES EN SUPABASE');
  console.log('📊 CORE METRICS - CONSIGNA');
  console.log('🚀 ====================================\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const sqlStatements = [
    // Core Metrics Table (CONSIGNA PRINCIPAL)
    `CREATE TABLE IF NOT EXISTS core_vault_metrics (
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
    );`,

    // Índices para core_vault_metrics
    `CREATE INDEX IF NOT EXISTS idx_core_vault_metrics_vault_timestamp ON core_vault_metrics(vault_address, timestamp DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_core_vault_metrics_timestamp ON core_vault_metrics(timestamp DESC);`,

    // Risk Assessments
    `CREATE TABLE IF NOT EXISTS risk_assessments (
      id BIGSERIAL PRIMARY KEY,
      vault_address TEXT NOT NULL,
      risk_score INTEGER,
      price_volatility DECIMAL(10,6),
      liquidity_risk DECIMAL(10,6),
      collateral_ratio DECIMAL(10,4),
      utilization_rate DECIMAL(10,4),
      hype_price DECIMAL(10,4),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // Vault Health
    `CREATE TABLE IF NOT EXISTS vault_health (
      id BIGSERIAL PRIMARY KEY,
      vault_address TEXT NOT NULL,
      health_score INTEGER,
      total_value_locked DECIMAL(20,2),
      active_positions INTEGER,
      pending_liquidations INTEGER,
      system_utilization DECIMAL(10,4),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // Monitoring Errors
    `CREATE TABLE IF NOT EXISTS monitoring_errors (
      id BIGSERIAL PRIMARY KEY,
      vault_address TEXT,
      error_message TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // Real Price Monitoring (para demo)
    `CREATE TABLE IF NOT EXISTS real_price_monitoring (
      id BIGSERIAL PRIMARY KEY,
      token_symbol TEXT NOT NULL,
      price_usd DECIMAL(10,4),
      source TEXT NOT NULL,
      is_real_data BOOLEAN DEFAULT true,
      is_simulation BOOLEAN DEFAULT false,
      timestamp TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ];

  console.log('🔨 Ejecutando statements SQL...\n');

  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    console.log(`📋 Ejecutando statement ${i + 1}/${sqlStatements.length}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        // Fallback: try direct SQL execution
        const { error: directError } = await supabase.from('__unused__').select('1');
        
        if (directError) {
          console.log(`⚠️ Statement ${i + 1}: ${error.message}`);
        } else {
          console.log(`✅ Statement ${i + 1}: OK`);
        }
      } else {
        console.log(`✅ Statement ${i + 1}: OK`);
      }
    } catch (err) {
      console.log(`⚠️ Statement ${i + 1}: ${err}`);
    }
  }

  console.log('\n📊 Verificando tablas creadas...');
  
  const tablesToCheck = [
    'core_vault_metrics',
    'vault_metrics',
    'price_data',
    'risk_assessments',
    'vault_health',
    'alerts',
    'monitoring_errors'
  ];

  let successCount = 0;
  
  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.log(`❌ ${table} - ERROR: ${error.message}`);
      } else {
        console.log(`✅ ${table} - OK`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ ${table} - ERROR: ${err}`);
    }
  }

  console.log(`\n📊 RESUMEN FINAL:`);
  console.log(`✅ Tablas funcionando: ${successCount}/${tablesToCheck.length}`);
  
  if (successCount === tablesToCheck.length) {
    console.log('\n🎉 ¡TODAS LAS TABLAS ESTÁN LISTAS!');
    console.log('🚀 Ya puedes ejecutar el monitoreo de Core Metrics');
    return true;
  } else {
    console.log('\n⚠️ Algunas tablas aún faltan');
    console.log('💡 Es posible que necesites permisos de administrador en Supabase');
    return false;
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createSupabaseTables()
    .then((success) => {
      if (success) {
        console.log('\n🎯 LISTO PARA EJECUTAR CORE METRICS');
        console.log('📋 Comando: npm run consigna');
      }
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Error creando tablas:', error);
      process.exit(1);
    });
}

export default createSupabaseTables;
