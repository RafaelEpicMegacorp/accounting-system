import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const prisma = new PrismaClient();

// Test data factories
export const createTestUser = async (userData: Partial<any> = {}) => {
  const hashedPassword = await bcrypt.hash('testpassword123', 10);
  
  return await prisma.user.create({
    data: {
      email: userData.email || 'test@example.com',
      password: hashedPassword,
      name: userData.name || 'Test User',
      ...userData,
    },
  });
};

export const createTestClient = async (clientData: Partial<any> = {}) => {
  return await prisma.client.create({
    data: {
      name: clientData.name || 'Test Client',
      email: clientData.email || 'client@example.com',
      company: clientData.company || 'Test Company',
      phone: clientData.phone || '+1234567890',
      address: clientData.address || '123 Test Street',
      ...clientData,
    },
  });
};

export const createTestOrder = async (orderId: string, orderData: Partial<any> = {}) => {
  return await prisma.order.create({
    data: {
      clientId: orderId,
      description: orderData.description || 'Test Service',
      amount: orderData.amount || 100.00,
      frequency: orderData.frequency || 'MONTHLY',
      status: orderData.status || 'ACTIVE',
      startDate: orderData.startDate || new Date(),
      nextInvoiceDate: orderData.nextInvoiceDate || new Date(),
      ...orderData,
    },
  });
};

export const createTestInvoice = async (orderId: string, clientId: string, invoiceData: Partial<any> = {}) => {
  return await prisma.invoice.create({
    data: {
      orderId,
      clientId,
      invoiceNumber: invoiceData.invoiceNumber || 'INV-2025-000001',
      amount: invoiceData.amount || 100.00,
      issueDate: invoiceData.issueDate || new Date(),
      dueDate: invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: invoiceData.status || 'DRAFT',
      ...invoiceData,
    },
  });
};

export const createTestPayment = async (invoiceId: string, paymentData: Partial<any> = {}) => {
  return await prisma.payment.create({
    data: {
      invoiceId,
      amount: paymentData.amount || 50.00,
      method: paymentData.method || 'BANK_TRANSFER',
      paidDate: paymentData.paidDate || new Date(),
      notes: paymentData.notes || 'Test payment',
      ...paymentData,
    },
  });
};

// Authentication helpers
export const generateTestToken = (userId: string): string => {
  return jwt.sign(
    { userId, email: 'test@example.com' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

export const getAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

// API testing helpers
export const expectValidationError = (response: any, field?: string) => {
  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Validation failed');
  expect(response.body.errors).toBeDefined();
  if (field) {
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          // Handle both formats: custom format uses 'field', express-validator uses 'path'
          [response.body.errors[0].field ? 'field' : 'path']: field,
          [response.body.errors[0].message ? 'message' : 'msg']: expect.any(String)
        })
      ])
    );
  }
};

export const expectUnauthorizedError = (response: any) => {
  expect(response.status).toBe(401);
  expect(response.body.message).toContain('Access denied');
};

export const expectNotFoundError = (response: any, resource?: string) => {
  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);
  if (resource) {
    expect(response.body.message).toContain(`${resource} not found`);
  }
};

// Date helpers
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

// Database setup and cleanup helpers
export const createTestDatabase = async () => {
  // In a real scenario, this might reset migrations or seed test data
  // For now, we'll just ensure we have a clean state
  console.log('🧪 Setting up test environment...');
};

export const cleanupTestDatabase = async () => {
  console.log('🧹 Cleaning up test environment...');
  await cleanupTestData();
};

export const cleanupTestData = async () => {
  await prisma.payment.deleteMany({});
  await prisma.paymentReminder.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({});
};

// Authentication helper for integration tests
export const authenticateTestUser = async () => {
  const testUser = await createTestUser({
    email: 'integration-test@example.com',
    name: 'Integration Test User'
  });

  const token = generateTestToken(testUser.id);
  const authHeaders = getAuthHeaders(token);

  return { testUser, token, authHeaders };
};

// Mock email service for testing
export const mockEmailService = {
  sendInvoiceEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
  sendPaymentReminderEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-reminder-id' }),
  testEmailConfiguration: jest.fn().mockResolvedValue(true),
};

// Mock PDF service for testing
export const mockPDFService = {
  generateInvoicePDF: jest.fn().mockResolvedValue(Buffer.from('fake-pdf-content')),
  ensureStorageDirectory: jest.fn().mockResolvedValue(undefined),
};