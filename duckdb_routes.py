"""
FastAPI DuckDB Endpoints for ultra-fast filtering and queries
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import time

router = APIRouter(prefix="/api", tags=["duckdb"])

# Will be injected from main.py
duckdb_service = None


@router.post("/filter")
async def filter_data(
    product_lines: Optional[List[str]] = Query(None),
    years: Optional[List[str]] = Query(None),
    configs: Optional[List[str]] = Query(None),
    suppliers: Optional[List[str]] = Query(None),
    rm_suppliers: Optional[List[str]] = Query(None),
    hw_owners: Optional[List[str]] = Query(None),
    part_numbers: Optional[List[str]] = Query(None),
    modules: Optional[List[str]] = Query(None)
):
    """
    Ultra-fast multi-column filtering using DuckDB SQL
    
    Query params can be repeated:
    ?product_lines=LM2500&product_lines=LM6000&suppliers=Supplier1
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        # Build filter dictionary
        filters = {}
        if product_lines:
            filters["ENGINE PROGRAM"] = product_lines
        if configs:
            filters["Configuration"] = configs
        if suppliers:
            filters["Parent Part Supplier"] = suppliers
        if rm_suppliers:
            filters["Level 2 Raw Material Supplier"] = rm_suppliers
        if hw_owners:
            filters["HW OWNER"] = hw_owners
        if part_numbers:
            filters["Part Number"] = part_numbers
        if modules:
            filters["Module"] = modules
        
        # Execute filter using DuckDB
        filtered_df = duckdb_service.filter_data(filters)
        result = filtered_df.to_dicts()
        
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "row_count": len(result),
            "execution_time_ms": f"{elapsed*1000:.2f}",
            "data": result
        }
    
    except Exception as e:
        print(f"[ERROR] Filter endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filter-options/{column}")
async def get_filter_options(column: str, extract: Optional[str] = None):
    """
    Get unique values for a column - ultra-fast with DuckDB
    
    Supported columns:
    - ENGINE PROGRAM
    - Configuration
    - Parent Part Supplier
    - Level 2 Raw Material Supplier
    - HW OWNER
    - Part Number
    - Module
    - Level 1 Raw Type
    - Level 2 Raw Type
    - Target Ship Date (with extract=year to get years)
    
    Special params:
    - extract=year: Extract year from date columns (use with Target Ship Date)
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        # Validate column name to prevent SQL injection
        valid_columns = [
            # Space versions (legacy)
            "ENGINE PROGRAM", "Configuration", "Parent Part Supplier",
            "Level 2 Raw Material Supplier", "HW OWNER", "Part Number",
            "Module", "Level 1 Raw Type", "Level 2 Raw Type", "ESN",
            "Engine Demand Family", "Target Ship Date",
            # Underscore versions (actual DuckDB columns)
            "ENGINE_PROGRAM", "CONFIGURATION", "Parent_Part_Supplier",
            "Level_2_Raw_Material_Supplier", "HW_OWNER", "Part_Number",
            "MODULE", "Level_1_Raw_Type", "Level_2_Raw_Type",
            "Target_Ship_Date", "Level_2_PN"
        ]
        
        if column not in valid_columns:
            raise HTTPException(status_code=400, detail=f"Invalid column: {column}")
        
        # Special handling for date extraction
        if (column == "Target Ship Date" or column == "Target_Ship_Date") and extract == "year":
            values = duckdb_service.get_years_from_date(column)
        else:
            values = duckdb_service.get_unique_values(column)
        
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "column": column,
            "value_count": len(values),
            "execution_time_ms": f"{elapsed*1000:.2f}",
            "values": values
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Filter options endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats():
    """Get data statistics from DuckDB"""
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        stats = duckdb_service.get_summary_stats()
        
        return {
            "status": "success",
            **stats
        }
    except Exception as e:
        print(f"[ERROR] Stats endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/query")
async def execute_query(sql: str):
    """
    Execute a custom SQL query on DuckDB
    WARNING: Only use for internal/trusted queries
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        # Basic security: limit query execution
        if not sql.strip().upper().startswith("SELECT"):
            raise HTTPException(status_code=400, detail="Only SELECT queries allowed")
        
        start_time = time.time()
        result = duckdb_service.query(sql)
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "row_count": len(result),
            "execution_time_ms": f"{elapsed*1000:.2f}",
            "data": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Query endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/output-data")
