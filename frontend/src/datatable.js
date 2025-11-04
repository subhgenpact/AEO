/**
 * DataTable Module
 * Handles loading, filtering, and displaying data from data-aeo.duckdb
 */

class CheckboxDropdown {
  constructor(elementId, placeholder = 'Select...') {
    this.elementId = elementId;
    this.placeholder = placeholder;
    this.container = document.getElementById(elementId);
    this.selectedValues = [];
    this.options = [];
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <button class="checkbox-dropdown-toggle" type="button">
        <span class="dropdown-toggle-text">${this.placeholder}</span>
        <span class="dropdown-caret">▼</span>
      </button>
      <div class="checkbox-dropdown-menu"></div>
    `;

    this.toggle = this.container.querySelector('.checkbox-dropdown-toggle');
    this.menu = this.container.querySelector('.checkbox-dropdown-menu');
    this.toggleText = this.container.querySelector('.dropdown-toggle-text');

    // Event listeners
    this.toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    const isOpen = this.menu.classList.contains('show');
    this.closeAllDropdowns();
    
    if (!isOpen) {
      this.menu.classList.add('show');
      this.toggle.classList.add('active');
    }
  }

  closeMenu() {
    this.menu.classList.remove('show');
    this.toggle.classList.remove('active');
  }

  closeAllDropdowns() {
    document.querySelectorAll('.checkbox-dropdown-menu').forEach(menu => {
      menu.classList.remove('show');
    });
    document.querySelectorAll('.checkbox-dropdown-toggle').forEach(toggle => {
      toggle.classList.remove('active');
    });
  }

  setOptions(options) {
    this.options = options;
    this.menu.innerHTML = '';

    if (options.length === 0) {
      this.menu.innerHTML = '<div class="checkbox-dropdown-item" style="color: #999;">No options available</div>';
      return;
    }

    options.forEach((option, index) => {
      const item = document.createElement('div');
      item.className = 'checkbox-dropdown-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `${this.elementId}_option_${index}`;
      checkbox.value = option;
      checkbox.checked = this.selectedValues.includes(option);
      
      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = option;
      
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (!this.selectedValues.includes(option)) {
            this.selectedValues.push(option);
          }
        } else {
          this.selectedValues = this.selectedValues.filter(v => v !== option);
        }
        this.updateToggleText();
      });
      
      item.appendChild(checkbox);
      item.appendChild(label);
      this.menu.appendChild(item);
    });
  }

  updateToggleText() {
    if (this.selectedValues.length === 0) {
      this.toggleText.textContent = this.placeholder;
      this.toggleText.classList.remove('has-selection');
    } else if (this.selectedValues.length === 1) {
      this.toggleText.textContent = this.selectedValues[0];
      this.toggleText.classList.add('has-selection');
    } else {
      this.toggleText.textContent = `${this.selectedValues.length} selected`;
      this.toggleText.classList.add('has-selection');
    }
  }

  getSelectedValues() {
    return this.selectedValues;
  }

  reset() {
    this.selectedValues = [];
    this.menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
    this.updateToggleText();
  }
}

class DataTableManager {
  constructor() {
    console.log('📊 Initializing DataTableManager...');
    
    this.totalRecords = 0;
    this.currentPage = 1;
    this.itemsPerPage = 10; // Default to 10 items per page
    this.filterValues = {
      productLine: [],
      year: '',
      engineConfig: [],
      supplier: [],
      rmSupplier: [],
      hwOwner: [],
      module: [],
      partNumber: []
    };
    
    // Initialize checkbox dropdowns
    this.dropdowns = {
      productLine: new CheckboxDropdown('filterProductLine', 'Select Product Line...'),
      engineConfig: new CheckboxDropdown('filterEngineConfig', 'Select Configuration...'),
      supplier: new CheckboxDropdown('filterSupplier', 'Select Supplier...'),
      rmSupplier: new CheckboxDropdown('filterRMSupplier', 'Select RM Supplier...'),
      hwOwner: new CheckboxDropdown('filterHWOwner', 'Select HW Owner...'),
      module: new CheckboxDropdown('filterModule', 'Select Module...'),
      partNumber: new CheckboxDropdown('filterPartNumber', 'Select Part Number...')
    };
    
    this.init();
  }

  init() {
    console.log('⚙️ Setting up event listeners...');
    
    // Event listeners for filter buttons
    document.getElementById('btnApplyFilters').addEventListener('click', () => this.applyFilters());
    document.getElementById('btnResetFilters').addEventListener('click', () => this.resetFilters());
    document.getElementById('btnExportCSV').addEventListener('click', () => this.exportToCSV());
    
    // Pagination event listeners
    document.getElementById('btnFirstPage').addEventListener('click', () => this.goToFirstPage());
    document.getElementById('btnPrevPage').addEventListener('click', () => this.goToPrevPage());
    document.getElementById('btnNextPage').addEventListener('click', () => this.goToNextPage());
    document.getElementById('btnLastPage').addEventListener('click', () => this.goToLastPage());
    document.getElementById('itemsPerPage').addEventListener('change', (e) => this.changeItemsPerPage(e.target.value));
    
    // Load data on initialization
    this.loadData();
  }

  async loadData() {
    console.log('📥 Loading filter options and initial data from API...');
    
    try {
      // Show loading message while fetching
      const tableContainer = document.getElementById('tableContainer');
      tableContainer.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><p>Loading filter options and initial data...</p></div>';
      
      // Step 1: Load filter options from server (fast with DuckDB)
      console.log('📦 Fetching filter options from server...');
      const filterResponse = await fetch('/api/datatable/filter-options');
      if (!filterResponse.ok) {
        throw new Error(`HTTP error! status: ${filterResponse.status}`);
      }
      const filterResult = await filterResponse.json();
      console.log(`✓ Filter options loaded in ${filterResult.execution_time_ms}ms`);
      
      // Populate filter dropdowns immediately
      this.populateFiltersFromServer(filterResult.filterOptions);
      
      // Step 2: Load initial data (first page with default items)
      console.log(`📦 Fetching initial data (${this.itemsPerPage} records)...`);
      await this.fetchFilteredData();
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
      this.showError('Failed to load data: ' + error.message);
    }
  }

  async fetchFilteredData() {
    /**
     * Fetch filtered data from server using DuckDB SQL filtering
     * This is MUCH faster than loading all data and filtering client-side
     */
    try {
      const tableContainer = document.getElementById('tableContainer');
      
      // Calculate skip based on current page
      const skip = (this.currentPage - 1) * this.itemsPerPage;
      const limit = this.itemsPerPage;
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('skip', skip);
      params.append('limit', limit);
      
      // Add filters
      if (this.filterValues.productLine.length > 0) {
        this.filterValues.productLine.forEach(v => params.append('productLines', v));
      }
      if (this.filterValues.year) {
        params.append('year', this.filterValues.year);
      }
      if (this.filterValues.engineConfig.length > 0) {
        this.filterValues.engineConfig.forEach(v => params.append('configs', v));
      }
      if (this.filterValues.supplier.length > 0) {
        this.filterValues.supplier.forEach(v => params.append('suppliers', v));
      }
      if (this.filterValues.rmSupplier.length > 0) {
        this.filterValues.rmSupplier.forEach(v => params.append('rmSuppliers', v));
      }
      if (this.filterValues.hwOwner.length > 0) {
        this.filterValues.hwOwner.forEach(v => params.append('hwOwners', v));
      }
      if (this.filterValues.module.length > 0) {
        this.filterValues.module.forEach(v => params.append('modules', v));
      }
      if (this.filterValues.partNumber.length > 0) {
        this.filterValues.partNumber.forEach(v => params.append('partNumbers', v));
      }
      
      // Fetch from server
      const response = await fetch(`/api/datatable/filter?${params.toString()}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`✓ Filtered data loaded in ${result.execution_time_ms}ms: ${result.returned_rows} records (total: ${result.total})`);
      
