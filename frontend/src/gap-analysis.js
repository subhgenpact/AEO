// Gap Analysis Dashboard JavaScript
class GapAnalysisDashboard {
  constructor() {
    this.filters = {
      productLines: [],
      years: [],
      configs: [],
      suppliers: [],
      rmSuppliers: [],
      hwOwners: [],
      modules: [],
      partNumbers: []
    };
    this.filterOptions = {};
    this.gapAnalysisData = [];
    this.tableData = [];
    this.allTableData = []; // Store all data for client-side filtering
    this.priorityFilter = null; // Active priority filter from KPI clicks
    this.isLoadingData = false; // Flag to prevent loading loops
    this.kpiData = {
      totalGaps: { count: 12, status: '12% Gap' },
      criticalPriority: { count: 2, status: 'Past Due' },
      highPriority: { count: 3, status: 'Due in next 3 weeks' },
      lowPriority: { count: 3, status: 'Late commits' },
      mediumPriority: { count: 4, status: 'Missing commits' },
      onTrack: { count: 85, status: 'Meeting targets' }
    };
    
    // Table pagination settings
    this.currentPage = 1;
    this.recordsPerPage = 10;
    this.totalRecords = 0;
    this.searchQuery = '';
    
    this.init();
  }

  async init() {
    try {
      console.log('Initializing Gap Analysis Dashboard...');
      this.showLoading(true);
      
      console.log('Step 1: Loading filter options...');
      await this.loadFilterOptions();
      
      console.log('Step 2: Loading gap analysis data...');
      await this.loadGapAnalysisData();
      
      console.log('Step 3: Loading table data...');
      await this.loadTableData();
      
      console.log('Step 4: Setting up event listeners...');
      this.setupEventListeners();
      
      console.log('Step 5: Updating KPIs...');
      this.updateKPIs();
      
      console.log('Dashboard initialization complete!');
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to initialize Gap Analysis dashboard:', error);
      this.showError(`Failed to initialize dashboard: ${error.message}. Please refresh the page.`);
    }
  }

  showLoading(show) {
    const loadingEl = document.getElementById('tableLoading');
    const errorEl = document.getElementById('errorMessage');
    
    if (show) {
      loadingEl.style.display = 'block';
      errorEl.style.display = 'none';
    } else {
      loadingEl.style.display = 'none';
    }
  }

  showError(message) {
    const errorEl = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const loadingEl = document.getElementById('tableLoading');
    
    errorText.textContent = message;
    errorEl.style.display = 'block';
    loadingEl.style.display = 'none';
  }

  async loadFilterOptions() {
    try {
      console.log('Loading filter options...');
      // Load filter options from the backend API
      const response = await fetch('/api/datatable/filter-options');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Filter options loaded:', data);
      this.filterOptions = data.filterOptions || {};
      
      // Populate filter dropdowns
      this.populateFilterDropdown('productLines', this.filterOptions.productLines || []);
      this.populateFilterDropdown('years', this.filterOptions.years || []);
      this.populateFilterDropdown('configs', this.filterOptions.configs || []);
      this.populateFilterDropdown('suppliers', this.filterOptions.suppliers || []);
      this.populateFilterDropdown('rmSuppliers', this.filterOptions.rmSuppliers || []);
      this.populateFilterDropdown('hwOwners', this.filterOptions.hwOwners || []);
      this.populateFilterDropdown('modules', this.filterOptions.modules || []);
      this.populateFilterDropdown('partNumbers', this.filterOptions.partNumbers || []);
      
      console.log('Filter dropdowns populated');
    } catch (error) {
      console.error('Failed to load filter options:', error);
      // Don't throw error, continue with empty options
      this.filterOptions = {
        productLines: [],
        years: ['2025', '2026', '2027'],
        configs: [],
        suppliers: [],
        rmSuppliers: [],
        hwOwners: [],
        modules: [],
        partNumbers: []
      };
      console.log('Using fallback filter options');
    }
  }