async def get_output_data(skip: int = 0, limit: int = 1000):
    """
    Get data from Output sheet of Dummy Data_v6.xlsx
    Supports pagination for large datasets
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        if not duckdb_service.output_df:
            raise HTTPException(status_code=404, detail="Output sheet not loaded")
        
        start_time = time.time()
        
        # Query all data with pagination
        sql = f"SELECT * FROM output_data LIMIT {limit} OFFSET {skip}"
        result = duckdb_service.query_output_data(sql)
        
        # Get total count
        total = duckdb_service.conn.execute("SELECT COUNT(*) FROM output_data").fetchall()[0][0]
        
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "source": "Output sheet from Dummy Data_v6.xlsx",
            "total_rows": total,
            "skip": skip,
            "limit": limit,
            "returned_rows": len(result),
            "execution_time_ms": f"{elapsed*1000:.2f}",
            "data": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Output data endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/output-info")
async def get_output_info():
    """
    Get metadata about the Output sheet
    Returns column names, data types, and row count
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        if not duckdb_service.output_df:
            raise HTTPException(status_code=404, detail="Output sheet not loaded")
        
        start_time = time.time()
        info = duckdb_service.get_output_sheet_info()
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "source": "Output sheet from Dummy Data_v6.xlsx",
            "execution_time_ms": f"{elapsed*1000:.2f}",
            **info
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Output info endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/output-query")
async def query_output_data(sql: str):
    """
    Execute a custom SQL query on the Output sheet data
    The table name is 'output_data'
    
    Examples:
    /api/output-query?sql=SELECT * FROM output_data LIMIT 10
    /api/output-query?sql=SELECT COUNT(*) FROM output_data
    /api/output-query?sql=SELECT DISTINCT column_name FROM output_data
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        if not duckdb_service.output_df:
            raise HTTPException(status_code=404, detail="Output sheet not loaded")
        
        # Basic security: limit query execution
        if not sql.strip().upper().startswith("SELECT"):
            raise HTTPException(status_code=400, detail="Only SELECT queries allowed")
        
        start_time = time.time()
        result = duckdb_service.query_output_data(sql)
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "source": "Output sheet from Dummy Data_v6.xlsx",
            "row_count": len(result),
            "execution_time_ms": f"{elapsed*1000:.2f}",
            "data": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Output query endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/datatable/filter-options")
async def get_datatable_filter_options():
    """
    Get all unique values for all filter columns - optimized with DuckDB
    This replaces client-side unique value extraction
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        main_table = duckdb_service._get_main_table()
        
        # Get all unique values for each filter column in parallel using DuckDB
        filter_options = {}
        
        # Safely get column names
        column_check = duckdb_service.conn.execute(f"SELECT * FROM {main_table} LIMIT 0").description
        column_names = [col[0] for col in column_check]
        
        # Map filter names to actual column names
        filter_columns = {
            "productLines": "ENGINE_PROGRAM" if "ENGINE_PROGRAM" in column_names else "ENGINE PROGRAM",
            "configs": "Configuration" if "Configuration" in column_names else None,
            "suppliers": "Parent_Part_Supplier" if "Parent_Part_Supplier" in column_names else "Parent Part Supplier",
            "rmSuppliers": "Level_2_Raw_Material_Supplier" if "Level_2_Raw_Material_Supplier" in column_names else "Level 2 Raw Material Supplier",
            "hwOwners": "HW_OWNER" if "HW_OWNER" in column_names else "HW Owner" if "HW Owner" in column_names else "HW_Owner",
            "modules": "Level_2_Raw_Type" if "Level_2_Raw_Type" in column_names else "Level 2 Raw Type" if "Level 2 Raw Type" in column_names else "Module",
            "partNumbers": "Part_Number" if "Part_Number" in column_names else "Level_1_PN" if "Level_1_PN" in column_names else "Part Number",
        }
        
        # Get unique values for each filter
        for filter_name, col_name in filter_columns.items():
            if col_name and col_name in column_names:
                # Filter to only get values from gap records (Have_Gap = 'Y')
                gap_col = "Have_Gap" if "Have_Gap" in column_names else None
                where_clause = f'WHERE "{col_name}" IS NOT NULL AND TRIM(CAST("{col_name}" AS VARCHAR)) != \'\''
                if gap_col:
                    where_clause += f' AND "{gap_col}" = \'Y\''
                
                values = duckdb_service.conn.execute(f"""
                    SELECT DISTINCT "{col_name}" as value
                    FROM {main_table}
                    {where_clause}
                    ORDER BY value
                """).fetchall()
                filter_options[filter_name] = [v[0] for v in values if v[0]]
            else:
                filter_options[filter_name] = []
        
        # Get years from Target_Ship_Date
        date_col = "Target_Ship_Date" if "Target_Ship_Date" in column_names else "Target Ship Date"
        gap_col = "Have_Gap" if "Have_Gap" in column_names else None
        if date_col in column_names:
            where_clause = f'WHERE "{date_col}" IS NOT NULL'
            if gap_col:
                where_clause += f' AND "{gap_col}" = \'Y\''
            
            years = duckdb_service.conn.execute(f"""
                SELECT DISTINCT CAST(YEAR(TRY_CAST("{date_col}" AS DATE)) AS VARCHAR) as year
                FROM {main_table}
                {where_clause}
                ORDER BY year DESC
            """).fetchall()
            filter_options["years"] = [y[0] for y in years if y[0]]
        else:
            filter_options["years"] = []
        
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "execution_time_ms": f"{elapsed*1000:.2f}",
            "filterOptions": filter_options
        }
    
    except Exception as e:
        print(f"[ERROR] Filter options endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/datatable/filter")
