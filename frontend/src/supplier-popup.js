// ===== SUPPLIER POPUP MODAL =====
// This file contains all functionality for the Program Suppliers popup modal

let programModalChart = null;

/**
 * Show Program Suppliers Modal
 * @param {string} programName - Name of the engine program
 * @param {Array} suppliers - List of suppliers
 * @param {Array} details - Detailed supplier data
 */
function showProgramSuppliersModal(programName, suppliers, details) {
  // Create or update modal content
  let modal = document.getElementById('programSuppliersModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'programSuppliersModal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'programSuppliersModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    document.body.appendChild(modal);
  }
  
  // Always update modal content to reflect latest structure
  modal.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="programSuppliersModalLabel" style="color: #000000 !important;">${programName} Suppliers</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <!-- Search Filters -->
            <div class="card mb-3">
              <div class="card-body">
                <div class="row g-2">
                  <div class="col-md-4">
                    <label for="programSupplierSearch" class="form-label">Search Supplier</label>
                    <input type="text" class="form-control form-control-sm" id="programSupplierSearch" placeholder="Filter by supplier...">
                  </div>
                  <div class="col-md-4">
                    <label for="programPartNumberSearch" class="form-label">Search Part Number</label>
                    <input type="text" class="form-control form-control-sm" id="programPartNumberSearch" placeholder="Filter by part number...">
                  </div>
                  <div class="col-md-4">
                    <label for="programHWOSearch" class="form-label">Search HWO</label>
                    <input type="text" class="form-control form-control-sm" id="programHWOSearch" placeholder="Filter by HWO...">
                  </div>
                </div>
              </div>
            </div>

            <!-- Demand Chart -->
            <div class="card chart-card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0" id="programModalChartTitle">${programName} Supplier Demand</h6>
                <div>
                  <button class="btn btn-sm btn-outline-primary me-2" id="showAllProgramSuppliers" title="Show all suppliers">
                    <i class="bi bi-list"></i> Show All
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" id="resetProgramSupplierZoom" title="Reset to top 5">
                    <i class="bi bi-arrow-counterclockwise"></i> Reset
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div class="chart-container" style="height: 300px;">
                  <canvas id="programModalChart"></canvas>
                </div>
                <div class="text-muted small text-center mt-2">
                  💡 <strong>Tip:</strong> Scroll to navigate, Click bar to filter table, Double-click to reset
                </div>
              </div>
            </div>

            <!-- Details Table -->
            <div class="card">
              <div class="card-header">
                <h6 class="mb-0">Supplier Details</h6>
              </div>
              <div class="card-body">
                <div class="table-responsive">
                  <table class="table table-sm" id="programSuppliersTable">
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Part Number</th>
                        <th>Parent Part No</th>
                        <th>Description</th>
                        <th>HWO</th>
                        <th>Level</th>
                        <th colspan="4" class="text-center">2026</th>
                        <th colspan="4" class="text-center">2027</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th>Q1</th>
                        <th>Q2</th>
                        <th>Q3</th>
                        <th>Q4</th>
                        <th>Q1</th>
                        <th>Q2</th>
                        <th>Q3</th>
                        <th>Q4</th>
                      </tr>
                    </thead>
                    <tbody id="programSuppliersTableBody">
                    </tbody>
                  </table>
                </div>
                <!-- Pagination Controls -->
                <div class="d-flex justify-content-between align-items-center mt-3">
                  <div class="d-flex align-items-center">
                    <label for="programSuppliersPageSize" class="me-2 mb-0">Rows per page:</label>
                    <select class="form-select form-select-sm" id="programSuppliersPageSize" style="width: auto;">
                      <option value="10" selected>10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                  <div>
                    <span id="programSuppliersRecordInfo" class="text-muted small"></span>
                  </div>
                  <div class="btn-group" role="group">
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="programSuppliersPrevBtn">Previous</button>
                    <span class="btn btn-sm btn-outline-secondary disabled" id="programSuppliersPageInfo">Page 1</span>
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="programSuppliersNextBtn">Next</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

  // Add search functionality
  modal.addEventListener('input', function (e) {
    if (e.target.id === 'programSupplierSearch' || e.target.id === 'programPartNumberSearch' || e.target.id === 'programHWOSearch') {
      filterProgramSuppliersTable();
    }
  });

  // Update modal title
  document.getElementById('programSuppliersModalLabel').textContent = `${programName} Suppliers`;
  document.getElementById('programModalChartTitle').textContent = `${programName} Supplier Demand`;

  // Show the modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();

  // Fix accessibility issue: Remove focus from close button before modal hides
  modal.addEventListener('hide.bs.modal', function onHide() {
    const closeBtn = modal.querySelector('.btn-close');
    if (closeBtn && document.activeElement === closeBtn) {
      closeBtn.blur();
    }
  });

  // Wait for modal to be shown, then load data
  modal.addEventListener('shown.bs.modal', function onShown() {
    modal.removeEventListener('shown.bs.modal', onShown);
    renderProgramSuppliersChart(programName, suppliers, details);
    renderProgramSuppliersTable(programName, details);
  }, { once: true });
}

