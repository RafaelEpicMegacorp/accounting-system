#!/bin/bash

BASE_URL="http://localhost:3001"
TEST_EMAIL="simple$(date +%s)@example.com"

echo "🧪 Simple Custom Invoice Test"
echo "============================="

# Get auth token
AUTH_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Simple User\",\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123@\"}" | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4 | tr -d '\n\r')

echo "✅ Token: ${AUTH_TOKEN:0:20}..."

# Create client
CLIENT_ID=$(curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Simple Client","email":"simpleclient@example.com"}' | \
  grep -o '"id":"[^"]*"' | cut -d'"' -f4 | tr -d '\n\r')

echo "✅ Client: $CLIENT_ID"

# Test custom invoice number
echo "🧾 Testing custom invoice number..."
CUSTOM_RESPONSE=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"invoiceNumber\":\"SIMPLE-001\",\"amount\":100.00,\"issueDate\":\"2025-07-25T00:00:00.000Z\",\"dueDate\":\"2025-08-25T00:00:00.000Z\"}")

echo "Custom response: $CUSTOM_RESPONSE"

if echo "$CUSTOM_RESPONSE" | grep -q '"invoiceNumber":"SIMPLE-001"'; then
  echo "✅ Custom invoice number works!"
  INVOICE_ID=$(echo "$CUSTOM_RESPONSE" | grep -o '"invoice":{"id":"[^"]*"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | tr -d '\n\r')
  echo "   Invoice ID: $INVOICE_ID"
  
  # Now test payment alias route
  echo ""
  echo "💰 Testing payment alias route..."
  PAYMENT_URL="$BASE_URL/api/invoices/$INVOICE_ID/payments"
  echo "   URL: $PAYMENT_URL"
  
  PAYMENT_RESPONSE=$(curl -s -X POST "$PAYMENT_URL" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"amount":50.00,"method":"BANK_TRANSFER","notes":"Simple test payment"}')
  
  echo "   Payment response: $PAYMENT_RESPONSE"
  
  if echo "$PAYMENT_RESPONSE" | grep -q '"payment"'; then
    echo "   ✅ Payment alias route works!"
  else
    echo "   ❌ Payment alias route failed"
  fi
else
  echo "❌ Custom invoice number failed"
fi