      // Update internal state
      this.totalRecords = result.total;
      
      // Display the data
      this.displayTable(result.data);
      this.updateRecordCount();
      this.updatePaginationControls();
      
    } catch (error) {
      console.error('❌ Error fetching filtered data:', error);
      this.showError('Failed to fetch data: ' + error.message);
    }
  }

  populateFiltersFromServer(filterOptions) {
    console.log('🔄 Populating filter dropdowns from server data...');
    
    // Populate checkbox dropdowns with server-provided unique values
    this.dropdowns.productLine.setOptions(filterOptions.productLines || []);
    this.dropdowns.engineConfig.setOptions(filterOptions.configs || []);
    this.dropdowns.supplier.setOptions(filterOptions.suppliers || []);
    this.dropdowns.rmSupplier.setOptions(filterOptions.rmSuppliers || []);
    this.dropdowns.hwOwner.setOptions(filterOptions.hwOwners || []);
    this.dropdowns.module.setOptions(filterOptions.modules || []);
    this.dropdowns.partNumber.setOptions(filterOptions.partNumbers || []);
    
    // Populate year select (simple dropdown)
    this.populateYearSelect('filterYear', filterOptions.years || []);
    
    console.log('✓ Filters populated from server');
  }

  populateFilters() {
    console.log('🔄 Populating filter dropdowns...');
    
    // This method is deprecated - we use populateFiltersFromServer instead
    // Keeping for backward compatibility
    
    console.log('✓ Filters populated');
  }

  populateSelect(selectId, options) {
    // Deprecated - kept for backward compatibility
    // Checkbox dropdowns are populated via setOptions() method
  }

  populateYearSelect(selectId, years) {
    const select = document.getElementById(selectId);
    
    // Clear existing options (keep the default)
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // Add year options
    years.forEach(year => {
      const opt = document.createElement('option');
      opt.value = year;
      opt.textContent = year;
      select.appendChild(opt);
    });
  }

  applyFilters() {
    console.log('🔍 Applying filters (server-side)...');
    
    // Get filter values from checkbox dropdowns
    this.filterValues.productLine = this.dropdowns.productLine.getSelectedValues();
    this.filterValues.year = document.getElementById('filterYear').value;
    this.filterValues.engineConfig = this.dropdowns.engineConfig.getSelectedValues();
    this.filterValues.supplier = this.dropdowns.supplier.getSelectedValues();
    this.filterValues.rmSupplier = this.dropdowns.rmSupplier.getSelectedValues();
    this.filterValues.hwOwner = this.dropdowns.hwOwner.getSelectedValues();
    this.filterValues.module = this.dropdowns.module.getSelectedValues();
    this.filterValues.partNumber = this.dropdowns.partNumber.getSelectedValues();
    
    console.log('📋 Filter values:', this.filterValues);
    
    // Reset to page 1 when applying filters
    this.currentPage = 1;
    
    // Fetch filtered data from server (DuckDB will do the heavy lifting)
    this.fetchFilteredData();
  }

  resetFilters() {
    console.log('🔄 Resetting filters...');
    
    // Reset checkbox dropdowns
    this.dropdowns.productLine.reset();
    this.dropdowns.engineConfig.reset();
    this.dropdowns.supplier.reset();
    this.dropdowns.rmSupplier.reset();
    this.dropdowns.hwOwner.reset();
    this.dropdowns.module.reset();
    this.dropdowns.partNumber.reset();
    
    // Reset year select
    document.getElementById('filterYear').selectedIndex = 0;
    
    // Reset filter values
    this.filterValues = {
      productLine: [],
      year: '',
      engineConfig: [],
      supplier: [],
      rmSupplier: [],
      hwOwner: [],
      module: [],
      partNumber: []
    };
    
    // Reset to page 1
    this.currentPage = 1;
    
    // Fetch all data (no filters)
    this.fetchFilteredData();
    
    console.log('✓ Filters reset');
  }

  displayTable(data) {
    console.log('📊 Rendering table with', data.length, 'records...');
    
    const tableContainer = document.getElementById('tableContainer');
    
    if (data.length === 0) {
      tableContainer.innerHTML = '<div class="no-data-message">No data found matching the selected filters.</div>';
      return;
    }
    
    // Get all unique column names from data
    const columns = data.length > 0 ? Object.keys(data[0]).sort() : [];
    
    // Create table HTML
    let tableHTML = '<table class="table data-table w-100">';
    
    // Table header
    tableHTML += '<thead><tr>';
    columns.forEach(col => {
      tableHTML += `<th>${this.formatColumnName(col)}</th>`;
    });
    tableHTML += '</tr></thead>';
    
    // Table body
    tableHTML += '<tbody>';
    data.forEach(row => {
      tableHTML += '<tr>';
      columns.forEach(col => {
        const value = row[col];
        const displayValue = value === null || value === undefined ? '-' : this.formatValue(value);
        tableHTML += `<td>${this.escapeHtml(displayValue)}</td>`;
      });
      tableHTML += '</tr>';
    });
    tableHTML += '</tbody>';
    
    tableHTML += '</table>';
    
    tableContainer.innerHTML = tableHTML;
    console.log('✓ Table rendered');
  }

  formatColumnName(columnName) {
    // Convert underscore_case to Title Case
    return columnName
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  formatValue(value) {
    // Format dates
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(value).toLocaleDateString();
    }
    
    // Format numbers
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    return String(value);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateRecordCount() {
    const total = this.totalRecords;
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, total);
    
    let message = '';
    if (total > 0) {
      message = `Showing ${start.toLocaleString()}-${end.toLocaleString()} of ${total.toLocaleString()} records`;
    } else {
      message = 'No records found';
    }
    
    document.getElementById('recordCount').textContent = message;
  }

  updatePaginationControls() {
    const totalPages = Math.ceil(this.totalRecords / this.itemsPerPage);
    
    // Update page info
    document.getElementById('pageInfo').textContent = `Page ${this.currentPage} of ${totalPages}`;
    
    // Enable/disable buttons
    document.getElementById('btnFirstPage').disabled = this.currentPage === 1;
    document.getElementById('btnPrevPage').disabled = this.currentPage === 1;
    document.getElementById('btnNextPage').disabled = this.currentPage >= totalPages;
    document.getElementById('btnLastPage').disabled = this.currentPage >= totalPages;
  }

  goToFirstPage() {
    this.currentPage = 1;
    this.fetchFilteredData();
  }

  goToPrevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchFilteredData();
    }
  }

  goToNextPage() {
    const totalPages = Math.ceil(this.totalRecords / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.fetchFilteredData();
    }
  }

  goToLastPage() {
    const totalPages = Math.ceil(this.totalRecords / this.itemsPerPage);
    this.currentPage = totalPages;
    this.fetchFilteredData();
  }

  changeItemsPerPage(value) {
    this.itemsPerPage = parseInt(value);
    this.currentPage = 1; // Reset to first page
    this.fetchFilteredData();
  }

  exportToCSV() {
    console.log('💾 Exporting to CSV...');
    
    alert('CSV export will export the currently filtered results. This feature needs to be implemented with server-side export for large datasets.');
    
    // TODO: Implement server-side CSV export endpoint
    // For now, just show a message
    console.log('✓ CSV export placeholder');
  }

  showError(message) {
    const tableContainer = document.getElementById('tableContainer');
    tableContainer.innerHTML = `<div class="alert alert-danger">${message}</div>`;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DataTable page loaded');
  new DataTableManager();
});
