// ===== RM SUPPLIER POPUP MODAL =====
// This file contains all functionality for the Raw Material Supplier popup modal

let modalChart = null;

/**
 * Show Raw Material Details Modal
 * @param {string} rawMaterialType - Type of raw material
 */
function showRawMaterialDetailsModal(rawMaterialType) {
  console.log('Showing modal for raw material type:', rawMaterialType);
  
  // Clear search filters
  const modalSupplierSearch = document.getElementById('modalSupplierSearch');
  const modalPartNumberSearch = document.getElementById('modalPartNumberSearch');
  const modalHWOSearch = document.getElementById('modalHWOSearch');
  if (modalSupplierSearch) modalSupplierSearch.value = '';
  if (modalPartNumberSearch) modalPartNumberSearch.value = '';
  if (modalHWOSearch) modalHWOSearch.value = '';
  
  // Clear original data cache
  window.originalRawMaterialData = null;

  // Update modal title
  document.getElementById('rawMaterialModalLabel').textContent = `${rawMaterialType} Details`;
  document.getElementById('modalChartTitle').textContent = `${rawMaterialType} Demand per ${rawMaterialType} Supplier`;

  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('rawMaterialModal'));
  modal.show();

  // Wait for modal to be shown to ensure proper rendering
  document.getElementById('rawMaterialModal').addEventListener('shown.bs.modal', function () {
    const modalData = window.dataFilterManager ? window.dataFilterManager.getFilteredData() : window.RAW_DATA;
    renderModalRawMaterialChart(modalData, rawMaterialType);
    renderModalDetailsTable(modalData, rawMaterialType);
  }, { once: true });
}

/**
 * Render Raw Material Chart
 */
function renderModalRawMaterialChart(data, rawType) {
  // Get active filters from DataFilterManager
  const filters = window.dataFilterManager ? {
    programs: Array.from(window.dataFilterManager.filters.productLines || []),
    years: Array.from(window.dataFilterManager.filters.years || []),
    configs: Array.from(window.dataFilterManager.filters.configs || []),
    suppliers: Array.from(window.dataFilterManager.filters.suppliers || []),
    hwOwners: Array.from(window.dataFilterManager.filters.hwOwners || []),
    partNumbers: Array.from(window.dataFilterManager.filters.partNumbers || [])
  } : {};
  
  // Build query string with filters
  const queryParams = new URLSearchParams();
  if (filters.programs && filters.programs.length > 0) {
    filters.programs.forEach(p => queryParams.append('product_lines', p));
  }
  if (filters.years && filters.years.length > 0) {
    filters.years.forEach(y => queryParams.append('years', y));
  }
  if (filters.configs && filters.configs.length > 0) {
    filters.configs.forEach(c => queryParams.append('configs', c));
  }
  if (filters.suppliers && filters.suppliers.length > 0) {
    filters.suppliers.forEach(s => queryParams.append('suppliers', s));
  }
  if (filters.hwOwners && filters.hwOwners.length > 0) {
    filters.hwOwners.forEach(h => queryParams.append('hw_owners', h));
  }
  if (filters.partNumbers && filters.partNumbers.length > 0) {
    filters.partNumbers.forEach(p => queryParams.append('part_numbers', p));
  }
  
  const queryString = queryParams.toString();
  const url = `/api/rm-supplier-details/${encodeURIComponent(rawType)}${queryString ? '?' + queryString : ''}`;
  
  // Fetch data from backend API to build chart
  fetch(url)
    .then(response => response.json())
    .then(result => {
      const supplierDetails = result.data;
      const supplierData = buildModalRawMaterialSupplierDataFromAPI(supplierDetails);
      
      // Destroy existing chart
      if (modalChart) {
        modalChart.destroy();
      }

      const ctx = document.getElementById('modalRawMaterialChart');
      modalChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: supplierData.suppliers,
          datasets: [
            {
              label: '2025',
              data: supplierData.data2025,
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: '#3b82f6',
              borderWidth: 1
            },
            {
              label: '2026',
              data: supplierData.data2026,
              backgroundColor: 'rgba(245, 158, 11, 0.8)',
              borderColor: '#f59e0b',
              borderWidth: 1
            },
            {
              label: '2027',
              data: supplierData.data2027,
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderColor: '#10b981',
              borderWidth: 1
            },
            {
              label: '2028',
              data: supplierData.data2028,
              backgroundColor: 'rgba(132, 204, 22, 0.8)',
              borderColor: '#84cc16',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: {
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  if (context.parsed.x === 0) return null;
                  return `${context.dataset.label}: ${context.parsed.x}`;
                }
              }
            },
            datalabels: {
              display: (context) => {
                return context.dataset.data[context.dataIndex] !== 0;
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
                mode: 'xy'
              },
              pan: {
                enabled: true,
                mode: 'xy',
                modifierKey: 'shift'
              },
              limits: {
                x: {min: 'original', max: 'original'},
                y: {min: 'original', max: 'original'}
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              stacked: true,
              title: {
                display: true,
                text: `${rawType} Demand`
              }
            },
            y: {
              stacked: true,
              title: {
                display: true,
                text: `${rawType} Supplier`
              }
            }
          },
          onClick: (event, activeElements, chart) => {
            if (event.type === 'dblclick') {
              chart.resetZoom();
            } else if (activeElements.length > 0) {
              // Get the clicked supplier name
              const clickedIndex = activeElements[0].index;
              const supplierName = chart.data.labels[clickedIndex];
              
              // Filter the table by this supplier
              filterTableBySupplier(supplierName);
            }
          }
        }
      });
      
      // Setup reset zoom button
      const resetBtn = document.getElementById('resetRawMaterialZoom');
      if (resetBtn) {
        resetBtn.onclick = () => {
          if (modalChart) {
            modalChart.resetZoom();
          }
        };
      }
    })
    .catch(error => {
      console.error('Error fetching data for chart:', error);
    });
}

