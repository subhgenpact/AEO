/**
 * RM Supplier Section
 * Handles RM supplier table, chart, and related functionality
 */

class RMSupplierSection {
  constructor() {
    this.chartInstance = null;
    this.tableData = [];
    this.paginationManager = null;
  }

  /**
   * Initialize the RM Supplier section
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
    const viewDetailsBtn = document.getElementById('btnViewDetailsRM');
    const downloadBtn = document.getElementById('btnDownloadRM');
    const backBtn = document.getElementById('rmLevelBackBtn');

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
   * Initialize pagination for the RM supplier table
   */
  initializePagination() {
    if (!window.paginationManagers) {
      window.paginationManagers = {};
    }

    this.paginationManager = new TablePaginationManager(
      'rm-supplier',
      (pageData, allData) => this.renderTableContent(pageData, allData)
    );
    this.paginationManager.initialize('rmSupplierPagination');
    
    window.paginationManagers['rm-supplier'] = this.paginationManager;
  }

  /**
   * Initialize the RM supplier chart
   */
  initializeChart() {
    const canvas = document.getElementById('rmDetailChart');
    if (!canvas) {
      console.warn('RM Supplier chart canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    this.chartInstance = new Chart(ctx, this.getChartConfig());
  }

  /**
   * Get chart configuration for RM supplier chart
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
                return `RM Supplier: ${context[0].label}`;
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
              text: 'RM Suppliers'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Raw Material Count'
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
   * Render RM supplier table with filtered data
   */
  renderTable(data) {
    console.log('renderRMSupplierTable called with data length:', data?.length);
    
    if (!Array.isArray(data)) {
      console.warn('⚠️ renderRMSupplierTable: data not array');
      return;
    }

    // Process data for RM supplier table
    const rmSupplierData = this.processRMSupplierData(data);
    
    // Set data and render using pagination manager
    if (this.paginationManager) {
      this.paginationManager.setData(rmSupplierData);
      this.paginationManager.renderTable();
    }

    // Show the section
    const rmSection = document.getElementById('section-rm-supplier');
    if (rmSection) {
      rmSection.classList.remove('d-none');
    }

    // Debug logging for RM Supplier table
    console.log('RM Supplier Table Data:', {
      totalSuppliers: rmSupplierData.length,
      selectedFilters: window.selectedRMSuppliers ? Array.from(window.selectedRMSuppliers) : [],
      supplierDetails: rmSupplierData.map(s => ({
        rmSupplier: s.rmSupplier,
        level1PN: s.level1PN,
        description: s.description,
        yearCounts: s.yearCounts,
        total: Object.values(s.yearCounts).reduce((sum, val) => sum + val, 0)
      }))
    });
  }

  /**
   * Process raw data into RM supplier table format
   */
  processRMSupplierData(data) {
    const years = new Set();
    const rmSupplierData = new Map();

    const extractRMSuppliers = (parts, esns, level1PN, description) => {
      parts.forEach(part => {
        if (part.rmSupplier) {
          const key = part.rmSupplier;
          
          // Apply RM supplier filter at item level if active
          if (window.dataFilterManager.filters.rmSuppliers.size > 0) {
            if (!window.dataFilterManager.filters.rmSuppliers.has(key)) {
              return; // Skip this RM supplier if it doesn't match the filter
            }
          }

          if (!rmSupplierData.has(key)) {
            // Generate sample Level 1 PN and Description if not available
            const samplePN = level1PN || `RM-${key.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            const sampleDesc = description || `${key} Raw Material Component`;
            rmSupplierData.set(key, { 
              rmSupplier: key, 
              level1PN: samplePN, 
              description: sampleDesc, 
              yearCounts: {} 
            });
          }
          const rmInfo = rmSupplierData.get(key);

          esns.forEach(esn => {
            const y = this.getYearFromDate(esn.targetShipDate);
            if (y) {
              // Only include years that match the year filter (if active)
              const shouldIncludeYear = window.dataFilterManager.filters.years.size === 0 || 
                                       window.dataFilterManager.filters.years.has(y);
              if (shouldIncludeYear) {
                years.add(y);
                if (!rmInfo.yearCounts[y]) rmInfo.yearCounts[y] = 0;
                rmInfo.yearCounts[y]++;
              }
            }
          });
        }

        // Recursively check nested parts
        if (part.level2Parts) extractRMSuppliers(part.level2Parts, esns, level1PN, description);
        if (part.level3Parts) extractRMSuppliers(part.level3Parts, esns, level1PN, description);
        if (part.level4Parts) extractRMSuppliers(part.level4Parts, esns, level1PN, description);
        if (part.level5Parts) extractRMSuppliers(part.level5Parts, esns, level1PN, description);
      });
    };

    data.forEach(program => {
      program.configs.forEach(cfg => {
        (cfg.level1Parts || []).forEach(l1 => {
          extractRMSuppliers([l1], cfg.esns || [], l1.partNumber, l1.description);
        });
      });
    });

    return Array.from(rmSupplierData.values());
  }

  /**
   * Render table content for pagination
   */
  renderTableContent(data, allData) {
    const rmSection = document.getElementById('section-rm-supplier');
    if (!rmSection) return;

    let tbody = rmSection.querySelector('tbody');
    if (!tbody) {
      const table = rmSection.querySelector('table');
      if (table) {
        tbody = document.createElement('tbody');
        table.appendChild(tbody);
      }
    }
    if (!tbody) return;
    tbody.innerHTML = '';

    // Collect all years dynamically from ALL data
    const years = new Set();
    allData.forEach(rmInfo => {
      Object.keys(rmInfo.yearCounts).forEach(year => years.add(year));
    });
    const yearList = Array.from(years).sort();

    // Render table header
    const table = rmSection.querySelector('table');
    if (table) {
      let thead = table.querySelector('thead');
      if (!thead) {
        thead = document.createElement('thead');
        table.insertBefore(thead, table.firstChild);
      }
      thead.innerHTML = `<tr><th>RM Supplier</th><th>Level 1 PN</th><th>Description</th>${yearList.map(y => `<th>${y}</th>`).join('')}</tr>`;
    }

    // Render rows for current page data only
    data.forEach(rmInfo => {
      const yearValues = yearList.map(y => rmInfo.yearCounts[y] || 0);
      tbody.innerHTML += `<tr><td>${rmInfo.rmSupplier}</td><td>${rmInfo.level1PN}</td><td>${rmInfo.description}</td>${yearValues.map(v => `<td>${v}</td>`).join('')}</tr>`;
    });
  }

  /**
   * Update chart with RM supplier data
   */
  updateChart(data = null) {
    if (!this.chartInstance) return;

    const chartData = data || this.getRMSupplierChartData();
    const processedData = this.processChartData(chartData);
    
    this.chartInstance.data = processedData;
    this.chartInstance.update('none');
  }

  /**
   * Get RM supplier chart data
   */
  getRMSupplierChartData() {
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
    // Process RM supplier data for chart
    const rmSupplierCounts = new Map();
    
    const countRMSuppliers = (parts) => {
      parts.forEach(part => {
        if (part.rmSupplier) {
          const count = rmSupplierCounts.get(part.rmSupplier) || 0;
          rmSupplierCounts.set(part.rmSupplier, count + 1);
        }

        // Recursively check nested parts
        if (part.level2Parts) countRMSuppliers(part.level2Parts);
        if (part.level3Parts) countRMSuppliers(part.level3Parts);
        if (part.level4Parts) countRMSuppliers(part.level4Parts);
        if (part.level5Parts) countRMSuppliers(part.level5Parts);
      });
    };

    data.forEach(program => {
      program.configs.forEach(cfg => {
        (cfg.level1Parts || []).forEach(l1 => {
          countRMSuppliers([l1]);
        });
      });
    });

    const labels = Array.from(rmSupplierCounts.keys()).slice(0, 10); // Top 10
    const values = labels.map(label => rmSupplierCounts.get(label));

    return {
      labels: labels,
      datasets: [{
        label: 'RM Supplier Count',
        data: values,
        backgroundColor: '#004E89',
        borderColor: '#004E89',
        borderWidth: 1
      }]
    };
  }

  /**
   * Handle chart click events
   */
  handleChartClick(element) {
    const label = this.chartInstance.data.labels[element.index];
    console.log('RM Supplier chart clicked:', label);
    
    // Show raw material modal or drill down
    if (typeof showRawMaterialModal === 'function') {
      showRawMaterialModal(label);
    }
  }

  /**
   * Show details modal
   */
  showDetails() {
    console.log('Showing RM supplier details...');
    // Implementation for showing detailed view
  }

  /**
   * Download RM supplier data
   */
  downloadData() {
    console.log('Downloading RM supplier data...');
    // Implementation for data export
  }

  /**
   * Go back functionality
   */
  goBack() {
    console.log('Going back from RM supplier view...');
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
window.RMSupplierSection = RMSupplierSection;