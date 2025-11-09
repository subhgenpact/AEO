// Filter helpers extracted from demand.js into a global module (classic script)
(function(){
  // Extract unique filter values from nested data with optional filtering by product lines
  function extractFilterData(data, selectedProductLines = null) {
    const filters = {
      productLines: new Set(),
      years: new Set(),
      configs: new Set(),
      suppliers: new Set(),
      rmSuppliers: new Set(),
      hwOwners: new Set(),
      partNumbers: new Set(),
      modules: new Set()
    };

    // Map display names to canonical names for product line filtering
    const productLineMap = { 'LM25': 'LM2500', 'LM60': 'LM6000', 'LMS100': 'LMS100' };
    
    // Filter data by selected product lines if provided
    let filteredData = data || [];
    if (selectedProductLines && selectedProductLines.size > 0) {
      // Convert display names to canonical names for filtering
      const canonicalProductLines = new Set();
      selectedProductLines.forEach(displayName => {
        const canonicalName = productLineMap[displayName] || displayName;
        canonicalProductLines.add(canonicalName);
      });
      
      filteredData = filteredData.filter(program => 
        canonicalProductLines.has(program.engineProgram)
      );
      
      console.log('Filtering data by product lines:', Array.from(selectedProductLines), 
                  '-> canonical:', Array.from(canonicalProductLines),
                  '-> filtered programs:', filteredData.map(p => p.engineProgram));
    }

    filteredData.forEach(program => {
      if (program.engineProgram) {
        filters.productLines.add(program.engineProgram);
      }
      (program.configs || []).forEach(config => {
        if (config.config) filters.configs.add(config.config);
        (config.esns || []).forEach(esn => {
          const y = (esn.targetShipDate || '').split('/').pop();
          if (y) filters.years.add(y);
        });
        (config.level1Parts || []).forEach(l1 => {
          if (l1.supplier) {
            filters.suppliers.add(l1.supplier);
            filters.hwOwners.add(l1.supplier);
          }
          if (l1.pn) filters.partNumbers.add(l1.pn);
          (l1.level2Parts || []).forEach(l2 => {
            if (l2.rmSupplier) filters.rmSuppliers.add(l2.rmSupplier);
            if (l2.pn) filters.partNumbers.add(l2.pn);
            if (l2.rawType) filters.modules.add(l2.rawType);
            (l2.level3Parts || []).forEach(l3 => {
              if (l3.rmSupplier) filters.rmSuppliers.add(l3.rmSupplier);
              if (l3.pn) filters.partNumbers.add(l3.pn);
              if (l3.rawType) filters.modules.add(l3.rawType);
              (l3.level4Parts || []).forEach(l4 => {
                if (l4.rmSupplier) filters.rmSuppliers.add(l4.rmSupplier);
                if (l4.pn) filters.partNumbers.add(l4.pn);
                if (l4.rawType) filters.modules.add(l4.rawType);
                (l4.level5Parts || []).forEach(l5 => {
                  if (l5.rmSupplier) filters.rmSuppliers.add(l5.rmSupplier);
                  if (l5.pn) filters.partNumbers.add(l5.pn);
                  if (l5.rawType) filters.modules.add(l5.rawType);
                });
              });
            });
          });
        });
      });
    });

    return {
      productLines: Array.from(filters.productLines).sort(),
      years: Array.from(filters.years).sort(),
      configs: Array.from(filters.configs).sort(),
      suppliers: Array.from(filters.suppliers).sort(),
      rmSuppliers: Array.from(filters.rmSuppliers).sort(),
      hwOwners: Array.from(filters.hwOwners).sort(),
      partNumbers: Array.from(filters.partNumbers).sort(),
      modules: Array.from(filters.modules).sort()
    };
  }

  // Generate checkbox list HTML
  function generateFilterOptions(values, prefix) {
    return (values || []).map((value, index) => `
      <div class="form-check py-1">
        <input class="form-check-input" type="checkbox" value="${value}" id="${prefix}${index + 1}">
        <label class="form-check-label small" for="${prefix}${index + 1}">${value}</label>
      </div>
    `).join('');
  }

  // Populate a specific filter dropdown
  function populateFilterDropdown(filterId, values, prefix) {
    try {
      const dropdown = (typeof safeQuerySelector !== 'undefined') ? safeQuerySelector(`#${filterId} + .dropdown-menu .dropdown-options`) : document.querySelector(`#${filterId} + .dropdown-menu .dropdown-options`);
      if (dropdown && values && values.length > 0) {
        dropdown.innerHTML = generateFilterOptions(values, prefix);
        console.log(`Populated ${filterId} with ${values.length} options`);
      } else if (!dropdown) {
        console.warn(`Dropdown container not found for ${filterId}`);
      } else {
        console.warn(`No values provided for ${filterId}`);
      }
    } catch (error) {
      console.error(`Error populating filter dropdown ${filterId}:`, error);
    }
  }

  // Update all filter dropdowns based on selected product lines
  function updateFiltersBasedOnProductLines(data, selectedProductLines) {
    try {
      console.log('Updating filters based on selected product lines:', Array.from(selectedProductLines || []));
      
      // Get filtered data based on selected product lines
      const filterData = extractFilterData(data, selectedProductLines);
      
      // Don't update the product line filter itself, just the others
      populateFilterDropdown('yearDropdown', filterData.years, 'year');
      populateFilterDropdown('engConfigDropdown', filterData.configs, 'config');
      populateFilterDropdown('supplierDropdown', filterData.suppliers, 'supplier');
      populateFilterDropdown('rmSupplierDropdown', filterData.rmSuppliers, 'rmSupplier');
      populateFilterDropdown('hwOwnerDropdown', filterData.hwOwners, 'hwOwner');
      populateFilterDropdown('partNoDropdown', filterData.partNumbers, 'partNumber');
      populateFilterDropdown('moduleDropdown', filterData.modules, 'module');

      // Reinitialize filter event handlers after repopulating
      setTimeout(() => {
        try { if (typeof initYearFilter === 'function') initYearFilter(); } catch (e) { console.error('initYearFilter failed:', e); }
        try { if (typeof initConfigFilter === 'function') initConfigFilter(); } catch (e) { console.error('initConfigFilter failed:', e); }
        try { if (typeof initSupplierFilter === 'function') initSupplierFilter(); } catch (e) { console.error('initSupplierFilter failed:', e); }
        try { if (typeof initRMSupplierFilter === 'function') initRMSupplierFilter(); } catch (e) { console.error('initRMSupplierFilter failed:', e); }
        try { if (typeof initHWOwnerFilter === 'function') initHWOwnerFilter(); } catch (e) { console.error('initHWOwnerFilter failed:', e); }
        try { if (typeof initPartNumberFilter === 'function') initPartNumberFilter(); } catch (e) { console.error('initPartNumberFilter failed:', e); }
        try { if (typeof initModuleFilter === 'function') initModuleFilter(); } catch (e) { console.error('initModuleFilter failed:', e); }
      }, 100);

      console.log('Filter options updated:', {
        years: filterData.years.length,
        configs: filterData.configs.length,
        suppliers: filterData.suppliers.length,
        rmSuppliers: filterData.rmSuppliers.length,
        hwOwners: filterData.hwOwners.length,
        partNumbers: filterData.partNumbers.length,
        modules: filterData.modules.length
      });
    } catch (error) {
      console.error('Error updating filters based on product lines:', error);
    }
  }

  // expose to window
  window.updateFiltersBasedOnProductLines = updateFiltersBasedOnProductLines;
})();
