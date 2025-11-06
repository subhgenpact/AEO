"""
DuckDB Service for ultra-fast data loading, filtering, and aggregations
DuckDB is an embedded SQL database optimized for OLAP queries and analytical workloads
"""

import duckdb
import polars as pl
import pandas as pd
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
import json


class DuckDBService:
    """Service for loading and querying data using DuckDB"""
    
    def __init__(self, duckdb_path: str = "data/data.duckdb", data_path: str = "data/AEO-transformed-data.xlsx", 
                 sheet_name: str = "Sheet1", load_output_sheet: bool = False, df: pl.DataFrame = None):
        # If dataframe is provided (already loaded), use it directly
        if df is not None:
            self.df = df
            self.data_path = None
            self.sheet_name = None
            self.duckdb_path = None
            self.use_external_db = False
        else:
            # Check if external DuckDB file exists
            duckdb_file = Path(duckdb_path)
            if duckdb_file.exists():
                self.duckdb_path = duckdb_file
                self.data_path = None
                self.sheet_name = None
                self.df = None
                self.use_external_db = True
            else:
                # Fall back to loading from Excel
                self.duckdb_path = None
                self.data_path = Path(data_path)
                self.sheet_name = sheet_name
                self.df = None
                self.use_external_db = False
        
        self.load_output_sheet = load_output_sheet
        self.conn: Optional[duckdb.DuckDBPyConnection] = None
        self.output_df: Optional[pl.DataFrame] = None
        self.main_table: str = "raw_data"  # Will be set during initialization
        
        # Column name mappings - will be detected based on actual schema
        self.program_col: str = "ENGINE_PROGRAM"
        self.config_col: str = "Configuration"
        self.part_col: str = "Part_Number"
        self.rm_supplier_col: str = "Level_2_Raw_Material_Supplier"
        self.supplier_col: str = "Parent_Part_Supplier"
        self.hw_owner_col: str = "HW_OWNER"
        self.module_col: Optional[str] = None
        self.esn_col: str = "ESN"
        self.target_date_col: str = "Target_Ship_Date"
        self.level2_pn_col: str = "Level_2_PN"
        self.level2_raw_type_col: str = "Level_2_Raw_Type"
        
        self._initialize_duckdb()
    
    def _initialize_duckdb(self):
        """Initialize DuckDB connection and load data"""
        try:
            # If using external DuckDB file, connect to it directly
            if self.use_external_db and self.duckdb_path:
                print(f"Connecting to existing DuckDB file: {self.duckdb_path}...")
                self.conn = duckdb.connect(str(self.duckdb_path), read_only=False)
                
                # Get the table names in the database
                tables = self.conn.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='main'").fetchall()
                table_names = [t[0] for t in tables]
                print(f"[OK] Connected to DuckDB database")
                print(f"     Source: {self.duckdb_path}")
                print(f"     Available tables: {', '.join(table_names)}")
                
                # Prefer "Output" if available (main data), then "Sheet1", otherwise use the first table
                main_table = None
                if "Output" in table_names:
                    main_table = "Output"
                    print(f"     Using table: {main_table} (primary data table)")
                elif "Sheet1" in table_names:
                    main_table = "Sheet1"
                    print(f"     Using table: {main_table} (fallback)")
                elif table_names:
                    main_table = table_names[0]
                    print(f"     Using table: {main_table}")
                
                if main_table:
                    self.main_table = main_table  # Store the main table name
                    self.df = self.conn.execute(f"SELECT * FROM {main_table}").pl()
                    print(f"     Loaded {self.df.shape[0]:,} rows, {self.df.shape[1]} columns")
                else:
                    print("[WARN] No tables found in DuckDB database")
                    self.df = pl.DataFrame()
            else:
                # Create in-memory DuckDB connection
                self.conn = duckdb.connect(':memory:')
                
                # If dataframe not provided, load from file
                if self.df is None:
                    print(f"Loading Excel data into DuckDB from {self.sheet_name}...")
                    print(f"  Using pandas for reading large file...")
                    try:
                        df_pd = pd.read_excel(self.data_path, sheet_name=self.sheet_name, dtype=str)
                        df = pl.from_pandas(df_pd)
                    except Exception as e:
                        print(f"  Pandas failed ({e}), trying Polars...")
                        df = pl.read_excel(self.data_path, sheet_name=self.sheet_name)
                    self.df = df
                else:
                    print(f"Using pre-loaded DataFrame with {self.df.shape[0]:,} rows...")
                
                # Register the DataFrame as a DuckDB table
                self.conn.register("raw_data", self.df)
                
                print(f"[OK] DuckDB initialized with {self.df.shape[0]:,} rows, {self.df.shape[1]} columns")
                if self.data_path:
                    print(f"     Source: {self.data_path} ({self.sheet_name})")
                print(f"     Table 'raw_data' registered for SQL queries")
            
            # Load Output sheet from Dummy Data_v6.xlsx if requested
            if self.load_output_sheet:
                self._load_output_sheet()
            
            # Create useful indexes/views for common queries
            self._create_indexes()
            
        except Exception as e:
            print(f"✗ Error initializing DuckDB: {e}")
            raise
    
    def _load_output_sheet(self):
        """Load Output sheet from Dummy Data_v6.xlsx"""
        try:
            # Try multiple paths in order of preference
            possible_paths = [
                Path("data/Dummy Data_v6.xlsx"),
                Path("../AEO/AEO-FastAPI/data/Dummy Data_v6.xlsx"),
                Path("C:/Users/850080658/Documents/Me/AEO/AEO-FastAPI/data/Dummy Data_v6.xlsx"),
                Path("C:\\Users\\850080658\\Documents\\Me\\AEO\\AEO-FastAPI\\data\\Dummy Data_v6.xlsx"),
            ]
            
            output_path = None
            for path in possible_paths:
                if path.exists():
                    output_path = path
                    break
            
            if output_path is None:
                print(f"⚠ Output sheet not found. Tried paths:")
                for path in possible_paths:
                    print(f"    - {path}")
                return
            
            print(f"Loading Output sheet from {output_path}...")
            print("  (This may take a moment for large files...)")
            
            try:
                # Try using pandas with dtype as string to avoid type inference issues
                output_pd = pd.read_excel(output_path, sheet_name="Output", dtype=str)
                # Convert to Polars for consistency
                output_df = pl.from_pandas(output_pd)
            except Exception as e:
                print(f"  Pandas read failed ({type(e).__name__}), trying Polars...")
                try:
                    output_df = pl.read_excel(output_path, sheet_name="Output")
                except Exception as e2:
                    print(f"  Polars also failed: {type(e2).__name__}: {e2}")
                    print("  Continuing without Output sheet...")
                    return
            
            self.output_df = output_df
            
            # Register as output_data table
            self.conn.register("output_data", output_df)
            
            print(f"✓ Output data loaded: {output_df.shape[0]:,} rows, {output_df.shape[1]} columns")
            print(f"  Table 'output_data' registered for SQL queries")
            print(f"  Columns: {', '.join(output_df.columns[:5])}..." if len(output_df.columns) > 5 else f"  Columns: {', '.join(output_df.columns)}")
        except Exception as e:
            print(f"⚠ Error loading Output sheet: {type(e).__name__}: {e}")
    
    def _create_indexes(self):
        """
        OPTIMIZATION #4: Create indexes and views for common queries
        
        Adds database indexes on frequently queried columns for better performance.
        Based on PAGINATION_IMPLEMENTATION.md recommendations.
        """
        try:
            # Use the stored main table name
            if self.use_external_db:
                main_table = self.main_table
            else:
                main_table = "raw_data"
            
            # These queries are pre-compiled for fast execution
            # DuckDB automatically optimizes common patterns
            
            # Test if the column exists in the table
            try:
                self.conn.execute(f"SELECT COUNT(*) FROM {main_table} LIMIT 1")
                print(f"     Table {main_table} is accessible")
            except Exception as e:
                print(f"[WARN] Cannot access table {main_table}: {e}")
                return
            
            # Get column names to determine naming convention (spaces vs underscores)
            # IMPORTANT: This MUST happen BEFORE creating indexes
            columns_result = self.conn.execute(f"SELECT * FROM {main_table} LIMIT 0").description
            column_names = [col[0] for col in columns_result]
            
            # Determine which column naming convention is used and store as instance variables
            self.program_col = "ENGINE_PROGRAM" if "ENGINE_PROGRAM" in column_names else "ENGINE PROGRAM"
            self.config_col = "Configuration" if "Configuration" in column_names else "CONFIGURATION"
            self.part_col = "Part_Number" if "Part_Number" in column_names else "Part Number"
            self.rm_supplier_col = "Level_2_Raw_Material_Supplier" if "Level_2_Raw_Material_Supplier" in column_names else "Level 2 Raw Material Supplier"
            self.supplier_col = "Parent_Part_Supplier" if "Parent_Part_Supplier" in column_names else "Parent Part Supplier"
            self.hw_owner_col = "HW_OWNER" if "HW_OWNER" in column_names else "HW OWNER"
            self.module_col = "Module" if "Module" in column_names else None
            self.esn_col = "ESN" if "ESN" in column_names else "esn"
            self.target_date_col = "Target_Ship_Date" if "Target_Ship_Date" in column_names else "Target Ship Date"
            self.level2_pn_col = "Level_2_PN" if "Level_2_PN" in column_names else "Level 2 PN"
            self.level2_raw_type_col = "Level_2_Raw_Type" if "Level_2_Raw_Type" in column_names else "Level 2 Raw Type"
            
            # OPTIMIZATION #4: Create indexes on frequently queried columns
            try:
                print("     Creating performance indexes...")
                
                # Index on ENGINE_PROGRAM for program filtering
                self.conn.execute(f'CREATE INDEX IF NOT EXISTS idx_engine_program ON {main_table} ("{self.program_col}")')
                
                # Index on Configuration for config filtering  
                self.conn.execute(f'CREATE INDEX IF NOT EXISTS idx_configuration ON {main_table} ("{self.config_col}")')
                
                # Index on Parent_Part_Supplier for supplier filtering
                self.conn.execute(f'CREATE INDEX IF NOT EXISTS idx_parent_supplier ON {main_table} ("{self.supplier_col}")')
                
                # Index on Level_2_Raw_Material_Supplier for RM supplier filtering
                self.conn.execute(f'CREATE INDEX IF NOT EXISTS idx_rm_supplier ON {main_table} ("{self.rm_supplier_col}")')
                
                # Index on HW_OWNER for HW owner filtering
                self.conn.execute(f'CREATE INDEX IF NOT EXISTS idx_hw_owner ON {main_table} ("{self.hw_owner_col}")')
                
                # Index on Part_Number for part number filtering
                self.conn.execute(f'CREATE INDEX IF NOT EXISTS idx_part_number ON {main_table} ("{self.part_col}")')
                
                # Composite index for common query patterns (program + config)
                self.conn.execute(f'CREATE INDEX IF NOT EXISTS idx_program_config ON {main_table} ("{self.program_col}", "{self.config_col}")')
                
                print("     ✓ Performance indexes created successfully")
                
            except Exception as e:
                print(f"[WARN] Could not create indexes: {e}")
                # Continue without indexes - queries will still work but slower
            
            # Reference local variables for view creation
            program_col = self.program_col
            config_col = self.config_col
            part_col = self.part_col
            rm_supplier_col = self.rm_supplier_col
            supplier_col = self.supplier_col
            hw_owner_col = self.hw_owner_col
            module_col = self.module_col
            
            # View for unique programs
            try:
                self.conn.execute(f"""
                    CREATE OR REPLACE VIEW unique_programs AS
                    SELECT DISTINCT "{program_col}" as program
                    FROM {main_table}
                    WHERE "{program_col}" IS NOT NULL AND "{program_col}" != ''
                    ORDER BY program
                """)
            except Exception as e:
                print(f"[WARN] Could not create unique_programs view: {e}")
            
            # View for unique configurations
            try:
                config_col_check = "Configuration" if "Configuration" in column_names else ("CONFIGURATION" if "CONFIGURATION" in column_names else None)
                if config_col_check:
                    self.conn.execute(f"""
                        CREATE OR REPLACE VIEW unique_configs AS
                        SELECT DISTINCT "{config_col_check}" as config
                        FROM {main_table}
                        WHERE "{config_col_check}" IS NOT NULL AND "{config_col_check}" != ''
                        ORDER BY config
                    """)
            except Exception as e:
                print(f"[WARN] Could not create unique_configs view: {e}")
            
            # View for unique part numbers
            try:
                self.conn.execute(f"""
                    CREATE OR REPLACE VIEW unique_part_numbers AS
                    SELECT DISTINCT "{part_col}" as part_number
                    FROM {main_table}
                    WHERE "{part_col}" IS NOT NULL AND "{part_col}" != ''
                    ORDER BY part_number
                """)
            except Exception as e:
                print(f"[WARN] Could not create unique_part_numbers view: {e}")
            
            # View for raw material suppliers
            try:
                self.conn.execute(f"""
                    CREATE OR REPLACE VIEW unique_rm_suppliers AS
                    SELECT DISTINCT "{rm_supplier_col}" as rm_supplier
                    FROM {main_table}
                    WHERE "{rm_supplier_col}" IS NOT NULL AND "{rm_supplier_col}" != ''
                    ORDER BY rm_supplier
                """)
            except Exception as e:
                print(f"[WARN] Could not create unique_rm_suppliers view: {e}")
            
            # View for part suppliers
            try:
                self.conn.execute(f"""
                    CREATE OR REPLACE VIEW unique_suppliers AS
                    SELECT DISTINCT "{supplier_col}" as supplier
                    FROM {main_table}
                    WHERE "{supplier_col}" IS NOT NULL AND "{supplier_col}" != ''
                    ORDER BY supplier
                """)
            except Exception as e:
                print(f"[WARN] Could not create unique_suppliers view: {e}")
            
            # View for HW owners
            try:
                self.conn.execute(f"""
                    CREATE OR REPLACE VIEW unique_hw_owners AS
                    SELECT DISTINCT "{hw_owner_col}" as hw_owner
                    FROM {main_table}
                    WHERE "{hw_owner_col}" IS NOT NULL AND "{hw_owner_col}" != ''
                    ORDER BY hw_owner
                """)
            except Exception as e:
                print(f"[WARN] Could not create unique_hw_owners view: {e}")
            
            # View for modules (if it exists)
            if module_col:
                try:
                    self.conn.execute(f"""
                        CREATE OR REPLACE VIEW unique_modules AS
                        SELECT DISTINCT "{module_col}" as module
                        FROM {main_table}
                        WHERE "{module_col}" IS NOT NULL AND "{module_col}" != ''
                        ORDER BY module
                    """)
                except Exception as e:
                    print(f"[WARN] Could not create unique_modules view: {e}")
            
            print("[OK] Views and indexes created for optimized queries")
            
        except Exception as e:
            print(f"[WARN] Warning creating views: {e}")
    
    def _get_main_table(self) -> str:
        """Get the main data table name"""
        return self.main_table
    
    def query(self, sql: str) -> List[Dict[str, Any]]:
        """Execute a SQL query and return results as list of dicts"""
        try:
            result = self.conn.execute(sql).fetchall()
            columns = [desc[0] for desc in self.conn.description]
            return [dict(zip(columns, row)) for row in result]
        except Exception as e:
            print(f"✗ Query error: {e}")
            raise
    
    def query_to_polars(self, sql: str) -> pl.DataFrame:
        """Execute a SQL query and return results as Polars DataFrame"""
        try:
            return self.conn.execute(sql).pl()
        except Exception as e:
            print(f"✗ Query error: {e}")
            raise
    
    def get_unique_values(self, column: str) -> List[str]:
        """Get unique values for a column - optimized for filter dropdowns"""
        try:
            main_table = self._get_main_table()
            
            # Map underscore column names to actual column names (with spaces)
            column_map = {
                "ENGINE_PROGRAM": self.program_col,
                "Configuration": self.config_col,
                "Part_Number": self.part_col,
                "Level_2_Raw_Material_Supplier": self.rm_supplier_col,
                "Parent_Part_Supplier": self.supplier_col,
                "HW_OWNER": self.hw_owner_col,
                "Module": self.level2_raw_type_col,
                "Level_2_Raw_Type": self.level2_raw_type_col,
                "Level_2_PN": self.level2_pn_col,
                "Target_Ship_Date": self.target_date_col,
                "ESN": self.esn_col
            }
            
            # Use mapped column name if available, otherwise use as-is
            actual_column = column_map.get(column, column)
            
            # Special case: Module maps to Level_2_Raw_Type
            if column == "Module":
                actual_column = self.level2_raw_type_col
            
            result = self.conn.execute(f"""
                SELECT DISTINCT "{actual_column}" as value
                FROM {main_table}
                WHERE "{actual_column}" IS NOT NULL AND "{actual_column}" != ''
                ORDER BY value
            """).fetchall()
            return [row[0] for row in result]
        except Exception as e:
            print(f"✗ Error getting unique values for {column}: {e}")
            return []
    
    def get_years_from_date(self, column: str) -> List[str]:
        """Extract unique years from a date column - for year filter dropdown"""
        try:
            main_table = self._get_main_table()
            
            # Map to actual column name if needed
            if column == "Target_Ship_Date" or column == "Target Ship Date":
                column = self.target_date_col
            
            print(f"[DEBUG] Extracting years from column: {column}, table: {main_table}")
            
            # Target_Ship_Date is stored as VARCHAR, so we need to parse it first
            # Try multiple date parsing strategies
            result = self.conn.execute(f"""
                SELECT DISTINCT 
                    CAST(YEAR(TRY_CAST("{column}" AS DATE)) AS VARCHAR) as year
                FROM {main_table}
                WHERE "{column}" IS NOT NULL 
                    AND "{column}" != ''
                    AND TRY_CAST("{column}" AS DATE) IS NOT NULL
                ORDER BY year DESC
            """).fetchall()
            
            years = [str(row[0]) for row in result if row[0]]
            print(f"[DEBUG] Found years: {years}")
            
            if not years:
                # Fallback: try to extract year from string using SUBSTRING
                print(f"[DEBUG] Trying fallback method to extract years from string format")
                result = self.conn.execute(f"""
                    SELECT DISTINCT 
                        SUBSTRING("{column}", LENGTH("{column}") - 3, 4) as year
                    FROM {main_table}
                    WHERE "{column}" IS NOT NULL 
                        AND "{column}" != ''
                        AND LENGTH("{column}") >= 4
                    ORDER BY year DESC
                """).fetchall()
                years = [str(row[0]) for row in result if row[0] and row[0].isdigit()]
                print(f"[DEBUG] Found years using fallback: {years}")
            
            return years if years else ['2025', '2026', '2027', '2028']
        except Exception as e:
            print(f"✗ Error extracting years from {column}: {e}")
            # Fallback to standard years
            return ['2025', '2026', '2027', '2028']
    
    def filter_data(self, filters: Dict[str, List[str]]) -> pl.DataFrame:
        """
        Filter data based on multiple criteria - ultra-fast with DuckDB SQL
        
        Args:
            filters: Dict like {
                "ENGINE PROGRAM": ["LM2500", "LM6000"],
                "Configuration": ["Single", "Multi"],
                "Parent Part Supplier": ["Supplier1", "Supplier2"]
            }
        
        Returns:
            Filtered Polars DataFrame
        """
        try:
            main_table = self._get_main_table()
            # Build WHERE clause with proper quoting
            where_clauses = []
            params = {}
            
            for col, values in filters.items():
                if values:  # Only add if values provided
                    placeholders = [f"${i}" for i in range(len(values))]
                    where_clauses.append(f'"{col}" IN ({",".join(placeholders)})')
                    for i, val in enumerate(values):
                        params[f"${i}"] = val
            
            if not where_clauses:
                # No filters, return all data
                return self.conn.execute(f"SELECT * FROM {main_table}").pl()
            
            where_sql = " AND ".join(where_clauses)
            sql = f"SELECT * FROM {main_table} WHERE {where_sql}"
            
            # Execute with parameters
            return self.conn.execute(sql, params).pl()
            
        except Exception as e:
            print(f"✗ Filter error: {e}")
            raise
    
    def get_demand_data(self) -> List[Dict[str, Any]]:
        """Get demand data in hierarchical format - optimized with DuckDB grouping"""
        try:
            main_table = self._get_main_table()
            # Get all unique programs
            programs = self.query(f"""
                SELECT DISTINCT "{self.program_col}" as program
                FROM {main_table}
                WHERE "{self.program_col}" IS NOT NULL AND "{self.program_col}" != ''
                ORDER BY program
            """)
            
            demand_data = []
            
            for prog_row in programs:
                program = prog_row['program']
                
                # Get all configurations for this program
                configs = self.query(f"""
                    SELECT DISTINCT "{self.config_col}" as config
                    FROM {main_table}
                    WHERE "{self.program_col}" = '{program}'
                    AND "{self.config_col}" IS NOT NULL AND "{self.config_col}" != ''
                    ORDER BY config
                """)
                
                config_list = []
                
                for cfg_row in configs:
                    config = cfg_row['config']
                    
                    # Get ESNs for this program+config
                    esns = self.query(f"""
                        SELECT DISTINCT "{self.esn_col}" as esn, "{self.target_date_col}" as target_date
                        FROM {main_table}
                        WHERE "{self.program_col}" = '{program}'
                        AND "{self.config_col}" = '{config}'
                        AND "{self.esn_col}" IS NOT NULL AND "{self.esn_col}" != ''
                        ORDER BY esn
                    """)
                    
                    esns_formatted = []
                    for esn_row in esns:
                        esn_formatted = self._format_esn(esn_row)
                        if esn_formatted:
                            esns_formatted.append(esn_formatted)
                    
                    # Get level 1 parts for this program+config
                    level1_parts = self._get_level1_parts(program, config)
                    
                    config_list.append({
                        "config": config,
                        "esns": esns_formatted,
                        "level1Parts": level1_parts
                    })
                
                if config_list:
                    demand_data.append({
                        "engineProgram": program,
                        "configs": config_list
                    })
            
            return demand_data
        
        except Exception as e:
            print(f"✗ Error getting demand data: {e}")
            raise

    def get_demand_data_paginated(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """
        OPTIMIZATION #1: True server-side pagination for demand data
        
        Instead of loading all programs then slicing, query only needed records.
        Dramatically reduces memory usage and improves response time.
        
        Args:
            skip: Number of programs to skip
            limit: Maximum number of programs to return
            
        Returns:
            Paginated list of demand programs
        """
        try:
            main_table = self._get_main_table()
            
            # Get paginated programs using LIMIT/OFFSET
            programs = self.query(f"""
                SELECT DISTINCT "{self.program_col}" as program
                FROM {main_table}
                WHERE "{self.program_col}" IS NOT NULL AND "{self.program_col}" != ''
                ORDER BY program
                LIMIT {limit} OFFSET {skip}
            """)
            
            demand_data = []
            
            for prog_row in programs:
                program = prog_row['program']
                
                # Get all configurations for this program
                configs = self.query(f"""
                    SELECT DISTINCT "{self.config_col}" as config
                    FROM {main_table}
                    WHERE "{self.program_col}" = '{program}'
                    AND "{self.config_col}" IS NOT NULL AND "{self.config_col}" != ''
                    ORDER BY config
                """)
                
                config_list = []
                
                for cfg_row in configs:
                    config = cfg_row['config']
                    
                    # Get ESNs for this program+config
                    esns = self.query(f"""
                        SELECT DISTINCT "{self.esn_col}" as esn, "{self.target_date_col}" as target_date
                        FROM {main_table}
                        WHERE "{self.program_col}" = '{program}'
                        AND "{self.config_col}" = '{config}'
                        AND "{self.esn_col}" IS NOT NULL AND "{self.esn_col}" != ''
                        ORDER BY esn
                    """)
                    
                    esns_formatted = []
                    for esn_row in esns:
                        esn_formatted = self._format_esn(esn_row)
                        if esn_formatted:
                            esns_formatted.append(esn_formatted)
                    
                    # Get level 1 parts for this program+config
                    level1_parts = self._get_level1_parts(program, config)
                    
                    config_list.append({
                        "config": config,
                        "esns": esns_formatted,
                        "level1Parts": level1_parts
                    })
                
                if config_list:
                    demand_data.append({
                        "engineProgram": program,
                        "configs": config_list
                    })
            
            return demand_data
        
        except Exception as e:
            print(f"✗ Error getting paginated demand data: {e}")
            raise

    def get_demand_data_count(self) -> int:
        """Get total count of demand programs for pagination"""
        try:
            main_table = self._get_main_table()
            result = self.query(f"""
                SELECT COUNT(DISTINCT "{self.program_col}") as total
                FROM {main_table}
                WHERE "{self.program_col}" IS NOT NULL AND "{self.program_col}" != ''
            """)
            return result[0]['total'] if result else 0
        except Exception as e:
            print(f"✗ Error getting demand data count: {e}")
            return 0
    
    def get_cdata(self) -> List[Dict[str, Any]]:
        """Get cdata for Engine Program Overview chart - optimized with DuckDB aggregation counting DISTINCT ESNs"""
        try:
            main_table = self._get_main_table()
            # Fetch ESN data grouped by program, year, month to count DISTINCT ESNs
            result = self.query(f"""
                SELECT 
                    "{self.program_col}" as PL,
                    YEAR(TRY_CAST("{self.target_date_col}" AS DATE)) as year,
                    MONTHNAME(TRY_CAST("{self.target_date_col}" AS DATE)) as month_name,
                    MONTH(TRY_CAST("{self.target_date_col}" AS DATE)) as month_num,
                    COUNT(DISTINCT "{self.esn_col}") as distinct_esn_count
                FROM {main_table}
                WHERE "{self.program_col}" IS NOT NULL 
                AND "{self.program_col}" != ''
                AND "{self.target_date_col}" IS NOT NULL
                AND "{self.esn_col}" IS NOT NULL
                GROUP BY 
                    "{self.program_col}",
                    YEAR(TRY_CAST("{self.target_date_col}" AS DATE)),
                    MONTHNAME(TRY_CAST("{self.target_date_col}" AS DATE)),
                    MONTH(TRY_CAST("{self.target_date_col}" AS DATE))
                ORDER BY year, month_num, "{self.program_col}"
            """)
            
            # Transform to cdata format
            cdata = []
            month_order = {"January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
                          "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12}
            
            for row in result:
                pl = row['PL']
                year = row['year']
                month_full = row['month_name']
                month_num = row['month_num']
                distinct_count = row['distinct_esn_count']
                
                # Convert full month name to 3-letter abbreviation
                month_abbr = month_full[:3] if month_full else "Jan"
                
                cdata.append({
                    "PL": pl,
                    "Mon": month_abbr,
                    "Year": year,
                    "No": distinct_count,
                    "Mon-Yr": f"{year}{month_abbr}",
                    "Month": f"{month_num}/1/{year}"
                })
            
            return cdata
        
        except Exception as e:
            print(f"✗ Error getting cdata: {e}")
            raise
    
    def _format_esn(self, esn_row: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """Format ESN row with date parsing"""
        try:
            esn = str(esn_row['esn']).strip()
            if not esn:
                return None
            
            date_str = ""
            target_date = esn_row.get('target_date')
            
            if target_date:
                try:
                    date_val = str(target_date).strip()
                    dt = None
                    formats = ["%m-%d-%y", "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%m-%d-%Y"]
                    
                    for fmt in formats:
                        try:
                            dt = datetime.strptime(date_val, fmt)
                            break
                        except:
                            continue
                    
                    if dt:
                        date_str = dt.strftime("%m/%d/%Y")
                    else:
                        date_str = date_val
                except:
                    date_str = str(target_date)
            
            return {
                "esn": esn,
                "targetShipDate": date_str
            }
        except Exception as e:
            print(f"⚠ Error formatting ESN: {e}")
            return None
    
    def _get_level1_parts(self, program: str, config: str) -> List[Dict[str, Any]]:
        """Get Level 1 parts for a program and config using DuckDB query"""
        try:
            main_table = self._get_main_table()
            parts = self.query(f"""
                SELECT DISTINCT 
                    "{self.part_col}" as pn,
                    "{self.hw_owner_col}" as hw_owner,
                    "{self.supplier_col}" as supplier,
                    CAST("QPE" AS INTEGER) as qpe
                FROM {main_table}
                WHERE "{self.program_col}" = '{program}'
                AND "{self.config_col}" = '{config}'
                AND "{self.part_col}" IS NOT NULL AND "{self.part_col}" != ''
            """)
            
            result = []
            for part in parts:
                pn = str(part['pn']).strip()
                if not pn:
                    continue
                
                # Get HW owners (split by comma if multiple)
                hw_owner_str = str(part.get('hw_owner', ''))
                hwo_list = [h.strip() for h in hw_owner_str.split(',') if h.strip()] if hw_owner_str else []
                
                # Get Level 2 parts
                level2_parts = self._get_level2_parts(program, config, pn)
                
                result.append({
                    "pn": pn,
                    "hwo": hwo_list,
                    "supplier": str(part.get('supplier', '')),
                    "qpe": int(part.get('qpe', 1)) if part.get('qpe') else 1,
                    "level2Parts": level2_parts
                })
            
            return result
        except Exception as e:
            print(f"⚠ Error getting Level 1 parts: {e}")
            return []
    
    def _get_level2_parts(self, program: str, config: str, parent_pn: str) -> List[Dict[str, Any]]:
        """Get Level 2 parts for a parent part"""
        try:
            main_table = self._get_main_table()
            level2 = self.query(f"""
                SELECT DISTINCT
                    "{self.level2_pn_col}" as pn,
                    "{self.level2_raw_type_col}" as raw_type,
                    "{self.rm_supplier_col}" as rm_supplier
                FROM {main_table}
                WHERE "{self.program_col}" = '{program}'
                AND "{self.config_col}" = '{config}'
                AND "{self.part_col}" = '{parent_pn}'
                AND "{self.level2_pn_col}" IS NOT NULL AND "{self.level2_pn_col}" != ''
            """)
            
            result = []
            for l2 in level2:
                pn = str(l2['pn']).strip()
                if pn:
                    result.append({
                        "pn": pn,
                        "rawType": str(l2.get('raw_type', '')),
                        "rmSupplier": str(l2.get('rm_supplier', ''))
                    })
            
            return result
        except Exception as e:
            print(f"⚠ Error getting Level 2 parts: {e}")
            return []
    
    def get_summary_stats(self) -> Dict[str, Any]:
        """Get summary statistics"""
        try:
            stats = self.conn.execute("""
                SELECT 
                    COUNT(*) as total_rows,
                    COUNT(DISTINCT "ENGINE PROGRAM") as unique_programs,
                    COUNT(DISTINCT "Configuration") as unique_configs,
                    COUNT(DISTINCT "Part Number") as unique_parts,
                    COUNT(DISTINCT "Parent Part Supplier") as unique_suppliers
                FROM raw_data
            """).fetchall()[0]
            
            return {
                "total_rows": stats[0],
                "unique_programs": stats[1],
                "unique_configs": stats[2],
                "unique_parts": stats[3],
                "unique_suppliers": stats[4],
                "columns": self.df.columns if self.df else []
            }
        except Exception as e:
            print(f"⚠ Error getting summary stats: {e}")
            return {}
    
    def query_output_data(self, sql: str = None) -> List[Dict[str, Any]]:
        """Query the Output sheet data"""
        try:
            if not self.output_df:
                return []
            
            # If no SQL provided, return all output data
            if sql is None:
                sql = "SELECT * FROM output_data"
            
            result = self.conn.execute(sql).fetchall()
            columns = [desc[0] for desc in self.conn.description]
            
            return [dict(zip(columns, row)) for row in result]
        except Exception as e:
            print(f"⚠ Error querying output data: {e}")
            return []
    
    def get_output_sheet_info(self) -> Dict[str, Any]:
        """Get information about the Output sheet"""
        try:
            if not self.output_df:
                return {"error": "Output sheet not loaded"}
            
            info = self.conn.execute("""
                SELECT 
                    COUNT(*) as total_rows,
                    COUNT(DISTINCT column_names) as total_columns
                FROM (SELECT UNNEST(list_distinct([column_names])) as column_names FROM output_data)
            """).fetchall()
            
            return {
                "rows": self.output_df.shape[0],
                "columns": self.output_df.shape[1],
                "column_names": self.output_df.columns,
                "dtypes": [str(dtype) for dtype in self.output_df.dtypes]
            }
        except Exception as e:
            print(f"⚠ Error getting output sheet info: {e}")
            return {
                "rows": self.output_df.shape[0] if self.output_df else 0,
                "columns": self.output_df.shape[1] if self.output_df else 0,
                "column_names": self.output_df.columns if self.output_df else []
            }
    
    def get_all_output_data(self) -> List[Dict[str, Any]]:
        """
        Get all data from the main data table as a list of dictionaries
        This is used for the datatable page to display all records with filters
        """
        try:
            print(f"[DUCKDB] Fetching all data from {self.main_table} table...")
            
            # Use DuckDB to fetch all data from main table
            result = self.conn.execute(f"SELECT * FROM {self.main_table}").fetchall()
            columns = [desc[0] for desc in self.conn.description]
            
            # Convert to list of dictionaries
            data = [dict(zip(columns, row)) for row in result]
            
            print(f"[DUCKDB] ✓ Fetched {len(data)} records with {len(columns)} columns")
            
            return data
        except Exception as e:
            print(f"[ERROR] Error fetching all data: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def close(self):
        """Close DuckDB connection"""
        if self.conn:
            self.conn.close()
            print("✓ DuckDB connection closed")
