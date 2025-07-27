import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, subMonths, parseISO, isAfter, isBefore, format } from 'date-fns';
import { invoiceService, InvoiceWithRelations } from '../services/invoiceService';
import { clientService } from '../services/clientService';
import { orderService } from '../services/orderService';

export interface RevenueData {
  month: string;
  revenue: number;
  paid: number;
  pending: number;
  overdue: number;
  invoiceCount: number;
}

export interface PaymentAnalytics {
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  averagePaymentTime: number;
  paymentSuccessRate: number;
  overdueRate: number;
  monthlyTrend: 'up' | 'down' | 'stable';
}

export interface ClientInsight {
  clientId: string;
  clientName: string;
  totalSpent: number;
  invoiceCount: number;
  averageInvoiceValue: number;
  paymentReliability: number; // 0-100 score
  lastPaymentDate: string | null;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AnalyticsData {
  revenueData: RevenueData[];
  paymentAnalytics: PaymentAnalytics;
  clientInsights: ClientInsight[];
  predictiveScores: {
    likelyToPayLate: string[]; // invoice IDs
    highValueAtRisk: string[];
    reliableClients: string[];
  };
}

interface UseAnalyticsOptions {
  monthsBack?: number;
  includeProjections?: boolean;
  clientId?: string;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const { monthsBack = 12, includeProjections = false, clientId } = options;

