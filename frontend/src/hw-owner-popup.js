/**
 * HW Owner Modal
 * Handles the display and interaction for HW Owner details
 * Shows horizontal bar chart and detailed table with filtering, pagination, and gap status
 */

// ===== HW OWNER DETAILS MODAL FUNCTIONS =====

// Helper function to get top 5 suppliers for HW Owner modal
function getHWOwnerTop5(fullData) {
  if (!fullData || !fullData.labels || fullData.labels.length === 0) {
    return {
      labels: [],
      data2025: [],
      data2026: [],
      data2027: [],
      data2028: []
    };
  }
  
  const top5Count = Math.min(5, fullData.labels.length);
  return {
    labels: fullData.labels.slice(0, top5Count),
    data2025: fullData.data2025.slice(0, top5Count),
    data2026: fullData.data2026.slice(0, top5Count),
    data2027: fullData.data2027.slice(0, top5Count),
    data2028: fullData.data2028.slice(0, top5Count)
  };
}

// Helper function to filter HW Owner table by supplier name
function filterHWOwnerTableBySupplier(supplierName) {
  if (!window.originalHWOwnerData) {
    console.warn('No original data available for filtering');
    return;
  }
  
  // Filter the data by supplier name
  const filteredData = window.originalHWOwnerData.filter(row => 
    row.supplier === supplierName
  );
  
  console.log(`Filtered to ${filteredData.length} rows for supplier: ${supplierName}`);
  
  // Re-render the table with filtered data
  renderHWOwnerDetailsTable(filteredData);
}

// Helper function to update HW Owner chart with filtered data
function updateHWOwnerChartWithFilteredData() {
  if (!window.modalHWOwnerChart || !window.originalHWOwnerData) {
    return;
  }
  
  // Get current search filters
  const supplierFilter = document.getElementById('modalHWOwnerSupplierSearch')?.value.toLowerCase() || '';
  const partNumberFilter = document.getElementById('modalHWOwnerPartNumberSearch')?.value.toLowerCase() || '';
  const partDescFilter = document.getElementById('modalHWOwnerPartDescSearch')?.value.toLowerCase() || '';
  
  // Filter the original data
  let filteredData = window.originalHWOwnerData.filter(row => {
    const matchesSupplier = !supplierFilter || (row.supplier && row.supplier.toLowerCase().includes(supplierFilter));
    const matchesPartNumber = !partNumberFilter || (row.partNumber && row.partNumber.toLowerCase().includes(partNumberFilter));
    const matchesPartDesc = !partDescFilter || (row.description && row.description.toLowerCase().includes(partDescFilter));
    
    return matchesSupplier && matchesPartNumber && matchesPartDesc;
  });
  
  // Rebuild chart data from filtered data
  const supplierMap = new Map();
  
  filteredData.forEach(row => {
    if (!supplierMap.has(row.supplier)) {
      supplierMap.set(row.supplier, { '2025': 0, '2026': 0, '2027': 0, '2028': 0 });
    }
    
    const yearData = supplierMap.get(row.supplier);
    if (row.year2025) yearData['2025'] += row.year2025;
    if (row.year2026) yearData['2026'] += row.year2026;
    if (row.year2027) yearData['2027'] += row.year2027;
    if (row.year2028) yearData['2028'] += row.year2028;
  });
  
  // Sort suppliers by total demand
  const suppliers = Array.from(supplierMap.keys()).sort((a, b) => {
    const totalA = supplierMap.get(a)['2025'] + supplierMap.get(a)['2026'] + supplierMap.get(a)['2027'] + supplierMap.get(a)['2028'];
    const totalB = supplierMap.get(b)['2025'] + supplierMap.get(b)['2026'] + supplierMap.get(b)['2027'] + supplierMap.get(b)['2028'];
    return totalB - totalA;
  });
  
  const data2025 = suppliers.map(s => supplierMap.get(s)['2025'] || 0);
  const data2026 = suppliers.map(s => supplierMap.get(s)['2026'] || 0);
  const data2027 = suppliers.map(s => supplierMap.get(s)['2027'] || 0);
  const data2028 = suppliers.map(s => supplierMap.get(s)['2028'] || 0);
  
  // Update full data
  window.fullHWOwnerChartData = {
    labels: suppliers,
    data2025: data2025,
    data2026: data2026,
    data2027: data2027,
    data2028: data2028
  };
  
  // Show top 5 of filtered data
  const top5Data = getHWOwnerTop5(window.fullHWOwnerChartData);
  
  // Update chart
  window.modalHWOwnerChart.data.labels = top5Data.labels;
  window.modalHWOwnerChart.data.datasets[0].data = top5Data.data2025;
  window.modalHWOwnerChart.data.datasets[1].data = top5Data.data2026;
  window.modalHWOwnerChart.data.datasets[2].data = top5Data.data2027;
  window.modalHWOwnerChart.data.datasets[3].data = top5Data.data2028;
  window.modalHWOwnerChart.options.scales.y.min = 0;
  window.modalHWOwnerChart.options.scales.y.max = Math.min(4, suppliers.length - 1);
  window.modalHWOwnerChart.options.plugins.zoom.limits.y.max = suppliers.length - 1;
  window.modalHWOwnerChart.update();
}

