import { CronJob } from 'cron';
import calculateRiskMetrics from './riskAggregator';
import 'dotenv/config';

// Define job schedule intervals
const PRICE_UPDATE_INTERVAL = '*/15 * * * *'; // Every 15 minutes
const RISK_METRICS_INTERVAL = '*/30 * * * *'; // Every 30 minutes

/**
 * Start the scheduled jobs for data fetching and processing
 */
function startScheduledJobs() {
  console.log('Setting up scheduled jobs...');
  
  // Job for calculating risk metrics
  const riskJob = new CronJob(
    RISK_METRICS_INTERVAL,
    async () => {
      try {
        console.log(`[${new Date().toISOString()}] Running risk metrics calculation job...`);
        await calculateRiskMetrics();
      } catch (error) {
        console.error('Error in risk metrics job:', error);
      }
    },
    null, // onComplete
    true, // start immediately
    'UTC'
  );
  
  console.log(`Price data job scheduled: ${PRICE_UPDATE_INTERVAL}`);
  console.log(`Risk metrics job scheduled: ${RISK_METRICS_INTERVAL}`);
  
  // Return the job instances so they can be managed elsewhere if needed
  return { riskJob };
}

// Start the jobs if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting scheduled jobs service...');
  startScheduledJobs();
  
  // Keep the process alive
  process.stdin.resume();
  
  console.log('Jobs are running. Press Ctrl+C to exit.');
  
  // Handle clean shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down scheduled jobs...');
    process.exit();
  });
}

export default startScheduledJobs; 