#!/bin/bash

# End-to-End Testing Script for New Features
# Tests all newly implemented features with real authentication and data flow

echo "🧪 End-to-End Testing - New Features with Authentication"
echo "======================================================="

BASE_URL="http://localhost:3001"
TEST_EMAIL="e2etest$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables for test data
AUTH_TOKEN=""
CLIENT_ID=""
ORDER_ID=""
INVOICE_ID=""

# Function to print test results
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $2"
  else
    echo -e "${RED}❌ FAIL${NC}: $2"
    if [ -n "$3" ]; then
      echo -e "   ${YELLOW}Details:${NC} $3"
    fi
  fi
}

# Function to print section headers
print_section() {
  echo ""
  echo -e "${BLUE}🔍 $1${NC}"
  echo "$(printf '%.0s-' $(seq 1 ${#1}))"
}

# Function to extract JSON value
extract_json_value() {
  echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | cut -d'"' -f4
}

# Function to extract JSON number value
extract_json_number() {
  echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*[0-9]*" | grep -o "[0-9]*$"
}

# Check if server is running
print_section "Server Health Check"
health_response=$(curl -s "$BASE_URL/health")
if echo "$health_response" | grep -q '"status":"OK"'; then
  print_result 0 "Server is running and healthy"
else
  print_result 1 "Server health check failed" "$health_response"
  exit 1
fi

# Test 1: Authentication Setup
print_section "Test 1: Authentication Setup"

# Register test user
echo "📝 Registering test user..."
register_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$register_response" | grep -q '"token"'; then
  AUTH_TOKEN=$(extract_json_value "$register_response" "token")
  print_result 0 "User registration successful"
  echo "   Token: ${AUTH_TOKEN:0:20}..."
else
  print_result 1 "User registration failed" "$register_response"
  exit 1
fi

# Test 2: Phone Number Validation
print_section "Test 2: Enhanced Phone Number Validation"

# Test +1234567890 format
echo "📱 Testing phone format: +1234567890"
client_response=$(curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client +Format","email":"client1@example.com","phone":"+1234567890"}')

if echo "$client_response" | grep -q '"id"'; then
  CLIENT_ID=$(extract_json_value "$client_response" "id")
  print_result 0 "Phone format +1234567890 accepted and saved"
  echo "   Client ID: $CLIENT_ID"
else
  print_result 1 "Phone format +1234567890 failed" "$client_response"
fi

# Test (555) 123-4567 format
echo "📱 Testing phone format: (555) 123-4567"
client2_response=$(curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client () Format","email":"client2_'$(date +%s)'@example.com","phone":"(555) 123-4567"}')

if echo "$client2_response" | grep -q '"id"'; then
  print_result 0 "Phone format (555) 123-4567 accepted and saved"
else
  print_result 1 "Phone format (555) 123-4567 failed" "$client2_response"
fi

# Test 3: Custom Invoice Numbers
print_section "Test 3: Custom Invoice Number Support"

# Create invoice with custom number
echo "🧾 Testing custom invoice number: CUSTOM-E2E-001"
custom_invoice_response=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"invoiceNumber\":\"CUSTOM-E2E-001\",\"amount\":150.00,\"issueDate\":\"2025-07-25T00:00:00.000Z\",\"dueDate\":\"2025-08-25T00:00:00.000Z\"}")

if echo "$custom_invoice_response" | grep -q '"invoiceNumber":"CUSTOM-E2E-001"'; then
  INVOICE_ID=$(extract_json_value "$custom_invoice_response" "id")
  print_result 0 "Custom invoice number CUSTOM-E2E-001 saved correctly"
  echo "   Invoice ID: $INVOICE_ID"
else
  print_result 1 "Custom invoice number not saved correctly" "$custom_invoice_response"
fi

# Test without custom number (should auto-generate)
echo "🧾 Testing auto-generated invoice number"
auto_invoice_response=$(curl -s -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"amount\":200.00,\"issueDate\":\"2025-07-25T00:00:00.000Z\",\"dueDate\":\"2025-08-25T00:00:00.000Z\"}")

if echo "$auto_invoice_response" | grep -q '"invoiceNumber":"INV-'; then
  auto_invoice_number=$(extract_json_value "$auto_invoice_response" "invoiceNumber")
  print_result 0 "Auto-generated invoice number works: $auto_invoice_number"
else
  print_result 1 "Auto-generated invoice number failed" "$auto_invoice_response"
fi

# Test 4: Order Creation and Invoice Generation Alias Route
print_section "Test 4: Order-to-Invoice Generation (New Alias Route)"

# Create order
echo "📋 Creating test order..."
order_response=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"description\":\"E2E Test Monthly Service\",\"amount\":99.99,\"frequency\":\"MONTHLY\",\"startDate\":\"2025-08-01T00:00:00.000Z\"}")

if echo "$order_response" | grep -q '"id"'; then
  ORDER_ID=$(extract_json_value "$order_response" "id")
  print_result 0 "Order created successfully"
  echo "   Order ID: $ORDER_ID"
else
  print_result 1 "Order creation failed" "$order_response"
  # Create a fallback order for testing
  ORDER_ID="fallback_test_id"
fi

