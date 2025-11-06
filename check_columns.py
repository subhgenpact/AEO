"""
Quick script to check what columns exist in the database for gap analysis
"""
import sys
import duckdb

# Connect to database
conn = duckdb.connect('data/data-aeo.duckdb', read_only=True)

# Get column names
result = conn.execute("SELECT * FROM output LIMIT 1").description
columns = [col[0] for col in result]

print("\n=== ALL COLUMNS IN DATABASE ===")
for i, col in enumerate(columns, 1):
    print(f"{i}. {col}")

# Check for specific columns we need
print("\n=== CHECKING FOR REQUIRED COLUMNS ===")
required_mappings = {
    "Priority": ["Priority", "PRIORITY", "priority"],
    "RM Part": ["Level_2_PN", "Level 2 PN", "RM_Part", "RM Part"],
    "Parent Part Number": ["Part_Number", "Part Number", "Level_1_PN", "Parent_Part_Number"],
    "ESN": ["ESN"],
    "Due Date": ["Target_Ship_Date", "Target Ship Date", "Due_Date"],
    "Have Gap": ["Have_Gap", "Gap_Y_N", "Gap (Y/N)", "Have Gap"],
    "HW Owner": ["HW_OWNER", "HW OWNER", "HW_Owner"]
}

for field, possible_names in required_mappings.items():
    found = None
    for name in possible_names:
        if name in columns:
            found = name
            break
    if found:
        print(f"[OK] {field}: Found as '{found}'")
    else:
        print(f"[MISSING] {field}: NOT FOUND (looked for: {', '.join(possible_names)})")

# Check sample data with gaps
print("\n=== SAMPLE GAP RECORDS ===")
gap_col = None
for col in ["Have_Gap", "Gap_Y_N", "Gap (Y/N)", "Have Gap"]:
    if col in columns:
        gap_col = col
        break

if gap_col:
    priority_col = None
    for col in ["Priority", "PRIORITY", "priority"]:
        if col in columns:
            priority_col = col
            break
    
    query = f"""
    SELECT 
        "{priority_col}" as Priority,
        Level_2_PN as RM_Part,
        Part_Number as Parent_Part,
        ESN,
        Target_Ship_Date as Due_Date,
        HW_OWNER
    FROM output
    WHERE "{gap_col}" = 'Y'
    LIMIT 5
    """
    
    result = conn.execute(query).fetchall()
    print(f"\nFirst 5 gap records (Have_Gap='Y'):")
    for row in result:
        print(f"  Priority: {row[0]}, RM Part: {row[1]}, Parent: {row[2]}, ESN: {row[3]}, Due Date: {row[4]}, HW Owner: {row[5]}")
else:
    print("No gap column found!")

conn.close()