function showHWOwnerDetailsModal(hwoName) {
  console.log('🔵 Showing modal for HW Owner:', hwoName);
  
  // Clear search filters
  const modalHWOwnerSupplierSearch = document.getElementById('modalHWOwnerSupplierSearch');
  const modalHWOwnerPartNumberSearch = document.getElementById('modalHWOwnerPartNumberSearch');
  const modalHWOwnerPartDescSearch = document.getElementById('modalHWOwnerPartDescSearch');
  const modalHWOwnerGapStatusFilter = document.getElementById('modalHWOwnerGapStatusFilter');
  
  if (modalHWOwnerSupplierSearch) modalHWOwnerSupplierSearch.value = '';
  if (modalHWOwnerPartNumberSearch) modalHWOwnerPartNumberSearch.value = '';
  if (modalHWOwnerPartDescSearch) modalHWOwnerPartDescSearch.value = '';
  if (modalHWOwnerGapStatusFilter) modalHWOwnerGapStatusFilter.value = '';
  
  // Set modal title
  const modalLabel = document.getElementById('hwOwnerModalLabel');
  if (modalLabel) {
    modalLabel.textContent = `HW Owner: ${hwoName} - Supplier Details`;
  }
  
  // Get modal and show it
  const modalElement = document.getElementById('hwOwnerModal');
  if (!modalElement) {
    console.error('❌ hwOwnerModal element not found');
    return;
  }
  
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
  
  // Fetch data and render chart and table
  renderHWOwnerDetailsChart(hwoName);
  renderHWOwnerDetailsTable(hwoName);
}

