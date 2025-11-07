# Troubleshooting Guide - Modular Demand Dashboard

## 🔍 Quick Diagnosis

### Step 1: Test Dependencies

Visit the dependency test page:
```
http://localhost:8000/test-dependencies
```

This page will show you exactly which dependencies are loaded and which are missing.

### Step 2: Check Browser Console

Open browser DevTools (F12) and check the Console tab for errors:

**Expected output (success):**
```
🔍 Checking dependencies...
  - DataFilterManager: object [Object]
  - SectionManager: object [Object]
  - ChunkLoader: function [Function]
  - TablePaginationManager: function [Function]
  - getYearFromDate: function [Function]
✅ All dependencies loaded, starting data fetch...
```

**Error output (failure):**
```
❌ DataFilterManager not loaded
Missing dependencies: DataFilterManager. Please refresh the page.
```

## 🐛 Common Issues and Solutions

### Issue 1: "Required dependencies not loaded"

**Symptoms:**
- Error message: "Error: Required dependencies not loaded. Please refresh the page."
- Console shows one or more dependencies as `undefined`

**Causes:**
1. Script files not loading (404 errors)
2. JavaScript syntax errors in dependency files
3. Scripts loading in wrong order

**Solutions:**

#### A. Check Network Tab
1. Open DevTools → Network tab
2. Refresh page (Ctrl+Shift+R)
3. Look for any red (failed) requests
4. Check if all `.js` files return 200 status

**If you see 404 errors:**
- Verify file exists in `frontend/src/` directory
- Check file path in HTML matches actual file location
- Restart the server

#### B. Check for JavaScript Errors
1. Open DevTools → Console tab
2. Look for syntax errors or exceptions
3. Click on the error to see which file and line

**Common syntax errors:**
- Missing closing braces `}`
- Missing semicolons `;`
- Undefined variables
- Typos in function names

#### C. Verify Script Loading Order
Scripts must load in this order:
1. Core utilities (chunk-loader, utils)
2. Data management (data-filter-manager, pagination-manager)
3. Filter utilities (filter-chips, filters, filter-initializers)
4. Section classes
5. Section manager
6. Main application

**Check in HTML:**
```html
<!-- These should NOT have defer attribute -->
<script src="src/data-filter-manager.js"></script>
<script src="src/sections/section-manager.js"></script>

<!-- This SHOULD have defer -->
<script defer src="src/demand-modular.js"></script>
```

### Issue 2: "Cannot read properties of undefined (reading 'setRawData')"

**Symptoms:**
- Error occurs in `initializeModularDashboard()` function
- `window.dataFilterManager` is undefined

**Cause:**
- `data-filter-manager.js` not loaded or has errors

**Solutions:**

1. **Check if file exists:**
   ```bash
   ls frontend/src/data-filter-manager.js
   ```

2. **Check file content:**
   - Open `frontend/src/data-filter-manager.js`
   - Verify it ends with:
     ```javascript
     window.dataFilterManager = new DataFilterManager();
     window.DataFilterManager = DataFilterManager;
     ```

3. **Check browser console:**
   ```javascript
   console.log(window.dataFilterManager);
   // Should show: DataFilterManager {rawData: null, filteredData: null, ...}
   ```

4. **Force reload:**
   - Clear browser cache
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Issue 3: "ChunkLoader is not a constructor"

**Symptoms:**
- Error when trying to create ChunkLoader instance
- `window.ChunkLoader` is undefined

**Cause:**
- `chunk-loader.js` not exporting to window

**Solutions:**

1. **Check chunk-loader.js exports:**
   ```bash
   tail -n 5 frontend/src/chunk-loader.js
   ```
   
   Should show:
   ```javascript
   // Also export to window for browser usage
   window.ChunkLoader = ChunkLoader;
   ```

2. **If missing, add the export:**
   - Open `frontend/src/chunk-loader.js`
   - Add at the end:
     ```javascript
     window.ChunkLoader = ChunkLoader;
     ```

### Issue 4: Filters Not Working

**Symptoms:**
- Filter dropdowns don't populate
- Clicking "Apply" does nothing
- No filter chips appear

**Causes:**
1. Filter initialization functions not loaded
2. Filter initialization not called
3. DOM elements missing

**Solutions:**

#### A. Check Filter Initializers Loaded
```javascript
// In browser console
console.log(typeof window.initProductLineFilter);
// Should show: "function"
```

#### B. Check Filter Initialization Called
Look for this in console:
```
🔧 Initializing dynamic filters...
✅ Dynamic filters initialized
```

