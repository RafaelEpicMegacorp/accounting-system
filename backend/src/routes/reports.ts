import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/reports/overview
 * Business overview report
 */
router.get('/overview', 
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Get basic counts and statistics
      const [
        totalClients,
        totalOrders,
        totalInvoices,
        totalPayments,
        totalServices,
        totalCompanies
      ] = await Promise.all([
        prisma.client.count(),
        prisma.order.count(),
        prisma.invoice.count(),
        prisma.payment.count(),
        prisma.serviceLibrary.count(),
        prisma.company.count()
      ]);

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        recentOrders,
        recentInvoices,
        recentPayments
      ] = await Promise.all([
        prisma.order.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        }),
        prisma.invoice.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        }),
        prisma.payment.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        }),
      ]);

      // Calculate total revenue from payments
      const totalRevenueResult = await prisma.payment.aggregate({
        _sum: {
          amount: true
        }
      });

      const totalRevenue = totalRevenueResult._sum.amount || 0;

      res.json({
        overview: {
          totals: {
            clients: totalClients,
            orders: totalOrders,
            invoices: totalInvoices,
            payments: totalPayments,
            services: totalServices,
            companies: totalCompanies,
            revenue: totalRevenue
          },
          recent30Days: {
            orders: recentOrders,
            invoices: recentInvoices,
            payments: recentPayments
          },
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error generating overview report:', error);
      res.status(500).json({ 
        message: 'Failed to generate overview report',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/reports/revenue
 * Revenue report
 */
router.get('/revenue',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Get revenue by month for the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const payments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: twelveMonthsAgo
          }
        },
        select: {
          amount: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Group payments by month
      const monthlyRevenue = payments.reduce((acc: any, payment) => {
        const month = payment.createdAt.toISOString().substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = 0;
        }
        acc[month] += Number(payment.amount);
        return acc;
      }, {});

      // Get total revenue
      const totalRevenueResult = await prisma.payment.aggregate({
        _sum: {
          amount: true
        }
      });

      const totalRevenue = totalRevenueResult._sum.amount || 0;

      // Get top clients by revenue
      const topClients = await prisma.client.findMany({
        include: {
          orders: {
            include: {
              invoices: {
                include: {
                  payments: true
                }
              }
            }
          }
        }
      });

      const clientRevenue = topClients.map(client => {
        const revenue = client.orders.reduce((total, order) => {
          return total + order.invoices.reduce((invoiceTotal, invoice) => {
            return invoiceTotal + invoice.payments.reduce((paymentTotal, payment) => {
              return paymentTotal + Number(payment.amount);
            }, 0);
          }, 0);
        }, 0);

        return {
          id: client.id,
          name: client.name,
          email: client.email,
          revenue
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      res.json({
        revenue: {
          total: totalRevenue,
          monthlyBreakdown: monthlyRevenue,
          topClients: clientRevenue,
          period: {
            start: twelveMonthsAgo.toISOString(),
            end: new Date().toISOString()
          },
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error generating revenue report:', error);
      res.status(500).json({ 
        message: 'Failed to generate revenue report',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/reports/clients
 * Client statistics report
 */
router.get('/clients',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const totalClients = await prisma.client.count();

      // Get clients with their order and payment counts
      const clientStats = await prisma.client.findMany({
        include: {
          orders: {
            include: {
              invoices: {
                include: {
                  payments: true
                }
              }
            }
          }
        }
      });

      const clientAnalysis = clientStats.map(client => {
        const totalOrders = client.orders.length;
        const totalInvoices = client.orders.reduce((total, order) => total + order.invoices.length, 0);
        const totalPayments = client.orders.reduce((total, order) => {
          return total + order.invoices.reduce((invoiceTotal, invoice) => {
            return invoiceTotal + invoice.payments.length;
          }, 0);
        }, 0);
        
        const totalRevenue = client.orders.reduce((total, order) => {
          return total + order.invoices.reduce((invoiceTotal, invoice) => {
            return invoiceTotal + invoice.payments.reduce((paymentTotal, payment) => {
              return paymentTotal + Number(payment.amount);
            }, 0);
          }, 0);
        }, 0);

        const lastOrderDate = client.orders.length > 0 
          ? Math.max(...client.orders.map(order => order.createdAt.getTime()))
          : null;

        return {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          createdAt: client.createdAt,
          stats: {
            totalOrders,
            totalInvoices,
            totalPayments,
            totalRevenue,
            lastOrderDate: lastOrderDate ? new Date(lastOrderDate).toISOString() : null
          }
        };
      });

      // Sort by revenue (highest first)
      clientAnalysis.sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue);

      // Get clients added in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newClientsCount = await prisma.client.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });

      res.json({
        clients: {
          total: totalClients,
          newThisMonth: newClientsCount,
          detailed: clientAnalysis,
          summary: {
            averageOrdersPerClient: clientAnalysis.length > 0 
              ? clientAnalysis.reduce((sum, client) => sum + client.stats.totalOrders, 0) / clientAnalysis.length 
              : 0,
            averageRevenuePerClient: clientAnalysis.length > 0 
              ? clientAnalysis.reduce((sum, client) => sum + client.stats.totalRevenue, 0) / clientAnalysis.length 
              : 0
          },
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error generating client report:', error);
      res.status(500).json({ 
        message: 'Failed to generate client report',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  }
);

export default router;