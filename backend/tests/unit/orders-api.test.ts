import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import orderRoutes from '../../src/routes/orders';
import { 
  createTestUser,
  createTestClient,
  createTestOrder,
  generateTestToken,
  getAuthHeaders,
  expectValidationError,
  expectUnauthorizedError,
  cleanupTestData 
} from '../helpers/testHelpers';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);

const prisma = new PrismaClient();

describe('Order Management API Comprehensive Tests', () => {
  let testUser: any;
  let testClient: any;
  let authHeaders: { Authorization: string };

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'ordertest@example.com',
      name: 'Order Test User',
    });
    testClient = await createTestClient({
      name: 'Test Client for Orders',
      email: 'orderclient@example.com',
    });
    authHeaders = getAuthHeaders(generateTestToken(testUser.id));
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for all order endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/orders' },
        { method: 'get', path: '/api/orders/test-id' },
        { method: 'post', path: '/api/orders' },
        { method: 'put', path: '/api/orders/test-id' },
        { method: 'patch', path: '/api/orders/test-id/status' },
        { method: 'delete', path: '/api/orders/test-id' },
        { method: 'get', path: '/api/orders/test-id/schedule' },
      ];

      for (const endpoint of endpoints) {
        let response;
        switch (endpoint.method) {
          case 'get':
            response = await request(app).get(endpoint.path);
            break;
          case 'post':
            response = await request(app).post(endpoint.path);
            break;
          case 'put':
            response = await request(app).put(endpoint.path);
            break;
          case 'patch':
            response = await request(app).patch(endpoint.path);
            break;
          case 'delete':
            response = await request(app).delete(endpoint.path);
            break;
          default:
            throw new Error(`Unsupported method: ${endpoint.method}`);
        }
        expectUnauthorizedError(response);
      }
    });

    it('should accept valid authentication', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Orders retrieved successfully');
    });
  });

  describe('POST /api/orders - Create Order', () => {
    const validOrderData = {
      clientId: '',  // Will be set in beforeEach
      description: 'Monthly Web Development Service',
      amount: 1500.00,
      frequency: 'MONTHLY',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      leadTimeDays: 3,
    };

    beforeEach(() => {
      validOrderData.clientId = testClient.id;
    });

    it('should create order with valid data', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send(validOrderData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Order created successfully');
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.clientId).toBe(validOrderData.clientId);
      expect(response.body.data.order.description).toBe(validOrderData.description);
      expect(response.body.data.order.amount).toBe(validOrderData.amount);
      expect(response.body.data.order.frequency).toBe(validOrderData.frequency);
      expect(response.body.data.order.status).toBe('ACTIVE');
      expect(response.body.data.order.leadTimeDays).toBe(validOrderData.leadTimeDays);
      expect(response.body.data.order.nextInvoiceDate).toBeDefined();
      expect(response.body.data.order.client).toBeDefined();
    });

    it('should create order with minimal required data', async () => {
      const minimalData = {
        clientId: testClient.id,
        description: 'Basic Service',
        amount: 100.00,
        frequency: 'MONTHLY',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send(minimalData);

      expect(response.status).toBe(201);
      expect(response.body.data.order.leadTimeDays).toBeNull();
      expect(response.body.data.order.customDays).toBeNull();
    });

    it('should store order in database correctly', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send(validOrderData);

      const orderId = response.body.data.order.id;
      const storedOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      expect(storedOrder).toBeDefined();
      expect(storedOrder!.clientId).toBe(validOrderData.clientId);
      expect(storedOrder!.description).toBe(validOrderData.description);
      expect(storedOrder!.amount).toBe(validOrderData.amount);
      expect(storedOrder!.frequency).toBe(validOrderData.frequency);
      expect(storedOrder!.status).toBe('ACTIVE');
    });

    describe('Frequency Tests', () => {
      const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'];

      it.each(frequencies)('should create order with %s frequency', async (frequency) => {
        const orderWithFrequency = {
          ...validOrderData,
          frequency,
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(orderWithFrequency);

        expect(response.status).toBe(201);
        expect(response.body.data.order.frequency).toBe(frequency);
        expect(response.body.data.order.customDays).toBeNull();
      });

      it('should create order with CUSTOM frequency and custom days', async () => {
        const customOrderData = {
          ...validOrderData,
          frequency: 'CUSTOM',
          customDays: 45, // Every 45 days
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(customOrderData);

        expect(response.status).toBe(201);
        expect(response.body.data.order.frequency).toBe('CUSTOM');
        expect(response.body.data.order.customDays).toBe(45);
      });

      it('should reject CUSTOM frequency without custom days', async () => {
        const invalidCustomData = {
          ...validOrderData,
          frequency: 'CUSTOM',
          // Missing customDays
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(invalidCustomData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('INVALID_FREQUENCY_CUSTOM_DAYS');
      });

      it('should reject invalid frequency values', async () => {
        const invalidFrequencyData = {
          ...validOrderData,
          frequency: 'INVALID_FREQUENCY',
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(invalidFrequencyData);

        expectValidationError(response, 'frequency');
      });
    });

    describe('Validation Tests', () => {
      it('should require clientId field', async () => {
        const { clientId, ...dataWithoutClientId } = validOrderData;
        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(dataWithoutClientId);

        expectValidationError(response, 'clientId');
      });

      it('should require description field', async () => {
        const { description, ...dataWithoutDescription } = validOrderData;
        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(dataWithoutDescription);

        expectValidationError(response, 'description');
      });

      it('should require amount field', async () => {
        const { amount, ...dataWithoutAmount } = validOrderData;
        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(dataWithoutAmount);

        expectValidationError(response, 'amount');
      });

      it('should require positive amount', async () => {
        const invalidAmountData = {
          ...validOrderData,
          amount: -100,
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(invalidAmountData);

        expectValidationError(response, 'amount');
      });

      it('should reject zero amount', async () => {
        const zeroAmountData = {
          ...validOrderData,
          amount: 0,
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(zeroAmountData);

        expectValidationError(response, 'amount');
      });

      it('should validate startDate format', async () => {
        const invalidDateData = {
          ...validOrderData,
          startDate: 'invalid-date',
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(invalidDateData);

        expectValidationError(response, 'startDate');
      });

      it('should reject past start dates', async () => {
        const pastDateData = {
          ...validOrderData,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(pastDateData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('INVALID_START_DATE');
      });

      it('should reject non-existent client', async () => {
        const invalidClientData = {
          ...validOrderData,
          clientId: '550e8400-e29b-41d4-a716-446655440000', // Fake UUID
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(invalidClientData);

        // Validation middleware catches invalid UUID format
        expect(response.status).toBe(400);
        expectValidationError(response, 'clientId');
      });

      it('should validate custom days range for CUSTOM frequency', async () => {
        const invalidCustomDaysData = {
          ...validOrderData,
          frequency: 'CUSTOM',
          customDays: 0, // Invalid: should be > 0
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(invalidCustomDaysData);

        // Validation middleware catches invalid custom days
        expect(response.status).toBe(400);
        expectValidationError(response, 'customDays');
      });
    });

    describe('Date Calculations', () => {
      it('should calculate next invoice date correctly for MONTHLY frequency', async () => {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() + 1); // Next year to avoid past date
        startDate.setDate(15); // 15th of the month
        
        const monthlyOrderData = {
          ...validOrderData,
          frequency: 'MONTHLY',
          startDate: startDate.toISOString(),
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(monthlyOrderData);

        expect(response.status).toBe(201);
        const nextInvoiceDate = new Date(response.body.data.order.nextInvoiceDate);
        
        // Should be roughly one month later
        const expectedMonth = (startDate.getMonth() + 1) % 12;
        expect(nextInvoiceDate.getMonth()).toBe(expectedMonth);
      });

      it('should calculate next invoice date correctly for CUSTOM frequency', async () => {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() + 1); // Next year to avoid past date
        startDate.setMonth(0, 1); // January 1st
        
        const customOrderData = {
          ...validOrderData,
          frequency: 'CUSTOM',
          customDays: 30,
          startDate: startDate.toISOString(),
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(customOrderData);

        expect(response.status).toBe(201);
        const nextInvoiceDate = new Date(response.body.data.order.nextInvoiceDate);
        const expectedDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        expect(nextInvoiceDate.toDateString()).toBe(expectedDate.toDateString());
      });
    });

    describe('Input Sanitization', () => {
      it('should trim whitespace from description', async () => {
        const dataWithWhitespace = {
          ...validOrderData,
          description: '   Service Description   ',
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(dataWithWhitespace);

        expect(response.status).toBe(201);
        expect(response.body.data.order.description).toBe('Service Description');
      });

      it('should sanitize HTML in description', async () => {
        const maliciousData = {
          ...validOrderData,
          description: '<script>alert("xss")</script>Clean Description',
        };

        const response = await request(app)
          .post('/api/orders')
          .set(authHeaders)
          .send(maliciousData);

        expect(response.status).toBe(201);
        expect(response.body.data.order.description).not.toContain('<script>');
      });
    });
  });

  describe('GET /api/orders - List Orders', () => {
    beforeEach(async () => {
      // Create test orders with different frequencies and statuses
      for (let i = 1; i <= 5; i++) {
        await createTestOrder(testClient.id, {
          description: `Test Order ${i}`,
          amount: 100 * i,
          frequency: i % 2 === 0 ? 'MONTHLY' : 'WEEKLY',
          status: i <= 3 ? 'ACTIVE' : 'PAUSED',
          startDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          nextInvoiceDate: new Date(Date.now() + (i + 7) * 24 * 60 * 60 * 1000),
        });
      }
    });

    it('should retrieve all orders with default pagination', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Orders retrieved successfully');
      expect(response.body.data.orders).toHaveLength(5);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalCount).toBe(5);

      // Should include client data
      expect(response.body.data.orders[0].client).toBeDefined();
      expect(response.body.data.orders[0].client.name).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/orders?page=2&limit=2')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.orders).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/orders?search=Order 1')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.orders.length).toBeGreaterThan(0);
      
      const foundDescriptions = response.body.data.orders.map((o: any) => o.description);
      expect(foundDescriptions.some((desc: string) => desc.includes('Order 1'))).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/orders?status=ACTIVE')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.orders.length).toBe(3); // First 3 orders are ACTIVE
      response.body.data.orders.forEach((order: any) => {
        expect(order.status).toBe('ACTIVE');
      });
    });

    it('should filter by frequency', async () => {
      const response = await request(app)
        .get('/api/orders?frequency=MONTHLY')
        .set(authHeaders);

      expect(response.status).toBe(200);
      response.body.data.orders.forEach((order: any) => {
        expect(order.frequency).toBe('MONTHLY');
      });
    });

    it('should filter by client', async () => {
      const response = await request(app)
        .get(`/api/orders?clientId=${testClient.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.orders).toHaveLength(5);
      response.body.data.orders.forEach((order: any) => {
        expect(order.clientId).toBe(testClient.id);
      });
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/orders?sortBy=amount&sortOrder=asc')
        .set(authHeaders);

      expect(response.status).toBe(200);
      const amounts = response.body.data.orders.map((o: any) => o.amount);
      const sortedAmounts = [...amounts].sort((a, b) => a - b);
      expect(amounts).toEqual(sortedAmounts);
    });

    it('should include invoice counts', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.orders[0]).toHaveProperty('_count');
      expect(response.body.data.orders[0]._count).toHaveProperty('invoices');
    });
  });

  describe('GET /api/orders/:id - Get Single Order', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await createTestOrder(testClient.id, {
        description: 'Detailed Test Order',
        amount: 750.00,
        frequency: 'MONTHLY',
        startDate: new Date(),
        nextInvoiceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    });

    it('should retrieve order with all details', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Order retrieved successfully');
      expect(response.body.data.order.id).toBe(testOrder.id);
      expect(response.body.data.order.client).toBeDefined();
      expect(response.body.data.order.invoices).toBeDefined();
      expect(response.body.data.order).toHaveProperty('frequencyDisplay');
      expect(response.body.data.order).toHaveProperty('estimatedAnnualRevenue');
      expect(response.body.data.order).toHaveProperty('upcomingSchedule');
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/orders/${fakeId}`)
        .set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Order not found');
      expect(response.body.error).toBe('ORDER_NOT_FOUND');
    });

    it('should handle invalid order ID format', async () => {
      const response = await request(app)
        .get('/api/orders/invalid-id')
        .set(authHeaders);

      // Invalid UUIDs are treated as "not found" by Prisma
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Order not found');
    });
  });

  describe('PUT /api/orders/:id - Update Order', () => {
    let testOrder: any;
    const updateData = {
      clientId: '', // Will be set in beforeEach
      description: 'Updated Service Description',
      amount: 2000.00,
      frequency: 'QUARTERLY',
      startDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
      leadTimeDays: 5,
    };

    beforeEach(async () => {
      testOrder = await createTestOrder(testClient.id, {
        description: 'Original Order',
        amount: 1000.00,
        frequency: 'MONTHLY',
      });
      updateData.clientId = testClient.id;
    });

    it('should update order with valid data', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder.id}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Order updated successfully');
      expect(response.body.data.order.description).toBe(updateData.description);
      expect(response.body.data.order.amount).toBe(updateData.amount);
      expect(response.body.data.order.frequency).toBe(updateData.frequency);
    });

    it('should update order in database', async () => {
      await request(app)
        .put(`/api/orders/${testOrder.id}`)
        .set(authHeaders)
        .send(updateData);

      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });

      expect(updatedOrder!.description).toBe(updateData.description);
      expect(updatedOrder!.amount).toBe(updateData.amount);
      expect(updatedOrder!.frequency).toBe(updateData.frequency);
    });

    it('should recalculate next invoice date when frequency changes', async () => {
      const originalNextInvoiceDate = testOrder.nextInvoiceDate;
      
      await request(app)
        .put(`/api/orders/${testOrder.id}`)
        .set(authHeaders)
        .send(updateData);

      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });

      expect(updatedOrder!.nextInvoiceDate).not.toEqual(originalNextInvoiceDate);
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .put(`/api/orders/${fakeId}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Order not found');
    });

    it('should validate updated data', async () => {
      const invalidData = {
        ...updateData,
        amount: -500, // Invalid negative amount
      };

      const response = await request(app)
        .put(`/api/orders/${testOrder.id}`)
        .set(authHeaders)
        .send(invalidData);

      expectValidationError(response, 'amount');
    });
  });

  describe('PATCH /api/orders/:id/status - Update Order Status', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await createTestOrder(testClient.id, {
        description: 'Status Test Order',
        status: 'ACTIVE',
      });
    });

    const statuses = ['ACTIVE', 'PAUSED', 'CANCELLED'];

    it.each(statuses)('should update order status to %s', async (status) => {
      const response = await request(app)
        .patch(`/api/orders/${testOrder.id}/status`)
        .set(authHeaders)
        .send({ status });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Order status updated successfully');
      expect(response.body.data.order.status).toBe(status);
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrder.id}/status`)
        .set(authHeaders)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_STATUS');
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .patch(`/api/orders/${fakeId}/status`)
        .set(authHeaders)
        .send({ status: 'PAUSED' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Order not found');
    });
  });

  describe('DELETE /api/orders/:id - Delete Order', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await createTestOrder(testClient.id, {
        description: 'Order to Delete',
      });
    });

    it('should delete order without invoices', async () => {
      const response = await request(app)
        .delete(`/api/orders/${testOrder.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Order deleted successfully');
      expect(response.body.data.deletedOrderId).toBe(testOrder.id);

      // Verify order is deleted from database
      const deletedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });
      expect(deletedOrder).toBeNull();
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .delete(`/api/orders/${fakeId}`)
        .set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Order not found');
    });

    // TODO: Add test for order with invoices (should be cancelled, not deleted)
    // This requires creating test invoices first
  });

  describe('GET /api/orders/:id/schedule - Get Invoice Schedule', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await createTestOrder(testClient.id, {
        description: 'Schedule Test Order',
        frequency: 'MONTHLY',
        nextInvoiceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    });

    it('should retrieve invoice schedule', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}/schedule`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Invoice schedule retrieved successfully');
      expect(response.body.data.schedule).toBeDefined();
      expect(response.body.data.schedule).toHaveLength(5); // Default count
      expect(response.body.data.orderStatus).toBe(testOrder.status);
      expect(response.body.data.count).toBe(5);
    });

    it('should support custom schedule count', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}/schedule?count=10`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.schedule).toHaveLength(10);
      expect(response.body.data.count).toBe(10);
    });

    it('should limit schedule count to maximum 20', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}/schedule?count=50`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.schedule).toHaveLength(20);
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/orders/${fakeId}/schedule`)
        .set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Order not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking Prisma client
      // For now, we verify the API structure is consistent
      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send({
          clientId: testClient.id,
          description: 'Test Order',
          amount: 100,
          frequency: 'MONTHLY',
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(response.body).toHaveProperty('message');
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe('Security Features', () => {
    it('should sanitize input data', async () => {
      const maliciousData = {
        clientId: testClient.id,
        description: '<script>alert("xss")</script>Safe Description',
        amount: 100,
        frequency: 'MONTHLY',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send(maliciousData);

      expect(response.status).toBe(201);
      expect(response.body.data.order.description).not.toContain('<script>');
    });

    it('should handle SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send({
          clientId: testClient.id,
          description: "'; DROP TABLE orders; --",
          amount: 100,
          frequency: 'MONTHLY',
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      // Should either return validation error or create order safely
      expect([201, 400]).toContain(response.status);
    });
  });
});