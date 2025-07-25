import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createTestUser, cleanupTestData } from '../helpers/testHelpers';

const prisma = new PrismaClient();

describe('Authentication Database Operations', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('User Creation', () => {
    it('should create a user in test database', async () => {
      const user = await createTestUser({
        email: 'dbtest@example.com',
        name: 'DB Test User',
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('dbtest@example.com');
      expect(user.name).toBe('DB Test User');
      expect(user.id).toBeDefined();
      expect(user.password).toBeDefined();
    });

    it('should hash password correctly', async () => {
      const user = await createTestUser({
        email: 'hashtest@example.com',
      });

      // Password should be hashed, not plain text
      expect(user.password).not.toBe('testpassword123');
      expect(user.password.length).toBeGreaterThan(50); // bcrypt hashes are long

      // Should be able to verify the password
      const isValid = await bcrypt.compare('testpassword123', user.password);
      expect(isValid).toBe(true);
    });

    it('should enforce unique email constraint', async () => {
      // Create first user
      await createTestUser({
        email: 'unique@example.com',
      });

      // Try to create second user with same email
      await expect(
        createTestUser({
          email: 'unique@example.com',
        })
      ).rejects.toThrow();
    });
  });

  describe('User Queries', () => {
    beforeEach(async () => {
      // Create test users for query tests
      await createTestUser({
        email: 'query1@example.com',
        name: 'Query User 1',
      });
      await createTestUser({
        email: 'query2@example.com',
        name: 'Query User 2',
      });
    });

    it('should find user by email', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'query1@example.com' },
      });

      expect(user).toBeDefined();
      expect(user!.email).toBe('query1@example.com');
      expect(user!.name).toBe('Query User 1');
    });

    it('should return null for non-existent email', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'nonexistent@example.com' },
      });

      expect(user).toBeNull();
    });

    it('should list all users', async () => {
      const users = await prisma.user.findMany();

      expect(users).toHaveLength(2);
      expect(users.map(u => u.email)).toContain('query1@example.com');
      expect(users.map(u => u.email)).toContain('query2@example.com');
    });
  });

  describe('Database Cleanup', () => {
    it('should clean up test data between tests', async () => {
      // This test verifies that afterEach cleanup is working
      const usersBefore = await prisma.user.findMany();
      expect(usersBefore).toHaveLength(0);

      // Create a user
      await createTestUser({ email: 'cleanup@example.com' });

      const usersAfter = await prisma.user.findMany();
      expect(usersAfter).toHaveLength(1);

      // Cleanup happens automatically in afterEach
    });
  });
});