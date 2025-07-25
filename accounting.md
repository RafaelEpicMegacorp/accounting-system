# Recurring Invoice Management System - Product Requirements Document

## 🎯 Progress Status

**Phase 3 In Progress: Payment Tracking & Advanced Features 🔄**

- ✅ **135/311 items completed** (43.4% overall progress)
- ✅ **Foundation**: Full-stack architecture, database schema, basic UI
- ✅ **Authentication**: Complete JWT-based auth system with protected routes
- ✅ **Client Management**: Full CRUD operations with search, pagination, and UI
- ✅ **Order Management**: Full CRUD operations, validation, UI components, status management
- ✅ **Invoice Core**: CRUD operations, status management, numbering system, UI components
- ✅ **PDF Generation**: Complete PDF system with Puppeteer, HTML templates, and download endpoints
- ✅ **Email Integration**: Complete email system with SMTP, templates, and delivery automation
- ✅ **Payment Tracking**: Complete payment recording system with API endpoints and UI
- 🔄 **Current Phase**: Dashboard Metrics, Automated Scheduling

## Overview

Build a web-based recurring invoice management system that automates invoice generation, delivery, and payment tracking for multiple clients with configurable billing schedules.

## Technical Stack

- [x] Frontend: React with TypeScript
- [x] Backend: Node.js with Express
- [x] Database: PostgreSQL with Prisma ORM
- [x] Email Service: Nodemailer with SMTP integration
- [x] PDF Generation: Puppeteer with HTML templates
- [x] Authentication: JWT-based
- [ ] Hosting: Deploy on Vercel/Railway or similar

## Database Schema

### Models to Implement

- [x] Create User model (admin users)
  - [x] id, email, password (hashed), name, createdAt, updatedAt
- [x] Create Client model
  - [x] id, name, company, email, phone, address, createdAt, updatedAt
- [x] Create Order model
  - [x] id, clientId, description, amount, frequency (enum), status, startDate, nextInvoiceDate
- [x] Create Invoice model
  - [x] id, orderId, clientId, invoiceNumber, amount, dueDate, sentDate, paidDate, status
- [x] Create PaymentReminder model
  - [x] id, invoiceId, sentDate, reminderType
- [x] Create EmailTemplate model
  - [x] id, name, subject, body, type (invoice/reminder)

## 1. Client & Order Management

### Client Database

- [x] Implement client CRUD operations
  - [x] POST /api/clients - Create new client
  - [x] GET /api/clients - List all clients with pagination
  - [x] GET /api/clients/:id - Get single client details
  - [x] PUT /api/clients/:id - Update client information
  - [x] DELETE /api/clients/:id - Soft delete client
- [x] Add client validation
  - [x] Email format validation
  - [x] Required fields: name, email
  - [x] Unique email constraint
- [x] Create client management UI
  - [x] Client list page with search/filter
  - [x] Client creation form
  - [x] Client edit form
  - [ ] Client detail view showing related orders

### Order Tracking

- [x] Implement order CRUD operations
  - [x] POST /api/orders - Create new order
  - [x] GET /api/orders - List all orders with filters
  - [x] GET /api/orders/:id - Get single order
  - [x] PUT /api/orders/:id - Update order
  - [x] DELETE /api/orders/:id - Cancel/delete order (with invoice protection)
- [x] Support order frequency types
  - [x] Weekly
  - [x] Biweekly
  - [x] Monthly
  - [x] Quarterly
  - [x] Annually
  - [x] Custom (specify days)
- [x] Order status management
  - [x] Active
  - [x] Paused
  - [x] Cancelled
- [x] Calculate next invoice date based on frequency
  - [x] Implement date calculation logic
  - [x] Handle edge cases (end of month, leap years)
- [x] Order validation and business rules
  - [x] Required field validation
  - [x] Amount validation (positive numbers)
  - [x] Client relationship validation
- [x] Order UI components
  - [x] Order list page with search and filtering
  - [x] Order creation form
  - [x] Order edit form
  - [x] Order deletion with confirmation dialog
- [x] Order-client relationship integration
  - [x] Display client information in order views
  - [x] Filter orders by client
  - [x] Maintain referential integrity

## 2. Invoice Generation & Scheduling

### Invoice Management System ✅

- [x] Complete invoice CRUD operations
  - [x] POST /api/invoices - Create manual invoice  
  - [x] GET /api/invoices - List invoices with filtering and pagination
  - [x] GET /api/invoices/:id - Get invoice details
  - [x] PATCH /api/invoices/:id/status - Update invoice status
  - [x] DELETE /api/invoices/:id - Delete draft invoices
  - [x] POST /api/invoices/generate/:orderId - Generate from order
- [x] Invoice numbering system
  - [x] Auto-increment invoice numbers (INV-YYYY-NNNNNN format)
  - [x] Year-based sequential numbering
  - [x] Unique invoice number generation
