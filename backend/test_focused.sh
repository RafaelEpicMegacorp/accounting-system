#!/bin/bash

# Focused test for specific functionality

BASE_URL="http://localhost:3001"
TEST_EMAIL="focused$(date +%s)@example.com"

echo "🎯 Focused Test - Payment Alias Routes"
echo "================================="

# Register and get token
register_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Focused User\",\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\"}")

AUTH_TOKEN=$(echo "$register_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "✅ Authentication: ${AUTH_TOKEN:0:20}..."

# Create client
client_response=$(curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Focused Client","email":"focused@example.com"}')

CLIENT_ID=$(echo "$client_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "✅ Client created: $CLIENT_ID"

# Create invoice  
invoice_response=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"invoiceNumber\":\"FOCUSED-001\",\"amount\":100.00,\"issueDate\":\"2025-07-25T00:00:00.000Z\",\"dueDate\":\"2025-08-25T00:00:00.000Z\"}")

INVOICE_ID=$(echo "$invoice_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "✅ Invoice created: $INVOICE_ID"

# Test NEW payment alias route
echo ""
echo "🧪 Testing NEW alias route: POST /api/invoices/$INVOICE_ID/payments"
payment_response=$(curl -s -X POST "$BASE_URL/api/invoices/$INVOICE_ID/payments" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":50.00,"method":"BANK_TRANSFER","notes":"Test payment via alias"}')

if echo "$payment_response" | grep -q '"payment"'; then
  echo "✅ Payment alias route works!"
  PAYMENT_ID=$(echo "$payment_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "   Payment ID: $PAYMENT_ID"
else
  echo "❌ Payment alias route failed"
  echo "   Response: $payment_response"
fi

# Test NEW payment history alias route
echo ""
echo "🧪 Testing NEW alias route: GET /api/invoices/$INVOICE_ID/payments"
history_response=$(curl -s -X GET "$BASE_URL/api/invoices/$INVOICE_ID/payments" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$history_response" | grep -q '"payments"'; then
  echo "✅ Payment history alias route works!"
  total_paid=$(echo "$history_response" | grep -o '"totalPaid":[0-9.]*' | cut -d':' -f2)
  echo "   Total paid: \$${total_paid}"
else
  echo "❌ Payment history alias route failed"
  echo "   Response: $history_response"
fi

# Test order creation and invoice generation
echo ""
echo "🧪 Testing Order Creation and Invoice Generation Alias Route"
future_date=$(date -d "+7 days" '+%Y-%m-%dT00:00:00.000Z' 2>/dev/null || date -v+7d '+%Y-%m-%dT00:00:00.000Z')
order_response=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"description\":\"Focused Test Service\",\"amount\":200.00,\"frequency\":\"MONTHLY\",\"startDate\":\"$future_date\"}")

ORDER_ID=$(echo "$order_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$ORDER_ID" ]; then
  echo "✅ Order created: $ORDER_ID"
  
  # Test invoice generation alias route
  echo "🧪 Testing NEW alias route: POST /api/orders/$ORDER_ID/generate-invoice"
  gen_response=$(curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/generate-invoice" \
    -H "Authorization: Bearer $AUTH_TOKEN")
  
  if echo "$gen_response" | grep -q '"invoice"'; then
    echo "✅ Invoice generation alias route works!"
    GEN_INVOICE_ID=$(echo "$gen_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   Generated Invoice ID: $GEN_INVOICE_ID"
  else
    echo "❌ Invoice generation alias route failed"
    echo "   Response: $gen_response"
  fi
else
  echo "❌ Order creation failed"
  echo "   Response: $order_response"
fi

echo ""
echo "🎯 Focused Test Complete!"