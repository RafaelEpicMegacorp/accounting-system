import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/services
 * List all services with optional filtering
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string || '';
    const category = req.query.category as string;
    const isActive = req.query.isActive === 'false' ? false : true;

    // Build filter conditions
    const whereConditions: any = { isActive };

    // Search in service name or description
    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by category
    if (category && ['CONTENT_MARKETING', 'PODCAST_SPONSORSHIP', 'SOCIAL_MEDIA', 'ADVERTISING', 'CREATIVE_SERVICES', 'PLATFORM_MANAGEMENT', 'OTHER'].includes(category)) {
      whereConditions.category = category;
    }

    const services = await prisma.serviceLibrary.findMany({
      where: whereConditions,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json({
      message: 'Services retrieved successfully',
      data: { services }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      message: 'Failed to retrieve services',
      error: 'GET_SERVICES_ERROR',
    });
  }
});

/**
 * GET /api/services/:id
 * Get single service by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid service ID',
        error: 'INVALID_SERVICE_ID',
      });
      return;
    }

    const service = await prisma.serviceLibrary.findUnique({
      where: { id },
    });

    if (!service) {
      res.status(404).json({
        message: 'Service not found',
        error: 'SERVICE_NOT_FOUND',
      });
      return;
    }

    res.json({
      message: 'Service retrieved successfully',
      data: { service }
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      message: 'Failed to retrieve service',
      error: 'GET_SERVICE_ERROR',
    });
  }
});

/**
 * POST /api/services
 * Create new service
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      category,
      defaultPrice,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!name || !category) {
      res.status(400).json({
        message: 'Name and category are required',
        error: 'MISSING_REQUIRED_FIELDS',
      });
      return;
    }

    // Validate category
    if (!['CONTENT_MARKETING', 'PODCAST_SPONSORSHIP', 'SOCIAL_MEDIA', 'ADVERTISING', 'CREATIVE_SERVICES', 'PLATFORM_MANAGEMENT', 'OTHER'].includes(category)) {
      res.status(400).json({
        message: 'Invalid category',
        error: 'INVALID_CATEGORY',
      });
      return;
    }

    const service = await prisma.serviceLibrary.create({
      data: {
        name,
        description,
        category,
        defaultPrice: defaultPrice ? parseFloat(defaultPrice) : null,
        isActive,
      },
    });

    res.status(201).json({
      message: 'Service created successfully',
      data: { service }
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      message: 'Failed to create service',
      error: 'CREATE_SERVICE_ERROR',
    });
  }
});

/**
 * PATCH /api/services/:id
 * Update service
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid service ID',
        error: 'INVALID_SERVICE_ID',
      });
      return;
    }

    // Check if service exists
    const existingService = await prisma.serviceLibrary.findUnique({
      where: { id },
    });

    if (!existingService) {
      res.status(404).json({
        message: 'Service not found',
        error: 'SERVICE_NOT_FOUND',
      });
      return;
    }

    // Convert defaultPrice to float if provided
    if (updateData.defaultPrice !== undefined) {
      updateData.defaultPrice = updateData.defaultPrice ? parseFloat(updateData.defaultPrice) : null;
    }

    const service = await prisma.serviceLibrary.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Service updated successfully',
      data: { service }
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      message: 'Failed to update service',
      error: 'UPDATE_SERVICE_ERROR',
    });
  }
});

/**
 * DELETE /api/services/:id
 * Delete service
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid service ID',
        error: 'INVALID_SERVICE_ID',
      });
      return;
    }

    // Check if service exists
    const existingService = await prisma.serviceLibrary.findUnique({
      where: { id },
    });

    if (!existingService) {
      res.status(404).json({
        message: 'Service not found',
        error: 'SERVICE_NOT_FOUND',
      });
      return;
    }

    // Soft delete by setting isActive to false
    const service = await prisma.serviceLibrary.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      message: 'Service deleted successfully',
      data: { service }
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      message: 'Failed to delete service',
      error: 'DELETE_SERVICE_ERROR',
    });
  }
});

export default router;