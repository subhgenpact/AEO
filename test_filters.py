import requests
import json

# Test the filter options endpoint
response = requests.get('http://localhost:8000/api/filter-options')
data = response.json()

print("Status:", data.get('status'))
print("Execution time:", data.get('execution_time_ms'))
print("\nFilter counts:")
filter_data = data.get('data', {})
for key, values in filter_data.items():
    print(f"  {key}: {len(values)} items")
    if len(values) > 0 and len(values) <= 10:
        print(f"    Values: {values}")
    elif len(values) > 10:
        print(f"    Sample: {values[:5]}...")

print("\nYears:")
print(filter_data.get('years', []))
