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
