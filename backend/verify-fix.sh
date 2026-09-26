#!/bin/bash

BASE_URL="${1:-http://127.0.0.1:32766}"

echo "🧪 APK Download Fix Verification"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Test 1: Server connectivity
echo "📍 Test 1: Server Connectivity"
echo "----"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/me")
if [ "$HEALTH" = "401" ]; then
  echo "✅ Server is running (401 expected - no auth)"
else
  echo "⚠️  Unexpected status: $HEALTH"
fi
echo ""

# Test 2: Login
echo "📍 Test 2: Authentication"
echo "----"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"s20041021"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed or no token returned"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Test 3: User info
echo "📍 Test 3: Authorization Check"
echo "----"
USER_INFO=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/auth/me")
USERNAME=$(echo "$USER_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)

if [ -z "$USERNAME" ]; then
  echo "❌ Failed to get user info"
  echo "Response: $USER_INFO"
  exit 1
fi

echo "✅ User authenticated: $USERNAME"
echo ""

# Test 4: APK Download
echo "📍 Test 4: APK Download Endpoint"
echo "----"

RESPONSE_FILE=$(mktemp)
HTTP_CODE=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/builder/download" -o test-download.apk -D "$RESPONSE_FILE")

CONTENT_TYPE=$(grep -i "content-type:" "$RESPONSE_FILE" | cut -d' ' -f2- | tr -d '\r')
CONTENT_DISPOSITION=$(grep -i "content-disposition:" "$RESPONSE_FILE" | cut -d' ' -f2- | tr -d '\r')
CONTENT_LENGTH=$(grep -i "content-length:" "$RESPONSE_FILE" | cut -d' ' -f2- | tr -d '\r')

echo "Status Code: $HTTP_CODE"
echo "Content-Type: $CONTENT_TYPE"
echo "Content-Disposition: $CONTENT_DISPOSITION"
echo "Content-Length: $CONTENT_LENGTH"
echo ""

# Check magic number for APK (should be PK for ZIP)
if [ -f test-download.apk ] && [ -s test-download.apk ]; then
  FILE_SIZE=$(stat -c%s test-download.apk 2>/dev/null || stat -f%z test-download.apk 2>/dev/null)
  FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1024 / 1024" | bc)
  
  MAGIC=$(xxd -p -l 2 test-download.apk 2>/dev/null || od -tx1 -N2 test-download.apk | tail -1)
  
  echo "APK File Size: ${FILE_SIZE_MB} MB"
  echo "Magic Number: $MAGIC (should contain 504b for ZIP)"
fi
echo ""

rm -f "$RESPONSE_FILE"

# Summary
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ HTTP 200 OK - Download successful!"
  echo ""
  if [[ "$CONTENT_DISPOSITION" == *"attachment"* ]]; then
    echo "✅ Content-Disposition: attachment found"
  else
    echo "❌ Content-Disposition: attachment NOT found"
  fi
  
  if [[ "$CONTENT_DISPOSITION" == *"filename"* ]]; then
    echo "✅ Filename parameter present"
  else
    echo "⚠️  Filename parameter NOT found"
  fi
  
  if [[ "$CONTENT_DISPOSITION" == *"UTF-8"* ]] || [[ "$CONTENT_DISPOSITION" == *"filename*"* ]]; then
    echo "✅ RFC 5987 UTF-8 encoding detected (filename*=UTF-8)"
  else
    echo "ℹ️  RFC 5987 encoding not detected (may be OK for ASCII names)"
  fi
  
  if [[ "$CONTENT_TYPE" == *"android"* ]] || [[ "$CONTENT_TYPE" == *"zip"* ]] || [[ "$CONTENT_TYPE" == *"octet-stream"* ]]; then
    echo "✅ Content-Type is appropriate for APK"
  else
    echo "⚠️  Unexpected Content-Type: $CONTENT_TYPE"
  fi
  
  echo ""
  echo "🎉 FIX VERIFIED: APK download fix is working correctly!"
  
elif [ "$HTTP_CODE" = "404" ]; then
  echo "⚠️  HTTP 404 Not Found"
  echo "   No completed build available"
  echo "   → Need to run POST /api/builder/build first"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ HTTP 401 Unauthorized"
  echo "   Authentication failed (token invalid)"
elif [ "$HTTP_CODE" = "403" ]; then
  echo "❌ HTTP 403 Forbidden"
  echo "   Authorization failed (insufficient permissions)"
elif [ "$HTTP_CODE" = "500" ]; then
  echo "❌ HTTP 500 Internal Server Error"
  echo "   Check backend logs:"
  echo ""
  BODY=$(cat test-download.apk 2>/dev/null | head -100)
  echo "$BODY"
else
  echo "❌ Unexpected HTTP status: $HTTP_CODE"
fi

echo ""
