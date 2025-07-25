#!/bin/bash

# Working test that uses jq for proper JSON parsing
BASE_URL="http://localhost:3001"
TEST_EMAIL="working$(date +%s)@example.com"

echo "🎯 Working Test with Proper JSON Parsing"
echo "========================================"

# Check if jq is available, if not use a different approach
if command -v jq &> /dev/null; then
  echo "✅ Using jq for JSON parsing"
  
  # Get auth token
  AUTH_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Working User\",\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123@\"}" | \
    jq -r '.token')
  
  echo "✅ Token: ${AUTH_TOKEN:0:20}..."
  
  # Create client
  CLIENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/clients" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Working Client","email":"workingclient@example.com"}')
  
  CLIENT_ID=$(echo "$CLIENT_RESPONSE" | jq -r '.data.client.id')
  echo "✅ Client: $CLIENT_ID"
  
  # Test custom invoice number
  echo "🧾 Testing custom invoice number..."
  CUSTOM_RESPONSE=$(curl -s -X POST "$BASE_URL/api/invoices" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"clientId\":\"$CLIENT_ID\",\"invoiceNumber\":\"WORKING-001\",\"amount\":100.00,\"issueDate\":\"2025-07-25T00:00:00.000Z\",\"dueDate\":\"2025-08-25T00:00:00.000Z\"}")
  
  INVOICE_ID=$(echo "$CUSTOM_RESPONSE" | jq -r '.data.invoice.id')
  INVOICE_NUMBER=$(echo "$CUSTOM_RESPONSE" | jq -r '.data.invoice.invoiceNumber')
  
  if [ "$INVOICE_NUMBER" = "WORKING-001" ]; then
    echo "✅ Custom invoice number works: $INVOICE_NUMBER"
    echo "   Invoice ID: $INVOICE_ID"
    
    # Test payment alias route
    echo ""
    echo "💰 Testing NEW payment alias route..."
    PAYMENT_URL="$BASE_URL/api/invoices/$INVOICE_ID/payments"
    echo "   URL: $PAYMENT_URL"
    
    PAYMENT_RESPONSE=$(curl -s -X POST "$PAYMENT_URL" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"amount":50.00,"method":"BANK_TRANSFER","notes":"Working test payment"}')
    
    PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.data.payment.id // empty')
    
    if [ -n "$PAYMENT_ID" ]; then
      echo "   ✅ Payment alias route POST works!"
      echo "   Payment ID: $PAYMENT_ID"
      
      # Test payment history alias route
      HISTORY_RESPONSE=$(curl -s -X GET "$PAYMENT_URL" \
        -H "Authorization: Bearer $AUTH_TOKEN")
      
      PAYMENT_COUNT=$(echo "$HISTORY_RESPONSE" | jq -r '.data.summary.paymentCount // 0')
      TOTAL_PAID=$(echo "$HISTORY_RESPONSE" | jq -r '.data.summary.totalPaid // 0')
      
      echo "   ✅ Payment history alias route GET works!"
      echo "   Payment count: $PAYMENT_COUNT, Total paid: \$$TOTAL_PAID"
    else
      echo "   ❌ Payment alias route failed"
      echo "   Response: $PAYMENT_RESPONSE"
    fi
    
  else
    echo "❌ Custom invoice failed: $CUSTOM_RESPONSE"
  fi
  
else
  echo "❌ jq not available, install with: brew install jq"
fi