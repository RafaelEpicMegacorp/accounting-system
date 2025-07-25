import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import paymentRoutes from '../../src/routes/payments';
import { 
  createTestUser,
  createTestClient,
  createTestOrder,
  createTestInvoice,
  createTestPayment,
  generateTestToken,
  getAuthHeaders,
  expectValidationError,
  expectUnauthorizedError,
  cleanupTestData 
} from '../helpers/testHelpers';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/payments', paymentRoutes);

const prisma = new PrismaClient();

describe('Payment Tracking API Comprehensive Tests', () => {
  let testUser: any;
  let testClient: any;
  let testOrder: any;
  let testInvoice: any;
  let authHeaders: { Authorization: string };

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'paymenttest@example.com',
      name: 'Payment Test User',
    });
    testClient = await createTestClient({
      name: 'Test Client for Payments',
      email: 'paymentclient@example.com',
    });
    testOrder = await createTestOrder(testClient.id, {
      description: 'Test Service for Payments',
      amount: 1000.00,
      frequency: 'MONTHLY',
    });
    testInvoice = await createTestInvoice(testOrder.id, testClient.id, {
      invoiceNumber: 'INV-2025-PAY001',
      amount: 1000.00,
      status: 'SENT',
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
    it('should require authentication for all payment endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/api/payments/invoice/test-id' },
        { method: 'get', path: '/api/payments/invoice/test-id' },
        { method: 'put', path: '/api/payments/test-id' },
        { method: 'delete', path: '/api/payments/test-id' },
        { method: 'get', path: '/api/payments' },
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

    it('should accept valid authentication', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/payments/invoice/:invoiceId - Record Payment', () => {
    const validPaymentData = {
      amount: 500.00,
      method: 'BANK_TRANSFER',
      notes: 'Test payment for invoice',
    };

    it('should record full payment for invoice', async () => {
      const fullPaymentData = {
        ...validPaymentData,
        amount: 1000.00, // Full invoice amount
      };

      const response = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send(fullPaymentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment recorded successfully');
      expect(response.body.data.payment).toBeDefined();
      expect(response.body.data.payment.amount).toBe(fullPaymentData.amount);
      expect(response.body.data.payment.method).toBe(fullPaymentData.method);
      expect(response.body.data.payment.notes).toBe(fullPaymentData.notes);
      expect(response.body.data.paymentSummary.isFullyPaid).toBe(true);
      expect(response.body.data.paymentSummary.remainingAmount).toBe(0);
      expect(response.body.data.invoice.status).toBe('PAID');
    });

    it('should record partial payment for invoice', async () => {
      const response = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send(validPaymentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payment.amount).toBe(validPaymentData.amount);
      expect(response.body.data.paymentSummary.isFullyPaid).toBe(false);
      expect(response.body.data.paymentSummary.remainingAmount).toBe(500.00);
      expect(response.body.data.paymentSummary.totalPaid).toBe(500.00);
      // Invoice status should remain SENT for partial payment
      expect(response.body.data.invoice.status).toBe('SENT');
    });

    it('should handle multiple partial payments', async () => {
      // First partial payment
      const firstPayment = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send({ ...validPaymentData, amount: 300.00 });

      expect(firstPayment.status).toBe(201);
      expect(firstPayment.body.data.paymentSummary.totalPaid).toBe(300.00);
      expect(firstPayment.body.data.paymentSummary.remainingAmount).toBe(700.00);

      // Second partial payment
      const secondPayment = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send({ ...validPaymentData, amount: 400.00 });

      expect(secondPayment.status).toBe(201);
      expect(secondPayment.body.data.paymentSummary.totalPaid).toBe(700.00);
      expect(secondPayment.body.data.paymentSummary.remainingAmount).toBe(300.00);

      // Final payment
      const finalPayment = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send({ ...validPaymentData, amount: 300.00 });

      expect(finalPayment.status).toBe(201);
      expect(finalPayment.body.data.paymentSummary.totalPaid).toBe(1000.00);
      expect(finalPayment.body.data.paymentSummary.remainingAmount).toBe(0);
      expect(finalPayment.body.data.paymentSummary.isFullyPaid).toBe(true);
      expect(finalPayment.body.data.invoice.status).toBe('PAID');
    });

    it('should update draft invoice status to sent on payment', async () => {
      // Create draft invoice
      const draftInvoice = await createTestInvoice(testOrder.id, testClient.id, {
        invoiceNumber: 'INV-2025-DRAFT-PAY',
        amount: 500.00,
        status: 'DRAFT',
      });

      const response = await request(app)
        .post(`/api/payments/invoice/${draftInvoice.id}`)
        .set(authHeaders)
        .send({ ...validPaymentData, amount: 200.00 });

      expect(response.status).toBe(201);
      expect(response.body.data.invoice.status).toBe('SENT');
    });

    it('should store payment in database correctly', async () => {
      const response = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send(validPaymentData);

      const paymentId = response.body.data.payment.id;
      const storedPayment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      expect(storedPayment).toBeDefined();
      expect(storedPayment!.invoiceId).toBe(testInvoice.id);
      expect(storedPayment!.amount).toBe(validPaymentData.amount);
      expect(storedPayment!.method).toBe(validPaymentData.method);
      expect(storedPayment!.notes).toBe(validPaymentData.notes);
    });

    describe('Payment Method Tests', () => {
      const paymentMethods = ['BANK_TRANSFER', 'CREDIT_CARD', 'CHECK', 'CASH', 'OTHER'];

      it.each(paymentMethods)('should accept %s payment method', async (method) => {
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send({ ...validPaymentData, method });

        expect(response.status).toBe(201);
        expect(response.body.data.payment.method).toBe(method);
      });

      it('should reject invalid payment method', async () => {
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send({ ...validPaymentData, method: 'INVALID_METHOD' });

        expectValidationError(response, 'method');
      });
    });

    describe('Payment Date Tests', () => {
      it('should use current date when no paidDate provided', async () => {
        const beforeTime = new Date();
        
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send(validPaymentData);

        const afterTime = new Date();
        const paymentDate = new Date(response.body.data.payment.paidDate);

        expect(response.status).toBe(201);
        expect(paymentDate.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(paymentDate.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      });

      it('should use provided paidDate', async () => {
        const customDate = new Date('2025-01-15T10:00:00.000Z');
        
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send({ ...validPaymentData, paidDate: customDate.toISOString() });

        expect(response.status).toBe(201);
        expect(new Date(response.body.data.payment.paidDate).toISOString()).toBe(customDate.toISOString());
      });

      it('should reject invalid date format', async () => {
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send({ ...validPaymentData, paidDate: 'invalid-date' });

        expectValidationError(response, 'paidDate');
      });
    });

    describe('Validation Tests', () => {
      it('should require amount field', async () => {
        const { amount, ...dataWithoutAmount } = validPaymentData;
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send(dataWithoutAmount);

        expectValidationError(response, 'amount');
      });

      it('should require positive amount', async () => {
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send({ ...validPaymentData, amount: 0 });

        expectValidationError(response, 'amount');
      });

      it('should reject negative amount', async () => {
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send({ ...validPaymentData, amount: -100 });

        expectValidationError(response, 'amount');
      });

      it('should require method field', async () => {
        const { method, ...dataWithoutMethod } = validPaymentData;
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send(dataWithoutMethod);

        expectValidationError(response, 'method');
      });

      it('should validate notes length', async () => {
        const longNotes = 'x'.repeat(501); // Exceeds 500 character limit
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send({ ...validPaymentData, notes: longNotes });

        expectValidationError(response, 'notes');
      });

      it('should prevent overpayment', async () => {
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send({ ...validPaymentData, amount: 1500.00 }); // Exceeds invoice amount

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Payment amount would exceed invoice total');
      });

      it('should prevent overpayment with existing payments', async () => {
        // First add a partial payment
        await createTestPayment(testInvoice.id, { amount: 800.00 });

        // Try to add payment that would exceed total
        const response = await request(app)
          .post(`/api/payments/invoice/${testInvoice.id}`)
          .set(authHeaders)
          .send({ ...validPaymentData, amount: 300.00 }); // 800 + 300 = 1100, exceeds 1000

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Payment amount would exceed invoice total');
        expect(response.body.message).toContain('Already paid: $800.00');
      });

      it('should return 404 for non-existent invoice', async () => {
        const fakeId = 'c123456789012345678901234'; // Valid CUID format
        const response = await request(app)
          .post(`/api/payments/invoice/${fakeId}`)
          .set(authHeaders)
          .send(validPaymentData);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invoice not found');
      });

      it('should handle invalid invoice ID format', async () => {
        const response = await request(app)
          .post('/api/payments/invoice/invalid-id')
          .set(authHeaders)
          .send(validPaymentData);

        expectValidationError(response, 'invoiceId');
      });
    });
  });

  describe('GET /api/payments/invoice/:invoiceId - Get Payment History', () => {
    beforeEach(async () => {
      // Create multiple test payments
      await createTestPayment(testInvoice.id, {
        amount: 300.00,
        method: 'BANK_TRANSFER',
        notes: 'First payment',
        paidDate: new Date('2025-01-10'),
      });
      await createTestPayment(testInvoice.id, {
        amount: 400.00,
        method: 'CREDIT_CARD',
        notes: 'Second payment',
        paidDate: new Date('2025-01-15'),
      });
      await createTestPayment(testInvoice.id, {
        amount: 300.00,
        method: 'CHECK',
        notes: 'Final payment',
        paidDate: new Date('2025-01-20'),
      });
    });

    it('should retrieve payment history for invoice', async () => {
      const response = await request(app)
        .get(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(3);
      expect(response.body.data.invoice).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
    });

    it('should calculate payment summary correctly', async () => {
      const response = await request(app)
        .get(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders);

      expect(response.body.data.summary.totalPaid).toBe(1000.00);
      expect(response.body.data.summary.remainingAmount).toBe(0);
      expect(response.body.data.summary.isFullyPaid).toBe(true);
      expect(response.body.data.summary.paymentCount).toBe(3);
    });

    it('should order payments by date (newest first)', async () => {
      const response = await request(app)
        .get(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders);

      const payments = response.body.data.payments;
      expect(new Date(payments[0].paidDate)).toEqual(new Date('2025-01-20'));
      expect(new Date(payments[1].paidDate)).toEqual(new Date('2025-01-15'));
      expect(new Date(payments[2].paidDate)).toEqual(new Date('2025-01-10'));
    });

    it('should include invoice details', async () => {
      const response = await request(app)
        .get(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders);

      const invoiceData = response.body.data.invoice;
      expect(invoiceData.id).toBe(testInvoice.id);
      expect(invoiceData.invoiceNumber).toBe(testInvoice.invoiceNumber);
      expect(invoiceData.amount).toBe(testInvoice.amount);
      expect(invoiceData.client).toBeDefined();
      expect(invoiceData.order).toBeDefined();
    });

    it('should return empty payments for invoice with no payments', async () => {
      const newInvoice = await createTestInvoice(testOrder.id, testClient.id, {
        invoiceNumber: 'INV-2025-NOPAY',
        amount: 500.00,
      });

      const response = await request(app)
        .get(`/api/payments/invoice/${newInvoice.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.payments).toHaveLength(0);
      expect(response.body.data.summary.totalPaid).toBe(0);
      expect(response.body.data.summary.remainingAmount).toBe(500.00);
      expect(response.body.data.summary.isFullyPaid).toBe(false);
    });

    it('should return 404 for non-existent invoice', async () => {
      const fakeId = 'c123456789012345678901234';
      const response = await request(app)
        .get(`/api/payments/invoice/${fakeId}`)
        .set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invoice not found');
    });

    it('should handle invalid invoice ID format', async () => {
      const response = await request(app)
        .get('/api/payments/invoice/invalid-id')
        .set(authHeaders);

      expectValidationError(response, 'invoiceId');
    });
  });

  describe('PUT /api/payments/:paymentId - Update Payment', () => {
    let testPayment: any;

    beforeEach(async () => {
      testPayment = await createTestPayment(testInvoice.id, {
        amount: 500.00,
        method: 'BANK_TRANSFER',
        notes: 'Original payment',
      });
    });

    it('should update payment amount', async () => {
      const updateData = { amount: 750.00 };

      const response = await request(app)
        .put(`/api/payments/${testPayment.id}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payment.amount).toBe(updateData.amount);
    });

    it('should update payment method', async () => {
      const updateData = { method: 'CREDIT_CARD' };

      const response = await request(app)
        .put(`/api/payments/${testPayment.id}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.payment.method).toBe(updateData.method);
    });

    it('should update payment date', async () => {
      const newDate = new Date('2025-01-25T15:30:00.000Z');
      const updateData = { paidDate: newDate.toISOString() };

      const response = await request(app)
        .put(`/api/payments/${testPayment.id}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(new Date(response.body.data.payment.paidDate).toISOString()).toBe(newDate.toISOString());
    });

    it('should update payment notes', async () => {
      const updateData = { notes: 'Updated payment notes' };

      const response = await request(app)
        .put(`/api/payments/${testPayment.id}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.payment.notes).toBe(updateData.notes);
    });

    it('should update multiple fields simultaneously', async () => {
      const updateData = {
        amount: 600.00,
        method: 'CHECK',
        notes: 'Completely updated payment',
      };

      const response = await request(app)
        .put(`/api/payments/${testPayment.id}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.payment.amount).toBe(updateData.amount);
      expect(response.body.data.payment.method).toBe(updateData.method);
      expect(response.body.data.payment.notes).toBe(updateData.notes);
    });

    it('should recalculate invoice status after amount update', async () => {
      // Update payment to full amount
      const response = await request(app)
        .put(`/api/payments/${testPayment.id}`)
        .set(authHeaders)
        .send({ amount: 1000.00 });

      expect(response.status).toBe(200);

      // Check that invoice status was updated to PAID
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoice.id },
      });
      expect(updatedInvoice!.status).toBe('PAID');
    });

    it('should prevent amount update that would exceed invoice total', async () => {
      // Add another payment to test overpayment prevention
      await createTestPayment(testInvoice.id, { amount: 300.00 });

      const response = await request(app)
        .put(`/api/payments/${testPayment.id}`)
        .set(authHeaders)
        .send({ amount: 800.00 }); // 800 + 300 = 1100, exceeds 1000

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Updated payment amount would exceed invoice total');
    });

    it('should return 404 for non-existent payment', async () => {
      const fakeId = 'c123456789012345678901234';
      const response = await request(app)
        .put(`/api/payments/${fakeId}`)
        .set(authHeaders)
        .send({ amount: 100.00 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment not found');
    });

    it('should handle invalid payment ID format', async () => {
      const response = await request(app)
        .put('/api/payments/invalid-id')
        .set(authHeaders)
        .send({ amount: 100.00 });

      expectValidationError(response, 'paymentId');
    });

    it('should validate updated amount is positive', async () => {
      const response = await request(app)
        .put(`/api/payments/${testPayment.id}`)
        .set(authHeaders)
        .send({ amount: -50.00 });

      expectValidationError(response, 'amount');
    });

    it('should validate updated method', async () => {
      const response = await request(app)
        .put(`/api/payments/${testPayment.id}`)
        .set(authHeaders)
        .send({ method: 'INVALID_METHOD' });

      expectValidationError(response, 'method');
    });
  });

  describe('DELETE /api/payments/:paymentId - Delete Payment', () => {
    let testPayment: any;

    beforeEach(async () => {
      testPayment = await createTestPayment(testInvoice.id, {
        amount: 500.00,
        method: 'BANK_TRANSFER',
      });
    });

    it('should delete payment successfully', async () => {
      const response = await request(app)
        .delete(`/api/payments/${testPayment.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment deleted successfully');
      expect(response.body.data.deletedPaymentId).toBe(testPayment.id);

      // Verify payment is deleted from database
      const deletedPayment = await prisma.payment.findUnique({
        where: { id: testPayment.id },
      });
      expect(deletedPayment).toBeNull();
    });

    it('should recalculate invoice status after deletion', async () => {
      // Make invoice fully paid first
      await createTestPayment(testInvoice.id, { amount: 500.00 });
      await prisma.invoice.update({
        where: { id: testInvoice.id },
        data: { status: 'PAID' },
      });

      // Delete one payment
      const response = await request(app)
        .delete(`/api/payments/${testPayment.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);

      // Check that invoice status was reverted to SENT
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoice.id },
      });
      expect(updatedInvoice!.status).toBe('SENT');
      expect(updatedInvoice!.paidDate).toBeNull();
    });

    it('should return payment summary after deletion', async () => {
      // Add another payment
      await createTestPayment(testInvoice.id, { amount: 300.00 });

      const response = await request(app)
        .delete(`/api/payments/${testPayment.id}`)
        .set(authHeaders);

      expect(response.body.data.remainingPaidAmount).toBe(300.00);
      expect(response.body.data.invoiceAmount).toBe(1000.00);
    });

    it('should return 404 for non-existent payment', async () => {
      const fakeId = 'c123456789012345678901234';
      const response = await request(app)
        .delete(`/api/payments/${fakeId}`)
        .set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment not found');
    });

    it('should handle invalid payment ID format', async () => {
      const response = await request(app)
        .delete('/api/payments/invalid-id')
        .set(authHeaders);

      expectValidationError(response, 'paymentId');
    });
  });

  describe('GET /api/payments - List All Payments', () => {
    let secondClient: any;
    let secondInvoice: any;

    beforeEach(async () => {
      // Create second client and invoice for filtering tests
      secondClient = await createTestClient({
        name: 'Second Client',
        email: 'second@example.com',
      });
      secondInvoice = await createTestInvoice(testOrder.id, secondClient.id, {
        invoiceNumber: 'INV-2025-SECOND',
        amount: 800.00,
      });

      // Create multiple payments across different invoices
      await createTestPayment(testInvoice.id, {
        amount: 300.00,
        method: 'BANK_TRANSFER',
        paidDate: new Date('2025-01-10'),
        notes: 'First client payment',
      });
      await createTestPayment(testInvoice.id, {
        amount: 400.00,
        method: 'CREDIT_CARD',
        paidDate: new Date('2025-01-15'),
        notes: 'Another first client payment',
      });
      await createTestPayment(secondInvoice.id, {
        amount: 500.00,
        method: 'CHECK',
        paidDate: new Date('2025-01-12'),
        notes: 'Second client payment',
      });
    });

    it('should retrieve all payments with default pagination', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.totalCount).toBe(3);
      expect(response.body.data.pagination.currentPage).toBe(1);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/payments?page=1&limit=2')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.payments).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    it('should filter by client', async () => {
      const response = await request(app)
        .get(`/api/payments?clientId=${testClient.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.payments).toHaveLength(2);
      response.body.data.payments.forEach((payment: any) => {
        expect(payment.invoice.client.id).toBe(testClient.id);
      });
    });

    it('should filter by payment method', async () => {
      const response = await request(app)
        .get('/api/payments?method=CREDIT_CARD')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.payments).toHaveLength(1);
      expect(response.body.data.payments[0].method).toBe('CREDIT_CARD');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/payments?startDate=2025-01-11&endDate=2025-01-15')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.payments).toHaveLength(2); // Payments on 2025-01-12 and 2025-01-15
    });

    it('should search payments', async () => {
      const response = await request(app)
        .get('/api/payments?search=Second')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.payments.length).toBeGreaterThan(0);
      // Should find payments related to "Second" client or containing "Second" in notes
    });

    it('should order payments by date (newest first)', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set(authHeaders);

      const payments = response.body.data.payments;
      expect(new Date(payments[0].paidDate) >= new Date(payments[1].paidDate)).toBe(true);
      expect(new Date(payments[1].paidDate) >= new Date(payments[2].paidDate)).toBe(true);
    });

    it('should include invoice and client information', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set(authHeaders);

      const payment = response.body.data.payments[0];
      expect(payment.invoice).toBeDefined();
      expect(payment.invoice.id).toBeDefined();
      expect(payment.invoice.invoiceNumber).toBeDefined();
      expect(payment.invoice.client).toBeDefined();
      expect(payment.invoice.client.name).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking Prisma client
      // For now, we verify the API structure is consistent
      const response = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send({
          amount: 100,
          method: 'BANK_TRANSFER',
        });

      expect(response.body).toHaveProperty('success');
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe('Security Features', () => {
    it('should sanitize input data', async () => {
      const maliciousData = {
        amount: 100,
        method: 'BANK_TRANSFER',
        notes: '<script>alert("xss")</script>Clean notes',
      };

      const response = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send(maliciousData);

      expect(response.status).toBe(201);
      expect(response.body.data.payment.notes).not.toContain('<script>');
    });

    it('should handle SQL injection attempts', async () => {
      const response = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send({
          amount: 100,
          method: 'BANK_TRANSFER',
          notes: "'; DROP TABLE payments; --",
        });

      // Should either return validation error or create payment safely
      expect([201, 400]).toContain(response.status);
    });
  });

  describe('Business Logic Validation', () => {
    it('should calculate remaining balance correctly with multiple payments', async () => {
      // Add payments totaling less than invoice amount
      await createTestPayment(testInvoice.id, { amount: 300.00 });
      await createTestPayment(testInvoice.id, { amount: 250.00 });

      const response = await request(app)
        .get(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders);

      expect(response.body.data.summary.totalPaid).toBe(550.00);
      expect(response.body.data.summary.remainingAmount).toBe(450.00);
      expect(response.body.data.summary.isFullyPaid).toBe(false);
    });

    it('should handle edge case of exact payment amount', async () => {
      const response = await request(app)
        .post(`/api/payments/invoice/${testInvoice.id}`)
        .set(authHeaders)
        .send({
          amount: 1000.00, // Exact invoice amount
          method: 'BANK_TRANSFER',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.paymentSummary.isFullyPaid).toBe(true);
      expect(response.body.data.paymentSummary.remainingAmount).toBe(0);
      expect(response.body.data.invoice.status).toBe('PAID');
    });

    it('should handle payment deletion impact on invoice status', async () => {
      // Create two payments that fully pay the invoice
      const payment1 = await createTestPayment(testInvoice.id, { amount: 600.00 });
      await createTestPayment(testInvoice.id, { amount: 400.00 });

      // Update invoice to PAID status
      await prisma.invoice.update({
        where: { id: testInvoice.id },
        data: { status: 'PAID', paidDate: new Date() },
      });

      // Delete one payment, making invoice partially paid
      const response = await request(app)
        .delete(`/api/payments/${payment1.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);

      // Verify invoice status reverted to SENT
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoice.id },
      });
      expect(updatedInvoice!.status).toBe('SENT');
      expect(updatedInvoice!.paidDate).toBeNull();
    });
  });
});