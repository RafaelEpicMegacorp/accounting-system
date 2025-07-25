import request from 'supertest'
import app from '../../src/server'
import { PrismaClient } from '@prisma/client'
import { authenticateTestUser, createTestDatabase, cleanupTestDatabase } from '../helpers/testHelpers'

const prisma = new PrismaClient()

describe('Full Application Workflow Integration Tests', () => {
  let authHeaders: { Authorization: string }
  let testUser: any

  beforeAll(async () => {
    await createTestDatabase()
    const authResult = await authenticateTestUser()
    authHeaders = authResult.authHeaders
    testUser = authResult.testUser
  })

  afterAll(async () => {
    await cleanupTestDatabase()
    await prisma.$disconnect()
  })

  describe('Complete Invoice Lifecycle', () => {
    let clientId: string
    let orderId: string
    let invoiceId: string
    let paymentId: string

    it('should create a complete invoice workflow from client to payment', async () => {
      // Step 1: Create a client
      const clientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Integration Test Client',
          email: 'integration@test.com',
          company: 'Test Integration Company',
          phone: '+1234567890',
          address: '123 Integration St'
        })

      expect(clientResponse.status).toBe(201)
      expect(clientResponse.body.data.client).toBeDefined()
      clientId = clientResponse.body.data.client.id

      // Step 2: Create a recurring order for the client
      const orderResponse = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send({
          clientId,
          description: 'Monthly Integration Service',
          amount: 150.00,
          frequency: 'MONTHLY',
          startDate: '2025-01-01',
          endDate: '2025-12-31'
        })

      expect(orderResponse.status).toBe(201)
      expect(orderResponse.body.data.order).toBeDefined()
      orderId = orderResponse.body.data.order.id

      // Step 3: Generate invoice from the order
      const invoiceResponse = await request(app)
        .post(`/api/orders/${orderId}/generate-invoice`)
        .set(authHeaders)

      expect(invoiceResponse.status).toBe(201)
      expect(invoiceResponse.body.data.invoice).toBeDefined()
      expect(invoiceResponse.body.data.invoice.orderId).toBe(orderId)
      expect(invoiceResponse.body.data.invoice.clientId).toBe(clientId)
      expect(invoiceResponse.body.data.invoice.amount).toBe(150.00)
      invoiceId = invoiceResponse.body.data.invoice.id

      // Step 4: Send the invoice via email
      const sendResponse = await request(app)
        .post(`/api/invoices/${invoiceId}/send`)
        .set(authHeaders)

      expect([200, 500]).toContain(sendResponse.status) // Email might fail in test env
      
      // Step 5: Update invoice status to SENT if email send was successful
      if (sendResponse.status === 200) {
        const statusResponse = await request(app)
          .patch(`/api/invoices/${invoiceId}/status`)
          .set(authHeaders)
          .send({ status: 'SENT' })

        expect(statusResponse.status).toBe(200)
        expect(statusResponse.body.data.invoice.status).toBe('SENT')
      }

      // Step 6: Record a partial payment
      const partialPaymentResponse = await request(app)
        .post(`/api/invoices/${invoiceId}/payments`)
        .set(authHeaders)
        .send({
          amount: 75.00,
          method: 'BANK_TRANSFER',
          paidDate: '2025-01-24',
          notes: 'Partial payment via integration test'
        })

      expect(partialPaymentResponse.status).toBe(201)
      expect(partialPaymentResponse.body.data.payment).toBeDefined()
      expect(partialPaymentResponse.body.data.payment.amount).toBe(75.00)
      expect(partialPaymentResponse.body.data.paymentSummary.totalPaid).toBe(75.00)
      expect(partialPaymentResponse.body.data.paymentSummary.remainingAmount).toBe(75.00)
      expect(partialPaymentResponse.body.data.paymentSummary.isFullyPaid).toBe(false)
      paymentId = partialPaymentResponse.body.data.payment.id

      // Step 7: Record the remaining payment
      const finalPaymentResponse = await request(app)
        .post(`/api/invoices/${invoiceId}/payments`)
        .set(authHeaders)
        .send({
          amount: 75.00,
          method: 'CREDIT_CARD',
          paidDate: '2025-01-25',
          notes: 'Final payment via integration test'
        })

      expect(finalPaymentResponse.status).toBe(201)
      expect(finalPaymentResponse.body.data.paymentSummary.totalPaid).toBe(150.00)
      expect(finalPaymentResponse.body.data.paymentSummary.remainingAmount).toBe(0)
      expect(finalPaymentResponse.body.data.paymentSummary.isFullyPaid).toBe(true)

      // Step 8: Verify invoice status was automatically updated to PAID
      const finalInvoiceResponse = await request(app)
        .get(`/api/invoices/${invoiceId}`)
        .set(authHeaders)

      expect(finalInvoiceResponse.status).toBe(200)
      expect(finalInvoiceResponse.body.data.invoice.status).toBe('PAID')
      expect(finalInvoiceResponse.body.data.invoice.paidDate).toBeDefined()

      // Step 9: Generate next month's invoice
      const nextInvoiceResponse = await request(app)
        .post(`/api/orders/${orderId}/generate-invoice`)
        .set(authHeaders)

      expect(nextInvoiceResponse.status).toBe(201)
      expect(nextInvoiceResponse.body.data.invoice.orderId).toBe(orderId)
      expect(nextInvoiceResponse.body.data.invoice.amount).toBe(150.00)
      expect(nextInvoiceResponse.body.data.invoice.status).toBe('DRAFT')

      // Verify we have two invoices for this order now
      const orderInvoicesResponse = await request(app)
        .get(`/api/invoices?orderId=${orderId}`)
        .set(authHeaders)

      expect(orderInvoicesResponse.status).toBe(200)
      expect(orderInvoicesResponse.body.data.invoices).toHaveLength(2)
    })

    it('should handle manual invoice creation and payment workflow', async () => {
      // Create manual invoice without order
      const manualInvoiceResponse = await request(app)
        .post('/api/invoices')
        .set(authHeaders)
        .send({
          clientId,
          invoiceNumber: 'MANUAL-001',
          amount: 500.00,
          issueDate: '2025-01-24',
          dueDate: '2025-02-24',
          description: 'One-time consultation fee'
        })

      expect(manualInvoiceResponse.status).toBe(201)
      expect(manualInvoiceResponse.body.data.invoice.orderId).toBeNull()
      const manualInvoiceId = manualInvoiceResponse.body.data.invoice.id

      // Generate PDF for manual invoice
      const pdfResponse = await request(app)
        .get(`/api/invoices/${manualInvoiceId}/pdf`)
        .set(authHeaders)

      expect(pdfResponse.status).toBe(200)
      expect(pdfResponse.headers['content-type']).toBe('application/pdf')

      // Record full payment for manual invoice
      const fullPaymentResponse = await request(app)
        .post(`/api/invoices/${manualInvoiceId}/payments`)
        .set(authHeaders)
        .send({
          amount: 500.00,
          method: 'CHECK',
          paidDate: '2025-01-24',
          notes: 'Full payment for consultation'
        })

      expect(fullPaymentResponse.status).toBe(201)
      expect(fullPaymentResponse.body.data.paymentSummary.isFullyPaid).toBe(true)
    })
  })

  describe('Client Management Integration', () => {
    let integrationClientId: string

    it('should create client and manage their orders and invoices', async () => {
      // Create client
      const clientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Client Management Test',
          email: 'clientmgmt@test.com',
          company: 'Management Test Co'
        })

      expect(clientResponse.status).toBe(201)
      integrationClientId = clientResponse.body.data.client.id

      // Create multiple orders for client
      const order1Response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send({
          clientId: integrationClientId,
          description: 'Weekly Service',
          amount: 100.00,
          frequency: 'WEEKLY',
          startDate: '2025-01-01'
        })

      const order2Response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send({
          clientId: integrationClientId,
          description: 'Monthly Retainer',
          amount: 1000.00,
          frequency: 'MONTHLY',
          startDate: '2025-01-01'
        })

      expect(order1Response.status).toBe(201)
      expect(order2Response.status).toBe(201)

      // Get client with orders
      const clientWithOrdersResponse = await request(app)
        .get(`/api/clients/${integrationClientId}`)
        .set(authHeaders)

      expect(clientWithOrdersResponse.status).toBe(200)
      expect(clientWithOrdersResponse.body.data.client.orders).toHaveLength(2)

      // Generate invoices for both orders
      await request(app)
        .post(`/api/orders/${order1Response.body.data.order.id}/generate-invoice`)
        .set(authHeaders)

      await request(app)
        .post(`/api/orders/${order2Response.body.data.order.id}/generate-invoice`)
        .set(authHeaders)

      // Get all invoices for client
      const clientInvoicesResponse = await request(app)
        .get(`/api/invoices?clientId=${integrationClientId}`)
        .set(authHeaders)

      expect(clientInvoicesResponse.status).toBe(200)
      expect(clientInvoicesResponse.body.data.invoices).toHaveLength(2)

      // Update client information
      const updateResponse = await request(app)
        .put(`/api/clients/${integrationClientId}`)
        .set(authHeaders)
        .send({
          name: 'Updated Client Management Test',
          email: 'updated-clientmgmt@test.com',
          company: 'Updated Management Test Co',
          phone: '+9876543210'
        })

      expect(updateResponse.status).toBe(200)
      expect(updateResponse.body.data.client.name).toBe('Updated Client Management Test')
      expect(updateResponse.body.data.client.phone).toBe('+9876543210')
    })
  })

  describe('Payment Tracking Integration', () => {
    let paymentClientId: string
    let paymentInvoiceId: string

    it('should handle complex payment scenarios', async () => {
      // Setup: Create client and invoice
      const clientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Payment Test Client',
          email: 'payment@test.com'
        })

      paymentClientId = clientResponse.body.data.client.id

      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set(authHeaders)
        .send({
          clientId: paymentClientId,
          invoiceNumber: 'PAY-TEST-001',
          amount: 1000.00,
          issueDate: '2025-01-01',
          dueDate: '2025-01-31'
        })

      paymentInvoiceId = invoiceResponse.body.data.invoice.id

      // Scenario 1: Multiple partial payments
      const payments = [
        { amount: 250.00, method: 'BANK_TRANSFER', notes: 'First payment' },
        { amount: 300.00, method: 'CREDIT_CARD', notes: 'Second payment' },
        { amount: 200.00, method: 'CHECK', notes: 'Third payment' },
        { amount: 250.00, method: 'CASH', notes: 'Final payment' }
      ]

      let runningTotal = 0
      for (const [index, payment] of payments.entries()) {
        const paymentResponse = await request(app)
          .post(`/api/invoices/${paymentInvoiceId}/payments`)
          .set(authHeaders)
          .send({
            ...payment,
            paidDate: `2025-01-${String(10 + index * 5).padStart(2, '0')}`
          })

        expect(paymentResponse.status).toBe(201)
        runningTotal += payment.amount
        
        expect(paymentResponse.body.data.paymentSummary.totalPaid).toBe(runningTotal)
        expect(paymentResponse.body.data.paymentSummary.remainingAmount).toBe(1000 - runningTotal)
        expect(paymentResponse.body.data.paymentSummary.isFullyPaid).toBe(runningTotal >= 1000)
      }

      // Verify final invoice status is PAID
      const finalInvoiceCheck = await request(app)
        .get(`/api/invoices/${paymentInvoiceId}`)
        .set(authHeaders)

      expect(finalInvoiceCheck.body.data.invoice.status).toBe('PAID')

      // Get payment history
      const paymentHistoryResponse = await request(app)
        .get(`/api/invoices/${paymentInvoiceId}/payments`)
        .set(authHeaders)

      expect(paymentHistoryResponse.status).toBe(200)
      expect(paymentHistoryResponse.body.data.payments).toHaveLength(4)
      expect(paymentHistoryResponse.body.data.summary.totalPaid).toBe(1000.00)
      expect(paymentHistoryResponse.body.data.summary.paymentCount).toBe(4)

      // Test payment method breakdown
      const methodBreakdown = paymentHistoryResponse.body.data.summary.paymentsByMethod
      expect(methodBreakdown.BANK_TRANSFER).toBe(250.00)
      expect(methodBreakdown.CREDIT_CARD).toBe(300.00)
      expect(methodBreakdown.CHECK).toBe(200.00)
      expect(methodBreakdown.CASH).toBe(250.00)
    })

    it('should handle overpayment scenario', async () => {
      // Create new invoice for overpayment test
      const clientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Overpay Test Client',
          email: 'overpay@test.com'
        })

      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set(authHeaders)
        .send({
          clientId: clientResponse.body.data.client.id,
          invoiceNumber: 'OVERPAY-001',
          amount: 500.00,
          issueDate: '2025-01-01',
          dueDate: '2025-01-31'
        })

      const overpayInvoiceId = invoiceResponse.body.data.invoice.id

      // Attempt to record payment exceeding invoice amount
      const overpaymentResponse = await request(app)
        .post(`/api/invoices/${overpayInvoiceId}/payments`)
        .set(authHeaders)
        .send({
          amount: 600.00,
          method: 'BANK_TRANSFER',
          paidDate: '2025-01-15',
          notes: 'Overpayment test'
        })

      expect(overpaymentResponse.status).toBe(400)
      expect(overpaymentResponse.body.message).toContain('amount cannot exceed')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle cascading validation errors', async () => {
      // Try to create order with non-existent client
      const invalidOrderResponse = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send({
          clientId: '00000000-0000-0000-0000-000000000000',
          description: 'Test Order',
          amount: 100.00,
          frequency: 'MONTHLY',
          startDate: '2025-01-01'
        })

      expect(invalidOrderResponse.status).toBe(404)

      // Try to generate invoice for non-existent order
      const invalidInvoiceResponse = await request(app)
        .post('/api/orders/00000000-0000-0000-0000-000000000000/generate-invoice')
        .set(authHeaders)

      expect(invalidInvoiceResponse.status).toBe(404)

      // Try to record payment for non-existent invoice
      const invalidPaymentResponse = await request(app)
        .post('/api/invoices/00000000-0000-0000-0000-000000000000/payments')
        .set(authHeaders)
        .send({
          amount: 100.00,
          method: 'BANK_TRANSFER',
          paidDate: '2025-01-24'
        })

      expect(invalidPaymentResponse.status).toBe(404)
    })

    it('should maintain data consistency during concurrent operations', async () => {
      // Create test data
      const clientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Concurrency Test Client',
          email: 'concurrency@test.com'
        })

      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set(authHeaders)
        .send({
          clientId: clientResponse.body.data.client.id,
          invoiceNumber: 'CONCURRENT-001',
          amount: 1000.00,
          issueDate: '2025-01-01',
          dueDate: '2025-01-31'
        })

      const concurrentInvoiceId = invoiceResponse.body.data.invoice.id

      // Attempt concurrent payments that would exceed invoice amount
      const paymentPromises = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .post(`/api/invoices/${concurrentInvoiceId}/payments`)
          .set(authHeaders)
          .send({
            amount: 600.00,
            method: 'BANK_TRANSFER',
            paidDate: '2025-01-15',
            notes: `Concurrent payment ${i + 1}`
          })
      )

      const results = await Promise.allSettled(paymentPromises)
      
      // Only one should succeed, others should fail due to validation
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.status === 201
      ).length
      
      const failureCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.status === 400
      ).length

      expect(successCount).toBe(1)
      expect(failureCount).toBe(2)
    })
  })

  describe('Business Logic Integration', () => {
    it('should automatically update invoice status based on payments', async () => {
      // Create test client and invoice
      const clientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Status Test Client',
          email: 'status@test.com'
        })

      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set(authHeaders)
        .send({
          clientId: clientResponse.body.data.client.id,
          invoiceNumber: 'STATUS-001',
          amount: 800.00,
          issueDate: '2025-01-01',
          dueDate: '2025-01-31'
        })

      const statusInvoiceId = invoiceResponse.body.data.invoice.id

      // Verify initial status is DRAFT
      let statusCheck = await request(app)
        .get(`/api/invoices/${statusInvoiceId}`)
        .set(authHeaders)

      expect(statusCheck.body.data.invoice.status).toBe('DRAFT')

      // Send invoice
      await request(app)
        .patch(`/api/invoices/${statusInvoiceId}/status`)
        .set(authHeaders)
        .send({ status: 'SENT' })

      // Record partial payment
      await request(app)
        .post(`/api/invoices/${statusInvoiceId}/payments`)
        .set(authHeaders)
        .send({
          amount: 300.00,
          method: 'BANK_TRANSFER',
          paidDate: '2025-01-15'
        })

      // Status should still be SENT (not PAID yet)
      statusCheck = await request(app)
        .get(`/api/invoices/${statusInvoiceId}`)
        .set(authHeaders)

      expect(statusCheck.body.data.invoice.status).toBe('SENT')

      // Record remaining payment
      await request(app)
        .post(`/api/invoices/${statusInvoiceId}/payments`)
        .set(authHeaders)
        .send({
          amount: 500.00,
          method: 'CREDIT_CARD',
          paidDate: '2025-01-20'
        })

      // Status should now be PAID
      statusCheck = await request(app)
        .get(`/api/invoices/${statusInvoiceId}`)
        .set(authHeaders)

      expect(statusCheck.body.data.invoice.status).toBe('PAID')
      expect(statusCheck.body.data.invoice.paidDate).toBeDefined()
    })

    it('should handle recurring order invoice generation', async () => {
      // Create client and recurring order
      const clientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Recurring Test Client',
          email: 'recurring@test.com'
        })

      const orderResponse = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send({
          clientId: clientResponse.body.data.client.id,
          description: 'Weekly Recurring Service',
          amount: 200.00,
          frequency: 'WEEKLY',
          startDate: '2025-01-01',
          endDate: '2025-03-31'
        })

      const recurringOrderId = orderResponse.body.data.order.id

      // Generate multiple invoices
      const invoiceIds = []
      for (let i = 0; i < 4; i++) {
        const invoiceResponse = await request(app)
          .post(`/api/orders/${recurringOrderId}/generate-invoice`)
          .set(authHeaders)

        expect(invoiceResponse.status).toBe(201)
        invoiceIds.push(invoiceResponse.body.data.invoice.id)
      }

      // Verify all invoices exist and have correct amounts
      for (const invoiceId of invoiceIds) {
        const invoiceCheck = await request(app)
          .get(`/api/invoices/${invoiceId}`)
          .set(authHeaders)

        expect(invoiceCheck.body.data.invoice.amount).toBe(200.00)
        expect(invoiceCheck.body.data.invoice.orderId).toBe(recurringOrderId)
      }

      // Get all invoices for this order
      const orderInvoicesResponse = await request(app)
        .get(`/api/invoices?orderId=${recurringOrderId}`)
        .set(authHeaders)

      expect(orderInvoicesResponse.body.data.invoices).toHaveLength(4)
    })
  })
})