  // Fetch invoices data
  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError } = useQuery({
    queryKey: ['analytics-invoices', monthsBack, clientId],
    queryFn: async () => {
      // Fetch more data for comprehensive analytics
      const response = await invoiceService.getInvoices({ 
        page: 1, 
        limit: 1000,
        ...(clientId && { clientId })
      });
      return response.invoices;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch clients data for insights
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['analytics-clients'],
    queryFn: async () => {
      const response = await clientService.getClients({ page: 1, limit: 1000 });
      return response.clients;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Calculate analytics data
  const analyticsData = useMemo((): AnalyticsData | null => {
    if (!invoicesData || !clientsData) return null;

    const now = new Date();
    const startDate = startOfMonth(subMonths(now, monthsBack - 1));
    
    // Generate revenue data for each month
    const revenueData: RevenueData[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthLabel = format(monthStart, 'MMM yyyy');
      
      const monthInvoices = invoicesData.filter(invoice => {
        const createdDate = parseISO(invoice.createdAt);
        return isAfter(createdDate, monthStart) && isBefore(createdDate, monthEnd);
      });

      const revenue = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const paid = monthInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);
      const pending = monthInvoices
        .filter(inv => inv.status === 'pending')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);
      const overdue = monthInvoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      revenueData.push({
        month: monthLabel,
        revenue,
        paid,
        pending,
        overdue,
        invoiceCount: monthInvoices.length,
      });
    }

    // Calculate payment analytics
    const totalRevenue = invoicesData.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoicesData
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPending = invoicesData
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalOverdue = invoicesData
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const paidInvoices = invoicesData.filter(inv => inv.status === 'paid');
    const averagePaymentTime = paidInvoices.length > 0
      ? paidInvoices.reduce((sum, inv) => {
          const created = parseISO(inv.createdAt);
          const paid = inv.paidAt ? parseISO(inv.paidAt) : created;
          const daysDiff = Math.max(1, Math.ceil((paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
          return sum + daysDiff;
        }, 0) / paidInvoices.length
      : 0;

    const paymentSuccessRate = invoicesData.length > 0
      ? (paidInvoices.length / invoicesData.length) * 100
      : 0;

    const overdueRate = invoicesData.length > 0
      ? (invoicesData.filter(inv => inv.status === 'overdue').length / invoicesData.length) * 100
      : 0;

    // Calculate trend (comparing last 2 months)
    const lastMonth = revenueData[revenueData.length - 1];
    const secondLastMonth = revenueData[revenueData.length - 2];
    let monthlyTrend: 'up' | 'down' | 'stable' = 'stable';
    
    if (lastMonth && secondLastMonth) {
      const diff = lastMonth.revenue - secondLastMonth.revenue;
      if (Math.abs(diff) > lastMonth.revenue * 0.05) { // 5% threshold
        monthlyTrend = diff > 0 ? 'up' : 'down';
      }
    }

    const paymentAnalytics: PaymentAnalytics = {
      totalRevenue,
      totalPaid,
      totalPending,
      totalOverdue,
      averagePaymentTime,
      paymentSuccessRate,
      overdueRate,
      monthlyTrend,
    };

    // Calculate client insights
    const clientInsights: ClientInsight[] = clientsData.map(client => {
      const clientInvoices = invoicesData.filter(inv => inv.clientId === client.id);
      const totalSpent = clientInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const paidInvoices = clientInvoices.filter(inv => inv.status === 'paid');
      const overdueInvoices = clientInvoices.filter(inv => inv.status === 'overdue');
      
      const paymentReliability = clientInvoices.length > 0
        ? Math.max(0, 100 - (overdueInvoices.length / clientInvoices.length) * 100)
        : 100;

      const lastPaidInvoice = paidInvoices
        .sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime())[0];

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (paymentReliability < 70 || overdueInvoices.length > 2) {
        riskLevel = 'high';
      } else if (paymentReliability < 85 || overdueInvoices.length > 0) {
        riskLevel = 'medium';
      }

      return {
        clientId: client.id,
        clientName: client.name,
        totalSpent,
        invoiceCount: clientInvoices.length,
        averageInvoiceValue: clientInvoices.length > 0 ? totalSpent / clientInvoices.length : 0,
        paymentReliability,
        lastPaymentDate: lastPaidInvoice?.paidAt || null,
        riskLevel,
      };
    }).filter(insight => insight.invoiceCount > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent);

    // Calculate predictive scores
    const likelyToPayLate = invoicesData
      .filter(inv => inv.status === 'pending' && inv.clientId)
      .filter(inv => {
        const client = clientInsights.find(c => c.clientId === inv.clientId);
        return client && client.paymentReliability < 80;
      })
      .map(inv => inv.id);

    const highValueAtRisk = invoicesData
      .filter(inv => inv.totalAmount > 5000 && inv.status !== 'paid')
      .map(inv => inv.id);

    const reliableClients = clientInsights
      .filter(client => client.paymentReliability > 90 && client.invoiceCount >= 3)
      .map(client => client.clientId);

    return {
      revenueData,
      paymentAnalytics,
      clientInsights,
      predictiveScores: {
        likelyToPayLate,
        highValueAtRisk,
        reliableClients,
      },
    };
  }, [invoicesData, clientsData, monthsBack]);

  // Utility functions for components
  const getRevenueGrowth = (months = 3) => {
    if (!analyticsData) return 0;
    const recent = analyticsData.revenueData.slice(-months);
    const earlier = analyticsData.revenueData.slice(-months * 2, -months);
    
    const recentAvg = recent.reduce((sum, data) => sum + data.revenue, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, data) => sum + data.revenue, 0) / earlier.length;
    
    return earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
  };

  const getTopClients = (limit = 5) => {
    if (!analyticsData) return [];
    return analyticsData.clientInsights.slice(0, limit);
  };

  const getHighRiskInvoices = () => {
    if (!analyticsData || !invoicesData) return [];
    return invoicesData.filter(inv => 
      analyticsData.predictiveScores.likelyToPayLate.includes(inv.id) ||
      analyticsData.predictiveScores.highValueAtRisk.includes(inv.id)
    );
  };

  return {
    data: analyticsData,
    isLoading: invoicesLoading || clientsLoading,
    error: invoicesError,
    
    // Utility functions
    getRevenueGrowth,
    getTopClients,
    getHighRiskInvoices,
    
    // Raw data access
    invoices: invoicesData,
    clients: clientsData,
  };
};

export default useAnalytics;