import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { authenticateToken } from '../middleware/auth';
import { 
  validateInvoiceCreation, 
  handleValidationErrors,
  sanitizeInput 
} from '../middleware/validation';
import { 
  generateInvoiceNumber,
  calculateInvoiceDueDate,
  canGenerateInvoiceFromOrder
} from '../utils/invoiceUtils';
import { PDFService } from '../services/pdfService';
import { emailService } from '../services/emailService';

const router = Router();

// All invoice routes require authentication
router.use(authenticateToken);

/**
 * GET /api/invoices
 * List all invoices with filtering, search, and pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const search = req.query.search as string || '';
    const clientId = req.query.clientId as string;
    const orderId = req.query.orderId as string;
    const status = req.query.status as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;

    // Build filter conditions
    const whereConditions: any = {};

    // Search in invoice number, client name, or order description
    if (search) {
      whereConditions.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { client: { email: { contains: search, mode: 'insensitive' } } },
        { order: { description: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Filter by client
    if (clientId) {
      whereConditions.clientId = clientId;
    }

    // Filter by order
    if (orderId) {
      whereConditions.orderId = orderId;
    }

    // Filter by status
    if (status && ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].includes(status)) {
      whereConditions.status = status;
    }

    // Valid sort fields
    const validSortFields = ['createdAt', 'amount', 'issueDate', 'dueDate', 'invoiceNumber'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Get total count
    const totalCount = await prisma.invoice.count({
      where: whereConditions,
    });

    // Get invoices with client and order data
    const invoices = await prisma.invoice.findMany({
      where: whereConditions,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        },
        order: {
          select: {
            id: true,
            description: true,
            frequency: true,
          }
        }
      },
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      message: 'Invoices retrieved successfully',
      data: {
        invoices,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        }
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      message: 'Failed to retrieve invoices',
      error: 'GET_INVOICES_ERROR',
    });
  }
});

/**
 * GET /api/invoices/:id
 * Get single invoice with related data
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid invoice ID',
        error: 'INVALID_INVOICE_ID',
      });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            phone: true,
            address: true,
          }
        },
        order: {
          select: {
            id: true,
            description: true,
            frequency: true,
            status: true,
          }
        }
      },
    });

    if (!invoice) {
      res.status(404).json({
        message: 'Invoice not found',
        error: 'INVOICE_NOT_FOUND',
      });
      return;
    }

    res.json({
      message: 'Invoice retrieved successfully',
      data: { invoice }
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      message: 'Failed to retrieve invoice',
      error: 'GET_INVOICE_ERROR',
    });
  }
});

/**
 * POST /api/invoices
 * Create new invoice manually
 */
router.post('/',
  sanitizeInput,
  validateInvoiceCreation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { clientId, orderId, amount, issueDate, dueDate } = req.body;

      // Check if client exists
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        res.status(404).json({
          message: 'Client not found',
          error: 'CLIENT_NOT_FOUND',
        });
        return;
      }

      // Check if order exists (if provided)
      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          res.status(404).json({
            message: 'Order not found',
            error: 'ORDER_NOT_FOUND',
          });
          return;
        }

        if (order.clientId !== clientId) {
          res.status(400).json({
            message: 'Order does not belong to the specified client',
            error: 'ORDER_CLIENT_MISMATCH',
          });
          return;
        }
      }

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();

      // Create the invoice
      const invoice = await prisma.invoice.create({
        data: {
          clientId,
          orderId: orderId || null,
          invoiceNumber,
          amount: parseFloat(amount),
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          status: 'DRAFT',
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
            }
          },
          order: {
            select: {
              id: true,
              description: true,
              frequency: true,
            }
          }
        },
      });

      res.status(201).json({
        message: 'Invoice created successfully',
        data: { invoice }
      });
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({
        message: 'Failed to create invoice',
        error: 'CREATE_INVOICE_ERROR',
      });
    }
  }
);

/**
 * POST /api/invoices/generate/:orderId
 * Generate invoice from an active order
 */
