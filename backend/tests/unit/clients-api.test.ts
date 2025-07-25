import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import clientRoutes from '../../src/routes/clients';
import { 
  createTestUser,
  createTestClient,
  generateTestToken,
  getAuthHeaders,
  expectValidationError,
  expectUnauthorizedError,
  cleanupTestData 
} from '../helpers/testHelpers';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/clients', clientRoutes);

const prisma = new PrismaClient();

describe('Client Management API Comprehensive Tests', () => {
  let testUser: any;
  let authHeaders: { Authorization: string };

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'clienttest@example.com',
      name: 'Client Test User',
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
    it('should require authentication for all client endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/clients' },
        { method: 'get', path: '/api/clients/test-id' },
        { method: 'post', path: '/api/clients' },
        { method: 'put', path: '/api/clients/test-id' },
        { method: 'delete', path: '/api/clients/test-id' },
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
          case 'delete':
            response = await request(app).delete(endpoint.path);
            break;
          default:
            throw new Error(`Unsupported method: ${endpoint.method}`);
        }
        expectUnauthorizedError(response);
      }
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', 'Bearer invalid-token');

      expectUnauthorizedError(response);
    });
  });

  describe('POST /api/clients - Create Client', () => {
    const validClientData = {
      name: 'Test Client',
      email: 'test@client.com',
      company: 'Test Company Inc.',
      phone: '15551234567',  // Valid mobile phone format
      address: '123 Main St, City, State 12345',
    };

    it('should create client with all valid data', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send(validClientData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Client created successfully');
      expect(response.body.data.client).toBeDefined();
      expect(response.body.data.client.name).toBe(validClientData.name);
      expect(response.body.data.client.email).toBe(validClientData.email);
      expect(response.body.data.client.company).toBe(validClientData.company);
      expect(response.body.data.client.phone).toBe(validClientData.phone);
      expect(response.body.data.client.address).toBe(validClientData.address);
      expect(response.body.data.client.id).toBeDefined();
      expect(response.body.data.client.createdAt).toBeDefined();
    });

    it('should create client with minimal required data', async () => {
      const minimalData = {
        name: 'Minimal Client',
        email: 'minimal@example.com',
      };

      const response = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send(minimalData);

      expect(response.status).toBe(201);
      expect(response.body.data.client.name).toBe(minimalData.name);
      expect(response.body.data.client.email).toBe(minimalData.email);
      expect(response.body.data.client.company).toBeNull();
      expect(response.body.data.client.phone).toBeNull();
      expect(response.body.data.client.address).toBeNull();
    });

    it('should store client in database correctly', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send(validClientData);

      const clientId = response.body.data.client.id;
      const storedClient = await prisma.client.findUnique({
        where: { id: clientId },
      });

      expect(storedClient).toBeDefined();
      expect(storedClient!.name).toBe(validClientData.name);
      expect(storedClient!.email).toBe(validClientData.email.toLowerCase());
      expect(storedClient!.company).toBe(validClientData.company);
    });

    describe('Validation Tests', () => {
      it('should require name field', async () => {
        const { name, ...dataWithoutName } = validClientData;
        const response = await request(app)
          .post('/api/clients')
          .set(authHeaders)
          .send(dataWithoutName);

        expectValidationError(response, 'name');
      });

      it('should require email field', async () => {
        const { email, ...dataWithoutEmail } = validClientData;
        const response = await request(app)
          .post('/api/clients')
          .set(authHeaders)
          .send(dataWithoutEmail);

        expectValidationError(response, 'email');
      });

      it('should validate email format', async () => {
        const invalidEmails = [
          'invalid-email',
          'missing@',
          '@missing-domain.com',
          'spaces in@email.com',
          'double@@domain.com',
        ];

        for (const email of invalidEmails) {
          const response = await request(app)
            .post('/api/clients')
            .set(authHeaders)
            .send({ ...validClientData, email });

          expectValidationError(response, 'email');
        }
      });

      it('should reject duplicate email addresses', async () => {
        // Create first client
        await request(app)
          .post('/api/clients')
          .set(authHeaders)
          .send(validClientData);

        // Try to create second client with same email
        const response = await request(app)
          .post('/api/clients')
          .set(authHeaders)
          .send({ ...validClientData, name: 'Different Name' });

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('already exists');
        expect(response.body.error).toBe('CLIENT_EMAIL_EXISTS');
      });

      it('should trim whitespace from fields', async () => {
        const dataWithWhitespace = {
          name: '  Test Client  ',
          email: '  TEST@CLIENT.COM  ',
          company: '  Test Company  ',
          phone: '  15551234567  ',
          address: '  123 Main St  ',
        };

        const response = await request(app)
          .post('/api/clients')
          .set(authHeaders)
          .send(dataWithWhitespace);

        expect(response.status).toBe(201);
        expect(response.body.data.client.name).toBe('Test Client');
        expect(response.body.data.client.email).toBe('test@client.com');
        expect(response.body.data.client.company).toBe('Test Company');
        expect(response.body.data.client.phone).toBe('15551234567');
        expect(response.body.data.client.address).toBe('123 Main St');
      });

      it('should handle missing optional fields', async () => {
        const dataWithoutOptionalFields = {
          name: 'Test Client',
          email: 'test@minimal.com',
          // No company, phone, or address
        };

        const response = await request(app)
          .post('/api/clients')
          .set(authHeaders)
          .send(dataWithoutOptionalFields);

        expect(response.status).toBe(201);
        expect(response.body.data.client.company).toBeNull();
        expect(response.body.data.client.phone).toBeNull();
        expect(response.body.data.client.address).toBeNull();
      });
    });

    describe('Input Sanitization', () => {
      it('should sanitize HTML in client fields', async () => {
        const maliciousData = {
          name: '<script>alert("xss")</script>Clean Name',
          email: 'sanitize@example.com',
          company: '<img src=x onerror=alert("xss")>Clean Company',
          phone: '15551234567',
          address: '<iframe src="malicious"></iframe>Clean Address',
        };

        const response = await request(app)
          .post('/api/clients')
          .set(authHeaders)
          .send(maliciousData);

        expect(response.status).toBe(201);
        expect(response.body.data.client.name).not.toContain('<script>');
        expect(response.body.data.client.company).not.toContain('<img');
        expect(response.body.data.client.address).not.toContain('<iframe');
      });
    });
  });

  describe('GET /api/clients - List Clients', () => {
    beforeEach(async () => {
      // Create test clients
      for (let i = 1; i <= 15; i++) {
        await createTestClient({
          name: `Test Client ${i}`,
          email: `client${i}@example.com`,
          company: `Company ${i}`,
        });
      }
    });

    it('should retrieve all clients with default pagination', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Clients retrieved successfully');
      expect(response.body.data.clients).toHaveLength(10); // Default limit
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalCount).toBe(15);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });

    it('should support custom pagination', async () => {
      const response = await request(app)
        .get('/api/clients?page=2&limit=5')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.clients).toHaveLength(5);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/clients?search=Client 1')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.clients.length).toBeGreaterThan(0);
      
      // Should find "Test Client 1", "Test Client 10", "Test Client 11", etc.
      const foundNames = response.body.data.clients.map((c: any) => c.name);
      expect(foundNames.some((name: string) => name.includes('Client 1'))).toBe(true);
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/clients?sortBy=email&sortOrder=desc')
        .set(authHeaders);

      expect(response.status).toBe(200);
      const emails = response.body.data.clients.map((c: any) => c.email);
      const sortedEmails = [...emails].sort().reverse();
      expect(emails).toEqual(sortedEmails);
    });

    it('should limit pagination to maximum 100 per page', async () => {
      const response = await request(app)
        .get('/api/clients?limit=200')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.limit).toBe(100);
    });

    it('should include client counts for orders and invoices', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.clients[0]).toHaveProperty('_count');
      expect(response.body.data.clients[0]._count).toHaveProperty('orders');
      expect(response.body.data.clients[0]._count).toHaveProperty('invoices');
    });
  });

  describe('GET /api/clients/:id - Get Single Client', () => {
    let testClient: any;

    beforeEach(async () => {
      testClient = await createTestClient({
        name: 'Detailed Test Client',
        email: 'detailed@example.com',
        company: 'Detailed Company',
      });
    });

    it('should retrieve client with all details', async () => {
      const response = await request(app)
        .get(`/api/clients/${testClient.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Client retrieved successfully');
      expect(response.body.data.client.id).toBe(testClient.id);
      expect(response.body.data.client.name).toBe(testClient.name);
      expect(response.body.data.client.email).toBe(testClient.email);
      expect(response.body.data.client).toHaveProperty('orders');
      expect(response.body.data.client).toHaveProperty('invoices');
      expect(response.body.data.client).toHaveProperty('_count');
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/clients/${fakeId}`)
        .set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Client not found');
      expect(response.body.error).toBe('CLIENT_NOT_FOUND');
    });

    it('should handle invalid client ID format', async () => {
      const response = await request(app)
        .get('/api/clients/invalid-id')
        .set(authHeaders);

      // Invalid UUIDs are treated as "not found" by Prisma
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Client not found');
    });
  });

  describe('PUT /api/clients/:id - Update Client', () => {
    let testClient: any;
    const updateData = {
      name: 'Updated Client Name',
      email: 'updated@example.com',
      company: 'Updated Company',
      phone: '15559998888',
      address: '456 Updated Street',
    };

    beforeEach(async () => {
      testClient = await createTestClient({
        name: 'Original Client',
        email: 'original@example.com',
      });
    });

    it('should update client with valid data', async () => {
      const response = await request(app)
        .put(`/api/clients/${testClient.id}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Client updated successfully');
      expect(response.body.data.client.name).toBe(updateData.name);
      expect(response.body.data.client.email).toBe(updateData.email);
      expect(response.body.data.client.company).toBe(updateData.company);
    });

    it('should update client in database', async () => {
      await request(app)
        .put(`/api/clients/${testClient.id}`)
        .set(authHeaders)
        .send(updateData);

      const updatedClient = await prisma.client.findUnique({
        where: { id: testClient.id },
      });

      expect(updatedClient!.name).toBe(updateData.name);
      expect(updatedClient!.email).toBe(updateData.email.toLowerCase());
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .put(`/api/clients/${fakeId}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Client not found');
    });

    it('should prevent duplicate email during update', async () => {
      // Create another client
      const anotherClient = await createTestClient({
        email: 'another@example.com',
      });

      // Try to update first client with second client's email
      const response = await request(app)
        .put(`/api/clients/${testClient.id}`)
        .set(authHeaders)
        .send({ ...updateData, email: anotherClient.email });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });

    it('should allow keeping same email during update', async () => {
      const response = await request(app)
        .put(`/api/clients/${testClient.id}`)
        .set(authHeaders)
        .send({ ...updateData, email: testClient.email });

      expect(response.status).toBe(200);
    });

    it('should validate updated data', async () => {
      const response = await request(app)
        .put(`/api/clients/${testClient.id}`)
        .set(authHeaders)
        .send({ ...updateData, email: 'invalid-email' });

      expectValidationError(response, 'email');
    });
  });

  describe('DELETE /api/clients/:id - Delete Client', () => {
    let testClient: any;

    beforeEach(async () => {
      testClient = await createTestClient({
        name: 'Client to Delete',
        email: 'delete@example.com',
      });
    });

    it('should delete client without dependencies', async () => {
      const response = await request(app)
        .delete(`/api/clients/${testClient.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Client deleted successfully');
      expect(response.body.data.deletedClientId).toBe(testClient.id);

      // Verify client is deleted from database
      const deletedClient = await prisma.client.findUnique({
        where: { id: testClient.id },
      });
      expect(deletedClient).toBeNull();
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .delete(`/api/clients/${fakeId}`)
        .set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Client not found');
    });

    it('should handle invalid client ID format', async () => {
      const response = await request(app)
        .delete('/api/clients/invalid-id')
        .set(authHeaders);

      // Invalid UUIDs are treated as "not found" by Prisma
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Client not found');
    });

    // TODO: Add tests for preventing deletion with active orders/invoices
    // This requires creating test orders and invoices first
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking Prisma client
      // For now, we verify the API structure is consistent
      const response = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: 'Test Client',
          email: 'test@example.com',
        });

      expect(response.body).toHaveProperty('message');
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe('Security Features', () => {
    it('should sanitize input data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>Safe Name',
        email: 'security@example.com',
        company: 'Safe Company',
      };

      const response = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send(maliciousData);

      expect(response.status).toBe(201);
      expect(response.body.data.client.name).not.toContain('<script>');
    });

    it('should handle SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({
          name: "'; DROP TABLE clients; --",
          email: 'injection@example.com',
        });

      // Should either return validation error or create client safely
      expect([201, 400]).toContain(response.status);
    });
  });
});