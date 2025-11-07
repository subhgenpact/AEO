/**
 * Filter Initialization Functions
 * Contains all the individual filter setup functions for the modular dashboard
 */

// ===== Product Line Filter Implementation =====
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
  if (window.dataFilterManager) {
    window.dataFilterManager.updateFilter('productLines', window.selectedProductLines);
  }
}

// ===== Year Filter Implementation =====
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
  if (window.dataFilterManager) {
    window.dataFilterManager.updateFilter('years', window.selectedYears);
  }
}

// ===== Config Filter Implementation =====
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

// ===== Supplier Filter Implementation =====
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

// ===== RM Supplier Filter Implementation =====
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

// ===== HW Owner Filter Implementation =====
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

// ===== Part Number Filter Implementation =====
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

// ===== Module Filter Implementation =====
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

// ===== Clear All Filters Implementation =====
function initClearAllFiltersButton() {
  const clearAllBtn = document.getElementById('clearAllFilters');
  
  // Initially hide the button
  if (clearAllBtn) {
    clearAllBtn.style.display = 'none';
  }
  
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      console.log('🗑️ Clear All Filters clicked');
      
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
      if (window.dataFilterManager) {
        window.dataFilterManager.clearAllFilters();
      }
      
      console.log('✅ All filters cleared');
    });
  }
}

// ===== Apply Filter Functions =====
function applyConfigFilter(selectedConfigs) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedConfigs !== undefined) {
    window.selectedConfigs = new Set(selectedConfigs);
  }
  // Use centralized data manager to apply filter
  if (window.dataFilterManager) {
    window.dataFilterManager.updateFilter('configs', window.selectedConfigs);
  }
}

function applySupplierFilter(selectedSuppliers) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedSuppliers !== undefined) {
    window.selectedSuppliers = new Set(selectedSuppliers);
  }
  // Use centralized data manager to apply filter
  if (window.dataFilterManager) {
    window.dataFilterManager.updateFilter('suppliers', window.selectedSuppliers);
  }
}

function applyRMSupplierFilter(selectedRMSuppliers) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedRMSuppliers !== undefined) {
    window.selectedRMSuppliers = new Set(selectedRMSuppliers);
  }
  // Use centralized data manager to apply filter
  if (window.dataFilterManager) {
    window.dataFilterManager.updateFilter('rmSuppliers', window.selectedRMSuppliers);
  }
}

function applyHWOwnerFilter(selectedOwners) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedOwners !== undefined) {
    window.selectedHWOwners = new Set(selectedOwners);
  }
  // Use centralized data manager to apply filter
  if (window.dataFilterManager) {
    window.dataFilterManager.updateFilter('hwOwners', window.selectedHWOwners);
  }
}

function applyPartNumberFilter(selectedPartNumbers) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedPartNumbers !== undefined) {
    window.selectedPartNumbers = new Set(selectedPartNumbers);
  }
  // Use centralized data manager to apply filter
  if (window.dataFilterManager) {
    window.dataFilterManager.updateFilter('partNumbers', window.selectedPartNumbers);
  }
}

function applyModuleFilter(selectedModules) {
  // Handle both cases: with parameters (from dropdowns.js) and without (from button clicks)
  if (selectedModules !== undefined) {
    window.selectedModules = new Set(selectedModules);
  }
  // Use centralized data manager to apply filter
  if (window.dataFilterManager) {
    window.dataFilterManager.updateFilter('modules', window.selectedModules);
  }
}

// ===== Update Clear All Button Visibility =====
function updateClearAllButtonVisibility() {
  const clearAllBtn = document.getElementById('clearAllFilters');
  if (!clearAllBtn) return;
  
  // Check if any filters are selected using centralized dataFilterManager
  if (!window.dataFilterManager) return;
  
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

// Export functions to global scope
window.initProductLineFilter = initProductLineFilter;
window.initYearFilter = initYearFilter;
window.initConfigFilter = initConfigFilter;
window.initSupplierFilter = initSupplierFilter;
window.initRMSupplierFilter = initRMSupplierFilter;
window.initHWOwnerFilter = initHWOwnerFilter;
window.initPartNumberFilter = initPartNumberFilter;
window.initModuleFilter = initModuleFilter;
window.initClearAllFiltersButton = initClearAllFiltersButton;

window.updateProductLineButtonText = updateProductLineButtonText;
window.updateYearButtonText = updateYearButtonText;
window.updateClearAllButtonVisibility = updateClearAllButtonVisibility;

window.applyProductLineFilter = applyProductLineFilter;
window.applyYearFilterNew = applyYearFilterNew;
window.applyConfigFilter = applyConfigFilter;
window.applySupplierFilter = applySupplierFilter;
window.applyRMSupplierFilter = applyRMSupplierFilter;
window.applyHWOwnerFilter = applyHWOwnerFilter;
window.applyPartNumberFilter = applyPartNumberFilter;
window.applyModuleFilter = applyModuleFilter;