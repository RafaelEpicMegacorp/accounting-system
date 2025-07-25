import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { 
  validateOrderCreation, 
  handleValidationErrors,
  sanitizeInput 
} from '../middleware/validation';
import { 
  calculateNextInvoiceDate,
  generateInvoiceSchedule,
  validateFrequencyAndCustomDays,
  getFrequencyDisplayText,
  calculateEstimatedAnnualRevenue
} from '../utils/dateCalculations';
import { 
  generateInvoiceNumber,
  calculateInvoiceDueDate,
  canGenerateInvoiceFromOrder
} from '../utils/invoiceUtils';

const router = Router();
const prisma = new PrismaClient();

// All order routes require authentication
router.use(authenticateToken);

/**
 * GET /api/orders
 * List all orders with filtering, search, and pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const search = req.query.search as string || '';
    const clientId = req.query.clientId as string;
    const status = req.query.status as string;
    const frequency = req.query.frequency as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;

    // Build filter conditions
    const whereConditions: any = {};

    // Search in description or client name/email
    if (search) {
      whereConditions.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { client: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Filter by client
    if (clientId) {
      whereConditions.clientId = clientId;
    }

    // Filter by status
    if (status && ['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) {
      whereConditions.status = status;
    }

    // Filter by frequency
    if (frequency && ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'CUSTOM'].includes(frequency)) {
      whereConditions.frequency = frequency;
    }

    // Valid sort fields
    const validSortFields = ['createdAt', 'amount', 'startDate', 'nextInvoiceDate', 'description'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Get total count
    const totalCount = await prisma.order.count({
      where: whereConditions,
    });

    // Get orders with client data
    const orders = await prisma.order.findMany({
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
        _count: {
          select: {
            invoices: true,
          }
        }
      },
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      message: 'Orders retrieved successfully',
      data: {
        orders,
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
    console.error('Get orders error:', error);
    res.status(500).json({
      message: 'Failed to retrieve orders',
      error: 'GET_ORDERS_ERROR',
    });
  }
});

/**
 * GET /api/orders/:id
 * Get single order with related data
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid order ID',
        error: 'INVALID_ORDER_ID',
      });
      return;
    }

    const order = await prisma.order.findUnique({
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
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
            issueDate: true,
            dueDate: true,
            paidDate: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Latest 10 invoices
        },
        _count: {
          select: {
            invoices: true,
          }
        }
      },
    });

    if (!order) {
      res.status(404).json({
        message: 'Order not found',
        error: 'ORDER_NOT_FOUND',
      });
      return;
    }

    // Add computed fields
    const orderWithExtras = {
      ...order,
      frequencyDisplay: getFrequencyDisplayText(order.frequency, order.customDays || undefined),
      estimatedAnnualRevenue: calculateEstimatedAnnualRevenue(
        order.amount,
        order.frequency,
        order.customDays || undefined
      ),
      upcomingSchedule: generateInvoiceSchedule(
        order.nextInvoiceDate,
        order.frequency,
        5,
        order.customDays || undefined
      ),
    };

    res.json({
      message: 'Order retrieved successfully',
      data: { order: orderWithExtras }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      message: 'Failed to retrieve order',
      error: 'GET_ORDER_ERROR',
    });
  }
});

/**
 * POST /api/orders
 * Create new order
 */
router.post('/',
  sanitizeInput,
  validateOrderCreation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { clientId, description, amount, frequency, startDate, customDays, leadTimeDays } = req.body;

      // Validate frequency and custom days
      const frequencyValidation = validateFrequencyAndCustomDays(frequency, customDays);
      if (!frequencyValidation.isValid) {
        res.status(400).json({
          message: frequencyValidation.error,
          error: 'INVALID_FREQUENCY_CUSTOM_DAYS',
        });
        return;
      }

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

      // Validate start date is not in the past
      const startDateObj = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDateObj < today) {
        res.status(400).json({
          message: 'Start date cannot be in the past',
          error: 'INVALID_START_DATE',
        });
        return;
      }

      // Calculate next invoice date
      const nextInvoiceDate = calculateNextInvoiceDate(
        startDateObj,
        frequency,
        customDays || undefined
      );

      // Create the order
      const order = await prisma.order.create({
        data: {
          clientId,
          description: description.trim(),
          amount: parseFloat(amount),
          frequency,
          startDate: startDateObj,
          nextInvoiceDate,
          customDays: frequency === 'CUSTOM' ? customDays : null,
          leadTimeDays: leadTimeDays || null,
          status: 'ACTIVE',
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
            }
          }
        },
      });

      res.status(201).json({
        message: 'Order created successfully',
        data: { order }
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        message: 'Failed to create order',
        error: 'CREATE_ORDER_ERROR',
      });
    }
  }
);

/**
 * PUT /api/orders/:id
 * Update order
 */