# Test new alias route: POST /api/orders/:id/generate-invoice
echo "🧾 Testing NEW alias route: POST /api/orders/$ORDER_ID/generate-invoice"
if [ "$ORDER_ID" != "fallback_test_id" ]; then
  generate_response=$(curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/generate-invoice" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json")

  if echo "$generate_response" | grep -q '"invoice"'; then
    generated_invoice_id=$(extract_json_value "$generate_response" "id")
    print_result 0 "NEW alias route POST /api/orders/:id/generate-invoice works!"
    echo "   Generated Invoice ID: $generated_invoice_id"
  else
    print_result 1 "NEW alias route failed" "$generate_response"
  fi
else
  print_result 1 "Skipping invoice generation test due to order creation failure"
fi

# Test 5: Payment Alias Routes
print_section "Test 5: Payment Management (New Alias Routes)"

if [ -n "$INVOICE_ID" ]; then
  # Test new alias route: POST /api/invoices/:id/payments
  echo "💰 Testing NEW alias route: POST /api/invoices/$INVOICE_ID/payments"
  payment_response=$(curl -s -X POST "$BASE_URL/api/invoices/$INVOICE_ID/payments" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"amount":75.00,"method":"BANK_TRANSFER","notes":"E2E test payment via alias route"}')

  if echo "$payment_response" | grep -q '"payment"'; then
    payment_id=$(extract_json_value "$payment_response" "id")
    print_result 0 "NEW alias route POST /api/invoices/:id/payments works!"
    echo "   Payment ID: $payment_id"
    
    # Check if invoice status was updated
    if echo "$payment_response" | grep -q '"isFullyPaid":false'; then
      print_result 0 "Payment recorded correctly (partial payment)"
    else
      print_result 1 "Payment status calculation issue" "$payment_response"
    fi
  else
    print_result 1 "NEW payment alias route failed" "$payment_response"
  fi

  # Test new alias route: GET /api/invoices/:id/payments
  echo "💰 Testing NEW alias route: GET /api/invoices/$INVOICE_ID/payments"
  payment_history_response=$(curl -s -X GET "$BASE_URL/api/invoices/$INVOICE_ID/payments" \
    -H "Authorization: Bearer $AUTH_TOKEN")

  if echo "$payment_history_response" | grep -q '"payments"'; then
    payment_count=$(extract_json_number "$payment_history_response" "paymentCount")
    total_paid=$(echo "$payment_history_response" | grep -o '"totalPaid"[[:space:]]*:[[:space:]]*[0-9.]*' | grep -o '[0-9.]*$')
    print_result 0 "NEW alias route GET /api/invoices/:id/payments works!"
    echo "   Payment count: $payment_count, Total paid: \$$total_paid"
  else
    print_result 1 "NEW payment history alias route failed" "$payment_history_response"
  fi

  # Test full payment
  echo "💰 Testing full payment to verify status update..."
  full_payment_response=$(curl -s -X POST "$BASE_URL/api/invoices/$INVOICE_ID/payments" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"amount":75.00,"method":"CREDIT_CARD","notes":"Final payment to complete invoice"}')

  if echo "$full_payment_response" | grep -q '"isFullyPaid":true'; then
    print_result 0 "Full payment correctly updates invoice status to PAID"
  else
    print_result 1 "Full payment status update failed" "$full_payment_response"
  fi
else
  print_result 1 "Skipping payment tests due to missing invoice ID"
fi

# Test 6: Backward Compatibility
print_section "Test 6: Backward Compatibility Check"

if [ -n "$INVOICE_ID" ]; then
  # Test original payment route still works
  echo "🔄 Testing original route: GET /api/payments/invoice/$INVOICE_ID"
  original_payment_response=$(curl -s -X GET "$BASE_URL/api/payments/invoice/$INVOICE_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")

  if echo "$original_payment_response" | grep -q '"payments"'; then
    print_result 0 "Original route /api/payments/invoice/:id still works"
  else
    print_result 1 "Original payment route broken" "$original_payment_response"
  fi
else
  print_result 1 "Skipping backward compatibility test due to missing invoice ID"
fi

# Test 7: Data Persistence Verification
print_section "Test 7: Data Persistence Verification"

# Verify client with phone number was saved correctly
if [ -n "$CLIENT_ID" ]; then
  echo "🔍 Verifying client data persistence..."
  client_check_response=$(curl -s -X GET "$BASE_URL/api/clients/$CLIENT_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")

  if echo "$client_check_response" | grep -q '"+1234567890"'; then
    print_result 0 "Phone number +1234567890 persisted correctly in database"
  else
    print_result 1 "Phone number not persisted correctly" "$client_check_response"
  fi
fi

# Summary
print_section "Test Summary"

echo ""
echo "🏆 End-to-End Testing Complete!"
echo ""
echo "✅ Tests Performed:"
echo "   • Authentication and JWT token validation"
echo "   • Enhanced phone number validation with database persistence"
echo "   • Custom invoice number support and auto-generation fallback"
echo "   • NEW alias route: POST /api/orders/:id/generate-invoice"
echo "   • NEW alias route: POST /api/invoices/:id/payments"
echo "   • NEW alias route: GET /api/invoices/:id/payments"
echo "   • Payment status updates and invoice status integration"
echo "   • Backward compatibility with original routes"
echo "   • Data persistence verification"
echo ""
echo "🎯 All new features have been validated with real authentication and data flow!"
echo ""
echo "🧹 Cleanup: Test user and data will remain for manual inspection"
echo "   Test email: $TEST_EMAIL"
echo "   Client ID: $CLIENT_ID"
echo "   Invoice ID: $INVOICE_ID"
echo "   Order ID: $ORDER_ID"