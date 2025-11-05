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
        """Extract unique filter values from the dataframe for dropdown population"""
        if self.df is None or self.df.is_empty():
            return {
                'productLines': [],
                'years': [],
                'configs': [],
                'suppliers': [],
                'rmSuppliers': [],
                'hwOwners': [],
                'modules': [],
                'partNumbers': []
            }
        
        try:
            # Get available columns
            cols = self.df.columns
            
            # Extract unique values for each filter
            product_lines = []
            if 'ENGINE PROGRAM' in cols:
                product_lines = self.df['ENGINE PROGRAM'].unique().drop_nulls().to_list()
            elif 'ENGINE_PROGRAM' in cols:
                product_lines = self.df['ENGINE_PROGRAM'].unique().drop_nulls().to_list()
            
            configs = []
            if 'Configuration' in cols:
                configs = self.df['Configuration'].unique().drop_nulls().to_list()
            elif 'CONFIGURATION' in cols:
                configs = self.df['CONFIGURATION'].unique().drop_nulls().to_list()
            
            suppliers = []
            if 'Parent Part Supplier' in cols:
                suppliers = self.df['Parent Part Supplier'].unique().drop_nulls().to_list()
            elif 'Parent_Part_Supplier' in cols:
                suppliers = self.df['Parent_Part_Supplier'].unique().drop_nulls().to_list()
            
            # Extract years from date column
            years = []
            date_col = None
            if 'Target Ship Date' in cols:
                date_col = 'Target Ship Date'
            elif 'Target_Ship_Date' in cols:
                date_col = 'Target_Ship_Date'
            
            if date_col:
                try:
                    # Get all unique dates
                    unique_dates = self.df.select(pl.col(date_col)).unique().drop_nulls()
                    years_set = set()
                    
                    # Extract year from each date string
                    for date_row in unique_dates.iter_rows():
                        date_str = str(date_row[0]).strip()
                        if not date_str:
                            continue
                        
                        # Try different date formats to extract year
                        # Format: MM-DD-YY or MM/DD/YY or similar
                        parts = None
                        if '-' in date_str:
                            parts = date_str.split('-')
                        elif '/' in date_str:
                            parts = date_str.split('/')
                        
                        if parts and len(parts) >= 3:
                            year_part = parts[-1]  # Last part is year
                            # Convert 2-digit to 4-digit year
                            if len(year_part) == 2:
                                year_int = int(year_part)
                                # Assume 20XX for years
                                full_year = f"20{year_part}"
                                years_set.add(full_year)
                            elif len(year_part) == 4:
                                years_set.add(year_part)
                    
                    years = list(years_set)
                    
                    # If extraction failed, use default years
                    if not years:
                        print(f"[WARN] No years extracted from {date_col}, using defaults")
                        years = ['2025', '2026', '2027']
                except Exception as e:
                    print(f"[WARN] Error extracting years: {e}")
                    import traceback
                    traceback.print_exc()
                    years = ['2025', '2026', '2027']
            
            # Extract RM suppliers
            rm_suppliers = []
            if 'Level 2 Raw Material Supplier' in cols:
                rm_suppliers = self.df['Level 2 Raw Material Supplier'].unique().drop_nulls().to_list()
            elif 'Level_2_Raw_Material_Supplier' in cols:
                rm_suppliers = self.df['Level_2_Raw_Material_Supplier'].unique().drop_nulls().to_list()
            
            # Extract HW owners
            hw_owners = []
            if 'HW OWNER' in cols:
                hw_owners = self.df['HW OWNER'].unique().drop_nulls().to_list()
            elif 'HW_OWNER' in cols:
                hw_owners = self.df['HW_OWNER'].unique().drop_nulls().to_list()
            elif 'HWO' in cols:
                hw_owners = self.df['HWO'].unique().drop_nulls().to_list()
            
            # Extract modules
            modules = []
            if 'Level 2 Raw Type' in cols:
                modules = self.df['Level 2 Raw Type'].unique().drop_nulls().to_list()
            elif 'Level_2_Raw_Type' in cols:
                modules = self.df['Level_2_Raw_Type'].unique().drop_nulls().to_list()
            elif 'Raw_Type' in cols:
                modules = self.df['Raw_Type'].unique().drop_nulls().to_list()
            elif 'Module' in cols:
                modules = self.df['Module'].unique().drop_nulls().to_list()
            
            # Extract part numbers
            part_numbers = []
            if 'Part Number' in cols:
                part_numbers = self.df['Part Number'].unique().drop_nulls().to_list()
            elif 'Part_Number' in cols:
                part_numbers = self.df['Part_Number'].unique().drop_nulls().to_list()
            elif 'Level_1_PN' in cols:
                part_numbers = self.df['Level_1_PN'].unique().drop_nulls().to_list()
            
            # Clean and sort all lists
            return {
                'productLines': sorted([str(x) for x in product_lines if x and str(x).strip()]),
                'years': sorted([str(x) for x in years if x and str(x).strip()], reverse=True),
                'configs': sorted([str(x) for x in configs if x and str(x).strip()]),
                'suppliers': sorted([str(x) for x in suppliers if x and str(x).strip()]),
                'rmSuppliers': sorted([str(x) for x in rm_suppliers if x and str(x).strip()]),
                'hwOwners': sorted([str(x) for x in hw_owners if x and str(x).strip()]),
                'modules': sorted([str(x) for x in modules if x and str(x).strip()]),
                'partNumbers': sorted([str(x) for x in part_numbers if x and str(x).strip()])
            }
        except Exception as e:
            print(f"[ERROR] Error extracting filter options: {e}")
            import traceback
            traceback.print_exc()
            return {
                'productLines': [],
                'years': [],
                'configs': [],
                'suppliers': [],
                'rmSuppliers': [],
                'hwOwners': [],
                'modules': [],
                'partNumbers': []
            }
