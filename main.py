from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional
import uvicorn
import json
from pathlib import Path

from data_service import DataService
from demand_data_service import DemandDataService
from duckdb_service import DuckDBService
from duckdb_routes import router as duckdb_router

app = FastAPI(title="AEO Data Dashboard", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DuckDB service FIRST for ultra-fast filtering and queries
# Using data-aeo.duckdb as the primary data source with Output table
print("Initializing DuckDB service with data-aeo.duckdb...")
duckdb_service = DuckDBService(duckdb_path="data/data-aeo.duckdb")

# Initialize data service - pass duckdb_service to share the DataFrame
print("Initializing data service...")
data_service = DataService(duckdb_service=duckdb_service)
print(f"Data loaded: {data_service.df.shape[0]:,} rows, {data_service.df.shape[1]} columns")

# Create demand service but don't initialize data here - it will be initialized lazily
demand_service = DemandDataService()
demand_service.df = data_service.df  # Share the same DataFrame

# Share duckdb_service with routes
import duckdb_routes
duckdb_routes.duckdb_service = duckdb_service

# Register DuckDB routes
app.include_router(duckdb_router)

print("[OK] DuckDB integration complete\n")

# Cache the transformed demand data to avoid recalculating on every request
_cached_demand_data = None
_cached_cdata = None

def get_cached_demand_data():
    global _cached_demand_data
    if _cached_demand_data is None:
        print("First request - transforming demand data using DuckDB...")
        start_time = __import__('time').time()
        _cached_demand_data = demand_service.transform_to_demand_format(use_duckdb=True, duckdb_service=duckdb_service)
        elapsed = __import__('time').time() - start_time
        print(f"✓ Demand data cached in {elapsed:.2f}s: {len(_cached_demand_data)} programs")
    return _cached_demand_data

def get_cached_cdata():
    global _cached_cdata
    if _cached_cdata is None:
        print("First request - transforming cdata using DuckDB...")
        start_time = __import__('time').time()
        _cached_cdata = demand_service.transform_to_cdata_format(use_duckdb=True, duckdb_service=duckdb_service)
        elapsed = __import__('time').time() - start_time
        print(f"✓ Cdata cached in {elapsed:.2f}s: {len(_cached_cdata)} entries")
    return _cached_cdata


# ============================================
# STATIC FILE SERVING
# ============================================

@app.get("/")
async def read_root():
    """Serve the frontend"""
    return FileResponse("frontend/index.html")


# Serve debug page
@app.get("/debug.html")
async def serve_debug():
    """Serve debug page"""
    return FileResponse("debug.html")


# Serve individual HTML pages
@app.get("/{page}.html")
async def serve_html_page(page: str):
    """Serve HTML pages from frontend"""
    file_path = Path(f"frontend/{page}.html")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Page not found")


# Serve CSS files
@app.get("/styles.css")
async def serve_styles():
    """Serve main styles.css"""
    return FileResponse("frontend/styles.css")


@app.get("/src/css/{filename}")
async def serve_css(filename: str):
    """Serve CSS files from src/css"""
    file_path = Path(f"frontend/src/css/{filename}")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="CSS file not found")


@app.get("/src/{filename}")
async def serve_js(filename: str):
    """Serve JavaScript files from src"""
    file_path = Path(f"frontend/src/{filename}")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="JS file not found")


# Serve images
@app.get("/src/images/{filename}")
async def serve_images(filename: str):
    """Serve image files"""
    file_path = Path(f"frontend/src/images/{filename}")
    if file_path.exists():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Image not found")


# ============================================
# API ENDPOINTS
# ============================================

