import polars as pl
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime


class DemandDataService:
    """Service for transforming Excel data into demand dashboard format"""
    
    def __init__(self, excel_path: str = "data/AEO-transformed-data.xlsx", sheet_name: str = "Sheet1"):
        self.excel_path = Path(excel_path)
        self.sheet_name = sheet_name
        self.df: pl.DataFrame = None
        # Don't load data here - it will be set from main.py to avoid double loading
    
    def load_data(self):
        """Load Excel data (only if not already loaded)"""
        if self.df is not None:
            return
            
        try:
            self.df = pl.read_excel(self.excel_path, sheet_name=self.sheet_name)
            print(f"Demand service loaded from {self.sheet_name} sheet: {self.df.shape[0]} rows, {self.df.shape[1]} columns")
        except Exception as e:
            print(f"Error loading data for demand service: {e}")
            raise Exception(f"Failed to load Excel data: {e}")
    
    def transform_to_demand_format(self, use_duckdb: bool = False, duckdb_service=None) -> List[Dict[str, Any]]:
        """
        Transform Excel data into demand dashboard format using actual Excel columns
        
        Args:
            use_duckdb: If True and duckdb_service provided, use DuckDB for faster queries
            duckdb_service: DuckDBService instance for optimized queries
        """
        if use_duckdb and duckdb_service:
            return duckdb_service.get_demand_data()
        
        if self.df is None or self.df.is_empty():
            raise Exception("No data loaded from Excel file")
        
        try:
            # Group by ENGINE PROGRAM and Configuration
            programs = self.df.select("ENGINE PROGRAM").unique().to_series().to_list()
            
            demand_data = []
            for program in programs:
                if program is None or str(program).strip() == "":
                    continue
                    
                program_str = str(program)
                
                # Get all configurations for this program
                program_df = self.df.filter(pl.col("ENGINE PROGRAM") == program)
                configs = program_df.select("Configuration").unique().to_series().to_list()
                
                config_list = []
                for config in configs:
                    if config is None or str(config).strip() == "":
                        continue
                        
                    config_str = str(config)
                    config_df = program_df.filter(pl.col("Configuration") == config)
                    
                    # Get unique ESNs for this config
                    esns_data = self._extract_esns(config_df)
                    
                    # Get Level 1 parts (parent parts)
                    level1_parts = self._extract_level1_parts(config_df)
                    
                    config_list.append({
                        "config": config_str,
                        "esns": esns_data,
                        "level1Parts": level1_parts
                    })
                
                if config_list:
                    demand_data.append({
                        "engineProgram": program_str,
                        "configs": config_list
                    })
            
            return demand_data
                
        except Exception as e:
            print(f"Error transforming to demand format: {e}")
            raise Exception(f"Failed to transform data: {e}")
    
    def _extract_esns(self, config_df: pl.DataFrame) -> List[Dict[str, str]]:
        """Extract ESN data from configuration DataFrame"""
        try:
            esns = config_df.select(["ESN", "Target Ship Date"]).unique().to_dicts()
            
            result = []
            for esn in esns:
                if esn.get("ESN") and str(esn["ESN"]).strip():
                    # Format date - handle MM-DD-YY format
                    target_date = esn.get("Target Ship Date", "")
                    date_str = ""
                    if target_date:
                        try:
                            date_val = str(target_date).strip()
                            # Try parsing MM-DD-YY format
                            try:
                                dt = datetime.strptime(date_val, "%m-%d-%y")
                                date_str = dt.strftime("%m/%d/%Y")
                            except:
                                # Try other formats
                                for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"]:
                                    try:
                                        dt = datetime.strptime(date_val, fmt)
                                        date_str = dt.strftime("%m/%d/%Y")
                                        break
                                    except:
                                        continue
                                if not date_str:
                                    date_str = date_val  # Use as-is if parsing fails
                        except:
                            date_str = str(target_date)
                    
                    result.append({
                        "esn": str(esn["ESN"]),
                        "targetShipDate": date_str
                    })
            
            return result
        except Exception as e:
            print(f"Error extracting ESNs: {e}")
            return []
    
    def _extract_level1_parts(self, config_df: pl.DataFrame) -> List[Dict[str, Any]]:
        """Extract Level 1 parts from configuration DataFrame"""
        try:
            # Get unique Part Numbers (Level 1)
            parts = config_df.select([
                "Part Number", "QPE", "Part Description", 
                "Parent Part Supplier", "HW OWNER", 
                "Level 1 Raw Type", "Level 1 Raw Material Supplier"
            ]).unique(subset=["Part Number"]).to_dicts()
            
            result = []
            for part in parts:
                pn = part.get("Part Number")
                if not pn or str(pn).strip() == "":
                    continue
                
                # Extract HW OWNER (handle multiple values)
                hw_owner = part.get("HW OWNER", "")
                hwo_list = []
                if hw_owner and str(hw_owner).strip():
                    # Split by comma if multiple values
                    hwo_list = [h.strip() for h in str(hw_owner).split(",") if h.strip()]
                
                # Get Level 2 parts for this Part Number
                level2_parts = self._extract_level2_parts(config_df, pn)
                
                part_data = {
                    "pn": str(pn),
                    "hwo": hwo_list,
                    "supplier": str(part.get("Parent Part Supplier", "")),
                    "qpe": int(part.get("QPE", 1)) if part.get("QPE") else 1,
                    "level2Parts": level2_parts
                }
                result.append(part_data)
            
            return result
        except Exception as e:
            print(f"Error extracting Level 1 parts: {e}")
            return []
    
    def _extract_level2_parts(self, config_df: pl.DataFrame, parent_pn: str) -> List[Dict[str, Any]]:
        """Extract Level 2 parts for a given parent Part Number"""
        try:
            # Filter for this parent part
            parent_df = config_df.filter(pl.col("Part Number") == parent_pn)
            
            # Get unique Level 2 parts
            level2 = parent_df.select([
                "Level 2 PN", "Level 2 Desc", "Level 2 QPE",
                "Level 2 Raw Type", "Level 2 Raw Material Supplier"
            ]).unique(subset=["Level 2 PN"]).to_dicts()
            
            result = []
            for l2 in level2:
                pn = l2.get("Level 2 PN")
                if not pn or str(pn).strip() == "":
                    continue
                
                result.append({
                    "pn": str(pn),
                    "rawType": str(l2.get("Level 2 Raw Type", "")),
                    "rmSupplier": str(l2.get("Level 2 Raw Material Supplier", ""))
                })
            
            return result
        except Exception as e:
            print(f"Error extracting Level 2 parts: {e}")
            return []
    
    def get_summary_stats(self) -> Dict[str, Any]:
        """Get summary statistics from Excel data"""
        if self.df is None or self.df.is_empty():
            raise Exception("No data loaded")
        
        return {
            "total_rows": self.df.shape[0],
            "total_columns": self.df.shape[1],
            "columns": self.df.columns,
            "sample_data": self.df.limit(5).to_dicts()
        }
    
    def transform_to_cdata_format(self, use_duckdb: bool = False, duckdb_service=None) -> List[Dict[str, Any]]:
        """
        Transform Excel data into cdata format for Engine Program Overview chart
        Format: [{ "PL": "LM2500", "Mon": "Oct", "Year": 2025, "No": 11, "Mon-Yr": "2025Oct", "Month": "10/1/2025" }, ...]
        
        Args:
            use_duckdb: If True and duckdb_service provided, use DuckDB for faster aggregation
            duckdb_service: DuckDBService instance for optimized queries
        """
        if use_duckdb and duckdb_service:
            return duckdb_service.get_cdata()
        
        if self.df is None or self.df.is_empty():
            raise Exception("No data loaded from Excel file")
        
        try:
            # Extract year and month from Target Ship Date
            # Group by Engine Demand Family and date to get counts
            
            # Filter out null/empty programs and dates
            filtered_df = self.df.filter(
                (pl.col("Engine Demand Family").is_not_null()) &
                (pl.col("Target Ship Date").is_not_null()) &
                (pl.col("Engine Demand Family") != "") &
                (pl.col("Target Ship Date") != "")
            )
            
            if filtered_df.is_empty():
                raise Exception("No valid data after filtering")
            
            cdata = []
            
            # Get unique programs (Product Lines)
            programs = filtered_df.select("Engine Demand Family").unique().to_series().to_list()
            
            for program in programs:
                program_str = str(program).strip()
                if not program_str:
                    continue
                
                program_df = filtered_df.filter(pl.col("Engine Demand Family") == program)
                
                # Process each row to extract date information
                rows = program_df.select(["Target Ship Date"]).to_dicts()
                
                # Count by month/year
                date_counts = {}
                for row in rows:
                    target_date = row.get("Target Ship Date")
                    if not target_date or not str(target_date).strip():
                        continue
                    
                    try:
                        date_str = str(target_date).strip()
                        
                        # Try multiple date formats
                        dt = None
                        # Excel date format is MM-DD-YY
                        formats = ["%m-%d-%y", "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%m-%d-%Y"]
                        
                        for fmt in formats:
                            try:
                                dt = datetime.strptime(date_str, fmt)
                                break
                            except:
                                continue
                        
                        if not dt:
                            # Skip if date parsing fails
                            continue
                        
                        # Extract month and year
                        month_name = dt.strftime("%b")  # Jan, Feb, etc.
                        year = dt.year
                        month_num = dt.month
                        
                        key = f"{program_str}_{year}_{month_name}"
                        if key not in date_counts:
                            date_counts[key] = {
                                "PL": program_str,
                                "Mon": month_name,
                                "Year": year,
                                "No": 0,
                                "Mon-Yr": f"{year}{month_name}",
                                "Month": f"{month_num}/1/{year}"
                            }
                        date_counts[key]["No"] += 1
                    except Exception as e:
                        continue
                
                # Add to cdata
                cdata.extend(date_counts.values())
            
            if not cdata:
                raise Exception("No cdata generated from Excel data")
            
            # Sort by Year, then Month
            month_order = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
                          "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12}
            cdata.sort(key=lambda x: (x["Year"], month_order.get(x["Mon"], 0), x["PL"]))
            
            return cdata
                
        except Exception as e:
            print(f"Error transforming to cdata format: {e}")
            raise Exception(f"Failed to transform cdata: {e}")