function renderHWOwnerDetailsChart(hwoName) {
  console.log('📊 renderHWOwnerDetailsChart called for:', hwoName);
  const ctx = document.getElementById('modalHWOwnerChart');
  
  if (!ctx) {
    console.error('❌ modalHWOwnerChart canvas not found');
    return;
  }
  
  // Set chart title
  const chartTitle = document.getElementById('modalHWOwnerChartTitle');
  if (chartTitle) {
    chartTitle.textContent = `${hwoName} - Supplier Demand per Part`;
  }
  
  // Fetch chart data from backend
  fetch(`/api/hw-owner-details/${encodeURIComponent(hwoName)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      console.log('📦 Fetched HW Owner data from API:', {
        count: result.data.length,
        sample: result.data[0]
      });
      
      const hwOwnerData = result.data;
      
      // Aggregate by supplier
      const supplierMap = new Map();
      
      hwOwnerData.forEach(item => {
        const supplier = item.name;
        if (!supplierMap.has(supplier)) {
          supplierMap.set(supplier, { '2025': 0, '2026': 0, '2027': 0, '2028': 0 });
        }
        
        const yearData = supplierMap.get(supplier);
        Object.keys(item.quarters).forEach(quarterKey => {
          const year = parseInt(quarterKey.split('-')[0]);
          if (year >= 2025 && year <= 2028) {
            yearData[year.toString()] += item.quarters[quarterKey];
          }
        });
      });
      
      // Sort suppliers by total demand (descending)
      const suppliers = Array.from(supplierMap.keys()).sort((a, b) => {
        const totalA = supplierMap.get(a)['2025'] + supplierMap.get(a)['2026'] + supplierMap.get(a)['2027'] + supplierMap.get(a)['2028'];
        const totalB = supplierMap.get(b)['2025'] + supplierMap.get(b)['2026'] + supplierMap.get(b)['2027'] + supplierMap.get(b)['2028'];
        return totalB - totalA;
      });
      
      const data2025 = suppliers.map(s => supplierMap.get(s)['2025'] || 0);
      const data2026 = suppliers.map(s => supplierMap.get(s)['2026'] || 0);
      const data2027 = suppliers.map(s => supplierMap.get(s)['2027'] || 0);
      const data2028 = suppliers.map(s => supplierMap.get(s)['2028'] || 0);
      
      console.log('📊 Chart data prepared:', {
        suppliers: suppliers.length,
        sample: suppliers[0],
        data2025Sample: data2025[0],
        data2026Sample: data2026[0]
      });
      
      // Store full data for zoom/pan
      window.fullHWOwnerChartData = {
        labels: suppliers,
        data2025: data2025,
        data2026: data2026,
        data2027: data2027,
        data2028: data2028
      };
      
      // Show only top 5 by default
      const top5Data = getHWOwnerTop5(window.fullHWOwnerChartData);
      
      // Destroy existing chart
      if (window.modalHWOwnerChart && typeof window.modalHWOwnerChart.destroy === 'function') {
        console.log('🗑️ Destroying existing chart');
        window.modalHWOwnerChart.destroy();
      }
      
      console.log('✨ Creating new Chart.js instance');
      window.modalHWOwnerChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: top5Data.labels,
          datasets: [
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
            },
            {
              label: '2028',
              data: top5Data.data2028,
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
                  max: suppliers.length - 1
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              stacked: true,
              title: { display: true, text: 'Demand' }
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
              chart.data.datasets[3].data = top5Data.data2028;
              chart.options.scales.y.min = 0;
              chart.options.scales.y.max = 4;
              chart.update();
            } else if (activeElements.length > 0) {
              // Get the clicked supplier name
              const clickedIndex = activeElements[0].index;
              const supplierName = chart.data.labels[clickedIndex];
              
              // Filter the table by this supplier
              filterHWOwnerTableBySupplier(supplierName);
            }
          }
        }
      });
      
      console.log('✅ HW Owner chart rendered successfully');
      
      // Setup reset zoom button
      const resetBtn = document.getElementById('resetHWOwnerZoom');
      if (resetBtn) {
        resetBtn.onclick = () => {
          if (window.modalHWOwnerChart) {
            // Reset to show top 5
            window.modalHWOwnerChart.data.labels = top5Data.labels;
            window.modalHWOwnerChart.data.datasets[0].data = top5Data.data2025;
            window.modalHWOwnerChart.data.datasets[1].data = top5Data.data2026;
            window.modalHWOwnerChart.data.datasets[2].data = top5Data.data2027;
            window.modalHWOwnerChart.data.datasets[3].data = top5Data.data2028;
            window.modalHWOwnerChart.options.scales.y.min = 0;
            window.modalHWOwnerChart.options.scales.y.max = 4;
            window.modalHWOwnerChart.update();
          }
        };
      }
      
      // Setup show all button
      const showAllBtn = document.getElementById('showAllHWOwner');
      if (showAllBtn) {
        showAllBtn.onclick = () => {
          if (window.modalHWOwnerChart && window.fullHWOwnerChartData) {
            window.modalHWOwnerChart.data.labels = window.fullHWOwnerChartData.labels;
            window.modalHWOwnerChart.data.datasets[0].data = window.fullHWOwnerChartData.data2025;
            window.modalHWOwnerChart.data.datasets[1].data = window.fullHWOwnerChartData.data2026;
            window.modalHWOwnerChart.data.datasets[2].data = window.fullHWOwnerChartData.data2027;
            window.modalHWOwnerChart.data.datasets[3].data = window.fullHWOwnerChartData.data2028;
            window.modalHWOwnerChart.options.scales.y.min = 0;
            window.modalHWOwnerChart.options.scales.y.max = Math.min(9, window.fullHWOwnerChartData.labels.length - 1);
            window.modalHWOwnerChart.update();
          }
        };
      }
    })
    .catch(error => {
      console.error('❌ Error loading HW Owner chart:', error);
      const chartContainer = ctx.parentElement;
      chartContainer.innerHTML = `<div class="text-center text-danger p-4">Error loading chart: ${error.message}</div>`;
    });
}

function filterHWOwnerTableBySupplier(supplierName) {
  if (!window.originalHWOwnerData) {
    console.warn('No original data available for filtering');
    return;
  }
  
  // Filter the data by supplier name
  const filteredData = window.originalHWOwnerData.filter(row => 
    row.supplier === supplierName
  );
  
  console.log(`Filtered to ${filteredData.length} rows for supplier: ${supplierName}`);
  
  // Update the table pagination with filtered data
  if (window.modalHWOwnerTablePagination) {
    window.modalHWOwnerTablePagination.setData(filteredData);
    window.modalHWOwnerTablePagination.renderTable();
  }
}

function renderHWOwnerDetailsTable(hwoName) {
  console.log('📋 renderHWOwnerDetailsTable called for:', hwoName);
  const tableBody = document.getElementById('modalHWOwnerDetailsTableBody');
  
  // Show loading state
  tableBody.innerHTML = '<tr><td colspan="18" class="text-center">Loading data...</td></tr>';
  
  // Fetch data from backend API
  fetch(`/api/hw-owner-details/${encodeURIComponent(hwoName)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      console.log('📦 Fetched HW Owner details from API:', {
        count: result.data.length,
        sample: result.data[0]
      });
      
      const hwOwnerDetails = result.data;
      
      // Store original data with properly formatted structure for chart filtering
      window.originalHWOwnerData = hwOwnerDetails.map(item => ({
        ...item,
        supplier: item.name,  // Chart uses 'supplier', table uses 'name'
        year2025: (item.quarters['2025-Q1'] || 0) + (item.quarters['2025-Q2'] || 0) + (item.quarters['2025-Q3'] || 0) + (item.quarters['2025-Q4'] || 0),
        year2026: (item.quarters['2026-Q1'] || 0) + (item.quarters['2026-Q2'] || 0) + (item.quarters['2026-Q3'] || 0) + (item.quarters['2026-Q4'] || 0),
        year2027: (item.quarters['2027-Q1'] || 0) + (item.quarters['2027-Q2'] || 0) + (item.quarters['2027-Q3'] || 0) + (item.quarters['2027-Q4'] || 0),
        year2028: (item.quarters['2028-Q1'] || 0) + (item.quarters['2028-Q2'] || 0) + (item.quarters['2028-Q3'] || 0) + (item.quarters['2028-Q4'] || 0)
      }));
      
      // Initialize pagination manager for HW Owner modal table
      if (!window.modalHWOwnerTablePagination) {
        console.log('🆕 Creating new TablePaginationManager for HW Owner');
        window.modalHWOwnerTablePagination = new TablePaginationManager('modalHWOwnerDetailsTable', (pageData) => {
          renderHWOwnerModalTablePage(pageData);
        });
      }

      // Set the data and render first page
      window.modalHWOwnerTablePagination.setData(hwOwnerDetails);
      window.modalHWOwnerTablePagination.pageSize = parseInt(document.getElementById('hwOwnerDetailsPageSize')?.value || 10);
      console.log('📄 Rendering table with pageSize:', window.modalHWOwnerTablePagination.pageSize);
      window.modalHWOwnerTablePagination.renderTable();

      // Setup pagination controls
      setupHWOwnerModalTablePaginationControls();
      
      // Setup search filters
      setupHWOwnerSearchFilters(hwOwnerDetails);
    })
    .catch(error => {
      console.error('Error fetching HW Owner details:', error);
      tableBody.innerHTML = `<tr><td colspan="18" class="text-center text-danger">Error loading data: ${error.message}</td></tr>`;
    });
}

