import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Validation schemas
const createSubscriptionSchema = z.object({
  clientId: z.string(),
  serviceId: z.string(),
  companyId: z.string(),
  price: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  billingDay: z.number().min(1).max(31),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED', 'PAID_IN_ADVANCE']).default('ACTIVE'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isPaidInAdvance: z.boolean().default(false),
  advancePaidUntil: z.string().datetime().optional(),
  notes: z.string().optional()
});

const updateSubscriptionSchema = createSubscriptionSchema.partial();

// GET /api/subscriptions - List recurring subscriptions
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const subscriptions = await prisma.recurringSubscription.findMany({
      where: { 
        status: { not: 'CANCELLED' }
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            primaryContactName: true,
            primaryContactEmail: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            category: true,
            defaultPrice: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { nextBillingDate: 'asc' }
      ]
    });

    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch subscriptions',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// POST /api/subscriptions - Create subscription
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createSubscriptionSchema.parse(req.body);

    // Verify client, service, and company exist
    const [client, service, company] = await Promise.all([
      prisma.client.findUnique({
        where: { id: validatedData.clientId }
      }),
      prisma.serviceLibrary.findUnique({
        where: { id: validatedData.serviceId }
      }),
      prisma.company.findUnique({
        where: { id: validatedData.companyId }
      })
    ]);

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    if (!service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Calculate next billing date (monthly billing by default)
    const startDate = validatedData.startDate ? new Date(validatedData.startDate) : new Date();
    let nextBillingDate = new Date(startDate);
    nextBillingDate.setDate(validatedData.billingDay);
    if (nextBillingDate <= startDate) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    const subscription = await prisma.recurringSubscription.create({
      data: {
        clientId: validatedData.clientId,
        serviceId: validatedData.serviceId,
        companyId: validatedData.companyId,
        price: validatedData.price,
        currency: validatedData.currency,
        billingDay: validatedData.billingDay,
        status: validatedData.status,
        startDate: startDate,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        nextBillingDate: nextBillingDate,
        isPaidInAdvance: validatedData.isPaidInAdvance,
        advancePaidUntil: validatedData.advancePaidUntil ? new Date(validatedData.advancePaidUntil) : null,
        notes: validatedData.notes || null
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            primaryContactName: true,
            primaryContactEmail: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            category: true,
            defaultPrice: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }

    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// PUT /api/subscriptions/:id - Update subscription
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const subscriptionId = req.params.id;
    const validatedData = updateSubscriptionSchema.parse(req.body);

    // Verify subscription exists
    const existingSubscription = await prisma.recurringSubscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!existingSubscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    // If client, service, or company is being updated, verify they exist
    if (validatedData.clientId || validatedData.serviceId || validatedData.companyId) {
      const verifications = [];
      
      if (validatedData.clientId) {
        verifications.push(
          prisma.client.findUnique({
            where: { id: validatedData.clientId }
          })
        );
      }
      
      if (validatedData.serviceId) {
        verifications.push(
          prisma.serviceLibrary.findUnique({
            where: { id: validatedData.serviceId }
          })
        );
      }

      if (validatedData.companyId) {
        verifications.push(
          prisma.company.findUnique({
            where: { id: validatedData.companyId }
          })
        );
      }

      const results = await Promise.all(verifications);
      let index = 0;
      
      if (validatedData.clientId && !results[index++]) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      
      if (validatedData.serviceId && !results[index++]) {
        res.status(404).json({ error: 'Service not found' });
        return;
      }

      if (validatedData.companyId && !results[index++]) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }
    }

    // Recalculate next billing date if billing day changed
    let nextBillingDate = existingSubscription.nextBillingDate;
    
    if (validatedData.billingDay && validatedData.billingDay !== existingSubscription.billingDay) {
      nextBillingDate = new Date();
      nextBillingDate.setDate(validatedData.billingDay);
      if (nextBillingDate <= new Date()) {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }
    }

    const updateData: any = {
      ...validatedData,
      nextBillingDate,
      updatedAt: new Date()
    };

    // Handle optional datetime fields
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate);
    }
    if (validatedData.advancePaidUntil) {
      updateData.advancePaidUntil = new Date(validatedData.advancePaidUntil);
    }

    const subscription = await prisma.recurringSubscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            primaryContactName: true,
            primaryContactEmail: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            category: true,
            defaultPrice: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(subscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }

    console.error('Error updating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to update subscription',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// GET /api/subscriptions/due - Get due subscriptions
router.get('/due', async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const daysAhead = parseInt(req.query.days as string) || 7; // Default 7 days ahead
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + daysAhead);

    const dueSubscriptions = await prisma.recurringSubscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: {
          lte: maxDate
        }
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            primaryContactName: true,
            primaryContactEmail: true,
            ccEmails: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            category: true,
            defaultPrice: true,
            description: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        nextBillingDate: 'asc'
      }
    });

    res.json({
      subscriptions: dueSubscriptions,
      totalDue: dueSubscriptions.length,
      dateRange: {
        from: today.toISOString(),
        to: maxDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching due subscriptions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch due subscriptions',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// DELETE /api/subscriptions/:id - Delete (cancel) subscription
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const subscriptionId = req.params.id;

    const subscription = await prisma.recurringSubscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    // Soft delete by marking as cancelled
    await prisma.recurringSubscription.update({
      where: { id: subscriptionId },
      data: { 
        status: 'CANCELLED',
        endDate: new Date(),
        updatedAt: new Date()
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ 
      error: 'Failed to delete subscription',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;