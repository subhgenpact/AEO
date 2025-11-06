# AEO Application Routes

## Overview
The application now uses clean, RESTful routes instead of direct HTML file access.

## Frontend Routes (HTML Pages)

### Clean Routes (Recommended)
- **Home**: `GET /` → Serves `frontend/index.html`
- **Demand Dashboard**: `GET /demand` → Serves `frontend/demand.html`
- **Data Table**: `GET /datatable` → Serves `frontend/datatable.html`
- **BOM Explosion**: `GET /bom-explosion` → Serves `frontend/BOMexplosion.html`
- **Gap Analysis**: `GET /gap-analysis` → Serves `frontend/GapAnalysis.html`

### Legacy Routes (Backward Compatibility)
These routes still work for backward compatibility:
- `GET /index.html` → Serves `frontend/index.html`
- `GET /demand.html` → Serves `frontend/demand.html`
- `GET /datatable.html` → Serves `frontend/datatable.html`
- `GET /BOMexplosion.html` → Serves `frontend/BOMexplosion.html`
- `GET /GapAnalysis.html` → Serves `frontend/GapAnalysis.html`

## Static Assets Routes
- **CSS**: `GET /styles.css` → Serves `frontend/styles.css`
- **CSS Files**: `GET /src/css/{filename}` → Serves `frontend/src/css/{filename}`
- **JavaScript**: `GET /src/{filename}` → Serves `frontend/src/{filename}`
- **Images**: `GET /src/images/{filename}` → Serves `frontend/src/images/{filename}`

## API Routes

### Demand API (DuckDB-Optimized)
- **Get Programs** (Paginated): `GET /api/demand/programs?skip=0&limit=50`
- **Get Chart Data**: `GET /api/demand/chart-data`

### Filter Options API
- **Get Filter Options**: `GET /api/filter-options/{column}?extract=year`
  - Supported columns: `ENGINE_PROGRAM`, `Configuration`, `Parent_Part_Supplier`, `Level_2_Raw_Material_Supplier`, `HW_OWNER`, `Part_Number`, `Level_2_Raw_Type`, `Target_Ship_Date`

### Data Table API
- **Get All Data** (Paginated): `GET /api/datatable/all?skip=0&limit=1000`
- **Get Filter Options**: `GET /api/datatable/filter-options`
- **Filter Data**: `POST /api/datatable/filter`

### DuckDB Query API
- **Execute Custom Query**: `GET /api/query?sql=SELECT...`
- **Get Statistics**: `GET /api/stats`
- **Get Output Data**: `GET /api/output-data?skip=0&limit=1000`
- **Get Output Info**: `GET /api/output-info`
- **Query Output Data**: `GET /api/output-query?sql=SELECT...`

### Legacy API (Deprecated)
- `GET /data/demand-data.json?skip=0&limit=50` → Use `/api/demand/programs` instead
- `GET /data/cdata.json` → Use `/api/demand/chart-data` instead

## Architecture

### File Structure
```
AEO/
├── main.py                 # Main FastAPI application
├── html_routes.py          # Frontend HTML routes (NEW)
├── duckdb_routes.py        # DuckDB API routes
├── data_service.py         # Data service layer
├── duckdb_service.py       # DuckDB service layer (FIXED)
└── frontend/               # Frontend files
    ├── index.html
    ├── demand.html
    ├── datatable.html
    ├── BOMexplosion.html
    ├── GapAnalysis.html
    ├── styles.css
    └── src/
        ├── css/
        ├── images/
        └── *.js
```

### Router Registration Order
1. **html_router** - Must be registered first for root route `/`
2. **duckdb_router** - API routes under `/api`

## Recent Fixes

### 1. Column Name Mapping (duckdb_service.py)
**Problem**: Database columns have spaces (e.g., "ENGINE PROGRAM") but API requests use underscores (e.g., "ENGINE_PROGRAM")

**Solution**: 
- Moved column name detection BEFORE index creation in `_create_indexes()`
- Added column mapping in `get_unique_values()` method
- Maps underscore names to actual column names with spaces

### 2. Clean Routes (html_routes.py)
**Problem**: Direct HTML file access (e.g., `/demand.html`)

**Solution**:
- Created `html_routes.py` with clean route names
- Maintains backward compatibility with `.html` extensions
- Updated navigation links in HTML files to use clean routes

## Usage Examples

### Frontend Navigation
```html
<!-- Clean routes (recommended) -->
<a href="/">Home</a>
<a href="/demand">Demand Dashboard</a>
<a href="/bom-explosion">BOM Explosion</a>

<!-- Legacy routes (still work) -->
<a href="/demand.html">Demand Dashboard</a>
```

### API Calls (JavaScript)
```javascript
// Get demand programs with pagination
fetch('/api/demand/programs?skip=0&limit=50')
  .then(res => res.json())
  .then(data => console.log(data));

// Get filter options
fetch('/api/filter-options/ENGINE_PROGRAM')
  .then(res => res.json())
  .then(data => console.log(data.values));

// Get years from date column
fetch('/api/filter-options/Target_Ship_Date?extract=year')
  .then(res => res.json())
  .then(data => console.log(data.values));
```

## Performance Optimizations
- **Server-side pagination**: True LIMIT/OFFSET queries in DuckDB
- **Column indexing**: Indexes created on frequently queried columns
- **Connection pooling**: Reuses DuckDB connections
- **Data caching**: Cached demand data and chart data

## Testing
Navigate to:
- http://localhost:8000/ (Home)
- http://localhost:8000/demand (Demand Dashboard)
- http://localhost:8000/datatable (Data Table)
- http://localhost:8000/api/demand/programs?skip=0&limit=10 (API Test)
