# API Routes Documentation - Accounting System

## 📋 **Overview**

This document provides comprehensive documentation for all available API routes in the accounting system. The system supports both original routes and user-friendly alias routes for better developer experience.

**Base URL**: `http://localhost:3001`
**Authentication**: All routes (except health check and auth) require JWT token in Authorization header: `Bearer <token>`

---

## 🔐 **Authentication Routes**

### **POST /api/auth/register**
Register a new user account.

**Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response**:
```json
{
  "message": "User registered successfully",
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### **POST /api/auth/login**
Login with existing credentials.

**Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response**:
```json
{
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 👥 **Client Management Routes**

### **GET /api/clients**
List all clients with pagination and search.

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `search` (string): Search by name or email

**Response**:
```json
{
  "message": "Clients retrieved successfully",
  "data": {
    "clients": [...],
    "pagination": { "currentPage": 1, "totalPages": 3, "totalCount": 25 }
  }
}
```

### **POST /api/clients**
Create a new client.

**Body**:
```json
{
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "company": "Acme Corporation",
  "phone": "+1234567890",
  "address": "123 Main St, City, State 12345"
}
```

**Supported Phone Formats**:
- `+1234567890`
- `(555) 123-4567`
- `555-123-4567`
- `555.123.4567`
- `5551234567`

### **GET /api/clients/:id**
Get single client details.

### **PUT /api/clients/:id**
Update client information.

### **DELETE /api/clients/:id**
Delete client (soft delete if has orders/invoices).

---

## 📋 **Order Management Routes**

### **GET /api/orders**
List all recurring orders with filtering.

**Query Parameters**:
- `page`, `limit`, `search`: Standard pagination
- `clientId`: Filter by specific client
- `status`: Filter by status (ACTIVE, PAUSED, CANCELLED)
- `frequency`: Filter by frequency (WEEKLY, BIWEEKLY, MONTHLY, etc.)

### **POST /api/orders**
Create a new recurring order.

**Body**:
```json
{
  "clientId": "client_id_here",
  "description": "Monthly web hosting service",
  "amount": 99.99,
  "frequency": "MONTHLY",
  "startDate": "2025-08-01T00:00:00.000Z",
  "leadTimeDays": 30
}
```

**Frequencies**: `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `QUARTERLY`, `ANNUALLY`, `CUSTOM`

### **GET /api/orders/:id**
Get single order with invoice history.

### **PUT /api/orders/:id**
Update order details.

### **PATCH /api/orders/:id/status**
Update only order status.

### **DELETE /api/orders/:id**
Cancel/delete order.

### **GET /api/orders/:id/schedule**
Get upcoming invoice schedule for order.

### **POST /api/orders/:id/generate-invoice** ⭐ *New Alias Route*
Generate invoice from order (alias for invoice generation).

**Response**:
```json
{
  "message": "Invoice generated successfully from order",
  "data": { "invoice": {...} }
}
```

---

## 🧾 **Invoice Management Routes**

### **GET /api/invoices**
List all invoices with filtering and search.

**Query Parameters**:
- Standard pagination: `page`, `limit`, `search`
- `clientId`: Filter by client
- `orderId`: Filter by order
- `status`: Filter by status (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
- `sortBy`: Sort field (createdAt, amount, issueDate, dueDate, invoiceNumber)
- `sortOrder`: Sort direction (asc, desc)

### **POST /api/invoices**
Create manual invoice.

**Body**:
```json
{
  "clientId": "client_id_here",
  "orderId": "order_id_here",
  "invoiceNumber": "CUSTOM-001",
  "amount": 150.00,
  "issueDate": "2025-07-25T00:00:00.000Z",
  "dueDate": "2025-08-25T00:00:00.000Z"
}
```

**Notes**:
- `orderId` is optional (for manual invoices not tied to orders)
- `invoiceNumber` is optional (auto-generated if not provided)
- Custom invoice numbers must be unique and 3-50 characters

### **GET /api/invoices/:id**
Get single invoice details.

### **PATCH /api/invoices/:id/status**
Update invoice status.

**Body**:
```json
{
  "status": "SENT"
}
```

### **GET /api/invoices/:id/pdf**
Generate and download invoice PDF.

### **POST /api/invoices/:id/send**
Send invoice via email.

### **POST /api/invoices/:id/reminder**
Send payment reminder email.

**Body**:
```json
{
  "reminderType": "overdue"
}
```

**Reminder Types**: `before_due`, `due_today`, `overdue`

### **DELETE /api/invoices/:id**
Delete invoice (only DRAFT status).

### **POST /api/invoices/generate/:orderId**
Generate invoice from order (original route).

### **GET /api/invoices/:id/payments** ⭐ *New Alias Route*
Get payment history for invoice.

**Response**:
```json
{
  "message": "Payment history retrieved successfully",
  "data": {
    "invoice": { "id": "...", "invoiceNumber": "INV-2025-000001", "amount": 150.00 },
    "payments": [...],
    "summary": {
      "totalPaid": 75.00,
      "remainingAmount": 75.00,
      "isFullyPaid": false,
      "paymentCount": 1
    }
  }
}
```

### **POST /api/invoices/:id/payments** ⭐ *New Alias Route*
Record payment for invoice.

**Body**:
```json
{
  "amount": 75.00,
  "method": "BANK_TRANSFER",
  "paidDate": "2025-07-25T00:00:00.000Z",
  "notes": "Partial payment received"
}
```

**Payment Methods**: `BANK_TRANSFER`, `CREDIT_CARD`, `CHECK`, `CASH`, `OTHER`

---

## 💰 **Payment Management Routes**

### **GET /api/payments**
List all payments with filtering.

**Query Parameters**:
- `page`, `limit`: Standard pagination
- `clientId`: Filter by client
- `method`: Filter by payment method
- `startDate`, `endDate`: Date range filter
- `search`: Search in invoice numbers, client names, or notes

### **POST /api/payments/invoice/:invoiceId**
Record payment for invoice (original route).

**Body**: Same as alias route above.

### **GET /api/payments/invoice/:invoiceId**
Get payment history for invoice (original route).

### **PUT /api/payments/:paymentId**
Update payment record.

### **DELETE /api/payments/:paymentId**
Delete payment record.

---

## 🎯 **Route Comparison Table**

| Action | User-Friendly Route | Original Route | Status |
|--------|-------------------|----------------|---------|
| Get invoice payments | `GET /api/invoices/:id/payments` | `GET /api/payments/invoice/:invoiceId` | ✅ Both Available |
| Record payment | `POST /api/invoices/:id/payments` | `POST /api/payments/invoice/:invoiceId` | ✅ Both Available |
| Generate invoice | `POST /api/orders/:id/generate-invoice` | `POST /api/invoices/generate/:orderId` | ✅ Both Available |

---

## 🔧 **System Routes**

### **GET /health**
System health check (no authentication required).

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2025-07-25T10:30:00.000Z",
  "environment": "development"
}
```

---

## 📊 **Response Format Standards**

### **Success Response**
```json
{
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### **Error Response**
```json
{
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": "Additional error information"
}
```

### **Validation Error Response**
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

---

## 🔐 **Authentication**

All API routes (except `/health` and authentication routes) require a valid JWT token:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
     http://localhost:3001/api/clients
```

---

## 📝 **Usage Examples**

### **Complete Workflow Example**

```bash
# 1. Register/Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 2. Create Client
curl -X POST http://localhost:3001/api/clients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client","email":"client@example.com"}'

# 3. Create Order
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"clientId":"<client_id>","description":"Monthly service","amount":100,"frequency":"MONTHLY","startDate":"2025-08-01T00:00:00.000Z"}'

# 4. Generate Invoice (User-Friendly Route)
curl -X POST http://localhost:3001/api/orders/<order_id>/generate-invoice \
  -H "Authorization: Bearer <token>"

# 5. Record Payment (User-Friendly Route)
curl -X POST http://localhost:3001/api/invoices/<invoice_id>/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"method":"BANK_TRANSFER"}'
```

---

## 🚀 **Recent Updates**

### **v2.0 - URL Structure Improvements**
- ✅ Added user-friendly alias routes for better RESTful design
- ✅ Fixed phone number validation to accept common formats
- ✅ Added support for custom invoice numbers
- ✅ Maintained backward compatibility with original routes

### **Backwards Compatibility**
All original routes continue to work exactly as before. New alias routes provide alternative, more intuitive URLs for the same functionality.

---

## 🛠 **Development Notes**

- **Environment**: Development server runs on `http://localhost:3001`
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with expiration
- **File Uploads**: PDF generation for invoices
- **Email**: SMTP integration for invoice sending

---

## 📞 **Support**

For questions about API usage or integration, refer to:
- Manual testing results: `MANUAL_TESTING_RESULTS.md`
- Implementation plan: `IMPLEMENTATION_PLAN.md`
- Test suites in `/tests` directory