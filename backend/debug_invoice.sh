#!/bin/bash

BASE_URL="http://localhost:3001"

echo "Debug invoice creation issue..."

# Register user
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Invoice Debug","email":"invoicedebug@example.com","password":"TestPass123@"}')

AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 | tr -d '\n\r')
echo "Token: ${AUTH_TOKEN:0:20}..."

# Create client
CLIENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Invoice Debug Client","email":"invoicedebug@example.com"}')

CLIENT_ID=$(echo "$CLIENT_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | tr -d '\n\r')
echo "Client ID: '$CLIENT_ID'"

# Test invoice WITHOUT custom number
echo "Testing without custom number..."
INVOICE_RESPONSE1=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"amount\":150.00,\"issueDate\":\"2025-07-25T00:00:00.000Z\",\"dueDate\":\"2025-08-25T00:00:00.000Z\"}")

echo "Response 1: $INVOICE_RESPONSE1"

# Test invoice WITH custom number
echo "Testing WITH custom number..."
INVOICE_RESPONSE2=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"invoiceNumber\":\"DEBUG-001\",\"amount\":150.00,\"issueDate\":\"2025-07-25T00:00:00.000Z\",\"dueDate\":\"2025-08-25T00:00:00.000Z\"}")

echo "Response 2: $INVOICE_RESPONSE2"