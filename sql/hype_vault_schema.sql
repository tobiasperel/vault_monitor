-- HYPE Vault Monitoring Database Schema
-- Execute these commands in your Supabase SQL editor

-- Vault metrics table for storing real-time vault data
CREATE TABLE IF NOT EXISTS vault_metrics (
    id SERIAL PRIMARY KEY,
    vault_address TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_staked BIGINT NOT NULL DEFAULT 0,
    total_borrowed BIGINT NOT NULL DEFAULT 0,
    leverage_ratio DECIMAL(10,4) NOT NULL DEFAULT 0,
    health_factor DECIMAL(10,6) NOT NULL DEFAULT 0,
    current_apy DECIMAL(8,6) NOT NULL DEFAULT 0,
    liquidation_price DECIMAL(18,8) NOT NULL DEFAULT 0,
    risk_score INTEGER NOT NULL DEFAULT 0
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_vault_metrics_vault_timestamp 
ON vault_metrics(vault_address, timestamp DESC);

-- Price data table for HYPE and stHYPE
CREATE TABLE IF NOT EXISTS price_data (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hype_price DECIMAL(18,8) NOT NULL DEFAULT 0,
    sthype_price DECIMAL(18,8) NOT NULL DEFAULT 0,
    sthype_hype_ratio DECIMAL(12,8) NOT NULL DEFAULT 0,
    volume_24h BIGINT DEFAULT 0,
    price_change_24h DECIMAL(8,4) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_price_data_timestamp 
ON price_data(timestamp DESC);

-- User positions table
CREATE TABLE IF NOT EXISTS user_positions (
    id SERIAL PRIMARY KEY,
    vault_address TEXT NOT NULL,
    user_address TEXT NOT NULL,
    shares BIGINT NOT NULL DEFAULT 0,
    deposited_amount BIGINT NOT NULL DEFAULT 0,
    current_value BIGINT NOT NULL DEFAULT 0,
    unrealized_pnl BIGINT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(vault_address, user_address)
);

CREATE INDEX IF NOT EXISTS idx_user_positions_vault_user 
ON user_positions(vault_address, user_address);

-- Loop executions table for tracking strategy operations
CREATE TABLE IF NOT EXISTS loop_executions (
    id SERIAL PRIMARY KEY,
    vault_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    execution_type TEXT NOT NULL, -- 'increase_leverage', 'decrease_leverage', 'rebalance'
    hype_amount_processed BIGINT DEFAULT 0,
    sthype_amount_processed BIGINT DEFAULT 0,
    leverage_ratio_before DECIMAL(10,4) DEFAULT 0,
    leverage_ratio_after DECIMAL(10,4) DEFAULT 0,
    gas_used BIGINT DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_loop_executions_vault_timestamp 
ON loop_executions(vault_address, timestamp DESC);

-- Alerts table for risk monitoring
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    vault_address TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
    message TEXT NOT NULL,
    trigger_value DECIMAL(18,8) DEFAULT 0,
    threshold DECIMAL(18,8) DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_vault_timestamp 
ON alerts(vault_address, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_severity 
ON alerts(severity, resolved);

-- Performance snapshots table for historical analysis
CREATE TABLE IF NOT EXISTS performance_snapshots (
    id SERIAL PRIMARY KEY,
    vault_address TEXT NOT NULL,
    date DATE NOT NULL,
    total_value_locked BIGINT NOT NULL DEFAULT 0,
    share_price DECIMAL(18,8) NOT NULL DEFAULT 0,
    daily_return DECIMAL(8,6) DEFAULT 0,
    weekly_return DECIMAL(8,6) DEFAULT 0,
    monthly_return DECIMAL(8,6) DEFAULT 0,
    apr DECIMAL(8,6) DEFAULT 0,
    apy DECIMAL(8,6) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    max_drawdown DECIMAL(8,6) DEFAULT 0,
    volatility DECIMAL(8,6) DEFAULT 0,
    UNIQUE(vault_address, date)
);

CREATE INDEX IF NOT EXISTS idx_performance_snapshots_vault_date 
ON performance_snapshots(vault_address, date DESC);

-- Transaction logs table for detailed tracking
CREATE TABLE IF NOT EXISTS transaction_logs (
    id SERIAL PRIMARY KEY,
    vault_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    transaction_type TEXT NOT NULL, -- 'deposit', 'withdraw', 'loop', 'rebalance'
    user_address TEXT,
    asset_address TEXT,
    amount BIGINT DEFAULT 0,
    shares BIGINT DEFAULT 0,
    gas_used BIGINT DEFAULT 0,
    gas_price BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'success' -- 'success', 'failed', 'pending'
);

CREATE INDEX IF NOT EXISTS idx_transaction_logs_vault_timestamp 
ON transaction_logs(vault_address, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_logs_tx_hash 
ON transaction_logs(tx_hash);

-- Monitoring errors table for debugging
CREATE TABLE IF NOT EXISTS monitoring_errors (
    id SERIAL PRIMARY KEY,
    vault_address TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_monitoring_errors_timestamp 
ON monitoring_errors(timestamp DESC);

-- Strategy parameters table for tracking configuration changes
CREATE TABLE IF NOT EXISTS strategy_parameters (
    id SERIAL PRIMARY KEY,
    vault_address TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    parameter_value TEXT NOT NULL,
    previous_value TEXT,
    changed_by TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tx_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_strategy_parameters_vault_name 
ON strategy_parameters(vault_address, parameter_name);

-- Create views for common queries

-- Latest vault status view
CREATE OR REPLACE VIEW latest_vault_status AS
SELECT DISTINCT ON (vault_address)
    vault_address,
    total_staked,
    total_borrowed,
    leverage_ratio,
    health_factor,
    current_apy,
    liquidation_price,
    risk_score,
    timestamp
FROM vault_metrics
ORDER BY vault_address, timestamp DESC;

-- Active alerts view
CREATE OR REPLACE VIEW active_alerts AS
SELECT *
FROM alerts
WHERE resolved = FALSE
ORDER BY severity DESC, timestamp DESC;

-- Daily performance summary view
CREATE OR REPLACE VIEW daily_performance AS
SELECT 
    vault_address,
    date,
    total_value_locked,
    daily_return,
    apr,
    apy,
    risk_score,
    (SELECT COUNT(*) FROM alerts a WHERE a.vault_address = ps.vault_address 
     AND DATE(a.timestamp) = ps.date AND a.severity = 'critical') as critical_alerts_count
FROM performance_snapshots ps
ORDER BY vault_address, date DESC;

-- User position summary view
CREATE OR REPLACE VIEW user_position_summary AS
SELECT 
    vault_address,
    user_address,
    shares,
    current_value,
    unrealized_pnl,
    CASE 
        WHEN unrealized_pnl > 0 THEN 'profit'
        WHEN unrealized_pnl < 0 THEN 'loss'
        ELSE 'neutral'
    END as pnl_status,
    (current_value - deposited_amount) as total_pnl,
    ((current_value::DECIMAL / NULLIF(deposited_amount, 0)) - 1) * 100 as pnl_percentage,
    last_updated
FROM user_positions
WHERE is_active = TRUE
ORDER BY current_value DESC;

-- Loop execution success rate view
CREATE OR REPLACE VIEW loop_execution_stats AS
SELECT 
    vault_address,
    execution_type,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE success = TRUE) as successful_executions,
    COUNT(*) FILTER (WHERE success = FALSE) as failed_executions,
    ROUND(
        (COUNT(*) FILTER (WHERE success = TRUE)::DECIMAL / COUNT(*)) * 100, 2
    ) as success_rate_percentage,
    AVG(gas_used) as avg_gas_used,
    DATE_TRUNC('day', timestamp) as date
FROM loop_executions
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY vault_address, execution_type, DATE_TRUNC('day', timestamp)
ORDER BY vault_address, date DESC;

-- Grants for security (adjust based on your needs)
-- Grant SELECT permissions to your application user
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT INSERT, UPDATE ON vault_metrics, price_data, user_positions, alerts TO your_app_user;

-- Insert initial configuration
INSERT INTO strategy_parameters (vault_address, parameter_name, parameter_value, changed_by) VALUES
('placeholder_vault_address', 'max_leverage_ratio', '3.0', 'system'),
('placeholder_vault_address', 'liquidation_threshold', '1.2', 'system'),
('placeholder_vault_address', 'warning_threshold', '1.5', 'system'),
('placeholder_vault_address', 'rebalance_threshold', '0.1', 'system'),
('placeholder_vault_address', 'monitoring_enabled', 'true', 'system')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'HYPE Vault monitoring database schema created successfully!' as status;
