# Task: Order Management System

## Status: IN PROGRESS
**Created**: 2025-01-24  
**Priority**: HIGH  
**Phase**: 2C - Order Management System  

## Objective
Build a complete order management system that handles recurring billing schedules, date calculations, and order lifecycle management to drive automated invoice generation.

## Subtasks

### 🔄 IN PROGRESS
- [ ] Create Order CRUD API endpoints with authentication

### ⏳ BACKEND PENDING
- [ ] Build date calculation engine for recurring invoices
- [ ] Create order validation and business rules
- [ ] Implement order-client relationship integration
- [ ] Add order search and filtering capabilities
- [ ] Build order status management logic
- [ ] Create next invoice date calculation

### ⏳ FRONTEND PENDING  
- [ ] Build order management UI components
- [ ] Create order list page with filtering
- [ ] Implement order creation form with client selection
- [ ] Build order edit form
- [ ] Create order detail view
- [ ] Add order status management controls
- [ ] Implement order-client relationship display

### ⏳ INTEGRATION PENDING
- [ ] Connect frontend to backend order APIs
- [ ] Test complete order management flow
- [ ] Add proper loading states and error handling
- [ ] Implement order analytics and metrics
- [ ] Prepare foundation for invoice generation

## Requirements from accounting.md

### Order Tracking (Lines 58-78)
- [ ] Implement order CRUD operations ← **Current Focus**
  - [ ] POST /api/orders - Create new order
  - [ ] GET /api/orders - List all orders with filters
  - [ ] GET /api/orders/:id - Get single order
  - [ ] PUT /api/orders/:id - Update order
  - [ ] DELETE /api/orders/:id - Cancel/delete order
- [x] Support order frequency types ✅
  - [x] Weekly ✅
  - [x] Biweekly ✅
  - [x] Monthly ✅
  - [x] Quarterly ✅
  - [x] Annually ✅
  - [x] Custom (specify days) ✅
- [x] Order status management ✅
  - [x] Active ✅
  - [x] Paused ✅
  - [x] Cancelled ✅
- [ ] Calculate next invoice date based on frequency
  - [ ] Implement date calculation logic
  - [ ] Handle edge cases (end of month, leap years)

## Technical Implementation

### API Endpoints to Create
- `POST /api/orders` - Create new recurring order
- `GET /api/orders` - List orders with filtering (client, status, frequency)
- `GET /api/orders/:id` - Get single order with related data
- `PUT /api/orders/:id` - Update order details
- `DELETE /api/orders/:id` - Cancel/soft delete order
- `GET /api/orders/:id/schedule` - Preview upcoming invoice dates

### Date Calculation Engine
```typescript
interface DateCalculator {
  calculateNextInvoiceDate(startDate: Date, frequency: OrderFrequency, customDays?: number): Date;
  calculateSchedule(order: Order, count: number): Date[];
  handleEdgeCases(date: Date, frequency: OrderFrequency): Date;
}
```

### Database Operations
- Order creation with client validation
- Order updates with history tracking
- Status transitions (Active → Paused → Cancelled)
- Date calculations and schedule previews
- Client-order relationship queries

### Frontend Components
- `OrderList` - Main order listing with filters
- `OrderForm` - Create/edit order form with client selector
- `OrderCard` - Individual order display
- `OrderDetail` - Full order information view
- `OrderStatusControl` - Status management interface
- `OrderSchedulePreview` - Show upcoming invoice dates

### Validation Rules
- **Client**: Required, must exist in database
- **Description**: Required, 5-500 characters
- **Amount**: Required, positive number, max 2 decimal places
- **Frequency**: Required, valid enum value
- **Start Date**: Required, cannot be in the past
- **Custom Days**: Required if frequency is CUSTOM, 1-365 days

## Success Criteria
- [ ] All order CRUD operations working with authentication
- [ ] Date calculation accurate for all frequency types
- [ ] Order list displays with filtering and search
- [ ] Order creation form validates and saves correctly
- [ ] Order editing preserves data integrity
- [ ] Order status transitions work correctly
- [ ] Client-order relationships display properly
- [ ] Schedule preview shows accurate upcoming dates
- [ ] All operations have proper error handling

## Business Rules
- Orders can only be created for existing clients
- Active orders generate invoices based on schedule
- Paused orders skip invoice generation but preserve schedule
- Cancelled orders cannot be reactivated (create new order)
- Next invoice date automatically calculated based on frequency
- Custom frequency allows 1-365 day intervals
- Orders cannot have past start dates

## Security Considerations
- All endpoints protected by authentication middleware
- User can only access orders for their clients
- Input validation prevents invalid date manipulations
- Soft delete preserves order history for audit
- Rate limiting on order creation endpoints

## Performance Requirements
- Order list loads in <2 seconds for 1000+ orders
- Date calculations complete in <100ms
- Order creation/editing provides real-time feedback
- Schedule preview generates instantly
- Filtering and search results return in <500ms

## Next Steps After Completion
1. Begin Basic Invoice Generation (Task 05)
2. Connect orders to automated invoice creation
3. Add order performance analytics
4. Implement order templates for quick creation
5. Add bulk order operations

## Notes
- Order model already exists in Prisma schema ✅
- Client model ready for foreign key relationships ✅
- Authentication system ready for endpoint protection ✅
- Date calculation will use dayjs for reliability ✅

---
*This task builds the core recurring billing engine for the accounting system*