router.post('/generate/:orderId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({
        message: 'Invalid order ID',
        error: 'INVALID_ORDER_ID',
      });
      return;
    }

    // Get order with client data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
      },
    });

    if (!order) {
      res.status(404).json({
        message: 'Order not found',
        error: 'ORDER_NOT_FOUND',
      });
      return;
    }

    // Check if invoice can be generated from this order
    const canGenerate = await canGenerateInvoiceFromOrder(order);
    if (!canGenerate.allowed) {
      res.status(400).json({
        message: canGenerate.reason,
        error: 'INVOICE_GENERATION_NOT_ALLOWED',
      });
      return;
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate due date (30 days from issue date by default, or use leadTimeDays)
    const issueDate = new Date();
    const dueDate = calculateInvoiceDueDate(issueDate, order.leadTimeDays);

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        clientId: order.clientId,
        orderId: order.id,
        invoiceNumber,
        amount: order.amount,
        issueDate,
        dueDate,
        status: 'DRAFT',
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        },
        order: {
          select: {
            id: true,
            description: true,
            frequency: true,
          }
        }
      },
    });

    res.status(201).json({
      message: 'Invoice generated successfully from order',
      data: { invoice }
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({
      message: 'Failed to generate invoice',
      error: 'GENERATE_INVOICE_ERROR',
    });
  }
});

/**
 * PATCH /api/invoices/:id/status
 * Update invoice status
 */
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid invoice ID',
        error: 'INVALID_INVOICE_ID',
      });
      return;
    }

    if (!status || !['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].includes(status)) {
      res.status(400).json({
        message: 'Invalid status. Must be DRAFT, SENT, PAID, OVERDUE, or CANCELLED',
        error: 'INVALID_STATUS',
      });
      return;
    }

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      res.status(404).json({
        message: 'Invoice not found',
        error: 'INVOICE_NOT_FOUND',
      });
      return;
    }

    // Update status and related fields
    const updateData: any = { status };

    // Set paid date when marking as paid
    if (status === 'PAID' && existingInvoice.status !== 'PAID') {
      updateData.paidDate = new Date();
    }

    // Clear paid date when changing from paid to other status
    if (status !== 'PAID' && existingInvoice.status === 'PAID') {
      updateData.paidDate = null;
    }

    // Set sent date when marking as sent
    if (status === 'SENT' && existingInvoice.status === 'DRAFT') {
      updateData.sentDate = new Date();
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        },
        order: {
          select: {
            id: true,
            description: true,
            frequency: true,
          }
        }
      },
    });

    res.json({
      message: 'Invoice status updated successfully',
      data: { invoice: updatedInvoice }
    });
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({
      message: 'Failed to update invoice status',
      error: 'UPDATE_INVOICE_STATUS_ERROR',
    });
  }
});

/**
 * GET /api/invoices/:id/pdf
 * Generate and download PDF for invoice
 */
router.get('/:id/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid invoice ID',
        error: 'INVALID_INVOICE_ID',
      });
      return;
    }

    // Get invoice with full details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        order: true,
      },
    });

    if (!invoice) {
      res.status(404).json({
        message: 'Invoice not found',
        error: 'INVOICE_NOT_FOUND',
      });
      return;
    }

    // Prepare invoice data for PDF
    const invoiceData = {
      id: invoice.id,
      orderId: invoice.orderId,
      clientId: invoice.clientId,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      sentDate: invoice.sentDate?.toISOString(),
      paidDate: invoice.paidDate?.toISOString(),
      status: invoice.status as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED',
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      client: {
        id: invoice.client.id,
        name: invoice.client.name,
        email: invoice.client.email,
        company: invoice.client.company || undefined,
        phone: invoice.client.phone || undefined,
        address: invoice.client.address || undefined,
      },
      order: {
        id: invoice.order.id,
        description: invoice.order.description,
        frequency: invoice.order.frequency,
        status: invoice.order.status,
      },
    };

    // Get company info
    const companyInfo = PDFService.getDefaultCompanyInfo();

    // Generate PDF
    const pdfBuffer = await PDFService.generateInvoicePDF(invoiceData, companyInfo, {
      paymentTerms: 30,
      paymentInstructions: 'Please pay via bank transfer or check.',
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({
      message: 'Failed to generate PDF',
      error: 'GENERATE_PDF_ERROR',
    });
  }
});

/**
 * POST /api/invoices/:id/send
 * Send invoice via email
 */