/**
 * Build Raw Material Supplier Data from API response
 */
function buildModalRawMaterialSupplierDataFromAPI(supplierDetails) {
  const supplierMap = new Map();
  
  // Aggregate data by supplier and year
  supplierDetails.forEach(detail => {
    const supplierName = detail.name;
    
    if (!supplierMap.has(supplierName)) {
      supplierMap.set(supplierName, {
        '2025': 0,
        '2026': 0,
        '2027': 0,
        '2028': 0
      });
    }
    
    const supplier = supplierMap.get(supplierName);
    
    // Sum up all quarters for each year
    Object.keys(detail.quarters).forEach(quarterKey => {
      const year = quarterKey.split('-')[0];
      if (year && detail.quarters[quarterKey] && detail.quarters[quarterKey] !== '-') {
        supplier[year] = (supplier[year] || 0) + parseInt(detail.quarters[quarterKey]);
      }
    });
  });
  
  // Sort suppliers by total demand in descending order
  const suppliers = Array.from(supplierMap.keys()).sort((a, b) => {
    const totalA = (supplierMap.get(a)['2025'] || 0) + (supplierMap.get(a)['2026'] || 0) +
      (supplierMap.get(a)['2027'] || 0) + (supplierMap.get(a)['2028'] || 0);
    const totalB = (supplierMap.get(b)['2025'] || 0) + (supplierMap.get(b)['2026'] || 0) +
      (supplierMap.get(b)['2027'] || 0) + (supplierMap.get(b)['2028'] || 0);
    return totalB - totalA;
  });
  
  const data2025 = suppliers.map(s => supplierMap.get(s)['2025'] || 0);
  const data2026 = suppliers.map(s => supplierMap.get(s)['2026'] || 0);
  const data2027 = suppliers.map(s => supplierMap.get(s)['2027'] || 0);
  const data2028 = suppliers.map(s => supplierMap.get(s)['2028'] || 0);
  
  return { suppliers, data2025, data2026, data2027, data2028 };
}

/**
 * Build Raw Material Supplier Data
 */
function buildModalRawMaterialSupplierData(data, rawType) {
  const supplierMap = new Map();

  data.forEach(program => {
    program.configs.forEach(config => {
      (config.esns || []).forEach(esn => {
        const year = getYearFromDate(esn.targetShipDate);
        if (year) {
          extractModalRawMaterialData(config.level1Parts || [], rawType, year, supplierMap);
        }
      });
    });
  });

  // Sort suppliers by total demand in descending order
  const suppliers = Array.from(supplierMap.keys()).sort((a, b) => {
    const totalA = (supplierMap.get(a)['2025'] || 0) + (supplierMap.get(a)['2026'] || 0) +
      (supplierMap.get(a)['2027'] || 0) + (supplierMap.get(a)['2028'] || 0);
    const totalB = (supplierMap.get(b)['2025'] || 0) + (supplierMap.get(b)['2026'] || 0) +
      (supplierMap.get(b)['2027'] || 0) + (supplierMap.get(b)['2028'] || 0);
    return totalB - totalA;
  });
  
  const data2025 = suppliers.map(s => supplierMap.get(s)['2025'] || 0);
  const data2026 = suppliers.map(s => supplierMap.get(s)['2026'] || 0);
  const data2027 = suppliers.map(s => supplierMap.get(s)['2027'] || 0);
  const data2028 = suppliers.map(s => supplierMap.get(s)['2028'] || 0);

  return { suppliers, data2025, data2026, data2027, data2028 };
}

