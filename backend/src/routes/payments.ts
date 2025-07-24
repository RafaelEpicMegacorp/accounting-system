import express, { Request, Response } from 'express';
import { PrismaClient, PaymentMethod } from '@prisma/client';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { sanitizeInput } from '../middleware/validation';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes in this router
router.use(authenticateToken);

/**
 * Record a payment for an invoice
 * POST /api/payments/invoice/:invoiceId
 */
router.post(
  '/invoice/:invoiceId',
  [
    param('invoiceId').matches(/^c[a-z0-9]{24}$/).withMessage('Invalid invoice ID format'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('method')
      .isIn(['BANK_TRANSFER', 'CREDIT_CARD', 'CHECK', 'CASH', 'OTHER'])
      .withMessage('Invalid payment method'),
    body('paidDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid payment date format'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Notes must be a string with maximum 500 characters'),
  ],
  sanitizeInput,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { invoiceId } = req.params;
      const { amount, method, paidDate, notes } = req.body;

      // Get the invoice with current payments
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: true,
          client: true,
          order: true,
        },
      });

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
        return;
      }

      // Calculate total paid amount including this payment
      const currentPaidAmount = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const newTotalPaid = currentPaidAmount + amount;

      // Validate payment amount doesn't exceed invoice amount
      if (newTotalPaid > invoice.amount) {
        res.status(400).json({
          success: false,
          message: `Payment amount would exceed invoice total. Invoice amount: $${invoice.amount.toFixed(2)}, Already paid: $${currentPaidAmount.toFixed(2)}, Maximum additional payment: $${(invoice.amount - currentPaidAmount).toFixed(2)}`,
        });
        return;
      }

      // Record the payment
      const payment = await prisma.payment.create({
        data: {
          invoiceId,
          amount,
          method: method as PaymentMethod,
          paidDate: paidDate ? new Date(paidDate) : new Date(),
          notes,
        },
      });

      // Update invoice status based on payment amount
      let newStatus = invoice.status;
      if (newTotalPaid >= invoice.amount) {
        // Fully paid
        newStatus = 'PAID';
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'PAID',
            paidDate: payment.paidDate,
          },
        });
      } else {
        // Partially paid - keep current status but ensure it's not DRAFT
        if (invoice.status === 'DRAFT') {
          newStatus = 'SENT';
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
              status: 'SENT',
            },
          });
        }
      }

      // Get updated invoice with all payments
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: {
            orderBy: { paidDate: 'desc' },
          },
          client: true,
          order: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: {
          payment,
          invoice: updatedInvoice,
          paymentSummary: {
            totalPaid: newTotalPaid,
            remainingAmount: invoice.amount - newTotalPaid,
            isFullyPaid: newTotalPaid >= invoice.amount,
          },
        },
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while recording payment',
      });
    }
  }
);

/**
 * Get payment history for an invoice
 * GET /api/payments/invoice/:invoiceId
 */
router.get(
  '/invoice/:invoiceId',
  [
    param('invoiceId').matches(/^c[a-z0-9]{24}$/).withMessage('Invalid invoice ID format'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { invoiceId } = req.params;

      // Get invoice with payments
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: {
            orderBy: { paidDate: 'desc' },
          },
          client: {
            select: {
              id: true,
              name: true,
              company: true,
            },
          },
          order: {
            select: {
              id: true,
              description: true,
            },
          },
        },
      });

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
        return;
      }

      // Calculate payment summary
      const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingAmount = invoice.amount - totalPaid;

      res.json({
        success: true,
        data: {
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            status: invoice.status,
            client: invoice.client,
            order: invoice.order,
          },
          payments: invoice.payments,
          summary: {
            totalPaid,
            remainingAmount,
            isFullyPaid: totalPaid >= invoice.amount,
            paymentCount: invoice.payments.length,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching payment history:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching payment history',
      });
    }
  }
);

/**
 * Update a payment record
 * PUT /api/payments/:paymentId
 */