async def filter_datatable(
    productLines: Optional[List[str]] = Query(None),
    year: Optional[str] = Query(None),
    configs: Optional[List[str]] = Query(None),
    suppliers: Optional[List[str]] = Query(None),
    rmSuppliers: Optional[List[str]] = Query(None),
    hwOwners: Optional[List[str]] = Query(None),
    modules: Optional[List[str]] = Query(None),
    partNumbers: Optional[List[str]] = Query(None),
    skip: int = Query(0),
    limit: int = Query(1000)
):
    """
    Server-side filtering using DuckDB SQL - ULTRA FAST
    Returns paginated results after applying filters
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        main_table = duckdb_service._get_main_table()
        
        # Get column names
        column_check = duckdb_service.conn.execute(f"SELECT * FROM {main_table} LIMIT 0").description
        column_names = [col[0] for col in column_check]
        
        # Map to actual column names
        col_map = {
            "ENGINE_PROGRAM": "ENGINE_PROGRAM" if "ENGINE_PROGRAM" in column_names else "ENGINE PROGRAM",
            "Configuration": "Configuration" if "Configuration" in column_names else None,
            "Parent_Part_Supplier": "Parent_Part_Supplier" if "Parent_Part_Supplier" in column_names else "Parent Part Supplier",
            "Level_2_Raw_Material_Supplier": "Level_2_Raw_Material_Supplier" if "Level_2_Raw_Material_Supplier" in column_names else "Level 2 Raw Material Supplier",
            "HW_Owner": "HW_Owner" if "HW_Owner" in column_names else "HW OWNER",
            "Module": "Module" if "Module" in column_names else None,
            "Level_1_PN": "Level_1_PN" if "Level_1_PN" in column_names else "Part Number",
            "Target_Ship_Date": "Target_Ship_Date" if "Target_Ship_Date" in column_names else "Target Ship Date",
        }
        
        # Build WHERE clause
        where_clauses = []
        params = []
        
        if productLines:
            placeholders = ','.join(['?' for _ in productLines])
            where_clauses.append(f'"{col_map["ENGINE_PROGRAM"]}" IN ({placeholders})')
            params.extend(productLines)
        
        if year:
            where_clauses.append(f'YEAR(TRY_CAST("{col_map["Target_Ship_Date"]}" AS DATE)) = ?')
            params.append(int(year))
        
        if configs and col_map["Configuration"]:
            placeholders = ','.join(['?' for _ in configs])
            where_clauses.append(f'"{col_map["Configuration"]}" IN ({placeholders})')
            params.extend(configs)
        
        if suppliers:
            placeholders = ','.join(['?' for _ in suppliers])
            where_clauses.append(f'"{col_map["Parent_Part_Supplier"]}" IN ({placeholders})')
            params.extend(suppliers)
        
        if rmSuppliers:
            placeholders = ','.join(['?' for _ in rmSuppliers])
            where_clauses.append(f'"{col_map["Level_2_Raw_Material_Supplier"]}" IN ({placeholders})')
            params.extend(rmSuppliers)
        
        if hwOwners:
            placeholders = ','.join(['?' for _ in hwOwners])
            where_clauses.append(f'"{col_map["HW_Owner"]}" IN ({placeholders})')
            params.extend(hwOwners)
        
        if modules and col_map["Module"]:
            placeholders = ','.join(['?' for _ in modules])
            where_clauses.append(f'"{col_map["Module"]}" IN ({placeholders})')
            params.extend(modules)
        
        if partNumbers:
            placeholders = ','.join(['?' for _ in partNumbers])
            where_clauses.append(f'"{col_map["Level_1_PN"]}" IN ({placeholders})')
            params.extend(partNumbers)
        
        # Build final query
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM {main_table} WHERE {where_sql}"
        total = duckdb_service.conn.execute(count_query, params).fetchall()[0][0]
        
        # Get paginated data
        data_query = f"SELECT * FROM {main_table} WHERE {where_sql} LIMIT ? OFFSET ?"
        result = duckdb_service.conn.execute(data_query, params + [limit, skip]).fetchall()
        columns = [col[0] for col in duckdb_service.conn.description]
        
        data = [dict(zip(columns, row)) for row in result]
        
        elapsed = time.time() - start_time
        has_more = (skip + limit) < total
        
        return {
            "status": "success",
            "total": total,
            "skip": skip,
            "limit": limit,
            "hasMore": has_more,
            "returned_rows": len(data),
            "execution_time_ms": f"{elapsed*1000:.2f}",
            "data": data
        }
    
    except Exception as e:
        print(f"[ERROR] Datatable filter endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/demand/programs")
async def get_demand_programs(skip: int = 0, limit: int = 50):
    """
    OPTIMIZATION #1: True server-side pagination for demand programs
    
    Instead of loading all programs then slicing, query only needed records.
    Dramatically reduces memory usage and improves response time.
    
    Returns hierarchical structure: programs -> configs -> ESNs -> parts
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        # Use true server-side pagination
        paginated_data = duckdb_service.get_demand_data_paginated(skip, limit)
        total = duckdb_service.get_demand_data_count()
        has_more = (skip + limit) < total
        
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "data": paginated_data,
            "total": total,
            "skip": skip,
            "limit": limit,
            "hasMore": has_more,
            "execution_time_ms": f"{elapsed*1000:.2f}",
            "optimization": "server_side_pagination"
        }
    
    except Exception as e:
        print(f"[ERROR] Demand programs endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/demand/chart-data")
