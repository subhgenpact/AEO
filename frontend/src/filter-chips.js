/**
 * Filter Chips and UI Utilities
 * Handles the display of active filter chips and related UI functions
 */

// ===== Filter chips =====
function updateFilterChips() {
  const chips = document.getElementById('filterChips');
  if (!chips) return;

  let chipHtml = '';
  
  // Check if dataFilterManager exists
  if (!window.dataFilterManager) {
    chips.innerHTML = '';
    return;
  }

  const filters = window.dataFilterManager.filters;
  
  // Product Line chips
  if (filters.productLines && filters.productLines.size > 0) {
    const values = Array.from(filters.productLines).slice(0, 3);
    const extra = filters.productLines.size > 3 ? ` +${filters.productLines.size - 3}` : '';
    chipHtml += `<span class="filter-chip">Product Line: ${values.join(', ')}${extra}</span>`;
  }
  
  // Year chips
  if (filters.years && filters.years.size > 0) {
    const values = Array.from(filters.years).slice(0, 3);
    const extra = filters.years.size > 3 ? ` +${filters.years.size - 3}` : '';
    chipHtml += `<span class="filter-chip">Year: ${values.join(', ')}${extra}</span>`;
  }
  
  // Config chips
  if (filters.configs && filters.configs.size > 0) {
    const values = Array.from(filters.configs).slice(0, 2);
    const extra = filters.configs.size > 2 ? ` +${filters.configs.size - 2}` : '';
    chipHtml += `<span class="filter-chip">Config: ${values.join(', ')}${extra}</span>`;
  }
  
  // Supplier chips
  if (filters.suppliers && filters.suppliers.size > 0) {
    const values = Array.from(filters.suppliers).slice(0, 2);
    const extra = filters.suppliers.size > 2 ? ` +${filters.suppliers.size - 2}` : '';
    chipHtml += `<span class="filter-chip">Supplier: ${values.join(', ')}${extra}</span>`;
  }
  
  // RM Supplier chips
  if (filters.rmSuppliers && filters.rmSuppliers.size > 0) {
    const values = Array.from(filters.rmSuppliers).slice(0, 2);
    const extra = filters.rmSuppliers.size > 2 ? ` +${filters.rmSuppliers.size - 2}` : '';
    chipHtml += `<span class="filter-chip">RM Supplier: ${values.join(', ')}${extra}</span>`;
  }
  
  // HW Owner chips
  if (filters.hwOwners && filters.hwOwners.size > 0) {
    const values = Array.from(filters.hwOwners).slice(0, 2);
    const extra = filters.hwOwners.size > 2 ? ` +${filters.hwOwners.size - 2}` : '';
    chipHtml += `<span class="filter-chip">HW Owner: ${values.join(', ')}${extra}</span>`;
  }
  
  // Part Number chips
  if (filters.partNumbers && filters.partNumbers.size > 0) {
    const values = Array.from(filters.partNumbers).slice(0, 2);
    const extra = filters.partNumbers.size > 2 ? ` +${filters.partNumbers.size - 2}` : '';
    chipHtml += `<span class="filter-chip">Part No: ${values.join(', ')}${extra}</span>`;
  }
  
  // Module chips
  if (filters.modules && filters.modules.size > 0) {
    const values = Array.from(filters.modules).slice(0, 2);
    const extra = filters.modules.size > 2 ? ` +${filters.modules.size - 2}` : '';
    chipHtml += `<span class="filter-chip">Module: ${values.join(', ')}${extra}</span>`;
  }
  
  chips.innerHTML = chipHtml;
}

// Performance optimization globals
if (!window.chartCache) {
  window.chartCache = {
    supplier: null,
    rmSupplier: null,
    hwOwner: null,
    partNumber: null,
    engineConfig: null,
    engineProgram: null
  };
}

if (!window.renderedCharts) {
  window.renderedCharts = new Set();
}

if (!window.loadedTableSections) {
  window.loadedTableSections = new Set();
}

// Progressive loading configuration
const PROGRESSIVE_LOAD_CONFIG = {
  INITIAL_PROGRAMS: 10,
  CHUNK_SIZE: 20,
  LAZY_LOAD_CHARTS: true,
  CACHE_CHART_INSTANCES: true
};

// Export to global scope
window.updateFilterChips = updateFilterChips;
window.PROGRESSIVE_LOAD_CONFIG = PROGRESSIVE_LOAD_CONFIG;