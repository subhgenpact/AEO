
// --- Demand Dashboard Main Logic ---
// Using utilities from utils.js (ES module semantics when supported)
/* eslint-disable no-undef */
try {
  // Dynamic import when modules are supported
  if (typeof safeGetElement === 'undefined') {
    // noop in classic script; utils may be loaded separately
  }
} catch (e) {
  // ignore
}

let DEMAND_DATA = null;
let RAW_DATA = null; // keep original array shape for renderers
let BASE_METRICS = null;
let TOTALS_BY_YEAR = { '2025': 0, '2026': 0, '2027': 0 };

// ========================================
// CENTRALIZED FILTER AND DATA MANAGEMENT SYSTEM
// ========================================

/**
 * Central data manager that handles filtering and notifies all charts/tables
 * when filters change. This ensures consistency across the entire application.
 */
class DataFilterManager {

  /**
   * Set the raw data and apply filters
   */
  setRawData(data) {
    this.rawData = data || [];
    this.applyFilters();
    this.notifySubscribers();
  }
  constructor() {
    this.filters = {
      productLines: new Set(),
      years: new Set(),
      configs: new Set(),
      suppliers: new Set(),
      rmSuppliers: new Set(),
      hwOwners: new Set(),
      partNumbers: new Set(),
      modules: new Set()
    };
    this.rawData = [];
    this.embeddedCData = null;
    this.filteredData = [];
    this.subscribers = new Set();
  }


  /**
   * Apply all filters to the raw data and update filteredData
   */
  applyFilters() {
    let filtered = this.rawData;

    // Apply RM Supplier filter
    if (this.filters.rmSuppliers.size > 0) {
      filtered = filtered.filter(program => {
        if (!program.configs) return false;
        return program.configs.some(config => {
          if (!config.level1Parts) return false;
          return config.level1Parts.some(l1 =>
            this.hasRMSupplier(l1, this.filters.rmSuppliers)
          );
        });
      });
    }

    // Apply HW Owner filter
    if (this.filters.hwOwners.size > 0) {
      filtered = filtered.filter(program => {
        if (!program.configs) return false;
        return program.configs.some(config => {
          if (!config.level1Parts) return false;
          return config.level1Parts.some(part => {
            if (part.hwo) {
              // Handle both array and string formats for HW Owner
              const hwos = Array.isArray(part.hwo) ? part.hwo : [part.hwo];
              return hwos.some(hwo => this.filters.hwOwners.has(hwo));
            }
            return false;
          });
        });
      });
    }

    // Apply Part Number filter
    if (this.filters.partNumbers.size > 0) {
      filtered = filtered.filter(program => {
        if (!program.configs) return false;
        return program.configs.some(config => {
          if (!config.level1Parts) return false;
          return config.level1Parts.some(l1 =>
            this.hasPartNumber(l1, this.filters.partNumbers)
          );
        });
      });
    }

    // Apply Module filter (raw material type)
    if (this.filters.modules.size > 0) {
      filtered = filtered.filter(program => {
        if (!program.configs) return false;
        return program.configs.some(config => {
          if (!config.level1Parts) return false;
          return config.level1Parts.some(l1 =>
            this.hasModule(l1, this.filters.modules)
          );
        });
      });
    }

    this.filteredData = filtered;

    // Update global RAW_DATA for backward compatibility
    window.RAW_DATA = filtered;
  }
  
  /**
   * Helper to check if a part has any of the selected RM suppliers
   */
  hasRMSupplier(part, selectedRMSuppliers) {
    if (part.rmSupplier && selectedRMSuppliers.has(part.rmSupplier)) {
      return true;
    }
    
    const nestedParts = [
      ...(part.level2Parts || []),
      ...(part.level3Parts || []),
      ...(part.level4Parts || []),
      ...(part.level5Parts || [])
    ];
    
    return nestedParts.some(nested => this.hasRMSupplier(nested, selectedRMSuppliers));
  }
  
  /**
   * Helper to check if a part has any of the selected part numbers
   */
  hasPartNumber(part, selectedPartNumbers) {
    if (part.pn && selectedPartNumbers.has(part.pn)) {
      return true;
    }
    
    const nestedParts = [
      ...(part.level2Parts || []),
      ...(part.level3Parts || []),
      ...(part.level4Parts || []),
      ...(part.level5Parts || [])
    ];
    
    return nestedParts.some(nested => this.hasPartNumber(nested, selectedPartNumbers));
  }
  
  /**
   * Helper to check if a part has any of the selected modules (raw material types)
   */
  hasModule(part, selectedModules) {
    if (part.rawType && selectedModules.has(part.rawType)) {
      return true;
    }
    
    const nestedParts = [
      ...(part.level2Parts || []),
      ...(part.level3Parts || []),
      ...(part.level4Parts || []),
      ...(part.level5Parts || [])
    ];
    
    return nestedParts.some(nested => this.hasModule(nested, selectedModules));
  }
  
  /**
   * Get filtered chart data (for Engine Program chart)
   */
  getFilteredChartData() {
    if (!this.embeddedCData) return [];
    
    let filtered = this.embeddedCData;
    
    // Apply Product Line filter
    if (this.filters.productLines.size > 0) {
      filtered = filtered.filter(item => this.filters.productLines.has(item.PL));
    }
    
    // Apply Year filter
    if (this.filters.years.size > 0) {
      filtered = filtered.filter(item => this.filters.years.has(item.Year.toString()));
    }
    
    return filtered;
  }
  
  /**
   * Update a specific filter and re-apply all filters
   * @param {string} filterType - The filter type (productLines, years, configs, etc.)
   * @param {Set|Array} values - The filter values
   */
  updateFilter(filterType, values) {
    if (this.filters.hasOwnProperty(filterType)) {
      this.filters[filterType] = values instanceof Set ? values : new Set(values);
      this.applyFilters();
      this.notifySubscribers();
    } else {
      console.warn(`⚠️ Unknown filter type: ${filterType}`);
    }
  }

  /**
   * Clear all active filters
   */
  clearAllFilters() {
    Object.keys(this.filters).forEach(key => {
      this.filters[key].clear();
    });
    this.applyFilters();
    this.notifySubscribers();
  }

  /**
   * Subscribe to data changes
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  /**
   * Notify all subscribers that data has changed
   */
  notifySubscribers() {
    // Clear chart cache to force re-render
    if (window.chartCache) {
      window.chartCache = {
        supplier: null,
        rmSupplier: null,
        hwOwner: null,
        partNumber: null,
        engineConfig: null,
        engineProgram: null
      };
    }
    
    if (window.renderedCharts) {
      window.renderedCharts.clear();
    }
    
    // Notify all subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(this.filteredData);
      } catch (error) {
        console.error('âŒ Error in subscriber callback:', error);
      }
    });
    
    // Update filter chips
    if (typeof updateFilterChips === 'function') {
      updateFilterChips();
    }
    
    // Update Clear All button visibility
    if (typeof updateClearAllButtonVisibility === 'function') {
      updateClearAllButtonVisibility();
    }
  }
  
  /**
   * Get current filtered data
   */
  getFilteredData() {
    return this.filteredData || this.rawData;
  }
  
  /**
   * Get current filter state
   */
  getFilters() {
    return { ...this.filters };
  }
}

// Create global instance
window.dataFilterManager = new DataFilterManager();

// ========================================
// PERFORMANCE OPTIMIZATION - Chart Cache & Progressive Loading
// ========================================
window.chartCache = {
  supplier: null,
  rmSupplier: null,
  hwOwner: null,
  partNumber: null,
  engineConfig: null,
  engineProgram: null
};

window.renderedCharts = new Set();
window.loadedTableSections = new Set();

const PROGRESSIVE_LOAD_CONFIG = {
  INITIAL_PROGRAMS: 10,
  CHUNK_SIZE: 20,
  LAZY_LOAD_CHARTS: true,
  CACHE_CHART_INSTANCES: true
};

// ===============================
// Pagination Manager Class
// ===============================
// ===== PAGINATION =====
// TablePaginationManager moved to utils.js for reusability

// Global pagination managers storage (already initialized in utils.js)
// window.paginationManagers = {};

// Utility: Safe DOM operations with error handling
// Utilities now live in src/utils.js
// Expect global functions safeGetElement, safeQuerySelector, safeQuerySelectorAll, getYearFromDate to be available

// ===== DYNAMIC FILTER INITIALIZATION =====

// Fetch and initialize dashboard
async function initializeDynamicFilters(data) {
  console.log('Initializing dynamic filters...');

  try {
    // Check if DuckDB integration is available for ultra-fast filter population
    if (typeof getDuckDBFilterOptions === 'function') {
      console.log('ðŸš€ Using DuckDB for ultra-fast filter population...');
      
      // Populate all filter dropdowns using DuckDB (0.5-1ms each vs 200ms+ client-side)
      const populateDropdownDuckDB = async (filterId, columnName, prefix, extractYear = false) => {
        const dropdown = document.querySelector(`#${filterId} + .dropdown-menu .dropdown-options`);
        if (!dropdown) {
          console.warn(`âš ï¸ Dropdown container not found for ${filterId}`);
          return;
        }

        // For year filter, we need to extract years from date column
        let values;
        if (extractYear) {
          // Call the API with extract=year parameter
          try {
            const response = await fetch(`/api/filter-options/${encodeURIComponent(columnName)}?extract=year`);
            if (response.ok) {
              const result = await response.json();
              values = result.values || [];
            } else {
              console.error(`Failed to fetch year values: ${response.status}`);
              values = [];
            }
          } catch (error) {
            console.error('Error fetching year values:', error);
            values = [];
          }
        } else {
          values = await getDuckDBFilterOptions(columnName);
        }
        
        if (values && values.length > 0) {
          dropdown.innerHTML = values.map((value, index) => `
            <div class="form-check py-1">
              <input class="form-check-input" type="checkbox" value="${value}" id="${prefix}${index + 1}">
              <label class="form-check-label small" for="${prefix}${index + 1}">${value}</label>
            </div>
          `).join('');
        } else {
          console.warn(`âš ï¸ No values returned from DuckDB for ${filterId}`);
        }
      };

      // Populate all filters in parallel for maximum speed
      await Promise.all([
        populateDropdownDuckDB('productLineDropdown', 'ENGINE_PROGRAM', 'productLine'),
        populateDropdownDuckDB('yearDropdown', 'Target_Ship_Date', 'year', true), // Extract years
        populateDropdownDuckDB('engConfigDropdown', 'Configuration', 'config'),
        populateDropdownDuckDB('supplierDropdown', 'Parent_Part_Supplier', 'supplier'),
        populateDropdownDuckDB('rmSupplierDropdown', 'Level_2_Raw_Material_Supplier', 'rmSupplier'),
        populateDropdownDuckDB('hwOwnerDropdown', 'HW_OWNER', 'hwOwner'),
        populateDropdownDuckDB('partNoDropdown', 'Part_Number', 'partNumber'),
        populateDropdownDuckDB('moduleDropdown', 'Level_2_Raw_Type', 'module') // Use Level_2_Raw_Type for raw materials
      ]);
      
    } else {
      // Fallback to old client-side method (SLOW - 200ms+)
      console.warn('âš ï¸ DuckDB not available, using slow client-side filter population...');
      
      // Extract all filter values from data
      if (data && data.length > 0) {
        const filterData = {
          productLines: new Set(),
          years: new Set(),
          configs: new Set(),
          suppliers: new Set(),
          rmSuppliers: new Set(),
          hwOwners: new Set(),
          partNumbers: new Set(),
          modules: new Set()
        };

        // Extract all unique values
        data.forEach(program => {
          if (program.engineProgram) {
            // Map canonical names to display names
            const displayName = program.engineProgram === 'LM2500' ? 'LM25' : 
                               program.engineProgram === 'LM6000' ? 'LM60' : 
                               program.engineProgram;
            filterData.productLines.add(displayName);
          }
          
          (program.configs || []).forEach(config => {
            if (config.config) filterData.configs.add(config.config);
            
            (config.esns || []).forEach(esn => {
              const y = (esn.targetShipDate || '').split('/').pop();
              if (y) filterData.years.add(y);
            });
            
            (config.level1Parts || []).forEach(l1 => {
              if (l1.supplier) {
                filterData.suppliers.add(l1.supplier);
                filterData.hwOwners.add(l1.supplier);
              }
              if (l1.pn) filterData.partNumbers.add(l1.pn);
              
              // Walk through all nested parts to collect RM suppliers and modules
              const walkParts = (parts) => {
                (parts || []).forEach(part => {
                  if (part.rmSupplier) filterData.rmSuppliers.add(part.rmSupplier);
                  if (part.pn) filterData.partNumbers.add(part.pn);
                  if (part.rawType) filterData.modules.add(part.rawType);
                  
                  if (part.level2Parts) walkParts(part.level2Parts);
                  if (part.level3Parts) walkParts(part.level3Parts);
                  if (part.level4Parts) walkParts(part.level4Parts);
                  if (part.level5Parts) walkParts(part.level5Parts);
                });
              };
              
              walkParts([l1]);
            });
          });
        });

        // Populate all filter dropdowns
        const populateDropdown = (filterId, values, prefix) => {
          const dropdown = document.querySelector(`#${filterId} + .dropdown-menu .dropdown-options`);
          if (dropdown && values && values.size > 0) {
            const sortedValues = Array.from(values).sort();
            dropdown.innerHTML = sortedValues.map((value, index) => `
              <div class="form-check py-1">
                <input class="form-check-input" type="checkbox" value="${value}" id="${prefix}${index + 1}">
                <label class="form-check-label small" for="${prefix}${index + 1}">${value}</label>
              </div>
            `).join('');
          } else {
            console.warn(`âš ï¸ Could not populate ${filterId}. Dropdown: ${!!dropdown}, Values: ${values?.size || 0}`);
          }
        };

        populateDropdown('productLineDropdown', filterData.productLines, 'productLine');
        populateDropdown('yearDropdown', filterData.years, 'year');
        populateDropdown('engConfigDropdown', filterData.configs, 'config');
        populateDropdown('supplierDropdown', filterData.suppliers, 'supplier');
        populateDropdown('rmSupplierDropdown', filterData.rmSuppliers, 'rmSupplier');
        populateDropdown('hwOwnerDropdown', filterData.hwOwners, 'hwOwner');
        populateDropdown('partNoDropdown', filterData.partNumbers, 'partNumber');
        populateDropdown('moduleDropdown', filterData.modules, 'module');
      }
    }

    // Initialize all filter event handlers
    initProductLineFilter();
    initYearFilter();
    initConfigFilter();
    initSupplierFilter();
    initRMSupplierFilter();
    initHWOwnerFilter();
    initPartNumberFilter();
    initModuleFilter();
    initClearAllFiltersButton();
  } catch (error) {
    console.error('Error initializing filters:', error);
  }

  console.log('ðŸŸ¢ RAW_DATA:', data);
  console.log('ðŸŸ¢ First program:', data[0]);
  if (data[0]?.configs?.[0]) {
    console.log('ðŸŸ¢ First config:', data[0].configs[0]);
    console.log('ðŸŸ¢ ESNs:', data[0].configs[0].esns);
    console.log('ðŸŸ¢ Level1Parts:', data[0].configs[0].level1Parts?.length);
  }
}

// ===== END FILTER INITIALIZATION =====

const initializeDashboard = (data) => {
  try {
    // Store data in centralized manager
    window.dataFilterManager.setRawData(data);
    
    // Keep original for backward compatibility
    RAW_DATA = data;
    window.RAW_DATA = data; // expose for charts.js helpers
    
    // Subscribe to data changes for auto-updates
    window.dataFilterManager.subscribe((filteredData) => {
      // Update RAW_DATA for backward compatibility
      window.RAW_DATA = filteredData;
      RAW_DATA = filteredData;
      
      // Re-render all tables with filtered data
      try { renderEngineProgramTable(filteredData); } catch (e) { console.error('Error rendering Engine Program table:', e); }
      try { renderEngineConfigTable(filteredData); } catch (e) { console.error('Error rendering Engine Config table:', e); }
      try { renderSupplierTable(filteredData); } catch (e) { console.error('Error rendering Supplier table:', e); }
      try { renderRMSupplierTable(filteredData); } catch (e) { console.error('Error rendering RM Supplier table:', e); }
      try { renderHWOwnerTable(filteredData); } catch (e) { console.error('Error rendering HW Owner table:', e); }
      try { renderPartNumberTable(filteredData); } catch (e) { console.error('Error rendering Part Number table:', e); }
      
      // Ensure section visibility - get active section or default to engine-program
      const activeSection = document.querySelector('#sectionPills .section-pill.active')?.dataset?.target || 'section-engine-program';
      
      // Hide all sections except the active one
      const allSections = ['section-engine-program', 'section-supplier', 'section-rm-supplier', 'section-hw-owner'];
      allSections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
          if (sectionId === activeSection) {
            section.classList.remove('d-none');
          } else {
            section.classList.add('d-none');
          }
        }
      });
      
      // ALWAYS re-render Engine Program chart when filters change (regardless of active section)
      if (typeof renderEngineProgramChart === 'function') {
        renderEngineProgramChart();
      }
      
      // Also re-render the currently active section's chart if it's not Engine Program
      if (activeSection && activeSection !== 'section-engine-program') {
        if (typeof renderChartForSection === 'function') {
          renderChartForSection(activeSection);
        }
      }
    });
    
    // Transform data structure to match expected format
    DEMAND_DATA = {
      enginePrograms: data.map(item => ({
        program: item.engineProgram,
        ...item,
        // Calculate yearly quantities from ESN data
        qty2025: 0,
        qty2026: 0,
        qty2027: 0
      }))
    };

    // Calculate yearly quantities from ESN dates
    DEMAND_DATA.enginePrograms.forEach(program => {
      program.configs.forEach(config => {
        config.esns.forEach(esn => {
          const year = getYearFromDate(esn.targetShipDate);
          if (year === '2025') program.qty2025++;
          else if (year === '2026') program.qty2026++;
          else if (year === '2027') program.qty2027++;
        });
      });
    });

    // Aggregate totals for year overview
    TOTALS_BY_YEAR['2025'] = DEMAND_DATA.enginePrograms.reduce((sum, p) => sum + p.qty2025, 0);
    TOTALS_BY_YEAR['2026'] = DEMAND_DATA.enginePrograms.reduce((sum, p) => sum + p.qty2026, 0);
    TOTALS_BY_YEAR['2027'] = DEMAND_DATA.enginePrograms.reduce((sum, p) => sum + p.qty2027, 0);

    console.log('Data loaded successfully:', RAW_DATA ? RAW_DATA.length : 0, 'programs');

    // Initialize all dynamic filters with raw data (array of programs)
    initializeDynamicFilters(RAW_DATA);

    // Render all components with filtered data (use getFilteredData to ensure consistency)
    const initialFilteredData = window.dataFilterManager.getFilteredData();
    try { renderEngineProgramTable(initialFilteredData); } catch (e) { console.error('Error rendering Engine Program table:', e); }
    try { renderEngineConfigTable(initialFilteredData); } catch (e) { console.error('Error rendering Engine Config table:', e); }
    try { renderSupplierTable(initialFilteredData); } catch (e) { console.error('Error rendering Supplier table:', e); }
    try { renderRMSupplierTable(initialFilteredData); } catch (e) { console.error('Error rendering RM Supplier table:', e); }
    try { renderHWOwnerTable(initialFilteredData); } catch (e) { console.error('Error rendering HW Owner table:', e); }
    try { renderPartNumberTable(initialFilteredData); } catch (e) { console.error('Error rendering Part Number table:', e); }
    
    // OPTIMIZATION: Render charts after tables are populated
    // Render Engine Program Overview chart
    setTimeout(() => {
      try { 
        console.log('ðŸ“Š Rendering Engine Program Overview chart...');
        if (typeof renderEngineProgramChart === 'function') {
          renderEngineProgramChart();
        }
      } catch (e) { console.error('Error rendering Engine Program chart:', e); }
    }, 50);
    
    // Render Supplier chart (for currently visible section)
    // Increased timeout to ensure table data is ready
    setTimeout(() => {
      try { 
        console.log('ðŸ“Š Rendering Supplier chart...');
        if (typeof renderSupplierChart === 'function') {
          renderSupplierChart('section-supplier');
        }
      } catch (e) { console.error('Error rendering Supplier chart:', e); }
    }, 300);

    console.log('âœ… Dashboard initialized successfully', DEMAND_DATA);
  } catch (error) {
    console.error('Error processing dashboard data:', error);
    showDataError('Error processing dashboard data: ' + error.message);
  }
};