/**
 * Extract Raw Material Data
 */
function extractModalRawMaterialData(parts, targetRawType, year, supplierMap) {
  parts.forEach(part => {
    // Check level 2 parts
    (part.level2Parts || []).forEach(l2 => {
      if (l2.rawType === targetRawType && l2.rmSupplier) {
        if (!supplierMap.has(l2.rmSupplier)) {
          supplierMap.set(l2.rmSupplier, {});
        }
        const supplier = supplierMap.get(l2.rmSupplier);
        supplier[year] = (supplier[year] || 0) + 1;
      }

      // Check deeper levels
      if (l2.level3Parts) extractModalRawMaterialData(l2.level3Parts, targetRawType, year, supplierMap);
    });

    // Check level 3 parts directly
    if (part.level3Parts) extractModalRawMaterialData(part.level3Parts, targetRawType, year, supplierMap);
    if (part.level4Parts) extractModalRawMaterialData(part.level4Parts, targetRawType, year, supplierMap);
    if (part.level5Parts) extractModalRawMaterialData(part.level5Parts, targetRawType, year, supplierMap);
  });
}

/**
 * Render Modal Details Table
 */
function renderModalDetailsTable(data, rawType) {
  console.log('📋 renderModalDetailsTable called for rawType:', rawType);
  const tableBody = document.getElementById('modalDetailsTableBody');
  
  // Show loading state
  tableBody.innerHTML = '<tr><td colspan="20" class="text-center">Loading data...</td></tr>';
  
  // Get active filters from DataFilterManager
  const filters = window.dataFilterManager ? {
    programs: Array.from(window.dataFilterManager.filters.productLines || []),
    years: Array.from(window.dataFilterManager.filters.years || []),
    configs: Array.from(window.dataFilterManager.filters.configs || []),
    suppliers: Array.from(window.dataFilterManager.filters.suppliers || []),
    hwOwners: Array.from(window.dataFilterManager.filters.hwOwners || []),
    partNumbers: Array.from(window.dataFilterManager.filters.partNumbers || [])
  } : {};
  
  // Build query string with filters
  const queryParams = new URLSearchParams();
  if (filters.programs && filters.programs.length > 0) {
    filters.programs.forEach(p => queryParams.append('product_lines', p));
  }
  if (filters.years && filters.years.length > 0) {
    filters.years.forEach(y => queryParams.append('years', y));
  }
  if (filters.configs && filters.configs.length > 0) {
    filters.configs.forEach(c => queryParams.append('configs', c));
  }
  if (filters.suppliers && filters.suppliers.length > 0) {
    filters.suppliers.forEach(s => queryParams.append('suppliers', s));
  }
  if (filters.hwOwners && filters.hwOwners.length > 0) {
    filters.hwOwners.forEach(h => queryParams.append('hw_owners', h));
  }
  if (filters.partNumbers && filters.partNumbers.length > 0) {
    filters.partNumbers.forEach(p => queryParams.append('part_numbers', p));
  }
  
  const queryString = queryParams.toString();
  const url = `/api/rm-supplier-details/${encodeURIComponent(rawType)}${queryString ? '?' + queryString : ''}`;
  
  console.log('🔍 Fetching with filters:', filters);
  console.log('🌐 API URL:', url);
  
  // Fetch data from backend API
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      console.log('📦 Fetched supplier details from API:', {
        count: result.data.length,
        sample: result.data[0],
        filtersApplied: result.filters_applied
      });
      
      const supplierDetails = result.data;
      
      // Initialize pagination manager for modal table
      if (!window.modalTablePagination) {
        console.log('🆕 Creating new TablePaginationManager');
        if (typeof window.TablePaginationManager !== 'undefined') {
          window.modalTablePagination = new window.TablePaginationManager('modalDetailsTable', (pageData) => {
            renderModalTablePage(pageData);
          });
        } else {
          console.error('❌ TablePaginationManager not loaded yet');
          tableBody.innerHTML = '<tr><td colspan="20" class="text-center text-danger">Error: TablePaginationManager not loaded</td></tr>';
          return;
        }
      }

      // Set the data and render first page
      window.modalTablePagination.setData(supplierDetails);
      window.modalTablePagination.pageSize = parseInt(document.getElementById('supplierDetailsPageSize')?.value || 10);
      console.log('📄 Rendering table with pageSize:', window.modalTablePagination.pageSize);
      window.modalTablePagination.renderTable();

      // Setup pagination controls
      setupModalTablePaginationControls();
      
      // Setup search filters
      setupRawMaterialSearchFilters(supplierDetails);
    })
    .catch(error => {
      console.error('Error fetching RM supplier details:', error);
      tableBody.innerHTML = `<tr><td colspan="20" class="text-center text-danger">Error loading data: ${error.message}</td></tr>`;
    });
}

