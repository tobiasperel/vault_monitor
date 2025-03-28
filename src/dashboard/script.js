// Dashboard JavaScript

// Check if we're in a browser environment
const isBrowser = typeof document !== 'undefined';

// Utility functions
function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return "-";
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatAddress(address) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp * 1000).toLocaleString();
}

function formatEth(wei) {
  if (!wei) return "0";
  return (Number(wei) / 1e18).toFixed(4);
}

// API Functions
async function fetchData(query) {
  try {
    console.log('Attempting to fetch from GraphQL endpoint... Query:', query.trim().substring(0, 100) + '...');
    
    const response = await fetch('http://localhost:3002/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      console.error(`GraphQL response not OK: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('GraphQL response received:', data);
    
    if (data.errors) {
      console.error('GraphQL errors:', JSON.stringify(data.errors));
      showErrorMessage(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
      return null;
    }
    
    if (!data.data) {
      console.error('No data returned from GraphQL');
      showErrorMessage('No data returned from GraphQL');
      return null;
    }
    
    console.log('Successfully fetched data:', JSON.stringify(data.data).substring(0, 200) + '...');
    return data.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

// Show error message on dashboard
function showErrorMessage(message) {
  if (!isBrowser) return;
  
  const errorContainer = document.getElementById('error-container');
  if (!errorContainer) {
    // Create error container if it doesn't exist
    const main = document.querySelector('main');
    if (main) {
      const container = document.createElement('div');
      container.id = 'error-container';
      container.className = 'alert alert-danger mt-3 mb-3';
      container.style.display = 'none';
      main.prepend(container);
    }
  }
  
  const container = document.getElementById('error-container');
  if (container) {
    // Create message if doesn't exist already
    if (!container.textContent.includes(message)) {
      const errorElement = document.createElement('div');
      errorElement.textContent = message;
      container.appendChild(errorElement);
      
      // Add reload button if not present
      if (!container.querySelector('button')) {
        const reloadButton = document.createElement('button');
        reloadButton.className = 'btn btn-sm btn-danger mt-2';
        reloadButton.textContent = 'Reload Data';
        reloadButton.addEventListener('click', () => {
          container.style.display = 'none';
          container.innerHTML = '';
          loadDashboardData();
        });
        container.appendChild(reloadButton);
      }
    }
    
    container.style.display = 'block';
  }
}

// Clear error messages
function clearErrorMessages() {
  if (!isBrowser) return;
  
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.style.display = 'none';
    errorContainer.innerHTML = '';
  }
}

// Update last updated timestamp
function updateLastUpdated() {
  if (!isBrowser) return;
  
  const lastUpdatedElement = document.getElementById('last-updated');
  if (lastUpdatedElement) {
    const now = new Date();
    lastUpdatedElement.textContent = `Last updated: ${now.toLocaleString()}`;
  }
}

// Calculate and update risk metrics
function updateRiskMetrics(loans = []) {
  if (!isBrowser) return;
  
  // Calculate average health factor
  let totalHealthFactor = 0;
  let loansNearLiquidation = 0;
  let totalCollateral = 0;
  
  if (loans.length > 0) {
    loans.forEach(loan => {
      const healthFactor = Number(loan.healthFactor) || 0;
      totalHealthFactor += healthFactor;
      
      // Count loans with health factor < 1.2 as near liquidation
      if (healthFactor > 0 && healthFactor < 1) {
        loansNearLiquidation++;
      }
      
      totalCollateral += Number(loan.collateralAmount) || 0;
    });
    
    const avgHealthFactor = totalHealthFactor / loans.length;
    
    // Update UI elements
    document.getElementById('avg-health-factor').textContent = formatNumber(avgHealthFactor);
    document.getElementById('loans-near-liquidation').textContent = loansNearLiquidation;
    document.getElementById('total-collateral').textContent = formatEth(totalCollateral.toString());
    
    // Update risk score based on metrics
    let riskLevel = "Low";
    let riskClass = "bg-success";
    let riskWidth = "25%";
    
    if (loansNearLiquidation > 0 || avgHealthFactor < 1.5) {
      riskLevel = "High";
      riskClass = "bg-danger";
      riskWidth = "75%";
    } else if (avgHealthFactor < 2.0) {
      riskLevel = "Medium";
      riskClass = "bg-warning";
      riskWidth = "50%";
    }
    
    const riskBar = document.getElementById('risk-score-bar');
    if (riskBar) {
      riskBar.className = `progress-bar ${riskClass}`;
      riskBar.style.width = riskWidth;
      riskBar.textContent = riskLevel;
      
      document.getElementById('risk-score').textContent = riskLevel;
    }
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    // Clear previous errors
    clearErrorMessages();
    
    if (isBrowser) {
      // Update loading state
      document.querySelectorAll('tbody').forEach(tbody => {
        if (tbody.children.length === 0 || 
            (tbody.children.length === 1 && tbody.children[0].textContent.includes('No data'))) {
          tbody.innerHTML = '<tr><td colspan="10" class="text-center">Loading data...</td></tr>';
        }
      });

      // Load all data in parallel
      await Promise.all([
        loadVaults(),
        loadVaultEvents(),
        loadVaultUsers(),
        loadLoans(),
        loadLoanEvents()
      ]);
      
      // Create charts
      createVaultActivityChart();
      createLoanHealthChart();
      
      // Update last updated timestamp
      updateLastUpdated();
    }
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Data loading functions
async function loadVaults() {
  const query = `
    query {
      vaultEntitys {
        items {
          id
          totalAssets
          totalShares
          depositCount
          withdrawCount
          userCount
          lastEventTimestamp
        }
      }
    }
  `;
  
  const data = await fetchData(query);
  if (!data || !isBrowser) return;
  
  const vaults = data.vaultEntitys.items;
  const vaultsTable = document.getElementById('vaults-table');
  
  if (!vaultsTable) return;
  
  if (vaults.length === 0) {
    vaultsTable.innerHTML = '<tr><td colspan="7" class="text-center">No vaults found</td></tr>';
    return;
  }
  
  vaultsTable.innerHTML = '';
  
  vaults.forEach(vault => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatAddress(vault.id)}</td>
      <td>${formatEth(vault.totalAssets)}</td>
      <td>${Number(vault.totalShares / 1e26).toFixed(0)}</td>
      <td>${vault.depositCount}</td>
      <td>${vault.withdrawCount}</td>
      <td>${vault.userCount}</td>
      <td>${formatTimestamp(vault.lastEventTimestamp)}</td>
    `;
    vaultsTable.appendChild(row);
  });
  
  // Update summary cards
  if (vaults.length > 0) {
    document.getElementById('total-assets').textContent = formatEth(vaults[0].totalAssets);
    document.getElementById('total-shares').textContent = Number(vaults[0].totalShares / 1e26).toFixed(0);
    document.getElementById('active-users').textContent = vaults[0].userCount;
    // Update risk score or other metrics if available
    document.getElementById('risk-score').textContent = "Low";  // Placeholder
    
    // Update outstanding debt in summary card
    const outstandingDebtElement = document.getElementById('outstanding-debt');
    if (outstandingDebtElement) {
      outstandingDebtElement.textContent = "0"; // Will be updated by loadLoans
    }
  }
}

async function loadVaultEvents() {
  const query = `
    query {
      vaultEventEntitys(orderBy: "timestamp", limit: 10) {
        items {
          id
          transactionHash
          vaultAddress
          eventType
          user
          amount
          shares
          timestamp
        }
      }
    }
  `;
  
  const data = await fetchData(query);
  if (!data || !isBrowser) return;
  
  const events = data.vaultEventEntitys?.items || [];
  const eventsTable = document.getElementById('vault-events-table');
  
  if (!eventsTable) return;
  
  if (events.length === 0) {
    eventsTable.innerHTML = '<tr><td colspan="7" class="text-center">No events found</td></tr>';
    return;
  }
  
  eventsTable.innerHTML = '';
  
  events.forEach(event => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatAddress(event.transactionHash)}</td>
      <td>${formatAddress(event.vaultAddress)}</td>
      <td>${event.eventType}</td>
      <td>${formatAddress(event.user)}</td>
      <td>${formatEth(event.amount)}</td>
      <td>${Number(event.shares / 1e26).toFixed(0)}</td>
      <td>${formatTimestamp(event.timestamp)}</td>
    `;
    eventsTable.appendChild(row);
  });
}

async function loadVaultUsers() {
  const query = `
    query {
      vaultUserEntitys(orderBy: "shares", limit: 10) {
        items {
          id
          userAddress
          vaultAddress
          shares
          depositCount
          withdrawCount
          lastActionTimestamp
          unlockTime
          isActive
        }
      }
    }
  `;
  
  const data = await fetchData(query);
  if (!data || !isBrowser) return;
  
  const users = data.vaultUserEntitys?.items || [];
  const usersTable = document.getElementById('vault-users-table');
  
  if (!usersTable) return;
  
  if (users.length === 0) {
    usersTable.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
    return;
  }
  
  usersTable.innerHTML = '';
  
  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatAddress(user.userAddress)}</td>
      <td>${formatAddress(user.vaultAddress)}</td>
      <td>${Number(user.shares / 1e26).toFixed(0)}</td>
      <td>${user.depositCount}</td>
      <td>${user.withdrawCount}</td>
      <td>${formatTimestamp(user.lastActionTimestamp)}</td>
      <td>${'-'}</td>
    `;
    usersTable.appendChild(row);
  });
}

async function loadLoans() {
  const query = `
    query {
      loanEntitys(orderBy: "outstandingDebt", where : { troveId: "89525146906988220792411652990398345341068978671588796020019971138892647634396"}) {
        items {
          id
          borrowerAddress
          outstandingDebt
          collateralAmount
          healthFactor
          interestRate
          isActive
          lastEventType
          lastEventTimestamp
          troveId
        }
      }
    }
  `;
  
  const data = await fetchData(query);
  if (!data || !isBrowser) return;
  
  const loans = data.loanEntitys?.items || [];
  const loansTable = document.getElementById('loans-table');
  
  if (!loansTable) return;
  
  if (loans.length === 0) {
    loansTable.innerHTML = '<tr><td colspan="7" class="text-center">No loans found</td></tr>';
    return;
  }
  
  loansTable.innerHTML = '';
  
  loans.forEach(loan => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatAddress(loan.id)}</td>
      <td>${formatAddress(loan.troveId)}</td>
      <td>${formatEth(loan.outstandingDebt)}</td>
      <td>${formatEth(loan.collateralAmount)}</td>
      <td>${formatNumber(loan.healthFactor)}</td>
      <td>${formatNumber(loan.interestRate / 1e16)}%</td>
      <td>${loan.isActive ? 'Active' : 'Closed'}</td>
    `;
    loansTable.appendChild(row);
  });
  
  // Update outstanding debt in summary card
  if (loans.length > 0) {
    const totalDebt = loans.reduce((sum, loan) => sum + Number(loan.outstandingDebt || 0), 0);
    const outstandingDebtElement = document.getElementById('outstanding-debt');
    if (outstandingDebtElement) {
      outstandingDebtElement.textContent = formatEth(totalDebt.toString());
    }
    
    // Update risk metrics
    updateRiskMetrics(loans);
  }
}

