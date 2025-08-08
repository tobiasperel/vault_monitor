import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.API_PORT || 3001;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

app.use(cors());
app.use(express.json());

// API Routes for HYPE Vault Monitoring

// Get current vault status
app.get('/api/vault/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vault_metrics')
      .select('*')
      .eq('vault_address', process.env.HYPE_VAULT_ADDRESS)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) throw error;

    res.json({
      success: true,
      data: data[0] || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get vault metrics history
app.get('/api/vault/metrics', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    let hours = 24;
    if (timeframe === '1h') hours = 1;
    else if (timeframe === '7d') hours = 168;
    else if (timeframe === '30d') hours = 720;

    const fromTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('vault_metrics')
      .select('*')
      .eq('vault_address', process.env.HYPE_VAULT_ADDRESS)
      .gte('timestamp', fromTime)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data,
      timeframe,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get price data
app.get('/api/prices', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    let hours = 24;
    if (timeframe === '1h') hours = 1;
    else if (timeframe === '7d') hours = 168;
    else if (timeframe === '30d') hours = 720;

    const fromTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('price_data')
      .select('*')
      .gte('timestamp', fromTime)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data,
      timeframe,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user positions
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_positions')
      .select('*')
      .eq('vault_address', process.env.HYPE_VAULT_ADDRESS)
      .order('shares', { ascending: false });

    if (error) throw error;

    // Calculate additional metrics
    const totalShares = data.reduce((sum, user) => sum + (user.shares || 0), 0);
    const enrichedData = data.map(user => ({
      ...user,
      percentage: totalShares > 0 ? ((user.shares || 0) / totalShares) * 100 : 0
    }));

    res.json({
      success: true,
      data: enrichedData,
      totalUsers: data.length,
      totalShares
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get active alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('vault_address', process.env.HYPE_VAULT_ADDRESS)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Group alerts by severity
    const groupedAlerts = {
      critical: data.filter(alert => alert.severity === 'critical'),
      warning: data.filter(alert => alert.severity === 'warning'),
      info: data.filter(alert => alert.severity === 'info')
    };

    res.json({
      success: true,
      data,
      grouped: groupedAlerts,
      counts: {
        critical: groupedAlerts.critical.length,
        warning: groupedAlerts.warning.length,
        info: groupedAlerts.info.length,
        total: data.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get loop execution history
app.get('/api/loops', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('loop_executions')
      .select('*')
      .eq('vault_address', process.env.HYPE_VAULT_ADDRESS)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Calculate success rate
    const successfulExecutions = data.filter(exec => exec.success).length;
    const successRate = data.length > 0 ? (successfulExecutions / data.length) * 100 : 0;

    res.json({
      success: true,
      data,
      metrics: {
        totalExecutions: data.length,
        successfulExecutions,
        failedExecutions: data.length - successfulExecutions,
        successRate: successRate.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get yield analysis
app.get('/api/yield', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    let hours = 168; // 7 days
    if (timeframe === '24h') hours = 24;
    else if (timeframe === '30d') hours = 720;

    const fromTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('vault_metrics')
      .select('timestamp, current_apy, total_staked, total_borrowed, leverage_ratio')
      .eq('vault_address', process.env.HYPE_VAULT_ADDRESS)
      .gte('timestamp', fromTime)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    if (data.length === 0) {
      return res.json({
        success: true,
        data: [],
        metrics: { averageAPY: 0, currentAPY: 0, yieldVolatility: 0 }
      });
    }

    // Calculate yield metrics
    const apyValues = data.map(d => d.current_apy).filter(apy => apy !== null);
    const averageAPY = apyValues.reduce((sum, apy) => sum + apy, 0) / apyValues.length;
    const currentAPY = data[data.length - 1]?.current_apy || 0;
    
    // Calculate volatility (standard deviation)
    const variance = apyValues.reduce((sum, apy) => sum + Math.pow(apy - averageAPY, 2), 0) / apyValues.length;
    const yieldVolatility = Math.sqrt(variance);

    res.json({
      success: true,
      data,
      metrics: {
        averageAPY: (averageAPY * 100).toFixed(2) + '%',
        currentAPY: (currentAPY * 100).toFixed(2) + '%',
        yieldVolatility: (yieldVolatility * 100).toFixed(2) + '%',
        dataPoints: data.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Risk assessment endpoint
app.get('/api/risk', async (req, res) => {
  try {
    // Get latest metrics
    const { data: latestMetrics, error: metricsError } = await supabase
      .from('vault_metrics')
      .select('*')
      .eq('vault_address', process.env.HYPE_VAULT_ADDRESS)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (metricsError) throw metricsError;

    // Get recent alerts
    const { data: recentAlerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('vault_address', process.env.HYPE_VAULT_ADDRESS)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (alertsError) throw alertsError;

    const currentMetrics = latestMetrics[0];
    
    if (!currentMetrics) {
      return res.json({
        success: true,
        riskLevel: 'unknown',
        score: 0,
        factors: [],
        alerts: recentAlerts
      });
    }

    // Analyze risk factors
    const riskFactors = [];
    let riskScore = 100;

    // Health factor analysis
    if (currentMetrics.health_factor < 1.2) {
      riskFactors.push({
        factor: 'Low Health Factor',
        severity: 'critical',
        value: currentMetrics.health_factor,
        threshold: 1.2,
        impact: 'High liquidation risk'
      });
      riskScore -= 40;
    } else if (currentMetrics.health_factor < 1.5) {
      riskFactors.push({
        factor: 'Moderate Health Factor',
        severity: 'warning',
        value: currentMetrics.health_factor,
        threshold: 1.5,
        impact: 'Elevated liquidation risk'
      });
      riskScore -= 20;
    }

    // Leverage analysis
    if (currentMetrics.leverage_ratio > 3.0) {
      riskFactors.push({
        factor: 'High Leverage',
        severity: 'warning',
        value: currentMetrics.leverage_ratio,
        threshold: 3.0,
        impact: 'Increased volatility and risk'
      });
      riskScore -= 15;
    }

    // Yield analysis
    if (currentMetrics.current_apy < 0.02) {
      riskFactors.push({
        factor: 'Low Yield',
        severity: currentMetrics.current_apy < 0 ? 'critical' : 'warning',
        value: currentMetrics.current_apy,
        threshold: 0.02,
        impact: 'Strategy underperforming'
      });
      riskScore -= currentMetrics.current_apy < 0 ? 30 : 10;
    }

    // Determine overall risk level
    let riskLevel = 'low';
    if (riskScore < 30) riskLevel = 'critical';
    else if (riskScore < 50) riskLevel = 'high';
    else if (riskScore < 70) riskLevel = 'medium';

    res.json({
      success: true,
      riskLevel,
      score: Math.max(0, riskScore),
      factors: riskFactors,
      alerts: recentAlerts,
      currentMetrics: {
        healthFactor: currentMetrics.health_factor,
        leverageRatio: currentMetrics.leverage_ratio,
        currentAPY: (currentMetrics.current_apy * 100).toFixed(2) + '%',
        totalStaked: currentMetrics.total_staked,
        totalBorrowed: currentMetrics.total_borrowed
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    service: 'HYPE Vault Monitor API',
    version: '1.0.0'
  });
});

// Start server
app.listen(port, () => {
  console.log(`HYPE Vault Monitor API running on port ${port}`);
  console.log(`Dashboard available at http://localhost:${port}/api/health`);
});

export default app;
