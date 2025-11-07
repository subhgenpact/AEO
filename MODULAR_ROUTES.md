# Modular Demand Dashboard Routes

This document describes the routing setup for the modular demand dashboard.

## 🌐 Available Routes

### Main Application Routes

| Route | File | Description |
|-------|------|-------------|
| `/` | `frontend/index.html` | Home page with navigation |
| `/demand` | `frontend/demand.html` | Classic demand dashboard |
| `/demand-modular` | `frontend/demand-modular.html` | **New modular demand dashboard** |

### Legacy Routes (Backward Compatibility)

| Route | File | Description |
|-------|------|-------------|
| `/demand.html` | `frontend/demand.html` | Legacy route for classic demand |
| `/demand-modular.html` | `frontend/demand-modular.html` | Legacy route for modular demand |

### Section-Specific Routes

| Route | File | Description |
|-------|------|-------------|
| `/src/sections/section-manager.js` | `frontend/src/sections/section-manager.js` | Section coordination logic |
| `/src/sections/{section}/{file}` | `frontend/src/sections/{section}/{file}` | Section-specific files |

#### Engine Program Section
- `/src/sections/engine-program/engine-program.js` - Engine program logic
- `/src/sections/engine-program/engine-program.html` - Engine program template

#### Supplier Section
- `/src/sections/supplier/supplier.js` - Supplier logic
- `/src/sections/supplier/supplier.html` - Supplier template

#### RM Supplier Section
- `/src/sections/rm-supplier/rm-supplier.js` - RM supplier logic
- `/src/sections/rm-supplier/rm-supplier.html` - RM supplier template

#### HW Owner Section
- `/src/sections/hw-owner/hw-owner.js` - HW owner logic
- `/src/sections/hw-owner/hw-owner.html` - HW owner template

### Core Application Files

| Route | File | Description |
|-------|------|-------------|
| `/src/demand-modular.js` | `frontend/src/demand-modular.js` | Main modular application logic |
| `/src/{filename}` | `frontend/src/{filename}` | Other JavaScript utilities |

## 🚀 Usage

### Accessing the Modular Dashboard

1. **Direct URL**: Navigate to `http://localhost:8000/demand-modular`
2. **From Navigation**: Use the dropdown menu "Engine Delivery" → "Demand (Modular)"
3. **From Home Page**: Click the "Demand (Modular)" link in the navigation

### Development Workflow

1. **Start Server**: Run `python main.py` or `uvicorn main:app --reload`
2. **Access Modular Version**: Go to `/demand-modular`
3. **Edit Sections**: Modify files in `frontend/src/sections/`
4. **Test Changes**: Refresh browser to see updates

## 🔧 Route Configuration

### HTML Routes (`html_routes.py`)

```python
@router.get("/demand-modular")
async def demand_modular_page():
    """Serve the modular demand dashboard page"""
    return FileResponse("frontend/demand-modular.html")

@router.get("/src/sections/{section_name}/{filename}")
async def serve_section_files(section_name: str, filename: str):
    """Serve section-specific files (JS and HTML templates)"""
    file_path = Path(f"frontend/src/sections/{section_name}/{filename}")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail=f"Section file not found: {section_name}/{filename}")
```

### API Routes

The modular dashboard uses the same API endpoints as the classic version:

| Route | Description |
|-------|-------------|
| `/api/demand/programs` | Get demand program data with pagination |
| `/api/demand/chart-data` | Get pre-aggregated chart data |
| `/api/filter-options/{column}` | Get filter options for dropdowns |

## 🧪 Testing Routes

### Manual Testing

1. **Start the server**: `python main.py`
2. **Test main route**: Visit `http://localhost:8000/demand-modular`
3. **Check navigation**: Verify links work in dropdown menus
4. **Test sections**: Ensure all section files load correctly

### Automated Testing

Run the test script to verify all routes:

```bash
python test_modular_routes.py
```

