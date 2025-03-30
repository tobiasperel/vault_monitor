// Dashboard JavaScript

// Check if we're in a browser environment
const isBrowser = typeof document !== 'undefined';
let historicalVaultEvents = [];
let historicalLoanEvents = [];

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
        loadLoanEvents(),
        loadL1Data(),
        // loadHlpTransactions()
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
      <td>${Number(vault.totalShares / 1e27).toFixed(0)}</td>
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
    document.getElementById('total-shares').textContent = Number(vaults[0].totalShares / 1e27).toFixed(0);
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
  historicalVaultEvents = events;
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
      loanEntitys(orderBy: "outstandingDebt", where : { borrowerAddress: "0xDd00059904ddF45e30b4131345957f76F26b8f6c"}) {
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
  historicalLoanEvents = loans;
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
      <td>${formatAddress(loan.troveId)}</td>
      <td>${formatEth(loan.outstandingDebt)}</td>
      <td>${formatEth(loan.collateralAmount)}</td>
      <td>${formatNumber(loan.healthFactor)}</td>
      <td>${formatNumber(loan.interestRate / 1e16)}%</td>
      <td>${loan.isActive ? 'Active' : 'Closed'}</td>
      <td>${formatTimestamp(loan.lastEventTimestamp)}</td>
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
      loanEventEntitys(orderBy: "timestamp", where : { borrowerAddress: "0xDd00059904ddF45e30b4131345957f76F26b8f6c"}) {
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

async function loadL1Data() {
  const query = `
    query {
      vaultEquitys(orderBy: "lastTimestamp", limit: 10) {
        items {
          id
          lastTimestamp
          equity
          withdrawableAmount
        }
      }
      vaultSpotBalances(orderBy: "lastTimestamp", limit: 10) {
        items {
          id
          lastTimestamp
          total
          hold
        }
      }
    }
  `;

  const data = await fetchData(query);
  if (!data || !isBrowser) return;

  const vaultEquitys = data.vaultEquitys?.items || [];
  const vaultSpotBalances = data.vaultSpotBalances?.items || [];

  if (vaultEquitys.length > 0) {
    const totalEquity = vaultEquitys.reduce((sum, item) => sum + Number(item.equity || 0), 0);
    document.getElementById('hlp-equity').textContent = Number(totalEquity / 1e7).toFixed(2);
  }

  if (vaultSpotBalances.length > 0) {
    const totalSpotBalance = vaultSpotBalances.reduce((sum, item) => sum + Number(item.total || 0), 0);
    document.getElementById('hlp-spot-balance').textContent = Number(totalSpotBalance / 1e9).toFixed(2);
  }

  const ctx = document.getElementById('vaultEquityChart');
  if (!ctx) return;

  const ctxContext = ctx.getContext('2d');

  new Chart(ctxContext, {
    type: 'line',
    data: {
      labels: vaultEquitys.map(item => new Date(Number(item.lastTimestamp)).getDate()),
      datasets: [{
        label: 'Equity',
        data: vaultEquitys.map(item => Number(item.equity / 1e6)),
        borderColor: 'rgba(75, 192, 192, 1)',
        fill: false
      }, {
        label: 'Withdrawable Amount',
        data: vaultEquitys.map(item => Number(item.withdrawableAmount / 1e6)),
        borderColor: 'rgba(255, 99, 132, 1)',
        fill: false
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

  const ctxSpotBalance = document.getElementById('vaultSpotBalanceChart');
  if (!ctxSpotBalance) return;

  const ctxSpotBalanceContext = ctxSpotBalance.getContext('2d');

  new Chart(ctxSpotBalanceContext, {
    type: 'bar',
    data: {
      labels: vaultSpotBalances.map(item => new Date(Number(item.lastTimestamp)).getDate()),
      datasets: [{
        label: 'Total',
        data: vaultSpotBalances.map(item => Number(item.total / 1e8)),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
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

async function loadHlpTransactions() {
  const query = `
    query {
      hlpTransactionEntitys(orderBy: "timestamp", limit: 10) {
        items {
          id
          transactionHash
          eventType
          amount
          timestamp
        }
      }
    }
  `;

  const data = await fetchData(query);
  if (!data || !isBrowser) return;

  const events = data.hlpTransactionEntitys?.items || [];
  const eventsTable = document.getElementById('hlp-events-table');

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
      <td>${event.eventType}</td>
      <td>${formatEth(event.amount)}</td>
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
      labels: 
        historicalVaultEvents.map(
          event => new Date(Number(event.timestamp * 1000)).getDate()
        ),
      datasets: [{
        label: 'Deposits',
        data: historicalVaultEvents.map(event => (event.eventType === 'deposit') ? Number(event.amount) / 1e18 : 0),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }, {
        label: 'Withdrawals',
        data: historicalVaultEvents.map(event => (event.eventType === 'withdraw') ? Number(event.amount) / 1e18 : 0),
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

  const labels = historicalLoanEvents.map(event => new Date(Number(event.lastEventTimestamp * 1000)).getDate());
  const data = historicalLoanEvents.map(event => Number(event.healthFactor) );
  labels.push(new Date().getDate());
  data.push(Number(historicalLoanEvents[historicalLoanEvents.length - 1].healthFactor));
  new Chart(ctxContext, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Average Health Factor',
        data: data,
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

// Theme Switching Logic
let themeToggle = null; 
let themeLabel = null;

if (isBrowser) { 
  themeToggle = document.getElementById('theme-toggle');
  themeLabel = document.querySelector('.theme-label');

  if (themeToggle) {
    themeToggle.addEventListener('change', toggleTheme);
  }
}

// Function to apply the theme
function applyTheme(theme) {
  if (!isBrowser) return;
  if (theme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.checked = true;
    if (themeLabel) themeLabel.textContent = 'Light Mode';
  } else {
    document.body.removeAttribute('data-theme');
    if (themeToggle) themeToggle.checked = false;
    if (themeLabel) themeLabel.textContent = 'Dark Mode';
  }
}

// Function to toggle theme and save preference
function toggleTheme() {
  if (!isBrowser) return;
  const currentTheme = document.body.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);
  applyTheme(newTheme);
}

// Load saved theme on initial page load
function loadTheme() {
  if (!isBrowser) return;
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
}

// Sidebar Navigation Interaction
function setupSidebarNavigation() {
  if (!isBrowser) return;

  const sidebarLinks = document.querySelectorAll('.sidebar .nav-link');
  const sections = document.querySelectorAll('main h2[id]'); // Get section headers with IDs

  if (!sidebarLinks.length || !sections.length) {
    console.warn('Sidebar links or main sections not found for interaction setup.');
    return;
  }

  // --- Smooth Scrolling on Click ---
  sidebarLinks.forEach(link => {
    link.addEventListener('click', function(event) {
      const href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        event.preventDefault(); // Prevent default jump
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // Optionally update URL hash without jumping (good for back button/history)
          // history.pushState(null, null, href);

          // Manually update active class immediately on click for snappier feel
          updateActiveLink(targetId);
        }
      }
    });
  });

  // --- Active Link Highlighting on Scroll (Intersection Observer) ---
  const observerOptions = {
    root: null, // Use the viewport as the root
    rootMargin: '0px',
    threshold: 0.4 // Trigger when 40% of the section is visible
  };

  const observerCallback = (entries) => {
    let visibleSectionId = null;
    // Find the section that is most visible or the first one intersecting from the top
     entries.forEach(entry => {
        if (entry.isIntersecting) {
           if (visibleSectionId === null || entry.boundingClientRect.top < document.getElementById(visibleSectionId).getBoundingClientRect().top) {
               visibleSectionId = entry.target.id;
           }
        }
     });

    // If scrolled to top or no section is sufficiently visible, default to dashboard? Or keep last active?
    // For now, only update if a section is clearly visible.
    if (visibleSectionId) {
         updateActiveLink(visibleSectionId);
    } else {
        // Check if scrolled near the top - activate Dashboard link
        if (window.scrollY < 200) {
             updateActiveLink('dashboard'); // Assuming top section doesn't have an ID or corresponds to dashboard
        }
        // Otherwise, keep the last active link highlighted when scrolling between sections
    }
  };

  const observer = new IntersectionObserver(observerCallback, observerOptions);

  sections.forEach(section => {
    observer.observe(section);
  });

  // --- Helper function to update active class ---
  function updateActiveLink(targetId) {
      sidebarLinks.forEach(link => {
          link.classList.remove('active');
          // Check if the link's href matches the target section ID
          // Handle the default Dashboard link special case (href="#")
          const linkHref = link.getAttribute('href');
          if ((linkHref === `#${targetId}`) || (targetId === 'dashboard' && linkHref === '#')) {
              link.classList.add('active');
          }
      });
  }

  // Set initial state (Dashboard link active)
  updateActiveLink('dashboard');

}

// Modify initDashboard to call the new setup function
function initDashboard() {
  console.log('Initializing dashboard...');
  if (isBrowser) {
    loadTheme(); // Load theme preferences first
    setupSidebarNavigation(); // Setup navigation interactions
  }

  console.log('Loading dashboard data...');
  loadDashboardData();
  
  // Refresh data every 60 seconds
  setInterval(loadDashboardData, 60000);
  
  // Add refresh button event listener (if it exists)
  const refreshButton = document.getElementById('refresh-btn');
  if (refreshButton) {
    refreshButton.addEventListener('click', loadDashboardData);
  }
}

// Start dashboard when DOM is loaded
if (isBrowser) {
  // Make sure initDashboard is called after DOM is ready
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