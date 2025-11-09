// Charts module: RM bar + detail charts (drilldown)
/* global Chart, getYearFromDate */
(function(){
  // keep a handle for the detail chart only; main bar is rendered by demand.js
  let rmDetailChart = null;

  function extractYear(esn){
    try { return getYearFromDate(esn?.targetShipDate); } catch { return null; }
  }

  // Aggregate by raw type across all levels and programs 
  function buildRawTypeData(rawData){
    // Use dataFilterManager.filters.years as primary source, fallback to window.selectedYears
    const selectedYearsFromManager = window.dataFilterManager?.filters?.years;
    const selectedYears = (selectedYearsFromManager && selectedYearsFromManager.size) 
      ? new Set(Array.from(selectedYearsFromManager).map(String))
      : (window.selectedYears && window.selectedYears.size) 
        ? new Set(Array.from(window.selectedYears).map(String)) 
        : null;
    
    const normalizeProgram = (p) => (p === 'LM25' ? 'LM2500' : (p === 'LM60' ? 'LM6000' : p));
    const selectedPrograms = (window.selectedProductLines && window.selectedProductLines.size)
      ? new Set(Array.from(window.selectedProductLines).map(normalizeProgram))
      : null;
    const selectedConfigs = (window.selectedConfigs && window.selectedConfigs.size) ? new Set(window.selectedConfigs) : null;

    const byRawType = new Map(); // rawType -> { rawType, totalsByYear:{}, total, rmSuppliers:Set }

    function ensureRawType(rawType){
      if (!byRawType.has(rawType)) byRawType.set(rawType, { rawType, totalsByYear:{}, total:0, rmSuppliers:new Set() });
      return byRawType.get(rawType);
    }

    function addRawType(rawType, rmSupplier, esns){
      if (!rawType) return;
      const entry = ensureRawType(rawType);
      
      // Only count RM supplier if it has ESNs in the selected years
      let hasValidESN = false;
      (esns || []).forEach(esn => {
        const y = extractYear(esn);
        if (!y) return;
        
        if (selectedYears && !selectedYears.has(y)) return;
        entry.totalsByYear[y] = (entry.totalsByYear[y] || 0) + 1; 
        entry.total += 1;
        hasValidESN = true;
      });
      
      // Only add RM supplier if it has at least one ESN in the selected years
      if (rmSupplier && hasValidESN) {
        entry.rmSuppliers.add(rmSupplier);
      }
    }

    // OPTIMIZATION #2: Use iterative part walking instead of recursive
    function walkPartsForRawType(parts, esns, supplierHint){
      if (typeof walkPartsForRawTypeIterative === 'function') {
        // Use optimized iterative approach
        const results = walkPartsForRawTypeIterative(parts, esns, supplierHint);
        results.forEach(result => {
          if (result.rawType && result.rmSupplier) {
            addRawType(result.rawType, result.rmSupplier, result.esns);
          }
        });
      } else {
        // Fallback to recursive approach
        (parts || []).forEach(p => {
          if (p.rawType && p.rmSupplier) addRawType(p.rawType, p.rmSupplier, esns);
          if (p.level2Parts) walkPartsForRawType(p.level2Parts, esns, supplierHint);
          if (p.level3Parts) walkPartsForRawType(p.level3Parts, esns, supplierHint);
          if (p.level4Parts) walkPartsForRawType(p.level4Parts, esns, supplierHint);
          if (p.level5Parts) walkPartsForRawType(p.level5Parts, esns, supplierHint);
        });
      }
    }

    (rawData || []).forEach(program => {
      if (selectedPrograms && !selectedPrograms.has(program.engineProgram)) return;
      (program.configs || []).forEach(cfg => {
        if (selectedConfigs && !selectedConfigs.has(cfg.config)) return;
        const esns = cfg.esns || [];
        
        (cfg.level1Parts || []).forEach(l1 => {
          const supplierL1 = l1.supplier || null;
          // Check L1 parts for rawType
          if (l1.rawType && l1.rmSupplier) addRawType(l1.rawType, l1.rmSupplier, esns);
          if (l1.level2Parts) walkPartsForRawType(l1.level2Parts, esns, supplierL1);
          if (l1.level3Parts) walkPartsForRawType(l1.level3Parts, esns, supplierL1);
          if (l1.level4Parts) walkPartsForRawType(l1.level4Parts, esns, supplierL1);
          if (l1.level5Parts) walkPartsForRawType(l1.level5Parts, esns, supplierL1);
        });
      });
    });

    const results = Array.from(byRawType.values());
    
    return results;
  }

  // Build RM Suppliers for a specific raw type
  function buildRMSuppliersForRawType(rawData, selectedRawType){
    // Use dataFilterManager.filters.years as primary source, fallback to window.selectedYears
    const selectedYearsFromManager = window.dataFilterManager?.filters?.years;
    const selectedYears = (selectedYearsFromManager && selectedYearsFromManager.size) 
      ? new Set(Array.from(selectedYearsFromManager).map(String))
      : (window.selectedYears && window.selectedYears.size) 
        ? new Set(Array.from(window.selectedYears).map(String)) 
        : null;
    
    const normalizeProgram = (p) => (p === 'LM25' ? 'LM2500' : (p === 'LM60' ? 'LM6000' : p));
    const selectedPrograms = (window.selectedProductLines && window.selectedProductLines.size)
      ? new Set(Array.from(window.selectedProductLines).map(normalizeProgram))
      : null;
    const selectedConfigs = (window.selectedConfigs && window.selectedConfigs.size) ? new Set(window.selectedConfigs) : null;

    const byRM = new Map(); // rm -> { rm, totalsByYear:{}, total, levels:{L1:count..}, suppliers:Set }

    function ensureRM(rm){
      if (!byRM.has(rm)) byRM.set(rm, { rm, totalsByYear:{}, total:0, levels:{L1:0,L2:0,L3:0,L4:0,L5:0}, suppliers:new Set() });
      return byRM.get(rm);
    }

    function addRM(rm, level, supplierName, esns, rawType){
      if (!rm || rawType !== selectedRawType) return;
      const entry = ensureRM(rm);
      if (supplierName) entry.suppliers.add(supplierName);
      (esns || []).forEach(esn => {
        const y = extractYear(esn); if (!y) return; if (selectedYears && !selectedYears.has(y)) return;
        entry.totalsByYear[y] = (entry.totalsByYear[y] || 0) + 1; entry.total += 1; entry.levels[level] = (entry.levels[level] || 0) + 1;
      });
    }

    // OPTIMIZATION #2: Use iterative part walking instead of recursive
    function walkPartsForRM(levelKey, parts, esns, supplierHint){
      if (typeof walkPartsForRMIterative === 'function') {
        // Use optimized iterative approach
        const results = walkPartsForRMIterative(parts, esns, supplierHint);
        results.forEach(result => {
          if (result.rmSupplier && result.rawType) {
            addRM(result.rmSupplier, result.level, result.supplier, result.esns, result.rawType);
          }
        });
      } else {
        // Fallback to recursive approach
        (parts || []).forEach(p => {
          const supplierForPart = p.supplier || supplierHint || null;
          if (p.rmSupplier && p.rawType) addRM(p.rmSupplier, levelKey, supplierForPart, esns, p.rawType);
          if (p.level2Parts) walkPartsForRM('L2', p.level2Parts, esns, supplierForPart);
          if (p.level3Parts) walkPartsForRM('L3', p.level3Parts, esns, supplierForPart);
          if (p.level4Parts) walkPartsForRM('L4', p.level4Parts, esns, supplierForPart);
          if (p.level5Parts) walkPartsForRM('L5', p.level5Parts, esns, supplierForPart);
        });
      }
    }

    (rawData || []).forEach(program => {
      if (selectedPrograms && !selectedPrograms.has(program.engineProgram)) return;
      (program.configs || []).forEach(cfg => {
        if (selectedConfigs && !selectedConfigs.has(cfg.config)) return;
        const esns = cfg.esns || [];
        (cfg.level1Parts || []).forEach(l1 => {
          const supplierL1 = l1.supplier || null;
          if (l1.rmSupplier && l1.rawType) addRM(l1.rmSupplier, 'L1', supplierL1, esns, l1.rawType);
          if (l1.level2Parts) walkPartsForRM('L2', l1.level2Parts, esns, supplierL1);
          if (l1.level3Parts) walkPartsForRM('L3', l1.level3Parts, esns, supplierL1);
          if (l1.level4Parts) walkPartsForRM('L4', l1.level4Parts, esns, supplierL1);
          if (l1.level5Parts) walkPartsForRM('L5', l1.level5Parts, esns, supplierL1);
        });
      });
    });

    return Array.from(byRM.values());
  }

  // Aggregate by RM Supplier across levels and by year; also track level distribution and suppliers
  function buildRMBarData(rawData){
    // Use dataFilterManager.filters.years as primary source, fallback to window.selectedYears
    const selectedYearsFromManager = window.dataFilterManager?.filters?.years;
    const selectedYears = (selectedYearsFromManager && selectedYearsFromManager.size) 
      ? new Set(Array.from(selectedYearsFromManager).map(String))
      : (window.selectedYears && window.selectedYears.size) 
        ? new Set(Array.from(window.selectedYears).map(String)) 
        : null;
    
    const normalizeProgram = (p) => (p === 'LM25' ? 'LM2500' : (p === 'LM60' ? 'LM6000' : p));
    const selectedPrograms = (window.selectedProductLines && window.selectedProductLines.size)
      ? new Set(Array.from(window.selectedProductLines).map(normalizeProgram))
      : null;
    const selectedConfigs = (window.selectedConfigs && window.selectedConfigs.size) ? new Set(window.selectedConfigs) : null;



    const byRM = new Map(); // rm -> { rm, totalsByYear:{}, total, levels:{L1:count..}, suppliers:Set }

    function ensureRM(rm){
      if (!byRM.has(rm)) byRM.set(rm, { rm, totalsByYear:{}, total:0, levels:{L1:0,L2:0,L3:0,L4:0,L5:0}, suppliers:new Set() });
      return byRM.get(rm);
    }

    function addRM(rm, level, supplierName, esns){
      if (!rm) return;
      const entry = ensureRM(rm);
      if (supplierName) entry.suppliers.add(supplierName);
      (esns || []).forEach(esn => {
        const y = extractYear(esn); if (!y) return; if (selectedYears && !selectedYears.has(y)) return;
        entry.totalsByYear[y] = (entry.totalsByYear[y] || 0) + 1; entry.total += 1; entry.levels[level] = (entry.levels[level] || 0) + 1;
      });
    }

    // OPTIMIZATION #2: Use iterative part walking instead of recursive
    function walkParts(levelKey, parts, esns, supplierHint){
      if (typeof walkPartsIterative === 'function') {
        // Use optimized iterative approach
        const results = walkPartsIterative(parts, esns, supplierHint);
        results.forEach(result => {
          if (result.rmSupplier) {
            addRM(result.rmSupplier, result.level, result.supplier, result.esns);
          }
        });
      } else {
        // Fallback to recursive approach
        (parts || []).forEach(p => {
          const supplierForPart = p.supplier || supplierHint || null;
          if (p.rmSupplier) addRM(p.rmSupplier, levelKey, supplierForPart, esns);
          if (p.level2Parts) walkParts('L2', p.level2Parts, esns, supplierForPart);
          if (p.level3Parts) walkParts('L3', p.level3Parts, esns, supplierForPart);
          if (p.level4Parts) walkParts('L4', p.level4Parts, esns, supplierForPart);
          if (p.level5Parts) walkParts('L5', p.level5Parts, esns, supplierForPart);
        });
      }
    }

    (rawData || []).forEach(program => {
      if (selectedPrograms && !selectedPrograms.has(program.engineProgram)) return;
      (program.configs || []).forEach(cfg => {
        if (selectedConfigs && !selectedConfigs.has(cfg.config)) return;
        const esns = cfg.esns || [];
        (cfg.level1Parts || []).forEach(l1 => {
          const supplierL1 = l1.supplier || null;
          if (l1.rmSupplier) addRM(l1.rmSupplier, 'L1', supplierL1, esns);
          if (l1.level2Parts) walkParts('L2', l1.level2Parts, esns, supplierL1);
          if (l1.level3Parts) walkParts('L3', l1.level3Parts, esns, supplierL1);
          if (l1.level4Parts) walkParts('L4', l1.level4Parts, esns, supplierL1);
          if (l1.level5Parts) walkParts('L5', l1.level5Parts, esns, supplierL1);
        });
      });
    });

    return Array.from(byRM.values());
  }

  function renderRMDetail(entry){
    const container = document.getElementById('rmLevelDetail');
    if (!container) return;
    container.innerHTML = '';
    const title = document.createElement('div'); title.className = 'h6 mb-2'; title.textContent = entry.rm;
    const small = document.createElement('div'); small.className = 'text-muted mb-2';
    small.textContent = 'Suppliers: ' + (Array.from(entry.suppliers).join(', ') || '—');
    const levelLine = document.createElement('div'); levelLine.className = 'small mb-2';
    levelLine.textContent = `Levels: L1 ${entry.levels.L1}, L2 ${entry.levels.L2}, L3 ${entry.levels.L3}, L4 ${entry.levels.L4}, L5 ${entry.levels.L5}`;
    container.appendChild(title); container.appendChild(small); container.appendChild(levelLine);

    const canvas = document.getElementById('rmDetailChart');
    if (!canvas) return;
    try { rmDetailChart?.destroy(); } catch {}
    const years = Object.keys(entry.totalsByYear).sort();
    rmDetailChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: years.length ? years : ['—'],
        datasets: [{ label: 'Demand', data: years.length ? years.map(y => entry.totalsByYear[y]) : [0], backgroundColor: '#4AABCA' }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display:false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  // Expose helpers so demand.js can build the bar and drive details
  window.getRawTypeData = function(){
    // Use filtered data from dataFilterManager instead of raw RAW_DATA
    const filteredData = window.dataFilterManager ? window.dataFilterManager.getFilteredData() : (window.RAW_DATA || []);
    const data = buildRawTypeData(filteredData);
    return data;
  };
  
  window.getRMSuppliersForRawType = function(rawType){
    // Use filtered data from dataFilterManager instead of raw RAW_DATA
    const filteredData = window.dataFilterManager ? window.dataFilterManager.getFilteredData() : (window.RAW_DATA || []);
    const data = buildRMSuppliersForRawType(filteredData, rawType);
    return data;
  };
  
  window.getRMBarData = function(){
    // Use filtered data from dataFilterManager instead of raw RAW_DATA
    const filteredData = window.dataFilterManager ? window.dataFilterManager.getFilteredData() : (window.RAW_DATA || []);
    const data = buildRMBarData(filteredData);
    return data;
  };
  window.showRMDetails = function(rmName){
    // Use filtered data from dataFilterManager instead of raw RAW_DATA
    const filteredData = window.dataFilterManager ? window.dataFilterManager.getFilteredData() : (window.RAW_DATA || []);
    const list = buildRMBarData(filteredData);
    const found = list.find(e => e.rm === rmName);
    if (found) {
      renderRMDetail(found);
      const backBtn = document.getElementById('rmLevelBackBtn');
      if (backBtn) backBtn.style.display = 'inline-block';
    }
  };
  
  // New function to show RM Suppliers for a specific raw type in main chart
  window.showRMSuppliersForRawType = function(rawType){
    // Update header to show current drill-down state
    const section = document.getElementById('section-rm-supplier');
    const headerElement = section ? section.querySelector('.card-title') : null;
    if (headerElement) {
      headerElement.textContent = `RM Suppliers - ${rawType}`;
    }
    
    // Show back button
    const backBtn = document.getElementById('rmLevelBackBtn');
    if (backBtn) {
      backBtn.style.display = 'inline-block';
    }
    
    const rmSuppliers = buildRMSuppliersForRawType(window.RAW_DATA || [], rawType);
    renderRMSuppliersInMainChart(rawType, rmSuppliers);
  };
  
  // New function to show RM details in the main chart area instead of separate section
  window.showRMDetailsInMainChart = function(rmName){
    const list = buildRMBarData(window.RAW_DATA || []);
    const found = list.find(e => e.rm === rmName);
    if (found) {
      renderRMDetailInMainChart(found);
    }
  };
  
  // Function to render RM Suppliers for a specific raw type in the main chart area
  function renderRMSuppliersInMainChart(rawType, rmSuppliers) {
    const ctx = document.getElementById('supplierChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (window.supplierChart) {
      window.supplierChart.destroy();
    }
    
    if (!rmSuppliers || rmSuppliers.length === 0) {
      // Show empty state
      window.supplierChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['No Data'],
          datasets: [{
            label: 'No RM Suppliers',
            data: [0],
            backgroundColor: '#94a3b8'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: `RM Suppliers for ${rawType} (No Data)` }
          }
        }
      });
      window.supplierChart.isDrillDown = true;
      window.supplierChart.drillDownType = 'rmSuppliers';
      window.supplierChart.selectedRawType = rawType;
      return;
    }
    
    const sorted = rmSuppliers.sort((a, b) => b.total - a.total);
    const labels = sorted.map(e => e.rm);
    
    // Create stacked datasets by level
    const datasets = [
      { key:'L1', color:'#2563eb' },
      { key:'L2', color:'#16a34a' },
      { key:'L3', color:'#f59e0b' },
      { key:'L4', color:'#dc2626' },
      { key:'L5', color:'#6b7280' },
    ].map(({key,color}) => ({
      label: key,
      data: sorted.map(e => e.levels[key] || 0),
      backgroundColor: color,
      borderWidth: 0,
      stack: 'levels'
    }));
    
    window.supplierChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: true, mode: 'nearest' },
        scales: {
          x: { stacked: true },
          y: { beginAtZero: true, stacked: true, title: { display: true, text: 'Total Demand' } }
        },
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: `RM Suppliers for ${rawType}` },
          tooltip: {
            callbacks: {
              title: (items) => items?.[0]?.label || '',
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        onClick: (evt) => {
          const points = window.supplierChart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
          if (!points.length) return;
          const { index } = points[0];
          const rmName = labels[index];
          if (typeof showRMDetailsInMainChart === 'function') showRMDetailsInMainChart(rmName);
        }
      }
    });
    
    // Mark this as a drill-down chart
    window.supplierChart.isDrillDown = true;
    window.supplierChart.drillDownType = 'rmSuppliers';
    window.supplierChart.selectedRawType = rawType;
    window.supplierChart.rmData = sorted;
  }

  // Function to render RM details in the main supplier chart area
  function renderRMDetailInMainChart(entry) {
    const ctx = document.getElementById('supplierChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (window.supplierChart) {
      window.supplierChart.destroy();
    }
    
    const years = Object.keys(entry.totalsByYear).sort();
    const yearData = years.map(y => entry.totalsByYear[y] || 0);
    
    // Create the detail chart in the main chart area
    window.supplierChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: years.length ? years : ['No Data'],
        datasets: [{
          label: 'Demand',
          data: years.length ? yearData : [0],
          backgroundColor: '#4AABCA',
          borderColor: '#2980b9',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: [
              `RM Supplier: ${entry.rm}`,
              `Suppliers: ${Array.from(entry.suppliers).join(', ') || 'N/A'}`,
              `Levels: L1:${entry.levels.L1}, L2:${entry.levels.L2}, L3:${entry.levels.L3}, L4:${entry.levels.L4}, L5:${entry.levels.L5}`
            ],
            font: { size: 12 },
            padding: { bottom: 20 }
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            title: { display: true, text: 'Demand Count' }
          },
          x: {
            title: { display: true, text: 'Year' }
          }
        }
      }
    });
    
    // Mark this as a detail view and store the RM name
    window.supplierChart.isRMDetail = true;
    window.supplierChart.rmName = entry.rm;
    
    // Update chart title in the card header to show back option
    updateChartHeaderForRMDetail(entry.rm);
  }
  
  // Function to update the chart header with back button
  function updateChartHeaderForRMDetail(rmName) {
    const chartCard = document.getElementById('supplierChart')?.closest('.chart-card');
    if (!chartCard) return;
    
    const cardHeader = chartCard.querySelector('.card-header');
    if (!cardHeader) return;
    
    // Store original header content if not already stored
    if (!cardHeader.dataset.originalContent) {
      cardHeader.dataset.originalContent = cardHeader.innerHTML;
    }
    
    // Update header with back button
    cardHeader.innerHTML = `
      <div class="d-flex justify-content-between align-items-center w-100">
        <h6 class="mb-0">RM Supplier Details: ${rmName}</h6>
        <button class="btn btn-sm btn-outline-secondary" onclick="window.backToRMOverview()">← Back to Overview</button>
      </div>
    `;
  }
  
  // Function to restore original chart header
  function restoreChartHeader() {
    const chartCard = document.getElementById('supplierChart')?.closest('.chart-card');
    if (!chartCard) return;
    
    const cardHeader = chartCard.querySelector('.card-header');
    if (!cardHeader) return;
    
    if (cardHeader.dataset.originalContent) {
      cardHeader.innerHTML = cardHeader.dataset.originalContent;
    }
  }
  
  // Function to go back to RM overview
  window.backToRMOverview = function() {
    // Re-render the RM supplier chart
    if (typeof renderSupplierChart === 'function') {
      renderSupplierChart('section-rm-supplier');
    }
    
    // Restore original header
    restoreChartHeader();
  };
  window.clearRMDetails = function(){
    try { rmDetailChart?.destroy(); } catch {}
    rmDetailChart = null;
    const container = document.getElementById('rmLevelDetail');
    if (container) container.innerHTML = '<div class="text-muted">Select a bar to see details here.</div>';
    const backBtn = document.getElementById('rmLevelBackBtn');
    if (backBtn) backBtn.style.display = 'none';
    const detailCanvas = document.getElementById('rmDetailChart');
    if (detailCanvas) {
      const ctx = detailCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, detailCanvas.width, detailCanvas.height);
      }
    }
  };
  
  // Add renderRMLevelChart function to handle RM level chart rendering
  window.renderRMLevelChart = function() {
    // This function ensures the RM details chart is properly initialized
    const container = document.getElementById('rmLevelDetail');
    if (container && !container.innerHTML.trim()) {
      container.innerHTML = '<div class="text-muted">Select a bar to see details here.</div>';
    }
    
    const backBtn = document.getElementById('rmLevelBackBtn');
    if (backBtn) {
      backBtn.style.display = 'none';
    }
    
    // Clear any existing detail chart
    try { 
      if (rmDetailChart) {
        rmDetailChart.destroy(); 
        rmDetailChart = null;
      }
    } catch (e) {
      console.log('RM detail chart cleanup:', e);
    }
  };
})();