router.put(
  '/:paymentId',
  [
    param('paymentId').matches(/^c[a-z0-9]{24}$/).withMessage('Invalid payment ID format'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('method')
      .optional()
      .isIn(['BANK_TRANSFER', 'CREDIT_CARD', 'CHECK', 'CASH', 'OTHER'])
      .withMessage('Invalid payment method'),
    body('paidDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid payment date format'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Notes must be a string with maximum 500 characters'),
  ],
  sanitizeInput,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { paymentId } = req.params;
      const { amount, method, paidDate, notes } = req.body;

      // Get the current payment
      const currentPayment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          invoice: {
            include: {
              payments: true,
            },
          },
        },
      });

      if (!currentPayment) {
        res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
        return;
      }

      // If amount is being changed, validate the new total doesn't exceed invoice amount
      if (amount !== undefined && amount !== currentPayment.amount) {
        const otherPaymentsTotal = currentPayment.invoice.payments
          .filter(p => p.id !== paymentId)
          .reduce((sum, payment) => sum + payment.amount, 0);
        
        const newTotalPaid = otherPaymentsTotal + amount;

        if (newTotalPaid > currentPayment.invoice.amount) {
          res.status(400).json({
            success: false,
            message: `Updated payment amount would exceed invoice total. Invoice amount: $${currentPayment.invoice.amount.toFixed(2)}, Other payments total: $${otherPaymentsTotal.toFixed(2)}, Maximum payment amount: $${(currentPayment.invoice.amount - otherPaymentsTotal).toFixed(2)}`,
          });
          return;
        }
      }

      // Update the payment
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          ...(amount !== undefined && { amount }),
          ...(method && { method: method as PaymentMethod }),
          ...(paidDate && { paidDate: new Date(paidDate) }),
          ...(notes !== undefined && { notes }),
        },
      });

      // Recalculate invoice status
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: currentPayment.invoiceId },
        include: {
          payments: true,
        },
      });

      if (updatedInvoice) {
        const totalPaid = updatedInvoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const shouldBePaid = totalPaid >= updatedInvoice.amount;
        
        if (shouldBePaid && updatedInvoice.status !== 'PAID') {
          await prisma.invoice.update({
            where: { id: currentPayment.invoiceId },
            data: {
              status: 'PAID',
              paidDate: updatedPayment.paidDate,
            },
          });
        } else if (!shouldBePaid && updatedInvoice.status === 'PAID') {
          // If partially paid, revert to SENT status
          await prisma.invoice.update({
            where: { id: currentPayment.invoiceId },
            data: {
              status: 'SENT',
              paidDate: null,
            },
          });
        }
      }

      res.json({
        success: true,
        message: 'Payment updated successfully',
        data: {
          payment: updatedPayment,
        },
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating payment',
      });
    }
  }
);

/**
 * Delete a payment record
 * DELETE /api/payments/:paymentId
 */
router.delete(
  '/:paymentId',
  [
    param('paymentId').matches(/^c[a-z0-9]{24}$/).withMessage('Invalid payment ID format'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { paymentId } = req.params;

      // Get the payment and invoice info
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          invoice: {
            include: {
              payments: true,
            },
          },
        },
      });

      if (!payment) {
        res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
        return;
      }

      // Delete the payment
      await prisma.payment.delete({
        where: { id: paymentId },
      });

      // Recalculate invoice status after payment deletion
      const remainingPayments = payment.invoice.payments.filter(p => p.id !== paymentId);
      const remainingPaidAmount = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
      
      let newStatus = payment.invoice.status;
      let paidDate = payment.invoice.paidDate;

      if (remainingPaidAmount < payment.invoice.amount && payment.invoice.status === 'PAID') {
        // Invoice is no longer fully paid
        newStatus = 'SENT';
        paidDate = null;
      }

      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: newStatus,
          paidDate,
        },
      });

      res.json({
        success: true,
        message: 'Payment deleted successfully',
        data: {
          deletedPaymentId: paymentId,
          invoiceId: payment.invoiceId,
          remainingPaidAmount,
          invoiceAmount: payment.invoice.amount,
        },
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting payment',
      });
    }
  }
);

/**
 * Get all payments with filtering and pagination
 * GET /api/payments
 */
router.get(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const skip = (page - 1) * limit;
      
      const { clientId, method, startDate, endDate, search } = req.query;

      // Build filter conditions
      const where: any = {};

      if (clientId) {
        where.invoice = {
          clientId: clientId as string,
        };
      }

      if (method) {
        where.method = method as PaymentMethod;
      }

      if (startDate || endDate) {
        where.paidDate = {};
        if (startDate) {
          where.paidDate.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.paidDate.lte = new Date(endDate as string);
        }
      }

      if (search) {
        where.OR = [
          {
            invoice: {
              invoiceNumber: {
                contains: search as string,
                mode: 'insensitive',
              },
            },
          },
          {
            invoice: {
              client: {
                name: {
                  contains: search as string,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            notes: {
              contains: search as string,
              mode: 'insensitive',
            },
          },
        ];
      }

      // Get payments with pagination
      const [payments, totalCount] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                amount: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                    company: true,
                  },
                },
              },
            },
          },
          orderBy: { paidDate: 'desc' },
          skip,
          take: limit,
        }),
        prisma.payment.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching payments',
      });
    }
  }
);

export default router;