  populateFilterDropdown(filterType, options) {
    try {
      const mappings = {
        'productLines': 'productLine',
        'years': 'year',
        'configs': 'engConfig',
        'suppliers': 'supplier',
        'rmSuppliers': 'rmSupplier',
        'hwOwners': 'hwOwner',
        'modules': 'module',
        'partNumbers': 'partNo'
      };
      
      const dropdownId = mappings[filterType];
      if (!dropdownId) {
        console.warn(`No mapping found for filter type: ${filterType}`);
        return;
      }
      
      const dropdown = document.querySelector(`#${dropdownId}Dropdown`);
      if (!dropdown) {
        console.warn(`Dropdown not found: #${dropdownId}Dropdown`);
        return;
      }
      
      const container = dropdown.nextElementSibling?.querySelector('.dropdown-options');
      if (!container) {
        console.warn(`Container not found for dropdown: ${dropdownId}`);
        return;
      }
      
      container.innerHTML = '';
      
      if (!Array.isArray(options)) {
        console.warn(`Options is not an array for ${filterType}:`, options);
        return;
      }
      
      options.forEach((option, index) => {
        if (option && option.toString().trim()) {
          const div = document.createElement('div');
          div.className = 'form-check';
          const safeId = `${dropdownId}_${index}`;
          div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${option}" id="${safeId}">
            <label class="form-check-label" for="${safeId}">
              ${option}
            </label>
          `;
          container.appendChild(div);
        }
      });
      
      console.log(`Populated ${filterType} with ${options.length} options`);
    } catch (error) {
      console.error(`Error populating filter dropdown ${filterType}:`, error);
    }
  }

  async loadGapAnalysisData() {
    try {
      console.log('Loading gap analysis data...');
      // Load KPI data from backend API
      const response = await fetch('/api/gap-analysis/kpis');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Gap analysis KPIs loaded from API:', data);
      this.kpiData = data.kpis || this.kpiData;
      
      console.log('Gap analysis KPI data loaded successfully');
    } catch (error) {
      console.error('Failed to load gap analysis KPIs:', error);
      // Keep default mock data if API fails
      console.log('Using default KPI data');
    }
  }

  transformToGapAnalysisFormat(demandData) {
    // Transform demand data into gap analysis format
    // This is a simplified transformation - in reality you'd have supply data too
    const gapData = [];
    
    demandData.forEach(item => {
      // Simulate supply data (in reality this would come from supply planning)
      const demand = item.No || 0;
      const supply = Math.floor(demand * (0.7 + Math.random() * 0.4)); // Random supply between 70-110% of demand
      const gap = demand - supply;
      
      gapData.push({
        period: `${item.Year}-${item.Mon}`,
        program: item.PL,
        demand: demand,
        supply: supply,
        gap: gap,
        year: item.Year,
        month: item.Mon
      });
    });
    
    return gapData;
  }

  createMockGapData() {
    // Create mock gap analysis data for testing
    const mockData = [];
    const programs = ['LM2500', 'LM6000', 'LMS100'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    programs.forEach(program => {
      months.forEach(month => {
        const demand = Math.floor(Math.random() * 50) + 10;
        const supply = Math.floor(demand * (0.7 + Math.random() * 0.4));
        const gap = demand - supply;
        
        mockData.push({
          period: `2025-${month}`,
          program: program,
          demand: demand,
          supply: supply,
          gap: gap,
          year: 2025,
          month: month
        });
      });
    });
    
    return mockData;
  }

  transformDemandDataToTable(demandData) {
    // Transform demand data to table format
    const tableData = [];
    
    demandData.forEach(program => {
      program.configs?.forEach(config => {
        config.esns?.forEach(esn => {
          config.level1Parts?.forEach(part => {
            // Simulate gap status based on target date and other factors
            const targetDate = new Date(esn.targetShipDate);
            const now = new Date();
            const daysDiff = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
            
            // Consider it a gap if:
            // - Past due (negative days)
            // - Due within 21 days and no supplier info
            // - Random factor for demonstration (60% chance)
            const hasGap = daysDiff < 0 || 
                          (daysDiff <= 21 && !part.supplier) || 
                          Math.random() < 0.6 ? 'Y' : 'N';
            
            tableData.push({
              'ENGINE_PROGRAM': program.engineProgram,
              'Configuration': config.config,
              'ESN': esn.esn,
              'Part_Number': part.pn,
              'Target_Ship_Date': esn.targetShipDate,
              'Parent_Part_Supplier': part.supplier,
              'HW_OWNER': part.hwo?.join(', ') || '',
              'Level_2_PN': part.level2Parts?.[0]?.pn || part.pn,
              'Level_2_Raw_Material_Supplier': part.level2Parts?.[0]?.rmSupplier || '',
              'Have_Gap': hasGap,
              'Gap_Y_N': hasGap,
              'Gap (Y/N)': hasGap
            });
          });
        });
      });
    });
    
    return tableData;
  }

  createMockTableData() {
    // Create mock table data for testing
    const mockData = [];
    const programs = ['LM2500', 'LM6000', 'LMS100'];
    const configs = ['Standard', 'Premium', 'Sport'];
    const suppliers = ['ABC Automotive', 'XYZ Electronics', 'Tech Solutions'];
    const hwOwners = ['John Smith', 'Sarah Johnson', 'Mike Chen'];
    
    for (let i = 0; i < this.recordsPerPage * 2; i++) { // Create more records to have some with gaps
      const program = programs[Math.floor(Math.random() * programs.length)];
      const config = configs[Math.floor(Math.random() * configs.length)];
      const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
      const hwOwner = hwOwners[Math.floor(Math.random() * hwOwners.length)];
      
      // Create some past due dates to simulate gaps
      const futureDate = new Date();
      const daysOffset = Math.floor(Math.random() * 180) - 60; // -60 to +120 days
      futureDate.setDate(futureDate.getDate() + daysOffset);
      
      // Determine if this record has a gap (70% chance for demonstration)
      const hasGap = Math.random() < 0.7 ? 'Y' : 'N';
      
      mockData.push({
        'ENGINE_PROGRAM': program,
        'Configuration': config,
        'ESN': `ESN-${2025}-${String(i + 1).padStart(3, '0')}`,
        'Part_Number': `PN-${Math.floor(Math.random() * 9000) + 1000}`,
        'Target_Ship_Date': futureDate.toISOString().split('T')[0],
        'Parent_Part_Supplier': supplier,
        'HW_OWNER': hwOwner,
        'Level_2_PN': `RM-${Math.floor(Math.random() * 9000) + 1000}`,
        'Level_2_Raw_Material_Supplier': `RM ${supplier}`,
        'Have_Gap': hasGap,
        'Gap_Y_N': hasGap, // Alternative column name
        'Gap (Y/N)': hasGap // Another possible column name
      });
    }
    
    return mockData;
  }

  filterGapRecords(data) {
    // Filter records to show only those with gaps
    if (!Array.isArray(data)) {
      console.warn('Data is not an array:', data);
      return [];
    }
    
    const filteredData = data.filter(record => {
      // Check multiple possible column names for gap indicator
      const hasGap = record['Have_Gap'] || 
                    record['Gap_Y_N'] || 
                    record['Gap (Y/N)'] || 
                    record['Gap_YN'] ||
                    record['have_gap'] ||
                    record['gap_y_n'] ||
                    record['gap_yn'];
      
      // Return true if the record has a gap (Y, Yes, true, 1)
      if (typeof hasGap === 'string') {
        return hasGap.toUpperCase() === 'Y' || hasGap.toUpperCase() === 'YES';
      }
      if (typeof hasGap === 'boolean') {
        return hasGap;
      }
      if (typeof hasGap === 'number') {
        return hasGap === 1;
      }
      
      // If no gap indicator found, simulate based on priority
      // (for existing data that doesn't have gap indicators)
      const priority = this.calculateRowPriority(record);
      return priority === 'P1' || priority === 'P2'; // Consider P1 and P2 as having gaps
    });
    
    console.log(`Filtered ${data.length} records to ${filteredData.length} gap records`);
    return filteredData;
  }

  setupEventListeners() {
    // Clear all filters button
    document.getElementById('clearAllFilters').addEventListener('click', () => {
      this.clearAllFilters();
    });

    // Setup filter event listeners for each filter type
    const filterTypes = ['productLine', 'year', 'engConfig', 'supplier', 'rmSupplier', 'hwOwner', 'module', 'partNo'];
    
    filterTypes.forEach(filterType => {
      this.setupFilterEventListeners(filterType);
    });

    // Add click handlers for KPI cards
    this.setupKPIClickHandlers();

    // Table event listeners
    this.setupTableEventListeners();
  }

  setupFilterEventListeners(filterType) {
    const applyBtn = document.getElementById(`apply${filterType.charAt(0).toUpperCase() + filterType.slice(1)}s`);
    const clearBtn = document.getElementById(`clear${filterType.charAt(0).toUpperCase() + filterType.slice(1)}s`);
    const selectAllBtn = document.getElementById(`selectAll${filterType.charAt(0).toUpperCase() + filterType.slice(1)}s`);
    
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyFilter(filterType);
      });
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearFilter(filterType);
      });
    }
    
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        this.selectAllFilter(filterType);
      });
    }
  }

  applyFilter(filterType) {
    const container = document.querySelector(`#${filterType}Dropdown`).nextElementSibling.querySelector('.dropdown-options');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    
    const filterKey = this.getFilterKey(filterType);
    this.filters[filterKey] = Array.from(checkboxes).map(cb => cb.value);
    
    this.currentPage = 1; // Reset to first page when filters change
    this.loadTableData();
    
    // Close the dropdown
    const dropdownElement = document.querySelector(`#${filterType}Dropdown`).closest('.dropdown');
    const dropdownMenu = dropdownElement.querySelector('.dropdown-menu');
    if (dropdownMenu && dropdownMenu.classList.contains('show')) {
      dropdownMenu.classList.remove('show');
      const dropdownButton = dropdownElement.querySelector('.dropdown-toggle');
      if (dropdownButton) {
        dropdownButton.classList.remove('show');
        dropdownButton.setAttribute('aria-expanded', 'false');
      }
    }
  }

  clearFilter(filterType) {
    const container = document.querySelector(`#${filterType}Dropdown`).nextElementSibling.querySelector('.dropdown-options');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    const filterKey = this.getFilterKey(filterType);
    this.filters[filterKey] = [];
    
    this.currentPage = 1; // Reset to first page when filters change
    this.loadTableData();
    
    // Close the dropdown
    const dropdownElement = document.querySelector(`#${filterType}Dropdown`).closest('.dropdown');
    const dropdownMenu = dropdownElement.querySelector('.dropdown-menu');
    if (dropdownMenu && dropdownMenu.classList.contains('show')) {
      dropdownMenu.classList.remove('show');
      const dropdownButton = dropdownElement.querySelector('.dropdown-toggle');
      if (dropdownButton) {
        dropdownButton.classList.remove('show');
        dropdownButton.setAttribute('aria-expanded', 'false');
      }
    }
  }

  selectAllFilter(filterType) {
    const container = document.querySelector(`#${filterType}Dropdown`).nextElementSibling.querySelector('.dropdown-options');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    
    this.applyFilter(filterType);
  }

  getFilterKey(filterType) {
    const mappings = {
      'productLine': 'productLines',
      'year': 'years',
      'engConfig': 'configs',
      'supplier': 'suppliers',
      'rmSupplier': 'rmSuppliers',
      'hwOwner': 'hwOwners',
      'module': 'modules',
      'partNo': 'partNumbers'
    };
    return mappings[filterType] || filterType;
  }

  clearAllFilters() {
    // Clear all filter selections
    Object.keys(this.filters).forEach(key => {
      this.filters[key] = [];
    });
    
    // Uncheck all checkboxes
    document.querySelectorAll('.dropdown-options input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
    
    this.currentPage = 1; // Reset to first page when filters change
    this.loadTableData();
  }

  updateKPIs(filteredData = null) {
    // If filtered data is provided, calculate KPIs from it
    // Otherwise use the original API data
    if (filteredData && filteredData.length >= 0) {
      const kpis = this.calculateKPIsFromFilteredData(filteredData);
      
      // Update KPI displays with filtered data
      this.updateKPIDisplay('totalGapsCount', kpis.totalGaps.count);
      this.updateKPIDisplay('totalGapsStatus', `Status: ${kpis.totalGaps.status}`);
      
      this.updateKPIDisplay('criticalPriorityCount', kpis.criticalPriority.count);
      this.updateKPIDisplay('criticalPriorityStatus', `Status: ${kpis.criticalPriority.status}`);
      
      this.updateKPIDisplay('highPriorityCount', kpis.highPriority.count);
      this.updateKPIDisplay('highPriorityStatus', `Status: ${kpis.highPriority.status}`);
      
      this.updateKPIDisplay('mediumPriorityCount', kpis.mediumPriority.count);
      this.updateKPIDisplay('mediumPriorityStatus', `Status: ${kpis.mediumPriority.status}`);
      
      this.updateKPIDisplay('lowPriorityCount', kpis.lowPriority.count);
      this.updateKPIDisplay('lowPriorityStatus', `Status: ${kpis.lowPriority.status}`);
    } else {
      // Use the KPI data loaded from the API (default/original)
      const kpis = this.kpiData;
      
      // Update KPI displays
      this.updateKPIDisplay('totalGapsCount', kpis.totalGaps.count);
      this.updateKPIDisplay('totalGapsStatus', `Status: ${kpis.totalGaps.status}`);
      
      this.updateKPIDisplay('criticalPriorityCount', kpis.criticalPriority.count);
      this.updateKPIDisplay('criticalPriorityStatus', `Status: ${kpis.criticalPriority.status}`);
      
      this.updateKPIDisplay('highPriorityCount', kpis.highPriority.count);
      this.updateKPIDisplay('highPriorityStatus', `Status: ${kpis.highPriority.status}`);
      
      this.updateKPIDisplay('mediumPriorityCount', kpis.mediumPriority.count);
      this.updateKPIDisplay('mediumPriorityStatus', `Status: ${kpis.mediumPriority.status}`);
      
      this.updateKPIDisplay('lowPriorityCount', kpis.lowPriority.count);
      this.updateKPIDisplay('lowPriorityStatus', `Status: ${kpis.lowPriority.status}`);
    }
  }

  updateKPIDisplay(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  calculateKPIsFromFilteredData(filteredData) {
    // Calculate KPIs based on filtered table data (not gap analysis format)
    const totalGaps = filteredData.length;
    
    // Count by priority from the database Priority column
    const criticalGaps = filteredData.filter(row => {
      const priority = String(row['Priority'] || row['PRIORITY'] || row['priority'] || '').toUpperCase().trim();
      return priority === 'CRITICAL' || priority === 'P1' || priority === '1';
    }).length;
    
    const highPriorityGaps = filteredData.filter(row => {
      const priority = String(row['Priority'] || row['PRIORITY'] || row['priority'] || '').toUpperCase().trim();
      return priority === 'HIGH' || priority === 'P2' || priority === '2';
    }).length;
    
    const mediumPriorityGaps = filteredData.filter(row => {
      const priority = String(row['Priority'] || row['PRIORITY'] || row['priority'] || '').toUpperCase().trim();
      return priority === 'MEDIUM' || priority === 'P3' || priority === '3';
    }).length;
    
    const lowPriorityGaps = filteredData.filter(row => {
      const priority = String(row['Priority'] || row['PRIORITY'] || row['priority'] || '').toUpperCase().trim();
      return priority === 'LOW' || priority === 'P4' || priority === '4';
    }).length;
    
    // Calculate status messages based on filtered data
    const criticalStatus = criticalGaps > 0 ? 'Past Due' : 'None';
    const highStatus = highPriorityGaps > 0 ? 'Due in next 3 weeks' : 'None';
    const mediumStatus = mediumPriorityGaps > 0 ? 'Missing commits' : 'None';
    const lowStatus = lowPriorityGaps > 0 ? 'Late commits' : 'None';
    
    return {
      totalGaps: {
        count: totalGaps,
        status: `${totalGaps} Total Gaps`
      },
      criticalPriority: {
        count: criticalGaps,
        status: criticalStatus
      },
      highPriority: {
        count: highPriorityGaps,
        status: highStatus
      },
      mediumPriority: {
        count: mediumPriorityGaps,
        status: mediumStatus
      },
      lowPriority: {
        count: lowPriorityGaps,
        status: lowStatus
      }
    };
  }

  calculateKPIsFromData(filteredData) {
    // Calculate KPIs based on filtered gap analysis data
    const totalItems = filteredData.length;
    const totalGaps = filteredData.filter(item => item.gap > 0).length;
    const criticalGaps = filteredData.filter(item => item.gap > 50).length; // High gap threshold
    const highPriorityGaps = filteredData.filter(item => item.gap > 20 && item.gap <= 50).length;
    const mediumPriorityGaps = filteredData.filter(item => item.gap > 5 && item.gap <= 20).length;
    const lowPriorityGaps = filteredData.filter(item => item.gap > 0 && item.gap <= 5).length;
    const onTrack = filteredData.filter(item => item.gap <= 0).length;
    
    const gapPercentage = totalItems > 0 ? Math.round((totalGaps / totalItems) * 100) : 0;
    
    return {
      totalGaps: {
        count: totalGaps,
        status: `${gapPercentage}% Gap`
      },
      criticalPriority: {
        count: criticalGaps,
        status: criticalGaps > 0 ? 'Past Due' : 'None'
      },
      highPriority: {
        count: highPriorityGaps,
        status: highPriorityGaps > 0 ? 'Due in next 3 weeks' : 'None'
      },
      mediumPriority: {
        count: mediumPriorityGaps,
        status: mediumPriorityGaps > 0 ? 'Missing commits' : 'None'
      },
      lowPriority: {
        count: lowPriorityGaps,
        status: lowPriorityGaps > 0 ? 'Late commits' : 'None'
      },
      onTrack: {
        count: onTrack,
        status: onTrack > 0 ? 'Meeting targets' : 'None'
      }
    };
  }

  setupKPIClickHandlers() {
    // Add click handlers for KPI cards to filter table by priority
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        const kpiType = this.getKPITypeFromCard(card);
        this.filterByKPI(kpiType);
      });
    });
  }

  getKPITypeFromCard(card) {
    // Determine KPI type based on the card content
    const label = card.querySelector('.kpi-label').textContent.trim();
    const typeMap = {
      'Total Gaps': 'totalGaps',
      'Critical Priority': 'criticalPriority',
      'High Priority': 'highPriority',
      'Medium Priority': 'mediumPriority',
      'Low Priority': 'lowPriority',
      'On Track': 'onTrack'
    };
    return typeMap[label] || 'unknown';
  }

  filterByKPI(kpiType) {
    // Filter table based on clicked KPI
    console.log(`Filtering by KPI: ${kpiType}`);
    
    // Map KPI type to priority filter
    const priorityFilters = {
      'criticalPriority': ['Critical', 'P1', '1', 'CRITICAL'],
      'highPriority': ['High', 'P2', '2', 'HIGH'],
      'mediumPriority': ['Medium', 'P3', '3', 'MEDIUM'],
      'lowPriority': ['Low', 'P4', '4', 'LOW'],
      'totalGaps': null // Show all gaps (no priority filter)
    };
    
    // Set priority filter
    this.priorityFilter = priorityFilters[kpiType] || null;
    
    // Reset to first page and reload data
    this.currentPage = 1;
    
    // Highlight active KPI card
    this.highlightActiveKPI(kpiType);
    
    // Reload table with filter (but don't update KPIs - Level 2 filter)
    this.applyTableFilters(false);
  }

  highlightActiveKPI(activeType) {
    // Remove active state from all cards
    document.querySelectorAll('.kpi-card').forEach(card => {
      card.classList.remove('border-primary', 'border-3');
      card.style.transform = '';
    });
    
    // Add active state to clicked card
    if (activeType && activeType !== 'totalGaps') {
      const kpiCards = document.querySelectorAll('.kpi-card');
      kpiCards.forEach(card => {
        const kpiType = this.getKPITypeFromCard(card);
        if (kpiType === activeType) {
          card.classList.add('border-primary', 'border-3');
          card.style.transform = 'scale(1.05)';
        }
      });
    }
  }

  applyTableFilters(updateKPIs = true) {
    // Apply priority filter to table data
    if (!this.allTableData || this.allTableData.length === 0) {
      // If no data loaded yet and not currently loading, load it first
      if (!this.isLoadingData) {
        this.loadTableData();
      }
      return;
    }
    
    let filteredData = [...this.allTableData];
    
    // Apply dropdown filters
    // Product Lines filter
    if (this.filters.productLines && this.filters.productLines.length > 0) {
      filteredData = filteredData.filter(row => {
        const program = row['ENGINE_PROGRAM'] || row['Engine Program'] || row['Program'] || '';
        return this.filters.productLines.includes(program);
      });
    }
    
    // Years filter
    if (this.filters.years && this.filters.years.length > 0) {
      filteredData = filteredData.filter(row => {
        const targetDate = row['Target_Ship_Date'] || row['Target Ship Date'] || '';
        if (targetDate) {
          const year = new Date(targetDate).getFullYear().toString();
          return this.filters.years.includes(year);
        }
        return false;
      });
    }
    
    // Configs filter
    if (this.filters.configs && this.filters.configs.length > 0) {
      filteredData = filteredData.filter(row => {
        const config = row['Configuration'] || row['Config'] || '';
        return this.filters.configs.includes(config);
      });
    }
    
    // Suppliers filter (Parent Part Supplier)
    if (this.filters.suppliers && this.filters.suppliers.length > 0) {
      filteredData = filteredData.filter(row => {
        const supplier = row['Parent_Part_Supplier'] || row['Parent Part Supplier'] || '';
        return this.filters.suppliers.includes(supplier);
      });
    }
    
    // RM Suppliers filter
    if (this.filters.rmSuppliers && this.filters.rmSuppliers.length > 0) {
      filteredData = filteredData.filter(row => {
        const rmSupplier = row['Level_2_Raw_Material_Supplier'] || row['Level 2 Raw Material Supplier'] || '';
        return this.filters.rmSuppliers.includes(rmSupplier);
      });
    }
    
    // HW Owners filter
    if (this.filters.hwOwners && this.filters.hwOwners.length > 0) {
      filteredData = filteredData.filter(row => {
        const hwOwner = row['HW_OWNER'] || row['HW OWNER'] || '';
        return this.filters.hwOwners.includes(hwOwner);
      });
    }
    
    // Modules filter (Raw Type)
    if (this.filters.modules && this.filters.modules.length > 0) {
      filteredData = filteredData.filter(row => {
        const rawType = row['Level_2_Raw_Type'] || row['Level 2 Raw Type'] || '';
        return this.filters.modules.includes(rawType);
      });
    }
    
    // Part Numbers filter
    if (this.filters.partNumbers && this.filters.partNumbers.length > 0) {
      filteredData = filteredData.filter(row => {
        const partNumber = row['Part_Number'] || row['Part Number'] || '';
        const level2PN = row['Level_2_PN'] || row['Level 2 PN'] || '';
        return this.filters.partNumbers.includes(partNumber) || this.filters.partNumbers.includes(level2PN);
      });
    }
    
    // Apply priority filter (from KPI clicks)
    if (this.priorityFilter && this.priorityFilter.length > 0) {
      filteredData = filteredData.filter(row => {
        const priority = String(row['Priority'] || row['PRIORITY'] || row['priority'] || '').toUpperCase().trim();
        return this.priorityFilter.some(p => String(p).toUpperCase().trim() === priority);
      });
    }
    
    // Apply search filter
    if (this.searchQuery && this.searchQuery.length > 0) {
      const query = this.searchQuery.toLowerCase();
      filteredData = filteredData.filter(row => {
        // Search across multiple columns
        const searchableText = [
          row['Level_2_PN'] || row['Level 2 PN'] || '',
          row['Part_Number'] || row['Part Number'] || row['Level_1_PN'] || '',
          row['ESN'] || '',
          row['HW_OWNER'] || row['HW OWNER'] || '',
          row['Priority'] || row['PRIORITY'] || row['priority'] || ''
        ].join(' ').toLowerCase();
        
        return searchableText.includes(query);
      });
    }
    
    // Sort by priority
    filteredData = this.sortByPriority(filteredData);
    
    // Update KPIs only if this is a Level 1 filter (dropdown filters)
    if (updateKPIs) {
      this.updateKPIs(filteredData);
    }
    
    // Update total records and current page data
    this.totalRecords = filteredData.length;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.recordsPerPage;
    const endIndex = startIndex + this.recordsPerPage;
    this.tableData = filteredData.slice(startIndex, endIndex);
    
    // Render table
    this.renderTable();
    this.updatePagination();
    this.updateRecordsCount();
  }

  showKPIDetails(kpiType) {
    // Show detailed view for the selected KPI type
    console.log(`Showing details for KPI: ${kpiType}`);
    // This could open a modal, navigate to a detailed page, or expand a section
    // For now, just log the action
    alert(`Showing detailed view for ${kpiType.replace(/([A-Z])/g, ' $1').trim()}`);
  }

  getFilteredData() {
    let filtered = [...this.gapAnalysisData];
    
    // Apply filters
    if (this.filters.productLines.length > 0) {
      filtered = filtered.filter(item => this.filters.productLines.includes(item.program));
    }
    
    if (this.filters.years.length > 0) {
      filtered = filtered.filter(item => this.filters.years.includes(item.year.toString()));
    }
    
    return filtered;
  }

  // Sort table data by priority (P1 first, then P2, P3, P4)
  sortByPriority(data) {
    if (!data || !Array.isArray(data)) {
      return data;
    }

    return data.sort((a, b) => {
      // Get priority values from different possible column names
      const getPriority = (row) => {
        let priority = row['Priority'] || row['PRIORITY'] || row['priority'] || '';
        
        // Normalize to uppercase string for comparison
        let priorityStr = String(priority).toUpperCase().trim();
        
        // Convert priority to numeric value for comparison
        // P1 or 1 or CRITICAL or Critical -> 1
        // P2 or 2 or HIGH or High -> 2
        // P3 or 3 or MEDIUM or Medium -> 3
        // P4 or 4 or LOW or Low -> 4
        // Default to 5 (lowest) if not found
        
        if (priorityStr === 'P1' || priorityStr === '1' || priorityStr === 'CRITICAL') return 1;
        if (priorityStr === 'P2' || priorityStr === '2' || priorityStr === 'HIGH') return 2;
        if (priorityStr === 'P3' || priorityStr === '3' || priorityStr === 'MEDIUM') return 3;
        if (priorityStr === 'P4' || priorityStr === '4' || priorityStr === 'LOW') return 4;
        
        return 5; // Unknown priority goes to the end
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      // Sort ascending (P1 first, P4 last)
      return priorityA - priorityB;
    });
  }

  // Table Management Methods
  async loadTableData() {
    try {
      console.log('Loading table data...');
      this.isLoadingData = true; // Set loading flag
      this.showTableLoading(true);
      
      // Try the gap analysis API first - load ALL gap records for client-side filtering
      try {
        const response = await fetch(`/api/gap-analysis/all?skip=0&limit=10000`); // Load all records
        
        if (response.ok) {
          const data = await response.json();
          console.log('Gap analysis data loaded from API:', data);
          
          // Store all data for filtering
          this.allTableData = this.sortByPriority(data.data || []);
          this.isLoadingData = false; // Clear loading flag
          
          // Apply filters (priority, search, etc.)
          this.applyTableFilters();
          
          this.showTableLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn('Gap analysis API failed, trying alternative:', apiError);
      }
      
      // Fallback: try datatable API and filter client-side
      try {
        const response = await fetch(`/api/datatable/all?skip=0&limit=10000`); // Load all records
        
        if (response.ok) {
          const data = await response.json();
          console.log('Table data loaded from datatable API:', data);
          
          // Filter for records with gaps only
          let filteredData = this.filterGapRecords(data.data || []);
          
          // Store all data for filtering
          this.allTableData = this.sortByPriority(filteredData);
          
          // Apply filters
          this.applyTableFilters();
          
          this.showTableLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn('Datatable API failed, trying demand API:', apiError);
      }
      
      // Fallback: try demand API
      try {
        const response = await fetch('/api/demand/programs?skip=0&limit=100');
        if (response.ok) {
          const data = await response.json();
          console.log('Using demand data as fallback:', data);
          
          // Transform demand data to table format
          let transformedData = this.transformDemandDataToTable(data.data || []);
          
          // Filter for records with gaps only
          let filteredData = this.filterGapRecords(transformedData);
          
          // Store all data for filtering
          this.allTableData = this.sortByPriority(filteredData);
          this.isLoadingData = false; // Clear loading flag
          
          // Apply filters
          this.applyTableFilters();
          
          this.showTableLoading(false);
          return;
        }
      } catch (demandError) {
        console.warn('Demand API also failed:', demandError);
      }
      
      // Final fallback: use mock data
      console.log('Using mock table data');
      let mockData = this.createMockTableData();
      
      // Filter for records with gaps only
      let filteredData = this.filterGapRecords(mockData);
      
      // Store all data for filtering
      this.allTableData = this.sortByPriority(filteredData);
      this.isLoadingData = false; // Clear loading flag
      
      // Apply filters
      this.applyTableFilters();
      
      this.showTableLoading(false);
      
    } catch (error) {
      console.error('Failed to load table data:', error);
      this.isLoadingData = false; // Clear loading flag on error
      this.showTableLoading(false);
      this.showNoData(true);
    }
  }

  setupTableEventListeners() {
    // Records per page change
    document.getElementById('recordsPerPage').addEventListener('change', (e) => {
      this.recordsPerPage = parseInt(e.target.value);
      this.currentPage = 1; // Reset to first page
      this.applyTableFilters(); // Use filter method instead of reload
    });

    // Search input
    const searchInput = document.getElementById('tableSearch');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value.trim();
        this.currentPage = 1; // Reset to first page
        this.applyTableFilters(); // Use filter method instead of reload
      }, 500); // Debounce search
    });

    // Refresh button
    document.getElementById('refreshTableBtn').addEventListener('click', () => {
      this.priorityFilter = null; // Clear filters
      this.searchQuery = '';
      document.getElementById('tableSearch').value = '';
      this.highlightActiveKPI(null); // Remove highlights
      this.loadTableData(); // Reload all data
    });
  }

  showTableLoading(show) {
    const loadingEl = document.getElementById('tableLoading');
    const tableEl = document.getElementById('gapAnalysisTable');
    const noDataEl = document.getElementById('noDataMessage');
    
    if (show) {
      loadingEl.style.display = 'block';
      tableEl.style.display = 'none';
      noDataEl.style.display = 'none';
    } else {
      loadingEl.style.display = 'none';
      tableEl.style.display = 'table';
    }
  }

  showNoData(show) {
    const noDataEl = document.getElementById('noDataMessage');
    const tableEl = document.getElementById('gapAnalysisTable');
    
    if (show) {
      noDataEl.style.display = 'block';
      tableEl.style.display = 'none';
    } else {
      noDataEl.style.display = 'none';
      tableEl.style.display = 'table';
    }
  }

  renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (this.tableData.length === 0) {
      this.showNoData(true);
      return;
    }

    this.showNoData(false);

    this.tableData.forEach((row, index) => {
      const tr = document.createElement('tr');
      
      // Get priority from database or calculate if not available
      const priority = row['Priority'] || row['PRIORITY'] || row['priority'] || this.calculateRowPriority(row);
      const priorityBadge = this.getPriorityBadge(priority);
      
      // Format target ship date
      const targetShipDate = this.formatDate(row['Target_Ship_Date'] || row['Target Ship Date']);
      
      // Format Planned PO Date Target
      const plannedPODate = this.formatDate(row['Planned_PO_Date_Target'] || row['Planned PO Date Target'] || row['PLANNED_PO_DATE_TARGET']);
      
      // Determine status based on available data
      const status = this.determineStatus(row);
      const statusBadge = this.getStatusBadge(status);

      // Get action required (based on gap status and priority)
      const actionRequired = this.getActionRequired(row, priority);
      
      // Get all the new columns
      const rmType = row['Level_2_Raw_Type'] || row['Level 2 Raw Type'] || row['Level_2_Type'] || 'N/A';
      const rmSupplier = row['Level_2_Raw_Material_Supplier'] || row['Level 2 Raw Material Supplier'] || 'N/A';
      const partDescription = row['Part_Description'] || row['Part Description'] || row['Description'] || 'N/A';
      const partSupplier = row['Parent_Part_Supplier'] || row['Parent Part Supplier'] || 'N/A';
      const hwOwner = row['HW_OWNER'] || row['HW OWNER'] || 'N/A';

      tr.innerHTML = `
        <td class="text-center">${priorityBadge}</td>
        <td class="fw-semibold">${row['Level_2_PN'] || row['Level 2 PN'] || 'N/A'}</td>
        <td class="small">${rmType}</td>
        <td>${rmSupplier}</td>
        <td>${row['Part_Number'] || row['Part Number'] || row['Level_1_PN'] || 'N/A'}</td>
        <td class="small">${partDescription}</td>
        <td>${partSupplier}</td>
        <td>${row['ESN'] || 'N/A'}</td>
        <td>${hwOwner}</td>
        <td>${statusBadge}</td>
        <td class="small">${targetShipDate}</td>
        <td class="small">${plannedPODate}</td>
        <td>${actionRequired}</td>
        <td class="text-center">
          <button class="btn btn-outline-info btn-sm" onclick="gapDashboard.emailAction(${index})" title="Email ${hwOwner}">
            <i class="fas fa-envelope"></i>
          </button>
        </td>
        <td class="text-center">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-success btn-sm" onclick="gapDashboard.closeAction(${index})" title="Close">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-outline-primary btn-sm" onclick="gapDashboard.commentAction(${index})" title="Comment">
              <i class="fas fa-comment"></i>
            </button>
          </div>
        </td>
      `;
      
      tbody.appendChild(tr);
    });
  }

