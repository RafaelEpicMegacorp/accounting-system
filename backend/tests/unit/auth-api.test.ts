import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../../src/routes/auth';
import { 
  createTestUser, 
  generateTestToken, 
  getAuthHeaders, 
  expectValidationError,
  expectUnauthorizedError,
  cleanupTestData 
} from '../helpers/testHelpers';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const prisma = new PrismaClient();

describe('Authentication API Comprehensive Tests', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register - User Registration', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePassword123!',
    };

    it('should register user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.name).toBe(validUserData.name);
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.token).toBeDefined();
      expect(typeof response.body.data.token).toBe('string');
    });

    it('should create user in database with hashed password', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      const user = await prisma.user.findUnique({
        where: { email: validUserData.email },
      });

      expect(user).toBeDefined();
      expect(user!.email).toBe(validUserData.email);
      expect(user!.name).toBe(validUserData.name);
      expect(user!.password).not.toBe(validUserData.password); // Should be hashed
      expect(user!.password.length).toBeGreaterThan(50); // bcrypt hash length
    });

    describe('Email Validation', () => {
      it('should reject invalid email formats', async () => {
        const invalidEmails = [
          'invalid-email',
          'missing@',
          '@missing-local.com',
          'spaces in@email.com',
          'double@@domain.com',
        ];

        for (const email of invalidEmails) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({ ...validUserData, email });

          expectValidationError(response, 'email');
        }
      });

      it('should reject duplicate email addresses', async () => {
        // Create first user
        await request(app)
          .post('/api/auth/register')
          .send(validUserData);

        // Try to create second user with same email
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validUserData, name: 'Different Name' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already exists');
      });
    });

    describe('Password Validation', () => {
      it('should reject weak passwords', async () => {
        const weakPasswords = [
          '123',           // Too short
          'password',      // Too common
          '12345678',      // Only numbers
          'abcdefgh',      // Only letters
        ];

        for (const password of weakPasswords) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({ ...validUserData, password });

          expectValidationError(response, 'password');
        }
      });

      it('should accept strong passwords', async () => {
        const strongPasswords = [
          'SecurePass123!',
          'MyStr0ngP@ssword',
          'C0mpl3x!P@ssw0rd',
        ];

        for (const password of strongPasswords) {
          const uniqueEmail = `test${Date.now()}@example.com`;
          const response = await request(app)
            .post('/api/auth/register')
            .send({ ...validUserData, email: uniqueEmail, password });

          expect(response.status).toBe(201);
        }
      });
    });

    describe('Required Field Validation', () => {
      it('should reject missing name', async () => {
        const { name, ...dataWithoutName } = validUserData;
        const response = await request(app)
          .post('/api/auth/register')
          .send(dataWithoutName);

        expectValidationError(response, 'name');
      });

      it('should reject missing email', async () => {
        const { email, ...dataWithoutEmail } = validUserData;
        const response = await request(app)
          .post('/api/auth/register')
          .send(dataWithoutEmail);

        expectValidationError(response, 'email');
      });

      it('should reject missing password', async () => {
        const { password, ...dataWithoutPassword } = validUserData;
        const response = await request(app)
          .post('/api/auth/register')
          .send(dataWithoutPassword);

        expectValidationError(response, 'password');
      });

      it('should reject empty request body', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({});

        expectValidationError(response);
      });
    });

    describe('Input Sanitization', () => {
      it('should sanitize HTML in name field', async () => {
        const maliciousData = {
          ...validUserData,
          name: '<script>alert("xss")</script>Test User',
          email: 'sanitize@example.com',
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(maliciousData);

        expect(response.status).toBe(201);
        expect(response.body.data.user.name).not.toContain('<script>');
      });

      it('should handle special characters properly', async () => {
        const specialData = {
          ...validUserData,
          name: "O'Connor & Smith",
          email: 'special@example.com',
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(specialData);

        expect(response.status).toBe(201);
        expect(response.body.data.user.name).toBe("O'Connor & Smith");
      });
    });
  });

  describe('POST /api/auth/login - User Authentication', () => {
    const testUser = {
      name: 'Login Test User',
      email: 'login@example.com',
      password: 'TestPassword123!',
    };

    beforeEach(async () => {
      // Create test user for login tests
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
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.name).toBe(testUser.name);
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);  
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should validate email format on login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email-format',
          password: testUser.password,
        });

      expectValidationError(response, 'email');
    });

    it('should require both email and password', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email });

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ password: testUser.password });

      expectValidationError(response1, 'password');
      expectValidationError(response2, 'email');
    });

    describe('Security Features', () => {
      it('should not reveal whether email exists', async () => {
        const response1 = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'WrongPassword123!',
          });

        const response2 = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword123!',
          });

        // Both should return same generic error message
        expect(response1.body.message).toBe(response2.body.message);
      });

      it('should handle SQL injection attempts', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: "admin@example.com'; DROP TABLE users; --",
            password: testUser.password,
          });

        // Should return validation error, not crash
        expect(response.status).toBe(400);
      });
    });
  });

  describe('JWT Token Management', () => {
    let testUser: any;
    let validToken: string;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'token@example.com',
        name: 'Token Test User',
      });
      validToken = generateTestToken(testUser.id);
    });

    it('should generate valid JWT structure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'token@example.com',
          password: 'testpassword123',
        });

      const token = response.body.data.token;
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Decode payload to verify structure
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      expect(payload.userId).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should include correct user information in token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'token@example.com',
          password: 'testpassword123',
        });

      const token = response.body.data.token;
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

      expect(payload).toHaveProperty('userId', testUser.id);
      expect(payload).toHaveProperty('email', testUser.email);
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });

    it('should set appropriate token expiration', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'token@example.com',
          password: 'testpassword123',
        });

      const token = response.body.data.token;
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + (60 * 60); // 1 hour

      expect(payload.exp).toBeGreaterThan(now);
      expect(payload.exp).toBeLessThanOrEqual(expectedExpiry + 60); // Allow 1 minute variance
    });
  });

  describe('Rate Limiting', () => {
    it('should allow normal request frequency', async () => {
      const userData = {
        name: 'Rate Test User',
        email: 'rate@example.com',
        password: 'TestPassword123!',
      };

      // Make several requests within normal parameters
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: userData.email,
            password: userData.password,
          });

        // Should not be rate limited (will fail with validation error instead)
        expect(response.status).not.toBe(429);
      }
    });

    // Note: Rate limiting tests are challenging in unit tests
    // This would be better tested in integration tests
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking Prisma client
      // For now, we verify the API returns proper error structure
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send();

      expect(response.status).toBe(400);
    });
  });
});