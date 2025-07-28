import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Box, 
  Tabs, 
  Tab, 
  Alert,
  Button,
  Skeleton,
} from '@mui/material';
import { 
  PeopleAlt, 
  ShoppingCart, 
  Receipt, 
  AttachMoney,
  Analytics,
  Refresh,
  TrendingUp,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import { clientService } from '../services/clientService';
import { orderService } from '../services/orderService';
import { invoiceService } from '../services/invoiceService';
import PaymentInsightsWidget from '../components/dashboard/PaymentInsightsWidget';
import useAnalytics from '../hooks/useAnalytics';

// Lazy-loaded analytics components
const RevenueChart = React.lazy(() => import('../components/analytics/RevenueChart'));
const PaymentAnalytics = React.lazy(() => import('../components/analytics/PaymentAnalytics'));
const ClientInsights = React.lazy(() => import('../components/analytics/ClientInsights'));

interface DashboardStats {
  totalClients: number;
  activeOrders: number;
  pendingInvoices: number;
  outstandingAmount: number;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeOrders: 0,
    pendingInvoices: 0,
    outstandingAmount: 0
  });
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Use analytics hook for financial data
  const { 
    data: analyticsData, 
    isLoading: analyticsLoading, 
    error: analyticsError,
    getRevenueGrowth,
    getTopClients,
  } = useAnalytics({ monthsBack: 12 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch data in parallel for better performance
        const [clientsResponse, ordersResponse, invoicesResponse] = await Promise.all([
          clientService.getClients({ page: 1, limit: 1 }).catch(() => ({ pagination: { totalCount: 0 } })),
          orderService.getOrders({ page: 1, limit: 1 }).catch(() => ({ pagination: { totalCount: 0 } })),
          invoiceService.getInvoices({ page: 1, limit: 1 }).catch(() => ({ pagination: { totalCount: 0 } }))
        ]);

        // Calculate outstanding amount from analytics data
        const outstandingAmount = analyticsData 
          ? analyticsData.paymentAnalytics.totalPending + analyticsData.paymentAnalytics.totalOverdue
          : 0;

        setStats({
          totalClients: clientsResponse.pagination.totalCount,
          activeOrders: ordersResponse.pagination.totalCount,
          pendingInvoices: invoicesResponse.pagination.totalCount,
          outstandingAmount,
        });
      } catch (err: any) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [analyticsData]);

  // Enhanced dashboard stats with trends
  const dashboardStats = [
    { 
      title: 'Total Clients', 
      value: stats.totalClients.toString(), 
      icon: <PeopleAlt />, 
      color: '#1976d2',
      trend: analyticsData ? getTopClients(5).length : 0,
      subtitle: analyticsData ? `${getTopClients(5).length} high-value` : undefined,
    },
    { 
      title: 'Active Orders', 
      value: stats.activeOrders.toString(), 
      icon: <ShoppingCart />, 
      color: '#2e7d32',
    },
    { 
      title: 'Pending Invoices', 
      value: stats.pendingInvoices.toString(), 
      icon: <Receipt />, 
      color: '#ed6c02',
      trend: analyticsData?.paymentAnalytics.monthlyTrend,
    },
    { 
      title: 'Outstanding Amount', 
      value: `$${stats.outstandingAmount.toFixed(2)}`, 
      icon: <AttachMoney />, 
      color: '#d32f2f',
      subtitle: analyticsData ? `${analyticsData.paymentAnalytics.overdueRate.toFixed(1)}% overdue` : undefined,
    },
  ];

  if (loading) {
    return <LoadingSpinner message="Loading dashboard data..." />;
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography color="error" paragraph>
          {error}
        </Typography>
      </Box>
    );
  }

  const renderDashboardOverview = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {dashboardStats.map((stat, index) => (
          <Grid xs={12} sm={6} md={3} key={index}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                sx={{ 
                  height: '100%',
                  background: `linear-gradient(135deg, ${stat.color}15, transparent)`,
                  border: `1px solid ${stat.color}30`,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ 
                      backgroundColor: stat.color, 
                      color: 'white', 
                      borderRadius: '50%', 
                      p: 1, 
                      mr: 2 
                    }}>
                      {stat.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div">
                        {stat.title}
                      </Typography>
                      {stat.trend === 'up' && <TrendingUp fontSize="small" color="success" />}
                    </Box>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ color: stat.color, mb: 1 }}>
                    {stat.value}
                  </Typography>
                  {stat.subtitle && (
                    <Typography variant="caption" color="text.secondary">
                      {stat.subtitle}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Revenue Growth Alert */}
      {analyticsData && (
        <Box sx={{ mb: 4 }}>
          <Alert 
            severity={getRevenueGrowth(3) > 0 ? "success" : getRevenueGrowth(3) < -10 ? "error" : "info"}
            action={
              <Button size="small" variant="outlined">
                View Details
              </Button>
            }
          >
            Revenue has {getRevenueGrowth(3) > 0 ? 'grown' : 'declined'} by {Math.abs(getRevenueGrowth(3)).toFixed(1)}% 
            over the last 3 months. {getRevenueGrowth(3) > 10 ? 'Excellent growth!' : getRevenueGrowth(3) < -10 ? 'Review strategies needed.' : 'Keep monitoring trends.'}
          </Alert>
        </Box>
      )}

      {/* Quick Revenue Chart */}
      {analyticsData && (
        <Box sx={{ mb: 4 }}>
          <React.Suspense fallback={<Skeleton variant="rectangular" width="100%" height={300} />}>
            <RevenueChart
              data={analyticsData.revenueData}
              isLoading={analyticsLoading}
              height={300}
              showControls={false}
            />
          </React.Suspense>
        </Box>
      )}

      {/* Legacy Payment Insights Widget */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Payment Insights & Timeline
        </Typography>
        <PaymentInsightsWidget />
      </Box>
    </motion.div>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Financial Dashboard
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Comprehensive analytics and insights for your invoice management system
          </Typography>
        </Box>
        <Button
          startIcon={<Refresh />}
          variant="outlined"
          onClick={() => window.location.reload()}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Error Handling */}
      {(error || analyticsError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Failed to load analytics data. Please try refreshing the page.'}
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{ px: 3, pt: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            label="Overview" 
            icon={<Analytics />} 
            iconPosition="start" 
          />
          <Tab 
            label="Revenue Analytics" 
            icon={<TrendingUp />} 
            iconPosition="start" 
          />
          <Tab 
            label="Payment Analytics" 
            icon={<Receipt />} 
            iconPosition="start" 
          />
          <Tab 
            label="Client Insights" 
            icon={<PeopleAlt />} 
            iconPosition="start" 
          />
        </Tabs>
      </Card>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {selectedTab === 0 && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderDashboardOverview()}
          </motion.div>
        )}

        {selectedTab === 1 && (
          <motion.div
            key="revenue"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {analyticsData ? (
              <React.Suspense fallback={<Skeleton variant="rectangular" width="100%" height={500} />}>
                <RevenueChart
                  data={analyticsData.revenueData}
                  isLoading={analyticsLoading}
                  height={500}
                  showControls={true}
                />
              </React.Suspense>
            ) : (
              <Skeleton variant="rectangular" width="100%" height={500} />
            )}
          </motion.div>
        )}

        {selectedTab === 2 && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {analyticsData ? (
              <React.Suspense fallback={<Skeleton variant="rectangular" width="100%" height={400} />}>
                <PaymentAnalytics
                  data={analyticsData.paymentAnalytics}
                  isLoading={analyticsLoading}
                  onRefresh={() => window.location.reload()}
                  showInsights={true}
                />
              </React.Suspense>
            ) : (
              <Skeleton variant="rectangular" width="100%" height={400} />
            )}
          </motion.div>
        )}

        {selectedTab === 3 && (
          <motion.div
            key="clients"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {analyticsData ? (
              <React.Suspense fallback={<Skeleton variant="rectangular" width="100%" height={400} />}>
                <ClientInsights
                  clientInsights={analyticsData.clientInsights}
                  isLoading={analyticsLoading}
                  onClientClick={(clientId) => {
                    // TODO: Navigate to client details
                    // Client navigation will be implemented later
                  }}
                  showFullDetails={true}
                />
              </React.Suspense>
            ) : (
              <Skeleton variant="rectangular" width="100%" height={400} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default Dashboard;