/**
 * HW Owner Section
 * Handles HW owner table, chart, and related functionality
 */

class HWOwnerSection {
  constructor() {
    this.chartInstance = null;
    this.tableData = [];
    this.paginationManager = null;
  }

  /**
   * Initialize the HW Owner section
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
    const viewDetailsBtn = document.getElementById('btnViewDetailsHW');
    const downloadBtn = document.getElementById('btnDownloadHW');

    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', () => this.showDetails());
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadData());
    }
  }

  /**
   * Initialize pagination for the HW owner table
   */
  initializePagination() {
    if (!window.paginationManagers) {
      window.paginationManagers = {};
    }

    this.paginationManager = new TablePaginationManager(
      'hw-owner',
      (pageData, allData) => this.renderTableContent(pageData, allData)
    );
    this.paginationManager.initialize('hwOwnerPagination');
    
    window.paginationManagers['hw-owner'] = this.paginationManager;
  }

  /**
   * Initialize the HW owner chart
   */
  initializeChart() {
    const canvas = document.getElementById('hwOwnerChart');
    if (!canvas) {
      console.warn('HW Owner chart canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    this.chartInstance = new Chart(ctx, this.getChartConfig());
  }

  /**
   * Get chart configuration for HW owner chart
   */
  getChartConfig() {
    return {
      type: 'doughnut',
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
            position: 'right'
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                return `HW Owner: ${context[0].label}`;
              },
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
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
   * Render HW owner table with filtered data
   */
  renderTable(data) {
    if (!Array.isArray(data)) {
      console.warn('⚠️ renderHWOwnerTable: data not array');
      return;
    }

    // Process data for HW owner table
    const hwOwnerData = this.processHWOwnerData(data);
    
    // Set data and render using pagination manager
    if (this.paginationManager) {
      this.paginationManager.setData(hwOwnerData);
      this.paginationManager.renderTable();
    }

    // Show the section
    const hwSection = document.getElementById('section-hw-owner');
    if (hwSection) {
      hwSection.classList.remove('d-none');
    }
  }

  /**
   * Process raw data into HW owner table format
   */
  processHWOwnerData(data) {
    const years = new Set();
    const hwOwnerData = new Map();

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

        (cfg.level1Parts || []).forEach(l1 => {
          if (l1.hwo) {
            // Handle both array and string formats for backward compatibility
            const hwos = Array.isArray(l1.hwo) ? l1.hwo : [l1.hwo];

            hwos.forEach(hwo => {
              // Apply HW owner filter at item level if active
              if (window.dataFilterManager.filters.hwOwners.size > 0) {
                if (!window.dataFilterManager.filters.hwOwners.has(hwo)) {
                  return; // Skip this HW owner if it doesn't match the filter
                }
              }
              
              if (!hwOwnerData.has(hwo)) {
                hwOwnerData.set(hwo, {
                  hwOwner: hwo,
                  level1Pn: l1.pn || l1.partNumber || '-',
                  description: l1.description || 'Component',
                  supplier: l1.supplier || '-',
                  yearCounts: {}
                });
              }
              const hwInfo = hwOwnerData.get(hwo);

              (cfg.esns || []).forEach(esn => {
                const y = this.getYearFromDate(esn.targetShipDate);
                if (y) {
                  // Only count years that match the year filter (if active)
                  const shouldIncludeYear = window.dataFilterManager.filters.years.size === 0 || 
                                           window.dataFilterManager.filters.years.has(y);
                  if (shouldIncludeYear) {
                    if (!hwInfo.yearCounts[y]) hwInfo.yearCounts[y] = 0;
                    hwInfo.yearCounts[y] += (l1.qpe || 1);
                  }
                }
              });
            });
          }
        });
      });
    });

    return Array.from(hwOwnerData.values());
  }

  /**
   * Render table content for pagination
   */
  renderTableContent(data, allData) {
    const hwSection = document.getElementById('section-hw-owner');
    if (!hwSection) return;

    let tbody = hwSection.querySelector('tbody');
    if (!tbody) {
      const table = hwSection.querySelector('table');
      if (table) {
        tbody = document.createElement('tbody');
        table.appendChild(tbody);
      }
    }
    if (!tbody) return;
    tbody.innerHTML = '';

    // Collect all years dynamically from ALL data
    const years = new Set();
    allData.forEach(hwInfo => {
      Object.keys(hwInfo.yearCounts).forEach(year => years.add(year));
    });
    const yearList = Array.from(years).sort();

    // Render table header
    const table = hwSection.querySelector('table');
    if (table) {
      let thead = table.querySelector('thead');
      if (!thead) {
        thead = document.createElement('thead');
        table.insertBefore(thead, table.firstChild);
      }
      thead.innerHTML = `<tr><th>HWO</th><th>Level 1 PN</th><th>Description</th><th>Supplier</th>${yearList.map(y => `<th>${y}</th>`).join('')}</tr>`;
    }

    // Render rows for current page data only
    data.forEach(hwInfo => {
      const yearValues = yearList.map(y => hwInfo.yearCounts[y] || 0);
      tbody.innerHTML += `<tr><td>${hwInfo.hwOwner}</td><td>${hwInfo.level1Pn}</td><td>${hwInfo.description}</td><td>${hwInfo.supplier}</td>${yearValues.map(v => `<td>${v}</td>`).join('')}</tr>`;
    });
  }

  /**
   * Update chart with HW owner data
   */
  updateChart(data = null) {
    if (!this.chartInstance) return;

    const chartData = data || this.getHWOwnerChartData();
    const processedData = this.processChartData(chartData);
    
    this.chartInstance.data = processedData;
    this.chartInstance.update('none');
  }

  /**
   * Get HW owner chart data
   */
  getHWOwnerChartData() {
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
    // Process HW owner data for chart
    const hwOwnerCounts = new Map();
    
    data.forEach(program => {
      program.configs.forEach(cfg => {
        (cfg.level1Parts || []).forEach(l1 => {
          if (l1.hwo) {
            // Handle both array and string formats
            const hwos = Array.isArray(l1.hwo) ? l1.hwo : [l1.hwo];
            
            hwos.forEach(hwo => {
              const count = hwOwnerCounts.get(hwo) || 0;
              hwOwnerCounts.set(hwo, count + 1);
            });
          }
        });
      });
    });

    const labels = Array.from(hwOwnerCounts.keys()).slice(0, 8); // Top 8 for doughnut
    const values = labels.map(label => hwOwnerCounts.get(label));

    // Generate colors for the doughnut chart
    const colors = [
      '#FF6B35', '#004E89', '#009639', '#FFD23F',
      '#EE6C4D', '#3D5A80', '#98C1D9', '#E0FBFC'
    ];

    return {
      labels: labels,
      datasets: [{
        label: 'HW Owner Distribution',
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 2
      }]
    };
  }

  /**
   * Handle chart click events
   */
  handleChartClick(element) {
    const label = this.chartInstance.data.labels[element.index];
    console.log('HW Owner chart clicked:', label);
    
    // Implementation for drill-down or modal
  }

  /**
   * Show details modal
   */
  showDetails() {
    console.log('Showing HW owner details...');
    // Implementation for showing detailed view
  }

  /**
   * Download HW owner data
   */
  downloadData() {
    console.log('Downloading HW owner data...');
    // Implementation for data export
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
window.HWOwnerSection = HWOwnerSection;