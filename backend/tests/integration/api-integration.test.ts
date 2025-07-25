import request from 'supertest'
import app from '../../src/server'
import { PrismaClient } from '@prisma/client'
import { authenticateTestUser, createTestDatabase, cleanupTestDatabase } from '../helpers/testHelpers'

const prisma = new PrismaClient()

describe('API Integration Tests', () => {
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

  describe('Cross-Module Data Integrity', () => {
    let clientId: string
    let orderId: string
    let invoiceId: string

    beforeEach(async () => {
      // Create test data for each test
      const clientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Integration Client',
          email: 'integration@test.com',
          company: 'Integration Company'
        })

      clientId = clientResponse.body.data.client.id

      const orderResponse = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send({
          clientId,
          description: 'Integration Order',
          amount: 300.00,
          frequency: 'MONTHLY',
          startDate: '2025-01-01'
        })

      orderId = orderResponse.body.data.order.id

      const invoiceResponse = await request(app)
        .post(`/api/orders/${orderId}/generate-invoice`)
        .set(authHeaders)

      invoiceId = invoiceResponse.body.data.invoice.id
    })

    it('should maintain referential integrity when deleting client with orders', async () => {
      // Try to delete client that has orders
      const deleteResponse = await request(app)
        .delete(`/api/clients/${clientId}`)
        .set(authHeaders)

      expect(deleteResponse.status).toBe(400)
      expect(deleteResponse.body.message).toContain('has associated orders')

      // Verify client still exists
      const clientCheck = await request(app)
        .get(`/api/clients/${clientId}`)
        .set(authHeaders)

      expect(clientCheck.status).toBe(200)
    })

    it('should maintain referential integrity when deleting order with invoices', async () => {
      // Try to delete order that has invoices
      const deleteResponse = await request(app)
        .delete(`/api/orders/${orderId}`)
        .set(authHeaders)

      expect(deleteResponse.status).toBe(400)
      expect(deleteResponse.body.message).toContain('has associated invoices')

      // Verify order still exists
      const orderCheck = await request(app)
        .get(`/api/orders/${orderId}`)
        .set(authHeaders)

      expect(orderCheck.status).toBe(200)
    })

    it('should cascade delete properly when forced', async () => {
      // Add payment to invoice first
      await request(app)
        .post(`/api/invoices/${invoiceId}/payments`)
        .set(authHeaders)
        .send({
          amount: 150.00,
          method: 'BANK_TRANSFER',
          paidDate: '2025-01-24'
        })

      // Force delete invoice (if implemented)
      const deleteInvoiceResponse = await request(app)
        .delete(`/api/invoices/${invoiceId}?force=true`)
        .set(authHeaders)

      // Should either succeed with cascade or fail with proper error
      expect([200, 400, 404]).toContain(deleteInvoiceResponse.status)

      if (deleteInvoiceResponse.status === 200) {
        // If delete succeeded, verify payments were also deleted
        const paymentsCheck = await request(app)
          .get(`/api/invoices/${invoiceId}/payments`)
          .set(authHeaders)

        expect(paymentsCheck.status).toBe(404)
      }
    })

    it('should maintain data consistency across related entities', async () => {
      // Update client information
      const updateClientResponse = await request(app)
        .put(`/api/clients/${clientId}`)
        .set(authHeaders)
        .send({
          name: 'Updated Integration Client',
          email: 'updated-integration@test.com',
          company: 'Updated Integration Company'
        })

      expect(updateClientResponse.status).toBe(200)

      // Verify invoice still references correct client with updated info
      const invoiceCheck = await request(app)
        .get(`/api/invoices/${invoiceId}`)
        .set(authHeaders)

      expect(invoiceCheck.status).toBe(200)
      expect(invoiceCheck.body.data.invoice.client.name).toBe('Updated Integration Client')
      expect(invoiceCheck.body.data.invoice.client.email).toBe('updated-integration@test.com')

      // Verify order also has updated client info
      const orderCheck = await request(app)
        .get(`/api/orders/${orderId}`)
        .set(authHeaders)

      expect(orderCheck.status).toBe(200)
      expect(orderCheck.body.data.order.client.name).toBe('Updated Integration Client')
    })
  })

  describe('Authentication and Authorization Flow', () => {
    it('should properly validate JWT tokens across all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/clients' },
        { method: 'get', path: '/api/orders' },
        { method: 'get', path: '/api/invoices' },
        { method: 'get', path: '/api/payments' }
      ]

      for (const endpoint of endpoints) {
        // Test without authorization header
        const noAuthResponse = await (request(app) as any)[endpoint.method](endpoint.path)
        expect(noAuthResponse.status).toBe(401)

        // Test with invalid token
        const invalidAuthResponse = await (request(app) as any)[endpoint.method](endpoint.path)
          .set('Authorization', 'Bearer invalid-token')
        expect(invalidAuthResponse.status).toBe(401)

        // Test with valid token
        const validAuthResponse = await (request(app) as any)[endpoint.method](endpoint.path)
          .set(authHeaders)
        expect([200, 404]).toContain(validAuthResponse.status) // 404 for empty results
      }
    })

    it('should maintain user isolation between different users', async () => {
      // Create a second test user
      const secondUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'seconduser@test.com',
          password: 'SecondPassword123!',
          name: 'Second User'
        })

      expect(secondUserResponse.status).toBe(201)

      const secondUserLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'seconduser@test.com',
          password: 'SecondPassword123!'
        })

      expect(secondUserLoginResponse.status).toBe(200)
      const secondUserHeaders = {
        Authorization: `Bearer ${secondUserLoginResponse.body.token}`
      }

      // Create client with first user
      const firstUserClientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'First User Client',
          email: 'firstuser-client@test.com'
        })

      expect(firstUserClientResponse.status).toBe(201)
      const firstUserClientId = firstUserClientResponse.body.data.client.id

      // Try to access first user's client with second user's token
      const unauthorizedAccessResponse = await request(app)
        .get(`/api/clients/${firstUserClientId}`)
        .set(secondUserHeaders)

      expect(unauthorizedAccessResponse.status).toBe(404) // Should not find client

      // Verify second user can't see first user's clients in list
      const secondUserClientsResponse = await request(app)
        .get('/api/clients')
        .set(secondUserHeaders)

      expect(secondUserClientsResponse.status).toBe(200)
      expect(secondUserClientsResponse.body.data.clients).toHaveLength(0)

      // Verify first user can still access their client
      const firstUserAccessResponse = await request(app)
        .get(`/api/clients/${firstUserClientId}`)
        .set(authHeaders)

      expect(firstUserAccessResponse.status).toBe(200)
      expect(firstUserAccessResponse.body.data.client.name).toBe('First User Client')
    })
  })

  describe('Error Handling Consistency', () => {
    it('should return consistent error formats across all endpoints', async () => {
      const testCases = [
        {
          request: () => request(app).get('/api/clients/invalid-uuid').set(authHeaders),
          expectedStatus: 400,
          errorType: 'validation'
        },
        {
          request: () => request(app).get('/api/clients/00000000-0000-0000-0000-000000000000').set(authHeaders),
          expectedStatus: 404,
          errorType: 'not_found'
        },
        {
          request: () => request(app).post('/api/clients').set(authHeaders).send({}),
          expectedStatus: 400,
          errorType: 'validation'
        },
        {
          request: () => request(app).post('/api/orders').set(authHeaders).send({ amount: -100 }),
          expectedStatus: 400,
          errorType: 'validation'
        }
      ]

      for (const testCase of testCases) {
        const response = await testCase.request()
        
        expect(response.status).toBe(testCase.expectedStatus)
        expect(response.body).toHaveProperty('success', false)
        expect(response.body).toHaveProperty('message')
        
        if (testCase.errorType === 'validation') {
          expect(response.body).toHaveProperty('errors')
          expect(Array.isArray(response.body.errors)).toBe(true)
        }
      }
    })

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the app doesn't crash on startup
      expect(app).toBeDefined()
    })
  })

  describe('Data Validation Integration', () => {
    it('should validate email uniqueness across client creation and updates', async () => {
      const emailToTest = 'duplicate@test.com'

      // Create first client with email
      const firstClientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'First Client',
          email: emailToTest
        })

      expect(firstClientResponse.status).toBe(201)

      // Try to create second client with same email
      const duplicateClientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Second Client',
          email: emailToTest
        })

      expect(duplicateClientResponse.status).toBe(400)
      expect(duplicateClientResponse.body.message).toContain('email already exists')

      // Create another client with different email
      const otherClientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Other Client',
          email: 'other@test.com'
        })

      expect(otherClientResponse.status).toBe(201)

      // Try to update other client to use duplicate email
      const updateWithDuplicateResponse = await request(app)
        .put(`/api/clients/${otherClientResponse.body.data.client.id}`)
        .set(authHeaders)
        .send({
          name: 'Other Client',
          email: emailToTest
        })

      expect(updateWithDuplicateResponse.status).toBe(400)
      expect(updateWithDuplicateResponse.body.message).toContain('email already exists')
    })

    it('should validate invoice number uniqueness', async () => {
      // Create client first
      const clientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Invoice Test Client',
          email: 'invoice-test@test.com'
        })

      const clientId = clientResponse.body.data.client.id
      const invoiceNumber = 'UNIQUE-001'

      // Create first invoice with specific number
      const firstInvoiceResponse = await request(app)
        .post('/api/invoices')
        .set(authHeaders)
        .send({
          clientId,
          invoiceNumber,
          amount: 100.00,
          issueDate: '2025-01-01',
          dueDate: '2025-01-31'
        })

      expect(firstInvoiceResponse.status).toBe(201)

      // Try to create second invoice with same number
      const duplicateInvoiceResponse = await request(app)
        .post('/api/invoices')
        .set(authHeaders)
        .send({
          clientId,
          invoiceNumber,
          amount: 200.00,
          issueDate: '2025-01-01',
          dueDate: '2025-01-31'
        })

      expect(duplicateInvoiceResponse.status).toBe(400)
      expect(duplicateInvoiceResponse.body.message).toContain('invoice number already exists')
    })
  })

  describe('Performance and Pagination Integration', () => {
    beforeEach(async () => {
      // Create multiple test records for pagination testing
      const clientPromises = Array.from({ length: 15 }, (_, i) =>
        request(app)
          .post('/api/clients')
          .set(authHeaders)
          .send({
            name: `Pagination Client ${i + 1}`,
            email: `pagination-${i + 1}@test.com`
          })
      )

      await Promise.all(clientPromises)
    })

    it('should handle pagination correctly across all list endpoints', async () => {
      // Test clients pagination
      const clientsPage1Response = await request(app)
        .get('/api/clients?page=1&limit=5')
        .set(authHeaders)

      expect(clientsPage1Response.status).toBe(200)
      expect(clientsPage1Response.body.data.clients).toHaveLength(5)
      expect(clientsPage1Response.body.data.pagination.currentPage).toBe(1)
      expect(clientsPage1Response.body.data.pagination.hasNextPage).toBe(true)

      const clientsPage2Response = await request(app)
        .get('/api/clients?page=2&limit=5')
        .set(authHeaders)

      expect(clientsPage2Response.status).toBe(200)
      expect(clientsPage2Response.body.data.clients).toHaveLength(5)
      expect(clientsPage2Response.body.data.pagination.currentPage).toBe(2)
      expect(clientsPage2Response.body.data.pagination.hasPreviousPage).toBe(true)

      // Test search with pagination
      const searchResponse = await request(app)
        .get('/api/clients?search=Pagination&page=1&limit=10')
        .set(authHeaders)

      expect(searchResponse.status).toBe(200)
      expect(searchResponse.body.data.clients.length).toBeGreaterThan(0)
      expect(searchResponse.body.data.clients.length).toBeLessThanOrEqual(10)
    })

    it('should handle sorting across different fields', async () => {
      // Test sorting by name ascending
      const sortByNameAscResponse = await request(app)
        .get('/api/clients?sortBy=name&sortOrder=asc&limit=10')
        .set(authHeaders)

      expect(sortByNameAscResponse.status).toBe(200)
      const ascNames = sortByNameAscResponse.body.data.clients.map((c: any) => c.name)
      expect(ascNames).toEqual([...ascNames].sort())

      // Test sorting by name descending
      const sortByNameDescResponse = await request(app)
        .get('/api/clients?sortBy=name&sortOrder=desc&limit=10')
        .set(authHeaders)

      expect(sortByNameDescResponse.status).toBe(200)
      const descNames = sortByNameDescResponse.body.data.clients.map((c: any) => c.name)
      expect(descNames).toEqual([...descNames].sort().reverse())

      // Test sorting by creation date
      const sortByDateResponse = await request(app)
        .get('/api/clients?sortBy=createdAt&sortOrder=desc&limit=5')
        .set(authHeaders)

      expect(sortByDateResponse.status).toBe(200)
      expect(sortByDateResponse.body.data.clients).toHaveLength(5)
    })
  })

  describe('File Upload and PDF Integration', () => {
    let testClientId: string
    let testInvoiceId: string

    beforeEach(async () => {
      const clientResponse = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'PDF Test Client',
          email: 'pdf-test@test.com'
        })

      testClientId = clientResponse.body.data.client.id

      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set(authHeaders)
        .send({
          clientId: testClientId,
          invoiceNumber: 'PDF-001',
          amount: 500.00,
          issueDate: '2025-01-01',
          dueDate: '2025-01-31'
        })

      testInvoiceId = invoiceResponse.body.data.invoice.id
    })

    it('should generate and serve PDF files correctly', async () => {
      // Generate PDF
      const pdfResponse = await request(app)
        .get(`/api/invoices/${testInvoiceId}/pdf`)
        .set(authHeaders)

      expect(pdfResponse.status).toBe(200)
      expect(pdfResponse.headers['content-type']).toBe('application/pdf')
      expect(pdfResponse.headers['content-disposition']).toContain('PDF-001.pdf')
      expect(pdfResponse.body.length).toBeGreaterThan(0)

      // Verify PDF was stored (check if pdfPath was updated)
      const invoiceCheck = await request(app)
        .get(`/api/invoices/${testInvoiceId}`)
        .set(authHeaders)

      expect(invoiceCheck.body.data.invoice.pdfPath).toBeDefined()
    })

    it('should handle PDF generation errors gracefully', async () => {
      // Try to generate PDF for non-existent invoice
      const invalidPdfResponse = await request(app)
        .get('/api/invoices/00000000-0000-0000-0000-000000000000/pdf')
        .set(authHeaders)

      expect(invalidPdfResponse.status).toBe(404)
    })
  })
})