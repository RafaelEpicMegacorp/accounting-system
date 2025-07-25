import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  createTestUser, 
  expectValidationError,
  cleanupTestData 
} from '../helpers/testHelpers';

// Import auth routes directly
import authRoutes from '../../src/routes/auth';

// Create minimal test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const prisma = new PrismaClient();

describe('Authentication API - Core Functionality', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...userData, name: 'Different Name' });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      name: 'Login User',
      email: 'login@example.com',
      password: 'TestPassword123!',
    };

    beforeEach(async () => {
      // Register user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid email or password');
    });
  });

  describe('Database Integration', () => {
    it('should store user in database correctly', async () => {
      const userData = {
        name: 'DB Test User',
        email: 'dbtest@example.com',
        password: 'SecurePassword123!',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(user).toBeDefined();
      expect(user!.email).toBe(userData.email);
      expect(user!.name).toBe(userData.name);
      expect(user!.password).not.toBe(userData.password); // Should be hashed
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        name: 'Unique Test',
        email: 'unique@example.com',
        password: 'SecurePassword123!',
      };

      // First user
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Second user with same email should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...userData, name: 'Different Name' });

      expect(response.status).toBe(409);
    });
  });

  describe('Security Features', () => {
    it('should not return password in response', async () => {
      const userData = {
        name: 'Security Test',
        email: 'security@example.com',
        password: 'SecurePassword123!',
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(registerResponse.body.user).not.toHaveProperty('password');
      expect(loginResponse.body.user).not.toHaveProperty('password');
    });

    it('should generate valid JWT tokens', async () => {
      const userData = {
        name: 'Token Test',
        email: 'token@example.com',
        password: 'SecurePassword123!',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const token = response.body.token;
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT structure
    });
  });
});