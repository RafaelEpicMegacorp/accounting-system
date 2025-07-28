import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
} from '@mui/material';
import {
  Payment,
  Schedule,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Info,
  Refresh,
  Analytics,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { PaymentAnalytics as PaymentAnalyticsData } from '../../hooks/useAnalytics';
import { formatCurrency } from '../../services/invoiceService';

export interface PaymentAnalyticsProps {
  data: PaymentAnalyticsData;
  isLoading?: boolean;
  onRefresh?: () => void;
  showInsights?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon: React.ReactNode;
  progress?: number;
  target?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  color,
  icon,
  progress,
  target,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" fontSize="small" />;
      case 'down': return <TrendingDown color="error" fontSize="small" />;
      default: return null;
    }
  };

  const getProgressColor = () => {
    if (!progress || !target) return 'primary';
    const percentage = (progress / target) * 100;
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        sx={{ 
          height: '100%',
          background: `linear-gradient(135deg, ${color === 'primary' ? '#1976d2' : color === 'success' ? '#2e7d32' : color === 'warning' ? '#ed6c02' : color === 'error' ? '#d32f2f' : '#0288d1'}10, transparent)`,
          border: `1px solid`,
          borderColor: `${color}.light`,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3,
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ color: `${color}.main` }}>
              {icon}
            </Box>
            {getTrendIcon()}
          </Box>
          
          <Typography variant="h4" fontWeight="bold" color={`${color}.main`} gutterBottom>
            {value}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          
          {progress !== undefined && target !== undefined && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Progress
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Math.round((progress / target) * 100)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(progress / target) * 100}
                color={getProgressColor()}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const PaymentAnalytics: React.FC<PaymentAnalyticsProps> = ({
  data,
  isLoading: _isLoading = false,
  onRefresh,
  showInsights = true,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);

  // Prepare data for visualizations
  const paymentStatusData = useMemo(() => [
    { name: 'Paid', value: data.totalPaid, color: '#2e7d32' },
    { name: 'Pending', value: data.totalPending, color: '#ed6c02' },
    { name: 'Overdue', value: data.totalOverdue, color: '#d32f2f' },
  ], [data]);

  const performanceMetrics = useMemo(() => [
    {
      name: 'Payment Success Rate',
      current: data.paymentSuccessRate,
      target: 90,
      benchmark: 87, // Stripe's benchmark
    },
    {
      name: 'Average Collection Time',
      current: data.averagePaymentTime,
      target: 15,
      benchmark: 18,
    },
    {
      name: 'Overdue Rate',
      current: data.overdueRate,
      target: 5,
      benchmark: 13,
    },
  ], [data]);

  // Generate insights based on data
  const insights = useMemo(() => {
    const insightsList = [];
    
    if (data.paymentSuccessRate > 90) {
      insightsList.push({
        type: 'success' as const,
        title: 'Excellent Payment Success Rate',
        description: `Your ${data.paymentSuccessRate.toFixed(1)}% success rate exceeds Stripe's 87% benchmark.`,
        action: 'Continue current practices',
      });
    } else if (data.paymentSuccessRate < 70) {
      insightsList.push({
        type: 'error' as const,
        title: 'Low Payment Success Rate',
        description: `${data.paymentSuccessRate.toFixed(1)}% success rate needs improvement. Consider payment reminders.`,
        action: 'Implement automated reminders',
      });
    }
    
    if (data.averagePaymentTime < 15) {
      insightsList.push({
        type: 'success' as const,
        title: 'Fast Collection Time',
        description: `Average ${data.averagePaymentTime.toFixed(1)} days is excellent for cash flow.`,
        action: 'Maintain current terms',
      });
    } else if (data.averagePaymentTime > 30) {
      insightsList.push({
        type: 'warning' as const,
        title: 'Slow Payment Collection',
        description: `${data.averagePaymentTime.toFixed(1)} days average may impact cash flow.`,
        action: 'Review payment terms',
      });
    }
    
    if (data.overdueRate > 15) {
      insightsList.push({
        type: 'error' as const,
        title: 'High Overdue Rate',
        description: `${data.overdueRate.toFixed(1)}% overdue rate requires immediate attention.`,
        action: 'Implement collections process',
      });
    }
    
    if (data.monthlyTrend === 'up') {
      insightsList.push({
        type: 'info' as const,
        title: 'Positive Revenue Trend',
        description: 'Revenue is trending upward compared to previous periods.',
        action: 'Scale successful strategies',
      });
    } else if (data.monthlyTrend === 'down') {
      insightsList.push({
        type: 'warning' as const,
        title: 'Revenue Decline',
        description: 'Revenue is trending downward. Consider reviewing pricing or sales strategy.',
        action: 'Analyze trend causes',
      });
    }
    
    return insightsList;
  }, [data]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card sx={{ p: 2, boxShadow: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            {data.name}
          </Typography>
          <Typography variant="body2" color={data.color}>
            {typeof data.value === 'number' && data.value > 1000 
              ? formatCurrency(data.value)
              : `${data.value}${data.name.includes('Rate') || data.name.includes('Time') ? data.name.includes('Rate') ? '%' : ' days' : ''}`
            }
          </Typography>
        </Card>
      );
    }
    return null;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Analytics color="primary" />
          <Typography variant="h5" fontWeight="bold">
            Payment Analytics
          </Typography>
        </Box>
        {onRefresh && (
          <Button
            startIcon={<Refresh />}
            onClick={onRefresh}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
        )}
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={3}>
          <MetricCard
            title="Payment Success Rate"
            value={`${data.paymentSuccessRate.toFixed(1)}%`}
            subtitle="Stripe benchmark: 87%"
            trend={data.paymentSuccessRate > 87 ? 'up' : data.paymentSuccessRate < 70 ? 'down' : 'stable'}
            color={data.paymentSuccessRate > 87 ? 'success' : data.paymentSuccessRate < 70 ? 'error' : 'warning'}
            icon={<CheckCircle />}
            progress={data.paymentSuccessRate}
            target={100}
          />
        </Grid>
        
        <Grid xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Collection Time"
            value={`${data.averagePaymentTime.toFixed(1)} days`}
            subtitle="Target: < 15 days"
            trend={data.averagePaymentTime < 15 ? 'up' : data.averagePaymentTime > 25 ? 'down' : 'stable'}
            color={data.averagePaymentTime < 15 ? 'success' : data.averagePaymentTime > 25 ? 'error' : 'warning'}
            icon={<Schedule />}
            progress={30 - data.averagePaymentTime}
            target={30}
          />
        </Grid>
        
        <Grid xs={12} sm={6} md={3}>
          <MetricCard
            title="Outstanding Amount"
            value={formatCurrency(data.totalPending + data.totalOverdue)}
            subtitle={`${((data.totalPending + data.totalOverdue) / data.totalRevenue * 100).toFixed(1)}% of total revenue`}
            color="info"
            icon={<Payment />}
          />
        </Grid>
        
        <Grid xs={12} sm={6} md={3}>
          <MetricCard
            title="Overdue Rate"
            value={`${data.overdueRate.toFixed(1)}%`}
            subtitle="Target: < 5%"
            trend={data.overdueRate < 5 ? 'up' : data.overdueRate > 15 ? 'down' : 'stable'}
            color={data.overdueRate < 5 ? 'success' : data.overdueRate > 15 ? 'error' : 'warning'}
            icon={<Warning />}
            progress={20 - data.overdueRate}
            target={20}
          />
        </Grid>
      </Grid>

      {/* Tabs for different views */}
      <Card>
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{ px: 3, pt: 2 }}
        >
          <Tab label="Payment Distribution" />
          <Tab label="Performance Metrics" />
          {showInsights && <Tab label="Insights & Recommendations" />}
        </Tabs>

        <CardContent>
          <AnimatePresence mode="wait">
            {selectedTab === 0 && (
              <motion.div
                key="distribution"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Grid container spacing={3}>
                  <Grid xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Payment Status Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={paymentStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {paymentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Grid>
                  
                  <Grid xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Payment Breakdown
                    </Typography>
                    <List>
                      {paymentStatusData.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                backgroundColor: item.color,
                                borderRadius: '50%',
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={item.name}
                            secondary={formatCurrency(item.value)}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {((item.value / data.totalRevenue) * 100).toFixed(1)}%
                          </Typography>
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                </Grid>
              </motion.div>
            )}

            {selectedTab === 1 && (
              <motion.div
                key="metrics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Typography variant="h6" gutterBottom>
                  Performance vs Benchmarks
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={performanceMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="current" name="Current" fill="#1976d2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Target" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="benchmark" name="Industry Benchmark" fill="#ed6c02" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {selectedTab === 2 && showInsights && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Typography variant="h6" gutterBottom>
                  AI-Powered Insights & Recommendations
                </Typography>
                
                {insights.length === 0 ? (
                  <Alert severity="info" icon={<Info />}>
                    All payment metrics are within normal ranges. Continue monitoring for trends.
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {insights.map((insight, index) => (
                      <Grid xs={12} key={index}>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Alert
                            severity={insight.type}
                            action={
                              <Button size="small" variant="outlined">
                                {insight.action}
                              </Button>
                            }
                          >
                            <Typography variant="subtitle2" gutterBottom>
                              {insight.title}
                            </Typography>
                            <Typography variant="body2">
                              {insight.description}
                            </Typography>
                          </Alert>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentAnalytics;