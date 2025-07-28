import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/companies
 * List user's companies
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        message: 'User not authenticated',
        error: 'UNAUTHORIZED',
      });
      return;
    }

    const companies = await prisma.company.findMany({
      where: { 
        userId,
        isActive: true 
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
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
 * Get single company with payment methods (user must own the company)
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        message: 'User not authenticated',
        error: 'UNAUTHORIZED',
      });
      return;
    }

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid company ID',
        error: 'INVALID_COMPANY_ID',
      });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { 
        id,
        userId // Ensure user owns this company
      },
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
 * Create new company for authenticated user
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        message: 'User not authenticated',
        error: 'UNAUTHORIZED',
      });
      return;
    }

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
      bankAccount,
      iban,
      bicSwift,
      defaultCurrency = 'USD',
      isDefault = false,
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

    // If this is set as default, unset other default companies for this user
    if (isDefault) {
      await prisma.company.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const company = await prisma.company.create({
      data: {
        userId,
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
        bankAccount,
        iban,
        bicSwift,
        defaultCurrency,
        isDefault,
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
 * PUT /api/companies/:id
 * Update company
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
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
      isActive
    } = req.body;

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

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (legalName !== undefined) updateData.legalName = legalName;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (taxCode !== undefined) updateData.taxCode = taxCode;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (logo !== undefined) updateData.logo = logo;
    if (signature !== undefined) updateData.signature = signature;
    if (isActive !== undefined) updateData.isActive = isActive;

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: 'UPDATE_COMPANY_ERROR',
    });
  }
});

/**
 * DELETE /api/companies/:id
 * Delete company (soft delete by setting isActive to false)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

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

    // Check if company has active invoices
    const activeInvoices = await prisma.invoice.count({
      where: {
        companyId: id,
        status: { in: ['DRAFT', 'SENT'] }
      }
    });

    if (activeInvoices > 0) {
      res.status(400).json({
        message: 'Cannot delete company with active invoices. Please complete or cancel all invoices first.',
        error: 'COMPANY_HAS_ACTIVE_INVOICES',
      });
      return;
    }

    // Soft delete by setting isActive to false
    const company = await prisma.company.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Company deleted successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company',
      error: 'DELETE_COMPANY_ERROR',
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

/**
 * PUT /api/companies/:id/default
 * Set company as default for user
 */
router.put('/:id/default', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        message: 'User not authenticated',
        error: 'UNAUTHORIZED',
      });
      return;
    }

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        message: 'Invalid company ID',
        error: 'INVALID_COMPANY_ID',
      });
      return;
    }

    // Check if company exists and belongs to user
    const existingCompany = await prisma.company.findUnique({
      where: { 
        id,
        userId 
      },
    });

    if (!existingCompany) {
      res.status(404).json({
        message: 'Company not found',
        error: 'COMPANY_NOT_FOUND',
      });
      return;
    }

    // Start transaction to unset other defaults and set this one
    await prisma.$transaction(async (tx) => {
      // Unset all other default companies for this user
      await tx.company.updateMany({
        where: { 
          userId,
          isDefault: true 
        },
        data: { isDefault: false },
      });

      // Set this company as default
      await tx.company.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    const updatedCompany = await prisma.company.findUnique({
      where: { id },
    });

    res.json({
      message: 'Company set as default successfully',
      data: { company: updatedCompany }
    });
  } catch (error) {
    console.error('Set default company error:', error);
    res.status(500).json({
      message: 'Failed to set company as default',
      error: 'SET_DEFAULT_COMPANY_ERROR',
    });
  }
});

export default router;