#!/bin/bash

# Quick debug script to test individual components

BASE_URL="http://localhost:3001"
TEST_EMAIL="debug$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"

echo "🔧 Quick Debug Test"
echo "=================="

# 1. Register user
echo "1. Registering user..."
register_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Debug User\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

AUTH_TOKEN=$(echo "$register_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "   Token: ${AUTH_TOKEN:0:20}..."

# 2. Test phone validation with simple client
echo "2. Testing phone validation with +1234567890..."
client_response=$(curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Debug Client","email":"debug@example.com","phone":"+1234567890"}')

echo "   Response: $client_response"

# 3. Test client creation without phone
echo "3. Creating simple client without phone..."
simple_client_response=$(curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Simple Client","email":"simple@example.com"}')

CLIENT_ID=$(echo "$simple_client_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   Client ID: $CLIENT_ID"

# 4. Test custom invoice number
if [ -n "$CLIENT_ID" ]; then
  echo "4. Testing custom invoice number..."
  invoice_response=$(curl -s -X POST "$BASE_URL/api/invoices" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"clientId\":\"$CLIENT_ID\",\"invoiceNumber\":\"DEBUG-001\",\"amount\":100.00,\"issueDate\":\"2025-07-25T00:00:00.000Z\",\"dueDate\":\"2025-08-25T00:00:00.000Z\"}")
  
  echo "   Response: $invoice_response"
fi