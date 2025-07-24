import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { authenticateToken } from '../middleware/auth';
import { 
  validateClientCreation, 
  handleValidationErrors,
  sanitizeInput 
} from '../middleware/validation';

const router = Router();

// All client routes require authentication
router.use(authenticateToken);

/**
 * GET /api/clients
 * List all clients with pagination, search, and filtering
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // Max 100 per page
    const search = req.query.search as string || '';
    const sortBy = req.query.sortBy as string || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
    const skip = (page - 1) * limit;

    // Build search conditions
    const searchConditions = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { company: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    // Valid sort fields
    const validSortFields = ['name', 'email', 'company', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';

    // Get total count for pagination
    const totalCount = await prisma.client.count({
      where: searchConditions,
    });

    // Get clients with pagination
    const clients = await prisma.client.findMany({
      where: searchConditions,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
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
      message: 'Clients retrieved successfully',
      data: {
        clients,
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
    console.error('Get clients error:', error);
    res.status(500).json({
      message: 'Failed to retrieve clients',
      error: 'GET_CLIENTS_ERROR',
    });
  }
});

/**
 * GET /api/clients/:id
 * Get single client with related data
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid client ID',
        error: 'INVALID_CLIENT_ID',
      });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        orders: {
          select: {
            id: true,
            description: true,
            amount: true,
            frequency: true,
            status: true,
            startDate: true,
            nextInvoiceDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Latest 10 orders
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
            orders: true,
            invoices: true,
          }
        }
      },
    });

    if (!client) {
      res.status(404).json({
        message: 'Client not found',
        error: 'CLIENT_NOT_FOUND',
      });
      return;
    }

    res.json({
      message: 'Client retrieved successfully',
      data: { client }
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      message: 'Failed to retrieve client',
      error: 'GET_CLIENT_ERROR',
    });
  }
});

/**
 * POST /api/clients
 * Create new client
 */
router.post('/',
  sanitizeInput,
  validateClientCreation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, company, phone, address } = req.body;

      // Check if client with email already exists
      const existingClient = await prisma.client.findUnique({
        where: { email },
      });

      if (existingClient) {
        res.status(409).json({
          message: 'Client with this email already exists',
          error: 'CLIENT_EMAIL_EXISTS',
        });
        return;
      }

      // Create the client
      const client = await prisma.client.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          company: company?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          phone: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(201).json({
        message: 'Client created successfully',
        data: { client }
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({
        message: 'Failed to create client',
        error: 'CREATE_CLIENT_ERROR',
      });
    }
  }
);

/**
 * PUT /api/clients/:id
 * Update client information
 */
router.put('/:id',
  sanitizeInput,
  validateClientCreation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, email, company, phone, address } = req.body;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          message: 'Invalid client ID',
          error: 'INVALID_CLIENT_ID',
        });
        return;
      }

      // Check if client exists
      const existingClient = await prisma.client.findUnique({
        where: { id },
      });

      if (!existingClient) {
        res.status(404).json({
          message: 'Client not found',
          error: 'CLIENT_NOT_FOUND',
        });
        return;
      }

      // Check if email is being changed and if new email already exists
      if (email.toLowerCase() !== existingClient.email) {
        const emailExists = await prisma.client.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (emailExists) {
          res.status(409).json({
            message: 'Client with this email already exists',
            error: 'CLIENT_EMAIL_EXISTS',
          });
          return;
        }
      }

      // Update the client
      const updatedClient = await prisma.client.update({
        where: { id },
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          company: company?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          phone: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        message: 'Client updated successfully',
        data: { client: updatedClient }
      });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({
        message: 'Failed to update client',
        error: 'UPDATE_CLIENT_ERROR',
      });
    }
  }
);

/**
 * DELETE /api/clients/:id
 * Soft delete client (for data integrity)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid client ID',
        error: 'INVALID_CLIENT_ID',
      });
      return;
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            invoices: true,
          }
        }
      }
    });

    if (!existingClient) {
      res.status(404).json({
        message: 'Client not found',
        error: 'CLIENT_NOT_FOUND',
      });
      return;
    }

    // Check if client has active orders or unpaid invoices
    const hasActiveOrders = await prisma.order.count({
      where: {
        clientId: id,
        status: 'ACTIVE',
      }
    });

    const hasUnpaidInvoices = await prisma.invoice.count({
      where: {
        clientId: id,
        status: { in: ['SENT', 'OVERDUE'] },
      }
    });

    if (hasActiveOrders > 0 || hasUnpaidInvoices > 0) {
      res.status(409).json({
        message: 'Cannot delete client with active orders or unpaid invoices',
        error: 'CLIENT_HAS_DEPENDENCIES',
        details: {
          activeOrders: hasActiveOrders,
          unpaidInvoices: hasUnpaidInvoices,
        }
      });
      return;
    }

    // For now, we'll do actual deletion since we don't have a soft delete field
    // In production, you'd add an 'isDeleted' field to the schema
    await prisma.client.delete({
      where: { id },
    });

    res.json({
      message: 'Client deleted successfully',
      data: { deletedClientId: id }
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      message: 'Failed to delete client',
      error: 'DELETE_CLIENT_ERROR',
    });
  }
});

/**
 * GET /api/clients/search
 * Search clients by name, email, or company
 */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    if (!query || query.trim().length < 2) {
      res.status(400).json({
        message: 'Search query must be at least 2 characters',
        error: 'INVALID_SEARCH_QUERY',
      });
      return;
    }

    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    res.json({
      message: 'Search results retrieved successfully',
      data: { clients, query, count: clients.length }
    });
  } catch (error) {
    console.error('Search clients error:', error);
    res.status(500).json({
      message: 'Failed to search clients',
      error: 'SEARCH_CLIENTS_ERROR',
    });
  }
});

export default router;