async def get_demand_chart_data():
    """
    Get aggregated chart data for Engine Program Overview
    Returns data grouped by program, year, and month with ESN counts
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        # Use the cached cdata transformation
        chart_data = duckdb_service.get_cdata()
        
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "data": chart_data,
            "row_count": len(chart_data),
            "execution_time_ms": f"{elapsed*1000:.2f}"
        }
    
    except Exception as e:
        print(f"[ERROR] Demand chart data endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/supplier-details")
async def get_supplier_details(
    supplier_name: str,
    skip: int = 0,
    limit: int = 10
):
    """
    Get paginated supplier details for a specific supplier
    Returns supplier details aggregated from demand data with pagination
    
    Parameters:
    - supplier_name: Name of the supplier to get details for
    - skip: Number of records to skip (default: 0)
    - limit: Number of records to return (default: 10)
    
    Example:
    GET /api/supplier-details?supplier_name=Supplier1&skip=0&limit=10
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        # Get demand data from DuckDB
        demand_data = duckdb_service.get_demand_data()
        
        # Extract supplier details from the demand data
        supplier_details = []
        supplier_map = {}
        
        for program in demand_data:
            for config in program.get('configs', []):
                for part in config.get('level1Parts', []):
                    if part.get('supplier') == supplier_name:
                        # Create detail record
                        detail = {
                            'supplier': part.get('supplier', ''),
                            'partNumber': part.get('pn') or part.get('partNumber', ''),
                            'parentPartNo': part.get('parentPartNo', '-'),
                            'description': part.get('description', 'Component'),
                            'hwo': part.get('hwo', 'HWO1'),
                            'level': part.get('level', 'L1'),
                            'qpe': part.get('qpe') or part.get('qtyPerEngine', '-'),
                            'mfgLT': part.get('mfgLT', 50),
                            'demand2025Q1': part.get('demand2025Q1', 0),
                            'demand2025Q2': part.get('demand2025Q2', 0),
                            'demand2025Q3': part.get('demand2025Q3', 0),
                            'demand2025Q4': part.get('demand2025Q4', 0),
                            'demand2026Q1': part.get('demand2026Q1', 0),
                            'demand2026Q2': part.get('demand2026Q2', 0),
                            'demand2026Q3': part.get('demand2026Q3', 0),
                            'demand2026Q4': part.get('demand2026Q4', 0),
                            'demand2027Q1': part.get('demand2027Q1', 0),
                            'demand2027Q2': part.get('demand2027Q2', 0),
                            'demand2027Q3': part.get('demand2027Q3', 0),
                            'demand2027Q4': part.get('demand2027Q4', 0),
                        }
                        
                        # Use part number as unique key to avoid duplicates
                        key = f"{part.get('supplier', '')}-{part.get('pn', '')}"
                        if key not in supplier_map:
                            supplier_map[key] = detail
                            supplier_details.append(detail)
        
        # Get total count before pagination
        total = len(supplier_details)
        
        # Apply pagination
        paginated_data = supplier_details[skip:skip + limit]
        has_more = (skip + limit) < total
        
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "supplier": supplier_name,
            "data": paginated_data,
            "total": total,
            "skip": skip,
            "limit": limit,
            "hasMore": has_more,
            "returned_rows": len(paginated_data),
            "execution_time_ms": f"{elapsed*1000:.2f}"
        }
    
    except Exception as e:
        print(f"[ERROR] Supplier details endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/supplier-type-distribution")
