import { prisma } from '../server';
import { Order, OrderStatus } from '@prisma/client';

/**
 * Generate a unique invoice number
 * Format: INV-YYYY-NNNNNN (e.g., INV-2025-000001)
 */
export const generateInvoiceNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `INV-${currentYear}-`;

  // Get the latest invoice number for the current year
  const latestInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: yearPrefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  });

  let nextNumber = 1;
  
  if (latestInvoice) {
    // Extract the number part from the latest invoice number
    const numberPart = latestInvoice.invoiceNumber.split('-')[2];
    if (numberPart) {
      nextNumber = parseInt(numberPart, 10) + 1;
    }
  }

  // Format with leading zeros (6 digits)
  const formattedNumber = nextNumber.toString().padStart(6, '0');
  return `${yearPrefix}${formattedNumber}`;
};

/**
 * Calculate invoice due date based on issue date and lead time
 */
export const calculateInvoiceDueDate = (issueDate: Date, leadTimeDays?: number | null): Date => {
  const dueDate = new Date(issueDate);
  const daysToAdd = leadTimeDays && leadTimeDays > 0 ? leadTimeDays : 30; // Default 30 days
  dueDate.setDate(dueDate.getDate() + daysToAdd);
  return dueDate;
};

/**
 * Check if an invoice can be generated from an order
 */
export const canGenerateInvoiceFromOrder = async (order: Order): Promise<{
  allowed: boolean;
  reason?: string;
}> => {
  // Check if order is active
  if (order.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason: 'Cannot generate invoice from inactive order',
    };
  }

  // Check if it's time to generate the next invoice
  const now = new Date();
  const nextInvoiceDate = new Date(order.nextInvoiceDate);
  
  if (nextInvoiceDate > now) {
    return {
      allowed: false,
      reason: `Next invoice is not due until ${nextInvoiceDate.toLocaleDateString()}`,
    };
  }

  return { allowed: true };
};

/**
 * Update order's next invoice date after generating an invoice
 */
export const updateOrderNextInvoiceDate = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Import date calculation function
  const { calculateNextInvoiceDate } = await import('./dateCalculations');
  
  const nextInvoiceDate = calculateNextInvoiceDate(
    new Date(order.nextInvoiceDate),
    order.frequency,
    order.customDays || undefined
  );

  await prisma.order.update({
    where: { id: orderId },
    data: { nextInvoiceDate },
  });
};

/**
 * Get invoice statistics for dashboard
 */
export const getInvoiceStatistics = async (): Promise<{
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  cancelled: number;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
}> => {
  const now = new Date();

  // Get all invoice counts by status
  const [statusCounts, totalAmount, paidAmount, overdueInvoices] = await Promise.all([
    prisma.invoice.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    }),
    prisma.invoice.aggregate({
      _sum: {
        amount: true,
      },
    }),
    prisma.invoice.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'PAID',
      },
    }),
    prisma.invoice.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'SENT',
        dueDate: {
          lt: now,
        },
      },
    }),
  ]);

  // Convert status counts to object
  const statusCountMap = statusCounts.reduce((acc, item) => {
    acc[item.status] = item._count.id;
    return acc;
  }, {} as Record<string, number>);

  const total = Object.values(statusCountMap).reduce((sum, count) => sum + count, 0);

  return {
    total,
    draft: statusCountMap.DRAFT || 0,
    sent: statusCountMap.SENT || 0,
    paid: statusCountMap.PAID || 0,
    overdue: statusCountMap.OVERDUE || 0,
    cancelled: statusCountMap.CANCELLED || 0,
    totalAmount: totalAmount._sum.amount || 0,
    paidAmount: paidAmount._sum.amount || 0,
    overdueAmount: overdueInvoices._sum.amount || 0,
  };
};

/**
 * Mark overdue invoices
 * This function should be run periodically (e.g., daily cron job)
 */
export const markOverdueInvoices = async (): Promise<number> => {
  const now = new Date();

  const result = await prisma.invoice.updateMany({
    where: {
      status: 'SENT',
      dueDate: {
        lt: now,
      },
    },
    data: {
      status: 'OVERDUE',
    },
  });

  return result.count;
};

/**
 * Get upcoming invoices to be generated
 */
export const getUpcomingInvoices = async (daysAhead: number = 7): Promise<Array<{
  order: Order & { client: { name: string; email: string; company?: string | null } };
  nextInvoiceDate: Date;
  estimatedAmount: number;
}>> => {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  const orders = await prisma.order.findMany({
    where: {
      status: 'ACTIVE',
      nextInvoiceDate: {
        gte: now,
        lte: futureDate,
      },
    },
    include: {
      client: {
        select: {
          name: true,
          email: true,
          company: true,
        },
      },
    },
    orderBy: {
      nextInvoiceDate: 'asc',
    },
  });

  return orders.map(order => ({
    order,
    nextInvoiceDate: order.nextInvoiceDate,
    estimatedAmount: order.amount,
  }));
};

/**
 * Generate invoices for all due orders
 * This function should be run periodically (e.g., daily cron job)
 */
export const generateInvoicesForDueOrders = async (): Promise<{
  generated: number;
  errors: Array<{ orderId: string; error: string }>;
}> => {
  const now = new Date();
  
  const dueOrders = await prisma.order.findMany({
    where: {
      status: 'ACTIVE',
      nextInvoiceDate: {
        lte: now,
      },
    },
    include: {
      client: true,
    },
  });

  const results = {
    generated: 0,
    errors: [] as Array<{ orderId: string; error: string }>,
  };

  for (const order of dueOrders) {
    try {
      // Check if invoice can be generated
      const canGenerate = await canGenerateInvoiceFromOrder(order);
      if (!canGenerate.allowed) {
        results.errors.push({
          orderId: order.id,
          error: canGenerate.reason || 'Invoice generation not allowed',
        });
        continue;
      }

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();

      // Calculate due date
      const issueDate = new Date();
      const dueDate = calculateInvoiceDueDate(issueDate, order.leadTimeDays);

      // Create the invoice
      await prisma.invoice.create({
        data: {
          clientId: order.clientId,
          orderId: order.id,
          invoiceNumber,
          amount: order.amount,
          issueDate,
          dueDate,
          status: 'DRAFT', // Start as draft, can be sent later
        },
      });

      // Update order's next invoice date
      await updateOrderNextInvoiceDate(order.id);

      results.generated++;
    } catch (error) {
      results.errors.push({
        orderId: order.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
};