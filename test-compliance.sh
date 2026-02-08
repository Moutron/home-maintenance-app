#!/bin/bash

# Compliance Integration Test Script
# This script tests the compliance lookup API endpoint

echo "🧪 Testing Compliance Integration"
echo "=================================="
echo ""

BASE_URL="http://localhost:3000"

# Test 1: California Home (San Francisco)
echo "Test 1: California Home (San Francisco, built 1970)"
echo "Expected: Smoke detectors, CO detectors, water heater straps, lead paint"
curl -X POST "$BASE_URL/api/compliance/lookup" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "yearBuilt": 1970,
    "homeType": "single-family"
  }' | jq '.compliance.summary' 2>/dev/null || echo "Response received"
echo ""
echo "---"
echo ""

# Test 2: Florida Home (Miami)
echo "Test 2: Florida Coastal Home (Miami, built 1980)"
echo "Expected: Hurricane shutters, 4-point inspection"
curl -X POST "$BASE_URL/api/compliance/lookup" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Miami",
    "state": "FL",
    "zipCode": "33101",
    "yearBuilt": 1980,
    "homeType": "single-family"
  }' | jq '.compliance.summary' 2>/dev/null || echo "Response received"
echo ""
echo "---"
echo ""

# Test 3: New York Rental (NYC)
echo "Test 3: New York City Rental (built 1950)"
echo "Expected: Lead paint inspection, window guards, facade inspection"
curl -X POST "$BASE_URL/api/compliance/lookup" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "yearBuilt": 1950,
    "homeType": "rental"
  }' | jq '.compliance.summary' 2>/dev/null || echo "Response received"
echo ""
echo "---"
echo ""

# Test 4: Permit Requirements (Electrical)
echo "Test 4: Permit Requirements - Electrical Work"
echo "Expected: Electrical Permit required"
curl -X POST "$BASE_URL/api/compliance/lookup" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "yearBuilt": 1970,
    "homeType": "single-family",
    "taskCategory": "ELECTRICAL",
    "taskName": "Replace electrical panel"
  }' | jq '.permitInfo' 2>/dev/null || echo "Response received"
echo ""
echo "---"
echo ""

echo "✅ Compliance API Tests Complete!"
echo ""
echo "Next steps:"
echo "1. Test via UI: http://localhost:3000/compliance"
echo "2. Add a home and generate compliance tasks"
echo "3. Check Tasks page for compliance badges"
echo ""

