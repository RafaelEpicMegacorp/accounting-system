import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  ButtonGroup,
  Chip,
  Skeleton,
  Alert,
  Tabs,
  Tab,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp,
  Assessment,
  PieChart,
  BarChart as BarChartIcon,
  Refresh,
  FileDownload,
  DateRange,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Import our existing analytics components
import RevenueChart from '../components/analytics/RevenueChart';
import ClientInsights from '../components/analytics/ClientInsights';
import PaymentAnalytics from '../components/analytics/PaymentAnalytics';
import ErrorBoundary from '../components/ErrorBoundary';

// Import the analytics hook
import { useAnalytics } from '../hooks/useAnalytics';

// Import services
import { invoiceService } from '../services/invoiceService';
import { clientService } from '../services/clientService';
import { orderService } from '../services/orderService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `analytics-tab-${index}`,
    'aria-controls': `analytics-tabpanel-${index}`,
  };
}

const Analytics: React.FC = React.memo(() => {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m' | '24m'>('6m');

  // Calculate date range
  const dateRange = useMemo(() => {
    const months = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : timeRange === '12m' ? 12 : 24;
    const endDate = endOfMonth(new Date());
    const startDate = startOfMonth(subMonths(endDate, months - 1));
    return { startDate, endDate };
  }, [timeRange]);

  // Fetch data using React Query
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', 'analytics'],
    queryFn: () => invoiceService.getInvoices({ limit: 1000 }).then(res => res.data.invoices),
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients', 'analytics'],
    queryFn: () => clientService.getClients({ limit: 1000 }).then(res => res.data.clients),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders', 'analytics'],
    queryFn: () => orderService.getOrders({ limit: 1000 }).then(res => res.data.orders),
  });

  // Use analytics hook with fetched data
  const {
    revenueData,
    paymentAnalytics,
    clientInsights,
    isLoading: analyticsLoading,
  } = useAnalytics(invoices, clients, orders, dateRange);

  const isLoading = loadingInvoices || loadingClients || loadingOrders || analyticsLoading;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleTimeRangeChange = (range: '3m' | '6m' | '12m' | '24m') => {
    setTimeRange(range);
  };

  const handleRefresh = () => {
    // Trigger data refetch
    window.location.reload();
  };

  const handleExport = () => {
    // TODO: Implement data export functionality
    console.log('Exporting analytics data...');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AnalyticsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h4" component="h1" fontWeight="bold">
                Analytics Dashboard
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={isLoading}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownload />}
                onClick={handleExport}
              >
                Export
              </Button>
            </Box>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Comprehensive insights into your business performance and financial health
          </Typography>

          {/* Time Range Selector */}
          <ButtonGroup variant="outlined" size="small">
            {[
              { value: '3m', label: '3 Months' },
              { value: '6m', label: '6 Months' },
              { value: '12m', label: '12 Months' },
              { value: '24m', label: '24 Months' },
            ].map(({ value, label }) => (
              <Button
                key={value}
                variant={timeRange === value ? 'contained' : 'outlined'}
                onClick={() => handleTimeRangeChange(value as any)}
                startIcon={<DateRange />}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
      </motion.div>

      {/* Quick Stats Cards */}
      {isLoading ? (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={32} />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TrendingUp sx={{ color: 'success.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Total Revenue
                    </Typography>
                  </Box>
                  <Typography variant="h5" component="div" fontWeight="bold">
                    ${paymentAnalytics?.totalRevenue?.toLocaleString() || '0'}
                  </Typography>
                  <Chip 
                    label={`${paymentAnalytics?.monthlyTrend || 'stable'}`} 
                    size="small" 
                    color={paymentAnalytics?.monthlyTrend === 'up' ? 'success' : paymentAnalytics?.monthlyTrend === 'down' ? 'error' : 'default'}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Assessment sx={{ color: 'info.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Active Clients
                    </Typography>
                  </Box>
                  <Typography variant="h5" component="div" fontWeight="bold">
                    {clients.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Total clients
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PieChart sx={{ color: 'warning.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Payment Success Rate
                    </Typography>
                  </Box>
                  <Typography variant="h5" component="div" fontWeight="bold">
                    {(paymentAnalytics?.paymentSuccessRate * 100 || 0).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Last {timeRange}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <BarChartIcon sx={{ color: 'secondary.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Avg Payment Time
                    </Typography>
                  </Box>
                  <Typography variant="h5" component="div" fontWeight="bold">
                    {Math.round(paymentAnalytics?.averagePaymentTime || 0)} days
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Average
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange}
              aria-label="analytics tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab 
                label="Revenue Analysis" 
                icon={<TrendingUp />} 
                iconPosition="start"
                {...a11yProps(0)} 
              />
              <Tab 
                label="Client Insights" 
                icon={<Assessment />} 
                iconPosition="start"
                {...a11yProps(1)} 
              />
              <Tab 
                label="Payment Analytics" 
                icon={<PieChart />} 
                iconPosition="start"
                {...a11yProps(2)} 
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <TabPanel value={currentTab} index={0}>
            {isLoading ? (
              <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={400} />
              </Box>
            ) : (
              <ErrorBoundary
                title="Revenue Chart Error"
                description="Unable to load revenue analytics. This might be due to data processing issues."
              >
                <RevenueChart 
                  data={revenueData} 
                  isLoading={isLoading}
                  height={400}
                  showControls={true}
                />
              </ErrorBoundary>
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {isLoading ? (
              <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={400} />
              </Box>
            ) : (
              <ErrorBoundary
                title="Client Insights Error"
                description="Unable to load client analytics. This might be due to client data processing issues."
              >
                <ClientInsights 
                  insights={clientInsights}
                  isLoading={isLoading}
                />
              </ErrorBoundary>
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            {isLoading ? (
              <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={400} />
              </Box>
            ) : (
              <ErrorBoundary
                title="Payment Analytics Error"
                description="Unable to load payment analytics. This might be due to payment data processing issues."
              >
                <PaymentAnalytics 
                  analytics={paymentAnalytics}
                  isLoading={isLoading}
                />
              </ErrorBoundary>
            )}
          </TabPanel>
        </Card>
      </motion.div>

      {/* Empty State */}
      {!isLoading && (!invoices.length && !clients.length && !orders.length) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Alert severity="info" sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              No Data Available
            </Typography>
            <Typography variant="body2">
              Start creating invoices, adding clients, and managing orders to see analytics data here.
            </Typography>
          </Alert>
        </motion.div>
      )}
    </Container>
  );
});

Analytics.displayName = 'Analytics';

export default Analytics;