/**
 * Render Program Suppliers Chart
 */
function renderProgramSuppliersChart(programName, suppliers, details) {
  const ctx = document.getElementById('programModalChart');
  if (!ctx) return;

  // Destroy previous chart if it exists
  if (programModalChart) {
    programModalChart.destroy();
    programModalChart = null;
  }

  // Aggregate demand by supplier and year
  const supplierData = {};
  details.forEach(detail => {
    if (!supplierData[detail.supplier]) {
      supplierData[detail.supplier] = { '2025': 0, '2026': 0, '2027': 0 };
    }
    supplierData[detail.supplier]['2025'] += detail.data2025 || 0;
    supplierData[detail.supplier]['2026'] += detail.data2026 || 0;
    supplierData[detail.supplier]['2027'] += detail.data2027 || 0;
  });

  const labels = Object.keys(supplierData).sort((a, b) => {
    const totalA = supplierData[a]['2025'] + supplierData[a]['2026'] + supplierData[a]['2027'];
    const totalB = supplierData[b]['2025'] + supplierData[b]['2026'] + supplierData[b]['2027'];
    return totalB - totalA;
  });

  const data2025 = labels.map(supplier => supplierData[supplier]['2025']);
  const data2026 = labels.map(supplier => supplierData[supplier]['2026']);
  const data2027 = labels.map(supplier => supplierData[supplier]['2027']);

  // Store full data for zoom/pan
  window.fullProgramSupplierChartData = {
    labels: labels,
    data2025: data2025,
    data2026: data2026,
    data2027: data2027
  };

  // Show only top 5 by default
  const top5Data = getProgramTop5Suppliers(window.fullProgramSupplierChartData);

  const datasets = [
    {
      label: '2025',
      data: top5Data.data2025,
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: '#3b82f6',
      borderWidth: 1
    },
    {
      label: '2026',
      data: top5Data.data2026,
      backgroundColor: 'rgba(245, 158, 11, 0.8)',
      borderColor: '#f59e0b',
      borderWidth: 1
    },
    {
      label: '2027',
      data: top5Data.data2027,
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderColor: '#10b981',
      borderWidth: 1
    }
  ];

  programModalChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: top5Data.labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function (context) {
              if (context.parsed.x === 0) return null;
              return `${context.dataset.label}: ${context.parsed.x}`;
            }
          }
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
            mode: 'y'
          },
          pan: {
            enabled: true,
            mode: 'y'
          },
          limits: {
            y: {
              min: 0,
              max: labels.length - 1
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          stacked: true,
          title: { display: true, text: 'Supplier Demand' }
        },
        y: {
          stacked: true,
          title: { display: true, text: 'Supplier' },
          min: 0,
          max: 4  // Show 5 items (0-4)
        }
      },
      onClick: (event, activeElements, chart) => {
        if (event.type === 'dblclick') {
          // Reset to show top 5
          chart.data.labels = top5Data.labels;
          chart.data.datasets[0].data = top5Data.data2025;
          chart.data.datasets[1].data = top5Data.data2026;
          chart.data.datasets[2].data = top5Data.data2027;
          chart.options.scales.y.min = 0;
          chart.options.scales.y.max = 4;
          chart.update();
        } else if (activeElements.length > 0) {
          // Get the clicked supplier name
          const clickedIndex = activeElements[0].index;
          const supplierName = chart.data.labels[clickedIndex];
          
          // Filter the table by this supplier
          filterProgramTableBySupplier(supplierName);
        }
      }
    }
  });

  // Setup reset button
  const resetBtn = document.getElementById('resetProgramSupplierZoom');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (programModalChart) {
        // Reset to show top 5
        programModalChart.data.labels = top5Data.labels;
        programModalChart.data.datasets[0].data = top5Data.data2025;
        programModalChart.data.datasets[1].data = top5Data.data2026;
        programModalChart.data.datasets[2].data = top5Data.data2027;
        programModalChart.options.scales.y.min = 0;
        programModalChart.options.scales.y.max = 4;
        programModalChart.update();
      }
    };
  }

  // Setup show all button
  const showAllBtn = document.getElementById('showAllProgramSuppliers');
  if (showAllBtn) {
    showAllBtn.onclick = () => {
      if (programModalChart && window.fullProgramSupplierChartData) {
        programModalChart.data.labels = window.fullProgramSupplierChartData.labels;
        programModalChart.data.datasets[0].data = window.fullProgramSupplierChartData.data2025;
        programModalChart.data.datasets[1].data = window.fullProgramSupplierChartData.data2026;
        programModalChart.data.datasets[2].data = window.fullProgramSupplierChartData.data2027;
        programModalChart.options.scales.y.min = 0;
        programModalChart.options.scales.y.max = Math.min(9, window.fullProgramSupplierChartData.labels.length - 1);
        programModalChart.update();
      }
    };
  }
}