router.post('/:id/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid invoice ID',
        error: 'INVALID_INVOICE_ID',
      });
      return;
    }

    // Get invoice with full details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        order: true,
      },
    });

    if (!invoice) {
      res.status(404).json({
        message: 'Invoice not found',
        error: 'INVOICE_NOT_FOUND',
      });
      return;
    }

    // Check if invoice can be sent (should not be draft for sending)
    if (invoice.status === 'CANCELLED') {
      res.status(400).json({
        message: 'Cannot send cancelled invoice',
        error: 'INVOICE_CANCELLED',
      });
      return;
    }

    // Prepare invoice data for email service
    const invoiceData = {
      id: invoice.id,
      orderId: invoice.orderId,
      clientId: invoice.clientId,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      sentDate: invoice.sentDate?.toISOString(),
      paidDate: invoice.paidDate?.toISOString(),
      status: invoice.status as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED',
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      client: {
        id: invoice.client.id,
        name: invoice.client.name,
        email: invoice.client.email,
        company: invoice.client.company || undefined,
        phone: invoice.client.phone || undefined,
        address: invoice.client.address || undefined,
      },
      order: {
        id: invoice.order.id,
        description: invoice.order.description,
        frequency: invoice.order.frequency,
        status: invoice.order.status,
      },
    };

    // Send email
    await emailService.sendInvoiceEmail(invoiceData);

    // Update invoice status to SENT if it was DRAFT
    let updatedInvoice = invoice;
    if (invoice.status === 'DRAFT') {
      updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'SENT',
          sentDate: new Date(),
        },
        include: {
          client: true,
          order: true,
        },
      });
    }

    res.json({
      message: 'Invoice sent successfully via email',
      data: { 
        invoice: updatedInvoice,
        emailSent: true,
        sentTo: invoice.client.email
      }
    });
  } catch (error) {
    console.error('Send invoice email error:', error);
    res.status(500).json({
      message: 'Failed to send invoice email',
      error: 'SEND_INVOICE_EMAIL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/invoices/:id/reminder
 * Send payment reminder email
 */
router.post('/:id/reminder', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reminderType } = req.body;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid invoice ID',
        error: 'INVALID_INVOICE_ID',
      });
      return;
    }

    if (!reminderType || !['before_due', 'due_today', 'overdue'].includes(reminderType)) {
      res.status(400).json({
        message: 'Invalid reminder type. Must be: before_due, due_today, or overdue',
        error: 'INVALID_REMINDER_TYPE',
      });
      return;
    }

    // Get invoice with full details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        order: true,
      },
    });

    if (!invoice) {
      res.status(404).json({
        message: 'Invoice not found',
        error: 'INVOICE_NOT_FOUND',
      });
      return;
    }

    // Only send reminders for SENT or OVERDUE invoices
    if (!['SENT', 'OVERDUE'].includes(invoice.status)) {
      res.status(400).json({
        message: 'Can only send reminders for sent or overdue invoices',
        error: 'INVALID_INVOICE_STATUS_FOR_REMINDER',
      });
      return;
    }

    // Prepare invoice data for email service
    const invoiceData = {
      id: invoice.id,
      orderId: invoice.orderId,
      clientId: invoice.clientId,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      sentDate: invoice.sentDate?.toISOString(),
      paidDate: invoice.paidDate?.toISOString(),
      status: invoice.status as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED',
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      client: {
        id: invoice.client.id,
        name: invoice.client.name,
        email: invoice.client.email,
        company: invoice.client.company || undefined,
        phone: invoice.client.phone || undefined,
        address: invoice.client.address || undefined,
      },
      order: {
        id: invoice.order.id,
        description: invoice.order.description,
        frequency: invoice.order.frequency,
        status: invoice.order.status,
      },
    };

    // Send reminder email
    await emailService.sendPaymentReminderEmail(invoiceData, reminderType);

    res.json({
      message: 'Payment reminder sent successfully',
      data: { 
        invoice: invoice,
        reminderType,
        reminderSent: true,
        sentTo: invoice.client.email
      }
    });
  } catch (error) {
    console.error('Send payment reminder error:', error);
    res.status(500).json({
      message: 'Failed to send payment reminder',
      error: 'SEND_PAYMENT_REMINDER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/invoices/:id
 * Delete invoice (only if status is DRAFT)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid invoice ID',
        error: 'INVALID_INVOICE_ID',
      });
      return;
    }

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      res.status(404).json({
        message: 'Invoice not found',
        error: 'INVOICE_NOT_FOUND',
      });
      return;
    }

    // Only allow deletion of draft invoices
    if (existingInvoice.status !== 'DRAFT') {
      res.status(400).json({
        message: 'Only draft invoices can be deleted. Cancel sent invoices instead.',
        error: 'INVOICE_DELETE_NOT_ALLOWED',
      });
      return;
    }

    // Delete the invoice
    await prisma.invoice.delete({
      where: { id },
    });

    res.json({
      message: 'Invoice deleted successfully',
      data: { deletedInvoiceId: id }
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      message: 'Failed to delete invoice',
      error: 'DELETE_INVOICE_ERROR',
    });
  }
});

export default router;