#### C. Check DOM Elements Exist
```javascript
// In browser console
console.log(document.getElementById('productLineDropdown'));
// Should show: <button id="productLineDropdown">...</button>
```

### Issue 5: Sections Not Rendering

**Symptoms:**
- Section navigation doesn't work
- Tables don't show data
- Charts don't render

**Causes:**
1. Section classes not loaded
2. Section manager not initialized
3. Section HTML templates not loaded

**Solutions:**

#### A. Check Section Classes Loaded
```javascript
// In browser console
console.log(window.SupplierSection);
// Should show: class SupplierSection { ... }
```

#### B. Check Section Manager
```javascript
// In browser console
console.log(window.sectionManager);
console.log(window.sectionManager.sections);
// Should show Map with section instances
```

#### C. Check Section HTML Loaded
```javascript
// In browser console
console.log(document.getElementById('section-supplier'));
// Should show: <div id="section-supplier">...</div>
```

## 🔧 Advanced Debugging

### Enable Verbose Logging

Add this to browser console:
```javascript
// Log all script loads
const originalAppendChild = document.head.appendChild;
document.head.appendChild = function(element) {
  if (element.tagName === 'SCRIPT') {
    console.log('Loading script:', element.src);
  }
  return originalAppendChild.call(this, element);
};
```

### Check All Global Variables

```javascript
// In browser console
console.log('=== Global Variables ===');
console.log('dataFilterManager:', window.dataFilterManager);
console.log('sectionManager:', window.sectionManager);
console.log('ChunkLoader:', window.ChunkLoader);
console.log('TablePaginationManager:', window.TablePaginationManager);
console.log('paginationManagers:', window.paginationManagers);
console.log('selectedYears:', window.selectedYears);
console.log('selectedProductLines:', window.selectedProductLines);
```

### Test Individual Components

```javascript
// Test DataFilterManager
const testData = [{engineProgram: 'LM2500', configs: []}];
window.dataFilterManager.setRawData(testData);
console.log('Filtered data:', window.dataFilterManager.getFilteredData());

// Test SectionManager
window.sectionManager.showSection('supplier');
console.log('Current section:', window.sectionManager.getCurrentSection());

// Test ChunkLoader
const loader = new ChunkLoader({
  chunkSize: 10,
  onAllLoaded: (data) => console.log('Loaded:', data.length, 'items')
});
```

## 📊 Performance Issues

### Slow Page Load

**Symptoms:**
- Page takes >5 seconds to load
- Browser becomes unresponsive

**Solutions:**

1. **Check data size:**
   ```javascript
   console.log('Data size:', JSON.stringify(window.RAW_DATA).length, 'bytes');
   ```

2. **Enable pagination:**
   - Verify pagination managers are working
   - Check page size settings

3. **Disable unnecessary features:**
   - Comment out chart rendering temporarily
   - Reduce initial data load

### Memory Leaks

**Symptoms:**
- Browser memory usage keeps increasing
- Page becomes slow over time

**Solutions:**

1. **Check for unsubscribed listeners:**
   ```javascript
   console.log('Subscribers:', window.dataFilterManager.subscribers.size);
   ```

2. **Destroy unused chart instances:**
   ```javascript
   // In browser console
   Object.values(window.chartCache).forEach(chart => {
     if (chart) chart.destroy();
   });
   window.chartCache = {};
   ```

## 🆘 Still Having Issues?

### Collect Debug Information

Run this in browser console and save the output:
```javascript
console.log('=== Debug Information ===');
console.log('User Agent:', navigator.userAgent);
console.log('URL:', window.location.href);
console.log('Dependencies:', {
  dataFilterManager: typeof window.dataFilterManager,
  sectionManager: typeof window.sectionManager,
  ChunkLoader: typeof window.ChunkLoader
});
console.log('Errors:', window.errors || 'None');
console.log('Console errors:', console.error.toString());
```

### Reset Everything

1. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete → Clear browsing data
   - Firefox: Ctrl+Shift+Delete → Clear recent history

2. **Restart server:**
   ```bash
   # Stop server (Ctrl+C)
   python main.py
   ```

3. **Hard refresh page:**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

### Check Server Logs

Look for errors in server console:
```
[ERROR] Error serving demand programs: ...
[ERROR] Failed to load demand data: ...
```

## 📞 Getting Help

When reporting issues, include:

1. **Browser and version** (e.g., Chrome 120.0.6099.109)
2. **Error messages** from console
3. **Network tab** screenshot showing failed requests
4. **Dependency test results** from `/test-dependencies`
5. **Steps to reproduce** the issue

---

**Last Updated:** 2024
**Version:** 1.0