function renderHWOwnerModalTablePage(pageData) {
  const tableBody = document.getElementById('modalHWOwnerDetailsTableBody');
  tableBody.innerHTML = '';

  pageData.forEach(item => {
    const row = document.createElement('tr');
    
    // Determine gap status styling
    const gapStatus = item.gapStatus || 'N/A';
    let gapClass = '';
    let gapDisplay = gapStatus;
    
    if (gapStatus === 'Y' || gapStatus === 'YES' || gapStatus === 'yes') {
      gapClass = 'badge bg-danger';
      gapDisplay = 'Gap';
    } else if (gapStatus === 'N' || gapStatus === 'NO' || gapStatus === 'no') {
      gapClass = 'badge bg-success';
      gapDisplay = 'No Gap';
    } else {
      gapClass = 'badge bg-secondary';
      gapDisplay = 'N/A';
    }
    
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.partNumber}</td>
      <td>${item.description}</td>
      <td>${item.hwo}</td>
      <td><span class="${gapClass}">${gapDisplay}</span></td>
      <td>${item.quarters['2025-Q4'] || '-'}</td>
      <td>${item.quarters['2026-Q1'] || '-'}</td>
      <td>${item.quarters['2026-Q2'] || '-'}</td>
      <td>${item.quarters['2026-Q3'] || '-'}</td>
      <td>${item.quarters['2026-Q4'] || '-'}</td>
      <td>${item.quarters['2027-Q1'] || '-'}</td>
      <td>${item.quarters['2027-Q2'] || '-'}</td>
      <td>${item.quarters['2027-Q3'] || '-'}</td>
      <td>${item.quarters['2027-Q4'] || '-'}</td>
      <td>${item.quarters['2028-Q1'] || '-'}</td>
      <td>${item.quarters['2028-Q2'] || '-'}</td>
      <td>${item.quarters['2028-Q3'] || '-'}</td>
      <td>${item.quarters['2028-Q4'] || '-'}</td>
    `;
    tableBody.appendChild(row);
  });
}

function setupHWOwnerModalTablePaginationControls() {
  if (window.hwOwnerModalTablePaginationSetup) {
    updateHWOwnerModalTablePaginationUI();
    return;
  }
  
  window.hwOwnerModalTablePaginationSetup = true;
  
  const pageSizeSelect = document.getElementById('hwOwnerDetailsPageSize');
  const prevBtn = document.getElementById('hwOwnerDetailsPrevBtn');
  const nextBtn = document.getElementById('hwOwnerDetailsNextBtn');
  const pageInfo = document.getElementById('hwOwnerDetailsPageInfo');
  const recordInfo = document.getElementById('hwOwnerDetailsRecordInfo');

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      window.modalHWOwnerTablePagination.pageSize = parseInt(e.target.value);
      window.modalHWOwnerTablePagination.currentPage = 1;
      window.modalHWOwnerTablePagination.renderTable();
      updateHWOwnerModalTablePaginationUI();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (window.modalHWOwnerTablePagination.currentPage > 1) {
        window.modalHWOwnerTablePagination.currentPage--;
        window.modalHWOwnerTablePagination.renderTable();
        updateHWOwnerModalTablePaginationUI();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = window.modalHWOwnerTablePagination.getTotalPages();
      if (window.modalHWOwnerTablePagination.currentPage < totalPages) {
        window.modalHWOwnerTablePagination.currentPage++;
        window.modalHWOwnerTablePagination.renderTable();
        updateHWOwnerModalTablePaginationUI();
      }
    });
  }
  
  updateHWOwnerModalTablePaginationUI();
}

function updateHWOwnerModalTablePaginationUI() {
  if (!window.modalHWOwnerTablePagination) return;
  
  const pagination = window.modalHWOwnerTablePagination;
  const totalPages = pagination.getTotalPages();
  const startIdx = ((pagination.currentPage - 1) * pagination.pageSize) + 1;
  const endIdx = Math.min(pagination.currentPage * pagination.pageSize, pagination.allData.length);
  
  const prevBtn = document.getElementById('hwOwnerDetailsPrevBtn');
  const nextBtn = document.getElementById('hwOwnerDetailsNextBtn');
  const pageInfo = document.getElementById('hwOwnerDetailsPageInfo');
  const recordInfo = document.getElementById('hwOwnerDetailsRecordInfo');

  if (prevBtn) prevBtn.disabled = pagination.currentPage === 1;
  if (nextBtn) nextBtn.disabled = pagination.currentPage >= totalPages;
  
  if (pageInfo) {
    pageInfo.textContent = `Page ${pagination.currentPage} of ${totalPages}`;
  }
  
  if (recordInfo) {
    recordInfo.textContent = `Showing ${startIdx}-${endIdx} of ${pagination.allData.length} records`;
  }
}

function setupHWOwnerSearchFilters(allData) {
  const supplierSearch = document.getElementById('modalHWOwnerSupplierSearch');
  const partNumberSearch = document.getElementById('modalHWOwnerPartNumberSearch');
  const partDescSearch = document.getElementById('modalHWOwnerPartDescSearch');
  const gapStatusFilter = document.getElementById('modalHWOwnerGapStatusFilter');
  
  if (!window.modalHWOwnerTablePagination) return;
  
  // Store original data
  if (!window.originalHWOwnerData) {
    window.originalHWOwnerData = allData;
  }
  
  const filterData = () => {
    const supplierFilter = supplierSearch?.value.toLowerCase() || '';
    const partNumberFilter = partNumberSearch?.value.toLowerCase() || '';
    const partDescFilter = partDescSearch?.value.toLowerCase() || '';
    const gapFilter = gapStatusFilter?.value || '';
    
    const filtered = window.originalHWOwnerData.filter(item => {
      const matchesSupplier = !supplierFilter || (item.name && item.name.toLowerCase().includes(supplierFilter));
      const matchesPartNumber = !partNumberFilter || (item.partNumber && item.partNumber.toLowerCase().includes(partNumberFilter));
      const matchesPartDesc = !partDescFilter || (item.description && item.description.toLowerCase().includes(partDescFilter));
      
      // Gap status filter
      let matchesGap = true;
      if (gapFilter) {
        const gapStatus = (item.gapStatus || '').toUpperCase();
        if (gapFilter === 'gap') {
          matchesGap = gapStatus === 'Y' || gapStatus === 'YES';
        } else if (gapFilter === 'nogap') {
          matchesGap = gapStatus === 'N' || gapStatus === 'NO';
        }
      }
      
      return matchesSupplier && matchesPartNumber && matchesPartDesc && matchesGap;
    });
    
    window.modalHWOwnerTablePagination.setData(filtered);
    window.modalHWOwnerTablePagination.currentPage = 1;
    window.modalHWOwnerTablePagination.renderTable();
    updateHWOwnerModalTablePaginationUI();
    
    // Also update the chart with filtered data
    updateHWOwnerChartWithFilteredData();
  };
  
  if (supplierSearch) {
    supplierSearch.addEventListener('input', filterData);
  }
  if (partNumberSearch) {
    partNumberSearch.addEventListener('input', filterData);
  }
  if (partDescSearch) {
    partDescSearch.addEventListener('input', filterData);
  }
  if (gapStatusFilter) {
    gapStatusFilter.addEventListener('change', filterData);
  }
}
