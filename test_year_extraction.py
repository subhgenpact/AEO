import requests
import json

# Test the filter options endpoint
response = requests.get('http://localhost:8000/api/filter-options')
data = response.json()

print("="*60)
print("FILTER OPTIONS API TEST")
print("="*60)
print("\nYears extracted:")
years = data.get('data', {}).get('years', [])
for year in years:
    print(f"  - {year}")

print(f"\nTotal years: {len(years)}")
print(f"\nAll filter data:")
print(json.dumps(data.get('data'), indent=2))
