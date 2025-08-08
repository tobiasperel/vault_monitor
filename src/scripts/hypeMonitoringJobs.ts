#!/usr/bin/env node

import HypeVaultRiskMonitor from './hypeVaultMonitor.js';
import { CronJob } from 'cron';
import dotenv from 'dotenv';

dotenv.config();

console.log('Setting up HYPE Vault Monitoring Jobs...');

// Create monitoring instance
const monitor = new HypeVaultRiskMonitor();

// Price monitoring - every 2 minutes
const priceMonitorJob = new CronJob('*/2 * * * *', async () => {
  console.log('Running price monitoring...');
  try {
    await monitor.run();
  } catch (error) {
    console.error('Price monitoring failed:', error);
  }
});

// Risk assessment - every 5 minutes
const riskMonitorJob = new CronJob('*/5 * * * *', async () => {
  console.log('Running risk assessment...');
  try {
    await monitor.run();
  } catch (error) {
    console.error('Risk monitoring failed:', error);
  }
});

// Loop efficiency analysis - every 15 minutes
const loopAnalysisJob = new CronJob('*/15 * * * *', async () => {
  console.log('Running loop efficiency analysis...');
  try {
    // This would analyze recent loop executions and their efficiency
    // Implementation depends on your specific vault contracts
    console.log('Loop analysis completed (placeholder)');
  } catch (error) {
    console.error('Loop analysis failed:', error);
  }
});

// Daily performance report - every day at 8 AM
const dailyReportJob = new CronJob('0 8 * * *', async () => {
  console.log('Generating daily performance report...');
  try {
    // Generate and potentially send daily performance summary
    console.log('Daily report generated (placeholder)');
  } catch (error) {
    console.error('Daily report failed:', error);
  }
});

// Start all jobs
console.log('Starting monitoring jobs...');

priceMonitorJob.start();
riskMonitorJob.start();
loopAnalysisJob.start();
dailyReportJob.start();

console.log('All monitoring jobs started successfully!');
console.log('Active jobs:');
console.log('  - Price monitoring: Every 2 minutes');
console.log('  - Risk assessment: Every 5 minutes');
console.log('  - Loop analysis: Every 15 minutes');
console.log('  - Daily reports: Every day at 8 AM');

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nStopping monitoring jobs...');
  
  priceMonitorJob.stop();
  riskMonitorJob.stop();
  loopAnalysisJob.stop();
  dailyReportJob.stop();
  
  console.log('All jobs stopped. Goodbye!');
  process.exit(0);
});