- [x] Invoice status management
  - [x] Draft, Sent, Paid, Overdue, Cancelled statuses
  - [x] Status transition validation
  - [x] Automatic date tracking (sentDate, paidDate)
- [x] Invoice data structure
  - [x] Invoice number (auto-generated)
  - [x] Issue date and due date
  - [x] Amount from order or manual entry
  - [x] Client and order relationships
  - [x] Status tracking with timestamps
- [x] Invoice UI components
  - [x] Invoice list with search and filtering
  - [x] Invoice creation form with client/order selection
  - [x] Invoice status management interface
  - [x] Invoice deletion with business rules protection
- [x] Business rules and validation
  - [x] Only draft invoices can be deleted
  - [x] Status transition validation
  - [x] Due date validation (must be after issue date)
  - [x] Client and order relationship validation

### Automated Invoice Creation

- [x] Invoice generation from orders
  - [x] Generate invoices from active orders
  - [x] Validate order due dates before generation
  - [x] Update order next invoice dates after generation
  - [ ] Cron job to run daily at specified time
- [x] Invoice lead time configuration
  - [x] Due date calculation with lead time support
  - [x] Per-order lead time override
  - [ ] Global default lead time setting
  - [ ] Per-client lead time override

### Invoice Templates

- [x] Create invoice template system
  - [x] Professional HTML template with company branding
  - [x] Responsive design with print-friendly CSS
  - [x] Complete PDF service with Puppeteer integration