This will test:
- ✅ Main HTML routes
- ✅ Section file routes
- ✅ API endpoints
- ✅ Legacy compatibility routes

### Expected Test Results

```
🧪 Testing Modular Demand Dashboard Routes
==================================================

📄 Testing HTML and Static File Routes:
----------------------------------------
✅ Home page - OK (Status: 200)
✅ Classic demand page - OK (Status: 200)
✅ Modular demand page - OK (Status: 200)
✅ Modular demand page (legacy) - OK (Status: 200)
✅ Section manager JS - OK (Status: 200)
✅ Engine program section JS - OK (Status: 200)
✅ Engine program section HTML - OK (Status: 200)
✅ Supplier section JS - OK (Status: 200)
✅ Supplier section HTML - OK (Status: 200)
✅ RM Supplier section JS - OK (Status: 200)
✅ RM Supplier section HTML - OK (Status: 200)
✅ HW Owner section JS - OK (Status: 200)
✅ HW Owner section HTML - OK (Status: 200)
✅ Modular demand main JS - OK (Status: 200)

📊 Testing API Routes:
----------------------------------------
✅ Demand programs API - OK (Status: 200)
✅ Chart data API - OK (Status: 200)

📋 Test Summary:
==================================================
HTML/Static Routes: 14/14 passed
API Routes: 2/2 passed
Overall: 16/16 tests passed
🎉 All tests passed! Modular demand routes are working correctly.
```

## 🔄 Migration Path

### From Classic to Modular

1. **Keep Both Versions**: Classic (`/demand`) and Modular (`/demand-modular`) run side-by-side
2. **Test Modular**: Thoroughly test the modular version
3. **User Training**: Train users on the new interface
4. **Gradual Migration**: Switch users to modular version gradually
5. **Deprecate Classic**: Eventually remove classic version when ready

### Rollback Strategy

If issues arise with the modular version:
1. **Immediate**: Users can switch back to `/demand` (classic version)
2. **Navigation**: Both versions are available in the dropdown menu
3. **No Data Loss**: Both versions use the same backend APIs
4. **Quick Fix**: Fix issues in modular version without affecting classic

## 🛠️ Troubleshooting

### Common Issues

1. **404 Errors on Section Files**
   - Check file paths in `frontend/src/sections/`
   - Verify route configuration in `html_routes.py`
   - Ensure files exist and have correct names

2. **Template Loading Errors**
   - Check browser console for fetch errors
   - Verify HTML template syntax
   - Ensure section HTML files are valid

3. **JavaScript Errors**
   - Check browser console for script errors
   - Verify all dependencies are loaded
   - Ensure section classes are properly defined

### Debug Steps

1. **Check Server Logs**: Look for route errors in server output
2. **Browser Console**: Check for JavaScript and network errors
3. **Network Tab**: Verify all files are loading correctly
4. **Test Script**: Run `python test_modular_routes.py` to verify routes

## 📈 Performance Considerations

### Route Optimization

- **Static File Caching**: Section files are served as static content
- **Template Loading**: HTML templates are loaded asynchronously
- **API Reuse**: Same efficient API endpoints as classic version

### Loading Strategy

1. **Core Files First**: Main HTML and CSS load immediately
2. **Section Templates**: Loaded asynchronously on page load
3. **Section Logic**: JavaScript classes initialize after templates
4. **Data Loading**: API calls happen after section initialization

## 🔮 Future Enhancements

### Planned Route Improvements

- **Dynamic Section Loading**: Load sections on-demand
- **Route-Based Section State**: URL-based section navigation
- **API Versioning**: Support for multiple API versions
- **CDN Integration**: Serve static files from CDN

### Extension Points

- **Custom Sections**: Easy addition of new section routes
- **Plugin Architecture**: Support for external section plugins
- **Theme Routes**: Section-specific theme support
- **Real-time Updates**: WebSocket routes for live data

---

This routing setup provides a solid foundation for the modular demand dashboard while maintaining backward compatibility and enabling future enhancements.