@app.get("/api/filter-options")
async def get_filter_options():
    """
    Get all unique filter values for dropdowns
    Returns all possible values for each filter category
    """
    try:
        print(f"[FILTER] /api/filter-options endpoint called")
        import time
        start_time = time.time()
        
        # Get filter options from data service
        filter_options = data_service.get_filter_options()
        
        elapsed = time.time() - start_time
        print(f"[FILTER] Returned filter options in {elapsed*1000:.1f}ms")
        print(f"[FILTER] Filter counts: PL={len(filter_options['productLines'])}, "
              f"Years={len(filter_options['years'])}, "
              f"Configs={len(filter_options['configs'])}, "
              f"Suppliers={len(filter_options['suppliers'])}, "
              f"RM Suppliers={len(filter_options['rmSuppliers'])}, "
              f"HW Owners={len(filter_options['hwOwners'])}, "
              f"Modules={len(filter_options['modules'])}, "
              f"Part Numbers={len(filter_options['partNumbers'])}")
        
        return JSONResponse(content={
            "status": "success",
            "data": filter_options,
            "execution_time_ms": f"{elapsed*1000:.1f}"
        })
    except Exception as e:
        print(f"[ERROR] Error serving filter options: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to load filter options: {str(e)}")


@app.get("/api/datatable/all")
async def get_datatable_all(skip: int = 0, limit: int = 1000):
    """Serve data from data-aeo.duckdb for the datatable page with pagination"""
    try:
        print(f"[DATATABLE] /api/datatable/all endpoint called - skip={skip}, limit={limit}")
        
        # Get all data from DuckDB - returns list of dicts
        all_records = duckdb_service.get_all_output_data()
        
        # Apply pagination
        total = len(all_records)
        paginated_records = all_records[skip:skip + limit]
        has_more = (skip + limit) < total
        
        print(f"[DATATABLE] Returning {len(paginated_records)} records from {skip} (total: {total}, hasMore: {has_more})")
        
        return JSONResponse(content={
            "data": paginated_records,
            "total": total,
            "skip": skip,
            "limit": limit,
            "hasMore": has_more
        })
    except Exception as e:
        print(f"[ERROR] Error serving datatable data: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to load datatable data: {str(e)}")


@app.get("/api/demand/programs")
async def get_demand_programs(skip: int = 0, limit: int = 1000):
    """
    Server-side pagination for demand programs
    
    Uses DuckDB's native LIMIT/OFFSET for true pagination instead of 
    loading all data then slicing. Dramatically reduces memory usage.
    """
    try:
        print(f"[DEMAND] /api/demand/programs called - skip={skip}, limit={limit}")
        import time
        start_time = time.time()
        
        # Use true server-side pagination from DuckDB
        paginated_data = duckdb_service.get_demand_data_paginated(skip, limit)
        total = duckdb_service.get_demand_data_count()
        has_more = (skip + limit) < total
        
        elapsed = time.time() - start_time
        print(f"[DEMAND] Returned {len(paginated_data)} programs from {skip} (total: {total}, hasMore: {has_more}) in {elapsed*1000:.1f}ms")
        
        return JSONResponse(content={
            "status": "success",
            "data": paginated_data,
            "total": total,
            "skip": skip,
            "limit": limit,
            "hasMore": has_more,
            "execution_time_ms": f"{elapsed*1000:.1f}"
        })
    except Exception as e:
        print(f"[ERROR] Error serving demand programs: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to load demand programs: {str(e)}")


@app.get("/api/demand/chart-data")
async def get_demand_chart_data(chart_type: str = "all"):
    """
    Return pre-aggregated chart data for Engine Program Overview
    
    Returns pre-calculated aggregations instead of raw data for transformation.
    Dramatically reduces payload size and client-side processing.
    """
    try:
        print(f"[DEMAND] /api/demand/chart-data called - chart_type={chart_type}")
        import time
        start_time = time.time()
        
        # Get cached cdata from DuckDB service
        cdata = get_cached_cdata()
        
        elapsed = time.time() - start_time
        print(f"[DEMAND] Returned chart data in {elapsed*1000:.1f}ms")
        
        return JSONResponse(content={
            "status": "success",
            "data": cdata,
            "chart_type": chart_type,
            "execution_time_ms": f"{elapsed*1000:.1f}"
        })
    except Exception as e:
        print(f"[ERROR] Error serving chart data: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to load chart data: {str(e)}")


if __name__ == "__main__":
    import asyncio
    import sys
    
    # Fix for Windows asyncio ProactorEventLoop issue
    if sys.platform == 'win32':
        # Set the event loop policy to use SelectorEventLoop instead of ProactorEventLoop
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, log_level="info")

