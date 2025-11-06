"""
Check priority distribution in gap records
"""
import duckdb

conn = duckdb.connect('data/data-aeo.duckdb', read_only=True)

# Check unique priority values in gap records
query = """
SELECT 
    Priority,
    COUNT(*) as count
FROM output
WHERE Have_Gap = 'Y'
GROUP BY Priority
ORDER BY 
    CASE 
        WHEN Priority IN ('P1', '1', 'CRITICAL', 'Critical') THEN 1
        WHEN Priority IN ('P2', '2', 'HIGH', 'High') THEN 2
        WHEN Priority IN ('P3', '3', 'MEDIUM', 'Medium') THEN 3
        WHEN Priority IN ('P4', '4', 'LOW', 'Low') THEN 4
        ELSE 5
    END
"""

result = conn.execute(query).fetchall()
print("\n=== PRIORITY DISTRIBUTION IN GAP RECORDS ===")
total = 0
for row in result:
    print(f"  {row[0]}: {row[1]} records")
    total += row[1]
print(f"\nTotal gap records: {total}")

# Check first 10 gap records with all priorities
query2 = """
SELECT 
    Priority,
    Level_2_PN as RM_Part,
    Part_Number as Parent_Part,
    ESN,
    Target_Ship_Date as Due_Date
FROM output
WHERE Have_Gap = 'Y'
ORDER BY 
    CASE 
        WHEN Priority IN ('P1', '1', 'CRITICAL', 'Critical') THEN 1
        WHEN Priority IN ('P2', '2', 'HIGH', 'High') THEN 2
        WHEN Priority IN ('P3', '3', 'MEDIUM', 'Medium') THEN 3
        WHEN Priority IN ('P4', '4', 'LOW', 'Low') THEN 4
        ELSE 5
    END
LIMIT 10
"""

result2 = conn.execute(query2).fetchall()
print("\n=== FIRST 10 GAP RECORDS (SORTED BY PRIORITY) ===")
for row in result2:
    print(f"  Priority: {row[0]}, RM Part: {row[1]}, Parent: {row[2]}, ESN: {row[3]}, Due Date: {row[4]}")

conn.close()