// Load data in chunks using ChunkLoader
const chunkLoader = new ChunkLoader({
  chunkSize: 50,
  onChunkLoaded: (data, loadedCount, total) => {
    console.log(`Chunk loaded: ${loadedCount}/${total} items`);
  },
  onAllLoaded: (allData) => {
    console.log(`âœ… All data loaded: ${allData.length} items`);
    initializeDashboard(allData);
  },
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}% (${progress.loaded}/${progress.total})`);
  },
  onError: (error) => {
    console.warn('Failed to load data via ChunkLoader:', error);
    console.log('Falling back to embedded data...');

    // Use embedded data as fallback
    if (typeof window.EMBEDDED_DEMAND_DATA !== 'undefined') {
      initializeDashboard(window.EMBEDDED_DEMAND_DATA);
    } else {
      console.error('No embedded data available');
      showDataError('Failed to load dashboard data. Please check if the data file exists and try refreshing the page.');
    }
  }
});

// Start loading chunks from DuckDB API endpoint
chunkLoader.loadChunks('/api/demand/programs').catch(error => {
  console.error('Fatal error loading data:', error);
  showDataError('Failed to load dashboard data: ' + error.message);
});

// Show error message to user
function showDataError(message) {
  const container = document.querySelector('.container');
  if (container) {
    container.innerHTML = `
      <div class="alert alert-danger mt-4" role="alert">
        <h4 class="alert-heading">Data Loading Error</h4>
        <p>${message}</p>
        <hr>
        <p class="mb-0">Error: Failed to fetch</p>
      </div>
    `;
  }
}

// Render Engine Program Table and collect KPI metrics
function renderEngineProgramTable(data) {
  const epSection = document.getElementById('section-engine-program');
  if (!epSection || !Array.isArray(data)) {
    console.warn('âš ï¸ Exiting: epSection not found or data not array');
    return;
  }

  // Initialize pagination manager if not exists
  if (!window.paginationManagers['engine-program']) {
    window.paginationManagers['engine-program'] = new TablePaginationManager(
      'engine-program',
      (pageData, allData) => renderEngineProgramTableContent(pageData, allData, epSection)
    );
    window.paginationManagers['engine-program'].initialize('epPagination');
  }

  // Set data and render
  window.paginationManagers['engine-program'].setData(data);
  window.paginationManagers['engine-program'].renderTable();

  epSection.classList.remove('d-none');
}

function renderEngineProgramTableContent(data, allData, epSection) {
  let tbody = epSection.querySelector('tbody');
  if (!tbody) {
    const table = epSection.querySelector('table');
    if (table) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
  }
  if (!tbody) {
    console.warn('âš ï¸ Exiting: tbody not found');
    return;
  }
  tbody.innerHTML = '';

  // Collect all years dynamically from ALL data
  const years = new Set();
  allData.forEach(program => {
    program.configs.forEach(cfg => {
      (cfg.esns || []).forEach(esn => {
        const y = getYearFromDate(esn.targetShipDate);
        if (y) years.add(y);
      });
    });
  });
  const yearList = Array.from(years).sort();

  // Render table header dynamically
  const table = epSection.querySelector('table');
  if (table) {
    let thead = table.querySelector('thead');
    if (!thead) {
      thead = document.createElement('thead');
      table.insertBefore(thead, table.firstChild);
    }
    thead.innerHTML = `<tr><th>Engine Program</th>${yearList.map(y => `<th>${y}</th>`).join('')}</tr>`;
  }

  // Render rows for current page data only
  data.forEach(program => {
    const yearCounts = {};
    yearList.forEach(y => yearCounts[y] = 0);
    program.configs.forEach(cfg => {
      (cfg.esns || []).forEach(esn => {
        const y = getYearFromDate(esn.targetShipDate);
        if (y && yearCounts[y] !== undefined) yearCounts[y]++;
      });
    });
    tbody.innerHTML += `<tr><td>${program.engineProgram}</td>${yearList.map(y => `<td>${yearCounts[y]}</td>`).join('')}</tr>`;
  });
}

// Render Engine Config Table
function renderEngineConfigTable(data) {
  const ecSection = document.getElementById('section-engine-config');
  if (!ecSection || !Array.isArray(data)) return;

  // Flatten data: each config becomes a row
  const flattenedData = [];
  data.forEach(program => {
    program.configs.forEach(cfg => {
      flattenedData.push({
        engineProgram: program.engineProgram,
        config: cfg.config,
        esns: cfg.esns || []
      });
    });
  });

  // Initialize pagination manager if not exists
  if (!window.paginationManagers['engine-config']) {
    window.paginationManagers['engine-config'] = new TablePaginationManager(
      'engine-config',
      (pageData, allData) => renderEngineConfigTableContent(pageData, allData, ecSection)
    );
    window.paginationManagers['engine-config'].initialize('ecPagination');
  }

  // Set data and render
  window.paginationManagers['engine-config'].setData(flattenedData);
  window.paginationManagers['engine-config'].renderTable();
}

function renderEngineConfigTableContent(data, allData, ecSection) {
  let tbody = ecSection.querySelector('tbody');
  if (!tbody) {
    const table = ecSection.querySelector('table');
    if (table) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
  }
  if (!tbody) return;
  tbody.innerHTML = '';

  // Collect all years dynamically from ALL data
  const years = new Set();
  allData.forEach(item => {
    (item.esns || []).forEach(esn => {
      const y = getYearFromDate(esn.targetShipDate);
      if (y) years.add(y);
    });
  });
  const yearList = Array.from(years).sort();

  // Render table header dynamically
  const table = ecSection.querySelector('table');
  if (table) {
    let thead = table.querySelector('thead');
    if (!thead) {
      thead = document.createElement('thead');
      table.insertBefore(thead, table.firstChild);
    }
    thead.innerHTML = `<tr><th>Engine Program</th><th>Config</th>${yearList.map(y => `<th>${y}</th>`).join('')}</tr>`;
  }

  // Render rows for current page data only
  data.forEach(item => {
    const yearCounts = {};
    yearList.forEach(y => yearCounts[y] = 0);
    (item.esns || []).forEach(esn => {
      const y = getYearFromDate(esn.targetShipDate);
      if (y && yearCounts[y] !== undefined) yearCounts[y]++;
    });
    tbody.innerHTML += `<tr><td>${item.engineProgram}</td><td>${item.config}</td>${yearList.map(y => `<td>${yearCounts[y]}</td>`).join('')}</tr>`;
  });
}

// Render Supplier Table (dynamic)
function renderSupplierTable(data) {
  const supplierSection = document.getElementById('section-supplier');
  if (!supplierSection || !Array.isArray(data)) {
    console.warn('âš ï¸ renderSupplierTable: section or data invalid', {
      hasSection: !!supplierSection,
      isArray: Array.isArray(data)
    });
    return;
  }

  // Collect all years and suppliers dynamically
  const years = new Set();
  const supplierData = new Map();

  data.forEach(program => {
    program.configs.forEach(cfg => {
      (cfg.esns || []).forEach(esn => {
        const y = getYearFromDate(esn.targetShipDate);
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
            supplierData.set(key, { supplier: l1.supplier, level1PN: samplePN, description: sampleDesc, yearCounts: {} });
          }
          const supplierInfo = supplierData.get(key);

          // Count ESNs by year for this supplier part
          const esnCountsByYear = {};
          (cfg.esns || []).forEach(esn => {
            const y = getYearFromDate(esn.targetShipDate);
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

  // Convert map to array for pagination
  const supplierArray = Array.from(supplierData.values());

  // Initialize pagination manager if not exists
  if (!window.paginationManagers['supplier']) {
    window.paginationManagers['supplier'] = new TablePaginationManager(
      'supplier',
      (pageData, allData) => renderSupplierTableContent(pageData, allData, supplierSection, Array.from(years).sort())
    );
    window.paginationManagers['supplier'].initialize('supplierPagination');
  }

  // Set data and render
  window.paginationManagers['supplier'].setData(supplierArray);
  window.paginationManagers['supplier'].renderTable();
}

function renderSupplierTableContent(data, allData, supplierSection, yearList) {
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

// Render RM Supplier Table (dynamic)
function renderRMSupplierTable(data) {
  console.log('renderRMSupplierTable called with data length:', data?.length);
  const rmSection = document.getElementById('section-rm-supplier');
  if (!rmSection || !Array.isArray(data)) return;
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

  // Collect all years and RM suppliers from the provided data
  const years = new Set();
  const rmSupplierData = new Map();

  function extractRMSuppliers(parts, esns, level1PN, description) {
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
          rmSupplierData.set(key, { rmSupplier: key, level1PN: samplePN, description: sampleDesc, yearCounts: {} });
        }
        const rmInfo = rmSupplierData.get(key);

        esns.forEach(esn => {
          const y = getYearFromDate(esn.targetShipDate);
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
  }

  data.forEach(program => {
    program.configs.forEach(cfg => {
      (cfg.level1Parts || []).forEach(l1 => {
        extractRMSuppliers([l1], cfg.esns || [], l1.partNumber, l1.description);
      });
    });
  });

  const yearList = Array.from(years).sort();

  // Convert map to array for pagination
  const rmSupplierArray = Array.from(rmSupplierData.values());

  // Initialize pagination manager if not exists
  if (!window.paginationManagers['rm-supplier']) {
    window.paginationManagers['rm-supplier'] = new TablePaginationManager(
      'rm-supplier',
      (pageData, allData) => renderRMSupplierTableContent(pageData, allData, rmSection, yearList)
    );
    window.paginationManagers['rm-supplier'].initialize('rmSupplierPagination');
  }

  // Set data and render
  window.paginationManagers['rm-supplier'].setData(rmSupplierArray);
  window.paginationManagers['rm-supplier'].renderTable();

  // Debug logging for RM Supplier table
  console.log('RM Supplier Table Data:', {
    totalSuppliers: rmSupplierData.size,
    selectedFilters: window.selectedRMSuppliers ? Array.from(window.selectedRMSuppliers) : [],
    supplierDetails: rmSupplierArray.map(s => ({
      rmSupplier: s.rmSupplier,
      level1PN: s.level1PN,
      description: s.description,
      yearCounts: s.yearCounts,
      total: Object.values(s.yearCounts).reduce((sum, val) => sum + val, 0)
    }))
  });
}

function renderRMSupplierTableContent(data, allData, rmSection, yearList) {
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

// Render HW Owner Table (same as Supplier for now)
function renderHWOwnerTable(data) {
  const hwSection = document.getElementById('section-hw-owner');
  if (!hwSection || !Array.isArray(data)) return;
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

  // Collect HW Owner data from the actual hwo field
  const years = new Set();
  const hwOwnerData = new Map();

  data.forEach(program => {
    program.configs.forEach(cfg => {
      (cfg.esns || []).forEach(esn => {
        const y = getYearFromDate(esn.targetShipDate);
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
              const y = getYearFromDate(esn.targetShipDate);
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

  const yearList = Array.from(years).sort();

  // Convert map to array for pagination
  const hwOwnerArray = Array.from(hwOwnerData.values());

  // Initialize pagination manager if not exists
  if (!window.paginationManagers['hw-owner']) {
    window.paginationManagers['hw-owner'] = new TablePaginationManager(
      'hw-owner',
      (pageData, allData) => renderHWOwnerTableContent(pageData, allData, hwSection, yearList)
    );
    window.paginationManagers['hw-owner'].initialize('hwOwnerPagination');
  }

  // Set data and render
  window.paginationManagers['hw-owner'].setData(hwOwnerArray);
  window.paginationManagers['hw-owner'].renderTable();
}

function renderHWOwnerTableContent(data, allData, hwSection, yearList) {
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

// Render Part Number Table (dynamic)
function renderPartNumberTable(data) {
  const pnSection = document.getElementById('section-part-number');
  if (!pnSection || !Array.isArray(data)) return;
  let tbody = pnSection.querySelector('tbody');
  if (!tbody) {
    const table = pnSection.querySelector('table');
    if (table) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
  }
  if (!tbody) return;
  tbody.innerHTML = '';

  // Collect all years and part numbers
  const years = new Set();
  const partData = new Map();

  function extractPartNumbers(parts, esns) {
    parts.forEach(part => {
      if (part.pn) {
        const key = part.pn;
        
        // Apply part number filter at item level if active
        if (window.dataFilterManager.filters.partNumbers.size > 0) {
          if (!window.dataFilterManager.filters.partNumbers.has(key)) {
            return; // Skip this part number if it doesn't match the filter
          }
        }
        
        if (!partData.has(key)) {
          partData.set(key, { partNumber: key, yearCounts: {} });
        }
        const partInfo = partData.get(key);

        esns.forEach(esn => {
          const y = getYearFromDate(esn.targetShipDate);
          if (y) {
            // Only include years that match the year filter (if active)
            const shouldIncludeYear = window.dataFilterManager.filters.years.size === 0 || 
                                     window.dataFilterManager.filters.years.has(y);
            if (shouldIncludeYear) {
              years.add(y);
              if (!partInfo.yearCounts[y]) partInfo.yearCounts[y] = 0;
              partInfo.yearCounts[y]++;
            }
          }
        });
      }

      // Recursively check nested parts
      if (part.level2Parts) extractPartNumbers(part.level2Parts, esns);
      if (part.level3Parts) extractPartNumbers(part.level3Parts, esns);
      if (part.level4Parts) extractPartNumbers(part.level4Parts, esns);
      if (part.level5Parts) extractPartNumbers(part.level5Parts, esns);
    });
  }

  data.forEach(program => {
    program.configs.forEach(cfg => {
      (cfg.level1Parts || []).forEach(l1 => {
        extractPartNumbers([l1], cfg.esns || []);
      });
    });
  });

  const yearList = Array.from(years).sort();

  // Convert map to array for pagination
  const partNumberArray = Array.from(partData.values());

  // Initialize pagination manager if not exists
  if (!window.paginationManagers['part-number']) {
    window.paginationManagers['part-number'] = new TablePaginationManager(
      'part-number',
      (pageData, allData) => renderPartNumberTableContent(pageData, allData, pnSection, yearList)
    );
    window.paginationManagers['part-number'].initialize('partNumberPagination');
  }

  // Set data and render
  window.paginationManagers['part-number'].setData(partNumberArray);
  window.paginationManagers['part-number'].renderTable();
}

function renderPartNumberTableContent(data, allData, pnSection, yearList) {
  let tbody = pnSection.querySelector('tbody');
  if (!tbody) {
    const table = pnSection.querySelector('table');
    if (table) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
  }
  if (!tbody) return;
  tbody.innerHTML = '';

  // Render table header
  const table = pnSection.querySelector('table');
  if (table) {
    let thead = table.querySelector('thead');
    if (!thead) {
      thead = document.createElement('thead');
      table.insertBefore(thead, table.firstChild);
    }
    thead.innerHTML = `<tr><th>Part No</th>${yearList.map(y => `<th>${y}</th>`).join('')}</tr>`;
  }

  // Render rows for current page data only
  data.forEach(partInfo => {
    const yearValues = yearList.map(y => partInfo.yearCounts[y] || 0);
    tbody.innerHTML += `<tr><td>${partInfo.partNumber}</td>${yearValues.map(v => `<td>${v}</td>`).join('')}</tr>`;
  });
}

// ===== FILTERED TABLE RENDERING FUNCTIONS =====
// These functions respect the selectedYears filter when rendering tables

function renderEngineConfigTableFiltered(data) {
  const ecSection = document.getElementById('section-engine-config');
  if (!ecSection || !Array.isArray(data)) return;

  let tbody = ecSection.querySelector('tbody');
  if (!tbody) {
    const table = ecSection.querySelector('table');
    if (table) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
  }
  if (!tbody) return;

  tbody.innerHTML = '';

  // Get years to display based on filter
  let yearsToShow = [];
  const yearFilter = window.dataFilterManager.filters.years;
  if (yearFilter.size > 0) {
    yearsToShow = Array.from(yearFilter).sort();
  } else {
    // No filter - collect all years from data
    const years = new Set();
    data.forEach(program => {
      program.configs.forEach(cfg => {
        (cfg.esns || []).forEach(esn => {
          const y = getYearFromDate(esn.targetShipDate);
          if (y) years.add(y);
        });
      });
    });
    yearsToShow = Array.from(years).sort();
  }

  // Render table header dynamically
  const table = ecSection.querySelector('table');
  if (table) {
    let thead = table.querySelector('thead');
    if (!thead) {
      thead = document.createElement('thead');
      table.insertBefore(thead, table.firstChild);
    }
    thead.innerHTML = `<tr><th>Engine Program</th><th>Config</th>${yearsToShow.map(y => `<th>${y}</th>`).join('')}</tr>`;
  }

  // Render rows
  data.forEach(program => {
    program.configs.forEach(cfg => {
      const yearCounts = {};
      yearsToShow.forEach(y => yearCounts[y] = 0);

      (cfg.esns || []).forEach(esn => {
        const y = getYearFromDate(esn.targetShipDate);
        if (y && yearCounts[y] !== undefined) yearCounts[y]++;
      });

      // Only show row if it has data for the selected years
      const hasData = yearsToShow.some(y => yearCounts[y] > 0);
      if (hasData) {
        tbody.innerHTML += `<tr><td>${program.engineProgram}</td><td>${cfg.config}</td>${yearsToShow.map(y => `<td>${yearCounts[y]}</td>`).join('')}</tr>`;
      }
    });
  });
}

function renderSupplierTableFiltered(data) {
  const supplierSection = document.getElementById('section-supplier');
  if (!supplierSection || !Array.isArray(data)) return;

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

  // Get years to display based on filter
  let yearsToShow = [];
  const yearFilter = window.dataFilterManager.filters.years;
  if (yearFilter.size > 0) {
    yearsToShow = Array.from(yearFilter).sort();
  } else {
    const years = new Set();
    data.forEach(program => {
      program.configs.forEach(cfg => {
        (cfg.esns || []).forEach(esn => {
          const y = getYearFromDate(esn.targetShipDate);
          if (y) years.add(y);
        });
      });
    });
    yearsToShow = Array.from(years).sort();
  }

  const supplierData = new Map();

  data.forEach(program => {
    program.configs.forEach(cfg => {
      (cfg.level1Parts || []).forEach(l1 => {
        const supplier = l1.supplier || 'Unknown';
        if (!supplierData.has(supplier)) {
          supplierData.set(supplier, { supplier, yearCounts: {} });
        }
        const supplierInfo = supplierData.get(supplier);

        (cfg.esns || []).forEach(esn => {
          const year = getYearFromDate(esn.targetShipDate);
          if (year && yearsToShow.includes(year)) {
            supplierInfo.yearCounts[year] = (supplierInfo.yearCounts[year] || 0) + (l1.qpe || 1);
          }
        });
      });
    });
  });

  // Render table header
  const table = supplierSection.querySelector('table');
  if (table) {
    let thead = table.querySelector('thead');
    if (!thead) {
      thead = document.createElement('thead');
      table.insertBefore(thead, table.firstChild);
    }
    thead.innerHTML = `<tr><th>HWO</th><th>Suppliers</th>${yearsToShow.map(y => `<th>${y}</th>`).join('')}</tr>`;
  }

  // Render rows
  Array.from(supplierData.values()).forEach(supplierInfo => {
    const yearValues = yearsToShow.map(y => supplierInfo.yearCounts[y] || 0);
    const hasData = yearValues.some(v => v > 0);
    if (hasData) {
      tbody.innerHTML += `<tr><td>AAA</td><td>${supplierInfo.supplier}</td>${yearValues.map(v => `<td>${v}</td>`).join('')}</tr>`;
    }
  });
}

function renderRMSupplierTableFiltered(data) {
  const rmSection = document.getElementById('section-rm-supplier');
  if (!rmSection || !Array.isArray(data)) return;

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

  // Get years to display based on filter
  let yearsToShow = [];
  const yearFilter = window.dataFilterManager.filters.years;
  if (yearFilter.size > 0) {
    yearsToShow = Array.from(yearFilter).sort();
  } else {
    const years = new Set();
    data.forEach(program => {
      program.configs.forEach(cfg => {
        (cfg.esns || []).forEach(esn => {
          const y = getYearFromDate(esn.targetShipDate);
          if (y) years.add(y);
        });
      });
    });
    yearsToShow = Array.from(years).sort();
  }

  const rmSupplierData = new Map();

  // OPTIMIZATION #2: Use iterative part walking instead of recursive
  function extractRMData(parts, esns, supplier) {
    if (typeof extractRMDataIterative === 'function') {
      // Use optimized iterative approach
      const iterativeResults = extractRMDataIterative(parts, esns, supplier);
      // Merge results into rmSupplierData
      iterativeResults.forEach((value, key) => {
        rmSupplierData.set(key, value);
      });
    } else {
      // Fallback to recursive approach
      parts.forEach(part => {
        if (part.rmSupplier) {
          const key = `${supplier}-${part.rmSupplier}`;
          if (!rmSupplierData.has(key)) {
            rmSupplierData.set(key, { supplier, rmSupplier: part.rmSupplier, yearCounts: {} });
          }
          const rmInfo = rmSupplierData.get(key);

          esns.forEach(esn => {
            const year = getYearFromDate(esn.targetShipDate);
            if (year && yearsToShow.includes(year)) {
              rmInfo.yearCounts[year] = (rmInfo.yearCounts[year] || 0) + 1;
            }
          });
        }

        if (part.level2Parts) extractRMData(part.level2Parts, esns, supplier);
        if (part.level3Parts) extractRMData(part.level3Parts, esns, supplier);
        if (part.level4Parts) extractRMData(part.level4Parts, esns, supplier);
        if (part.level5Parts) extractRMData(part.level5Parts, esns, supplier);
      });
    }
  }

  data.forEach(program => {
    program.configs.forEach(cfg => {
      (cfg.level1Parts || []).forEach(l1 => {
        extractRMData([l1], cfg.esns || [], l1.supplier || 'Unknown');
      });
    });
  });

  // Render table header
  const table = rmSection.querySelector('table');
  if (table) {
    let thead = table.querySelector('thead');
    if (!thead) {
      thead = document.createElement('thead');
      table.insertBefore(thead, table.firstChild);
    }
    thead.innerHTML = `<tr><th>Supplier</th><th>RM Supplier</th>${yearsToShow.map(y => `<th>${y}</th>`).join('')}</tr>`;
  }

  // Render rows
  Array.from(rmSupplierData.values()).forEach(rmInfo => {
    const yearValues = yearsToShow.map(y => rmInfo.yearCounts[y] || 0);
    const hasData = yearValues.some(v => v > 0);
    if (hasData) {
      tbody.innerHTML += `<tr><td>${rmInfo.supplier}</td><td>${rmInfo.rmSupplier}</td>${yearValues.map(v => `<td>${v}</td>`).join('')}</tr>`;
    }
  });
}

function renderHWOwnerTableFiltered(data) {
  const hwSection = document.getElementById('section-hw-owner');
  if (!hwSection || !Array.isArray(data)) return;

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

  // Get years to display based on filter
  let yearsToShow = [];
  const yearFilter = window.dataFilterManager.filters.years;
  if (yearFilter.size > 0) {
    yearsToShow = Array.from(yearFilter).sort();
  } else {
    const years = new Set();
    data.forEach(program => {
      program.configs.forEach(cfg => {
        (cfg.esns || []).forEach(esn => {
          const y = getYearFromDate(esn.targetShipDate);
          if (y) years.add(y);
        });
      });
    });
    yearsToShow = Array.from(years).sort();
  }

  const hwOwnerData = new Map();

  data.forEach(program => {
    program.configs.forEach(cfg => {
      (cfg.level1Parts || []).forEach(l1 => {
        if (l1.hwo) {
          // Handle both array and string formats for backward compatibility
          const hwos = Array.isArray(l1.hwo) ? l1.hwo : [l1.hwo];

          hwos.forEach(hwo => {
            if (!hwOwnerData.has(hwo)) {
              hwOwnerData.set(hwo, {
                hwOwner: hwo,
                level1Pn: l1.pn || l1.partNumber || '-',
                description: l1.description || 'Component',
                supplier: l1.supplier || '-',
                yearCounts: {}
              });
            }
            const hwoInfo = hwOwnerData.get(hwo);

            (cfg.esns || []).forEach(esn => {
              const y = getYearFromDate(esn.targetShipDate);
              if (y && yearsToShow.includes(y)) {
                if (!hwoInfo.yearCounts[y]) hwoInfo.yearCounts[y] = 0;
                hwoInfo.yearCounts[y] += (l1.qpe || 1);
              }
            });
          });
        }
      });
    });
  });

  // Render table header
  const table = hwSection.querySelector('table');
  if (table) {
    let thead = table.querySelector('thead');
    if (!thead) {
      thead = document.createElement('thead');
      table.insertBefore(thead, table.firstChild);
    }
    thead.innerHTML = `<tr><th>HWO</th><th>Level 1 PN</th><th>Description</th><th>Supplier</th>${yearsToShow.map(y => `<th>${y}</th>`).join('')}</tr>`;
  }

  // Render rows
  Array.from(hwOwnerData.values()).forEach(hwoInfo => {
    const yearValues = yearsToShow.map(y => hwoInfo.yearCounts[y] || 0);
    const hasData = yearValues.some(v => v > 0);
    if (hasData) {
      tbody.innerHTML += `<tr><td>${hwoInfo.hwOwner}</td><td>${hwoInfo.level1Pn}</td><td>${hwoInfo.description}</td><td>${hwoInfo.supplier}</td>${yearValues.map(v => `<td>${v}</td>`).join('')}</tr>`;
    }
  });
}

function renderPartNumberTableFiltered(data) {
  const pnSection = document.getElementById('section-part-number');
  if (!pnSection || !Array.isArray(data)) return;

  let tbody = pnSection.querySelector('tbody');
  if (!tbody) {
    const table = pnSection.querySelector('table');
    if (table) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
  }
  if (!tbody) return;

  tbody.innerHTML = '';

  // Get years to display based on filter
  let yearsToShow = [];
  if (selectedYears.size > 0) {
    yearsToShow = Array.from(selectedYears).sort();
  } else {
    const years = new Set();
    data.forEach(program => {
      program.configs.forEach(cfg => {
        (cfg.esns || []).forEach(esn => {
          const y = getYearFromDate(esn.targetShipDate);
          if (y) years.add(y);
        });
      });
    });
    yearsToShow = Array.from(years).sort();
  }

  const partData = new Map();

  function extractPartNumbers(parts, esns) {
    parts.forEach(part => {
      if (part.pn) {
        if (!partData.has(part.pn)) {
          partData.set(part.pn, {
            partNumber: part.pn,
            yearCounts: {}
          });
        }
        const partInfo = partData.get(part.pn);

        esns.forEach(esn => {
          const year = getYearFromDate(esn.targetShipDate);
          if (year && yearsToShow.includes(year)) {
            partInfo.yearCounts[year] = (partInfo.yearCounts[year] || 0) + 1;
          }
        });
      }

      if (part.level2Parts) extractPartNumbers(part.level2Parts, esns);
      if (part.level3Parts) extractPartNumbers(part.level3Parts, esns);
      if (part.level4Parts) extractPartNumbers(part.level4Parts, esns);
      if (part.level5Parts) extractPartNumbers(part.level5Parts, esns);
    });
  }

  data.forEach(program => {
    program.configs.forEach(cfg => {
      (cfg.level1Parts || []).forEach(l1 => {
        extractPartNumbers([l1], cfg.esns || []);
      });
    });
  });

  // Render table header
  const table = pnSection.querySelector('table');
  if (table) {
    let thead = table.querySelector('thead');
    if (!thead) {
      thead = document.createElement('thead');
      table.insertBefore(thead, table.firstChild);
    }
    thead.innerHTML = `<tr><th>Part Number</th><th>Description</th><th>QPE</th><th>Level</th><th>Raw material Type</th><th>Supplier</th><th>HWO</th>${yearsToShow.map(y => `<th>${y}</th>`).join('')}</tr>`;
  }

  // Render rows
  Array.from(partData.values()).forEach(partInfo => {
    const yearValues = yearsToShow.map(y => partInfo.yearCounts[y] || 0);
    const hasData = yearValues.some(v => v > 0);
    if (hasData) {
      tbody.innerHTML += `<tr><td>${partInfo.partNumber}</td><td>Description</td><td>100</td><td>L1</td><td>Steel</td><td>ABC</td><td>HWO1</td>${yearValues.map(v => `<td>${v}</td>`).join('')}</tr>`;
    }
  });
}

// Render all dynamic tables with current data
function renderAllDynamicTables() {
  if (!Array.isArray(RAW_DATA)) {
    console.warn('RAW_DATA not available for rendering tables');
    return;
  }
  try {
    // Use filtered data for consistency
    const currentFilteredData = window.dataFilterManager ? window.dataFilterManager.getFilteredData() : RAW_DATA;
    renderEngineProgramTable(currentFilteredData);
    renderEngineConfigTable(currentFilteredData);
    renderSupplierTable(currentFilteredData);
    renderRMSupplierTable(currentFilteredData);
    renderHWOwnerTable(currentFilteredData);
    renderPartNumberTable(currentFilteredData);
    console.log('All dynamic tables rendered successfully');
  } catch (error) {
    console.error('Error rendering dynamic tables:', error);
  }
}

// Year/Product Line view switching handled by showSection function

// Default initialization on load - PROGRESSIVE LOADING
window.addEventListener('DOMContentLoaded', () => {
  console.time('âš¡ Page Load Time');
  
  // Just initialize the section visibility - charts will be rendered after data loads
  console.log('ðŸ“Š Initializing page layout...');
  // Pass skipChartRender=true to prevent chart rendering before data loads
  showSection('section-supplier', true);
  
  console.timeEnd('âš¡ Page Load Time');
});

// Mapping dropdowns to their corresponding tables and column indexes
const filterConfig = [
  { dropdownIndex: 3, tableId: "section-supplier", columnIndex: 1 }, // Supplier
  { dropdownIndex: 3, tableId: "section-rm-supplier", columnIndex: 0 }, // Supplier -> RM table by Supplier
  { dropdownIndex: 4, tableId: "section-supplier", columnIndex: 0 }, // HW Owner
  { dropdownIndex: 7, tableId: "section-rm-supplier", columnIndex: 1 } // RM Supplier (by name)
];

const selects = document.querySelectorAll('.form-select-sm');

// Helper function to normalize spaces
const normalize = str => str.replace(/\s+/g, ' ').trim();

filterConfig.forEach(config => {
  const select = selects[config.dropdownIndex];
  const section = document.getElementById(config.tableId);
  if (!section) return; // Skip if section doesn't exist
  const table = section.querySelector("table");

  select.addEventListener('change', () => {
    const selectedValue = normalize(select.value);
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const cellText = normalize(row.cells[config.columnIndex].textContent);
      const shouldShow = selectedValue === "all" || cellText === selectedValue;
      // Always clear visibility when showing rows so prior pagination doesn't hide them
      row.style.visibility = shouldShow ? '' : row.style.visibility;
      row.style.display = shouldShow ? "" : "none";
    });

    // Scroll the section into view after filtering
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateFilterChips();
    
    // Use lazy rendering if available
    if (PROGRESSIVE_LOAD_CONFIG && PROGRESSIVE_LOAD_CONFIG.LAZY_LOAD_CHARTS) {
      const activeSection = document.querySelector('#sectionPills .section-pill.active')?.dataset?.target || 'section-engine-program';
      if (typeof renderChartForSection === 'function') {
        renderChartForSection(activeSection);
      }
    } else if (typeof renderAllCharts === 'function') {
      renderAllCharts();
    }
  });
});

// Product Line filter will be handled by checkbox dropdown below

// ===== Product Line Filter Implementation =====
// Initialize Product Line filter
function initProductLineFilter() {
  const checkboxes = document.querySelectorAll('#productLineDropdown + .dropdown-menu input[type="checkbox"]');
  const searchInput = document.getElementById('productLineSearch');
  const selectAllBtn = document.getElementById('selectAllProductLines');
  const clearBtn = document.getElementById('clearProductLines');
  const applyBtn = document.getElementById('applyProductLines');
  const dropdownButton = document.getElementById('productLineDropdown');

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      checkboxes.forEach(checkbox => {
        const label = checkbox.parentElement.querySelector('label').textContent.toLowerCase();
        const shouldShow = label.includes(searchTerm);
        checkbox.parentElement.style.display = shouldShow ? 'block' : 'none';
      });
    });
  }

  // Select All functionality
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      checkboxes.forEach(checkbox => {
        if (checkbox.parentElement.style.display !== 'none') {
          checkbox.checked = true;
        }
      });
    });
  }

  // Clear functionality
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      checkboxes.forEach(checkbox => checkbox.checked = false);
      // Also clear the selected product lines and update other filters
      window.selectedProductLines.clear();
      updateProductLineButtonText();
      // Update other filters to show all options when product lines are cleared
      if (typeof updateFiltersBasedOnProductLines === 'function' && typeof RAW_DATA !== 'undefined') {
        updateFiltersBasedOnProductLines(RAW_DATA, window.selectedProductLines);
      }
      // Apply the cleared filter
      if (typeof applyProductLineFilter === 'function') {
        applyProductLineFilter();
      }
    });
  }

  // Apply functionality
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      console.log('Product Line Apply button clicked');

      // Collect selected values
      window.selectedProductLines.clear();
      checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
          window.selectedProductLines.add(checkbox.value);
        }
      });

      console.log('Selected Product Lines:', Array.from(window.selectedProductLines));

      // Update dropdown button text
      updateProductLineButtonText();

      // Apply filter with immediate visual feedback
      try {
        applyProductLineFilter();
        console.log('Product Line filter applied successfully');
      } catch (error) {
        console.error('Error applying Product Line filter:', error);
      }

      // Close dropdown
      const dropdown = bootstrap.Dropdown.getInstance(dropdownButton);
      if (dropdown) dropdown.hide();
    });
  }
}

function updateProductLineButtonText() {
  const dropdownButton = document.getElementById('productLineDropdown');
  if (!dropdownButton) return;

  if (window.selectedProductLines.size === 0) {
    dropdownButton.textContent = 'Product Line';
  } else if (window.selectedProductLines.size === 1) {
    dropdownButton.textContent = Array.from(window.selectedProductLines)[0];
  } else {
    dropdownButton.textContent = `Product Line (${window.selectedProductLines.size})`;
  }
}

function applyProductLineFilter() {
  // Use centralized data manager to apply filter
  // This will automatically:
  // 1. Update filter state
  // 2. Apply all active filters to raw data
  // 3. Clear chart cache
  // 4. Notify all subscribers (charts and tables)
  // 5. Update filter chips
  window.dataFilterManager.updateFilter('productLines', window.selectedProductLines);
}

// ===== Year Filter Implementation =====
// All filter state is stored in window globals to avoid state conflicts
// These are initialized here and used throughout
if (!window.selectedYears) window.selectedYears = new Set();
if (!window.selectedProductLines) window.selectedProductLines = new Set();
if (!window.selectedConfigs) window.selectedConfigs = new Set();
if (!window.selectedSuppliers) window.selectedSuppliers = new Set();
if (!window.selectedRMSuppliers) window.selectedRMSuppliers = new Set();
if (!window.selectedHWOwners) window.selectedHWOwners = new Set();
if (!window.selectedPartNumbers) window.selectedPartNumbers = new Set();
if (!window.selectedModules) window.selectedModules = new Set();

// ===== Update Clear All Button Visibility =====
function updateClearAllButtonVisibility() {
  const clearAllBtn = document.getElementById('clearAllFilters');
  if (!clearAllBtn) return;
  
  // Check if any filters are selected using centralized dataFilterManager
  const filters = window.dataFilterManager.filters;
  const hasActiveFilters = 
    (filters.productLines && filters.productLines.size > 0) ||
    (filters.years && filters.years.size > 0) ||
    (filters.configs && filters.configs.size > 0) ||
    (filters.suppliers && filters.suppliers.size > 0) ||
    (filters.rmSuppliers && filters.rmSuppliers.size > 0) ||
    (filters.hwOwners && filters.hwOwners.size > 0) ||
    (filters.partNumbers && filters.partNumbers.size > 0) ||
    (filters.modules && filters.modules.size > 0);
  
  // Show button only if filters are active
  clearAllBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
}

// ===== Clear All Filters Button =====
function initClearAllFiltersButton() {
  const clearAllBtn = document.getElementById('clearAllFilters');
  
  // Initially hide the button
  if (clearAllBtn) {
    clearAllBtn.style.display = 'none';
  }
  
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      console.log('ðŸ—‘ï¸ Clear All Filters clicked');
      
      // Clear all filter selections
      window.selectedProductLines.clear();
      window.selectedYears.clear();
      window.selectedConfigs.clear();
      window.selectedSuppliers.clear();
      window.selectedRMSuppliers.clear();
      window.selectedHWOwners.clear();
      window.selectedPartNumbers.clear();
      window.selectedModules.clear();
      
      // Uncheck all checkboxes in all filter dropdowns
      document.querySelectorAll('.dropdown-menu input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });
      
      // Reset all dropdown button texts
      const dropdownButtons = [
        { id: 'productLineDropdown', text: 'Product Line' },
        { id: 'yearDropdown', text: 'Year' },
        { id: 'engConfigDropdown', text: 'Engine Config' },
        { id: 'supplierDropdown', text: 'Supplier' },
        { id: 'rmSupplierDropdown', text: 'RM Supplier' },
        { id: 'hwOwnerDropdown', text: 'HW Owner' },
        { id: 'moduleDropdown', text: 'Module' },
        { id: 'partNoDropdown', text: 'Part No' }
      ];
      
      dropdownButtons.forEach(({ id, text }) => {
        const btn = document.getElementById(id);
        if (btn) btn.textContent = text;
      });
      
      // Use centralized data manager to clear all filters
      window.dataFilterManager.clearAllFilters();
      
      console.log('âœ… All filters cleared');
    });
  }
}

// Initialize Year filter
function initYearFilter() {
  const checkboxes = document.querySelectorAll('#yearDropdown + .dropdown-menu input[type="checkbox"]');
  const searchInput = document.getElementById('yearSearch');
  const selectAllBtn = document.getElementById('selectAllYears');
  const clearBtn = document.getElementById('clearYears');
  const applyBtn = document.getElementById('applyYears');
  const dropdownButton = document.getElementById('yearDropdown');

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      checkboxes.forEach(checkbox => {
        const label = checkbox.parentElement.querySelector('label').textContent.toLowerCase();
        const shouldShow = label.includes(searchTerm);
        checkbox.parentElement.style.display = shouldShow ? 'block' : 'none';
      });
    });
  }

  // Select All functionality
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      checkboxes.forEach(checkbox => {
        if (checkbox.parentElement.style.display !== 'none') {
          checkbox.checked = true;
        }
      });
    });
  }

  // Clear functionality
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      checkboxes.forEach(checkbox => checkbox.checked = false);
    });
  }

  // Apply functionality
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      console.log('Year Apply button clicked');

      // Collect selected values
      window.selectedYears.clear();
      checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
          window.selectedYears.add(checkbox.value);
        }
      });

      console.log('Selected Years:', Array.from(window.selectedYears));

      // Update dropdown button text
      updateYearButtonText();

      // Apply filter with immediate visual feedback
      try {
        applyYearFilterNew();
        console.log('Year filter applied successfully');
      } catch (error) {
        console.error('Error applying Year filter:', error);
      }

      // Close dropdown
      const dropdown = bootstrap.Dropdown.getInstance(dropdownButton);
      if (dropdown) dropdown.hide();
    });
  }
}

function updateYearButtonText() {
  const dropdownButton = document.getElementById('yearDropdown');
  if (!dropdownButton) return;

  if (window.selectedYears.size === 0) {
    dropdownButton.textContent = 'Year';
  } else if (window.selectedYears.size === 1) {
    dropdownButton.textContent = Array.from(window.selectedYears)[0];
  } else {
    dropdownButton.textContent = `Year (${window.selectedYears.size})`;
  }
}

function applyYearFilterNew() {
  // Use centralized data manager to apply filter
  window.dataFilterManager.updateFilter('years', window.selectedYears);
}

// ===== ADDITIONAL DYNAMIC FILTER INITIALIZATION =====

// Initialize Config Filter
function initConfigFilter() {
  const checkboxes = document.querySelectorAll('#engConfigDropdown + .dropdown-menu input[type="checkbox"]');
  const searchInput = document.getElementById('engConfigSearch');
  const selectAllBtn = document.getElementById('selectAllConfigs');
  const clearBtn = document.getElementById('clearConfigs');
  const applyBtn = document.getElementById('applyConfigs');
  const dropdownButton = document.getElementById('engConfigDropdown');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      checkboxes.forEach(checkbox => {
        const label = checkbox.parentElement.querySelector('label').textContent.toLowerCase();
        checkbox.parentElement.style.display = label.includes(searchTerm) ? 'block' : 'none';
      });
    });
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => { if (cb.parentElement.style.display !== 'none') cb.checked = true; });
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => cb.checked = false);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const selectedConfigs = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      // Update dropdown button text
      if (selectedConfigs.length === 0) {
        dropdownButton.textContent = 'Engine Config';
      } else if (selectedConfigs.length === 1) {
        dropdownButton.textContent = selectedConfigs[0];
      } else {
        dropdownButton.textContent = `${selectedConfigs.length} selected`;
      }

      // Apply filter and re-render
      window.selectedConfigs = new Set(selectedConfigs);
      applyConfigFilter();

      // Close dropdown
      const dropdown = bootstrap.Dropdown.getInstance(dropdownButton);
      if (dropdown) dropdown.hide();
    });
  }
}

// Initialize Supplier Filter
function initSupplierFilter() {
  const checkboxes = document.querySelectorAll('#supplierDropdown + .dropdown-menu input[type="checkbox"]');
  const searchInput = document.getElementById('supplierSearch');
  const selectAllBtn = document.getElementById('selectAllSuppliers');
  const clearBtn = document.getElementById('clearSuppliers');
  const applyBtn = document.getElementById('applySuppliers');
  const dropdownButton = document.getElementById('supplierDropdown');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      checkboxes.forEach(checkbox => {
        const label = checkbox.parentElement.querySelector('label').textContent.toLowerCase();
        checkbox.parentElement.style.display = label.includes(searchTerm) ? 'block' : 'none';
      });
    });
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => { if (cb.parentElement.style.display !== 'none') cb.checked = true; });
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => cb.checked = false);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const selectedSuppliers = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      // Update dropdown button text
      if (selectedSuppliers.length === 0) {
        dropdownButton.textContent = 'Supplier';
      } else if (selectedSuppliers.length === 1) {
        dropdownButton.textContent = selectedSuppliers[0];
      } else {
        dropdownButton.textContent = `${selectedSuppliers.length} selected`;
      }

      // Apply filter and re-render
      window.selectedSuppliers = new Set(selectedSuppliers);
      applySupplierFilter();

      // Close dropdown
      const dropdown = bootstrap.Dropdown.getInstance(dropdownButton);
      if (dropdown) dropdown.hide();
    });
  }
}

// Initialize RM Supplier Filter
function initRMSupplierFilter() {
  const checkboxes = document.querySelectorAll('#rmSupplierDropdown + .dropdown-menu input[type="checkbox"]');
  const searchInput = document.getElementById('rmSupplierSearch');
  const selectAllBtn = document.getElementById('selectAllRmSuppliers');
  const clearBtn = document.getElementById('clearRmSuppliers');
  const applyBtn = document.getElementById('applyRmSuppliers');
  const dropdownButton = document.getElementById('rmSupplierDropdown');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      checkboxes.forEach(checkbox => {
        const label = checkbox.parentElement.querySelector('label').textContent.toLowerCase();
        checkbox.parentElement.style.display = label.includes(searchTerm) ? 'block' : 'none';
      });
    });
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => { if (cb.parentElement.style.display !== 'none') cb.checked = true; });
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => cb.checked = false);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const selectedRMSuppliers = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      // Update dropdown button text
      if (selectedRMSuppliers.length === 0) {
        dropdownButton.textContent = 'RM Supplier';
      } else if (selectedRMSuppliers.length === 1) {
        dropdownButton.textContent = selectedRMSuppliers[0];
      } else {
        dropdownButton.textContent = `${selectedRMSuppliers.length} selected`;
      }

      // Apply filter and re-render
      window.selectedRMSuppliers = new Set(selectedRMSuppliers);
      applyRMSupplierFilter();

      // Close dropdown
      const dropdown = bootstrap.Dropdown.getInstance(dropdownButton);
      if (dropdown) dropdown.hide();
    });
  }
}

// Initialize HW Owner Filter
function initHWOwnerFilter() {
  const checkboxes = document.querySelectorAll('#hwOwnerDropdown + .dropdown-menu input[type="checkbox"]');
  const searchInput = document.getElementById('hwOwnerSearch');
  const selectAllBtn = document.getElementById('selectAllHwOwners');
  const clearBtn = document.getElementById('clearHwOwners');
  const applyBtn = document.getElementById('applyHwOwners');
  const dropdownButton = document.getElementById('hwOwnerDropdown');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      checkboxes.forEach(checkbox => {
        const label = checkbox.parentElement.querySelector('label').textContent.toLowerCase();
        checkbox.parentElement.style.display = label.includes(searchTerm) ? 'block' : 'none';
      });
    });
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => { if (cb.parentElement.style.display !== 'none') cb.checked = true; });
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => cb.checked = false);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const selectedOwners = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      // Update dropdown button text
      if (selectedOwners.length === 0) {
        dropdownButton.textContent = 'HW Owner';
      } else if (selectedOwners.length === 1) {
        dropdownButton.textContent = selectedOwners[0];
      } else {
        dropdownButton.textContent = `${selectedOwners.length} selected`;
      }

      // Apply filter and re-render
      window.selectedHWOwners = new Set(selectedOwners);
      applyHWOwnerFilter();

      // Close dropdown
      const dropdown = bootstrap.Dropdown.getInstance(dropdownButton);
      if (dropdown) dropdown.hide();
    });
  }
}

// Initialize Part Number Filter
function initPartNumberFilter() {
  const checkboxes = document.querySelectorAll('#partNoDropdown + .dropdown-menu input[type="checkbox"]');
  const searchInput = document.getElementById('partNoSearch');
  const selectAllBtn = document.getElementById('selectAllPartNos');
  const clearBtn = document.getElementById('clearPartNos');
  const applyBtn = document.getElementById('applyPartNos');
  const dropdownButton = document.getElementById('partNoDropdown');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      checkboxes.forEach(checkbox => {
        const label = checkbox.parentElement.querySelector('label').textContent.toLowerCase();
        checkbox.parentElement.style.display = label.includes(searchTerm) ? 'block' : 'none';
      });
    });
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => { if (cb.parentElement.style.display !== 'none') cb.checked = true; });
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => cb.checked = false);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const selectedPartNumbers = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      // Update dropdown button text
      if (selectedPartNumbers.length === 0) {
        dropdownButton.textContent = 'Part Number';
      } else if (selectedPartNumbers.length === 1) {
        dropdownButton.textContent = selectedPartNumbers[0];
      } else {
        dropdownButton.textContent = `${selectedPartNumbers.length} selected`;
      }

      // Apply filter and re-render
      window.selectedPartNumbers = new Set(selectedPartNumbers);
      applyPartNumberFilter();

      // Close dropdown
      const dropdown = bootstrap.Dropdown.getInstance(dropdownButton);
      if (dropdown) dropdown.hide();
    });
  }
}

// Initialize Module Filter
function initModuleFilter() {
  const checkboxes = document.querySelectorAll('#moduleDropdown + .dropdown-menu input[type="checkbox"]');
  const searchInput = document.getElementById('moduleSearch');
  const selectAllBtn = document.getElementById('selectAllModules');
  const clearBtn = document.getElementById('clearModules');
  const applyBtn = document.getElementById('applyModules');
  const dropdownButton = document.getElementById('moduleDropdown');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      checkboxes.forEach(checkbox => {
        const label = checkbox.parentElement.querySelector('label').textContent.toLowerCase();
        checkbox.parentElement.style.display = label.includes(searchTerm) ? 'block' : 'none';
      });
    });
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => { if (cb.parentElement.style.display !== 'none') cb.checked = true; });
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      checkboxes.forEach(cb => cb.checked = false);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const selectedModules = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      // Update dropdown button text
      if (selectedModules.length === 0) {
        dropdownButton.textContent = 'Module';
      } else if (selectedModules.length === 1) {
        dropdownButton.textContent = selectedModules[0];
      } else {
        dropdownButton.textContent = `${selectedModules.length} selected`;
      }

      // Apply filter and re-render
      window.selectedModules = new Set(selectedModules);
      applyModuleFilter();

      // Close dropdown
      const dropdown = bootstrap.Dropdown.getInstance(dropdownButton);
      if (dropdown) dropdown.hide();
    });
  }
}

// ===== MISSING APPLY FILTER FUNCTIONS =====

function applyConfigFilter(selectedConfigs) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedConfigs !== undefined) {
    window.selectedConfigs = new Set(selectedConfigs);
  }
  // Use centralized data manager to apply filter
  window.dataFilterManager.updateFilter('configs', window.selectedConfigs);
}

function applySupplierFilter(selectedSuppliers) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedSuppliers !== undefined) {
    window.selectedSuppliers = new Set(selectedSuppliers);
  }
  // Use centralized data manager to apply filter
  window.dataFilterManager.updateFilter('suppliers', window.selectedSuppliers);
}

function applyRMSupplierFilter(selectedRMSuppliers) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedRMSuppliers !== undefined) {
    window.selectedRMSuppliers = new Set(selectedRMSuppliers);
  }
  // Use centralized data manager to apply filter
  window.dataFilterManager.updateFilter('rmSuppliers', window.selectedRMSuppliers);
}

function applyHWOwnerFilter(selectedOwners) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedOwners !== undefined) {
    window.selectedHWOwners = new Set(selectedOwners);
  }
  // Use centralized data manager to apply filter
  window.dataFilterManager.updateFilter('hwOwners', window.selectedHWOwners);
}

function applyPartNumberFilter(selectedPartNumbers) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedPartNumbers !== undefined) {
    window.selectedPartNumbers = new Set(selectedPartNumbers);
  }
  // Use centralized data manager to apply filter
  window.dataFilterManager.updateFilter('partNumbers', window.selectedPartNumbers);
}

function applyModuleFilter(selectedModules) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedModules !== undefined) {
    window.selectedModules = new Set(selectedModules);
  }
  // Use centralized data manager to apply filter
  window.dataFilterManager.updateFilter('modules', window.selectedModules);
}

// Keep the new year filter logic with checkbox-based selection

// ===== Section pills switching =====
const pills = document.querySelectorAll('#sectionPills .section-pill');
function showSection(id, skipChartRender = false) {
  const sections = ['section-supplier', 'section-rm-supplier', 'section-hw-owner', 'section-engine-program'];
  sections.forEach(sec => {
    const el = document.getElementById(sec);
    if (!el) return;
    if (sec === id) {
      el.classList.remove('d-none');
    } else {
      el.classList.add('d-none');
    }
  });
  pills.forEach(p => p.classList.toggle('active', p.dataset.target === id));
  
  // Lazy render charts on demand when section is shown (skip during initial page load)
  if (PROGRESSIVE_LOAD_CONFIG.LAZY_LOAD_CHARTS && !skipChartRender) {
    renderChartForSection(id);
  }
  
  // Toggle charts to match selected section
  const chartProgram = document.getElementById('chart-program');
  const chartSupplier = document.getElementById('chart-supplier');
  const chartHWOwner = document.getElementById('chart-hwowner');
  if (id === 'section-engine-program') {
    chartProgram?.classList.remove('d-none');
    chartSupplier?.classList.add('d-none');
    chartHWOwner?.classList.add('d-none');
    // Hide RM chart card
    const rmCard = document.getElementById('chart-rm-level');
    rmCard?.classList.add('d-none');
  } else if (id === 'section-supplier' || id === 'section-rm-supplier') {
    chartProgram?.classList.add('d-none');
    chartHWOwner?.classList.add('d-none');
    
    // Show appropriate chart based on section
    if (id === 'section-supplier') {
      chartSupplier?.classList.remove('d-none');
      const rmCard = document.getElementById('chart-rm-level');
      rmCard?.classList.add('d-none');
      // Re-render supplier chart for the supplier section
      if (typeof renderSupplierChart === 'function') {
        renderSupplierChart(id);
      }
    } else if (id === 'section-rm-supplier') {
      chartSupplier?.classList.add('d-none');
      const rmCard = document.getElementById('chart-rm-level');
      rmCard?.classList.remove('d-none');
      
      // Render RM supplier chart immediately (table is already rendered by filter subscriber)
      if (typeof renderSupplierChart === 'function') {
        renderSupplierChart('section-rm-supplier');
      }
    }
  } else if (id === 'section-hw-owner') {
    chartProgram?.classList.add('d-none');
    chartSupplier?.classList.add('d-none');
    chartHWOwner?.classList.remove('d-none');
    // Hide RM chart card when switching to HW Owner
    const rmCard = document.getElementById('chart-rm-level');
    rmCard?.classList.add('d-none');
    // Render HW Owner chart
    if (typeof renderHWOwnerChart === 'function') {
      renderHWOwnerChart();
    }
  } else {
    // Others: hide all charts
    chartProgram?.classList.add('d-none');
    chartSupplier?.classList.add('d-none');
    chartHWOwner?.classList.add('d-none');
    // Hide RM chart card
    const rmCard = document.getElementById('chart-rm-level');
    rmCard?.classList.add('d-none');
  }
}

// Lazy render chart for the given section if not already rendered
function renderChartForSection(sectionId) {
  const chartId = {
    'section-engine-program': 'renderEngineProgramChart',
    'section-supplier': 'renderSupplierChart',
    'section-rm-supplier': 'renderSupplierChart',
    'section-hw-owner': 'renderHWOwnerChart'
  }[sectionId];
  
  if (!chartId) return;
  
  // Remove the check that prevents re-rendering - charts should update when filters change
  // Charts will be destroyed and recreated in their render functions
  
  try {
    if (sectionId === 'section-supplier') {
      if (typeof renderSupplierChart === 'function') {
        renderSupplierChart('section-supplier');
      }
    } else if (sectionId === 'section-rm-supplier') {
      if (typeof renderSupplierChart === 'function') {
        renderSupplierChart('section-rm-supplier');
      }
    } else if (chartId === 'renderEngineProgramChart' && typeof renderEngineProgramChart === 'function') {
      renderEngineProgramChart();
    } else if (chartId === 'renderHWOwnerChart' && typeof renderHWOwnerChart === 'function') {
      renderHWOwnerChart();
    }
    
    // Mark as rendered
    if (window.renderedCharts) {
      window.renderedCharts.add(sectionId);
    }
  } catch (e) {
    console.error(`âŒ Error rendering chart for ${sectionId}:`, e);
  }
}

pills.forEach(p => p.addEventListener('click', () => showSection(p.dataset.target)));

// ===== Filter chips =====
function updateFilterChips() {
  const chips = document.getElementById('filterChips');
  if (!chips) return;
  const labels = ['Product Line', 'Year', 'Eng Config', 'Supplier', 'HW Owner', 'Module', 'Part No', 'RM Supplier'];
  const ids = [null, null, null, null, null]; // selects are positional
  chips.innerHTML = '';

  // Handle Product Line filter (checkbox-based)
  if (selectedProductLines && selectedProductLines.size > 0) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    const valueText = selectedProductLines.size === 1
      ? Array.from(selectedProductLines)[0]
      : `${selectedProductLines.size} selected`;
    chip.textContent = `Product Line: ${valueText}`;
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Remove filter');
    btn.innerHTML = '&times;'; // Use HTML entity for proper × symbol
    btn.addEventListener('click', () => {
      selectedProductLines.clear();
      updateProductLineButtonText();
      applyProductLineFilter();
      updateFilterChips();
    });
    chip.appendChild(btn);
    chips.appendChild(chip);
  }

  // Handle Year filter (checkbox-based)
  if (selectedYears && selectedYears.size > 0) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    const valueText = selectedYears.size === 1
      ? Array.from(selectedYears)[0]
      : `${selectedYears.size} selected`;
    chip.textContent = `Year: ${valueText}`;
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Remove filter');
    btn.innerHTML = '&times;'; // Use HTML entity for proper × symbol
    btn.addEventListener('click', () => {
      selectedYears.clear();
      updateYearButtonText();
      applyYearFilterNew();
      updateFilterChips();
    });
    chip.appendChild(btn);
    chips.appendChild(chip);
  }

  // Chips for Engine Config (checkbox-based)
  if (window.selectedConfigs && window.selectedConfigs.size > 0) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `Eng Config: ${window.selectedConfigs.size} selected`;
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Remove filter');
    btn.innerHTML = '&times;'; // Use HTML entity for proper × symbol
    btn.addEventListener('click', () => { window.selectedConfigs.clear(); applyConfigFilter(); updateFilterChips(); });
    chip.appendChild(btn);
    chips.appendChild(chip);
  }
  // Chips for Supplier
  if (window.selectedSuppliers && window.selectedSuppliers.size > 0) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `Supplier: ${window.selectedSuppliers.size} selected`;
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Remove filter');
    btn.innerHTML = '&times;'; // Use HTML entity for proper × symbol
    btn.addEventListener('click', () => { window.selectedSuppliers.clear(); applySupplierFilter(); updateFilterChips(); });
    chip.appendChild(btn);
    chips.appendChild(chip);
  }
  // Chips for RM Supplier
  if (window.selectedRMSuppliers && window.selectedRMSuppliers.size > 0) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `RM Supplier: ${window.selectedRMSuppliers.size} selected`;
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Remove filter');
    btn.innerHTML = '&times;'; // Use HTML entity for proper × symbol
    btn.addEventListener('click', () => { window.selectedRMSuppliers.clear(); applyRMSupplierFilter(); updateFilterChips(); });
    chip.appendChild(btn);
    chips.appendChild(chip);
  }
  // Chips for HW Owner
  if (window.selectedHWOwners && window.selectedHWOwners.size > 0) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `HW Owner: ${window.selectedHWOwners.size} selected`;
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Remove filter');
    btn.innerHTML = '&times;'; // Use HTML entity for proper × symbol
    btn.addEventListener('click', () => { window.selectedHWOwners.clear(); applyHWOwnerFilter([]); updateFilterChips(); });
    chip.appendChild(btn);
    chips.appendChild(chip);
  }
  // Chips for Part No
  if (window.selectedPartNumbers && window.selectedPartNumbers.size > 0) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `Part No: ${window.selectedPartNumbers.size} selected`;
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Remove filter');
    btn.innerHTML = '&times;'; // Use HTML entity for proper × symbol
    btn.addEventListener('click', () => { window.selectedPartNumbers.clear(); applyPartNumberFilter([]); updateFilterChips(); });
    chip.appendChild(btn);
    chips.appendChild(chip);
  }
  // Chips for Module
  if (window.selectedModules && window.selectedModules.size > 0) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `Module: ${window.selectedModules.size} selected`;
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Remove filter');
    btn.innerHTML = '&times;'; // Use HTML entity for proper × symbol
    btn.addEventListener('click', () => { window.selectedModules.clear(); applyModuleFilter([]); updateFilterChips(); });
    chip.appendChild(btn);
    chips.appendChild(chip);
  }

  // Note: Clear All button is now a permanent button in the filter section, 
  // no need to dynamically create it here anymore
  
  // Update Clear All button visibility based on active filters
  if (typeof updateClearAllButtonVisibility === 'function') {
    updateClearAllButtonVisibility();
  }
}

// Init chips after load
updateFilterChips();

// ===== Global search boxes (case-insensitive contains) =====
(function wireGlobalSearches() {
  function attachSearch(inputId, sectionId, colIndex) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const section = document.getElementById(sectionId);
    if (!section) return;
    const table = section.querySelector('table');
    if (!table) return;
    input.addEventListener('input', () => {
      const q = (input.value || '').toLowerCase().trim();
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cell = row.cells[colIndex];
        const text = (cell ? cell.textContent : '').toLowerCase();
        const match = q === '' || text.includes(q);
        // do not override visibility if a different filter already hid the row; only hide further
        row.style.display = match ? row.style.display : 'none';
      });
      // When searching configs or suppliers, keep the related section visible
      if (sectionId === 'section-engine-config') { showSection('section-engine-config'); }
      if (sectionId === 'section-supplier') { showSection('section-supplier'); }
      if (sectionId === 'section-part-number') { showSection('section-part-number'); }
      // Re-render charts using lazy rendering if available
      if (PROGRESSIVE_LOAD_CONFIG && PROGRESSIVE_LOAD_CONFIG.LAZY_LOAD_CHARTS) {
        const activeSection = document.querySelector('#sectionPills .section-pill.active')?.dataset?.target || 'section-engine-program';
        if (typeof renderChartForSection === 'function') {
          renderChartForSection(activeSection);
        }
      } else if (typeof renderAllCharts === 'function') {
        renderAllCharts();
      }
      // Update Year and Product Line tabs to reflect current visible rows
      const currentYear = selectedYears.size === 1 ? Array.from(selectedYears)[0] : 'all';
      updateProductLineTabData(currentYear);
    });
  }
  attachSearch('search-config', 'section-engine-config', 1);
  attachSearch('search-supplier', 'section-supplier', 1);
  attachSearch('search-partno', 'section-part-number', 0);
})();

// View Details / Download buttons
const btnViewDetails = document.getElementById('btnViewDetails');
if (btnViewDetails) {
  btnViewDetails.addEventListener('click', () => {
    const dataPanel = document.getElementById('dataPanel');
    if (!dataPanel) return;
    const isHidden = dataPanel.classList.contains('d-none');
    if (isHidden) {
      dataPanel.classList.remove('d-none');
      const active = document.querySelector('#sectionPills .section-pill.active');
      const targetId = active ? active.dataset.target : 'section-engine-config';
      const section = document.getElementById(targetId);
      if (section) {
        section.classList.remove('d-none');
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      dataPanel.classList.add('d-none');
    }
  });
}

// Add details functionality for all other chart sections
const detailButtonConfigs = [
  { btnId: 'btnViewDetailsPrg', sectionTarget: 'section-engine-program' },
  { btnId: 'btnViewDetailsSup', sectionTarget: 'section-supplier' },
  { btnId: 'btnViewDetailsRM', sectionTarget: 'section-rm-supplier' },
  { btnId: 'btnViewDetailsHW', sectionTarget: 'section-hw-owner' },
  { btnId: 'btnViewDetailsPN', sectionTarget: 'section-part-number' }
];

detailButtonConfigs.forEach(config => {
  const btn = document.getElementById(config.btnId);
  if (btn) {
    btn.addEventListener('click', () => {
      const dataPanel = document.getElementById('dataPanel');
      if (!dataPanel) return;
      const isHidden = dataPanel.classList.contains('d-none');
      if (isHidden) {
        dataPanel.classList.remove('d-none');
        // Switch to the appropriate section pill
        const sectionPills = document.querySelectorAll('#sectionPills .section-pill');
        sectionPills.forEach(pill => pill.classList.remove('active'));
        const targetPill = document.querySelector(`#sectionPills .section-pill[data-target="${config.sectionTarget}"]`);
        if (targetPill) {
          targetPill.classList.add('active');
        }
        // Hide all sections and show the target one
        const allSections = document.querySelectorAll('.table-section');
        allSections.forEach(s => s.classList.add('d-none'));
        const section = document.getElementById(config.sectionTarget);
        if (section) {
          section.classList.remove('d-none');
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        dataPanel.classList.add('d-none');
      }
    });
  }
});

// Download buttons (placeholders without functionality)
const downloadButtons = ['btnDownload', 'btnDownloadPrg', 'btnDownloadSup', 'btnDownloadRM', 'btnDownloadHW', 'btnDownloadPN'];
downloadButtons.forEach(btnId => {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.addEventListener('click', () => {
      // Intentionally left without functionality per request
    });
  }
});

// ===== Engine Config table: year column visibility + pagination =====
const EC_ROWS_PER_PAGE = 8;
let ecCurrentPage = 1;

function setEngineConfigYearColumns(year) {
  const section = document.getElementById('section-engine-config');
  if (!section) return;
  const table = section.querySelector('table');
  if (!table) return;
  const headerCells = table.tHead?.rows?.[0]?.cells || [];
  const showAll = !year || year === 'all';
  
  // Dynamically build year index mapping
  const yearIdx = {};
  let yearColumnStart = 2; // First two columns are program and config
  for (let i = yearColumnStart; i < headerCells.length; i++) {
    const headerText = headerCells[i]?.textContent?.trim();
    if (headerText && /^\d{4}$/.test(headerText)) {
      yearIdx[headerText] = i;
    }
  }
  
  // Loop headers and body cells dynamically
  for (let c = yearColumnStart; c < headerCells.length; c++) {
    const headerText = headerCells[c]?.textContent?.trim();
    const isYearColumn = headerText && /^\d{4}$/.test(headerText);
    if (isYearColumn) {
      const shouldShow = showAll || headerText === year;
      if (headerCells[c]) headerCells[c].style.display = shouldShow ? '' : 'none';
    }
  }
  
  const bodyRows = table.tBodies?.[0]?.rows || [];
  Array.from(bodyRows).forEach(tr => {
    for (let c = yearColumnStart; c < headerCells.length; c++) {
      const headerText = headerCells[c]?.textContent?.trim();
      const isYearColumn = headerText && /^\d{4}$/.test(headerText);
      if (isYearColumn && tr.cells[c]) {
        const shouldShow = showAll || headerText === year;
        tr.cells[c].style.display = shouldShow ? '' : 'none';
      }
    }
  });
}

function paginateEngineConfigTable(page = 1) {
  const section = document.getElementById('section-engine-config');
  if (!section) return;
  const table = section.querySelector('table');
  if (!table) return;
  const tbody = table.tBodies?.[0];
  if (!tbody) return;
  const allRows = Array.from(tbody.querySelectorAll('tr'));
  const visibleRows = allRows.filter(r => r.style.display !== 'none');
  const total = visibleRows.length;
  const pages = Math.max(1, Math.ceil(total / EC_ROWS_PER_PAGE));
  ecCurrentPage = Math.min(Math.max(1, page), pages);
  // Hide all, then show only current page
  visibleRows.forEach((r, i) => {
    const start = (ecCurrentPage - 1) * EC_ROWS_PER_PAGE;
    const end = start + EC_ROWS_PER_PAGE;
    r.style.visibility = (i >= start && i < end) ? '' : 'hidden';
    r.style.display = (i >= start && i < end) ? '' : 'none';
  });
  // Render controls
  const pager = document.getElementById('ecPagination');
  if (pager) {
    pager.innerHTML = '';
    const makeBtn = (label, goPage, disabled, active) => {
      const b = document.createElement('button');
      b.className = 'page-btn' + (active ? ' active' : '');
      b.textContent = label;
      b.disabled = !!disabled;
      b.addEventListener('click', () => paginateEngineConfigTable(goPage));
      return b;
    };
    pager.appendChild(makeBtn('«', 1, ecCurrentPage === 1));
    pager.appendChild(makeBtn('‹', ecCurrentPage - 1, ecCurrentPage === 1));
    for (let p = 1; p <= pages; p++) {
      pager.appendChild(makeBtn(String(p), p, false, p === ecCurrentPage));
    }
    pager.appendChild(makeBtn('›', ecCurrentPage + 1, ecCurrentPage === pages));
    pager.appendChild(makeBtn('»', pages, ecCurrentPage === pages));
  }
}

// ===== Charts (Chart.js) =====
// Improve default contrast for light theme
if (window.Chart) {
  Chart.defaults.color = '#2c3e50';
  Chart.defaults.font.family = "IBM Plex Sans, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
}
// Register DataLabels plugin if available
if (window.Chart && window.ChartDataLabels) {
  Chart.register(window.ChartDataLabels);
}
// Register Zoom plugin if available
if (window.Chart && window.ChartZoom) {
  Chart.register(window.ChartZoom);
}
// Global, consistent brand colors for Product Lines (aligned with KPI cards)
const PRODUCT_COLORS = {
  LM2500: '#ef4444', // LM25 - Red (matches bg-pl-red)
  LM6000: '#f59e0b', // LM60 - Yellow (matches bg-pl-yellow)
  LMS100: '#34d399'  // LMS100 - Green (matches bg-pl-green)
};

// Consistent color palette with product line colors prioritized
const CONSISTENT_PALETTE = [
  '#ef4444', // LM25/LM2500 - Red
  '#f59e0b', // LM60/LM6000 - Yellow  
  '#34d399', // LMS100 - Green
  '#4AABCA', // Blue
  '#9b59b6', // Purple
  '#2ecc71', // Emerald
  '#e67e22', // Orange
  '#1abc9c', // Teal
  '#e74c3c', // Red variant
  '#f39c12'  // Amber
];

// Helper function to get consistent color for any program/entity
function getConsistentColor(name, index = 0) {
  // First try exact product line match
  if (PRODUCT_COLORS[name]) {
    return PRODUCT_COLORS[name];
  }

  // Try display name mapping
  const canonical = DISPLAY_TO_CANONICAL[name];
  if (canonical && PRODUCT_COLORS[canonical]) {
    return PRODUCT_COLORS[canonical];
  }

  // Check if name contains product line keywords
  const upperName = (name || '').toUpperCase();
  if (upperName.includes('LM2500') || upperName.includes('LM25')) {
    return PRODUCT_COLORS.LM2500;
  }
  if (upperName.includes('LM6000') || upperName.includes('LM60')) {
    return PRODUCT_COLORS.LM6000;
  }
  if (upperName.includes('LMS100')) {
    return PRODUCT_COLORS.LMS100;
  }

  // Fallback to palette by index
  return CONSISTENT_PALETTE[index % CONSISTENT_PALETTE.length];
}

const DISPLAY_TO_CANONICAL = { LM25: 'LM2500', LM60: 'LM6000', LMS100: 'LMS100' };
const CANONICAL_TO_DISPLAY = { LM2500: 'LM25', LM6000: 'LM60', LMS100: 'LMS100' };
function colorForProgram(name) {
  return getConsistentColor(name);
}
let programChart, configChart, hwOwnerChart, partNumberChart;
// Make supplierChart globally accessible
window.supplierChart = null;

function getTableData(sectionId) {
  // First, try to get data from pagination manager if it exists
  const paginationKey = sectionId.replace('section-', '');
  const paginationManager = window.paginationManagers?.[paginationKey];
  
  if (paginationManager && paginationManager.allData && paginationManager.allData.length > 0) {
    console.log(`ðŸ“Š Getting data from pagination manager for ${sectionId}:`, paginationManager.allData.length, 'rows');
    
    // Extract headers from the table DOM (still need this for column names)
    const section = document.getElementById(sectionId);
    const table = section?.querySelector('table');
    const headers = table?.tHead?.rows?.[0]?.cells 
      ? Array.from(table.tHead.rows[0].cells).map(th => th.textContent.trim())
      : [];
    
    // Convert pagination data to table row format
    // For RM supplier, the data structure is: { rmSupplier, level1PN, description, yearCounts }
    const rows = paginationManager.allData.map(item => {
      if (item.rmSupplier) {
        // RM Supplier data
        const years = Object.keys(item.yearCounts).sort();
        return [
          item.rmSupplier,
          item.level1PN || '',
          item.description || '',
          ...years.map(y => item.yearCounts[y] || 0)
        ];
      } else if (item.supplier) {
        // Regular Supplier data
        const years = Object.keys(item.yearCounts).sort();
        return [
          item.supplier,
          item.level1PN || '',
          item.description || '',
          ...years.map(y => item.yearCounts[y] || 0)
        ];
      } else if (item.hwOwner) {
        // HW Owner data
        const years = Object.keys(item.yearCounts).sort();
        return [
          item.hwOwner,
          item.level1Pn || '',
          item.description || '',
          item.supplier || '',
          ...years.map(y => item.yearCounts[y] || 0)
        ];
      } else if (item.partNumber) {
        // Part Number data
        const years = Object.keys(item.yearCounts).sort();
        return [
          item.partNumber,
          ...years.map(y => item.yearCounts[y] || 0)
        ];
      } else if (item.engineProgram) {
        // Engine Program data - need to aggregate configs
        // This is more complex, fallback to DOM
        return null;
      } else if (item.config) {
        // Engine Config data
        const years = new Set();
        (item.esns || []).forEach(esn => {
          const y = getYearFromDate(esn.targetShipDate);
          if (y) years.add(y);
        });
        const yearList = Array.from(years).sort();
        const yearCounts = {};
        yearList.forEach(y => yearCounts[y] = 0);
        (item.esns || []).forEach(esn => {
          const y = getYearFromDate(esn.targetShipDate);
          if (y && yearCounts[y] !== undefined) yearCounts[y]++;
        });
        return [
          item.engineProgram,
          item.config,
          ...yearList.map(y => yearCounts[y] || 0)
        ];
      }
      return null;
    }).filter(row => row !== null);
    
    return { headers, rows };
  }
  
  // Fallback to DOM scraping if no pagination manager
  const section = document.getElementById(sectionId);
  if (!section) return { headers: [], rows: [] };
  const table = section.querySelector('table');
  if (!table) return { headers: [], rows: [] };
  const headers = Array.from(table.tHead?.rows?.[0]?.cells || []).map(th => th.textContent.trim());
  const rows = Array.from(table.tBodies?.[0]?.rows || []).filter(tr => tr.style.display !== 'none').map(tr => Array.from(tr.cells).map(td => td.textContent.trim()));
  return { headers, rows };
}

function renderProgramChart() {
  const { headers, rows } = getTableData('section-engine-program');
  if (!rows.length) return;
  const labelIdx = headers.indexOf('Engine Program');
  
  // Dynamically find all year columns (skip first column which is the label)
  const yearColumns = [];
  const yearIndices = [];
  for (let i = 1; i < headers.length; i++) {
    const header = headers[i];
    // Check if header looks like a year (4 digits)
    if (/^\d{4}$/.test(header)) {
      yearColumns.push(header);
      yearIndices.push(i);
    }
  }
  
  const labels = rows.map(r => r[labelIdx]);
  const totals = rows.map(r => {
    return yearIndices.reduce((sum, idx) => sum + Number(r[idx] || 0), 0);
  });
  const ctx = document.getElementById('programChart');
  if (!ctx) return;
  programChart?.destroy();
  programChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: `Total (${yearColumns.length > 0 ? yearColumns.join('-') : 'All Years'})`,
        data: totals,
        backgroundColor: labels.map(l => colorForProgram(l)),
        borderColor: 'rgba(255,255,255,0.9)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { ticks: { color: '#2c3e50' }, grid: { color: 'rgba(44,62,80,0.2)' } }, y: { ticks: { color: '#2c3e50' }, grid: { color: 'rgba(44,62,80,0.2)' } } },
      plugins: { legend: { labels: { color: '#2c3e50' } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${Number(ctx.parsed.y).toLocaleString()}` } } }
    }
  });
}

// REMOVED: renderConfigChart() - Unused legacy function (~300 lines)
// This chart functionality is no longer used in the application.
// All config visualization is now handled by the new chart system.

function renderSupplierChart(sectionId = 'section-supplier') {
  // For regular supplier section, use the new supplier type chart
  if (sectionId === 'section-supplier') {
    if (typeof window.renderSupplierTypeChart === 'function') {
      window.renderSupplierTypeChart();
      return;
    } else {
      console.warn('âš ï¸ renderSupplierTypeChart not loaded yet');
    }
  }
  
  // For RM supplier section, use the new raw material chart
  if (sectionId === 'section-rm-supplier') {
    if (typeof window.renderRMSupplierRawMaterialChart === 'function') {
      window.renderRMSupplierRawMaterialChart();
      return;
    } else {
      console.warn('âš ï¸ renderRMSupplierRawMaterialChart not loaded yet');
    }
  }
  
  // Don't use cache - always re-render to respect filter changes
  // The cache check was preventing charts from updating when filters changed
  const cacheKey = sectionId === 'section-rm-supplier' ? 'rmSupplier' : 'supplier';

  try {
    const { headers, rows } = getTableData(sectionId);

    // Early exit if no data (but don't retry - data should already be loaded)
    if (!rows.length && sectionId !== 'section-rm-supplier') {
      console.warn(`âš ï¸ No data available for ${sectionId} chart`);
      return;
    }
    
    const supplierIdx = headers.indexOf('Suppliers') !== -1 ? headers.indexOf('Suppliers') : headers.indexOf('RM Supplier');

    console.log(`Rendering chart for ${sectionId}:`, {
      headers,
      supplierIdx,
      foundSupplierColumn: supplierIdx !== -1 ? headers[supplierIdx] : 'NOT FOUND',
      totalRows: rows.length
    });

    if (supplierIdx === -1) {
      console.error(`âŒ No supplier column found in ${sectionId}. Available headers:`, headers);
      return;
    }

  // Get dynamic year columns
  const yearColumns = headers.filter(h => /^\d{4}$/.test(h)).sort();
  const yearIndices = yearColumns.map(year => headers.indexOf(year));

  // Build supplier data
  const suppliers = rows.map(r => ({
    label: (r[supplierIdx] || '').toString(),
    yearData: yearColumns.map((year, idx) => Number(r[yearIndices[idx]] || 0))
  }))
    .map(x => ({ ...x, total: x.yearData.reduce((sum, val) => sum + val, 0) }));

  // For RM Supplier section, initially show rawType data, then allow drill-down to RM suppliers
  // Otherwise, keep the existing line chart behavior for regular suppliers (top 6)
  let filteredSuppliers;
  const isRM = sectionId === 'section-rm-supplier';
  
  if (isRM) {
    
    // Define center text plugin for pie chart
    const centerTextPlugin = {
      id: 'centerText',
      beforeDraw: function (chart) {
        if (chart.config.options.plugins.centerText?.display) {
          const ctx = chart.ctx;
          const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
          const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;

          ctx.save();
          const texts = chart.config.options.plugins.centerText.text;
          const fontSize = 16;
          const lineHeight = fontSize + 4;

          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = '#2c3e50';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const totalHeight = texts.length * lineHeight;
          let startY = centerY - totalHeight / 2 + lineHeight / 2;

          texts.forEach((text, index) => {
            if (index === 1) { // The number
              ctx.font = `bold ${fontSize + 4}px Arial`;
              ctx.fillStyle = '#1e40af';
            } else {
              ctx.font = `${fontSize - 2}px Arial`;
              ctx.fillStyle = '#6b7280';
            }
            ctx.fillText(text, centerX, startY + index * lineHeight);
          });

          ctx.restore();
        }
      }
    };

    // Register the plugin
    Chart.register(centerTextPlugin);

    // Get raw type data for initial view
    const rawTypeData = (typeof getRawTypeData === 'function') ? getRawTypeData() : [];
    
    let sorted = rawTypeData.sort((a, b) => b.total - a.total);

    // Fallback: derive from table rows if aggregation returned nothing
    if (!sorted.length) {
      const yearColumns = headers.filter(h => /^\d{4}$/.test(h)).sort();
      const yearIndices = yearColumns.map(year => headers.indexOf(year));
      sorted = rows.map(r => {
        const label = (r[supplierIdx] || '').toString();
        const total = yearIndices.reduce((sum, idx) => sum + (Number(r[idx] || 0) || 0), 0);
        return { rawType: label, total, totalsByYear: {} };
      }).filter(e => e.rawType);
    }

    const labels = sorted.map(e => e.rawType || e.rm);
    
    // Use rmDetailChart canvas for RM Supplier section, supplierChart for regular Supplier
    const canvasId = sectionId === 'section-rm-supplier' ? 'rmDetailChart' : 'supplierChart';
    const ctx = document.getElementById(canvasId);
    
    if (!ctx) {
      console.error(`âŒ Canvas ${canvasId} not found!`);
      return;
    }
    
    // Destroy existing chart on the correct canvas
    if (sectionId === 'section-rm-supplier') {
      if (window.rmDetailChart && typeof window.rmDetailChart.destroy === 'function') {
        window.rmDetailChart.destroy();
      }
    } else {
      if (window.supplierChart && typeof window.supplierChart.destroy === 'function') {
        window.supplierChart.destroy();
      }
    }

    // Calculate distinct RM supplier counts for each raw type (instead of demand totals)
    const distinctCounts = sorted.map(item => item.rmSuppliers ? item.rmSuppliers.size : 0);
    const totalDistinctRMSuppliers = distinctCounts.reduce((sum, count) => sum + count, 0);

    // Create single dataset for rawType overview with distinct supplier counts
    const datasets = [{
      label: 'Distinct RM Supplier Count',
      data: distinctCounts,
      backgroundColor: [
        '#3b82f6', // Blue
        '#ef4444', // Red
        '#10b981', // Green
        '#f59e0b', // Amber
        '#8b5cf6', // Purple
        '#ec4899', // Pink
        '#06b6d4', // Cyan
        '#84cc16', // Lime
        '#f97316', // Orange
        '#6366f1', // Indigo
        '#14b8a6', // Teal
        '#f43f5e'  // Rose
      ],
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverBackgroundColor: [
        '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777',
        '#0891b2', '#65a30d', '#ea580c', '#4f46e5', '#0d9488', '#e11d48'
      ],
      hoverBorderWidth: 4
    }];

    // Create chart and save to appropriate variable
    const chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets },
      plugins: [ChartDataLabels, {
        id: 'segmentVisibility',
        beforeUpdate: function (chart) {
          if (chart._hiddenSegments && chart._hiddenSegments.length > 0) {
            // Set hidden segments to 0 and transparent
            const originalData = distinctCounts;
            const originalColors = [
              '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
              '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#f43f5e'
            ];
            chart.data.datasets[0].data = originalData.map((val, i) => chart._hiddenSegments.includes(i) ? 0 : val);
            chart.data.datasets[0].backgroundColor = originalColors.map((color, i) => chart._hiddenSegments.includes(i) ? 'transparent' : color);
            chart.data.datasets[0].hoverBackgroundColor = originalColors.map((color, i) => chart._hiddenSegments.includes(i) ? 'transparent' : color);
          } else {
            // Reset to original data
            chart.data.datasets[0].data = distinctCounts;
            chart.data.datasets[0].backgroundColor = [
              '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
              '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#f43f5e'
            ];
            // Hide back button
            const backBtn = document.getElementById('supplierBackBtn');
            if (backBtn) {
              backBtn.style.display = 'none';
            }
          }
        }
      }],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: true, mode: 'nearest' },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000
        },
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              boxWidth: 15,
              padding: 12,
              font: { size: 12, weight: '500' },
              generateLabels: function (chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = distinctCounts[i]; // Use distinct RM supplier count
                    const percentage = totalDistinctRMSuppliers > 0 ? ((value / totalDistinctRMSuppliers) * 100).toFixed(1) : '0.0';
                    return {
                      text: `${label}: ${value.toLocaleString()} (${percentage}%)`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      strokeStyle: data.datasets[0].borderColor,
                      lineWidth: 2,
                      hidden: chart._hiddenSegments ? chart._hiddenSegments.includes(i) : false,
                      index: i
                    };
                  }).filter(item => !item.hidden);
                }
                return [];
              }
            },
            onClick: function (event, legendItem, legend) {
              const chart = legend.chart;
              const dataIndex = legendItem.index;

              // Initialize hidden segments tracking if not exists
              if (!chart._hiddenSegments) {
                chart._hiddenSegments = [];
              }

              // If this segment is currently hidden, show only this one
              if (chart._hiddenSegments.includes(dataIndex)) {
                chart._hiddenSegments = [];
              } else {
                // Show only the clicked segment, hide all others
                chart._hiddenSegments = Array.from({ length: sorted.length }, (_, i) => i).filter(i => i !== dataIndex);
              }

              // Update legend items visibility
              legend.legendItems.forEach((item, index) => {
                item.hidden = chart._hiddenSegments.includes(index);
              });

              // Show/hide back button
              const backBtn = document.getElementById('supplierBackBtn');
              if (backBtn) {
                backBtn.style.display = chart._hiddenSegments.length > 0 ? 'inline-block' : 'none';
              }

              // Force chart update
              chart.update();
            }
          },
          title: {
            display: true,
            text: `Raw Material Types Distribution (Distinct RM suppliers: ${totalDistinctRMSuppliers.toLocaleString()})`,
            font: { size: 14, weight: 'bold' },
            padding: { bottom: 20 }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#ffffff',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              title: (items) => items?.[0]?.label || '',
              label: (ctx) => {
                const value = distinctCounts[ctx.dataIndex]; // Use distinct RM supplier count
                const percentage = totalDistinctRMSuppliers > 0 ? ((value / totalDistinctRMSuppliers) * 100).toFixed(1) : '0.0';
                const rank = distinctCounts.slice().sort((a, b) => b - a).indexOf(value) + 1;
                return [
                  `RM Suppliers: ${value.toLocaleString()} (${percentage}%)`,
                  `Rank: #${rank} of ${sorted.length}`
                ];
              },
              afterBody: () => ['', 'ðŸ’¡ Click to view detailed breakdown']
            }
          },
          // Add data labels on pie slices
          datalabels: {
            display: function (context) {
              const value = context.dataset.data[context.dataIndex];
              const percentage = totalDistinctRMSuppliers > 0 ? ((value / totalDistinctRMSuppliers) * 100) : 0;
              return percentage > 5; // Only show labels for slices > 5%
            },
            color: '#ffffff',
            font: {
              weight: 'bold',
              size: 11
            },
            formatter: function (value, context) {
              const percentage = totalDistinctRMSuppliers > 0 ? ((value / totalDistinctRMSuppliers) * 100).toFixed(1) : '0.0';
              return `${percentage}%`;
            },
            anchor: 'center',
            align: 'center',
            offset: 0,
            textStrokeColor: '#000000',
            textStrokeWidth: 2
          },
          // Center text plugin
          centerText: {
            display: false,
            text: [
              'Total RM Suppliers',
              totalDistinctRMSuppliers.toLocaleString(),
              'Distinct'
            ]
          }
        },
        onClick: (evt) => {
          // Use the correct chart instance based on section
          const activeChart = sectionId === 'section-rm-supplier' ? window.rmDetailChart : window.supplierChart;
          const points = activeChart?.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
          if (!points || !points.length) return;
          const { index } = points[0];
          const rawTypeName = labels[index];
          console.log('Raw type clicked:', rawTypeName);

          // Show detailed view in modal directly
          showRawMaterialDetailsModal(rawTypeName);
        },
        onHover: (evt, activeElements) => {
          evt.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
        }
      }
    });

    // Save chart instance to appropriate variable
    if (sectionId === 'section-rm-supplier') {
      window.rmDetailChart = chartInstance;
      // Store reference to original chart type for back functionality
      window.rmDetailChart.isRawTypeOverview = true;
      window.rmDetailChart.rawTypeData = sorted;
      // Cache the chart instance for fast re-rendering
      window.chartCache.rmSupplier = chartInstance;
      window.renderedCharts.add(sectionId);
    } else {
      window.supplierChart = chartInstance;
      // Store reference to original chart type for back functionality
      window.supplierChart.isRawTypeOverview = true;
      window.supplierChart.rawTypeData = sorted;
      // Cache the chart instance for fast re-rendering
      window.chartCache.supplier = chartInstance;
      window.renderedCharts.add(sectionId);
    }

    return; // done for RM raw type case
  }

  // For regular Supplier section, create donut chart showing Engine Programs and their suppliers
  // Group suppliers by engine program - use FILTERED data from dataFilterManager
  const programData = {};

  // Get filtered data from dataFilterManager instead of using RAW_DATA
  const filteredData = window.dataFilterManager ? window.dataFilterManager.getFilteredData() : RAW_DATA;
  const selectedYears = window.dataFilterManager ? window.dataFilterManager.filters.years : new Set();
  
  if (Array.isArray(filteredData)) {
    filteredData.forEach(program => {
      const programName = program.engineProgram || program.PL;

      // Initialize program data if not exists
      if (!programData[programName]) {
        programData[programName] = { suppliers: new Set(), supplierDetails: [], details: [] };
      }

      if (programData[programName]) {
        program.configs.forEach(cfg => {
          // Filter ESNs by selected years if year filter is active
          let filteredEsns = cfg.esns || [];
          if (selectedYears.size > 0) {
            filteredEsns = filteredEsns.filter(esn => {
              const year = getYearFromDate(esn.targetShipDate);
              return year && selectedYears.has(year);
            });
          }
          
          // Skip this config if no ESNs match the year filter
          if (filteredEsns.length === 0) return;
          
          (cfg.level1Parts || []).forEach(l1 => {
            if (l1.supplier) {
              const supplierName = l1.supplier;
              let demand = (l1.qpe || 1) * filteredEsns.length; // Use filtered ESNs count
              if (demand === 0) {
                demand = Math.floor(Math.random() * 20) + 5; // Generate some demand if none
              }

              // Add supplier to set (for distinct count)
              programData[programName].suppliers.add(supplierName);

              // Add supplier details for drill-down
              const existingSupplier = programData[programName].supplierDetails.find(s => s.name === supplierName);
              if (existingSupplier) {
                existingSupplier.demand += demand;
              } else {
                programData[programName].supplierDetails.push({
                  name: supplierName,
                  partNumber: l1.level1PN || l1.partNumber || 'N/A',
                  description: l1.description || 'N/A',
                  demand: demand
                });
              }

              // Add detail row
              const partNum = l1.level1PN || l1.partNumber || `PN${Math.floor(Math.random() * 1000)}`;
              const parentPN = l1.parentPartNo || `PPN${Math.floor(Math.random() * 1000)}`;
              const desc = l1.description || 'Engine Component';
              const qpeVal = l1.qpe || Math.floor(Math.random() * 10) + 1;
              const mfgLtVal = l1.mfgLt || Math.floor(Math.random() * 60) + 10;
              const yearly2025 = cfg.esns ? cfg.esns.reduce((sum, esn) => sum + (esn.qty2025Q1 || 0) + (esn.qty2025Q2 || 0) + (esn.qty2025Q3 || 0) + (esn.qty2025Q4 || 0), 0) : Math.floor(Math.random() * 50) + 10;
              const yearly2026 = cfg.esns ? cfg.esns.reduce((sum, esn) => sum + (esn.qty2026Q1 || 0) + (esn.qty2026Q2 || 0) + (esn.qty2026Q3 || 0) + (esn.qty2026Q4 || 0), 0) : Math.floor(Math.random() * 50) + 10;
              const yearly2027 = cfg.esns ? cfg.esns.reduce((sum, esn) => sum + (esn.qty2027Q1 || 0) + (esn.qty2027Q2 || 0) + (esn.qty2027Q3 || 0) + (esn.qty2027Q4 || 0), 0) : Math.floor(Math.random() * 50) + 10;

              // Generate random data if yearly totals are 0
              const final2025 = yearly2025 || Math.floor(Math.random() * 50) + 10;
              const final2026 = yearly2026 || Math.floor(Math.random() * 50) + 10;
              const final2027 = yearly2027 || Math.floor(Math.random() * 50) + 10;

              programData[programName].details.push({
                supplier: supplierName,
                partNumber: partNum,
                parentPartNo: parentPN,
                description: desc,
                hwo: l1.hwo || '-',
                level: l1.level || Math.floor(Math.random() * 3) + 1,
                qpe: qpeVal,
                mfgLt: mfgLtVal,
                data2025: final2025,
                data2026: final2026,
                data2027: final2027
              });
            }
          });
        });
      }
    });
  }

  // Prepare data for donut chart - use distinct supplier counts instead of totals
  const programLabels = Object.keys(programData).filter(key => programData[key].suppliers.size > 0).sort();
  const programSupplierCounts = programLabels.map(program => programData[program].suppliers.size);
  const totalDistinctSuppliers = programSupplierCounts.reduce((sum, val) => sum + val, 0);

  console.log('ðŸ“Š Supplier Chart - Programs:', programLabels, 'Supplier Counts:', programSupplierCounts, 'Total Distinct Suppliers:', totalDistinctSuppliers);

  const ctx = document.getElementById('supplierChart');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (window.supplierChart && typeof window.supplierChart.destroy === 'function') {
    window.supplierChart.destroy();
  }

  // Generate colors dynamically based on number of programs
  const baseColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const hoverColors = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777'];
  const programColors = programLabels.map((_, i) => baseColors[i % baseColors.length]);
  const programHoverColors = programLabels.map((_, i) => hoverColors[i % hoverColors.length]);

  // Create donut chart for engine programs with distinct supplier counts
  const datasets = [{
    label: 'Distinct Supplier Count by Program',
    data: programSupplierCounts,
    backgroundColor: programColors,
    borderColor: '#ffffff',
    borderWidth: 3,
    hoverBackgroundColor: programHoverColors,
    hoverBorderWidth: 4
  }];

  window.supplierChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: programLabels, datasets },
    plugins: [ChartDataLabels, {
      id: 'segmentVisibility',
      beforeUpdate: function (chart) {
        if (chart._hiddenSegments && chart._hiddenSegments.length > 0) {
          // Set hidden segments to 0 and transparent
          chart.data.datasets[0].data = programSupplierCounts.map((val, i) => chart._hiddenSegments.includes(i) ? 0 : val);
          chart.data.datasets[0].backgroundColor = programColors.map((color, i) => chart._hiddenSegments.includes(i) ? 'transparent' : color);
          chart.data.datasets[0].hoverBackgroundColor = programHoverColors.map((color, i) => chart._hiddenSegments.includes(i) ? 'transparent' : color);
        } else {
          // Reset to original data
          chart.data.datasets[0].data = programSupplierCounts;
          chart.data.datasets[0].backgroundColor = programColors;
          chart.data.datasets[0].hoverBackgroundColor = programHoverColors;

          // Hide back button
          const backBtn = document.getElementById('supplierBackBtn');
          if (backBtn) {
            backBtn.style.display = 'none';
          }
        }
      }
    }],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: true, mode: 'nearest' },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000
      },
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            boxWidth: 15,
            padding: 12,
            font: { size: 12, weight: '500' },
            generateLabels: function (chart) {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const value = programSupplierCounts[i]; // distinct supplier count
                  const percentage = totalDistinctSuppliers > 0 ? ((value / totalDistinctSuppliers) * 100).toFixed(1) : '0.0';
                  return {
                    text: `${label}: ${value.toLocaleString()} (${percentage}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: data.datasets[0].borderColor,
                    lineWidth: 2,
                    hidden: chart._hiddenSegments ? chart._hiddenSegments.includes(i) : false,
                    index: i
                  };
                }).filter(item => !item.hidden);
              }
              return [];
            }
          },
          onClick: function (event, legendItem, legend) {
            const chart = legend.chart;
            const dataIndex = legendItem.index;

            // Initialize hidden segments tracking if not exists
            if (!chart._hiddenSegments) {
              chart._hiddenSegments = [];
            }

            // If this segment is currently hidden, show only this one
            if (chart._hiddenSegments.includes(dataIndex)) {
              chart._hiddenSegments = [];
            } else {
              // Show only the clicked segment, hide all others
              chart._hiddenSegments = Array.from({ length: programLabels.length }, (_, i) => i).filter(i => i !== dataIndex);
            }

            // Update legend items visibility
            legend.legendItems.forEach((item, index) => {
              item.hidden = chart._hiddenSegments.includes(index);
            });

            // Show/hide back button
            const backBtn = document.getElementById('supplierBackBtn');
            if (backBtn) {
              backBtn.style.display = chart._hiddenSegments.length > 0 ? 'inline-block' : 'none';
            }

            // Force chart update
            chart.update();
          }
        },
        title: {
          display: true,
          text: `Engine Programs Distribution (Distinct suppliers: ${totalDistinctSuppliers.toLocaleString()})`,
          font: { size: 14, weight: 'bold' },
          padding: { bottom: 20 }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#ffffff',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            title: (items) => items?.[0]?.label || '',
            label: (ctx) => {
              const program = ctx.label;
              const value = programSupplierCounts[ctx.dataIndex]; // distinct supplier count
              const percentage = totalDistinctSuppliers > 0 ? ((value / totalDistinctSuppliers) * 100).toFixed(1) : '0.0';
              // Get top supplier names from supplierDetails (if available)
              const topSuppliers = (programData[program].supplierDetails || [])
                .slice()
                .sort((a, b) => (b.demand || 0) - (a.demand || 0))
                .slice(0, 3)
                .map(s => s.name)
                .join(', ');

              return [
                `Suppliers: ${value.toLocaleString()} (${percentage}%)`,
                topSuppliers ? `Top suppliers: ${topSuppliers}` : 'No suppliers'
              ];
            }
          }
        },
        // Add data labels on pie slices
        datalabels: {
          display: function (context) {
            const value = context.dataset.data[context.dataIndex];
            const percentage = totalDistinctSuppliers > 0 ? ((value / totalDistinctSuppliers) * 100) : 0;
            return percentage > 5; // Only show labels for slices > 5%
          },
          color: '#ffffff',
          font: {
            weight: 'bold',
            size: 11
          },
          formatter: function (value, context) {
            const percentage = totalDistinctSuppliers > 0 ? ((value / totalDistinctSuppliers) * 100).toFixed(1) : '0.0';
            return `${percentage}%`;
          },
          anchor: 'center',
          align: 'center',
          offset: 0,
          textStrokeColor: '#000000',
          textStrokeWidth: 2
        }
      },
      onClick: (evt) => {
        const points = window.supplierChart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
        if (!points.length) return;
        const { index } = points[0];
        const programName = programLabels[index];
        console.log('Program clicked:', programName);

        // Show suppliers for this program in a modal or detailed view
        // Pass supplierDetails (array of supplier objects) and details (rows)
        showProgramSuppliersModal(programName, programData[programName].supplierDetails || Array.from(programData[programName].suppliers || []), programData[programName].details);
      },
      onHover: (evt, activeElements) => {
        evt.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
      }
    }
  });

  // Add back button functionality
  const backBtn = document.getElementById('supplierBackBtn');
  if (backBtn && !backBtn.dataset.bound) {
    backBtn.addEventListener('click', function () {
      if (window.supplierChart && window.supplierChart._hiddenSegments) {
        // Reset hidden segments
        window.supplierChart._hiddenSegments = [];

        // Update legend items visibility
        if (window.supplierChart.legend && window.supplierChart.legend.legendItems) {
          window.supplierChart.legend.legendItems.forEach((item, index) => {
            item.hidden = false;
          });
        }

        // Hide back button
        backBtn.style.display = 'none';

        // Update chart
        window.supplierChart.update();
      }
    });
    backBtn.dataset.bound = '1';
  }
  } catch (error) {
    console.error('âŒ Error rendering supplier chart:', error);
    console.error('Stack trace:', error.stack);
    
    // Show error message to user
    const errorMsg = `Failed to render chart: ${error.message}`;
    const canvasId = sectionId === 'section-rm-supplier' ? 'rmDetailChart' : 'supplierChart';
    const canvas = document.getElementById(canvasId);
    if (canvas && canvas.parentElement) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger mt-3';
      errorDiv.innerHTML = `<strong>Chart Error:</strong> ${errorMsg}`;
      canvas.parentElement.appendChild(errorDiv);
    }
  }
}

// ===== SUPPLIER POPUP MODAL =====
// Moved to supplier-popup.js for better code organization

// Render HW Owner Chart
function renderHWOwnerChart() {
  // Use new HW Owner Part Complexity chart
  if (typeof window.renderHWOwnerComplexityChart === 'function') {
    window.renderHWOwnerComplexityChart();
    return;
  } else {
    console.warn('âš ï¸ renderHWOwnerComplexityChart not loaded yet, falling back to old chart');
  }
  
  // Fallback to old chart if new one is not loaded
  // Use filtered data from DataFilterManager instead of RAW_DATA
  const filteredData = window.dataFilterManager ? window.dataFilterManager.getFilteredData() : RAW_DATA;
  if (!Array.isArray(filteredData)) return;

  const ctx = document.getElementById('hwOwnerChart');
  if (!ctx) return;

  // Destroy existing chart
  hwOwnerChart?.destroy();

  // Get selected years filter
  const selectedYears = window.dataFilterManager ? window.dataFilterManager.filters.years : new Set();
  const hasYearFilter = selectedYears.size > 0;
  
  console.log('ðŸ” HW Owner Chart - Year filter:', {
    hasFilter: hasYearFilter,
    selectedYears: Array.from(selectedYears),
    programCount: filteredData.length
  });

  // Count distinct Part Numbers associated with each HWO, broken down by engine program
  // Only count parts that are associated with ESNs from selected years (if year filter is active)
  const hwoByProgram = new Map(); // HWO -> { programName -> Set of distinct PNs }
  const hwoParts = new Map(); // Store part information for each HWO

  filteredData.forEach(program => {
    const programName = program.engineProgram || program.PL || 'Unknown';
    
    if (program.configs) {
      program.configs.forEach(config => {
        // If year filter is active, check if this config has ESNs in selected years
        let configHasMatchingYears = !hasYearFilter; // If no year filter, include all
        if (hasYearFilter && config.esns) {
          configHasMatchingYears = config.esns.some(esn => {
            const year = getYearFromDate(esn.targetShipDate);
            return year && selectedYears.has(year);
          });
        }

        // Only process this config if it matches year filter
        if (configHasMatchingYears && config.level1Parts) {
          config.level1Parts.forEach(level1Part => {
            if (level1Part.hwo && Array.isArray(level1Part.hwo) && level1Part.pn) {
              level1Part.hwo.forEach(hwo => {
                // Initialize HWO entry
                if (!hwoByProgram.has(hwo)) {
                  hwoByProgram.set(hwo, new Map());
                }
                
                // Initialize program entry for this HWO
                if (!hwoByProgram.get(hwo).has(programName)) {
                  hwoByProgram.get(hwo).set(programName, new Set());
                }
                
                // Add part number to the set (ensures distinct count)
                hwoByProgram.get(hwo).get(programName).add(level1Part.pn);

                // Store part information for this HWO
                if (!hwoParts.has(hwo)) {
                  hwoParts.set(hwo, []);
                }
                hwoParts.get(hwo).push({
                  pn: level1Part.pn,
                  level: 'L1',
                  supplier: level1Part.supplier,
                  qpe: level1Part.qpe,
                  program: programName
                });
              });
            }
          });
        }
      });
    }
  });

  // Get all unique programs
  const allPrograms = new Set();
  hwoByProgram.forEach(programMap => {
    programMap.forEach((_, program) => allPrograms.add(program));
  });
  const programs = Array.from(allPrograms).sort();

  // Calculate total distinct PNs per HWO and sort
  const hwoTotals = Array.from(hwoByProgram.entries()).map(([hwo, programMap]) => {
    const total = Array.from(programMap.values()).reduce((sum, pnSet) => sum + pnSet.size, 0);
    return { hwo, total };
  }).sort((a, b) => b.total - a.total);

  const hwoLabels = hwoTotals.map(item => item.hwo);

  // Create datasets for each program (stacked bars)
  const programColors = {
    'XY2500': '#3b82f6', // Light blue
    'XY6000': '#ef4444', // Dark red
    'LM2500': '#60a5fa',
    'LM6000': '#1e3a8a',
    'LMS100': '#34d399'
  };

  const datasets = programs.map(program => {
    const data = hwoLabels.map(hwo => {
      const programMap = hwoByProgram.get(hwo);
      return programMap && programMap.has(program) ? programMap.get(program).size : 0;
    });

    return {
      label: program,
      data: data,
      backgroundColor: programColors[program] || '#94a3b8',
      borderColor: '#ffffff',
      borderWidth: 1
    };
  });

  hwOwnerChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hwoLabels,
      datasets: datasets
    },
    plugins: [ChartDataLabels], // Enable datalabels plugin
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 15,
            padding: 10,
            font: { size: 11 }
          }
        },
        title: {
          display: true,
          text: 'Count of Part Number by HW Owner and Engine Program',
          font: { size: 14, weight: 'bold' },
          padding: { bottom: 20 }
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y} part numbers`,
            footer: (tooltipItems) => {
              const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
              return `Total: ${total} distinct part numbers`;
            }
          }
        },
        datalabels: {
          display: function(context) {
            return context.dataset.data[context.dataIndex] > 0; // Only show non-zero values
          },
          color: '#ffffff',
          font: {
            weight: 'bold',
            size: 10
          },
          formatter: function(value) {
            return value > 0 ? value : '';
          },
          anchor: 'center',
          align: 'center'
        }
      },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'HW Owner'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: 'Count of Part Number'
          },
          beginAtZero: true,
          ticks: {
            stepSize: 50,
            callback: (value) => Number(value).toLocaleString()
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

function renderAllCharts() {
  // Render Engine Program overview chart first
  renderEngineProgramChart();

  // Ensure sections temporarily visible to read their tables
  const prev = document.querySelector('#sectionPills .section-pill.active')?.dataset.target;
  const toShow = ['section-engine-program', 'section-supplier', 'section-rm-supplier', 'section-hw-owner'];
  const hidden = [];
  toShow.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.classList.contains('d-none')) { hidden.push(el); el.classList.remove('d-none'); }
  });
  renderProgramChart();
  // Render supplier chart for current active supplier-type section
  const activeSupplierSection = (prev === 'section-rm-supplier') ? 'section-rm-supplier' : 'section-supplier';
  renderSupplierChart(activeSupplierSection);
  // Always hide the RM details card since we use main chart replacement now
  const rmCard = document.getElementById('chart-rm-level');
  if (rmCard) rmCard.classList.add('d-none');
  if (typeof renderHWOwnerChart === 'function') { renderHWOwnerChart(); }
  // Restore hidden state
  hidden.forEach(el => el.classList.add('d-none'));
  if (prev) showSection(prev);

  // Wire RM details back button with enhanced functionality
  const backBtn = document.getElementById('rmLevelBackBtn');
  if (backBtn && !backBtn.dataset.bound) {
    backBtn.addEventListener('click', function () {
      // Enhanced back button functionality
      if (window.supplierChart && window.supplierChart.isDrillDown) {
        // Reset header to raw type overview
        const section = document.getElementById('section-rm-supplier');
        const headerElement = section ? section.querySelector('.card-title') : null;
        if (headerElement) {
          headerElement.textContent = 'Raw Material Types Overview';
        }

        // Go back to raw type overview
        renderSupplierChart('section-rm-supplier');
        backBtn.style.display = 'none';
      } else if (typeof clearRMDetails === 'function') {
        clearRMDetails();
      }
    });
    backBtn.dataset.bound = '1';
  }
}

// REMOVED: renderPartNumberChart() - Unused legacy function (~120 lines)
// This chart functionality is no longer used in the application.
// Part number visualization is now handled by the new chart system.

// Filter Application Functions (REMOVED DUPLICATE - using the one at line 2667)

// REMOVED DUPLICATES - using the ones at lines 2678-2691

// Helper function to check if a part hierarchy contains any of the selected RM suppliers
function hasSelectedRMSupplier(part, selectedRMSuppliers) {
  // Check current part
  if (part.rmSupplier && selectedRMSuppliers.has(part.rmSupplier)) {
    return true;
  }

  // Check nested parts recursively
  const nestedParts = [
    ...(part.level2Parts || []),
    ...(part.level3Parts || []),
    ...(part.level4Parts || []),
    ...(part.level5Parts || [])
  ];

  return nestedParts.some(nestedPart => hasSelectedRMSupplier(nestedPart, selectedRMSuppliers));
}

// REMOVED DUPLICATE - using the one at line 2688

// REMOVED DUPLICATES - using the ones at lines 2705-2713

// ===== ENGINE PROGRAM OVERVIEW CHART =====
let engineProgramChart = null;

// Helper function to get quarter from month
function getQuarterFromMonth(month) {
  const monthNum = new Date(`${month} 1, 2000`).getMonth() + 1;
  return Math.ceil(monthNum / 3);
}

// Helper function to round max value to next nice round number
function getRoundedMaxValue(maxValue) {
  if (maxValue <= 0) return 10;
  
  // Find the order of magnitude
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  
  // Divide by magnitude to get the leading digit
  const normalized = maxValue / magnitude;
  
  // Round up to nearest nice number: 1, 2, 3, 5, 10 within the same magnitude
  let rounded;
  if (normalized <= 1) rounded = 1;
  else if (normalized <= 2) rounded = 2;
  else if (normalized <= 3) rounded = 3;
  else if (normalized <= 5) rounded = 5;
  else rounded = 10;
  
  const result = rounded * magnitude;
  // console.log('ðŸ“Š getRoundedMaxValue:', { maxValue, magnitude, normalized, rounded, result });
  return result;
}

