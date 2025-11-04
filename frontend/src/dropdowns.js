// Dropdowns and inline actions extracted from demand.html
// Dropdown wiring for filter functionality

(function(){
  // Initialize all dropdowns
  function initializeDropdown(options, selections) {
    selections.clear();
    options.forEach(option => {
      const checkbox = option.querySelector('input[type="checkbox"]');
      if (checkbox?.checked) {
        selections.add(checkbox.value);
      }
    });
  }

  // Engine Config + Supplier + PartNo dropdown functionality
  document.addEventListener('DOMContentLoaded', function () {
    // Prevent dropdown from closing on internal clicks
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.addEventListener('click', function (e) { e.stopPropagation(); });
    });
    document.querySelectorAll('.form-check, .form-check-input, .form-check-label').forEach(el => {
      el.addEventListener('click', function (e) { e.stopPropagation(); });
    });

  // Engine Config functionality
  const searchInput = document.getElementById('engConfigSearch');
  const getConfigOptions = () => document.querySelectorAll('#engConfigDropdown ~ .dropdown-menu .form-check');
    const selectAllBtn = document.getElementById('selectAllConfigs');
    const clearBtn = document.getElementById('clearConfigs');
    const applyBtn = document.getElementById('applyConfigs');
    const dropdownButton = document.getElementById('engConfigDropdown');
    let tempSelections = new Set();

  // Supplier functionality
  const supplierSearchInput = document.getElementById('supplierSearch');
  const getSupplierOptions = () => document.querySelectorAll('#supplierDropdown ~ .dropdown-menu .form-check');
    const selectAllSuppliersBtn = document.getElementById('selectAllSuppliers');
    const clearSuppliersBtn = document.getElementById('clearSuppliers');
    const applySuppliersBtn = document.getElementById('applySuppliers');
    const supplierDropdownBtn = document.getElementById('supplierDropdown');
    let supplierTempSelections = new Set();

  // Part No functionality
  const partNoSearchInput = document.getElementById('partNoSearch');
  const getPartNoOptions = () => document.querySelectorAll('#partNoDropdown ~ .dropdown-menu .form-check');
    const selectAllPartNosBtn = document.getElementById('selectAllPartNos');
    const clearPartNosBtn = document.getElementById('clearPartNos');
    const applyPartNosBtn = document.getElementById('applyPartNos');
    const partNoDropdownBtn = document.getElementById('partNoDropdown');
    let partNoTempSelections = new Set();

    // Supplier functionality wiring
    if (supplierSearchInput) {
      supplierSearchInput.addEventListener('input', function (e) {
        const searchText = e.target.value.toLowerCase();
        getSupplierOptions().forEach(option => {
          const text = option.textContent.toLowerCase();
          option.style.display = text.includes(searchText) ? '' : 'none';
        });
      });

      selectAllSuppliersBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        supplierTempSelections.clear();
        getSupplierOptions().forEach(option => {
          if (option.style.display !== 'none') {
            const checkbox = option.querySelector('input[type="checkbox"]');
            if (checkbox) {
              checkbox.checked = true;
              if (checkbox.value) supplierTempSelections.add(checkbox.value);
            }
          }
        });
      });

      clearSuppliersBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        getSupplierOptions().forEach(option => {
          const checkbox = option.querySelector('input[type="checkbox"]');
          if (checkbox) checkbox.checked = false;
          if (checkbox?.value) supplierTempSelections.delete(checkbox.value);
        });
      });

      // Use event delegation to track changes on dynamic options
      document.querySelector('#supplierDropdown + .dropdown-menu .dropdown-options')?.addEventListener('change', function(e){
        const target = e.target;
        if (target && target.matches('input[type="checkbox"]')) {
          if (target.checked) supplierTempSelections.add(target.value);
          else supplierTempSelections.delete(target.value);
        }
      });

      applySuppliersBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        // Compute from live DOM to be safe
        const selected = Array.from(getSupplierOptions()).filter(o => o.querySelector('input')?.checked).map(o => o.querySelector('input')?.value).filter(Boolean);
        supplierTempSelections = new Set(selected);
        const selectedCount = supplierTempSelections.size;
        if (supplierDropdownBtn) {
          supplierDropdownBtn.textContent = selectedCount === 0 ? 'Supplier' :
            selectedCount === getSupplierOptions().length ? 'All Suppliers' :
              `${selectedCount} Selected`;
        }
        // Persist and apply via global handler
        window.selectedSuppliers = new Set(selected);
        if (typeof applySupplierFilter === 'function') {
          try { applySupplierFilter(selected); } catch (err) { console.error('applySupplierFilter failed', err); }
        }
        supplierDropdownBtn?.click();
      });
    }

  // Part No wiring
  if (partNoSearchInput) {
      partNoSearchInput.addEventListener('input', function (e) {
        const searchText = e.target.value.toLowerCase();
        getPartNoOptions().forEach(option => {
          const text = option.textContent.toLowerCase();
          option.style.display = text.includes(searchText) ? '' : 'none';
        });
      });

      selectAllPartNosBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        partNoTempSelections.clear();
        getPartNoOptions().forEach(option => {
          if (option.style.display !== 'none') {
            const checkbox = option.querySelector('input[type="checkbox"]');
            if (checkbox) {
              checkbox.checked = true;
              if (checkbox.value) partNoTempSelections.add(checkbox.value);
            }
          }
        });
      });

      clearPartNosBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        getPartNoOptions().forEach(option => {
          const checkbox = option.querySelector('input[type="checkbox"]');
          if (checkbox) checkbox.checked = false;
          if (checkbox?.value) partNoTempSelections.delete(checkbox.value);
        });
      });

      document.querySelector('#partNoDropdown + .dropdown-menu .dropdown-options')?.addEventListener('change', function(e){
        const target = e.target;
        if (target && target.matches('input[type="checkbox"]')) {
          if (target.checked) partNoTempSelections.add(target.value);
          else partNoTempSelections.delete(target.value);
        }
      });

      applyPartNosBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        const selected = Array.from(getPartNoOptions()).filter(o => o.querySelector('input')?.checked).map(o => o.querySelector('input')?.value).filter(Boolean);
        partNoTempSelections = new Set(selected);
        const selectedCount = partNoTempSelections.size;
        if (partNoDropdownBtn) {
          partNoDropdownBtn.textContent = selectedCount === 0 ? 'Part No' :
            selectedCount === getPartNoOptions().length ? 'All Part Numbers' :
              `${selectedCount} Selected`;
        }
        // Persist and apply via global handler
        window.selectedPartNumbers = new Set(selected);
        if (typeof applyPartNumberFilter === 'function') {
          try { applyPartNumberFilter(selected); } catch (err) { console.error('applyPartNumberFilter failed', err); }
        }
        partNoDropdownBtn?.click();
      });
    }

    // Engine config search/select/clear/apply
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        const searchText = e.target.value.toLowerCase();
        getConfigOptions().forEach(option => {
          const text = option.textContent.toLowerCase();
          option.style.display = text.includes(searchText) ? '' : 'none';
        });
      });

      selectAllBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        getConfigOptions().forEach(option => {
          const checkbox = option.querySelector('input[type="checkbox"]');
          if (option.style.display !== 'none' && checkbox) {
            checkbox.checked = true;
            tempSelections.add(checkbox.value);
          }
        });
      });

      clearBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        getConfigOptions().forEach(option => {
          const checkbox = option.querySelector('input[type="checkbox"]');
          if (checkbox) checkbox.checked = false;
          if (checkbox?.value) tempSelections.delete(checkbox.value);
        });
      });

      function updateDropdownText(selectedCount) {
        if (selectedCount === 0) {
          dropdownButton.textContent = 'Engine Config';
        } else if (selectedCount === getConfigOptions().length) {
          dropdownButton.textContent = 'All Configs';
        } else {
          dropdownButton.textContent = `${selectedCount} Selected`;
        }
      }

      applyBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        // Compute from live DOM for reliability
        const opts = Array.from(getConfigOptions());
        const selectedConfigs = opts
          .map(o => o.querySelector('input'))
          .filter(cb => cb && cb.checked)
          .map(cb => cb.value);
        tempSelections = new Set(selectedConfigs);
        updateDropdownText(selectedConfigs.length);
        // Persist and apply via global handler
        window.selectedConfigs = new Set(selectedConfigs);
        if (typeof applyConfigFilter === 'function') {
          try { applyConfigFilter(selectedConfigs); } catch (err) { console.error('applyConfigFilter failed', err); }
        }
        dropdownButton?.click();
      });

      // Local updateFilteredData removed; global applyConfigFilter handles tables/charts/chips

      window.clearEngineConfigFilter = function () {
        tempSelections.clear();
        Array.from(getConfigOptions()).forEach(option => {
          const checkbox = option.querySelector('input[type="checkbox"]');
          if (checkbox) checkbox.checked = false;
        });
        dropdownButton.textContent = 'Engine Config';
        window.selectedConfigs = new Set();
        if (typeof applyConfigFilter === 'function') {
          try { applyConfigFilter([]); } catch (err) { console.error(err); }
        }
      };

      dropdownButton?.addEventListener('click', function () {
        if (!this.classList.contains('show')) {
          initializeDropdown(getConfigOptions(), tempSelections);
        }
      });

      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.addEventListener('click', function (e) {
          e.stopPropagation();
        });
      });

      document.querySelectorAll('.form-check').forEach(check => {
        check.addEventListener('click', function (e) {
          e.stopPropagation();
        });
      });

      document.querySelectorAll('.form-check-input').forEach(checkbox => {
        checkbox.addEventListener('click', function (e) {
          e.stopPropagation();
        });
      });

      document.querySelectorAll('.form-check-label').forEach(label => {
        label.addEventListener('click', function (e) {
          e.stopPropagation();
        });
      });
    }
  });
})();
