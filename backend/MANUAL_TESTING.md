# Manual Testing Guide - Accounting System API

## 🎯 **Testing Objectives**
- Verify all API endpoints work correctly
- Test authentication and authorization
- Validate business logic and data flow
- Identify edge cases and potential bugs
- Test error handling and user experience

## 📋 **Manual Testing Checklist**

### **Phase 1: Authentication Testing**
- [ ] User registration with valid data
- [ ] User registration with invalid data (weak password, invalid email)
- [ ] User login with correct credentials
- [ ] User login with incorrect credentials
- [ ] JWT token validation on protected endpoints
- [ ] Token expiration handling

### **Phase 2: Client Management Testing**
- [ ] Create client with all required fields
- [ ] Create client with minimal required fields
- [ ] Create client with duplicate email (should fail)
- [ ] List clients with pagination
- [ ] Search clients by name/email
- [ ] Update client information
- [ ] Delete client without dependencies
- [ ] Attempt to delete client with orders (should fail)

### **Phase 3: Order Management Testing**
- [ ] Create recurring order with valid data
- [ ] Create order with different frequencies (WEEKLY, MONTHLY, YEARLY)
- [ ] Update order details
- [ ] Generate invoice from order
- [ ] Generate multiple invoices from same order
- [ ] Delete order without invoices
- [ ] Attempt to delete order with invoices (should fail)

### **Phase 4: Invoice Management Testing**
- [ ] Create manual invoice
- [ ] Generate invoice from order
- [ ] Update invoice details (while in DRAFT)
- [ ] Send invoice via email
- [ ] Update invoice status (DRAFT → SENT → PAID)
- [ ] Generate PDF for invoice
- [ ] List invoices with filtering and pagination
- [ ] Delete draft invoice
- [ ] Attempt to delete sent invoice (should fail)

### **Phase 5: Payment Management Testing**
- [ ] Record partial payment
- [ ] Record full payment
- [ ] Record multiple payments for single invoice
- [ ] Attempt overpayment (should fail)
- [ ] Update payment details
- [ ] Delete payment
- [ ] View payment history for invoice

### **Phase 6: Business Logic Testing**
- [ ] Invoice status auto-update when fully paid
- [ ] Payment amount validation against invoice total
- [ ] Recurring invoice generation workflow
- [ ] Email notifications (if configured)
- [ ] PDF generation and storage

### **Phase 7: Error Handling Testing**
- [ ] Invalid UUID formats
- [ ] Non-existent resource IDs
- [ ] Missing required fields
- [ ] Invalid data types
- [ ] Unauthorized access attempts
- [ ] Rate limiting (if enabled)

---

## 🧪 **Testing Scripts**

### **1. Authentication Test**

#### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manual-test@example.com",
    "password": "ManualTest123!",
    "name": "Manual Test User"
  }'
```

#### Login User
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manual-test@example.com",
    "password": "ManualTest123!"
  }'
```

### **2. Client Management Test**

#### Create Client
```bash
curl -X POST http://localhost:3001/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Manual Test Client",
    "email": "client@manualtest.com",
    "company": "Manual Test Company",
    "phone": "+1234567890",
    "address": "123 Manual Test Street"
  }'
```

#### List Clients
```bash
curl -X GET http://localhost:3001/api/clients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **3. Order Management Test**

#### Create Order
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "clientId": "CLIENT_ID_FROM_PREVIOUS_STEP",
    "description": "Monthly Manual Test Service",
    "amount": 299.99,
    "frequency": "MONTHLY",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  }'
```

#### Generate Invoice from Order
```bash
curl -X POST http://localhost:3001/api/orders/ORDER_ID/generate-invoice \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **4. Invoice Management Test**

#### Create Manual Invoice
```bash
curl -X POST http://localhost:3001/api/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "clientId": "CLIENT_ID",
    "invoiceNumber": "MANUAL-001",
    "amount": 500.00,
    "issueDate": "2025-01-24",
    "dueDate": "2025-02-24",
    "description": "Manual test invoice"
  }'
```

#### Update Invoice Status
```bash
curl -X PATCH http://localhost:3001/api/invoices/INVOICE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "SENT"
  }'
```

#### Download Invoice PDF
```bash
curl -X GET http://localhost:3001/api/invoices/INVOICE_ID/pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o invoice.pdf
```

### **5. Payment Management Test**

#### Record Payment
```bash
curl -X POST http://localhost:3001/api/invoices/INVOICE_ID/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 250.00,
    "method": "BANK_TRANSFER",
    "paidDate": "2025-01-24",
    "notes": "Manual test payment"
  }'
```

#### Get Payment History
```bash
curl -X GET http://localhost:3001/api/invoices/INVOICE_ID/payments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🐛 **Bug Tracking Template**

### **Bug Report Format**
```
**Bug ID**: BUG-001
**Severity**: High/Medium/Low
**Component**: Authentication/Clients/Orders/Invoices/Payments
**Summary**: Brief description of the issue

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**: What should happen
**Actual Result**: What actually happened
**Error Message**: Any error messages
**Environment**: Development/Test/Production
**Date Found**: YYYY-MM-DD
**Status**: Open/In Progress/Fixed/Closed
```

---

## 📊 **Testing Results Log**

### **Test Session**: Manual Testing - Phase 1
**Date**: 2025-01-24
**Tester**: Manual Testing Session
**Environment**: Development (localhost:3001)

#### **Results Summary**
- [ ] **Authentication**: ✅/❌ - Notes
- [ ] **Client Management**: ✅/❌ - Notes  
- [ ] **Order Management**: ✅/❌ - Notes
- [ ] **Invoice Management**: ✅/❌ - Notes
- [ ] **Payment Management**: ✅/❌ - Notes
- [ ] **Business Logic**: ✅/❌ - Notes
- [ ] **Error Handling**: ✅/❌ - Notes

#### **Bugs Found**
1. [List any bugs discovered]
2. [With severity and steps to reproduce]

#### **Performance Notes**
- Response times
- Database query performance
- File upload/download performance

---

## 🔄 **Next Steps After Manual Testing**
1. Document all bugs found
2. Prioritize bug fixes
3. Re-test fixed issues
4. Proceed to performance testing
5. Create user acceptance test scenarios