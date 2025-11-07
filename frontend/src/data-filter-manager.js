/**
 * Centralized Filter and Data Management System
 * Handles filtering and notifies all charts/tables when filters change
 */

class DataFilterManager {
  constructor() {
    this.rawData = null; // Original unfiltered data
    this.filteredData = null; // Current filtered data
    this.embeddedCData = null; // Chart data (cdata.json)
    
    // Filter state
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
    
    // Subscribers (charts/tables that need to update when data changes)
    this.subscribers = new Set();
  }
  
  /**
   * Set the raw data source
   */
  setRawData(data) {
    this.rawData = data;
    this.filteredData = data;
  }
  
  /**
   * Set embedded chart data (cdata.json)
   */
  setEmbeddedCData(data) {
    this.embeddedCData = data;
  }
  
  /**
   * Update a specific filter
   */
  updateFilter(filterType, values) {
    // Convert to Set if not already
    this.filters[filterType] = values instanceof Set ? values : new Set(values);
    
    // Also update window globals for backward compatibility
    const filterMap = {
      productLines: 'selectedProductLines',
      years: 'selectedYears',
      configs: 'selectedConfigs',
      suppliers: 'selectedSuppliers',
      rmSuppliers: 'selectedRMSuppliers',
      hwOwners: 'selectedHWOwners',
      partNumbers: 'selectedPartNumbers',
      modules: 'selectedModules'
    };
    
    if (filterMap[filterType]) {
      window[filterMap[filterType]] = this.filters[filterType];
    }
    
    // Clear chart cache
    if (window.chartCache) {
      window.chartCache = {};
    }
    if (window.renderedCharts) {
      window.renderedCharts.clear();
    }
    
    // Destroy existing chart instances to force re-render
    if (typeof engineProgramChart !== 'undefined' && engineProgramChart) {
      try {
        engineProgramChart.destroy();
        engineProgramChart = null;
      } catch (e) {
        console.warn('Error destroying engineProgramChart:', e);
      }
    }
    
    // Recompute filtered data and notify subscribers
    this.applyFilters();
    this.notifySubscribers();
  }
  
  /**
   * Clear a specific filter
   */
  clearFilter(filterType) {
    this.filters[filterType].clear();
    this.applyFilters();
    this.notifySubscribers();
  }
  
  /**
   * Clear all filters
   */
  clearAllFilters() {
    Object.keys(this.filters).forEach(key => {
      this.filters[key].clear();
    });
    this.applyFilters();
    this.notifySubscribers();
  }
  
  /**
   * Apply all active filters to raw data
   */
  applyFilters() {
    if (!this.rawData) {
      console.warn('⚠️ No raw data to filter');
      return;
    }
    
    let filtered = this.rawData;
    
    // Apply Product Line filter
    if (this.filters.productLines.size > 0) {
      filtered = filtered.filter(program => 
        this.filters.productLines.has(program.engineProgram)
      );
    }
    
    // Apply Year filter (check if program has ESNs for selected years)
    if (this.filters.years.size > 0) {
      filtered = filtered.filter(program => {
        if (!program.configs) return false;
        return program.configs.some(config => {
          if (!config.esns) return false;
          return config.esns.some(esn => {
            const year = this.getYearFromDate(esn.targetShipDate);
            return year && this.filters.years.has(year);
          });
        });
      });
    }
    
    // Apply Config filter
    if (this.filters.configs.size > 0) {
      filtered = filtered.filter(program => {
        if (!program.configs) return false;
        return program.configs.some(config => 
          this.filters.configs.has(config.config)
        );
      });
    }
    
    // Apply Supplier filter
    if (this.filters.suppliers.size > 0) {
      filtered = filtered.filter(program => {
        if (!program.configs) return false;
        return program.configs.some(config => {
          if (!config.level1Parts) return false;
          return config.level1Parts.some(part => 
            this.filters.suppliers.has(part.supplier)
          );
        });
      });
    }
    
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
        console.error('❌ Error in subscriber callback:', error);
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
  
  /**
   * Utility function to extract year from date
   */
  getYearFromDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    return parts.length >= 3 ? parts[2] : null;
  }
}

// Create global instance
window.dataFilterManager = new DataFilterManager();

// Export for use in other modules
window.DataFilterManager = DataFilterManager;

console.log('✅ DataFilterManager loaded and exported to window');