/**
 * Render Program Suppliers Table
 */
function renderProgramSuppliersTable(programName, details) {
  const tbody = document.getElementById('programSuppliersTableBody');
  if (!tbody) return;

  // Store all details globally for pagination and filtering
  window.currentProgramDetails = details;
  window.originalProgramDetails = [...details]; // Store original copy for filtering
  
  // Initialize pagination state
  if (!window.programSuppliersPagination) {
    window.programSuppliersPagination = {
      currentPage: 1,
      pageSize: 10,
      totalRecords: details.length
    };
  } else {
    window.programSuppliersPagination.totalRecords = details.length;
    window.programSuppliersPagination.currentPage = 1;
  }
  
  renderProgramSuppliersPage();
  
  setTimeout(() => {
    setupProgramSuppliersPaginationControls();
  }, 100);
}

/**
 * Render current page of Program Suppliers Table
 */
function renderProgramSuppliersPage() {
  const tbody = document.getElementById('programSuppliersTableBody');
  if (!tbody || !window.currentProgramDetails || !window.programSuppliersPagination) return;
  
  const { currentPage, pageSize } = window.programSuppliersPagination;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageData = window.currentProgramDetails.slice(startIdx, endIdx);
  
  tbody.innerHTML = pageData.map(detail => {
    // Generate quarterly distribution for 2026
    const total2026 = detail.data2026 || 0;
    const q1_2026 = Math.floor(total2026 * (0.2 + Math.random() * 0.3));
    const q2_2026 = Math.floor(total2026 * (0.15 + Math.random() * 0.25));
    const q3_2026 = Math.floor(total2026 * (0.15 + Math.random() * 0.25));
    const q4_2026 = total2026 - q1_2026 - q2_2026 - q3_2026;

    // Generate quarterly distribution for 2027
    const total2027 = detail.data2027 || 0;
    const q1_2027 = Math.floor(total2027 * (0.2 + Math.random() * 0.3));
    const q2_2027 = Math.floor(total2027 * (0.15 + Math.random() * 0.25));
    const q3_2027 = Math.floor(total2027 * (0.15 + Math.random() * 0.25));
    const q4_2027 = total2027 - q1_2027 - q2_2027 - q3_2027;

    return `
    <tr>
      <td>${detail.supplier || ''}</td>
      <td>${detail.partNumber || ''}</td>
      <td>${detail.parentPartNo || ''}</td>
      <td>${detail.description || ''}</td>
      <td>${detail.hwo || ''}</td>
      <td>${detail.level || ''}</td>
      <td>${q1_2026}</td>
      <td>${q2_2026}</td>
      <td>${q3_2026}</td>
      <td>${q4_2026}</td>
      <td>${q1_2027}</td>
      <td>${q2_2027}</td>
      <td>${q3_2027}</td>
      <td>${q4_2027}</td>
    </tr>
  `}).join('');
  
  updateProgramSuppliersPaginationUI();
}