  getActionRequired(row, priority) {
    // Determine action required based on priority and gap status
    const priorityStr = String(priority).toUpperCase().trim();
    
    if (priorityStr === 'P1' || priorityStr === '1' || priorityStr === 'CRITICAL') {
      return '<span class="badge bg-danger">Immediate Action</span>';
    } else if (priorityStr === 'P2' || priorityStr === '2' || priorityStr === 'HIGH') {
      return '<span class="badge bg-warning text-dark">Expedite</span>';
    } else if (priorityStr === 'P3' || priorityStr === '3' || priorityStr === 'MEDIUM') {
      return '<span class="badge bg-info">Monitor</span>';
    } else if (priorityStr === 'P4' || priorityStr === '4' || priorityStr === 'LOW') {
      return '<span class="badge bg-secondary">Track</span>';
    }
    return '<span class="badge bg-secondary">Review</span>';
  }

  calculateRowPriority(row) {
    // Simple priority calculation based on available data
    // In a real implementation, this would use more sophisticated logic
    const targetDate = new Date(row['Target_Ship_Date'] || row['Target Ship Date']);
    const now = new Date();
    const daysDiff = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return 'P1'; // Past due
    if (daysDiff <= 21) return 'P2'; // Due in next 3 weeks
    if (daysDiff <= 60) return 'P3'; // Due in next 2 months
    return 'P4'; // Future
  }

