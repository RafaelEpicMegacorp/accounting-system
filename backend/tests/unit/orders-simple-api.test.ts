import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import orderRoutes from '../../src/routes/orders';
import { 
  createTestUser,
  createTestClient,
  generateTestToken,
  getAuthHeaders,
  cleanupTestData 
} from '../helpers/testHelpers';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);

const prisma = new PrismaClient();

describe('Order Management API - Debugging', () => {
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

  describe('Debug failing tests', () => {
    it('should debug non-existent client response', async () => {
      const invalidClientData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000', // Fake UUID
        description: 'Test Service',
        amount: 100.00,
        frequency: 'MONTHLY',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send(invalidClientData);

      console.log('Non-existent client response:', JSON.stringify(response.body, null, 2));
      console.log('Status:', response.status);
    });

    it('should debug custom days validation', async () => {
      const invalidCustomDaysData = {
        clientId: testClient.id,
        description: 'Test Service',
        amount: 100.00,
        frequency: 'CUSTOM',
        customDays: 0, // Invalid: should be > 0
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send(invalidCustomDaysData);

      console.log('Custom days validation response:', JSON.stringify(response.body, null, 2));
      console.log('Status:', response.status);
    });

    it('should debug date calculation for monthly', async () => {
      const startDate = new Date('2024-01-15');
      const monthlyOrderData = {
        clientId: testClient.id,
        description: 'Monthly Test',
        amount: 100.00,
        frequency: 'MONTHLY',
        startDate: startDate.toISOString(),
      };

      const response = await request(app)
        .post('/api/orders')
        .set(authHeaders)
        .send(monthlyOrderData);

      console.log('Monthly order response:', JSON.stringify(response.body, null, 2));
      console.log('Status:', response.status);
      
      if (response.status === 201) {
        const nextInvoiceDate = new Date(response.body.data.order.nextInvoiceDate);
        console.log('Start date:', startDate);
        console.log('Next invoice date:', nextInvoiceDate);
        console.log('Expected month:', startDate.getMonth() + 1);
        console.log('Actual month:', nextInvoiceDate.getMonth());
      }
    });
  });
});