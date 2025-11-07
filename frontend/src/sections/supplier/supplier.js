/**
 * Supplier Section
 * Handles supplier table, chart, and related functionality
 */

class SupplierSection {
  constructor() {
    this.chartInstance = null;
    this.tableData = [];
    this.paginationManager = null;
  }

  /**
   * Initialize the Supplier section
   */
  initialize() {
    this.setupEventListeners();
    this.initializePagination();
    this.initializeChart();
  }

  /**
   * Setup event listeners for the section
   */
  setupEventListeners() {
    // Chart action buttons
    const viewDetailsBtn = document.getElementById('btnViewDetailsSup');
    const downloadBtn = document.getElementById('btnDownloadSup');
    const backBtn = document.getElementById('supplierBackBtn');

    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', () => this.showDetails());
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadData());
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.goBack());
    }
  }

  /**
   * Initialize pagination for the supplier table
   */
  initializePagination() {
    if (!window.paginationManagers) {
      window.paginationManagers = {};
    }

    this.paginationManager = new TablePaginationManager(
      'supplier',
      (pageData, allData) => this.renderTableContent(pageData, allData)
    );
    this.paginationManager.initialize('supplierPagination');
    
    window.paginationManagers['supplier'] = this.paginationManager;
  }

  /**
   * Initialize the supplier chart
   */
  initializeChart() {
    const canvas = document.getElementById('supplierChart');
    if (!canvas) {
      console.warn('Supplier chart canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    this.chartInstance = new Chart(ctx, this.getChartConfig());
  }

  /**
   * Get chart configuration for supplier chart
   */
  getChartConfig() {
    return {
      type: 'bar',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                return `Supplier: ${context[0].label}`;
              },
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Suppliers'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Demand Count'
            },
            beginAtZero: true
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            this.handleChartClick(elements[0]);
          }
        }
      }
    };
  }

  /**
   * Render supplier table with filtered data
   */
  renderTable(data) {
    if (!Array.isArray(data)) {
      console.warn('⚠️ renderSupplierTable: data not array');
      return;
    }

    // Process data for supplier table
    const supplierData = this.processSupplierData(data);
    
    // Set data and render using pagination manager
    if (this.paginationManager) {
      this.paginationManager.setData(supplierData);
      this.paginationManager.renderTable();
    }

    // Show the section
    const supplierSection = document.getElementById('section-supplier');
    if (supplierSection) {
      supplierSection.classList.remove('d-none');
    }
  }

  /**
   * Process raw data into supplier table format
   */
  processSupplierData(data) {
    const years = new Set();
    const supplierData = new Map();

    data.forEach(program => {
      program.configs.forEach(cfg => {
        (cfg.esns || []).forEach(esn => {
          const y = this.getYearFromDate(esn.targetShipDate);
          if (y) {
            // Only include years that match the year filter (if active)
            if (window.dataFilterManager.filters.years.size > 0) {
              if (window.dataFilterManager.filters.years.has(y)) {
                years.add(y);
              }
            } else {
              years.add(y);
            }
          }
        });

        // Extract suppliers from level1Parts
        (cfg.level1Parts || []).forEach(l1 => {
          if (l1.supplier) {
            const key = l1.supplier;
            
            // Apply supplier filter at item level if active
            if (window.dataFilterManager.filters.suppliers.size > 0) {
              if (!window.dataFilterManager.filters.suppliers.has(key)) {
                return; // Skip this supplier if it doesn't match the filter
              }
            }
            
            if (!supplierData.has(key)) {
              // Generate sample Level 1 PN and Description if not available
              const samplePN = l1.partNumber || `PN-${l1.supplier.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
              const sampleDesc = l1.description || `${l1.supplier} Component Assembly`;
              supplierData.set(key, { 
                supplier: l1.supplier, 
                level1PN: samplePN, 
                description: sampleDesc, 
                yearCounts: {} 
              });
            }
            const supplierInfo = supplierData.get(key);

            // Count ESNs by year for this supplier part
            const esnCountsByYear = {};
            (cfg.esns || []).forEach(esn => {
              const y = this.getYearFromDate(esn.targetShipDate);
              if (y) {
                // Only count years that match the year filter (if active)
                const shouldIncludeYear = window.dataFilterManager.filters.years.size === 0 || 
                                         window.dataFilterManager.filters.years.has(y);
                if (shouldIncludeYear) {
                  if (!esnCountsByYear[y]) esnCountsByYear[y] = 0;
                  esnCountsByYear[y]++;
                }
              }
            });
            
            // Add this part's demand (ESN count * QPE) to the supplier's year totals
            Object.keys(esnCountsByYear).forEach(y => {
              if (!supplierInfo.yearCounts[y]) supplierInfo.yearCounts[y] = 0;
              supplierInfo.yearCounts[y] += esnCountsByYear[y] * (l1.qpe || 1);
            });
          }
        });
      });
    });

    return Array.from(supplierData.values());
  }

  /**
   * Render table content for pagination
   */
  renderTableContent(data, allData) {
    const supplierSection = document.getElementById('section-supplier');
    if (!supplierSection) return;

    let tbody = supplierSection.querySelector('tbody');
    if (!tbody) {
      const table = supplierSection.querySelector('table');
      if (table) {
        tbody = document.createElement('tbody');
        table.appendChild(tbody);
      }
    }
    if (!tbody) return;
    tbody.innerHTML = '';

    // Collect all years dynamically from ALL data
    const years = new Set();
    allData.forEach(supplierInfo => {
      Object.keys(supplierInfo.yearCounts).forEach(year => years.add(year));
    });
    const yearList = Array.from(years).sort();

    // Render table header
    const table = supplierSection.querySelector('table');
    if (table) {
      let thead = table.querySelector('thead');
      if (!thead) {
        thead = document.createElement('thead');
        table.insertBefore(thead, table.firstChild);
      }
      thead.innerHTML = `<tr><th>Suppliers</th><th>Level 1 PN</th><th>Description</th>${yearList.map(y => `<th>${y}</th>`).join('')}</tr>`;
    }

    // Render rows for current page data only
    data.forEach(supplierInfo => {
      const yearValues = yearList.map(y => supplierInfo.yearCounts[y] || 0);
      tbody.innerHTML += `<tr><td>${supplierInfo.supplier}</td><td>${supplierInfo.level1PN}</td><td>${supplierInfo.description}</td>${yearValues.map(v => `<td>${v}</td>`).join('')}</tr>`;
    });
  }

  /**
   * Update chart with supplier data
   */
  updateChart(data = null) {
    if (!this.chartInstance) return;

    const chartData = data || this.getSupplierChartData();
    const processedData = this.processChartData(chartData);
    
    this.chartInstance.data = processedData;
    this.chartInstance.update('none');
  }

  /**
   * Get supplier chart data
   */
  getSupplierChartData() {
    // Get data from the centralized data manager
    if (window.dataFilterManager) {
      return window.dataFilterManager.getFilteredData();
    }
    return [];
  }

  /**
   * Process data for chart visualization
   */
  processChartData(data) {
    // Process supplier data for chart
    const supplierCounts = new Map();
    
    data.forEach(program => {
      program.configs.forEach(cfg => {
        (cfg.level1Parts || []).forEach(l1 => {
          if (l1.supplier) {
            const count = supplierCounts.get(l1.supplier) || 0;
            supplierCounts.set(l1.supplier, count + 1);
          }
        });
      });
    });

    const labels = Array.from(supplierCounts.keys()).slice(0, 10); // Top 10
    const values = labels.map(label => supplierCounts.get(label));

    return {
      labels: labels,
      datasets: [{
        label: 'Supplier Count',
        data: values,
        backgroundColor: '#FF6B35',
        borderColor: '#FF6B35',
        borderWidth: 1
      }]
    };
  }

  /**
   * Handle chart click events
   */
  handleChartClick(element) {
    const label = this.chartInstance.data.labels[element.index];
    console.log('Supplier chart clicked:', label);
    
    // Show supplier type modal or drill down
    if (typeof showSupplierTypeModal === 'function') {
      showSupplierTypeModal(label);
    }
  }

  /**
   * Show details modal
   */
  showDetails() {
    console.log('Showing supplier details...');
    // Implementation for showing detailed view
  }

  /**
   * Download supplier data
   */
  downloadData() {
    console.log('Downloading supplier data...');
    // Implementation for data export
  }

  /**
   * Go back functionality
   */
  goBack() {
    console.log('Going back from supplier view...');
  }

  /**
   * Utility function to extract year from date
   */
  getYearFromDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    return parts.length >= 3 ? parts[2] : null;
  }

  /**
   * Subscribe to data changes
   */
  subscribeToDataChanges() {
    if (window.dataFilterManager) {
      return window.dataFilterManager.subscribe((filteredData) => {
        this.renderTable(filteredData);
        this.updateChart(filteredData);
      });
    }
  }

  /**
   * Destroy the section
   */
  destroy() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }
}

// Export for use in other modules
window.SupplierSection = SupplierSection;