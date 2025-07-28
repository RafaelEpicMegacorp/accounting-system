import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { 
  validateInvoiceCreation, 
  handleValidationErrors,
  sanitizeInput 
} from '../middleware/validation';
import { 
  generateInvoiceNumber,
  getInvoiceNumber,
  calculateInvoiceDueDate,
  canGenerateInvoiceFromOrder
} from '../utils/invoiceUtils';
import { PDFService } from '../services/pdfService';
import { emailService } from '../services/emailService';

const router = Router();
const prisma = new PrismaClient();

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

    // Get invoices with client, company and order data
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
        company: {
          select: {
            id: true,
            name: true,
            email: true,
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
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            address: true,
            city: true,
            country: true,
            taxCode: true,
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
      const { clientId, companyId, orderId, amount, currency = 'USD', issueDate, dueDate, notes, invoiceNumber: customInvoiceNumber } = req.body;

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

      // Check if company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        res.status(404).json({
          message: 'Company not found',
          error: 'COMPANY_NOT_FOUND',
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

      // Get invoice number (custom or generated)
      let invoiceNumber;
      try {
        invoiceNumber = await getInvoiceNumber(customInvoiceNumber);
      } catch (error) {
        console.error('Invoice number generation error:', error);
        res.status(400).json({
          message: error instanceof Error ? error.message : 'Invalid invoice number',
          error: 'INVALID_INVOICE_NUMBER',
        });
        return;
      }

      // Create the invoice with conditional include
      let invoice;
      if (orderId) {
        // Create invoice with order relationship
        invoice = await prisma.invoice.create({
          data: {
            clientId,
            companyId,
            orderId,
            invoiceNumber,
            amount: parseFloat(amount),
            currency,
            issueDate: new Date(issueDate),
            dueDate: new Date(dueDate),
            notes,
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
            company: {
              select: {
                id: true,
                name: true,
                email: true,
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
      } else {
        // Create manual invoice without order relationship
        invoice = await prisma.invoice.create({
          data: {
            clientId,
            companyId,
            orderId: null,
            invoiceNumber,
            amount: parseFloat(amount),
            currency,
            issueDate: new Date(issueDate),
            dueDate: new Date(dueDate),
            notes,
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
            company: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
        });
      }

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

    // Get default company (first active company)
    const defaultCompany = await prisma.company.findFirst({
      where: { isActive: true },
    });

    if (!defaultCompany) {
      res.status(400).json({
        message: 'No active company found. Please create a company first.',
        error: 'NO_ACTIVE_COMPANY',
      });
      return;
    }

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        clientId: order.clientId,
        companyId: defaultCompany.id,
        orderId: order.id,
        invoiceNumber,
        amount: order.amount,
        currency: 'USD',
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
        company: {
          select: {
            id: true,
            name: true,
            email: true,
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
 * PUT /api/invoices/:id
 * Update invoice details
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, currency, issueDate, dueDate, notes } = req.body;

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

    // Only allow updates to DRAFT invoices
    if (existingInvoice.status !== 'DRAFT') {
      res.status(400).json({
        message: 'Only draft invoices can be updated',
        error: 'INVOICE_UPDATE_NOT_ALLOWED',
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    
    if (amount !== undefined) {
      if (amount <= 0) {
        res.status(400).json({
          message: 'Amount must be a positive number',
          error: 'INVALID_AMOUNT',
        });
        return;
      }
      updateData.amount = parseFloat(amount);
    }

    if (currency !== undefined) {
      if (!['USD', 'EUR', 'GBP', 'BTC', 'ETH'].includes(currency)) {
        res.status(400).json({
          message: 'Invalid currency. Must be USD, EUR, GBP, BTC, or ETH',
          error: 'INVALID_CURRENCY',
        });
        return;
      }
      updateData.currency = currency;
    }

    if (issueDate !== undefined) {
      updateData.issueDate = new Date(issueDate);
    }

    if (dueDate !== undefined) {
      updateData.dueDate = new Date(dueDate);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update the invoice
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
        company: {
          select: {
            id: true,
            name: true,
            email: true,
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
      message: 'Invoice updated successfully',
      data: { invoice: updatedInvoice }
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      message: 'Failed to update invoice',
      error: 'UPDATE_INVOICE_ERROR',
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
      order: invoice.order ? {
        id: invoice.order.id,
        description: invoice.order.description,
        frequency: invoice.order.frequency,
        status: invoice.order.status,
      } : null,
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
      order: invoice.order ? {
        id: invoice.order.id,
        description: invoice.order.description,
        frequency: invoice.order.frequency,
        status: invoice.order.status,
      } : null,
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
      order: invoice.order ? {
        id: invoice.order.id,
        description: invoice.order.description,
        frequency: invoice.order.frequency,
        status: invoice.order.status,
      } : null,
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

/**
 * GET /api/invoices/:id/payments
 * Get payment history for an invoice (alias route)
 */
router.get('/:id/payments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid invoice ID',
        error: 'INVALID_INVOICE_ID',
      });
      return;
    }

    // Get invoice with payments
    const invoice = await prisma.invoice.findUnique({
      where: { id },
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
        message: 'Invoice not found',
        error: 'INVOICE_NOT_FOUND',
      });
      return;
    }

    // Calculate payment summary
    const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = invoice.amount - totalPaid;

    res.json({
      message: 'Payment history retrieved successfully',
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
    console.error('Get invoice payments error:', error);
    res.status(500).json({
      message: 'Failed to retrieve payment history',
      error: 'GET_INVOICE_PAYMENTS_ERROR',
    });
  }
});

/**
 * POST /api/invoices/:id/payments
 * Record a payment for an invoice (alias route)
 */
router.post('/:id/payments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, method, paidDate, notes } = req.body;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid invoice ID',
        error: 'INVALID_INVOICE_ID',
      });
      return;
    }

    // Validate required fields
    if (!amount || amount <= 0) {
      res.status(400).json({
        message: 'Amount must be a positive number',
        error: 'INVALID_AMOUNT',
      });
      return;
    }

    if (!method || !['BANK_TRANSFER', 'CREDIT_CARD', 'CHECK', 'CASH', 'OTHER'].includes(method)) {
      res.status(400).json({
        message: 'Invalid payment method. Must be: BANK_TRANSFER, CREDIT_CARD, CHECK, CASH, or OTHER',
        error: 'INVALID_PAYMENT_METHOD',
      });
      return;
    }

    // Get the invoice with current payments
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        payments: true,
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

    // Calculate total paid amount including this payment
    const currentPaidAmount = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const newTotalPaid = currentPaidAmount + parseFloat(amount);

    // Validate payment amount doesn't exceed invoice amount
    if (newTotalPaid > invoice.amount) {
      res.status(400).json({
        message: `Payment amount would exceed invoice total. Invoice amount: $${invoice.amount.toFixed(2)}, Already paid: $${currentPaidAmount.toFixed(2)}, Maximum additional payment: $${(invoice.amount - currentPaidAmount).toFixed(2)}`,
        error: 'PAYMENT_EXCEEDS_INVOICE_AMOUNT',
      });
      return;
    }

    // Record the payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        amount: parseFloat(amount),
        method,
        paidDate: paidDate ? new Date(paidDate) : new Date(),
        notes: notes || null,
      },
    });

    // Update invoice status based on payment amount
    let newStatus = invoice.status;
    if (newTotalPaid >= invoice.amount) {
      // Fully paid
      newStatus = 'PAID';
      await prisma.invoice.update({
        where: { id },
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
          where: { id },
          data: {
            status: 'SENT',
          },
        });
      }
    }

    // Get updated invoice with all payments
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: { paidDate: 'desc' },
        },
        client: true,
        order: true,
      },
    });

    res.status(201).json({
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
    console.error('Record payment error:', error);
    res.status(500).json({
      message: 'Failed to record payment',
      error: 'RECORD_PAYMENT_ERROR',
    });
  }
});

export default router;