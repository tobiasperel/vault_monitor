// Dashboard JavaScript

// API endpoint base URL
const API_BASE_URL = 'http://localhost:42069/api';

// Utility functions
function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleString();
}

function formatAmount(amount, decimals = 18) {
  if (!amount) return '0';
  const value = BigInt(amount) / BigInt(10 ** decimals);
  return value.toLocaleString('en-US', { 
    maximumFractionDigits: 6,
    minimumFractionDigits: 2
  });
}

// Fetch data functions
async function fetchData(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    // Fetch vault status for summary cards
    const vaultStatus = await fetchData('vault-stats');
    if (vaultStatus) {
      document.getElementById('total-assets').textContent = formatAmount(vaultStatus.totalAssets);
      document.getElementById('total-shares').textContent = formatAmount(vaultStatus.totalShares);
    }
    
    // Fetch user positions
    const userPositions = await fetchData('user-positions');
    if (userPositions) {
      document.getElementById('active-users').textContent = userPositions.length;
    }
    
    // Fetch risk metrics
    const riskMetrics = await fetchData('risk-metrics');
    if (riskMetrics && riskMetrics.length > 0) {
      const latestRisk = riskMetrics[0];
      document.getElementById('risk-score').textContent = latestRisk.liquidationRisk ? 
        `${parseFloat(latestRisk.liquidationRisk).toFixed(1)}%` : 'N/A';
      
      // Populate risk metrics table
      populateRiskMetricsTable(riskMetrics);
      
      // Create risk chart
      createRiskChart(riskMetrics);
    }
    
    // Fetch vaults
    const vaults = await fetchData('vaults');
    if (vaults) {
      populateVaultsTable(vaults);
    }
    
    // Fetch deposits
    const deposits = await fetchData('deposits');
    if (deposits) {
      populateDepositsTable(deposits);
    }
    
    // Fetch strategy executions
    const strategies = await fetchData('strategy-executions');
    if (strategies) {
      populateStrategiesTable(strategies);
    }
    
    // Fetch asset prices
    const prices = await fetchData('asset-prices');
    if (prices) {
      populatePricesTable(prices);
      createPriceChart(prices);
    }
    
    // Create asset chart
    if (vaults && vaults.length > 0) {
      createAssetChart(vaults);
    }
    
    // Create strategy chart
    if (strategies && strategies.length > 0) {
      createStrategyChart(strategies);
    }
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Table population functions
function populateVaultsTable(vaults) {
  const tableBody = document.getElementById('vaults-table');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (vaults.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No vaults found</td></tr>';
    return;
  }
  
  vaults.forEach(vault => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatAddress(vault.id)}</td>
      <td>${formatAmount(vault.totalAssets)}</td>
      <td>${formatAmount(vault.totalShares)}</td>
      <td>${formatTimestamp(vault.lastUpdatedTimestamp)}</td>
      <td>
        <button class="btn btn-sm btn-primary">View</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function populateDepositsTable(deposits) {
  const tableBody = document.getElementById('deposits-table');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (deposits.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No deposits found</td></tr>';
    return;
  }
  
  deposits.forEach(deposit => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatAddress(deposit.txHash)}</td>
      <td>${formatAddress(deposit.receiver)}</td>
      <td>${formatAddress(deposit.depositAsset)}</td>
      <td>${formatAmount(deposit.depositAmount)}</td>
      <td>${formatAmount(deposit.shareAmount)}</td>
      <td>${formatTimestamp(deposit.timestamp)}</td>
    `;
    tableBody.appendChild(row);
  });
}

function populateStrategiesTable(strategies) {
  const tableBody = document.getElementById('strategies-table');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (strategies.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No strategy executions found</td></tr>';
    return;
  }
  
  strategies.forEach(strategy => {
    const statusClass = strategy.successful ? 'status-success' : 'status-danger';
    const statusText = strategy.successful ? 'Success' : 'Failed';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${strategy.strategyName}</td>
      <td>${formatAddress(strategy.executor)}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>${formatTimestamp(strategy.timestamp)}</td>
      <td>
        <button class="btn btn-sm btn-info">Details</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function populateRiskMetricsTable(metrics) {
  const tableBody = document.getElementById('risk-metrics-table');
  if (!tableBody || !metrics.length) return;
  
  tableBody.innerHTML = '';
  
  const latestMetric = metrics[0];
  
  // Add collateral ratio
  const crRow = document.createElement('tr');
  const crValue = parseFloat(latestMetric.collateralRatio);
  let crStatus = 'status-success';
  if (crValue < 1.5) crStatus = 'status-danger';
  else if (crValue < 2) crStatus = 'status-warning';
  
  crRow.innerHTML = `
    <td>Collateral Ratio</td>
    <td>${crValue.toFixed(2)}x</td>
    <td><span class="status-badge ${crStatus}">${crStatus.replace('status-', '')}</span></td>
  `;
  tableBody.appendChild(crRow);
  
  // Add liquidation price
  const lpRow = document.createElement('tr');
  const currentPrice = parseFloat(latestMetric.currentPrice);
  const liquidationPrice = parseFloat(latestMetric.liquidationPrice);
  const priceDiff = ((currentPrice - liquidationPrice) / currentPrice) * 100;
  
  let lpStatus = 'status-success';
  if (priceDiff < 10) lpStatus = 'status-danger';
  else if (priceDiff < 25) lpStatus = 'status-warning';
  
  lpRow.innerHTML = `
    <td>Liquidation Price</td>
    <td>$${liquidationPrice.toFixed(2)}</td>
    <td><span class="status-badge ${lpStatus}">${priceDiff.toFixed(0)}% buffer</span></td>
  `;
  tableBody.appendChild(lpRow);
  
  // Add APY
  const apyRow = document.createElement('tr');
  const apy = parseFloat(latestMetric.apy) || 0;
  
  let apyStatus = 'status-warning';
  if (apy > 15) apyStatus = 'status-success';
  else if (apy < 5) apyStatus = 'status-danger';
  
  apyRow.innerHTML = `
    <td>Current APY</td>
    <td>${apy.toFixed(2)}%</td>
    <td><span class="status-badge ${apyStatus}">${apyStatus.replace('status-', '')}</span></td>
  `;
  tableBody.appendChild(apyRow);
  
  // Add profit/loss
  const plRow = document.createElement('tr');
  const pl = parseFloat(latestMetric.profitLoss) || 0;
  
  let plStatus = 'status-warning';
  if (pl > 0) plStatus = 'status-success';
  else if (pl < 0) plStatus = 'status-danger';
  
  plRow.innerHTML = `
    <td>Profit/Loss</td>
    <td>${pl > 0 ? '+' : ''}${pl.toFixed(2)}%</td>
    <td><span class="status-badge ${plStatus}">${plStatus.replace('status-', '')}</span></td>
  `;
  tableBody.appendChild(plRow);
}

function populatePricesTable(prices) {
  const tableBody = document.getElementById('prices-table');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  if (prices.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No price data found</td></tr>';
    return;
  }
  
  // Group by asset
  const assetPrices = {};
  prices.forEach(price => {
    if (!assetPrices[price.asset]) {
      assetPrices[price.asset] = price;
    }
  });
  
  Object.values(assetPrices).forEach(price => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatAddress(price.asset)}</td>
      <td>$${parseFloat(price.price).toFixed(2)}</td>
      <td>-</td>
      <td>${price.source || 'Unknown'}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Chart creation functions
function createAssetChart(vaults) {
  const ctx = document.getElementById('assetChart');
  if (!ctx) return;
  
  const labels = vaults.map(vault => formatAddress(vault.id));
  const data = vaults.map(vault => formatAmount(vault.totalAssets, 18));
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Assets',
        data: data,
        backgroundColor: '#4e73df',
        borderColor: '#4e73df',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value;
            }
          }
        }
      }
    }
  });
}

function createStrategyChart(strategies) {
  const ctx = document.getElementById('strategyChart');
  if (!ctx) return;
  
  // Group strategies by name
  const strategyGroups = {};
  strategies.forEach(strategy => {
    if (!strategyGroups[strategy.strategyName]) {
      strategyGroups[strategy.strategyName] = {
        success: 0,
        fail: 0
      };
    }
    
    if (strategy.successful) {
      strategyGroups[strategy.strategyName].success++;
    } else {
      strategyGroups[strategy.strategyName].fail++;
    }
  });
  
  const labels = Object.keys(strategyGroups);
  const successData = labels.map(name => strategyGroups[name].success);
  const failData = labels.map(name => strategyGroups[name].fail);
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Success',
          data: successData,
          backgroundColor: '#1cc88a',
          borderColor: '#1cc88a',
          borderWidth: 1
        },
        {
          label: 'Fail',
          data: failData,
          backgroundColor: '#e74a3b',
          borderColor: '#e74a3b',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          stacked: false
        },
        x: {
          stacked: false
        }
      }
    }
  });
}

function createRiskChart(metrics) {
  const ctx = document.getElementById('riskChart');
  if (!ctx || !metrics.length) return;
  
  // Sort metrics by timestamp (oldest to newest)
  const sortedMetrics = [...metrics].sort((a, b) => a.timestamp - b.timestamp);
  
  const labels = sortedMetrics.map(m => formatTimestamp(m.timestamp));
  const collateralRatios = sortedMetrics.map(m => parseFloat(m.collateralRatio) || 0);
  const liquidationRisks = sortedMetrics.map(m => parseFloat(m.liquidationRisk) || 0);
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Collateral Ratio',
          data: collateralRatios,
          backgroundColor: 'rgba(78, 115, 223, 0.05)',
          borderColor: 'rgba(78, 115, 223, 1)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: 'rgba(78, 115, 223, 1)',
          pointBorderColor: '#fff',
          pointHoverRadius: 5,
          fill: true,
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: 'Liquidation Risk',
          data: liquidationRisks,
          backgroundColor: 'rgba(231, 74, 59, 0.05)',
          borderColor: 'rgba(231, 74, 59, 1)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: 'rgba(231, 74, 59, 1)',
          pointBorderColor: '#fff',
          pointHoverRadius: 5,
          fill: true,
          tension: 0.1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Collateral Ratio'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Liquidation Risk (%)'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

function createPriceChart(prices) {
  const ctx = document.getElementById('priceChart');
  if (!ctx || !prices.length) return;
  
  // Group by asset and sort by timestamp
  const assetGroups = {};
  prices.forEach(price => {
    if (!assetGroups[price.asset]) {
      assetGroups[price.asset] = [];
    }
    assetGroups[price.asset].push(price);
  });
  
  // Process each asset's prices
  const datasets = [];
  const colors = ['#4e73df', '#1cc88a', '#f6c23e', '#e74a3b', '#36b9cc'];
  
  let i = 0;
  Object.entries(assetGroups).forEach(([asset, assetPrices]) => {
    // Sort by timestamp
    const sortedPrices = assetPrices.sort((a, b) => a.timestamp - b.timestamp);
    
    // Get color for this asset
    const color = colors[i % colors.length];
    i++;
    
    datasets.push({
      label: formatAddress(asset),
      data: sortedPrices.map(p => ({
        x: formatTimestamp(p.timestamp),
        y: parseFloat(p.price)
      })),
      backgroundColor: `${color}33`,
      borderColor: color,
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointHoverRadius: 5,
      fill: true,
      tension: 0.1
    });
  });
  
  new Chart(ctx, {
    type: 'line',
    data: {
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Loading dashboard data...');
  loadDashboardData();
  
  // Refresh data every 60 seconds
  setInterval(loadDashboardData, 60000);
}); 