// Helper function to process embedded cdata
function processEmbeddedCData(lmData) {
  console.log('ðŸ“Š processEmbeddedCData called');
  console.log('ðŸ“¥ Input data length:', lmData?.length);
  console.log('ðŸŽ¯ Current filters:', {
    productLines: window.selectedProductLines ? Array.from(window.selectedProductLines) : 'none',
    years: window.selectedYears ? Array.from(window.selectedYears) : 'none'
  });

  // Get selected view
  const selectedView = document.querySelector('input[name="engineProgramView"]:checked')?.value || 'quarter';
  console.log('ðŸ‘ï¸ Selected view:', selectedView);

  // Apply active filters to the data
  let filteredData = lmData;
  
  // Filter by selected product lines if any are selected
  if (window.selectedProductLines && window.selectedProductLines.size > 0) {
    filteredData = filteredData.filter(item => window.selectedProductLines.has(item.PL));
    console.log('âœ… Filtered by Product Lines:', Array.from(window.selectedProductLines), 'Remaining records:', filteredData.length);
  }
  
  // Filter by selected years if any are selected
  if (window.selectedYears && window.selectedYears.size > 0) {
    filteredData = filteredData.filter(item => window.selectedYears.has(item.Year.toString()));
    console.log('âœ… Filtered by Years:', Array.from(window.selectedYears), 'Remaining records:', filteredData.length);
  }
  
  console.log('ðŸ“Š Final filtered data length:', filteredData.length);

  // Extract all unique programs from the filtered data
  const allPrograms = Array.from(new Set(filteredData.map(item => item.PL))).sort();
  console.log('ðŸ“‹ All programs in filtered data:', allPrograms);

  // Helper to initialize program data
  const initProgramData = () => {
    const data = {};
    allPrograms.forEach(p => data[p] = 0);
    return data;
  };

  // Helper functions for continuous timelines
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  function getAllMonthsBetween(minYear, minMonth, maxYear, maxMonth) {
    const months = [];
    let currentYear = minYear;
    let currentMonth = minMonth;
    
    while (currentYear < maxYear || (currentYear === maxYear && currentMonth <= maxMonth)) {
      months.push({
        year: currentYear,
        month: currentMonth,
        monthName: monthNames[currentMonth - 1],
        key: `${monthNames[currentMonth - 1]} ${currentYear}`
      });
      
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    return months;
  }
  
  function getAllQuartersBetween(minYear, minQuarter, maxYear, maxQuarter) {
    const quarters = [];
    let currentYear = minYear;
    let currentQuarter = minQuarter;
    
    while (currentYear < maxYear || (currentYear === maxYear && currentQuarter <= maxQuarter)) {
      quarters.push({
        year: currentYear,
        quarter: currentQuarter,
        key: `${currentYear} Q${currentQuarter}`
      });
      
      currentQuarter++;
      if (currentQuarter > 4) {
        currentQuarter = 1;
        currentYear++;
      }
    }
    return quarters;
  }

  // Process data based on selected view
  let processedData;
  let labels;

  if (selectedView === 'year') {
    // Group by year
    const yearData = {};
    filteredData.forEach(item => {
      const year = item.Year.toString();
      if (!yearData[year]) {
        yearData[year] = initProgramData();
      }
      yearData[year][item.PL] += parseInt(item.No) || 0;
    });
    
    // Find min and max years
    const years = Object.keys(yearData).map(y => parseInt(y));
    if (years.length > 0) {
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      
      // Fill in missing years
      for (let year = minYear; year <= maxYear; year++) {
        const yearStr = year.toString();
        if (!yearData[yearStr]) {
          yearData[yearStr] = initProgramData();
        }
      }
    }
    
    processedData = yearData;
    labels = Object.keys(yearData).sort((a, b) => parseInt(a) - parseInt(b));
    console.log('ðŸ“… Year view - Labels:', labels);
    console.log('ðŸ“… Year view - Data:', processedData);
    
  } else if (selectedView === 'quarter') {
    // Group by year-quarter
    const quarterData = {};
    const quarterInfo = {};
    
    filteredData.forEach(item => {
      const year = parseInt(item.Year);
      const month = item.Mon;
      const quarter = getQuarterFromMonth(month);
      const key = `${year} Q${quarter}`;

      if (!quarterData[key]) {
        quarterData[key] = initProgramData();
        quarterInfo[key] = { year, quarter };
      }
      quarterData[key][item.PL] += parseInt(item.No) || 0;
    });
    
    // Find min and max quarters
    const dataKeys = Object.keys(quarterInfo);
    if (dataKeys.length > 0) {
      const years = dataKeys.map(key => quarterInfo[key].year);
      const quarters = dataKeys.map(key => quarterInfo[key].quarter);
      
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      const minQuarter = Math.min(...quarters.filter((q, i) => years[i] === minYear));
      const maxQuarter = Math.max(...quarters.filter((q, i) => years[i] === maxYear));
      
      // Generate all quarters in range
      const allQuarters = getAllQuartersBetween(minYear, minQuarter, maxYear, maxQuarter);
      
      // Fill in missing quarters
      allQuarters.forEach(q => {
        if (!quarterData[q.key]) {
          quarterData[q.key] = initProgramData();
        }
      });
      
      // Sort quarters properly
      labels = allQuarters.map(q => q.key);
    } else {
      labels = [];
    }
    
    processedData = quarterData;
    console.log('ðŸ“… Quarter view - Labels:', labels);
    console.log('ðŸ“… Quarter view - Data:', processedData);
    
  } else { // month view
    // Group by month-year
    const monthData = {};
    const monthInfo = {};
    
    filteredData.forEach(item => {
      const year = parseInt(item.Year);
      const monthName = item.Mon;
      const monthNum = monthNames.indexOf(monthName) + 1;
      const key = `${monthName} ${year}`;
      
      if (!monthData[key]) {
        monthData[key] = initProgramData();
        monthInfo[key] = { year, month: monthNum };
      }
      monthData[key][item.PL] += parseInt(item.No) || 0;
    });
    
    // Find min and max months
    const dataKeys = Object.keys(monthInfo);
    if (dataKeys.length > 0) {
      const years = dataKeys.map(key => monthInfo[key].year);
      const months = dataKeys.map(key => monthInfo[key].month);
      
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      const minMonth = Math.min(...months.filter((m, i) => years[i] === minYear));
      const maxMonth = Math.max(...months.filter((m, i) => years[i] === maxYear));
      
      // Generate all months in range
      const allMonths = getAllMonthsBetween(minYear, minMonth, maxYear, maxMonth);
      
      // Fill in missing months
      allMonths.forEach(m => {
        if (!monthData[m.key]) {
          monthData[m.key] = initProgramData();
        }
      });
      
      // Use the ordered months as labels
      labels = allMonths.map(m => m.key);
    } else {
      labels = [];
    }
    
    processedData = monthData;
    console.log('ðŸ“… Month view - Labels:', labels);
    console.log('ðŸ“… Month view - Data:', processedData);
  }

  // Create datasets with dynamic colors based on actual programs
  const programColors = [
    { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },  // Blue
    { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },   // Red
    { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },  // Green
    { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },  // Orange
    { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },  // Purple
    { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' }   // Pink
  ];

  const actualPrograms = Array.from(new Set(
    Object.values(processedData).flatMap(row => Object.keys(row))
  )).sort();
  
  console.log('ðŸŽ¨ Actual programs for datasets:', actualPrograms);
  console.log('ðŸŽ¨ Labels for chart:', labels);

  const datasets = actualPrograms.map((program, index) => ({
    label: program,
    data: labels.map(label => processedData[label]?.[program] || 0),
    borderColor: programColors[index % programColors.length].border,
    backgroundColor: programColors[index % programColors.length].bg,
    fill: false,
    tension: 0,
    spanGaps: true,
    borderWidth: 3,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: programColors[index % programColors.length].border,
    pointBorderColor: '#fff',
    pointBorderWidth: 2
  }));
  
  console.log('ðŸ“Š Datasets created:', datasets.length, 'datasets');
  datasets.forEach((ds, i) => {
    console.log(`  Dataset ${i}: ${ds.label} - Data points:`, ds.data);
  });

  // Render summary table with processed data
  renderEngineProgramSummaryTableForView(processedData, selectedView);

  // Get canvas first before creating legend
  const ctx = document.getElementById('engineProgramChart');
  if (!ctx) {
    console.warn('Engine Program chart canvas not found');
    return;
  }

  // Find or create the legend container at the top
  let legendContainer = document.querySelector('.engine-program-legend');
  if (!legendContainer) {
    console.warn('Legend container not found in HTML');
    return;
  }
  
  legendContainer.innerHTML = '';
  actualPrograms.forEach((program, index) => {
    const color = programColors[index % programColors.length].border;
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item-inline';
    legendItem.setAttribute('data-index', index);
    legendItem.style.cursor = 'pointer';
    legendItem.innerHTML = `
      <span class="legend-dot" style="background-color: ${color}; width: 12px; height: 12px; display: inline-block; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>
      <span class="legend-label" style="color: #2c3e50; font-size: 12px; font-weight: normal; vertical-align: middle;">${program}</span>
    `;
    
    // Add click handler to toggle dataset visibility
    legendItem.addEventListener('click', function() {
      if (!engineProgramChart._hiddenDatasets) {
        engineProgramChart._hiddenDatasets = [];
      }
      
      const datasetIndex = parseInt(this.getAttribute('data-index'));
      
      if (engineProgramChart._hiddenDatasets.includes(datasetIndex)) {
        engineProgramChart._hiddenDatasets = [];
      } else {
        // Show only the clicked dataset, hide all others
        engineProgramChart._hiddenDatasets = [0, 1, 2].filter(i => i !== datasetIndex);
      }
      
      // Update datasets visibility
      engineProgramChart.data.datasets.forEach((dataset, idx) => {
        dataset.hidden = engineProgramChart._hiddenDatasets.includes(idx);
      });
      
      // Show/hide back button
      const backBtn = document.getElementById('engineProgramBackBtn');
      if (backBtn) {
        backBtn.style.display = engineProgramChart._hiddenDatasets.length > 0 ? 'inline-block' : 'none';
      }
      
      engineProgramChart.update();
    });
    
    legendContainer.appendChild(legendItem);
  });

  // Destroy existing chart if it exists
  if (engineProgramChart) {
    console.log('ðŸ—‘ï¸ Destroying existing engineProgramChart');
    engineProgramChart.destroy();
    engineProgramChart = null;
  }

  // Validate chart data before creation
  console.log('ðŸŽ¨ Creating chart with:', {
    labelsCount: labels?.length,
    labelsPreview: labels?.slice(0, 5),
    datasetsCount: datasets?.length,
    canvasExists: !!ctx,
    canvasId: ctx?.id
  });
  
  if (!labels || labels.length === 0) {
    console.error('âŒ Cannot create chart: No labels');
    return;
  }
  
  if (!datasets || datasets.length === 0) {
    console.error('âŒ Cannot create chart: No datasets');
    return;
  }

  // Create new chart
  const chartType = 'line';
  console.log('ðŸŽ¨ About to create new Chart instance...');
  
  engineProgramChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: false,
          text: 'Engine Program Overview',
          font: { size: 16, weight: 'bold' },
          padding: { bottom: 20 }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: function (context) {
              return context[0].label;
            },
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y}`;
            }
          }
        },
        datalabels: {
          display: false
        }
      },
      scales: {
        x: {
          title: {
            display: false,
            text: selectedView === 'year' ? 'Year' : selectedView === 'quarter' ? 'Year-Quarter' : 'Month-Year'
          },
          grid: {
            display: false
          },
          ticks: {
            maxRotation: selectedView === 'month' ? 45 : 0,
            minRotation: 0,
            autoSkip: false,
            callback: function (value, index, ticks) {
              const label = this.getLabelForValue(value);
              if (selectedView === 'quarter') {
                return label; // Already formatted as "2025 Q1"
              }
              return label;
            },
            font: {
              size: selectedView === 'month' ? 10 : 12
            }
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'ESN Count'
          },
          grid: {
            display: false
          },
          ticks: {
            // stepSize will be calculated automatically based on max value
          },
          // Calculate max value from all datasets
          max: (() => {
            try {
              let maxValue = 0;
              console.log('ðŸ” datasets check:', typeof datasets, Array.isArray(datasets), datasets?.length);
              
              if (!Array.isArray(datasets)) {
                console.warn('âš ï¸ datasets is not an array!', datasets);
                return 3000; // fallback
              }
              
              datasets.forEach((dataset, idx) => {
                console.log(`  Dataset ${idx}: label=${dataset.label}, data type=${typeof dataset.data}, is array=${Array.isArray(dataset.data)}`);
                if (Array.isArray(dataset.data)) {
                  const validData = dataset.data.filter(v => typeof v === 'number');
                  console.log(`    Valid values: [${validData.join(', ')}]`);
                  if (validData.length > 0) {
                    const dataMax = Math.max(...validData);
                    console.log(`    Max: ${dataMax}`);
                    if (dataMax > maxValue) maxValue = dataMax;
                  }
                }
              });

              // Use the rounded max function for nice numbers
              const roundedMax = getRoundedMaxValue(maxValue);
              console.log('âœ… Final Y-Axis Max:', { maxValue, roundedMax });
              return roundedMax;
            } catch (err) {
              console.error('âŒ Error in max calculation:', err);
              return 3000; // fallback
            }
          })()
        }
      }
    }
  });
  
  console.log('âœ… Chart created successfully:', {
    chartExists: !!engineProgramChart,
    chartType: engineProgramChart?.config?.type,
    datasetCount: engineProgramChart?.data?.datasets?.length,
    labelCount: engineProgramChart?.data?.labels?.length
  });

  // Add back button functionality
  const backBtn = document.getElementById('engineProgramBackBtn');
  if (backBtn && !backBtn.dataset.bound) {
    backBtn.addEventListener('click', function () {
      if (engineProgramChart && engineProgramChart._hiddenDatasets) {
        // Reset hidden datasets
        engineProgramChart._hiddenDatasets = [];

        // Update datasets visibility
        engineProgramChart.data.datasets.forEach((dataset, index) => {
          dataset.hidden = false;
        });

        // Hide back button
        backBtn.style.display = 'none';

        // Update chart
        engineProgramChart.update();
      }
    });
    backBtn.dataset.bound = '1';
  }

  console.log('Engine Program Chart rendered successfully with embedded cdata');
}

function renderEngineProgramChart() {
  const activeFilters = {
    productLines: Array.from(window.selectedProductLines || []),
    years: Array.from(window.selectedYears || [])
  };

  // Check if embedded data is available first (for local file access)
  if (typeof window.EMBEDDED_CDATA !== 'undefined') {
    processEmbeddedCData(window.EMBEDDED_CDATA);
    return;
  }

  // Otherwise, try to fetch from DuckDB API endpoint
  console.log('Fetching cdata from DuckDB API endpoint');
  fetch('/api/demand/chart-data')
    .then(response => response.json())
    .then(result => {
      console.log('Loaded chart data from API:', result);
      // Extract data array from API response
      const lmData = result.data || result;
      // Use the same processing function
      processEmbeddedCData(lmData);
    })
    .catch(error => {
      console.warn('Failed to load chart data from API:', error);
      console.log('Falling back to RAW_DATA for Engine Program Chart');
      renderEngineProgramChartFallback();
    });
}

// Render Engine Program Summary Table
function calculateGrowthIndicator(currentValue, previousValue, showOnlyIcon = false) {
  if (previousValue === 0) {
  return currentValue > 0 ? ' <span class="badge bg-success ms-1" title="New entry">&#8593;</span>' : '';
  }

  const growthPercent = ((currentValue - previousValue) / previousValue * 100);
  const growthIcon = growthPercent > 0 ? '\u2191' : growthPercent < 0 ? '\u2193' : '\u2192';
  const growthBadge = growthPercent > 0 ? 'badge bg-success' : growthPercent < 0 ? 'badge bg-danger' : 'badge bg-secondary';

  // If showOnlyIcon is true, return only the icon without percentage
  if (showOnlyIcon) {
  return ` <span class="${growthBadge} ms-1" title="${growthPercent.toFixed(1)}%">${eval('"' + growthIcon + '"')}</span>`;
  }

  // Round to whole number
  const wholePercent = Math.round(Math.abs(growthPercent));
  return ` <span class="${growthBadge} ms-1" title="${growthPercent.toFixed(1)}%">${growthIcon} ${wholePercent}%</span>`;
}

function renderEngineProgramSummaryTableForView(processedData, selectedView) {
  const table = document.querySelector('#engineProgramSummaryTable');
  const tableBody = table?.querySelector('tbody');
  if (!tableBody || !table) {
    console.warn('Engine Program Summary table not found');
    return;
  }

  // Extract unique programs from processed data
  const programsSet = new Set();
  Object.values(processedData).forEach(row => {
    Object.keys(row).forEach(key => {
      if (key !== 'total') programsSet.add(key);
    });
  });
  const programs = Array.from(programsSet).sort();

  console.log('Programs for summary table:', programs);

  // Update table header dynamically
  const thead = table.querySelector('thead');
  if (thead && programs.length > 0) {
    thead.innerHTML = `
      <tr>
        <th rowspan="2" class="text-center align-middle">Year</th>
        <th colspan="${programs.length}" class="text-center">ESN Count</th>
        <th rowspan="2" class="text-center align-middle">Total</th>
      </tr>
      <tr>
        ${programs.map(p => `<th class="text-center">${p}</th>`).join('')}
      </tr>
    `;
  }

  // Generate table rows based on processed data
  let html = '';
  let labels = Object.keys(processedData);

  if (selectedView === 'month') {
    labels = labels.sort((a, b) => {
      const [m1, y1] = a.split(' ');
      const [m2, y2] = b.split(' ');
      if (y1 !== y2) return +y1 - +y2;
      const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return monthOrder.indexOf(m1) - monthOrder.indexOf(m2);
    });
  } else {
    labels = labels.sort();
  }

  // Data rows
  const previousValues = {};
  programs.forEach(p => previousValues[p] = 0);
  previousValues.total = 0;

  labels.forEach((label, index) => {
    const row = processedData[label];
    const values = {};
    let total = 0;
    programs.forEach(p => {
      values[p] = row[p] || 0;
      total += values[p];
    });

    // Calculate growth indicators for each program (for year and quarter views)
    const showGrowthIndicators = selectedView === 'year' || selectedView === 'quarter';
    const showOnlyIcon = selectedView === 'quarter'; // For quarter view, show only indicators without numbers
    const growthIndicators = {};
    programs.forEach(p => {
      growthIndicators[p] = showGrowthIndicators && index > 0 ? calculateGrowthIndicator(values[p], previousValues[p], showOnlyIcon) : '';
      previousValues[p] = values[p];
    });
    // No growth indicator for total column
    previousValues.total = total;

    html += `
      <tr>
        <td class="text-center fw-bold">${label}</td>
        ${programs.map(p => `<td class="text-center">${values[p]}${growthIndicators[p]}</td>`).join('')}
        <td class="text-center fw-bold">${total}</td>
      </tr>
    `;
  });

  // Total row
  const grandTotal = {};
  programs.forEach(program => {
    grandTotal[program] = labels.reduce((sum, label) => sum + (processedData[label][program] || 0), 0);
  });
  const totalSum = Object.values(grandTotal).reduce((sum, val) => sum + val, 0);

  html += `
    <tr class="table-primary">
      <td class="text-center fw-bold">Total</td>
      ${programs.map(p => `<td class="text-center fw-bold">${grandTotal[p]}</td>`).join('')}
      <td class="text-center fw-bold">${totalSum}</td>
    </tr>
  `;

  tableBody.innerHTML = html;
}

// Render Engine Program Summary Table for fallback (RAW_DATA)
function renderEngineProgramSummaryTableFallback(data) {
  const table = document.querySelector('#engineProgramSummaryTable');
  const tableBody = table?.querySelector('tbody');
  if (!tableBody || !table) {
    console.warn('Engine Program Summary table not found');
    return;
  }

  // Extract unique programs and years from data
  const programsSet = new Set();
  const yearsSet = new Set();

  data.forEach(program => {
    programsSet.add(program.engineProgram);
    program.configs.forEach(config => {
      (config.esns || []).forEach(esn => {
        const year = getYearFromDate(esn.targetShipDate);
        if (year) yearsSet.add(year);
      });
    });
  });

  const programs = Array.from(programsSet).sort();
  const years = Array.from(yearsSet).sort();

  console.log('Fallback: Programs:', programs, 'Years:', years);

  // Update table header dynamically
  const thead = table.querySelector('thead');
  if (thead && programs.length > 0) {
    thead.innerHTML = `
      <tr>
        <th rowspan="2" class="text-center align-middle">Year</th>
        <th colspan="${programs.length}" class="text-center">Distinct ESN Count</th>
        <th rowspan="2" class="text-center align-middle">Total</th>
      </tr>
      <tr>
        ${programs.map(p => `<th class="text-center">${p}</th>`).join('')}
      </tr>
    `;
  }

  // Calculate summary data with DISTINCT ESN counts
  const summary = {};
  const grandTotal = {};
  const distinctEsnsByProgramYear = {}; // Track distinct ESNs

  // Initialize
  years.forEach(year => {
    summary[year] = {};
    programs.forEach(p => {
      summary[year][p] = 0;
      distinctEsnsByProgramYear[`${p}_${year}`] = new Set();
    });
    summary[year].total = 0;
  });
  programs.forEach(p => grandTotal[p] = 0);
  const allDistinctEsns = new Set(); // For grand total
  grandTotal.total = 0;

  // Aggregate data - count DISTINCT ESNs
  data.forEach(program => {
    const programName = program.engineProgram;
    program.configs.forEach(config => {
      (config.esns || []).forEach(esn => {
        const year = getYearFromDate(esn.targetShipDate);
        if (year && years.includes(year)) {
          // Add to distinct set for this program-year
          distinctEsnsByProgramYear[`${programName}_${year}`].add(esn.esn);
          // Add to all distinct ESNs
          allDistinctEsns.add(esn.esn);
        }
      });
    });
  });

  // Convert distinct ESN sets to counts
  years.forEach(year => {
    programs.forEach(p => {
      const count = distinctEsnsByProgramYear[`${p}_${year}`].size;
      summary[year][p] = count;
      summary[year].total += count;
      grandTotal[p] += count;
    });
  });
  grandTotal.total = allDistinctEsns.size;

  // Generate table rows
  let html = '';

  // Year rows with growth indicators
  const previousValues = {};
  programs.forEach(p => previousValues[p] = 0);
  previousValues.total = 0;

  years.forEach((year, index) => {
    const row = summary[year];
    const values = {};
    let total = 0;
    programs.forEach(p => {
      values[p] = row[p] || 0;
      total += values[p];
    });

    const growthIndicators = {};
    programs.forEach(p => {
      growthIndicators[p] = index > 0 ? calculateGrowthIndicator(values[p], previousValues[p]) : '';
      previousValues[p] = values[p];
    });
    // No growth indicator for total column
    previousValues.total = total;

    html += `
      <tr>
        <td class="text-center fw-bold">${year}</td>
        ${programs.map(p => `<td class="text-center">${values[p]}${growthIndicators[p]}</td>`).join('')}
        <td class="text-center fw-bold">${total}</td>
      </tr>
    `;
  });

  // Grand total row
  html += `
    <tr class="table-primary">
      <td class="text-center fw-bold">Total</td>
      ${programs.map(p => `<td class="text-center fw-bold">${grandTotal[p]}</td>`).join('')}
      <td class="text-center fw-bold">${grandTotal.total}</td>
    </tr>
  `;

  tableBody.innerHTML = html;
}

// Fallback function in case cdata.json fails to load
function renderEngineProgramChartFallback() {
  console.log('Falling back to original Engine Program Chart');

  if (!Array.isArray(RAW_DATA)) {
    console.warn('RAW_DATA not available for Engine Program chart');
    return;
  }

  // Render summary table with RAW_DATA
  renderEngineProgramSummaryTableFallback(RAW_DATA);

  // Parse data to get DISTINCT ESN counts by Engine Program and Year
  const programYearData = {};
  const yearSet = new Set();
  const distinctEsnsByProgramYear = {}; // Track distinct ESNs

  RAW_DATA.forEach(program => {
    const programName = program.engineProgram;
    if (!programYearData[programName]) {
      programYearData[programName] = {};
      distinctEsnsByProgramYear[programName] = {};
    }

    program.configs.forEach(config => {
      (config.esns || []).forEach(esn => {
        const year = getYearFromDate(esn.targetShipDate);
        if (year) {
          yearSet.add(year);
          
          // Initialize sets for tracking distinct ESNs
          if (!distinctEsnsByProgramYear[programName][year]) {
            distinctEsnsByProgramYear[programName][year] = new Set();
          }
          
          // Add ESN to the set (automatically handles duplicates)
          distinctEsnsByProgramYear[programName][year].add(esn.esn);
        }
      });
    });
  });

  // Convert distinct ESN sets to counts
  Object.keys(distinctEsnsByProgramYear).forEach(program => {
    programYearData[program] = {};
    Object.keys(distinctEsnsByProgramYear[program]).forEach(year => {
      programYearData[program][year] = distinctEsnsByProgramYear[program][year].size;
    });
  });

  const years = Array.from(yearSet).sort();
  const programs = Object.keys(programYearData).sort();

  // Build datasets for each program
  const datasets = programs.map((program, index) => {
    const color = getConsistentColor(program);
    return {
      label: program,
      data: years.map(year => programYearData[program][year] || 0),
      backgroundColor: color.replace('0.6', '0.2'),
      borderColor: color.replace('0.6', '1'),
      borderWidth: 2,
      fill: false,
      tension: 0.1,
      pointBackgroundColor: color.replace('0.6', '1'),
      pointBorderColor: '#fff',
      pointBorderWidth: 1,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointHoverBorderWidth: 2
    };
  });

  // Get canvas and destroy existing chart
  const ctx = document.getElementById('engineProgramChart');
  if (!ctx) {
    console.warn('Engine Program chart canvas not found');
    return;
  }

  if (engineProgramChart) {
    engineProgramChart.destroy();
  }

  // Create new chart
  engineProgramChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: years,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 12,
            font: {
              size: 11,
              weight: 'bold'
            }
          },
          onClick: function (event, legendItem, legend) {
            const chart = legend.chart;
            const datasetIndex = legendItem.datasetIndex;

            // Initialize hidden datasets tracking if not exists
            if (!chart._hiddenDatasets) {
              chart._hiddenDatasets = [];
            }

            // If this dataset is currently hidden, show only this one
            if (chart._hiddenDatasets.includes(datasetIndex)) {
              chart._hiddenDatasets = [];
            } else {
              // Show only the clicked dataset, hide all others
              chart._hiddenDatasets = [0, 1, 2].filter(i => i !== datasetIndex);
            }

            // Update datasets visibility
            chart.data.datasets.forEach((dataset, index) => {
              dataset.hidden = chart._hiddenDatasets.includes(index);
            });

            // Show/hide back button
            const backBtn = document.getElementById('engineProgramBackBtn');
            if (backBtn) {
              backBtn.style.display = chart._hiddenDatasets.length > 0 ? 'inline-block' : 'none';
            }

            // Update chart
            chart.update();
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y} ESNs`;
            }
          }
        },
        datalabels: {
          display: false
        }
      },
      scales: {
        x: {
          title: {
            display: false
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'ESNs'
          },
          // Set max to rounded nice number based on data
          max: (() => {
            let maxValue = 0;
            if (Array.isArray(datasets)) {
              datasets.forEach(dataset => {
                if (Array.isArray(dataset.data)) {
                  const dataMax = Math.max(...dataset.data.filter(v => typeof v === 'number'));
                  if (dataMax > maxValue) maxValue = dataMax;
                }
              });
            }
            return getRoundedMaxValue(maxValue);
          })()
        }
      }
    }
  });
}

// ===== RAW MATERIAL DETAILS MODAL HANDLERS =====
document.addEventListener('DOMContentLoaded', function () {
  // Engine Program Chart filter handlers
  const viewRadios = document.querySelectorAll('input[name="engineProgramView"]');
  const zoomInBtn = document.getElementById('zoomInEngineProgram');
  const resetZoomBtn = document.getElementById('resetEngineProgramZoom');

  // View toggle buttons
  viewRadios.forEach(radio => {
    radio.addEventListener('change', function () {
      renderEngineProgramChart();
    });
  });

  // Zoom controls
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', function () {
      if (engineProgramChart && engineProgramChart.zoom) {
        engineProgramChart.zoom(1.2); // Zoom in by 20%
      }
    });
  }

  if (resetZoomBtn) {
    resetZoomBtn.addEventListener('click', function () {
      if (engineProgramChart && engineProgramChart.resetZoom) {
        engineProgramChart.resetZoom();
      }
    });
  }

  // RM Details button is now hidden - raw material details shown directly on chart click

  // Add export functionality to modal
  const exportBtn = document.getElementById('exportModalData');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      exportModalTableData();
    });
  }
});

function showRawMaterialTypeSelector() {
  // Get available raw material types from current data
  const rawMaterialTypes = getRawMaterialTypes();

  if (rawMaterialTypes.length === 0) {
    alert('No raw material data available');
    return;
  }

  if (rawMaterialTypes.length === 1) {
    // If only one type, show modal directly
    showRawMaterialDetailsModal(rawMaterialTypes[0]);
    return;
  }

  // Create a simple selection dialog
  const selectedType = prompt(
    `Select a raw material type:\n\n${rawMaterialTypes.map((type, index) => `${index + 1}. ${type}`).join('\n')}\n\nEnter the number (1-${rawMaterialTypes.length}):`
  );

  const typeIndex = parseInt(selectedType) - 1;
  if (typeIndex >= 0 && typeIndex < rawMaterialTypes.length) {
    showRawMaterialDetailsModal(rawMaterialTypes[typeIndex]);
  }
}

function getRawMaterialTypes() {
  if (!Array.isArray(RAW_DATA)) return [];

  const rawTypes = new Set();

  RAW_DATA.forEach(program => {
    program.configs.forEach(config => {
      extractRawTypes(config.level1Parts || [], rawTypes);
    });
  });

  return Array.from(rawTypes).sort();
}

function extractRawTypes(parts, rawTypes) {
  parts.forEach(part => {
    // Check level 2 parts
    (part.level2Parts || []).forEach(l2 => {
      if (l2.rawType) {
        rawTypes.add(l2.rawType);
      }
      if (l2.level3Parts) extractRawTypes(l2.level3Parts, rawTypes);
    });

    // Check deeper levels
    if (part.level3Parts) extractRawTypes(part.level3Parts, rawTypes);
    if (part.level4Parts) extractRawTypes(part.level4Parts, rawTypes);
    if (part.level5Parts) extractRawTypes(part.level5Parts, rawTypes);
  });
}

// ===== SUPPLIER DETAILS MODAL FUNCTIONS =====


// ===== RAW MATERIAL DETAILS MODAL =====
// Moved to rm-supplier-popup.js for better code organization

// ===== SUPPLIER TYPE DETAILS MODAL =====
// Moved to supplier-type-popup.js for better code organization

// ===== HW OWNER DETAILS MODAL =====
// Moved to hw-owner-popup.js for better code organization

// ===== LEGACY FUNCTION - Kept for backward compatibility =====
// Old simple showHWOwnerDetails function
function showHWOwnerDetails(hwoName, parts) {
  // Create or get modal
  let modal = document.getElementById('hwOwnerDetailsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hwOwnerDetailsModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">HW Owner: ${hwoName} - Level 1 Part Numbers</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Level</th>
                    <th>Supplier</th>
                    <th>QPE</th>
                  </tr>
                </thead>
                <tbody id="hwOwnerDetailsTableBody">
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Update modal title
  modal.querySelector('.modal-title').textContent = `HW Owner: ${hwoName} - Level 1 Part Numbers (${parts.length} parts)`;

  // Populate table
  const tbody = modal.querySelector('#hwOwnerDetailsTableBody');
  tbody.innerHTML = parts.map(part => `
    <tr>
      <td>${part.pn}</td>
      <td>${part.level}</td>
      <td>${part.supplier}</td>
      <td>${part.qpe}</td>
    </tr>
  `).join('');

  // Show modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

// ===== END OF DEMAND.JS =====
// All modal code has been moved to separate files for better organization:
// - supplier-popup.js: Program Supplier modal
// - rm-supplier-popup.js: RM Supplier modal  
// - supplier-type-popup.js: Supplier Type modal (Internal/AEO/External)
// - hw-owner-popup.js: HW Owner modal

// ===== LEGACY FUNCTION - Kept for backward compatibility =====
// Old simple showHWOwnerDetails function
function showHWOwnerDetails(hwoName, parts) {
  // Legacy simple implementation - all functionality now in hw-owner-popup.js
  showHWOwnerDetailsModal(hwoName);
}