async def get_supplier_type_distribution():
    """
    Get supplier distribution grouped by Supplier_Type (Internal, AEO, External)
    Returns count and percentage for each supplier type
    
    Example response:
    {
      "status": "success",
      "data": [
        {"supplier_type": "Internal", "count": 193, "percentage": 86.55},
        {"supplier_type": "AEO", "count": 18, "percentage": 8.07},
        {"supplier_type": "External", "count": 12, "percentage": 5.38}
      ]
    }
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        distribution = duckdb_service.get_supplier_type_distribution()
        
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "data": distribution,
            "execution_time_ms": f"{elapsed*1000:.2f}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Supplier type distribution endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hw-owner-by-part-complexity")
async def get_hw_owner_by_part_complexity():
    """
    Get HW Owner distribution grouped by Part_Complexity (High, Low, Moderate)
    Returns data for stacked horizontal bar chart
    
    Example response:
    {
      "status": "success",
      "data": [
        {
          "hw_owner": "HW2",
          "High": 150,
          "Low": 240,
          "Moderate": 179,
          "total": 569
        },
        ...
      ]
    }
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        distribution = duckdb_service.get_hw_owner_by_part_complexity()
        
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "data": distribution,
            "execution_time_ms": f"{elapsed*1000:.2f}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] HW owner by part complexity endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rm-supplier-by-raw-material")
