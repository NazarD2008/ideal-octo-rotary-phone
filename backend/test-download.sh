#!/bin/bash
# Test APK Download Endpoint

echo "🧪 Testing APK Download Endpoint"
echo "════════════════════════════════════════════"

BASE_URL="${1:-http://localhost:3000}"
OUTPUT_FILE="${2:-test-download.apk}"

echo "Base URL: $BASE_URL"
echo "Output File: $OUTPUT_FILE"
echo ""

# Note: Requires auth token from /api/auth/login
echo "📝 Instructions:"
echo "1. First, login: curl -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"password\"}'"
echo "2. Copy the token from response"
echo "3. Then run: curl -X GET $BASE_URL/api/builder/download -H 'Authorization: Bearer YOUR_TOKEN' -o $OUTPUT_FILE -v"
echo ""

# Try without auth first to see the error
echo "📌 Testing without auth (should return 401):"
curl -X GET "$BASE_URL/api/builder/download" -w "\nStatus: %{http_code}\n" -o /dev/null -s

echo ""
echo "✅ Use the instructions above to test with auth"