async function loadLoanEvents() {
  const query = `
    query {
      loanEventEntitys(orderBy: "timestamp", where : { troveId: "89525146906988220792411652990398345341068978671588796020019971138892647634396"}) {
        items {
          id
          borrowerAddress
          transactionHash
          loanId
          eventType
          debtChange
          collateralChange
          healthFactorAfter
          timestamp
          troveId
        }
      }
    }
  `;
  
  const data = await fetchData(query);
  if (!data || !isBrowser) return;
  
  const events = data.loanEventEntitys?.items || [];
  const eventsTable = document.getElementById('loan-events-table');
  
  if (!eventsTable) return;
  
  if (events.length === 0) {
    eventsTable.innerHTML = '<tr><td colspan="7" class="text-center">No events found</td></tr>';
    return;
  }
  
  eventsTable.innerHTML = '';
  
  events.forEach(event => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatAddress(event.transactionHash)}</td>
      <td>${formatAddress(event.troveId)}</td>
      <td>${event.eventType}</td>
      <td>${formatEth(event.debtChange)}</td>
      <td>${formatEth(event.collateralChange)}</td>
      <td>${formatNumber(event.healthFactorAfter)}</td>
      <td>${formatTimestamp(event.timestamp)}</td>
    `;
    eventsTable.appendChild(row);
  });
}

// Chart creation
function createVaultActivityChart() {
  if (!isBrowser) return;
  
  const ctx = document.getElementById('vaultActivityChart');
  if (!ctx) return;
  
  const ctxContext = ctx.getContext('2d');
  
  // Sample data - will be replaced with real data
  new Chart(ctxContext, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Deposits',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }, {
        label: 'Withdrawals',
        data: [5, 10, 6, 2, 4, 7],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function createLoanHealthChart() {
  if (!isBrowser) return;
  
  const ctx = document.getElementById('loanHealthChart');
  if (!ctx) return;
  
  const ctxContext = ctx.getContext('2d');
  
  // Sample data - will be replaced with real data
  new Chart(ctxContext, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Average Health Factor',
        data: [2.5, 2.3, 2.1, 1.9, 2.0, 2.2],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        tension: 0.3
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

// Initialize dashboard
function initDashboard() {
  console.log('Loading dashboard data...');
  loadDashboardData();
  
  // Refresh data every 60 seconds
  setInterval(loadDashboardData, 60000);
  
  // Add refresh button event listener
  const refreshButton = document.getElementById('refresh-btn');
  if (refreshButton) {
    refreshButton.addEventListener('click', loadDashboardData);
  }
}

// Start dashboard when DOM is loaded (only in browser environment)
if (isBrowser) {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  // Node.js environment - export functions
  console.log('Dashboard script loaded in Node.js environment');
  
  // For CommonJS environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      loadDashboardData,
      formatAddress,
      formatTimestamp,
      formatEth
    };
  }
} 