/**
 * Filter Program Suppliers Table
 */
function filterProgramSuppliersTable() {
  if (!window.currentProgramDetails || !window.programSuppliersPagination) return;
  
  const supplierSearch = document.getElementById('programSupplierSearch')?.value.toLowerCase() || '';
  const partNumberSearch = document.getElementById('programPartNumberSearch')?.value.toLowerCase() || '';
  const hwoSearch = document.getElementById('programHWOSearch')?.value.toLowerCase() || '';
  
  // Store original data if not already stored
  if (!window.originalProgramDetails) {
    window.originalProgramDetails = [...window.currentProgramDetails];
  }
  
  // Filter the data
  const filtered = window.originalProgramDetails.filter(detail => {
    const matchesSupplier = !supplierSearch || (detail.supplier && detail.supplier.toLowerCase().includes(supplierSearch));
    const matchesPartNumber = !partNumberSearch || (detail.partNumber && detail.partNumber.toLowerCase().includes(partNumberSearch));
    const matchesHWO = !hwoSearch || (detail.hwo && detail.hwo.toLowerCase().includes(hwoSearch));
    
    return matchesSupplier && matchesPartNumber && matchesHWO;
  });
  
  // Update current details and reset pagination
  window.currentProgramDetails = filtered;
  window.programSuppliersPagination.totalRecords = filtered.length;
  window.programSuppliersPagination.currentPage = 1;
  
  // Re-render the table
  renderProgramSuppliersPage();
  
  // Update the chart with filtered data
  updateProgramChartWithFilteredData(filtered);
}

/**
 * Setup pagination controls for Program Suppliers Table
 */
function setupProgramSuppliersPaginationControls() {
  if (window.programSuppliersPaginationSetup) return;
  
  const pageSizeSelect = document.getElementById('programSuppliersPageSize');
  const prevBtn = document.getElementById('programSuppliersPrevBtn');
  const nextBtn = document.getElementById('programSuppliersNextBtn');
  
  if (!pageSizeSelect || !prevBtn || !nextBtn) return;
  
  pageSizeSelect.addEventListener('change', () => {
    if (window.programSuppliersPagination) {
      window.programSuppliersPagination.pageSize = parseInt(pageSizeSelect.value);
      window.programSuppliersPagination.currentPage = 1;
      renderProgramSuppliersPage();
    }
  });
  
  prevBtn.addEventListener('click', () => {
    if (window.programSuppliersPagination && window.programSuppliersPagination.currentPage > 1) {
      window.programSuppliersPagination.currentPage--;
      renderProgramSuppliersPage();
    }
  });
  
  nextBtn.addEventListener('click', () => {
    if (window.programSuppliersPagination) {
      const totalPages = Math.ceil(window.programSuppliersPagination.totalRecords / window.programSuppliersPagination.pageSize);
      if (window.programSuppliersPagination.currentPage < totalPages) {
        window.programSuppliersPagination.currentPage++;
        renderProgramSuppliersPage();
      }
    }
  });
  
  window.programSuppliersPaginationSetup = true;
}

