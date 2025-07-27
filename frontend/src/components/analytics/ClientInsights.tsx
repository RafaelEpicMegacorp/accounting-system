import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Badge,
  Tooltip,
  LinearProgress,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Person,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Schedule,
  AttachMoney,
  Star,
  ExpandMore,
  Visibility,
  ContactPhone,
  Business,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientInsight } from '../../hooks/useAnalytics';
import { formatCurrency } from '../../services/invoiceService';

export interface ClientInsightsProps {
  clientInsights: ClientInsight[];
  isLoading?: boolean;
  onClientClick?: (clientId: string) => void;
  showFullDetails?: boolean;
}

interface RiskLevelProps {
  level: 'low' | 'medium' | 'high';
  size?: 'small' | 'medium';
}

const RiskLevelIndicator: React.FC<RiskLevelProps> = ({ level, size = 'medium' }) => {
  const getColor = () => {
    switch (level) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const getIcon = () => {
    switch (level) {
      case 'low': return <CheckCircle fontSize="small" />;
      case 'medium': return <Warning fontSize="small" />;
      case 'high': return <Warning fontSize="small" />;
      default: return null;
    }
  };

  return (
    <Chip
      label={level.toUpperCase()}
      color={getColor() as any}
      size={size}
      icon={getIcon()}
      variant="outlined"
    />
  );
};

const ClientInsights: React.FC<ClientInsightsProps> = ({
  clientInsights,
  isLoading = false,
  onClientClick,
  showFullDetails = true,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [sortBy, setSortBy] = useState<'spending' | 'reliability' | 'risk'>('spending');

  // Sort and categorize clients
  const categorizedClients = useMemo(() => {
    const sorted = [...clientInsights].sort((a, b) => {
      switch (sortBy) {
        case 'spending':
          return b.totalSpent - a.totalSpent;
        case 'reliability':
          return b.paymentReliability - a.paymentReliability;
        case 'risk':
          const riskOrder = { high: 3, medium: 2, low: 1 };
          return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        default:
          return b.totalSpent - a.totalSpent;
      }
    });

    return {
      topClients: sorted.slice(0, 10),
      highRisk: sorted.filter(client => client.riskLevel === 'high'),
      reliable: sorted.filter(client => client.paymentReliability > 90 && client.invoiceCount >= 3),
      newClients: sorted.filter(client => client.invoiceCount <= 2),
    };
  }, [clientInsights, sortBy]);

  // Prepare data for charts
  const spendingDistribution = useMemo(() => {
    const ranges = [
      { label: '$0-1K', min: 0, max: 1000, count: 0, total: 0 },
      { label: '$1K-5K', min: 1000, max: 5000, count: 0, total: 0 },
      { label: '$5K-10K', min: 5000, max: 10000, count: 0, total: 0 },
      { label: '$10K-25K', min: 10000, max: 25000, count: 0, total: 0 },
      { label: '$25K+', min: 25000, max: Infinity, count: 0, total: 0 },
    ];

    clientInsights.forEach(client => {
      const range = ranges.find(r => client.totalSpent >= r.min && client.totalSpent < r.max);
      if (range) {
        range.count++;
        range.total += client.totalSpent;
      }
    });

    return ranges.filter(range => range.count > 0);
  }, [clientInsights]);

  const reliabilityData = useMemo(() => {
    const ranges = [
      { label: '90-100%', min: 90, max: 100, count: 0, color: '#2e7d32' },
      { label: '70-89%', min: 70, max: 89, count: 0, color: '#ed6c02' },
      { label: '50-69%', min: 50, max: 69, count: 0, color: '#d32f2f' },
      { label: '<50%', min: 0, max: 49, count: 0, color: '#c62828' },
    ];

    clientInsights.forEach(client => {
      const range = ranges.find(r => client.paymentReliability >= r.min && client.paymentReliability <= r.max);
      if (range) {
        range.count++;
      }
    });

    return ranges.filter(range => range.count > 0);
  }, [clientInsights]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalRevenue = clientInsights.reduce((sum, client) => sum + client.totalSpent, 0);
    const averageSpending = totalRevenue / clientInsights.length;
    const averageReliability = clientInsights.reduce((sum, client) => sum + client.paymentReliability, 0) / clientInsights.length;
    const riskDistribution = {
      high: clientInsights.filter(c => c.riskLevel === 'high').length,
      medium: clientInsights.filter(c => c.riskLevel === 'medium').length,
      low: clientInsights.filter(c => c.riskLevel === 'low').length,
    };

    return {
      totalRevenue,
      averageSpending,
      averageReliability,
      riskDistribution,
      totalClients: clientInsights.length,
    };
  }, [clientInsights]);

  const renderClientCard = (client: ClientInsight, index: number) => (
    <motion.div
      key={client.clientId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        sx={{ 
          mb: 2, 
          cursor: onClientClick ? 'pointer' : 'default',
          '&:hover': onClientClick ? {
            transform: 'translateY(-2px)',
            boxShadow: 3,
          } : {},
          transition: 'all 0.2s ease-in-out',
        }}
        onClick={() => onClientClick?.(client.clientId)}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <Person />
              </Avatar>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {client.clientName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" color="primary">
                {formatCurrency(client.totalSpent)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <RiskLevelIndicator level={client.riskLevel} size="small" />
                <Chip
                  label={`${client.paymentReliability.toFixed(0)}%`}
                  size="small"
                  color={client.paymentReliability > 90 ? 'success' : client.paymentReliability > 70 ? 'warning' : 'error'}
                />
              </Box>
            </Box>
          </Box>
          
          {showFullDetails && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Payment Reliability: {client.paymentReliability.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={client.paymentReliability}
                color={client.paymentReliability > 90 ? 'success' : client.paymentReliability > 70 ? 'warning' : 'error'}
                sx={{ height: 6, borderRadius: 3 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Avg Invoice: {formatCurrency(client.averageInvoiceValue)}
                </Typography>
                {client.lastPaymentDate && (
                  <Typography variant="caption" color="text.secondary">
                    Last paid: {new Date(client.lastPaymentDate).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <Box>
      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Business color="primary" />
                <Box>
                  <Typography variant="h6">{summaryStats.totalClients}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Clients
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AttachMoney color="success" />
                <Box>
                  <Typography variant="h6">{formatCurrency(summaryStats.averageSpending)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Spending
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircle color="info" />
                <Box>
                  <Typography variant="h6">{summaryStats.averageReliability.toFixed(1)}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Reliability
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Warning color="warning" />
                <Box>
                  <Typography variant="h6">{summaryStats.riskDistribution.high}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    High Risk Clients
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Card>
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{ px: 3, pt: 2 }}
        >
          <Tab label="Top Clients" />
          <Tab label="Risk Analysis" />
          <Tab label="Spending Patterns" />
          <Tab label="Reliability Metrics" />
        </Tabs>

        <CardContent>
          <AnimatePresence mode="wait">
            {selectedTab === 0 && (
              <motion.div
                key="top-clients"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">Top Clients by Spending</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant={sortBy === 'spending' ? 'contained' : 'outlined'}
                      onClick={() => setSortBy('spending')}
                    >
                      Spending
                    </Button>
                    <Button
                      size="small"
                      variant={sortBy === 'reliability' ? 'contained' : 'outlined'}
                      onClick={() => setSortBy('reliability')}
                    >
                      Reliability
                    </Button>
                  </Box>
                </Box>
                
                {categorizedClients.topClients.map((client, index) => 
                  renderClientCard(client, index)
                )}
              </motion.div>
            )}

            {selectedTab === 1 && (
              <motion.div
                key="risk-analysis"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      High Risk Clients
                    </Typography>
                    {categorizedClients.highRisk.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No high-risk clients identified.
                      </Typography>
                    ) : (
                      categorizedClients.highRisk.map((client, index) => 
                        renderClientCard(client, index)
                      )
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Most Reliable Clients
                    </Typography>
                    {categorizedClients.reliable.map((client, index) => 
                      renderClientCard(client, index)
                    )}
                  </Grid>
                </Grid>
              </motion.div>
            )}

            {selectedTab === 2 && (
              <motion.div
                key="spending-patterns"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6" gutterBottom>
                      Spending Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={spendingDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value, name) => [
                            name === 'count' ? `${value} clients` : formatCurrency(value as number),
                            name === 'count' ? 'Clients' : 'Total Revenue'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="count" name="Clients" fill="#1976d2" />
                        <Bar dataKey="total" name="Revenue" fill="#2e7d32" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Typography variant="h6" gutterBottom>
                      Client Value Tiers
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={spendingDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ label, count }) => `${label} (${count})`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {spendingDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Grid>
                </Grid>
              </motion.div>
            )}

            {selectedTab === 3 && (
              <motion.div
                key="reliability-metrics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Typography variant="h6" gutterBottom>
                  Payment Reliability Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={reliabilityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => [`${value} clients`, 'Count']} />
                    <Bar dataKey="count" fill="#1976d2">
                      {reliabilityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ClientInsights;