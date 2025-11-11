/**
 * Supplier Type Modal
 * Handles the display and interaction for supplier type details (Internal/AEO/External)
 * Shows horizontal bar chart and detailed table with filtering and pagination
 */

// ===== SUPPLIER TYPE DETAILS MODAL FUNCTIONS =====

// Helper function to get top 5 suppliers for supplier type modal
function getSupplierTypeTop5(fullData) {
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

// Helper function to filter supplier type table by supplier name
function filterSupplierTypeTableBySupplier(supplierName) {
  if (!window.originalSupplierTypeData) {
    console.warn('No original data available for filtering');
    return;
  }
  
  // Filter the data by supplier name
  const filteredData = window.originalSupplierTypeData.filter(row => 
    row.supplier === supplierName
  );
  
  console.log(`Filtered to ${filteredData.length} rows for supplier: ${supplierName}`);
  
  // Update the table pagination with filtered data
  if (window.modalSupplierTypeTablePagination) {
    window.modalSupplierTypeTablePagination.setData(filteredData);
    window.modalSupplierTypeTablePagination.renderTable();
  }
}

// Helper function to update supplier type chart with filtered data
function updateSupplierTypeChartWithFilteredData() {
  if (!window.modalSupplierTypeChart || !window.originalSupplierTypeData) {
    return;
  }
  
  // Get current search filters
  const supplierFilter = document.getElementById('modalSupplierTypeSupplierSearch')?.value.toLowerCase() || '';
  const partNumberFilter = document.getElementById('modalSupplierTypePartNumberSearch')?.value.toLowerCase() || '';
  const hwOwnerFilter = document.getElementById('modalSupplierTypeHWOSearch')?.value.toLowerCase() || '';
  
  // Filter the original data
  let filteredData = window.originalSupplierTypeData.filter(row => {
    const matchesSupplier = !supplierFilter || (row.supplier && row.supplier.toLowerCase().includes(supplierFilter));
    const matchesPartNumber = !partNumberFilter || (row.partNumber && row.partNumber.toLowerCase().includes(partNumberFilter));
    const matchesHWO = !hwOwnerFilter || (row.hwOwner && row.hwOwner.toLowerCase().includes(hwOwnerFilter));
    
    return matchesSupplier && matchesPartNumber && matchesHWO;
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
  window.fullSupplierTypeChartData = {
    labels: suppliers,
    data2025: data2025,
    data2026: data2026,
    data2027: data2027,
    data2028: data2028
  };
  
  // Show top 5 of filtered data
  const top5Data = getSupplierTypeTop5(window.fullSupplierTypeChartData);
  
  // Update chart
  window.modalSupplierTypeChart.data.labels = top5Data.labels;
  window.modalSupplierTypeChart.data.datasets[0].data = top5Data.data2025;
  window.modalSupplierTypeChart.data.datasets[1].data = top5Data.data2026;
  window.modalSupplierTypeChart.data.datasets[2].data = top5Data.data2027;
  window.modalSupplierTypeChart.data.datasets[3].data = top5Data.data2028;
  window.modalSupplierTypeChart.options.scales.y.min = 0;
  window.modalSupplierTypeChart.options.scales.y.max = Math.min(4, suppliers.length - 1);
  window.modalSupplierTypeChart.options.plugins.zoom.limits.y.max = suppliers.length - 1;
  window.modalSupplierTypeChart.update();
}

function showSupplierTypeDetailsModal(supplierType) {
  console.log('🔵 Showing modal for supplier type:', supplierType);
  
  // Clear search filters
  const modalSupplierTypeSupplierSearch = document.getElementById('modalSupplierTypeSupplierSearch');
  const modalSupplierTypePartNumberSearch = document.getElementById('modalSupplierTypePartNumberSearch');
  const modalSupplierTypeHWOSearch = document.getElementById('modalSupplierTypeHWOSearch');
  if (modalSupplierTypeSupplierSearch) modalSupplierTypeSupplierSearch.value = '';
  if (modalSupplierTypePartNumberSearch) modalSupplierTypePartNumberSearch.value = '';
  if (modalSupplierTypeHWOSearch) modalSupplierTypeHWOSearch.value = '';
  
  // Clear original data cache
  window.originalSupplierTypeData = null;

  // Update modal title
  document.getElementById('supplierTypeModalLabel').textContent = `${supplierType} Supplier Details`;
  document.getElementById('modalSupplierTypeChartTitle').textContent = `${supplierType} Supplier Demand per Part`;

  // Get modal element
  const modalElement = document.getElementById('supplierTypeModal');
  
  // Show the modal
  const modal = new bootstrap.Modal(modalElement);
  
  // Remove any previous event listeners
  modalElement.removeEventListener('shown.bs.modal', handleModalShown);
  
  // Define handler function
  function handleModalShown() {
    console.log('✅ Supplier type modal is now fully visible');
    // Small delay to ensure canvas is ready
    setTimeout(() => {
      renderSupplierTypeDetailsTable(supplierType);
      renderModalSupplierTypeChart(supplierType);
    }, 150);
  }
  
  // Add event listener for when modal is shown
  modalElement.addEventListener('shown.bs.modal', handleModalShown, { once: true });
  
  modal.show();
}

window.showSupplierTypeDetailsModal = showSupplierTypeDetailsModal;

function renderModalSupplierTypeChart(supplierType) {
  console.log('📊 Rendering supplier type modal chart for:', supplierType);
  
  // Check if canvas exists
  const ctx = document.getElementById('modalSupplierTypeChart');
  if (!ctx) {
    console.error('❌ Canvas element modalSupplierTypeChart not found');
    return;
  }
  
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('❌ Chart.js is not loaded');
    return;
  }
  
  // Fetch data from API
  fetch(`/api/supplier-details/${encodeURIComponent(supplierType)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      console.log('📦 API response for supplier type chart:', result);
      
      if (result.status !== 'success' || !result.data || result.data.length === 0) {
        console.log('No data for supplier type chart');
        // Show message in chart area
        const chartContainer = ctx.parentElement;
        chartContainer.innerHTML = '<div class="text-center text-muted p-4">No data available for this supplier type</div>';
        return;
      }
      
      const supplierDetails = result.data;
      console.log(`📊 Processing ${supplierDetails.length} supplier records`);
      
      // Aggregate by supplier
      const supplierMap = new Map();
      supplierDetails.forEach(item => {
        if (!supplierMap.has(item.name)) {
          supplierMap.set(item.name, { '2025': 0, '2026': 0, '2027': 0, '2028': 0 });
        }
        const supplier = supplierMap.get(item.name);
        Object.keys(item.quarters).forEach(qKey => {
          const year = qKey.split('-')[0];
          supplier[year] = (supplier[year] || 0) + item.quarters[qKey];
        });
      });
      
      // Sort by total demand
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
      
      console.log('📊 Chart data prepared:', {
        suppliers: suppliers.length,
        sample: suppliers[0],
        data2025Sample: data2025[0],
        data2026Sample: data2026[0]
      });
      
      // Store full data for zoom/pan
      window.fullSupplierTypeChartData = {
        labels: suppliers,
        data2025: data2025,
        data2026: data2026,
        data2027: data2027,
        data2028: data2028
      };
      
      // Show only top 5 by default
      const top5Data = getSupplierTypeTop5(window.fullSupplierTypeChartData);
      
      // Destroy existing chart
      if (window.modalSupplierTypeChart && typeof window.modalSupplierTypeChart.destroy === 'function') {
        console.log('🗑️ Destroying existing chart');
        window.modalSupplierTypeChart.destroy();
      }
      
      console.log('✨ Creating new Chart.js instance');
      window.modalSupplierTypeChart = new Chart(ctx, {
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
        plugins: [ChartDataLabels],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          layout: {
            padding: {
              right: 60  // Add padding on right for total labels
            }
          },
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
            // Configure datalabels to show totals to the right of bars
            datalabels: {
              display: function(context) {
                // Only show label on the last dataset (2028) to avoid duplicates
                return context.datasetIndex === 3;
              },
              formatter: function(value, context) {
                // Calculate total across all years for this supplier
                const dataIndex = context.dataIndex;
                const total = 
                  (context.chart.data.datasets[0].data[dataIndex] || 0) +
                  (context.chart.data.datasets[1].data[dataIndex] || 0) +
                  (context.chart.data.datasets[2].data[dataIndex] || 0) +
                  (context.chart.data.datasets[3].data[dataIndex] || 0);
                return total.toLocaleString();
              },
              anchor: 'end',
              align: 'end',
              offset: 4,
              color: '#1f2937',
              font: {
                weight: 'bold',
                size: 11
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
              // Get the clicked supplier and its index in the full data
              const clickedIndex = activeElements[0].index;
              const currentLabel = chart.data.labels[clickedIndex];
              
              // Find the index in the full dataset
              const fullDataIndex = window.fullSupplierTypeChartData.labels.indexOf(currentLabel);
              
              if (fullDataIndex !== -1) {
                // Show only the clicked bar
                chart.data.labels = [window.fullSupplierTypeChartData.labels[fullDataIndex]];
                chart.data.datasets[0].data = [window.fullSupplierTypeChartData.data2025[fullDataIndex]];
                chart.data.datasets[1].data = [window.fullSupplierTypeChartData.data2026[fullDataIndex]];
                chart.data.datasets[2].data = [window.fullSupplierTypeChartData.data2027[fullDataIndex]];
                chart.data.datasets[3].data = [window.fullSupplierTypeChartData.data2028[fullDataIndex]];
                chart.options.scales.y.min = 0;
                chart.options.scales.y.max = 0; // Single item
                chart.update();
                
                // Also filter the table by this supplier
                filterSupplierTypeTableBySupplier(currentLabel);
              }
            }
          }
        }
      });
      
      console.log('✅ Supplier type chart rendered successfully');
      
      // Populate Quick Select dropdown with Top 5, Top 10, Top 15, and All
      const totalRecords = suppliers.length;
      const rangeSelect = document.getElementById('supplierTypeRangeSelect');
      if (rangeSelect) {
        // Clear existing options
        rangeSelect.innerHTML = '';
        
        // Add Top 5, Top 10, Top 15 options
        const topOptions = [5, 10, 15];
        topOptions.forEach((count, index) => {
          if (count <= totalRecords) {
            const option = document.createElement('option');
            option.value = `1-${count}`;
            option.textContent = `Top ${count}`;
            if (index === 0) option.selected = true;
            rangeSelect.appendChild(option);
          }
        });
        
        // Add "All" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = `All (${totalRecords})`;
        rangeSelect.appendChild(allOption);
        
        // Setup dropdown change handler
        rangeSelect.onchange = () => {
          if (window.modalSupplierTypeChart && window.fullSupplierTypeChartData) {
            const range = rangeSelect.value;
            let startIdx, endIdx;
            
            if (range === 'all') {
              startIdx = 0;
              endIdx = window.fullSupplierTypeChartData.labels.length;
            } else {
              const [start, end] = range.split('-').map(Number);
              startIdx = start - 1;
              endIdx = end;
            }
            
            updateSupplierTypeChartRange(startIdx, endIdx);
            
            // Update range controls to match
            const rangeStartInput = document.getElementById('supplierTypeRangeStart');
            const rangeEndInput = document.getElementById('supplierTypeRangeEnd');
            const rangeSlider = document.getElementById('supplierTypeRangeSlider');
            if (rangeStartInput && rangeEndInput && rangeSlider) {
              rangeStartInput.value = startIdx + 1;
              rangeEndInput.value = endIdx;
              rangeSlider.value = endIdx;
            }
          }
        };
      }
      
      // Setup compact range controls
      const rangeStart = document.getElementById('supplierTypeRangeStart');
      const rangeEnd = document.getElementById('supplierTypeRangeEnd');
      const rangeSlider = document.getElementById('supplierTypeRangeSlider');
      const applyRangeBtn = document.getElementById('applySupplierTypeRange');
      
      if (rangeStart && rangeEnd && rangeSlider) {
        // Set max values based on actual data
        rangeStart.max = totalRecords;
        rangeEnd.max = totalRecords;
        rangeSlider.max = totalRecords;
        rangeStart.value = 1;
        rangeEnd.value = Math.min(5, totalRecords);
        rangeSlider.value = Math.min(5, totalRecords);
        
        // Slider controls the end position (mapped to end range number)
        rangeSlider.oninput = () => {
          const end = parseInt(rangeSlider.value);
          rangeEnd.value = end;
          // Keep start at 1 for "Top N" behavior, or adjust if needed
          if (parseInt(rangeStart.value) > end) {
            rangeStart.value = Math.max(1, end - 4);
          }
        };
        
        // Number inputs update slider
        rangeStart.oninput = () => {
          const start = parseInt(rangeStart.value);
          if (start > parseInt(rangeEnd.value)) {
            rangeEnd.value = Math.min(start + 4, totalRecords);
            rangeSlider.value = rangeEnd.value;
          }
        };
        
        rangeEnd.oninput = () => {
          const end = parseInt(rangeEnd.value);
          if (end < parseInt(rangeStart.value)) {
            rangeStart.value = Math.max(1, end - 4);
          }
          rangeSlider.value = end;
        };
        
        // Apply button handler
        if (applyRangeBtn) {
          applyRangeBtn.onclick = () => {
            const start = parseInt(rangeStart.value);
            const end = parseInt(rangeEnd.value);
            
            if (start > end) {
              alert('Start value must be less than or equal to End value');
              return;
            }
            
            if (start < 1 || end > totalRecords) {
              alert(`Range must be between 1 and ${totalRecords}`);
              return;
            }
            
            updateSupplierTypeChartRange(start - 1, end);
            
            // Try to match dropdown value (for Top 5, Top 10, Top 15, or All)
            if (start === 1) {
              const matchingOption = Array.from(rangeSelect.options).find(opt => opt.value === `1-${end}`);
              if (matchingOption) {
                rangeSelect.value = matchingOption.value;
              }
            } else if (end === totalRecords) {
              rangeSelect.value = 'all';
            }
            
            // Update slider to match end value
            rangeSlider.value = end;
          };
        }
      }
      
      // Helper function to update chart with range
      function updateSupplierTypeChartRange(startIdx, endIdx) {
        if (!window.modalSupplierTypeChart || !window.fullSupplierTypeChartData) return;
        
        const rangeLabels = window.fullSupplierTypeChartData.labels.slice(startIdx, endIdx);
        const rangeData2025 = window.fullSupplierTypeChartData.data2025.slice(startIdx, endIdx);
        const rangeData2026 = window.fullSupplierTypeChartData.data2026.slice(startIdx, endIdx);
        const rangeData2027 = window.fullSupplierTypeChartData.data2027.slice(startIdx, endIdx);
        const rangeData2028 = window.fullSupplierTypeChartData.data2028.slice(startIdx, endIdx);
        
        window.modalSupplierTypeChart.data.labels = rangeLabels;
        window.modalSupplierTypeChart.data.datasets[0].data = rangeData2025;
        window.modalSupplierTypeChart.data.datasets[1].data = rangeData2026;
        window.modalSupplierTypeChart.data.datasets[2].data = rangeData2027;
        window.modalSupplierTypeChart.data.datasets[3].data = rangeData2028;
        window.modalSupplierTypeChart.options.scales.y.min = 0;
        window.modalSupplierTypeChart.options.scales.y.max = Math.max(0, rangeLabels.length - 1);
        window.modalSupplierTypeChart.update();
      }
      
      // Setup reset zoom button
      const resetBtn = document.getElementById('resetSupplierTypeZoom');
      if (resetBtn) {
        resetBtn.onclick = () => {
          if (window.modalSupplierTypeChart) {
            // Reset to show top 5
            const rangeSelect = document.getElementById('supplierTypeRangeSelect');
            if (rangeSelect) {
              rangeSelect.value = '1-5';
            }
            
            // Reset range controls
            const rangeStart = document.getElementById('supplierTypeRangeStart');
            const rangeEnd = document.getElementById('supplierTypeRangeEnd');
            const rangeSlider = document.getElementById('supplierTypeRangeSlider');
            if (rangeStart && rangeEnd && rangeSlider) {
              rangeStart.value = 1;
              rangeEnd.value = 5;
              rangeSlider.value = 5;
            }
            
            // Reset chart
            window.modalSupplierTypeChart.data.labels = top5Data.labels;
            window.modalSupplierTypeChart.data.datasets[0].data = top5Data.data2025;
            window.modalSupplierTypeChart.data.datasets[1].data = top5Data.data2026;
            window.modalSupplierTypeChart.data.datasets[2].data = top5Data.data2027;
            window.modalSupplierTypeChart.data.datasets[3].data = top5Data.data2028;
            window.modalSupplierTypeChart.options.scales.y.min = 0;
            window.modalSupplierTypeChart.options.scales.y.max = 4;
            window.modalSupplierTypeChart.update();
          }
        };
      }
    })
    .catch(error => {
      console.error('❌ Error loading supplier type chart:', error);
      const chartContainer = ctx.parentElement;
      chartContainer.innerHTML = `<div class="text-center text-danger p-4">Error loading chart: ${error.message}</div>`;
    });
}

function renderSupplierTypeDetailsTable(supplierType) {
  console.log('📋 renderSupplierTypeDetailsTable called for:', supplierType);
  const tableBody = document.getElementById('modalSupplierTypeDetailsTableBody');
  
  // Show loading state
  tableBody.innerHTML = '<tr><td colspan="24" class="text-center">Loading data...</td></tr>';
  
  // Fetch data from backend API
  fetch(`/api/supplier-details/${encodeURIComponent(supplierType)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      console.log('📦 Fetched supplier details from API:', {
        count: result.data.length,
        sample: result.data[0]
      });
      
      const supplierDetails = result.data;
      
      // Store original data with properly formatted structure for chart filtering
      window.originalSupplierTypeData = supplierDetails.map(item => ({
        ...item,
        supplier: item.name,  // Chart uses 'supplier', table uses 'name'
        hwOwner: item.hwo,    // Chart uses 'hwOwner', table uses 'hwo'
        year2025: (item.quarters['2025-Q1'] || 0) + (item.quarters['2025-Q2'] || 0) + (item.quarters['2025-Q3'] || 0) + (item.quarters['2025-Q4'] || 0),
        year2026: (item.quarters['2026-Q1'] || 0) + (item.quarters['2026-Q2'] || 0) + (item.quarters['2026-Q3'] || 0) + (item.quarters['2026-Q4'] || 0),
        year2027: (item.quarters['2027-Q1'] || 0) + (item.quarters['2027-Q2'] || 0) + (item.quarters['2027-Q3'] || 0) + (item.quarters['2027-Q4'] || 0),
        year2028: (item.quarters['2028-Q1'] || 0) + (item.quarters['2028-Q2'] || 0) + (item.quarters['2028-Q3'] || 0) + (item.quarters['2028-Q4'] || 0)
      }));
      
      // Initialize pagination manager for supplier type modal table
      if (!window.modalSupplierTypeTablePagination) {
        console.log('🆕 Creating new TablePaginationManager for supplier type');
        window.modalSupplierTypeTablePagination = new TablePaginationManager('modalSupplierTypeDetailsTable', (pageData) => {
          renderSupplierTypeModalTablePage(pageData);
        });
      }

      // Set the data and render first page
      window.modalSupplierTypeTablePagination.setData(supplierDetails);
      window.modalSupplierTypeTablePagination.pageSize = parseInt(document.getElementById('supplierTypeDetailsPageSize')?.value || 10);
      console.log('📄 Rendering table with pageSize:', window.modalSupplierTypeTablePagination.pageSize);
      window.modalSupplierTypeTablePagination.renderTable();

      // Setup pagination controls
      setupSupplierTypeModalTablePaginationControls();
      
      // Setup search filters
      setupSupplierTypeSearchFilters(supplierDetails);
    })
    .catch(error => {
      console.error('Error fetching supplier details:', error);
      tableBody.innerHTML = `<tr><td colspan="24" class="text-center text-danger">Error loading data: ${error.message}</td></tr>`;
    });
}

function renderSupplierTypeModalTablePage(pageData) {
  const tableBody = document.getElementById('modalSupplierTypeDetailsTableBody');
  tableBody.innerHTML = '';

  pageData.forEach(supplier => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${supplier.name}</td>
      <td>${supplier.partNumber}</td>
      <td>${supplier.description}</td>
      <td>${supplier.hwo}</td>
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

function setupSupplierTypeModalTablePaginationControls() {
  if (window.supplierTypeModalTablePaginationSetup) {
    updateSupplierTypeModalTablePaginationUI();
    return;
  }
  
  window.supplierTypeModalTablePaginationSetup = true;
  
  const pageSizeSelect = document.getElementById('supplierTypeDetailsPageSize');
  const prevBtn = document.getElementById('supplierTypeDetailsPrevBtn');
  const nextBtn = document.getElementById('supplierTypeDetailsNextBtn');
  const pageInfo = document.getElementById('supplierTypeDetailsPageInfo');
  const recordInfo = document.getElementById('supplierTypeDetailsRecordInfo');

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      window.modalSupplierTypeTablePagination.pageSize = parseInt(e.target.value);
      window.modalSupplierTypeTablePagination.currentPage = 1;
      window.modalSupplierTypeTablePagination.renderTable();
      updateSupplierTypeModalTablePaginationUI();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (window.modalSupplierTypeTablePagination.currentPage > 1) {
        window.modalSupplierTypeTablePagination.currentPage--;
        window.modalSupplierTypeTablePagination.renderTable();
        updateSupplierTypeModalTablePaginationUI();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = window.modalSupplierTypeTablePagination.getTotalPages();
      if (window.modalSupplierTypeTablePagination.currentPage < totalPages) {
        window.modalSupplierTypeTablePagination.currentPage++;
        window.modalSupplierTypeTablePagination.renderTable();
        updateSupplierTypeModalTablePaginationUI();
      }
    });
  }

  updateSupplierTypeModalTablePaginationUI();
}

function updateSupplierTypeModalTablePaginationUI() {
  const pageInfo = document.getElementById('supplierTypeDetailsPageInfo');
  const recordInfo = document.getElementById('supplierTypeDetailsRecordInfo');
  const prevBtn = document.getElementById('supplierTypeDetailsPrevBtn');
  const nextBtn = document.getElementById('supplierTypeDetailsNextBtn');

  if (!window.modalSupplierTypeTablePagination) return;

  const totalPages = window.modalSupplierTypeTablePagination.getTotalPages();
  const startRecord = (window.modalSupplierTypeTablePagination.currentPage - 1) * window.modalSupplierTypeTablePagination.pageSize + 1;
  const endRecord = Math.min(
    window.modalSupplierTypeTablePagination.currentPage * window.modalSupplierTypeTablePagination.pageSize,
    window.modalSupplierTypeTablePagination.totalRecords
  );

  if (pageInfo) pageInfo.textContent = `Page ${window.modalSupplierTypeTablePagination.currentPage} of ${totalPages}`;
  if (recordInfo) recordInfo.textContent = `Showing ${startRecord}-${endRecord} of ${window.modalSupplierTypeTablePagination.totalRecords} records`;
  if (prevBtn) prevBtn.disabled = window.modalSupplierTypeTablePagination.currentPage <= 1;
  if (nextBtn) nextBtn.disabled = window.modalSupplierTypeTablePagination.currentPage >= totalPages;
}

// ===== SUPPLIER TYPE MODAL SEARCH FUNCTIONALITY =====
function setupSupplierTypeSearchFilters(allData) {
  const supplierSearch = document.getElementById('modalSupplierTypeSupplierSearch');
  const partNumberSearch = document.getElementById('modalSupplierTypePartNumberSearch');
  const hwoSearch = document.getElementById('modalSupplierTypeHWOSearch');
  
  if (!window.modalSupplierTypeTablePagination) return;
  
  // Store original data
  if (!window.originalSupplierTypeData) {
    window.originalSupplierTypeData = allData;
  }
  
  const filterData = () => {
    const supplierFilter = supplierSearch?.value.toLowerCase() || '';
    const partNumberFilter = partNumberSearch?.value.toLowerCase() || '';
    const hwoFilter = hwoSearch?.value.toLowerCase() || '';
    
    const filtered = window.originalSupplierTypeData.filter(item => {
      const matchesSupplier = !supplierFilter || (item.name && item.name.toLowerCase().includes(supplierFilter));
      const matchesPartNumber = !partNumberFilter || (item.partNumber && item.partNumber.toLowerCase().includes(partNumberFilter));
      const matchesHWO = !hwoFilter || (item.hwo && item.hwo.toLowerCase().includes(hwoFilter));
      
      return matchesSupplier && matchesPartNumber && matchesHWO;
    });
    
    window.modalSupplierTypeTablePagination.setData(filtered);
    window.modalSupplierTypeTablePagination.currentPage = 1;
    window.modalSupplierTypeTablePagination.renderTable();
    updateSupplierTypeModalTablePaginationUI();
    
    // Also update the chart with filtered data
    updateSupplierTypeChartWithFilteredData();
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