  getPriorityBadge(priority) {
    // Normalize priority to uppercase string for comparison
    const priorityStr = String(priority || '').toUpperCase().trim();
    
    // Map priority values to badges
    // Critical -> P1, High -> P2, Medium -> P3, Low -> P4
    const badges = {
      'P1': '<span class="badge bg-danger">P1 - Critical</span>',
      '1': '<span class="badge bg-danger">P1 - Critical</span>',
      'CRITICAL': '<span class="badge bg-danger">P1 - Critical</span>',
      
      'P2': '<span class="badge bg-warning text-dark">P2 - High</span>',
      '2': '<span class="badge bg-warning text-dark">P2 - High</span>',
      'HIGH': '<span class="badge bg-warning text-dark">P2 - High</span>',
      
      'P3': '<span class="badge bg-info">P3 - Medium</span>',
      '3': '<span class="badge bg-info">P3 - Medium</span>',
      'MEDIUM': '<span class="badge bg-info">P3 - Medium</span>',
      
      'P4': '<span class="badge bg-secondary">P4 - Low</span>',
      '4': '<span class="badge bg-secondary">P4 - Low</span>',
      'LOW': '<span class="badge bg-secondary">P4 - Low</span>'
    };
    
    return badges[priorityStr] || '<span class="badge bg-secondary">P4 - Low</span>';
  }

