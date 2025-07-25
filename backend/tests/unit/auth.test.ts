import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../../src/routes/auth';
import { createTestUser, generateTestToken, getAuthHeaders, expectValidationError } from '../helpers/testHelpers';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const prisma = new PrismaClient();

describe('Authentication API', () => {
  beforeAll(async () => {
    // Ensure we're using test database
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Tests must use a test database');
    }
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject registration with invalid email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response, 'email');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123', // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response, 'password');
    });

    it('should reject registration with missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        // Missing name and password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expectValidationError(response);
    });

    it('should reject registration with duplicate email', async () => {
      // Create user first
      await createTestUser({ email: 'existing@example.com' });

      const userData = {
        name: 'Another User',
        email: 'existing@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user for login tests
      await createTestUser({
        email: 'login@example.com',
        name: 'Login Test User',
      });
    });

    it('should login with correct credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'testpassword123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject login with incorrect password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should reject login with invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expectValidationError(response, 'email');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expectValidationError(response);
    });
  });

  describe('JWT Token Validation', () => {
    it('should generate valid JWT token structure', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user.id);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct user information in token', async () => {
      const user = await createTestUser({ email: 'tokentest@example.com' });
      
      const loginData = {
        email: 'tokentest@example.com',
        password: 'testpassword123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      
      const token = response.body.data.token;
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      expect(payload.userId).toBe(user.id);
      expect(payload.email).toBe(user.email);
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input in registration', async () => {
      const userData = {
        name: '<script>alert("xss")</script>Test User',
        email: 'sanitize@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.data.user.name).not.toContain('<script>');
    });

    it('should handle SQL injection attempts in email field', async () => {
      const userData = {
        name: 'Test User',
        email: "test@example.com'; DROP TABLE users; --",
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Should fail validation due to invalid email format
      expectValidationError(response, 'email');
    });
  });
});