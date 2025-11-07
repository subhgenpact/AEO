/**
 * Modular Demand Dashboard Main Logic
 * Coordinates all sections using the new modular architecture
 */

// Global variables for backward compatibility
let DEMAND_DATA = null;
let RAW_DATA = null;
let BASE_METRICS = null;
let TOTALS_BY_YEAR = { '2025': 0, '2026': 0, '2027': 0 };

// Initialize filter state globals
if (!window.selectedYears) window.selectedYears = new Set();
if (!window.selectedProductLines) window.selectedProductLines = new Set();
if (!window.selectedConfigs) window.selectedConfigs = new Set();
if (!window.selectedSuppliers) window.selectedSuppliers = new Set();
if (!window.selectedRMSuppliers) window.selectedRMSuppliers = new Set();
if (!window.selectedHWOwners) window.selectedHWOwners = new Set();
if (!window.selectedPartNumbers) window.selectedPartNumbers = new Set();
if (!window.selectedModules) window.selectedModules = new Set();

/**
 * Initialize the modular dashboard
 */
const initializeModularDashboard = async (data) => {
  try {
    console.log('🚀 Initializing modular dashboard...');
    
    // Ensure all dependencies are loaded
    if (!window.dataFilterManager) {
      console.error('❌ DataFilterManager not available. Check script loading order.');
      showDataError('Error: DataFilterManager not loaded. Please refresh the page.');
      return;
    }
    
    if (!window.sectionManager) {
      console.error('❌ SectionManager not available. Check script loading order.');
      showDataError('Error: SectionManager not loaded. Please refresh the page.');
      return;
    }
    
    // Store data in centralized manager
    window.dataFilterManager.setRawData(data);
    
    // Keep original for backward compatibility
    RAW_DATA = data;
    window.RAW_DATA = data;
    
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

    console.log('📊 Data processed successfully:', RAW_DATA ? RAW_DATA.length : 0, 'programs');

    // Initialize dynamic filters
    await initializeDynamicFilters(RAW_DATA);

    // Initialize all sections using the section manager
    await window.sectionManager.initialize();

    // Initialize Engine Program Overview (always visible)
    const engineProgramSection = window.sectionManager.getSection('engine-program');
    if (engineProgramSection) {
      engineProgramSection.updateChart();
    }

    // Setup data change subscription for centralized updates
    window.dataFilterManager.subscribe((filteredData) => {
      // Update all sections with filtered data
      window.sectionManager.updateAllSections(filteredData);
      
      // Update Engine Program Overview chart (always visible)
      const engineProgramSection = window.sectionManager.getSection('engine-program');
      if (engineProgramSection) {
        engineProgramSection.updateChart();
      }
    });

    console.log('✅ Modular dashboard initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing modular dashboard:', error);
    showDataError('Error initializing dashboard: ' + error.message);
  }
};

/**
 * Create ChunkLoader instance (will be initialized in DOMContentLoaded)
 */
let chunkLoader = null;

function createChunkLoader() {
  return new ChunkLoader({
    chunkSize: 50,
    onChunkLoaded: (data, loadedCount, total) => {
      console.log(`📦 Chunk loaded: ${loadedCount}/${total} items`);
    },
    onAllLoaded: (allData) => {
      console.log(`✅ All data loaded: ${allData.length} items`);
      initializeModularDashboard(allData);
    },
    onProgress: (progress) => {
      console.log(`⏳ Progress: ${progress.percentage}% (${progress.loaded}/${progress.total})`);
    },
    onError: (error) => {
      console.warn('⚠️ Failed to load data via ChunkLoader:', error);
      console.log('🔄 Falling back to embedded data...');

      // Use embedded data as fallback
      if (typeof window.EMBEDDED_DEMAND_DATA !== 'undefined') {
        initializeModularDashboard(window.EMBEDDED_DEMAND_DATA);
      } else {
        console.error('❌ No embedded data available');
        showDataError('Failed to load dashboard data. Please check if the data file exists and try refreshing the page.');
      }
    }
  });
}

/**
 * Show error message to user
 */
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

/**
 * Initialize dynamic filters (moved from original demand.js)
 */
