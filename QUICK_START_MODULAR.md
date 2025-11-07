# Quick Start Guide - Modular Demand Dashboard

## 🚀 Getting Started

### 1. Start the Server

```bash
python main.py
```

The server will start on `http://localhost:8000`

### 2. Access the Dashboard

**Modular Version (New):**
```
http://localhost:8000/demand-modular
```

**Classic Version (Original):**
```
http://localhost:8000/demand
```

## 📂 Project Structure

```
frontend/
├── demand-modular.html          # Main HTML for modular version
├── src/
│   ├── demand-modular.js        # Main application logic
│   ├── data-filter-manager.js   # Centralized filtering
│   ├── pagination-manager.js    # Table pagination
│   ├── filter-initializers.js   # Filter setup functions
│   ├── filter-chips.js          # Filter UI utilities
│   ├── sections/
│   │   ├── section-manager.js   # Coordinates all sections
│   │   ├── engine-program/
│   │   │   ├── engine-program.js
│   │   │   └── engine-program.html
│   │   ├── supplier/
│   │   │   ├── supplier.js
│   │   │   └── supplier.html
│   │   ├── rm-supplier/
│   │   │   ├── rm-supplier.js
│   │   │   └── rm-supplier.html
│   │   └── hw-owner/
│   │       ├── hw-owner.js
│   │       └── hw-owner.html
│   └── [other utility files...]
└── [other files...]
```

## 🔧 Key Components

### DataFilterManager
**File:** `src/data-filter-manager.js`

Centralized filter management system:
```javascript
// Access the global instance
window.dataFilterManager

// Set raw data
window.dataFilterManager.setRawData(data);

// Apply a filter
window.dataFilterManager.updateFilter('years', new Set(['2025', '2026']));

// Get filtered data
const filtered = window.dataFilterManager.getFilteredData();

// Subscribe to changes
window.dataFilterManager.subscribe((filteredData) => {
  console.log('Data updated:', filteredData);
});
```

### SectionManager
**File:** `src/sections/section-manager.js`

Coordinates all dashboard sections:
```javascript
// Access the global instance
window.sectionManager

// Show a section
window.sectionManager.showSection('supplier');

// Get a section instance
const supplierSection = window.sectionManager.getSection('supplier');

// Update all sections
window.sectionManager.updateAllSections(newData);
```

### Section Classes
**Files:** `src/sections/*/[section-name].js`

Each section is a self-contained class:
```javascript
class SupplierSection {
  initialize()           // Setup section
  renderTable(data)      // Render table with data
  updateChart(data)      // Update chart visualization
  subscribeToDataChanges() // Subscribe to filter changes
  destroy()              // Cleanup resources
}
```

## 🎯 Common Tasks

### Adding a New Filter

1. **Add filter state** in `demand-modular.js`:
```javascript
if (!window.selectedNewFilter) window.selectedNewFilter = new Set();
```

2. **Add filter to DataFilterManager** in `data-filter-manager.js`:
```javascript
this.filters = {
  // ... existing filters
  newFilter: new Set()
};
```

3. **Create initialization function** in `filter-initializers.js`:
```javascript
function initNewFilter() {
  // Setup event listeners
  // Handle apply, clear, search
}
window.initNewFilter = initNewFilter;
```

4. **Add HTML dropdown** in `demand-modular.html`:
```html
<div class="filter-item">
  <div class="dropdown-filter">
    <button id="newFilterDropdown">New Filter</button>
    <!-- dropdown menu -->
  </div>
</div>
```

### Adding a New Section

1. **Create section directory:**
```bash
mkdir frontend/src/sections/new-section
```

2. **Create section files:**
   - `new-section.js` - Section logic class
   - `new-section.html` - Section template

3. **Register in SectionManager** (`section-manager.js`):
```javascript
this.sections.set('new-section', new NewSection());
```

4. **Add to HTML:**
```html
<!-- Navigation pill -->
<span class="section-pill" data-target="section-new-section">New Section</span>

<!-- Section container -->
<div id="new-section-container"></div>
```

5. **Load template** in the template loading script at the bottom of `demand-modular.html`

### Debugging

#### Check Dependencies
```javascript
// In browser console
console.log('DataFilterManager:', window.dataFilterManager);
console.log('SectionManager:', window.sectionManager);
console.log('ChunkLoader:', window.ChunkLoader);
```

#### Check Filter State
```javascript
// In browser console
console.log('Selected Years:', window.selectedYears);
console.log('Selected Product Lines:', window.selectedProductLines);
console.log('All Filters:', window.dataFilterManager.filters);
```

#### Check Section State
```javascript
// In browser console
console.log('Current Section:', window.sectionManager.getCurrentSection());
console.log('All Sections:', window.sectionManager.sections);
```

## 🐛 Troubleshooting

### Error: "Cannot read properties of undefined (reading 'setRawData')"

**Cause:** DataFilterManager not loaded before demand-modular.js

**Fix:** Check script loading order in HTML. Core dependencies should load synchronously (without `defer`).

### Error: "Section not found"

**Cause:** Section class not loaded or not registered

**Fix:** 
1. Check that section JS file is loaded
2. Verify section is registered in SectionManager
3. Check browser console for script errors

### Filters Not Working

**Cause:** Filter initialization functions not called or not loaded

**Fix:**
1. Check that `filter-initializers.js` is loaded
2. Verify functions are called in `initializeDynamicFilters()`
3. Check browser console for errors

### Charts Not Rendering

**Cause:** Chart.js not loaded or section not initialized

**Fix:**
1. Verify Chart.js CDN is loaded
2. Check that section's `updateChart()` method is called
3. Verify canvas element exists in DOM

## 📚 Additional Resources

- **Architecture Documentation:** `frontend/MODULAR_ARCHITECTURE.md`
- **Routing Documentation:** `MODULAR_ROUTES.md`
- **Fix History:** `MODULAR_FIXES.md`
- **Route Testing:** `test_modular_routes.py`

## 💡 Tips

1. **Use browser DevTools** - Network tab shows script loading, Console shows errors
2. **Clear cache** - Use Ctrl+Shift+R to force reload
3. **Check file paths** - Ensure all files exist and paths are correct
4. **Test incrementally** - Test each component as you build
5. **Use console.log** - Add logging to track execution flow

## 🎓 Learning Path

1. **Start with DataFilterManager** - Understand centralized filtering
2. **Explore SectionManager** - See how sections are coordinated
3. **Study a section class** - Learn the section pattern
4. **Add a simple filter** - Practice extending functionality
5. **Create a new section** - Apply what you've learned

## 🤝 Contributing

When adding new features:

1. **Follow the modular pattern** - Keep sections independent
2. **Use centralized filtering** - Don't duplicate filter logic
3. **Subscribe to data changes** - Let DataFilterManager notify you
4. **Document your code** - Add comments and JSDoc
5. **Test thoroughly** - Check all browsers and scenarios

---

**Need Help?** Check the documentation files or review existing section implementations for examples.