/**
 * Render Modal Table Page
 */
function renderModalTablePage(pageData) {
  const tableBody = document.getElementById('modalDetailsTableBody');
  tableBody.innerHTML = '';

  pageData.forEach(supplier => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${supplier.name}</td>
      <td>${supplier.partNumber}</td>
      <td>${supplier.parentPartNo || '-'}</td>
      <td>${supplier.parentPartSupplier || '-'}</td>
      <td>${supplier.hwo}</td>
      <td>${supplier.level || '-'}</td>
      <td>${supplier.mfgLT}</td>
      <td>${supplier.quarters['2025-Q4'] || '-'}</td>
      <td>${supplier.quarters['2026-Q1'] || '-'}</td>
      <td>${supplier.quarters['2026-Q2'] || '-'}</td>
      <td>${supplier.quarters['2026-Q3'] || '-'}</td>
      <td>${supplier.quarters['2026-Q4'] || '-'}</td>
      <td>${supplier.quarters['2027-Q1'] || '-'}</td>
      <td>${supplier.quarters['2027-Q2'] || '-'}</td>
      <td>${supplier.quarters['2027-Q3'] || '-'}</td>
      <td>${supplier.quarters['2027-Q4'] || '-'}</td>
      <td>${supplier.quarters['2028-Q1'] || '-'}</td>
      <td>${supplier.quarters['2028-Q2'] || '-'}</td>
      <td>${supplier.quarters['2028-Q3'] || '-'}</td>
      <td>${supplier.quarters['2028-Q4'] || '-'}</td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * Setup Modal Table Pagination Controls
 */
function setupModalTablePaginationControls() {
  // Prevent duplicate event listener setup
  if (window.modalTablePaginationSetup) {
    updateModalTablePaginationUI();
    return;
  }
  
  window.modalTablePaginationSetup = true;
  
  const pageSizeSelect = document.getElementById('supplierDetailsPageSize');
  const prevBtn = document.getElementById('supplierDetailsPrevBtn');
  const nextBtn = document.getElementById('supplierDetailsNextBtn');

  // Page size change
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      window.modalTablePagination.pageSize = parseInt(e.target.value);
      window.modalTablePagination.currentPage = 1;
      window.modalTablePagination.renderTable();
      updateModalTablePaginationUI();
    });
  }

  // Previous button
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (window.modalTablePagination.currentPage > 1) {
        window.modalTablePagination.currentPage--;
        window.modalTablePagination.renderTable();
        updateModalTablePaginationUI();
      }
    });
  }

  // Next button
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = window.modalTablePagination.getTotalPages();
      if (window.modalTablePagination.currentPage < totalPages) {
        window.modalTablePagination.currentPage++;
        window.modalTablePagination.renderTable();
        updateModalTablePaginationUI();
      }
    });
  }

  // Initial UI update
  updateModalTablePaginationUI();
}

/**
 * Update Modal Table Pagination UI
 */
function updateModalTablePaginationUI() {
  const pageInfo = document.getElementById('supplierDetailsPageInfo');
  const recordInfo = document.getElementById('supplierDetailsRecordInfo');
  const prevBtn = document.getElementById('supplierDetailsPrevBtn');
  const nextBtn = document.getElementById('supplierDetailsNextBtn');

  if (!window.modalTablePagination) return;

  const totalPages = window.modalTablePagination.getTotalPages();
  const startRecord = (window.modalTablePagination.currentPage - 1) * window.modalTablePagination.pageSize + 1;
  const endRecord = Math.min(window.modalTablePagination.currentPage * window.modalTablePagination.pageSize, window.modalTablePagination.totalRecords);

  if (pageInfo) pageInfo.textContent = `Page ${window.modalTablePagination.currentPage} of ${totalPages}`;
  if (recordInfo) recordInfo.textContent = `Showing ${startRecord}-${endRecord} of ${window.modalTablePagination.totalRecords} records`;

  // Enable/disable buttons
  if (prevBtn) prevBtn.disabled = window.modalTablePagination.currentPage <= 1;
  if (nextBtn) nextBtn.disabled = window.modalTablePagination.currentPage >= totalPages;
}

