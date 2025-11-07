// Utility helpers extracted from demand.js (classic script, global attach)
(function(){
  function safeGetElement(id, context = document) {
    try {
      const element = context.getElementById ? context.getElementById(id) : context.querySelector(`#${id}`);
      if (!element) {
        console.warn(`Element with ID '${id}' not found`);
      }
      return element;
    } catch (error) {
      console.error(`Error getting element '${id}':`, error);
      return null;
    }
  }

  function safeQuerySelector(selector, context = document) {
    try {
      const element = context.querySelector(selector);
      if (!element) {
        console.warn(`Element with selector '${selector}' not found`);
      }
      return element;
    } catch (error) {
      console.error(`Error querying selector '${selector}':`, error);
      return null;
    }
  }

  function safeQuerySelectorAll(selector, context = document) {
    try {
      return context.querySelectorAll(selector);
    } catch (error) {
      console.error(`Error querying selector '${selector}':`, error);
      return [];
    }
  }

  // Extract year from date string format dd/mm/yyyy or mm/dd/yyyy as used in data
  function getYearFromDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // Assume last part is year
      const y = parts[2].trim();
      return y;
    }
    // Fallback: try to match 4-digit year anywhere
    const match = dateStr.match(/(\d{4})/);
    return match ? match[1] : null;
  }

  // Expose globally
  window.safeGetElement = safeGetElement;
  window.safeQuerySelector = safeQuerySelector;
  window.safeQuerySelectorAll = safeQuerySelectorAll;
  window.getYearFromDate = getYearFromDate;
})();

// ===== TABLE PAGINATION MANAGER =====
// Reusable pagination component for tables
class TablePaginationManager {
  constructor(tableId, renderCallback) {
    this.tableId = tableId;
    this.renderCallback = renderCallback;
    this.currentPage = 1;
    this.pageSize = 10;
    this.totalRecords = 0;
    this.allData = [];
    this.paginationContainer = null;
  }

  initialize(containerId) {
    this.paginationContainer = document.getElementById(containerId);
    if (!this.paginationContainer) {
      console.warn(`Pagination container ${containerId} not found`);
    }
  }

  setData(data) {
    this.allData = data;
    this.totalRecords = data.length;
    this.currentPage = 1;
  }

  getPageData() {
    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    return this.allData.slice(startIdx, endIdx);
  }

  getTotalPages() {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  renderTable() {
    const pageData = this.getPageData();
    this.renderCallback(pageData, this.allData);
    this.renderPaginationControls();
  }

  renderPaginationControls() {
    if (!this.paginationContainer || this.totalRecords === 0) return;

    const totalPages = this.getTotalPages();
    const startRecord = (this.currentPage - 1) * this.pageSize + 1;
    const endRecord = Math.min(this.currentPage * this.pageSize, this.totalRecords);

    this.paginationContainer.innerHTML = `
      <div class="d-flex justify-content-between align-items-center" style="font-size: 0.85rem;">
        <div class="text-muted">
          Showing ${startRecord}-${endRecord} of ${this.totalRecords} records
        </div>
        <div class="d-flex align-items-center gap-2">
          <select class="form-select form-select-sm" style="width: auto;" id="${this.tableId}-pageSize">
            <option value="10" ${this.pageSize === 10 ? 'selected' : ''}>10</option>
            <option value="25" ${this.pageSize === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100</option>
          </select>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="window.paginationManagers['${this.tableId}'].goToPage(1)">
              <i class="fas fa-angle-double-left"></i>
            </button>
            <button class="btn btn-outline-secondary" ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="window.paginationManagers['${this.tableId}'].goToPage(${this.currentPage - 1})">
              <i class="fas fa-angle-left"></i>
            </button>
            <span class="btn btn-outline-secondary disabled">
              Page ${this.currentPage} of ${totalPages}
            </span>
            <button class="btn btn-outline-secondary" ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="window.paginationManagers['${this.tableId}'].goToPage(${this.currentPage + 1})">
              <i class="fas fa-angle-right"></i>
            </button>
            <button class="btn btn-outline-secondary" ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="window.paginationManagers['${this.tableId}'].goToPage(${totalPages})">
              <i class="fas fa-angle-double-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach page size change handler
    const pageSizeSelect = document.getElementById(`${this.tableId}-pageSize`);
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        this.pageSize = parseInt(e.target.value);
        this.currentPage = 1;
        this.renderTable();
      });
    }
  }

  goToPage(page) {
    const totalPages = this.getTotalPages();
    if (page < 1 || page > totalPages) return;
    this.currentPage = page;
    this.renderTable();
  }
}

// Global pagination managers storage
window.paginationManagers = {};
window.TablePaginationManager = TablePaginationManager;