/**
 * Update pagination UI for Program Suppliers Table
 */
function updateProgramSuppliersPaginationUI() {
  if (!window.programSuppliersPagination) return;
  
  const pageInfo = document.getElementById('programSuppliersPageInfo');
  const recordInfo = document.getElementById('programSuppliersRecordInfo');
  const prevBtn = document.getElementById('programSuppliersPrevBtn');
  const nextBtn = document.getElementById('programSuppliersNextBtn');
  
  if (!pageInfo || !recordInfo || !prevBtn || !nextBtn) return;
  
  const { currentPage, pageSize, totalRecords } = window.programSuppliersPagination;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);
  
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  recordInfo.textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
  
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

/**
 * Get top 5 suppliers from program supplier data
 */
function getProgramTop5Suppliers(supplierData) {
  const top5Count = Math.min(5, supplierData.labels.length);
  
  return {
    labels: supplierData.labels.slice(0, top5Count),
    data2025: supplierData.data2025.slice(0, top5Count),
    data2026: supplierData.data2026.slice(0, top5Count),
    data2027: supplierData.data2027.slice(0, top5Count)
  };
}

/**
 * Update program chart with filtered data
 */
function updateProgramChartWithFilteredData(filteredDetails) {
  if (!programModalChart) return;
  
  // Rebuild supplier data from filtered details
  const supplierData = {};
  filteredDetails.forEach(detail => {
    if (!supplierData[detail.supplier]) {
      supplierData[detail.supplier] = { '2025': 0, '2026': 0, '2027': 0 };
    }
    supplierData[detail.supplier]['2025'] += detail.data2025 || 0;
    supplierData[detail.supplier]['2026'] += detail.data2026 || 0;
    supplierData[detail.supplier]['2027'] += detail.data2027 || 0;
  });

  const labels = Object.keys(supplierData).sort((a, b) => {
    const totalA = supplierData[a]['2025'] + supplierData[a]['2026'] + supplierData[a]['2027'];
    const totalB = supplierData[b]['2025'] + supplierData[b]['2026'] + supplierData[b]['2027'];
    return totalB - totalA;
  });

  const data2025 = labels.map(supplier => supplierData[supplier]['2025']);
  const data2026 = labels.map(supplier => supplierData[supplier]['2026']);
  const data2027 = labels.map(supplier => supplierData[supplier]['2027']);

  // Store full filtered data
  window.fullProgramSupplierChartData = {
    labels: labels,
    data2025: data2025,
    data2026: data2026,
    data2027: data2027
  };

  // Show top 5 of filtered data
  const top5Data = getProgramTop5Suppliers(window.fullProgramSupplierChartData);

  // Update chart data
  programModalChart.data.labels = top5Data.labels;
  programModalChart.data.datasets[0].data = top5Data.data2025;
  programModalChart.data.datasets[1].data = top5Data.data2026;
  programModalChart.data.datasets[2].data = top5Data.data2027;

  // Reset scale to show top 5
  programModalChart.options.scales.y.min = 0;
  programModalChart.options.scales.y.max = Math.min(4, top5Data.labels.length - 1);

  // Update zoom limits
  programModalChart.options.plugins.zoom.limits.y.max = labels.length - 1;

  // Update the chart
  programModalChart.update();
}

/**
 * Filter table by supplier name (from chart click)
 */
function filterProgramTableBySupplier(supplierName) {
  const supplierSearch = document.getElementById('programSupplierSearch');
  if (supplierSearch) {
    supplierSearch.value = supplierName;
    filterProgramSuppliersTable();
  }
}

// Make functions globally available
window.showProgramSuppliersModal = showProgramSuppliersModal;
window.renderProgramSuppliersChart = renderProgramSuppliersChart;
window.renderProgramSuppliersTable = renderProgramSuppliersTable;
