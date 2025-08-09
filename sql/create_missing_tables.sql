-- ====================================
-- SCRIPT SQL PARA CREAR TABLAS FALTANTES
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ====================================

-- 1. CORE METRICS TABLE (TABLA PRINCIPAL DE LA CONSIGNA)
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
  
  -- Métricas adicionales para análisis
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

-- 2. RISK ASSESSMENTS TABLE
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

-- 3. VAULT HEALTH TABLE
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

-- 4. MONITORING ERRORS TABLE
CREATE TABLE IF NOT EXISTS monitoring_errors (
  id BIGSERIAL PRIMARY KEY,
  vault_address TEXT,
  error_message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRICE HISTORY TABLE (para volatilidad)
CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  token_symbol TEXT NOT NULL,
  price DECIMAL(10,4) NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices adicionales para performance
CREATE INDEX IF NOT EXISTS idx_risk_assessments_vault ON risk_assessments(vault_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_health_vault ON vault_health(vault_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_errors_timestamp ON monitoring_errors(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_token_timestamp ON price_history(token_symbol, timestamp DESC);

-- ====================================
-- INSERTAR DATOS DE EJEMPLO (OPCIONAL)
-- ====================================

-- Ejemplo de precios históricos para HYPE
INSERT INTO price_history (token_symbol, price, source, timestamp) VALUES 
('HYPE', 41.25, 'CoinGecko', NOW() - INTERVAL '1 hour'),
('HYPE', 41.50, 'CoinGecko', NOW() - INTERVAL '30 minutes'),
('HYPE', 41.32, 'CoinGecko', NOW())
ON CONFLICT DO NOTHING;

-- ====================================
-- VERIFICACIÓN
-- ====================================

-- Verificar que todas las tablas existen
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'core_vault_metrics', 
      'vault_metrics', 
      'price_data', 
      'risk_assessments', 
      'vault_health', 
      'alerts', 
      'monitoring_errors'
    ) THEN '✅ Requerida'
    ELSE '📊 Adicional'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name LIKE '%_vault%' 
  OR table_name LIKE '%risk%'
  OR table_name LIKE '%price%'
  OR table_name LIKE '%alert%'
  OR table_name LIKE '%monitoring%'
ORDER BY status DESC, table_name;