async function initializeDynamicFilters(data) {
  console.log('🔧 Initializing dynamic filters...');

  try {
    // Check if DuckDB integration is available for ultra-fast filter population
    if (typeof getDuckDBFilterOptions === 'function') {
      console.log('🚀 Using DuckDB for ultra-fast filter population...');
      
      // Populate all filter dropdowns using DuckDB (0.5-1ms each vs 200ms+ client-side)
      const populateDropdownDuckDB = async (filterId, columnName, prefix, extractYear = false) => {
        const dropdown = document.querySelector(`#${filterId} + .dropdown-menu .dropdown-options`);
        if (!dropdown) {
          console.warn(`⚠️ Dropdown container not found for ${filterId}`);
          return;
        }

        // For year filter, we need to extract years from date column
        let values;
        if (extractYear) {
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
          console.warn(`⚠️ No values returned from DuckDB for ${filterId}`);
        }
      };

      // Populate all filters in parallel for maximum speed
      await Promise.all([
        populateDropdownDuckDB('productLineDropdown', 'ENGINE_PROGRAM', 'productLine'),
        populateDropdownDuckDB('yearDropdown', 'Target_Ship_Date', 'year', true),
        populateDropdownDuckDB('engConfigDropdown', 'Configuration', 'config'),
        populateDropdownDuckDB('supplierDropdown', 'Parent_Part_Supplier', 'supplier'),
        populateDropdownDuckDB('rmSupplierDropdown', 'Level_2_Raw_Material_Supplier', 'rmSupplier'),
        populateDropdownDuckDB('hwOwnerDropdown', 'HW_OWNER', 'hwOwner'),
        populateDropdownDuckDB('partNoDropdown', 'Part_Number', 'partNumber'),
        populateDropdownDuckDB('moduleDropdown', 'Level_2_Raw_Type', 'module')
      ]);
      
    } else {
      // Fallback to client-side method
      console.warn('⚠️ DuckDB not available, using client-side filter population...');
      await populateFiltersClientSide(data);
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
    
    console.log('✅ Dynamic filters initialized');
  } catch (error) {
    console.error('❌ Error initializing filters:', error);
  }
}

/**
 * Client-side filter population fallback
 */
async function populateFiltersClientSide(data) {
  if (!data || data.length === 0) return;

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

/**
 * Legacy function compatibility - these will delegate to section manager
 */
function showSection(sectionId, skipChartRender = false) {
  const sectionName = sectionId.replace('section-', '');
  if (window.sectionManager) {
    window.sectionManager.showSection(sectionName, skipChartRender);
  }
}

function renderChartForSection(sectionId) {
  const sectionName = sectionId.replace('section-', '');
  if (window.sectionManager) {
    window.sectionManager.renderChartsForSection(sectionName);
  }
}

// Page initialization
window.addEventListener('DOMContentLoaded', () => {
  console.time('⚡ Modular Page Load Time');
  
  // Initialize page layout
  console.log('📊 Initializing modular page layout...');
  
  // Wait a bit for all scripts to load, then start data loading
  setTimeout(() => {
    // Check if all dependencies are available with detailed logging
    console.log('🔍 Checking dependencies...');
    console.log('  - DataFilterManager:', typeof window.dataFilterManager, window.dataFilterManager);
    console.log('  - SectionManager:', typeof window.sectionManager, window.sectionManager);
    console.log('  - ChunkLoader:', typeof window.ChunkLoader, window.ChunkLoader);
    console.log('  - TablePaginationManager:', typeof window.TablePaginationManager);
    console.log('  - getYearFromDate:', typeof window.getYearFromDate);
    
    const missingDeps = [];
    
    if (!window.dataFilterManager) {
      console.error('❌ DataFilterManager not loaded');
      missingDeps.push('DataFilterManager');
    }
    
    if (!window.sectionManager) {
      console.error('❌ SectionManager not loaded');
      missingDeps.push('SectionManager');
    }
    
    if (!window.ChunkLoader) {
      console.error('❌ ChunkLoader not loaded');
      missingDeps.push('ChunkLoader');
    }
    
    if (missingDeps.length > 0) {
      const errorMsg = `Missing dependencies: ${missingDeps.join(', ')}. Please refresh the page.`;
      console.error('❌', errorMsg);
      showDataError('Error: ' + errorMsg);
      return;
    }
    
    console.log('✅ All dependencies loaded, starting data fetch...');
    
    // Create ChunkLoader instance now that the class is available
    chunkLoader = createChunkLoader();
    
    // Start loading data
    chunkLoader.loadChunks('/api/demand/programs').catch(error => {
      console.error('❌ Fatal error loading data:', error);
      showDataError('Failed to load dashboard data: ' + error.message);
    });
  }, 300); // Increased delay to ensure all scripts are fully loaded
  
  console.timeEnd('⚡ Modular Page Load Time');
});

// Export functions for backward compatibility
window.showSection = showSection;
window.renderChartForSection = renderChartForSection;
window.initializeModularDashboard = initializeModularDashboard;