async def get_rm_supplier_by_raw_material():
    """
    Get RM Supplier distribution grouped by Raw Material Type (Level_2_Raw_Type)
    Returns count and percentage for each raw material type, excluding NaN values
    
    Example response:
    {
      "status": "success",
      "data": [
        {"raw_material": "Casting Structural", "count": 25, "percentage": 34.72},
        {"raw_material": "Forging Ring", "count": 18, "percentage": 25.00},
        {"raw_material": "Detail Part", "count": 11, "percentage": 15.28},
        ...
      ]
    }
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        distribution = duckdb_service.get_rm_supplier_by_raw_material()
        
        elapsed = time.time() - start_time
        
        return {
            "status": "success",
            "data": distribution,
            "execution_time_ms": f"{elapsed*1000:.2f}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] RM supplier by raw material endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rm-supplier-details/{raw_material_type}")
async def get_rm_supplier_details(
    raw_material_type: str,
    product_lines: Optional[List[str]] = Query(None),
    years: Optional[List[str]] = Query(None),
    configs: Optional[List[str]] = Query(None),
    suppliers: Optional[List[str]] = Query(None),
    hw_owners: Optional[List[str]] = Query(None),
    part_numbers: Optional[List[str]] = Query(None)
):
    """
    Get detailed RM supplier information with quarterly demand for a specific raw material type
    Supports filtering by product lines, years, configs, suppliers, hw owners, and part numbers
    
    Args:
        raw_material_type: The raw material type (e.g., "Casting Structural", "Forging Ring")
        product_lines: Optional list of product lines to filter by
        years: Optional list of years to filter by
        configs: Optional list of configurations to filter by
        suppliers: Optional list of parent part suppliers to filter by
        hw_owners: Optional list of HW owners to filter by
        part_numbers: Optional list of part numbers to filter by
    
    Example response:
    {
      "status": "success",
      "data": [
        {
          "name": "RM Supplier 18",
          "partNumber": "RM PN8",
          "parentPartNo": "PN18",
          "parentPartSupplier": "Supplier A",
          "description": "Part Desc16",
          "hwo": "HW1",
          "level": "L2",
          "qpe": "2",
          "mfgLT": "45",
          "quarters": {
            "2025-Q1": 5,
            "2025-Q2": 3,
            "2026-Q1": 8
          }
        },
        ...
      ]
    }
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        # Build filters dictionary
        filters = {}
        if product_lines:
            filters['product_lines'] = product_lines
        if years:
            filters['years'] = years
        if configs:
            filters['configs'] = configs
        if suppliers:
            filters['suppliers'] = suppliers
        if hw_owners:
            filters['hw_owners'] = hw_owners
        if part_numbers:
            filters['part_numbers'] = part_numbers
        
        details = duckdb_service.get_rm_supplier_details_by_raw_material(raw_material_type, filters)
        
        elapsed = time.time() - start_time
        
        print(f"[API] RM Supplier details for '{raw_material_type}': {len(details)} records in {elapsed*1000:.2f}ms")
        
        return {
            "status": "success",
            "data": details,
            "raw_material_type": raw_material_type,
            "filters_applied": filters,
            "execution_time_ms": f"{elapsed*1000:.2f}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] RM supplier details endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/supplier-details/{supplier_type}")
