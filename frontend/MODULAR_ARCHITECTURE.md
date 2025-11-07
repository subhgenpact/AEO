# Modular Dashboard Architecture

This document describes the new modular architecture for the demand dashboard, which separates concerns into individual sections for better maintainability and scalability.

## 📁 Directory Structure

```
frontend/
├── src/
│   ├── sections/
│   │   ├── engine-program/
│   │   │   ├── engine-program.js      # Engine Program section logic
│   │   │   └── engine-program.html    # Engine Program template
│   │   ├── supplier/
│   │   │   ├── supplier.js            # Supplier section logic
│   │   │   └── supplier.html          # Supplier template
│   │   ├── rm-supplier/
│   │   │   ├── rm-supplier.js         # RM Supplier section logic
│   │   │   └── rm-supplier.html       # RM Supplier template
│   │   ├── hw-owner/
│   │   │   ├── hw-owner.js            # HW Owner section logic
│   │   │   └── hw-owner.html          # HW Owner template
│   │   └── section-manager.js         # Coordinates all sections
│   ├── demand-modular.js              # Main modular application
│   └── [existing utility files...]
├── demand-modular.html                # Modular HTML page
└── [existing files...]
```

## 🏗️ Architecture Overview

### 1. Section Classes
Each section (Engine Program, Supplier, RM Supplier, HW Owner) is implemented as a JavaScript class with the following structure:

```javascript
class SectionName {
  constructor() {
    this.chartInstance = null;
    this.tableData = [];
    this.paginationManager = null;
  }

  initialize() { /* Setup section */ }
  setupEventListeners() { /* Handle UI events */ }
  renderTable(data) { /* Render table with data */ }
  updateChart(data) { /* Update chart visualization */ }
  subscribeToDataChanges() { /* Subscribe to filter changes */ }
  destroy() { /* Cleanup resources */ }
}
```

### 2. Section Manager
The `SectionManager` class coordinates all sections:
- Initializes all section instances
- Handles navigation between sections
- Manages chart visibility
- Coordinates data updates across sections

### 3. Modular HTML Structure
The HTML uses containers that are dynamically populated with section templates:

```html
<!-- Engine Program Overview (Always Visible) -->
<div id="engine-program-overview-container">
  <!-- Loaded from engine-program.html -->
</div>

<!-- Section Charts -->
<div id="supplier-chart-container"></div>
<div id="rm-supplier-chart-container"></div>
<div id="hw-owner-chart-container"></div>

<!-- Section Tables -->
<div id="supplier-table-container"></div>
<div id="rm-supplier-table-container"></div>
<div id="hw-owner-table-container"></div>
```

## 🔄 Data Flow

1. **Data Loading**: `ChunkLoader` loads data from API
2. **Centralized Management**: `DataFilterManager` handles filtering
3. **Section Updates**: All sections subscribe to data changes
4. **Automatic Re-rendering**: Sections update when filters change

## 🎯 Benefits

### Maintainability
- **Separation of Concerns**: Each section manages its own logic
- **Modular Code**: Easy to modify individual sections
- **Clear Dependencies**: Explicit relationships between components

### Scalability
- **Easy Extension**: Add new sections by creating new classes
- **Independent Development**: Sections can be developed separately
- **Reusable Components**: Section classes can be reused

### Performance
- **Lazy Loading**: Charts render only when sections are active
- **Efficient Updates**: Only active sections update on filter changes
- **Memory Management**: Proper cleanup when sections are destroyed

## 🚀 Usage

### Adding a New Section

1. **Create Section Directory**:
   ```
   src/sections/new-section/
   ├── new-section.js
   └── new-section.html
   ```

2. **Implement Section Class**:
   ```javascript
   class NewSection {
     constructor() { /* Initialize */ }
     initialize() { /* Setup */ }
     renderTable(data) { /* Render table */ }
     updateChart(data) { /* Update chart */ }
     // ... other methods
   }
   ```

3. **Register in Section Manager**:
   ```javascript
   // In section-manager.js
   this.sections.set('new-section', new NewSection());
   ```

4. **Add to HTML**:
   ```html
   <div id="new-section-container"></div>
   ```

### Modifying Existing Sections

1. **Edit Section Class**: Modify the appropriate `.js` file
2. **Update Template**: Modify the corresponding `.html` file
3. **Test Integration**: Ensure section manager integration works

## 🔧 Configuration

### Section Navigation
Add new sections to the navigation pills:
```html
<span class="section-pill" data-target="section-new-section">New Section</span>
```

### Chart Integration
Charts are automatically managed by the section manager. Each section should:
- Initialize its chart in the `initializeChart()` method
- Update charts in the `updateChart()` method
- Handle chart interactions in event handlers

## 📊 Data Integration

### Filter Integration
Sections automatically receive filtered data through the centralized `DataFilterManager`:

```javascript
subscribeToDataChanges() {
  if (window.dataFilterManager) {
    return window.dataFilterManager.subscribe((filteredData) => {
      this.renderTable(filteredData);
      this.updateChart(filteredData);
    });
  }
}
```

### Backward Compatibility
The modular architecture maintains backward compatibility with existing code:
- Global variables are preserved
- Legacy functions are wrapped to use the new architecture
- Existing filter logic continues to work

## 🧪 Testing

### Section Testing
Each section can be tested independently:
```javascript
// Test individual section
const supplierSection = new SupplierSection();
supplierSection.initialize();
supplierSection.renderTable(testData);
```

### Integration Testing
Test section coordination through the section manager:
```javascript
// Test section manager
const sectionManager = new SectionManager();
await sectionManager.initialize();
sectionManager.showSection('supplier');
```

## 🔄 Migration Guide

### From Monolithic to Modular

1. **Identify Section Logic**: Extract section-specific code from `demand.js`
2. **Create Section Classes**: Move logic to appropriate section classes
3. **Update HTML**: Replace inline HTML with template containers
4. **Test Functionality**: Ensure all features work in modular structure
5. **Optimize Performance**: Remove unused code and optimize loading

### Gradual Migration
The architecture supports gradual migration:
- Keep existing `demand.html` for production
- Develop `demand-modular.html` in parallel
- Test modular version thoroughly
- Switch when ready

## 📈 Performance Considerations

### Loading Optimization
- Templates are loaded asynchronously
- Charts render only when sections are visible
- Data filtering is centralized for efficiency

### Memory Management
- Section instances are properly destroyed
- Chart instances are cleaned up
- Event listeners are removed on destroy

### Caching Strategy
- Chart cache is maintained globally
- Pagination managers are reused
- Filter results are cached in the data manager

## 🛠️ Development Workflow

1. **Setup**: Use `demand-modular.html` for development
2. **Section Development**: Work on individual sections in isolation
3. **Integration**: Test with section manager
4. **Performance**: Profile and optimize as needed
5. **Deployment**: Switch to modular version when ready

## 📝 Best Practices

### Code Organization
- Keep section logic in section classes
- Use the section manager for coordination
- Maintain clear separation of concerns

### Error Handling
- Each section handles its own errors
- Section manager provides fallback behavior
- Graceful degradation when sections fail

### Documentation
- Document section interfaces
- Maintain clear API contracts
- Update this document when adding sections

## 🔮 Future Enhancements

### Planned Features
- Dynamic section loading
- Section-specific configuration
- Advanced caching strategies
- Performance monitoring

### Extension Points
- Plugin architecture for custom sections
- Theme support per section
- Advanced filtering per section
- Real-time data updates

---

This modular architecture provides a solid foundation for maintaining and extending the demand dashboard while preserving existing functionality and improving code organization.