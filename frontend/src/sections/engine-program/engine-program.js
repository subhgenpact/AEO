/**
 * Engine Program Overview Section
 * Handles the main engine program chart and summary table
 */

class EngineProgramSection {
  constructor() {
    this.chartInstance = null;
    this.summaryData = null;
    this.currentView = 'quarter'; // year, quarter, month
  }

  /**
   * Initialize the Engine Program section
   */
  initialize() {
    this.setupEventListeners();
    this.initializeChart();
  }

  /**
   * Setup event listeners for the section
   */
  setupEventListeners() {
    // View toggle buttons
    const viewButtons = document.querySelectorAll('input[name="engineProgramView"]');
    viewButtons.forEach(button => {
      button.addEventListener('change', (e) => {
        this.currentView = e.target.value;
        this.updateChart();
      });
    });

    // Zoom controls
    const zoomInBtn = document.getElementById('zoomInEngineProgram');
    const resetZoomBtn = document.getElementById('resetEngineProgramZoom');
    const backBtn = document.getElementById('engineProgramBackBtn');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.zoomIn());
    }

    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => this.resetZoom());
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.goBack());
    }
  }

  /**
   * Initialize the chart
   */
  initializeChart() {
    const canvas = document.getElementById('engineProgramChart');
    if (!canvas) {
      console.warn('Engine Program chart canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    
    // Chart configuration will be moved here from charts.js
    this.chartInstance = new Chart(ctx, this.getChartConfig());
  }

  /**
   * Get chart configuration
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
            display: false // Legend is handled separately
          },
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
                modifierKey: 'ctrl'
              },
              pinch: {
                enabled: true
              },
              mode: 'x'
            },
            pan: {
              enabled: true,
              mode: 'x',
              modifierKey: 'shift'
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            title: {
              display: true,
              text: 'Time Period'
            }
          },
          y: {
            stacked: true,
            title: {
              display: true,
              text: 'ESN Count'
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
   * Update chart with filtered data
   */
  updateChart(data = null) {
    if (!this.chartInstance) return;

    const chartData = data || this.getFilteredChartData();
    
    // Update chart data based on current view
    const processedData = this.processDataForView(chartData, this.currentView);
    
    this.chartInstance.data = processedData;
    this.chartInstance.update('none');
    
    // Update summary table
    this.updateSummaryTable(chartData);
    
    // Update legend
    this.updateLegend(processedData.datasets);
  }

  /**
   * Process data based on current view (year/quarter/month)
   */
  processDataForView(data, view) {
    // Implementation will depend on the data structure
    // This is a placeholder for the actual processing logic
    return {
      labels: this.generateLabels(view),
      datasets: this.generateDatasets(data, view)
    };
  }

  /**
   * Generate labels based on view type
   */
  generateLabels(view) {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1, currentYear + 2];
    
    switch (view) {
      case 'year':
        return years.map(y => y.toString());
      case 'quarter':
        return years.flatMap(year => 
          ['Q1', 'Q2', 'Q3', 'Q4'].map(q => `${q} ${year}`)
        );
      case 'month':
        return years.flatMap(year =>
          ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => `${m} ${year}`)
        );
      default:
        return [];
    }
  }

  /**
   * Generate datasets for chart
   */
  generateDatasets(data, view) {
    // This will be implemented based on the actual data structure
    // Placeholder implementation
    return [
      {
        label: 'LM2500',
        data: [],
        backgroundColor: '#FF6B35',
        borderColor: '#FF6B35',
        borderWidth: 1
      },
      {
        label: 'LM6000',
        data: [],
        backgroundColor: '#004E89',
        borderColor: '#004E89',
        borderWidth: 1
      },
      {
        label: 'LMS100',
        data: [],
        backgroundColor: '#009639',
        borderColor: '#009639',
        borderWidth: 1
      }
    ];
  }

  /**
   * Get filtered chart data from the centralized data manager
   */
  getFilteredChartData() {
    if (window.dataFilterManager && window.dataFilterManager.embeddedCData) {
      return window.dataFilterManager.getFilteredChartData();
    }
    return [];
  }

  /**
   * Update the summary table
   */
  updateSummaryTable(data) {
    const tableBody = document.querySelector('#engineProgramSummaryTable tbody');
    if (!tableBody) return;

    // Clear existing rows
    tableBody.innerHTML = '';

    // Process data and create summary rows
    const summaryData = this.processSummaryData(data);
    
    summaryData.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center">${row.year}</td>
        <td class="text-center">${row.lm2500}</td>
        <td class="text-center">${row.lm6000}</td>
        <td class="text-center">${row.lms100}</td>
        <td class="text-center fw-bold">${row.total}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  /**
   * Process data for summary table
   */
  processSummaryData(data) {
    // Placeholder implementation
    // This will aggregate data by year and program
    return [
      { year: '2025', lm2500: 0, lm6000: 0, lms100: 0, total: 0 },
      { year: '2026', lm2500: 0, lm6000: 0, lms100: 0, total: 0 },
      { year: '2027', lm2500: 0, lm6000: 0, lms100: 0, total: 0 }
    ];
  }

  /**
   * Update the legend
   */
  updateLegend(datasets) {
    const legendContainer = document.querySelector('.engine-program-legend');
    if (!legendContainer) return;

    legendContainer.innerHTML = datasets.map(dataset => `
      <div class="legend-item d-flex align-items-center">
        <div class="legend-color" style="width: 12px; height: 12px; background-color: ${dataset.backgroundColor}; margin-right: 6px;"></div>
        <span class="legend-label small">${dataset.label}</span>
      </div>
    `).join('');
  }

  /**
   * Handle chart click events
   */
  handleChartClick(element) {
    // Implementation for drill-down functionality
    console.log('Chart clicked:', element);
  }

  /**
   * Zoom in functionality
   */
  zoomIn() {
    if (this.chartInstance && this.chartInstance.zoom) {
      this.chartInstance.zoom(1.1);
    }
  }

  /**
   * Reset zoom functionality
   */
  resetZoom() {
    if (this.chartInstance && this.chartInstance.resetZoom) {
      this.chartInstance.resetZoom();
    }
  }

  /**
   * Go back functionality
   */
  goBack() {
    // Implementation for navigation back
    console.log('Going back...');
  }

  /**
   * Destroy the chart instance
   */
  destroy() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }

  /**
   * Subscribe to data changes
   */
  subscribeToDataChanges() {
    if (window.dataFilterManager) {
      return window.dataFilterManager.subscribe((filteredData) => {
        this.updateChart();
      });
    }
  }
}

// Export for use in other modules
window.EngineProgramSection = EngineProgramSection;