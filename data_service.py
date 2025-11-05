import polars as pl
from pathlib import Path
from typing import Optional


class DataService:
    """Service for loading data from DuckDB or Excel files using Polars"""
    
    def __init__(self, duckdb_path: str = "data/data.duckdb", excel_path: str = "data/AEO-transformed-data.xlsx", sheet_name: str = "Sheet1", duckdb_service=None):
        self.duckdb_path = Path(duckdb_path)
        self.excel_path = Path(excel_path)
        self.sheet_name = sheet_name
        self.df: Optional[pl.DataFrame] = None
        self.duckdb_service = duckdb_service
        self.load_data()
    
    def load_data(self):
        """Load data from DuckDB service if available, otherwise from Excel"""
        try:
            # First, try loading from DuckDB service if provided
            if self.duckdb_service and self.duckdb_service.df is not None:
                print(f"Loading data from DuckDB service...")
                self.df = self.duckdb_service.df
                print(f"[OK] Successfully loaded data from DuckDB service: {self.df.shape[0]:,} rows, {self.df.shape[1]} columns")
                return
            
            # Fall back to Excel file
            print(f"Loading data from Excel file: {self.excel_path} (sheet: {self.sheet_name})...")
            self.df = pl.read_excel(self.excel_path, sheet_name=self.sheet_name)
            print(f"[OK] Successfully loaded data from Excel: {self.df.shape[0]:,} rows, {self.df.shape[1]} columns")
            print(f"     Source: {self.excel_path}")
        except Exception as e:
            print(f"[ERROR] Error loading data: {e}")
            print(f"        Trying alternative Excel sheet...")
            try:
                self.df = pl.read_excel("data/AEO-transformed-data.xlsx", sheet_name="Sheet1")
                print(f"[OK] Loaded fallback: {self.df.shape[0]:,} rows, {self.df.shape[1]} columns")
            except Exception as e2:
                print(f"[ERROR] Fallback also failed: {e2}")
                # Create an empty DataFrame as fallback
                self.df = pl.DataFrame()
    
    def get_filter_options(self):
        """Get all unique filter options from DuckDB service"""
        if not self.duckdb_service:
            return {
                "status": "error",
                "message": "DuckDB service not available"
            }
        
        try:
            # Get unique values for each filter from DuckDB service
            # These column names will be mapped in duckdb_service.get_unique_values()
            product_lines = self.duckdb_service.get_unique_values("ENGINE_PROGRAM")
            years = self.duckdb_service.get_years_from_date("Target_Ship_Date")
            configs = self.duckdb_service.get_unique_values("Configuration")
            suppliers = self.duckdb_service.get_unique_values("Parent_Part_Supplier")
            rm_suppliers = self.duckdb_service.get_unique_values("Level_2_Raw_Material_Supplier")
            hw_owners = self.duckdb_service.get_unique_values("HW_OWNER")
            modules = self.duckdb_service.get_unique_values("Level_2_Raw_Type")
            part_numbers = self.duckdb_service.get_unique_values("Part_Number")
            
            return {
                "productLines": sorted(product_lines) if product_lines else [],
                "years": sorted(years) if years else [],
                "configs": sorted(configs) if configs else [],
                "suppliers": sorted(suppliers) if suppliers else [],
                "rmSuppliers": sorted(rm_suppliers) if rm_suppliers else [],
                "hwOwners": sorted(hw_owners) if hw_owners else [],
                "modules": sorted(modules) if modules else [],
                "partNumbers": sorted(part_numbers) if part_numbers else []
            }
        except Exception as e:
            print(f"[ERROR] Error getting filter options: {e}")
            import traceback
            traceback.print_exc()
            return {
                "productLines": [],
                "years": [],
                "configs": [],
                "suppliers": [],
                "rmSuppliers": [],
                "hwOwners": [],
                "modules": [],
                "partNumbers": []
            }
