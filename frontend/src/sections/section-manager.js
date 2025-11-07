/**
 * Section Manager
 * Coordinates all dashboard sections and handles navigation between them
 */

class SectionManager {
  constructor() {
    this.sections = new Map();
    this.currentSection = null;
    this.initialized = false;
  }

  /**
   * Initialize all sections
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize all section instances
      this.sections.set('engine-program', new EngineProgramSection());
      this.sections.set('supplier', new SupplierSection());
      this.sections.set('rm-supplier', new RMSupplierSection());
      this.sections.set('hw-owner', new HWOwnerSection());

      // Initialize each section
      for (const [name, section] of this.sections) {
        try {
          await section.initialize();
          console.log(`✅ ${name} section initialized`);
        } catch (error) {
          console.error(`❌ Error initializing ${name} section:`, error);
        }
      }

      // Setup section navigation
      this.setupSectionNavigation();

      // Subscribe all sections to data changes
      this.subscribeAllSectionsToDataChanges();

      // Set default section
      this.showSection('supplier');

      this.initialized = true;
      console.log('✅ Section Manager initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Section Manager:', error);
    }
  }

  /**
   * Setup section navigation pills
   */
  setupSectionNavigation() {
    const pills = document.querySelectorAll('#sectionPills .section-pill');
    
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        const targetSection = e.target.dataset.target;
        if (targetSection) {
          // Extract section name from target (e.g., 'section-supplier' -> 'supplier')
          const sectionName = targetSection.replace('section-', '');
          this.showSection(sectionName);
        }
      });
    });
  }

  /**
   * Show a specific section
   */
  showSection(sectionName, skipChartRender = false) {
    try {
      // Hide all sections
      const allSectionElements = [
        'section-supplier', 
        'section-rm-supplier', 
        'section-hw-owner', 
        'section-engine-program'
      ];
      
      allSectionElements.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.classList.add('d-none');
        }
      });

      // Show target section
      const targetSectionId = `section-${sectionName}`;
      const targetElement = document.getElementById(targetSectionId);
      if (targetElement) {
        targetElement.classList.remove('d-none');
      }

      // Update active pill
      const pills = document.querySelectorAll('#sectionPills .section-pill');
      pills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.target === targetSectionId);
      });

      // Show/hide appropriate charts
      this.toggleCharts(sectionName);

      // Update current section
      this.currentSection = sectionName;

      // Render charts for the active section (unless skipped during initial load)
      if (!skipChartRender) {
        this.renderChartsForSection(sectionName);
      }

      console.log(`📍 Switched to ${sectionName} section`);
    } catch (error) {
      console.error(`❌ Error showing section ${sectionName}:`, error);
    }
  }

  /**
   * Toggle chart visibility based on active section
   */
  toggleCharts(sectionName) {
    const chartElements = {
      'engine-program': 'chart-program',
      'supplier': 'chart-supplier',
      'rm-supplier': 'chart-rm-level',
      'hw-owner': 'chart-hwowner'
    };

    // Hide all charts
    Object.values(chartElements).forEach(chartId => {
      const chart = document.getElementById(chartId);
      if (chart) {
        chart.classList.add('d-none');
      }
    });

    // Show chart for active section
    const activeChartId = chartElements[sectionName];
    if (activeChartId) {
      const activeChart = document.getElementById(activeChartId);
      if (activeChart) {
        activeChart.classList.remove('d-none');
      }
    }
  }

  /**
   * Render charts for a specific section
   */
  renderChartsForSection(sectionName) {
    const section = this.sections.get(sectionName);
    if (section && typeof section.updateChart === 'function') {
      try {
        section.updateChart();
        console.log(`📊 Updated chart for ${sectionName} section`);
      } catch (error) {
        console.error(`❌ Error updating chart for ${sectionName}:`, error);
      }
    }
  }

  /**
   * Subscribe all sections to data changes
   */
  subscribeAllSectionsToDataChanges() {
    for (const [name, section] of this.sections) {
      if (typeof section.subscribeToDataChanges === 'function') {
        try {
          section.subscribeToDataChanges();
          console.log(`🔔 ${name} section subscribed to data changes`);
        } catch (error) {
          console.error(`❌ Error subscribing ${name} section to data changes:`, error);
        }
      }
    }
  }

  /**
   * Update all sections with new data
   */
  updateAllSections(data) {
    for (const [name, section] of this.sections) {
      try {
        if (typeof section.renderTable === 'function') {
          section.renderTable(data);
        }
        if (typeof section.updateChart === 'function') {
          section.updateChart(data);
        }
        console.log(`🔄 Updated ${name} section with new data`);
      } catch (error) {
        console.error(`❌ Error updating ${name} section:`, error);
      }
    }
  }

  /**
   * Get current active section
   */
  getCurrentSection() {
    return this.currentSection;
  }

  /**
   * Get section instance by name
   */
  getSection(sectionName) {
    return this.sections.get(sectionName);
  }

  /**
   * Destroy all sections
   */
  destroy() {
    for (const [name, section] of this.sections) {
      try {
        if (typeof section.destroy === 'function') {
          section.destroy();
        }
        console.log(`🗑️ Destroyed ${name} section`);
      } catch (error) {
        console.error(`❌ Error destroying ${name} section:`, error);
      }
    }
    
    this.sections.clear();
    this.currentSection = null;
    this.initialized = false;
  }

  /**
   * Refresh current section
   */
  refreshCurrentSection() {
    if (this.currentSection) {
      const section = this.sections.get(this.currentSection);
      if (section) {
        try {
          const currentData = window.dataFilterManager ? 
            window.dataFilterManager.getFilteredData() : 
            window.RAW_DATA;
          
          if (typeof section.renderTable === 'function') {
            section.renderTable(currentData);
          }
          if (typeof section.updateChart === 'function') {
            section.updateChart(currentData);
          }
          
          console.log(`🔄 Refreshed ${this.currentSection} section`);
        } catch (error) {
          console.error(`❌ Error refreshing ${this.currentSection} section:`, error);
        }
      }
    }
  }
}

// Create global instance
window.sectionManager = new SectionManager();

// Export for use in other modules
window.SectionManager = SectionManager;

console.log('✅ SectionManager loaded and exported to window');