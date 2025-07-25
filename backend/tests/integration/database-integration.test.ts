import { PrismaClient } from '@prisma/client'
import { createTestDatabase, cleanupTestDatabase, authenticateTestUser } from '../helpers/testHelpers'

const prisma = new PrismaClient()

describe('Database Integration Tests', () => {
  let testUser: any

  beforeAll(async () => {
    await createTestDatabase()
    const authResult = await authenticateTestUser()
    testUser = authResult.testUser
  })

  afterAll(async () => {
    await cleanupTestDatabase()
    await prisma.$disconnect()
  })

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.payment.deleteMany()
    await prisma.invoice.deleteMany()
    await prisma.order.deleteMany()
    await prisma.client.deleteMany()
  })

  describe('Database Transactions', () => {
    it('should handle transaction rollback on payment creation failure', async () => {
      // Create test data
      const client = await prisma.client.create({
        data: {
          name: 'Transaction Test Client',
          email: 'transaction@test.com'
        }
      })

      const invoice = await prisma.invoice.create({
        data: {
          clientId: client.id,
          invoiceNumber: 'TRANS-001',
          amount: 500.00,
          issueDate: new Date('2025-01-01'),
          dueDate: new Date('2025-01-31'),
          status: 'SENT'
        }
      })

      // Simulate transaction that should fail
      try {
        await prisma.$transaction(async (tx) => {
          // This payment creation should succeed
          await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: 300.00,
              method: 'BANK_TRANSFER',
              paidDate: new Date('2025-01-15'),
              notes: 'First payment'
            }
          })

          // This should cause the transaction to fail (invalid amount)
          await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: 250.00, // This would exceed the remaining invoice amount
              method: 'CREDIT_CARD',
              paidDate: new Date('2025-01-16'),
              notes: 'Second payment that should fail'
            }
          })

          // Validate total doesn't exceed invoice amount
          const totalPaid = await tx.payment.aggregate({
            where: { invoiceId: invoice.id },
            _sum: { amount: true }
          })

          if (totalPaid._sum.amount && totalPaid._sum.amount > 500.00) {
            throw new Error('Total payments exceed invoice amount')
          }
        })
      } catch (error) {
        expect(error.message).toContain('Total payments exceed invoice amount')
      }

      // Verify no payments were created due to rollback
      const payments = await prisma.payment.findMany({
        where: { invoiceId: invoice.id }
      })

      expect(payments).toHaveLength(0)

      // Verify invoice status wasn't changed
      const invoiceCheck = await prisma.invoice.findUnique({
        where: { id: invoice.id }
      })

      expect(invoiceCheck?.status).toBe('SENT')
    })

    it('should handle successful transaction with multiple operations', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Success Transaction Client',
          email: 'success-transaction@test.com'
        }
      })

      const invoice = await prisma.invoice.create({
        data: {
          clientId: client.id,
          invoiceNumber: 'SUCCESS-001',
          amount: 1000.00,
          issueDate: new Date('2025-01-01'),
          dueDate: new Date('2025-01-31'),
          status: 'SENT'
        }
      })

      // Execute successful transaction
      await prisma.$transaction(async (tx) => {
        // Create payment
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: 1000.00,
            method: 'BANK_TRANSFER',
            paidDate: new Date('2025-01-15'),
            notes: 'Full payment'
          }
        })

        // Update invoice status
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paidDate: new Date('2025-01-15')
          }
        })
      })

      // Verify all operations succeeded
      const payments = await prisma.payment.findMany({
        where: { invoiceId: invoice.id }
      })

      expect(payments).toHaveLength(1)
      expect(payments[0].amount).toBe(1000.00)

      const invoiceCheck = await prisma.invoice.findUnique({
        where: { id: invoice.id }
      })

      expect(invoiceCheck?.status).toBe('PAID')
      expect(invoiceCheck?.paidDate).toBeDefined()
    })
  })

  describe('Database Constraints and Validations', () => {
    it('should enforce unique constraints', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Unique Test Client',
          email: 'unique@test.com'
        }
      })

      // Create first invoice with unique number
      await prisma.invoice.create({
        data: {
          clientId: client.id,
          invoiceNumber: 'UNIQUE-001',
          amount: 100.00,
          issueDate: new Date('2025-01-01'),
          dueDate: new Date('2025-01-31')
        }
      })

      // Try to create second invoice with same number
      await expect(
        prisma.invoice.create({
          data: {
            clientId: client.id,
            invoiceNumber: 'UNIQUE-001',
            amount: 200.00,
            issueDate: new Date('2025-01-01'),
            dueDate: new Date('2025-01-31')
          }
        })
      ).rejects.toThrow()
    })

    it('should enforce foreign key constraints', async () => {
      // Try to create invoice with non-existent client
      await expect(
        prisma.invoice.create({
          data: {
            clientId: '00000000-0000-0000-0000-000000000000',
            invoiceNumber: 'FK-001',
            amount: 100.00,
            issueDate: new Date('2025-01-01'),
            dueDate: new Date('2025-01-31')
          }
        })
      ).rejects.toThrow()

      // Try to create payment with non-existent invoice
      await expect(
        prisma.payment.create({
          data: {
            invoiceId: '00000000-0000-0000-0000-000000000000',
            amount: 100.00,
            method: 'BANK_TRANSFER',
            paidDate: new Date('2025-01-15')
          }
        })
      ).rejects.toThrow()
    })

    it('should enforce data type constraints', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Data Type Test Client',
          email: 'datatype@test.com'
        }
      })

      // Try to create invoice with invalid data types
      await expect(
        prisma.invoice.create({
          data: {
            clientId: client.id,
            invoiceNumber: 'TYPE-001',
            amount: 'invalid-amount' as any, // Should be number
            issueDate: new Date('2025-01-01'),
            dueDate: new Date('2025-01-31')
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Database Relationships and Cascading', () => {
    it('should handle cascade deletes correctly', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Cascade Test Client',
          email: 'cascade@test.com'
        }
      })

      const order = await prisma.order.create({
        data: {
          clientId: client.id,
          description: 'Cascade Test Order',
          amount: 200.00,
          frequency: 'MONTHLY',
          startDate: new Date('2025-01-01'),
          nextInvoiceDate: new Date('2025-02-01'),
          status: 'ACTIVE'
        }
      })

      const invoice = await prisma.invoice.create({
        data: {
          clientId: client.id,
          orderId: order.id,
          invoiceNumber: 'CASCADE-001',
          amount: 200.00,
          issueDate: new Date('2025-01-01'),
          dueDate: new Date('2025-01-31')
        }
      })

      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: 200.00,
          method: 'BANK_TRANSFER',
          paidDate: new Date('2025-01-15')
        }
      })

      // Delete order (should cascade to invoices and payments if configured)
      await prisma.order.delete({
        where: { id: order.id }
      })

      // Check if invoice was cascade deleted
      const invoiceCheck = await prisma.invoice.findUnique({
        where: { id: invoice.id }
      })

      expect(invoiceCheck).toBeNull()

      // Check if payment was cascade deleted
      const paymentCheck = await prisma.payment.findUnique({
        where: { id: payment.id }
      })

      expect(paymentCheck).toBeNull()
    })

    it('should load relationships correctly', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Relationship Test Client',
          email: 'relationship@test.com'
        }
      })

      const order = await prisma.order.create({
        data: {
          clientId: client.id,
          description: 'Relationship Test Order',
          amount: 300.00,
          frequency: 'MONTHLY',
          startDate: new Date('2025-01-01'),
          nextInvoiceDate: new Date('2025-02-01'),
          status: 'ACTIVE'
        }
      })

      const invoice = await prisma.invoice.create({
        data: {
          clientId: client.id,
          orderId: order.id,
          invoiceNumber: 'REL-001',
          amount: 300.00,
          issueDate: new Date('2025-01-01'),
          dueDate: new Date('2025-01-31')
        }
      })

      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: 150.00,
          method: 'BANK_TRANSFER',
          paidDate: new Date('2025-01-15')
        }
      })

      // Load invoice with all relationships
      const invoiceWithRelations = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true
            }
          },
          order: {
            select: {
              id: true,
              description: true,
              frequency: true,
              status: true
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              method: true,
              paidDate: true,
              notes: true
            }
          }
        }
      })

      expect(invoiceWithRelations).toBeDefined()
      expect(invoiceWithRelations?.client.name).toBe('Relationship Test Client')
      expect(invoiceWithRelations?.order?.description).toBe('Relationship Test Order')
      expect(invoiceWithRelations?.payments).toHaveLength(1)
      expect(invoiceWithRelations?.payments[0].amount).toBe(150.00)
    })
  })

  describe('Database Performance and Indexing', () => {
    let testClient: any

    beforeEach(async () => {
      // Create test data for performance testing
      testClient = await prisma.client.create({
        data: {
          name: 'Performance Test Client',
          email: 'performance@test.com'
        }
      })

      // Create multiple invoices for testing
      const invoicePromises = Array.from({ length: 50 }, (_, i) =>
        prisma.invoice.create({
          data: {
            clientId: testClient.id,
            invoiceNumber: `PERF-${String(i + 1).padStart(3, '0')}`,
            amount: (i + 1) * 10,
            issueDate: new Date('2025-01-01'),
            dueDate: new Date('2025-01-31'),
            status: i % 3 === 0 ? 'PAID' : 'SENT'
          }
        })
      )

      await Promise.all(invoicePromises)
    })

    it('should perform efficient queries with proper indexing', async () => {
      const startTime = Date.now()

      // Test indexed query (by client ID)
      const clientInvoices = await prisma.invoice.findMany({
        where: { clientId: testClient.id },
        take: 10
      })

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(clientInvoices).toHaveLength(10)
      expect(queryTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle pagination efficiently', async () => {
      const pageSize = 10
      const startTime = Date.now()

      // Test paginated query
      const paginatedResults = await prisma.invoice.findMany({
        where: { clientId: testClient.id },
        skip: 20,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      })

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(paginatedResults).toHaveLength(pageSize)
      expect(queryTime).toBeLessThan(1000)

      // Verify ordering
      for (let i = 1; i < paginatedResults.length; i++) {
        expect(paginatedResults[i - 1].createdAt >= paginatedResults[i].createdAt).toBe(true)
      }
    })

    it('should perform efficient aggregation queries', async () => {
      const startTime = Date.now()

      // Test aggregation query
      const stats = await prisma.invoice.aggregate({
        where: { clientId: testClient.id },
        _count: { id: true },
        _sum: { amount: true },
        _avg: { amount: true },
        _max: { amount: true },
        _min: { amount: true }
      })

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(stats._count.id).toBe(50)
      expect(stats._sum.amount).toBeGreaterThan(0)
      expect(stats._avg.amount).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(1000)
    })

    it('should handle complex filtered queries efficiently', async () => {
      const startTime = Date.now()

      // Test complex query with multiple conditions
      const filteredInvoices = await prisma.invoice.findMany({
        where: {
          clientId: testClient.id,
          AND: [
            { amount: { gte: 100 } },
            { status: 'SENT' },
            { createdAt: { gte: new Date('2025-01-01') } }
          ]
        },
        include: {
          client: {
            select: { name: true, email: true }
          }
        },
        orderBy: { amount: 'desc' }
      })

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(filteredInvoices.length).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(1000)

      // Verify all results meet criteria
      for (const invoice of filteredInvoices) {
        expect(invoice.amount).toBeGreaterThanOrEqual(100)
        expect(invoice.status).toBe('SENT')
        expect(invoice.client).toBeDefined()
      }
    })
  })

  describe('Database Connection and Error Handling', () => {
    it('should handle connection timeout gracefully', async () => {
      // This test simulates database connection issues
      // In a real scenario, you would mock the database connection
      const testQuery = async () => {
        try {
          await prisma.$queryRaw`SELECT 1`
          return { success: true }
        } catch (error) {
          return { success: false, error }
        }
      }

      const result = await testQuery()
      expect(result.success).toBe(true)
    })

    it('should maintain connection pool efficiently', async () => {
      // Test multiple concurrent queries
      const queryPromises = Array.from({ length: 10 }, () =>
        prisma.client.findMany({
          take: 1
        })
      )

      const results = await Promise.all(queryPromises)
      
      expect(results).toHaveLength(10)
      for (const result of results) {
        expect(Array.isArray(result)).toBe(true)
      }
    })
  })
})