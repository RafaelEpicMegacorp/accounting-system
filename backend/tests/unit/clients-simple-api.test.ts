import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import clientRoutes from '../../src/routes/clients';
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
app.use('/api/clients', clientRoutes);

const prisma = new PrismaClient();

describe('Client Management API - Core Functionality', () => {
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
    it('should require authentication for client listing', async () => {
      const response = await request(app)
        .get('/api/clients');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Access denied');
    });

    it('should accept valid authentication', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Clients retrieved successfully');
    });
  });

  describe('POST /api/clients - Create Client', () => {
    const validClientData = {
      name: 'Test Client',
      email: 'test@client.com',
      company: 'Test Company Inc.',
      // Skip phone for now - optional field
      address: '123 Main St, City, State 12345',
    };

    it('should create client with valid data', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send(validClientData);
      
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Client created successfully');
      expect(response.body.data.client).toBeDefined();
      expect(response.body.data.client.name).toBe(validClientData.name);
      expect(response.body.data.client.email).toBe(validClientData.email);
    });

    it('should create client with valid phone number', async () => {
      const dataWithPhone = {
        ...validClientData,
        phone: '15551234567',  // Valid mobile phone format (no +)
        email: 'withphone@example.com'
      };

      const response = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send(dataWithPhone);

      expect(response.status).toBe(201);
      expect(response.body.data.client.phone).toBe('15551234567');
    });

    it('should create client with minimal data', async () => {
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
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set(authHeaders)
        .send({});

      console.log('Validation error response:', JSON.stringify(response.body, null, 2));
      
      expect(response.status).toBe(400);
    });

    it('should prevent duplicate emails', async () => {
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
    });
  });

  describe('GET /api/clients - List Clients', () => {
    beforeEach(async () => {
      // Create a few test clients
      for (let i = 1; i <= 3; i++) {
        await createTestClient({
          name: `Test Client ${i}`,
          email: `client${i}@example.com`,
          company: `Company ${i}`,
        });
      }
    });

    it('should retrieve all clients with pagination', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Clients retrieved successfully');
      expect(response.body.data.clients).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/clients?search=Client 1')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.clients.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/clients/:id - Get Single Client', () => {
    let testClient: any;

    beforeEach(async () => {
      testClient = await createTestClient({
        name: 'Single Test Client',
        email: 'single@example.com',
      });
    });

    it('should retrieve client details', async () => {
      const response = await request(app)
        .get(`/api/clients/${testClient.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Client retrieved successfully');
      expect(response.body.data.client.id).toBe(testClient.id);
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/clients/${fakeId}`)
        .set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Client not found');
    });
  });

  describe('PUT /api/clients/:id - Update Client', () => {
    let testClient: any;

    beforeEach(async () => {
      testClient = await createTestClient({
        name: 'Original Client',
        email: 'original@example.com',
      });
    });

    it('should update client information', async () => {
      const updateData = {
        name: 'Updated Client',
        email: 'updated@example.com',
        company: 'Updated Company',
      };

      const response = await request(app)
        .put(`/api/clients/${testClient.id}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Client updated successfully');
      expect(response.body.data.client.name).toBe(updateData.name);
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

    it('should delete client successfully', async () => {
      const response = await request(app)
        .delete(`/api/clients/${testClient.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Client deleted successfully');
    });
  });
});