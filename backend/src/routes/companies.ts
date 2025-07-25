import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/companies
 * List all companies
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      message: 'Companies retrieved successfully',
      data: { companies }
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      message: 'Failed to retrieve companies',
      error: 'GET_COMPANIES_ERROR',
    });
  }
});

/**
 * GET /api/companies/:id
 * Get single company with payment methods
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid company ID',
        error: 'INVALID_COMPANY_ID',
      });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        paymentMethods: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!company) {
      res.status(404).json({
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    res.json({
      message: 'Company retrieved successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      message: 'Failed to retrieve company',
      error: 'GET_COMPANY_ERROR',
    });
  }
});

/**
 * POST /api/companies
 * Create new company
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      legalName,
      address,
      city,
      state,
      country,
      postalCode,
      taxCode,
      email,
      phone,
      website,
      logo,
      signature,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      res.status(400).json({
        message: 'Name and email are required',
        error: 'MISSING_REQUIRED_FIELDS',
      });
      return;
    }

    const company = await prisma.company.create({
      data: {
        name,
        legalName,
        address,
        city,
        state,
        country,
        postalCode,
        taxCode,
        email,
        phone,
        website,
        logo,
        signature,
        isActive,
      },
    });

    res.status(201).json({
      message: 'Company created successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      message: 'Failed to create company',
      error: 'CREATE_COMPANY_ERROR',
    });
  }
});

/**
 * PATCH /api/companies/:id
 * Update company
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid company ID',
        error: 'INVALID_COMPANY_ID',
      });
      return;
    }

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      res.status(404).json({
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Company updated successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      message: 'Failed to update company',
      error: 'UPDATE_COMPANY_ERROR',
    });
  }
});

/**
 * GET /api/companies/:id/payment-methods
 * Get payment methods for a company
 */
router.get('/:id/payment-methods', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: {
        companyId: id,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      message: 'Payment methods retrieved successfully',
      data: { paymentMethods }
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      message: 'Failed to retrieve payment methods',
      error: 'GET_PAYMENT_METHODS_ERROR',
    });
  }
});

/**
 * POST /api/companies/:id/payment-methods
 * Add payment method to company
 */
router.post('/:id/payment-methods', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, name, details } = req.body;

    // Validate required fields
    if (!type || !name || !details) {
      res.status(400).json({
        message: 'Type, name, and details are required',
        error: 'MISSING_REQUIRED_FIELDS',
      });
      return;
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      res.status(404).json({
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        companyId: id,
        type,
        name,
        details,
      },
    });

    res.status(201).json({
      message: 'Payment method added successfully',
      data: { paymentMethod }
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      message: 'Failed to add payment method',
      error: 'ADD_PAYMENT_METHOD_ERROR',
    });
  }
});

export default router;