async def get_supplier_details(supplier_type: str):
    """
    Get detailed supplier information with quarterly demand for a specific supplier type
    
    Args:
        supplier_type: The supplier type (e.g., "Internal", "AEO", "External")
    
    Example response:
    {
      "status": "success",
      "data": [
        {
          "name": "Supplier 5",
          "partNumber": "PN18",
          "description": "Part Desc16",
          "hwo": "HW1",
          "level": "L1",
          "qpe": "2",
          "mfgLT": "-",
          "quarters": {
            "2025-Q1": 5,
            "2025-Q2": 3,
            "2026-Q1": 8
          }
        },
        ...
      ]
    }
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        details = duckdb_service.get_supplier_details_by_type(supplier_type)
        
        elapsed = time.time() - start_time
        
        print(f"[API] Supplier details for '{supplier_type}': {len(details)} records in {elapsed*1000:.2f}ms")
        
        return {
            "status": "success",
            "data": details,
            "supplier_type": supplier_type,
            "execution_time_ms": f"{elapsed*1000:.2f}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Supplier details endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gap-analysis/all")
async def get_gap_analysis_data(skip: int = 0, limit: int = 1000):
    """
    Get gap analysis data - only records where Have Gap = 'Y'
    Supports pagination for efficient data loading
    
    Args:
        skip: Number of records to skip (default: 0)
        limit: Number of records to return (default: 1000)
    
    Returns only records with:
        - Have_Gap = 'Y' OR Gap_Y_N = 'Y' OR various gap column variations
    
    Example response:
    {
      "status": "success",
      "total": 500,
      "data": [
        {
          "ENGINE_PROGRAM": "LM2500",
          "Configuration": "Standard",
          "ESN": "ESN-001",
          "Part_Number": "PN-001",
          "Have_Gap": "Y",
          ...
        }
      ]
    }
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        main_table = duckdb_service._get_main_table()
        
        # Get column names
        column_check = duckdb_service.conn.execute(f"SELECT * FROM {main_table} LIMIT 0").description
        column_names = [col[0] for col in column_check]
        
        # Find which gap column exists in the database
        gap_columns = ['Have_Gap', 'Gap_Y_N', 'Gap (Y/N)', 'Gap_YN', 'have_gap', 'gap_y_n', 'gap_yn']
        gap_col = None
        for col in gap_columns:
            if col in column_names:
                gap_col = col
                break
        
        if not gap_col:
            # If no gap column found, return empty result
            print("[WARNING] No gap indicator column found in database")
            return {
                "status": "success",
                "total": 0,
                "skip": skip,
                "limit": limit,
                "hasMore": False,
                "returned_rows": 0,
                "execution_time_ms": "0",
                "data": [],
                "message": "No gap indicator column found in database"
            }
        
        print(f"[GAP ANALYSIS] Using gap column: {gap_col}")
        
        # Find which priority column exists in the database
        priority_columns = ['Priority', 'PRIORITY', 'priority']
        priority_col = None
        for col in priority_columns:
            if col in column_names:
                priority_col = col
                break
        
        # Build query to filter for gap records only
        count_query = f"""
            SELECT COUNT(*) 
            FROM {main_table} 
            WHERE "{gap_col}" = 'Y'
        """
        total = duckdb_service.conn.execute(count_query).fetchall()[0][0]
        
        # Build ORDER BY clause for priority sorting (P1 first)
        order_by_clause = ""
        if priority_col:
            # Use CASE to map priorities to numeric values for sorting
            order_by_clause = f"""
                ORDER BY 
                    CASE 
                        WHEN "{priority_col}" IN ('P1', '1', 'CRITICAL') THEN 1
                        WHEN "{priority_col}" IN ('P2', '2', 'HIGH') THEN 2
                        WHEN "{priority_col}" IN ('P3', '3', 'MEDIUM') THEN 3
                        WHEN "{priority_col}" IN ('P4', '4', 'LOW') THEN 4
                        ELSE 5
                    END
            """
            print(f"[GAP ANALYSIS] Sorting by priority column: {priority_col}")
        
        # Get paginated gap records sorted by priority
        data_query = f"""
            SELECT * 
            FROM {main_table} 
            WHERE "{gap_col}" = 'Y'
            {order_by_clause}
            LIMIT {limit} OFFSET {skip}
        """
        result = duckdb_service.conn.execute(data_query).fetchall()
        columns = [col[0] for col in duckdb_service.conn.description]
        
        data = [dict(zip(columns, row)) for row in result]
        
        elapsed = time.time() - start_time
        has_more = (skip + limit) < total
        
        print(f"[GAP ANALYSIS] Returned {len(data)} gap records (total: {total}) in {elapsed*1000:.2f}ms")
        
        return {
            "status": "success",
            "total": total,
            "skip": skip,
            "limit": limit,
            "hasMore": has_more,
            "returned_rows": len(data),
            "execution_time_ms": f"{elapsed*1000:.2f}",
            "data": data,
            "gap_column_used": gap_col
        }
    
    except Exception as e:
        print(f"[ERROR] Gap analysis endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gap-analysis/kpis")
async def get_gap_analysis_kpis():
    """
    Get KPI data for gap analysis dashboard
    Uses actual Priority and Have_Gap columns from database
    
    Returns:
    {
      "status": "success",
      "kpis": {
        "totalGaps": {"count": 100, "status": "10% Gap"},
        "criticalPriority": {"count": 20, "status": "P1 - Past Due"},
        "highPriority": {"count": 30, "status": "P2 - Due Soon"},
        "mediumPriority": {"count": 25, "status": "P3 - Upcoming"},
        "lowPriority": {"count": 15, "status": "P4 - Low Risk"},
        "onTrack": {"count": 900, "status": "Meeting targets"}
      }
    }
    """
    try:
        if not duckdb_service:
            raise HTTPException(status_code=500, detail="DuckDB service not initialized")
        
        start_time = time.time()
        
        kpis = duckdb_service.get_gap_analysis_kpis()
        
        elapsed = time.time() - start_time
        
        print(f"[GAP ANALYSIS KPIs] Retrieved in {elapsed*1000:.2f}ms")
        
        return {
            "status": "success",
            "kpis": kpis,
            "execution_time_ms": f"{elapsed*1000:.2f}"
        }
    
    except Exception as e:
        print(f"[ERROR] Gap analysis KPIs endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