router.put('/:id',
  sanitizeInput,
  validateOrderCreation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { clientId, description, amount, frequency, startDate, customDays, leadTimeDays } = req.body;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          message: 'Invalid order ID',
          error: 'INVALID_ORDER_ID',
        });
        return;
      }

      // Validate frequency and custom days
      const frequencyValidation = validateFrequencyAndCustomDays(frequency, customDays);
      if (!frequencyValidation.isValid) {
        res.status(400).json({
          message: frequencyValidation.error,
          error: 'INVALID_FREQUENCY_CUSTOM_DAYS',
        });
        return;
      }

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id },
      });

      if (!existingOrder) {
        res.status(404).json({
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND',
        });
        return;
      }

      // Check if client exists (if clientId is being changed)
      if (clientId !== existingOrder.clientId) {
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
      }

      // Recalculate next invoice date if frequency or start date changed
      let nextInvoiceDate = existingOrder.nextInvoiceDate;
      const startDateObj = new Date(startDate);
      
      if (frequency !== existingOrder.frequency || 
          customDays !== existingOrder.customDays ||
          startDateObj.getTime() !== existingOrder.startDate.getTime()) {
        nextInvoiceDate = calculateNextInvoiceDate(
          startDateObj,
          frequency,
          customDays || undefined
        );
      }

      // Update the order
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          clientId,
          description: description.trim(),
          amount: parseFloat(amount),
          frequency,
          startDate: startDateObj,
          nextInvoiceDate,
          customDays: frequency === 'CUSTOM' ? customDays : null,
          leadTimeDays: leadTimeDays || null,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
            }
          }
        },
      });

      res.json({
        message: 'Order updated successfully',
        data: { order: updatedOrder }
      });
    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({
        message: 'Failed to update order',
        error: 'UPDATE_ORDER_ERROR',
      });
    }
  }
);

/**
 * PATCH /api/orders/:id/status
 * Update order status only
 */
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid order ID',
        error: 'INVALID_ORDER_ID',
      });
      return;
    }

    if (!status || !['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) {
      res.status(400).json({
        message: 'Invalid status. Must be ACTIVE, PAUSED, or CANCELLED',
        error: 'INVALID_STATUS',
      });
      return;
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      res.status(404).json({
        message: 'Order not found',
        error: 'ORDER_NOT_FOUND',
      });
      return;
    }

    // Update status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        }
      },
    });

    res.json({
      message: 'Order status updated successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      message: 'Failed to update order status',
      error: 'UPDATE_ORDER_STATUS_ERROR',
    });
  }
});

/**
 * DELETE /api/orders/:id
 * Cancel/delete order
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid order ID',
        error: 'INVALID_ORDER_ID',
      });
      return;
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoices: true,
          }
        }
      }
    });

    if (!existingOrder) {
      res.status(404).json({
        message: 'Order not found',
        error: 'ORDER_NOT_FOUND',
      });
      return;
    }

    // Check if order has invoices
    if (existingOrder._count.invoices > 0) {
      // Soft delete by setting status to CANCELLED
      await prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      res.json({
        message: 'Order cancelled successfully (has associated invoices)',
        data: { cancelledOrderId: id, reason: 'HAS_INVOICES' }
      });
    } else {
      // Hard delete if no invoices
      await prisma.order.delete({
        where: { id },
      });

      res.json({
        message: 'Order deleted successfully',
        data: { deletedOrderId: id }
      });
    }
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      message: 'Failed to delete order',
      error: 'DELETE_ORDER_ERROR',
    });
  }
});

/**
 * GET /api/orders/:id/schedule
 * Get upcoming invoice schedule for an order
 */
router.get('/:id/schedule', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const count = Math.min(parseInt(req.query.count as string) || 5, 20);

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid order ID',
        error: 'INVALID_ORDER_ID',
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        frequency: true,
        customDays: true,
        nextInvoiceDate: true,
        status: true,
      },
    });

    if (!order) {
      res.status(404).json({
        message: 'Order not found',
        error: 'ORDER_NOT_FOUND',
      });
      return;
    }

    const schedule = generateInvoiceSchedule(
      order.nextInvoiceDate,
      order.frequency,
      count,
      order.customDays || undefined
    );

    res.json({
      message: 'Invoice schedule retrieved successfully',
      data: { 
        schedule,
        orderStatus: order.status,
        count: schedule.length
      }
    });
  } catch (error) {
    console.error('Get order schedule error:', error);
    res.status(500).json({
      message: 'Failed to retrieve order schedule',
      error: 'GET_ORDER_SCHEDULE_ERROR',
    });
  }
});

/**
 * POST /api/orders/:id/generate-invoice
 * Generate invoice from an order (alias route)
 */
router.post('/:id/generate-invoice', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid order ID',
        error: 'INVALID_ORDER_ID',
      });
      return;
    }

    // Get order with client data
    const order = await prisma.order.findUnique({
      where: { id },
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
    console.error('Generate invoice from order error:', error);
    res.status(500).json({
      message: 'Failed to generate invoice from order',
      error: 'GENERATE_INVOICE_FROM_ORDER_ERROR',
    });
  }
});

export default router;