- [x] Template variables
  - [x] {{clientName}}, {{company}}, {{invoiceNumber}}
  - [x] {{issueDate}}, {{dueDate}}, {{amount}}
  - [x] {{orderDescription}}, {{paymentTerms}}
  - [x] Conditional rendering with {{#if}} blocks
- [x] PDF generation
  - [x] Convert HTML template to PDF using Puppeteer
  - [x] Include all invoice details with proper formatting
  - [x] Professional styling with status badges and company info
  - [x] PDF download endpoint at GET /api/invoices/:id/pdf
  - [x] Automated storage directory creation

## 3. Invoice Delivery

### Email Integration

- [x] Configure email service
  - [x] Set up SMTP credentials with Nodemailer
  - [x] Create comprehensive EmailService class
  - [x] Handle email errors and retries with detailed logging
- [x] Email templates
  - [x] Professional invoice delivery email with responsive design
  - [x] Payment reminder emails with urgency levels (friendly, due today, overdue)
  - [x] Template variable replacement system
  - [x] Branded company styling and professional layout
- [x] Email features
  - [x] Attach PDF invoice automatically with proper formatting
  - [x] Include payment instructions and company contact information
  - [x] Professional email templates with mobile responsiveness
  - [x] Email sending integrated into invoice workflow
- [x] Frontend email integration
  - [x] Send Email button in invoice actions menu
  - [x] Payment reminder options with different urgency levels
  - [x] Real-time status updates and user feedback
  - [x] Error handling and success notifications
- [ ] Email queue system (future enhancement)
  - [ ] Queue emails for reliable delivery
  - [ ] Retry failed sends
  - [ ] Log all email activities

### Reminder System

- [x] Manual reminder sending
  - [x] Pre-due date friendly reminders
  - [x] Due today reminder notices
  - [x] Overdue payment reminders with urgency
  - [x] Multiple reminder types with appropriate messaging
- [x] Reminder functionality
  - [x] Frontend reminder buttons integrated into invoice actions
  - [x] Different reminder types with color-coded urgency
  - [x] Email templates for each reminder type
  - [x] Professional reminder messaging with company branding
- [ ] Automated reminder scheduling (future enhancement)
  - [ ] Automated pre-due date reminders (e.g., 3 days before)
  - [ ] Automated on due date reminder
  - [ ] Automated overdue reminders (e.g., 3, 7, 14 days)
- [ ] Configurable reminder rules (future enhancement)
  - [ ] Global reminder settings
  - [ ] Per-client reminder preferences
  - [ ] Ability to disable reminders
- [ ] Reminder tracking (future enhancement)
  - [ ] Log all sent reminders
  - [ ] Prevent duplicate reminders
  - [ ] Show reminder history on invoice

## 4. Payment Tracking ✅

### Payment Management

- [x] Payment status tracking
  - [x] Unpaid
  - [x] Partially paid
  - [x] Paid
  - [x] Overdue
- [x] Manual payment recording
  - [x] POST /api/payments/invoice/:id - Record payment for invoice
  - [x] GET /api/payments/invoice/:id - Get payment history
  - [x] PUT /api/payments/:id - Update payment record
  - [x] DELETE /api/payments/:id - Delete payment record
  - [x] Record payment date, amount, method, notes
  - [x] Support partial payments
  - [x] Automatic invoice status updates
- [x] Payment methods
  - [x] Bank transfer
  - [x] Credit card
  - [x] Check
  - [x] Cash
  - [x] Other/custom
- [x] Payment tracking UI
  - [x] Payment recording dialog with validation
  - [x] Payment history dialog with actions
  - [x] Payment summary display
  - [x] Payment method chips and status indicators
  - [x] Integration with invoice management interface

### Dashboard & Reporting

- [ ] Main dashboard
  - [ ] Total outstanding amount
  - [ ] Overdue invoices count
  - [ ] Recent payments
  - [ ] Upcoming invoices
- [ ] Invoice list view
  - [ ] Filter by status (paid, unpaid, overdue)
  - [ ] Filter by client
  - [ ] Date range filters
  - [ ] Export to CSV
- [ ] Client statement
  - [ ] Show all invoices for a client
  - [ ] Payment history
  - [ ] Current balance

## 5. Notifications & Alerts

### Admin Notifications

- [ ] Email notifications for admin
  - [ ] Daily summary of overdue invoices
  - [ ] Weekly revenue report
  - [ ] Failed email delivery alerts
- [ ] In-app notifications
  - [ ] New payment received
  - [ ] Invoice overdue alerts
  - [ ] System errors/warnings
- [ ] Notification preferences
  - [ ] Toggle email notifications
  - [ ] Set notification frequency
  - [ ] Choose notification types

### Client Communications

- [ ] Automated client emails
  - [ ] Invoice sent confirmation
  - [ ] Payment received confirmation
  - [ ] Friendly payment reminders
- [ ] Email customization
  - [ ] Personalized greetings
  - [ ] Custom signature
  - [ ] Reply-to address configuration

## 6. Configuration & Settings

### System Configuration

- [ ] Company settings
  - [ ] Company name, address, logo
  - [ ] Tax ID, registration numbers
  - [ ] Default payment terms
- [ ] Invoice settings
  - [ ] Invoice number format/prefix
  - [ ] Default lead time
  - [ ] Default due date terms
- [ ] Email settings
  - [ ] From name/email
  - [ ] Reply-to email
  - [ ] Email signature

### User Management

- [x] User authentication
  - [x] Login/logout functionality
  - [ ] Password reset via email
  - [x] Session management
- [ ] User roles (if multi-user)
  - [ ] Admin - full access
  - [ ] Viewer - read-only access
  - [ ] Billing - invoice management only

## 7. Additional Features

### Data Management

- [ ] Backup system
  - [ ] Automated database backups
  - [ ] Export all data option
- [ ] Data import
  - [ ] Import clients from CSV
  - [ ] Import existing invoices
- [ ] Audit trail
  - [ ] Log all important actions
  - [ ] Track who made changes
  - [ ] Timestamp all activities

### Integration Capabilities

- [ ] Payment gateway integration (optional)
  - [ ] Stripe/PayPal integration
  - [ ] Webhook for payment updates
  - [ ] Automatic invoice status update
- [ ] Accounting software export
  - [ ] QuickBooks compatible format
  - [ ] Xero compatible format
  - [ ] Generic CSV export

## 8. Testing Requirements

### Unit Tests

- [ ] Test invoice calculation logic
- [ ] Test date/frequency calculations
- [ ] Test email template rendering
- [ ] Test payment processing logic

### Integration Tests

- [ ] Test complete invoice workflow
- [ ] Test email sending
- [ ] Test cron job execution
- [ ] Test database transactions

### UI Tests

- [ ] Test client creation flow
- [ ] Test invoice generation
- [ ] Test payment recording
- [ ] Test search and filters

## 9. Security Requirements

- [x] Implement authentication middleware
- [x] Add rate limiting to API endpoints
- [x] Sanitize all user inputs
- [ ] Use HTTPS in production
- [ ] Implement CSRF protection
- [ ] Regular security audits

## 10. Performance Requirements

- [ ] Page load time < 2 seconds
- [ ] Support 1000+ clients
- [ ] Handle 10,000+ invoices
- [ ] Bulk operations for multiple invoices
- [ ] Database query optimization

## Deployment Checklist

- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Set up email service
- [ ] Configure domain and SSL
- [ ] Set up monitoring/logging
- [ ] Create backup strategy
- [ ] Write user documentation
- [ ] Create admin guide

## Success Criteria

The system is considered complete when:

- [ ] Can create and manage multiple clients
- [ ] Can set up recurring orders with different frequencies
- [ ] Automatically generates invoices based on schedule
- [ ] Sends invoices via email with PDF attachment
- [ ] Tracks payment status accurately
- [ ] Sends configurable payment reminders
- [ ] Provides clear dashboard for invoice management
- [ ] All core features are tested and working
- [ ] System is deployed and accessible
- [ ] Documentation is complete

## Next Steps After Completion

1. User acceptance testing
2. Performance optimization
3. Additional payment gateway integrations
4. Mobile app development
5. Advanced reporting features
6. Multi-currency support
7. Multi-language support

---

This specification is designed to be executed by Claude Code. Each checkbox represents a discrete, testable task that can be implemented and verified independently.