/**
 * Setup Raw Material Search Filters
 */
function setupRawMaterialSearchFilters(allData) {
  const supplierSearch = document.getElementById('modalSupplierSearch');
  const partNumberSearch = document.getElementById('modalPartNumberSearch');
  const hwoSearch = document.getElementById('modalHWOSearch');
  
  if (!window.modalTablePagination) return;
  
  // Store original data
  if (!window.originalRawMaterialData) {
    window.originalRawMaterialData = allData;
  }
  
  const filterData = () => {
    const supplierFilter = supplierSearch?.value.toLowerCase() || '';
    const partNumberFilter = partNumberSearch?.value.toLowerCase() || '';
    const hwoFilter = hwoSearch?.value.toLowerCase() || '';
    
    const filtered = window.originalRawMaterialData.filter(item => {
      const matchesSupplier = !supplierFilter || (item.name && item.name.toLowerCase().includes(supplierFilter));
      const matchesPartNumber = !partNumberFilter || (item.partNumber && item.partNumber.toLowerCase().includes(partNumberFilter));
      const matchesHWO = !hwoFilter || (item.hwo && item.hwo.toLowerCase().includes(hwoFilter));
      
      return matchesSupplier && matchesPartNumber && matchesHWO;
    });
    
    window.modalTablePagination.setData(filtered);
    window.modalTablePagination.currentPage = 1;
    window.modalTablePagination.renderTable();
    updateModalTablePaginationUI();
    
    // Update the chart with filtered data
    updateModalChartWithFilteredData(filtered);
  };
  
  if (supplierSearch) {
    supplierSearch.addEventListener('input', filterData);
  }
  if (partNumberSearch) {
    partNumberSearch.addEventListener('input', filterData);
  }
  if (hwoSearch) {
    hwoSearch.addEventListener('input', filterData);
  }
}

/**
 * Update modal chart with filtered data
 */
function updateModalChartWithFilteredData(filteredData) {
  if (!modalChart) return;
  
  const supplierData = buildModalRawMaterialSupplierDataFromAPI(filteredData);
  
  // Update chart data
  modalChart.data.labels = supplierData.suppliers;
  modalChart.data.datasets[0].data = supplierData.data2025;
  modalChart.data.datasets[1].data = supplierData.data2026;
  modalChart.data.datasets[2].data = supplierData.data2027;
  modalChart.data.datasets[3].data = supplierData.data2028;
  
  // Update the chart
  modalChart.update();
}

/**
 * Filter table by supplier name (from chart click)
 */
function filterTableBySupplier(supplierName) {
  const supplierSearch = document.getElementById('modalSupplierSearch');
  if (supplierSearch) {
    supplierSearch.value = supplierName;
    
    // Trigger the filter
    if (window.originalRawMaterialData && window.modalTablePagination) {
      const partNumberFilter = document.getElementById('modalPartNumberSearch')?.value.toLowerCase() || '';
      const hwoFilter = document.getElementById('modalHWOSearch')?.value.toLowerCase() || '';
      
      const filtered = window.originalRawMaterialData.filter(item => {
        const matchesSupplier = item.name && item.name.toLowerCase().includes(supplierName.toLowerCase());
        const matchesPartNumber = !partNumberFilter || (item.partNumber && item.partNumber.toLowerCase().includes(partNumberFilter));
        const matchesHWO = !hwoFilter || (item.hwo && item.hwo.toLowerCase().includes(hwoFilter));
        
        return matchesSupplier && matchesPartNumber && matchesHWO;
      });
      
      window.modalTablePagination.setData(filtered);
      window.modalTablePagination.currentPage = 1;
      window.modalTablePagination.renderTable();
      updateModalTablePaginationUI();
      
      // Update the chart with filtered data
      updateModalChartWithFilteredData(filtered);
    }
  }
}

/**
 * Helper function to get year from date
 */
function getYearFromDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.getFullYear().toString();
}

/**
 * Helper function to get quarter from date
 */
function getQuarterFromDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const month = date.getMonth();
  return `Q${Math.floor(month / 3) + 1}`;
}

// Export modal data function
function exportModalData() {
  console.log('Exporting modal data...');
  // Implementation for export functionality
}

// Make functions globally available
window.showRawMaterialDetailsModal = showRawMaterialDetailsModal;
window.renderModalRawMaterialChart = renderModalRawMaterialChart;
window.renderModalDetailsTable = renderModalDetailsTable;
window.exportModalData = exportModalData;
