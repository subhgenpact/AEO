#!/usr/bin/env python3
"""
Convert Excel file with 'Output' sheet to data-aeo.duckdb
This script reads any Excel file and creates/updates a DuckDB database

Usage:
    python convert_aeo_data.py                           # Uses default: data/AEO-Data-V3.xlsx
    python convert_aeo_data.py path/to/file.xlsx        # Uses specified Excel file
    python convert_aeo_data.py --help                    # Show help
"""
import pandas as pd
import duckdb
import os
import sys
from datetime import datetime

def convert_excel_to_duckdb(excel_file=None):
    """Convert Excel file with 'Output' sheet to data-aeo.duckdb"""
    
    print("=" * 70)
    print("AEO Data Converter - Excel to DuckDB")
    print("=" * 70)
    
    # Default file if none specified
    if excel_file is None:
        excel_file = "data/DummyData_v6.xlsx"
    
    # If path doesn't include 'data/' and file doesn't exist, try prepending it
    if not os.path.exists(excel_file) and not excel_file.startswith('data/'):
        test_path = os.path.join('data', excel_file)
        if os.path.exists(test_path):
            excel_file = test_path
    
    db_file = "data/data-aeo.duckdb"
    
    # Check if Excel file exists
    if not os.path.exists(excel_file):
        print(f"❌ Error: {excel_file} not found!")
        print(f"\n💡 Usage:")
        print(f"   python convert_aeo_data.py                    # Uses default file")
        print(f"   python convert_aeo_data.py myfile.xlsx       # From data/ folder")
        print(f"   python convert_aeo_data.py data/myfile.xlsx  # Full path")
        return False
    
    print(f"\n📂 Source: {excel_file}")
    print(f"📂 Target: {db_file}")
    
    # Check if database exists (update vs create)
    db_exists = os.path.exists(db_file)
    action = "Updating" if db_exists else "Creating"
    
    if db_exists:
        db_size_before = os.path.getsize(db_file) / (1024 * 1024)
        print(f"\n� {action} existing database (current size: {db_size_before:.2f} MB)...")
    else:
        print(f"\n🆕 {action} new database...")
    
    try:
        # Read Excel file
        print(f"\n📖 Reading Excel file...")
        
        # Check if 'Output' sheet exists
        try:
            xl_file = pd.ExcelFile(excel_file)
            if 'Output' not in xl_file.sheet_names:
                print(f"❌ Error: 'Output' sheet not found in {excel_file}")
                print(f"   Available sheets: {', '.join(xl_file.sheet_names)}")
                return False
        except Exception as e:
            print(f"❌ Error reading Excel file: {str(e)}")
            return False
        
        df = pd.read_excel(excel_file, sheet_name='Output')
        
        print(f"✅ Loaded {len(df):,} rows and {len(df.columns)} columns")
        
        # Convert all columns to string to avoid type issues
        print(f"\n🔄 Converting data types...")
        for col in df.columns:
            df[col] = df[col].astype(str)
        
        # Show column info
        print(f"\n📋 Column Names:")
        for i, col in enumerate(df.columns, 1):
            print(f"   {i:2d}. {col}")
        
        # Create DuckDB database
        print(f"\n💾 Creating DuckDB database...")
        conn = duckdb.connect(db_file)
        
        # Create table from DataFrame
        conn.execute("DROP TABLE IF EXISTS output")
        conn.execute("CREATE TABLE output AS SELECT * FROM df")
        
        # Verify data
        row_count = conn.execute("SELECT COUNT(*) FROM output").fetchone()[0]
        col_count = len(conn.execute("DESCRIBE output").fetchall())
        
        print(f"✅ Database created successfully!")
        print(f"   - Table: output")
        print(f"   - Rows: {row_count:,}")
        print(f"   - Columns: {col_count}")
        
        # Get database size
        db_size = os.path.getsize(db_file) / (1024 * 1024)  # Convert to MB
        print(f"   - Size: {db_size:.2f} MB")
        
        # Show sample data
        print(f"\n📊 Sample Data (first 3 rows, first 5 columns):")
        sample = conn.execute("SELECT * FROM output LIMIT 3").fetchdf()
        print(sample.iloc[:, :5].to_string())
        
        # Get some statistics
        print(f"\n📈 Database Statistics:")
        
        # Check for key columns
        key_columns = [' Have Gap', ' Priority', 'Configuration', 'Engine Demand Family']
        for col in key_columns:
            try:
                # Quote column names with spaces
                quoted_col = f'"{col}"'
                distinct_count = conn.execute(f"SELECT COUNT(DISTINCT {quoted_col}) FROM output WHERE {quoted_col} IS NOT NULL AND {quoted_col} != 'nan'").fetchone()[0]
                print(f"   - Unique {col}: {distinct_count}")
            except Exception as e:
                print(f"   - Could not get stats for {col}: {str(e)}")
        
        conn.close()
        
        print("\n" + "=" * 70)
        print(f"✅ {action} completed successfully!")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def show_help():
    """Show help message"""
    print("""
AEO Data Converter - Convert Excel to DuckDB
=============================================

Usage:
    python convert_aeo_data.py [excel_file]

Arguments:
    excel_file      Path to Excel file (optional)
                    If not provided, uses: data/AEO-Data-V3.xlsx
                    
Examples:
    python convert_aeo_data.py
        → Converts data/AEO-Data-V3.xlsx to data/data-aeo.duckdb
    
    python convert_aeo_data.py AEO-Data-V4.xlsx
        → Converts data/AEO-Data-V4.xlsx to data/data-aeo.duckdb
    
    python convert_aeo_data.py data/MyFile.xlsx
        → Converts data/MyFile.xlsx to data/data-aeo.duckdb
    
    python convert_aeo_data.py C:/path/to/file.xlsx
        → Converts specified file to data/data-aeo.duckdb

Requirements:
    - Excel file must contain a sheet named 'Output'
    - Output database: data/data-aeo.duckdb (created/updated)

Options:
    --help, -h      Show this help message
    """)

if __name__ == "__main__":
    # Check for help flag
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h', '/?']:
        show_help()
        sys.exit(0)
    
    # Get Excel file from command line or use default
    excel_file = sys.argv[1] if len(sys.argv) > 1 else None
    
    if excel_file:
        print(f"\n📥 Input file specified: {excel_file}")
    else:
        print(f"\n📥 No input file specified, using default: data/AEO-Data-V3.xlsx")
    
    start_time = datetime.now()
    success = convert_excel_to_duckdb(excel_file)
    end_time = datetime.now()
    
    duration = (end_time - start_time).total_seconds()
    print(f"\n⏱️  Total time: {duration:.2f} seconds")
    
    if success:
        print("\n✅ You can now use data-aeo.duckdb in your application!")
    else:
        print("\n❌ Conversion failed. Please check the error messages above.")
