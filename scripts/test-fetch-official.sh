#!/bin/bash

# /api/fetch-official のテストスクリプト

echo "Testing /api/fetch-official endpoint..."
echo ""

# ローカル環境のURL
URL="http://localhost:3000/api/fetch-official"

# APIを呼び出し
response=$(curl -s -w "\n%{http_code}" "$URL")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status Code: $http_code"
echo ""
echo "Response Body:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

if [ "$http_code" -eq 200 ]; then
  echo ""
  echo "✅ API call successful!"
  echo ""
  echo "Next steps:"
  echo "1. Check Supabase dashboard -> Table Editor -> raw_events"
  echo "2. Check logs table for execution log"
else
  echo ""
  echo "❌ API call failed!"
  echo "Check the error message above and verify:"
  echo "1. Development server is running (npm run dev)"
  echo "2. Environment variables are set (.env.local)"
  echo "3. Supabase schema is applied"
fi

