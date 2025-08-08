import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Configure dotenv with the path to the .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface VaultMetrics {
  totalStaked: number;
  totalBorrowed: number;
  leverageRatio: number;
  healthFactor: number;
  currentAPY: number;
  liquidationPrice: number;
  riskScore: number;
}

interface PriceData {
  hypePrice: number;
  stHypePrice: number;
  stHypeHypeRatio: number;
  timestamp: number;
}

class HypeVaultRiskMonitor {
  private supabase;
  private vaultAddress: string;
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.vaultAddress = process.env.HYPE_VAULT_ADDRESS!;
  }

  async fetchPriceData(): Promise<PriceData> {
    try {
      // Using mock data since real APIs are not available yet
      console.log('Fetching price data (using mock data)...');
      
      // Mock price data for development
      const mockPriceData: PriceData = {
        hypePrice: 1.0, // Mock HYPE price in USD
        stHypePrice: 1.05, // Mock stHYPE price in USD (slightly higher due to staking rewards)
        stHypeHypeRatio: 1.05, // stHYPE/HYPE ratio
        timestamp: Date.now()
      };
      
      console.log('Price data fetched:', mockPriceData);
      return mockPriceData;
    } catch (error) {
      console.error('Error fetching price data:', error);
      // Return mock data even on error for development
      return {
        hypePrice: 1.0,
        stHypePrice: 1.05,
        stHypeHypeRatio: 1.05,
        timestamp: Date.now()
      };
    }
  }

  async fetchVaultMetrics(): Promise<VaultMetrics> {
    try {
      // These would be actual contract calls to your vault
      // Replace with your specific contract interaction logic
      
      // Example using viem or ethers.js:
      // const vaultContract = new ethers.Contract(this.vaultAddress, vaultABI, provider);
      // const totalStaked = await vaultContract.totalStaked();
      // const totalBorrowed = await vaultContract.totalBorrowed();
      
      // For now, returning placeholder values
      const totalStaked = 1000000; // USD value
      const totalBorrowed = 500000; // USD value
      const leverageRatio = totalStaked / (totalStaked - totalBorrowed);
      const collateralRatio = totalStaked / totalBorrowed;
      const healthFactor = collateralRatio * 0.8; // Assuming 80% liquidation threshold
      
      // Calculate APY based on staking rewards and borrowing costs
      const stakingAPY = 0.08; // 8% from staking
      const borrowingCost = 0.05; // 5% borrowing cost
      const currentAPY = (stakingAPY * leverageRatio) - (borrowingCost * (leverageRatio - 1));
      
      // Calculate liquidation price
      const liquidationPrice = this.calculateLiquidationPrice(totalStaked, totalBorrowed);
      
      // Calculate risk score (0-100)
      const riskScore = this.calculateRiskScore(healthFactor, leverageRatio);

      return {
        totalStaked,
        totalBorrowed,
        leverageRatio,
        healthFactor,
        currentAPY,
        liquidationPrice,
        riskScore
      };
    } catch (error) {
      console.error('Error fetching vault metrics:', error);
      throw error;
    }
  }

  calculateLiquidationPrice(totalStaked: number, totalBorrowed: number): number {
    // Calculate the stHYPE price at which liquidation would occur
    // This depends on your specific liquidation threshold
    const liquidationThreshold = 0.8; // 80%
    return (totalBorrowed / totalStaked) / liquidationThreshold;
  }

  calculateRiskScore(healthFactor: number, leverageRatio: number): number {
    let score = 100; // Start with perfect score
    
    // Penalize low health factor
    if (healthFactor < 1.1) score -= 50;
    else if (healthFactor < 1.3) score -= 30;
    else if (healthFactor < 1.5) score -= 15;
    else if (healthFactor < 2.0) score -= 5;
    
    // Penalize high leverage
    if (leverageRatio > 3.5) score -= 40;
    else if (leverageRatio > 3.0) score -= 25;
    else if (leverageRatio > 2.5) score -= 15;
    else if (leverageRatio > 2.0) score -= 5;
    
    return Math.max(0, score);
  }

  async storeMetrics(vaultMetrics: VaultMetrics, priceData: PriceData) {
    const timestamp = new Date().toISOString();
    
    try {
      // Store vault metrics
      await this.supabase.from('vault_metrics').insert({
        vault_address: this.vaultAddress,
        timestamp,
        total_staked: vaultMetrics.totalStaked,
        total_borrowed: vaultMetrics.totalBorrowed,
        leverage_ratio: vaultMetrics.leverageRatio,
        health_factor: vaultMetrics.healthFactor,
        current_apy: vaultMetrics.currentAPY,
        liquidation_price: vaultMetrics.liquidationPrice,
        risk_score: vaultMetrics.riskScore
      });

      // Store price data
      await this.supabase.from('price_data').insert({
        timestamp,
        hype_price: priceData.hypePrice,
        sthype_price: priceData.stHypePrice,
        sthype_hype_ratio: priceData.stHypeHypeRatio
      });

      // Check for alerts
      await this.checkAlerts(vaultMetrics);
      
      console.log(`Metrics stored successfully at ${timestamp}`);
    } catch (error) {
      console.error('Error storing metrics:', error);
      throw error;
    }
  }

  async checkAlerts(metrics: VaultMetrics) {
    const alerts = [];
    
    // Critical health factor
    if (metrics.healthFactor < 1.2) {
      alerts.push({
        vault_address: this.vaultAddress,
        alert_type: 'liquidation_risk',
        severity: metrics.healthFactor < 1.1 ? 'critical' : 'warning',
        message: `Health factor critically low: ${metrics.healthFactor.toFixed(3)}`,
        trigger_value: metrics.healthFactor,
        threshold: 1.2,
        timestamp: new Date().toISOString()
      });
    }
    
    // High leverage
    if (metrics.leverageRatio > 3.0) {
      alerts.push({
        vault_address: this.vaultAddress,
        alert_type: 'high_leverage',
        severity: metrics.leverageRatio > 3.5 ? 'critical' : 'warning',
        message: `Leverage ratio very high: ${metrics.leverageRatio.toFixed(2)}x`,
        trigger_value: metrics.leverageRatio,
        threshold: 3.0,
        timestamp: new Date().toISOString()
      });
    }
    
    // Low or negative yield
    if (metrics.currentAPY < 0.02) { // Less than 2% APY
      alerts.push({
        vault_address: this.vaultAddress,
        alert_type: 'low_yield',
        severity: metrics.currentAPY < 0 ? 'critical' : 'warning',
        message: `APY below expected threshold: ${(metrics.currentAPY * 100).toFixed(2)}%`,
        trigger_value: metrics.currentAPY,
        threshold: 0.02,
        timestamp: new Date().toISOString()
      });
    }

    if (alerts.length > 0) {
      await this.supabase.from('alerts').insert(alerts);
      console.log(`${alerts.length} alert(s) generated`);
      
      // Send notifications if configured
      await this.sendNotifications(alerts);
    }
  }

  async sendNotifications(alerts: any[]) {
    // Implement notification logic (Discord, Slack, email, etc.)
    for (const alert of alerts) {
      console.log(`${alert.severity.toUpperCase()}: ${alert.message}`);
      
      // Example: Send to Discord webhook
      if (process.env.DISCORD_WEBHOOK_URL) {
        try {
          await axios.post(process.env.DISCORD_WEBHOOK_URL, {
            content: `**${alert.severity.toUpperCase()} ALERT**\n${alert.message}\nVault: ${alert.vault_address}`
          });
        } catch (error) {
          console.error('Failed to send Discord notification:', error);
        }
      }
    }
  }

  async run() {
    try {
      console.log('Starting HYPE vault risk monitoring...');
      
      const [vaultMetrics, priceData] = await Promise.all([
        this.fetchVaultMetrics(),
        this.fetchPriceData()
      ]);
      
      console.log('Vault Metrics:');
      console.log(`  Total Staked: $${vaultMetrics.totalStaked.toLocaleString()}`);
      console.log(`  Total Borrowed: $${vaultMetrics.totalBorrowed.toLocaleString()}`);
      console.log(`  Leverage Ratio: ${vaultMetrics.leverageRatio.toFixed(2)}x`);
      console.log(`  Health Factor: ${vaultMetrics.healthFactor.toFixed(3)}`);
      console.log(`  Current APY: ${(vaultMetrics.currentAPY * 100).toFixed(2)}%`);
      console.log(`  Risk Score: ${vaultMetrics.riskScore}/100`);
      
      console.log('Price Data:');
      console.log(`  HYPE Price: $${priceData.hypePrice.toFixed(4)}`);
      console.log(`  stHYPE Price: $${priceData.stHypePrice.toFixed(4)}`);
      console.log(`  stHYPE/HYPE Ratio: ${priceData.stHypeHypeRatio.toFixed(6)}`);
      
      await this.storeMetrics(vaultMetrics, priceData);
      
    } catch (error) {
      console.error('Error in risk monitoring:', error);
      
      // Store error for debugging
      await this.supabase.from('monitoring_errors').insert({
        vault_address: this.vaultAddress,
        error_message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Run the monitoring
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new HypeVaultRiskMonitor();
  monitor.run().catch(console.error);
}

export default HypeVaultRiskMonitor;
