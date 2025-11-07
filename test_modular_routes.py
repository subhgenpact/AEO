#!/usr/bin/env python3
"""
Test script to verify the modular demand routes are working correctly
"""

import requests
import sys
from pathlib import Path

def test_route(url, description):
    """Test a single route and return success status"""
    try:
        print(f"Testing {description}...")
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ {description} - OK (Status: {response.status_code})")
            return True
        else:
            print(f"❌ {description} - Failed (Status: {response.status_code})")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ {description} - Error: {e}")
        return False

def main():
    """Test all modular demand routes"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Modular Demand Dashboard Routes")
    print("=" * 50)
    
    # Test routes
    routes_to_test = [
        (f"{base_url}/", "Home page"),
        (f"{base_url}/demand", "Classic demand page"),
        (f"{base_url}/demand-modular", "Modular demand page"),
        (f"{base_url}/demand-modular.html", "Modular demand page (legacy)"),
        (f"{base_url}/src/sections/section-manager.js", "Section manager JS"),
        (f"{base_url}/src/sections/engine-program/engine-program.js", "Engine program section JS"),
        (f"{base_url}/src/sections/engine-program/engine-program.html", "Engine program section HTML"),
        (f"{base_url}/src/sections/supplier/supplier.js", "Supplier section JS"),
        (f"{base_url}/src/sections/supplier/supplier.html", "Supplier section HTML"),
        (f"{base_url}/src/sections/rm-supplier/rm-supplier.js", "RM Supplier section JS"),
        (f"{base_url}/src/sections/rm-supplier/rm-supplier.html", "RM Supplier section HTML"),
        (f"{base_url}/src/sections/hw-owner/hw-owner.js", "HW Owner section JS"),
        (f"{base_url}/src/sections/hw-owner/hw-owner.html", "HW Owner section HTML"),
        (f"{base_url}/src/demand-modular.js", "Modular demand main JS"),
    ]
    
    # Test API endpoints
    api_routes_to_test = [
        (f"{base_url}/api/demand/programs", "Demand programs API"),
        (f"{base_url}/api/demand/chart-data", "Chart data API"),
    ]
    
    print("\n📄 Testing HTML and Static File Routes:")
    print("-" * 40)
    
    success_count = 0
    total_count = len(routes_to_test)
    
    for url, description in routes_to_test:
        if test_route(url, description):
            success_count += 1
    
    print(f"\n📊 Testing API Routes:")
    print("-" * 40)
    
    api_success_count = 0
    api_total_count = len(api_routes_to_test)
    
    for url, description in api_routes_to_test:
        if test_route(url, description):
            api_success_count += 1
    
    # Summary
    print("\n📋 Test Summary:")
    print("=" * 50)
    print(f"HTML/Static Routes: {success_count}/{total_count} passed")
    print(f"API Routes: {api_success_count}/{api_total_count} passed")
    
    total_success = success_count + api_success_count
    total_tests = total_count + api_total_count
    
    print(f"Overall: {total_success}/{total_tests} tests passed")
    
    if total_success == total_tests:
        print("🎉 All tests passed! Modular demand routes are working correctly.")
        return 0
    else:
        print("⚠️ Some tests failed. Please check the server and file paths.")
        return 1

if __name__ == "__main__":
    print("Starting route tests...")
    print("Make sure the server is running on http://localhost:8000")
    print()
    
    exit_code = main()
    sys.exit(exit_code)