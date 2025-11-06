import duckdb
import pandas as pd

conn = duckdb.connect('data/data-aeo.duckdb')

# Check sample data for RM Supplier with Casting Structural
query = """
SELECT 
    Level_2_Raw_Material_Supplier as RM_Supplier,
    Level_2_PN as RM_PN,
    Part_Number,
    Part_Description,
    Level_2_Raw_Type,
    HW_OWNER,
    Target_Ship_Date
FROM output 
WHERE Level_2_Raw_Type = 'Casting Structural' 
LIMIT 10
"""

df = conn.execute(query).df()
print("Sample data for Casting Structural:")
print(df.to_string())
print("\n" + "="*80 + "\n")

# Check all column names
all_cols = conn.execute("PRAGMA table_info(output)").fetchall()
print(f"Total columns: {len(all_cols)}")
print("\nAll columns:")
for col in all_cols:
    print(f"  {col[1]}")