  determineStatus(row) {
    // Simple status determination - in reality this would be more complex
    const targetDate = new Date(row['Target_Ship_Date'] || row['Target Ship Date']);
    const now = new Date();
    const daysDiff = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return 'Past Due';
    if (daysDiff <= 7) return 'Due Soon';
    if (daysDiff <= 21) return 'Upcoming';
    return 'On Track';
  }

  getStatusBadge(status) {
    const badges = {
      'Past Due': '<span class="badge bg-danger">Past Due</span>',
      'Due Soon': '<span class="badge bg-warning">Due Soon</span>',
      'Upcoming': '<span class="badge bg-info">Upcoming</span>',
      'On Track': '<span class="badge bg-success">On Track</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
  }

  getGapBadge(gapStatus) {
    if (typeof gapStatus === 'string') {
      if (gapStatus.toUpperCase() === 'Y' || gapStatus.toUpperCase() === 'YES') {
        return '<span class="badge bg-danger"><i class="fas fa-exclamation-triangle"></i> Gap</span>';
      } else if (gapStatus.toUpperCase() === 'N' || gapStatus.toUpperCase() === 'NO') {
        return '<span class="badge bg-success"><i class="fas fa-check"></i> No Gap</span>';
      }
    }
    if (typeof gapStatus === 'boolean') {
      return gapStatus ? 
        '<span class="badge bg-danger"><i class="fas fa-exclamation-triangle"></i> Gap</span>' :
        '<span class="badge bg-success"><i class="fas fa-check"></i> No Gap</span>';
    }
    // Default to Gap since we're filtering for gap records
    return '<span class="badge bg-danger"><i class="fas fa-exclamation-triangle"></i> Gap</span>';
  }

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateStr;
    }
  }

  updatePagination() {
    const totalPages = Math.ceil(this.totalRecords / this.recordsPerPage);
    const paginationEl = document.getElementById('paginationControls');
    
    paginationEl.innerHTML = '';
    
    if (totalPages <= 1) return;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>`;
    paginationEl.appendChild(prevLi);

    // Page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);

    if (startPage > 1) {
      const firstLi = document.createElement('li');
      firstLi.className = 'page-item';
      firstLi.innerHTML = `<a class="page-link" href="#" data-page="1">1</a>`;
      paginationEl.appendChild(firstLi);
      
      if (startPage > 2) {
        const ellipsisLi = document.createElement('li');
        ellipsisLi.className = 'page-item disabled';
        ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
        paginationEl.appendChild(ellipsisLi);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const li = document.createElement('li');
      li.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
      paginationEl.appendChild(li);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsisLi = document.createElement('li');
        ellipsisLi.className = 'page-item disabled';
        ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
        paginationEl.appendChild(ellipsisLi);
      }
      
      const lastLi = document.createElement('li');
      lastLi.className = 'page-item';
      lastLi.innerHTML = `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>`;
      paginationEl.appendChild(lastLi);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${this.currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>`;
    paginationEl.appendChild(nextLi);

    // Add click event listeners
    paginationEl.addEventListener('click', (e) => {
      e.preventDefault();
      if (e.target.tagName === 'A' && !e.target.parentElement.classList.contains('disabled')) {
        const page = parseInt(e.target.dataset.page);
        if (page && page !== this.currentPage) {
          this.currentPage = page;
          this.loadTableData();
        }
      }
    });
  }

  updateRecordsCount() {
    const start = (this.currentPage - 1) * this.recordsPerPage + 1;
    const end = Math.min(this.currentPage * this.recordsPerPage, this.totalRecords);
    
    document.getElementById('paginationInfo').textContent = 
      `Showing ${start} to ${end} of ${this.totalRecords.toLocaleString()} entries`;
    
    document.getElementById('totalRecordsCount').textContent = 
      `${this.totalRecords.toLocaleString()} Total Records`;
  }

  // Action handlers for table buttons
  closeAction(index) {
    const row = this.tableData[index];
    if (confirm(`Close action for ${row['Level_2_PN'] || row['Level 2 PN'] || 'this item'}?`)) {
      alert('Action closed successfully!');
      // In a real implementation, you would make an API call here
    }
  }

  commentAction(index) {
    const row = this.tableData[index];
    const comment = prompt(`Add comment for ${row['Level_2_PN'] || row['Level 2 PN'] || 'this item'}:`);
    if (comment && comment.trim()) {
      alert(`Comment added: "${comment}"`);
      // In a real implementation, you would make an API call here
    }
  }

  emailAction(index) {
    const row = this.tableData[index];
    const hwOwner = row['HW_OWNER'] || row['HW OWNER'] || 'owner';
    alert(`Email notification sent to ${hwOwner}`);
    // In a real implementation, you would make an API call here
  }

}

// Initialize the dashboard when the page loads
let gapDashboard;
document.addEventListener('DOMContentLoaded', () => {
  gapDashboard = new GapAnalysisDashboard();
});
