import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Tabs,
  Tab,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  Schedule,
  AttachMoney,
  Warning,
  Timeline as TimelineIcon,
  Insights,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import PaymentTimeline from '../invoices/PaymentTimeline';
import PaymentStatusIndicator from '../invoices/PaymentStatusIndicator';
import InvoiceAgingBadge from '../invoices/InvoiceAgingBadge';
import { formatCurrency } from '../../services/invoiceService';

interface PaymentInsight {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon: React.ReactNode;
}

interface PaymentInsightsWidgetProps {
  className?: string;
}

const PaymentInsightsWidget: React.FC<PaymentInsightsWidgetProps> = ({ className }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);

  // Mock data for demonstration
  const paymentInsights: PaymentInsight[] = [
    {
      label: 'Avg Collection Time',
      value: '18 days',
      trend: 'down',
      color: 'success',
      icon: <Schedule />,
    },
    {
      label: 'Outstanding Amount',
      value: formatCurrency(24750),
      trend: 'up',
      color: 'warning',
      icon: <AttachMoney />,
    },
    {
      label: 'Payment Rate',
      value: '87%',
      trend: 'up',
      color: 'success',
      icon: <TrendingUp />,
    },
    {
      label: 'Overdue Invoices',
      value: 12,
      trend: 'down',
      color: 'error',
      icon: <Warning />,
    },
  ];

  const samplePaymentEvents = [
    {
      id: '1',
      type: 'created' as const,
      date: '2025-01-15T09:00:00Z',
      description: 'Invoice INV-2025-001 created for web development services',
    },
    {
      id: '2',
      type: 'sent' as const,
      date: '2025-01-15T14:30:00Z',
      description: 'Invoice sent via email to client',
    },
    {
      id: '3',
      type: 'viewed' as const,
      date: '2025-01-16T10:15:00Z',
      description: 'Client opened and viewed the invoice',
    },
    {
      id: '4',
      type: 'partial_payment' as const,
      date: '2025-01-20T16:45:00Z',
      amount: 1500,
      description: 'Partial payment received via bank transfer',
    },
    {
      id: '5',
      type: 'reminder' as const,
      date: '2025-01-25T11:00:00Z',
      description: 'Payment reminder sent to client',
    },
    {
      id: '6',
      type: 'paid' as const,
      date: '2025-01-26T09:30:00Z',
      amount: 1500,
      description: 'Final payment received - invoice fully paid',
    },
  ];

  const sampleStatuses = [
    { status: 'paid' as const, amount: 5000, paidAmount: 5000, dueDate: '2025-01-15' },
    { status: 'partial' as const, amount: 3000, paidAmount: 1500, dueDate: '2025-01-20' },
    { status: 'pending' as const, amount: 2500, paidAmount: 0, dueDate: '2025-02-10' },
    { status: 'overdue' as const, amount: 1800, paidAmount: 0, dueDate: '2025-01-10' },
  ];

  const renderInsightCard = (insight: PaymentInsight, index: number) => (
    <motion.div
      key={insight.label}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card 
        sx={{ 
          height: '100%',
          background: `linear-gradient(135deg, ${insight.color === 'primary' ? '#1976d2' : insight.color === 'success' ? '#2e7d32' : insight.color === 'warning' ? '#ed6c02' : insight.color === 'error' ? '#d32f2f' : '#0288d1'}15, transparent)`,
          border: `1px solid`,
          borderColor: `${insight.color}.main`,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3,
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ color: `${insight.color}.main` }}>
              {insight.icon}
            </Box>
            {insight.trend && (
              <Chip
                label={insight.trend}
                size="small"
                color={insight.trend === 'up' ? 'success' : insight.trend === 'down' ? 'error' : 'default'}
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
          <Typography variant="h5" fontWeight="bold" color={`${insight.color}.main`}>
            {insight.value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {insight.label}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderStatusExamples = () => (
    <Grid container spacing={2}>
      {sampleStatuses.map((status, index) => (
        <Grid xs={12} sm={6} key={index}>
          <Card sx={{ p: 2 }}>
            <PaymentStatusIndicator
              status={status.status}
              amount={status.amount}
              paidAmount={status.paidAmount}
              dueDate={status.dueDate}
              size="medium"
              showProgress={true}
              animated={true}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Due: {new Date(status.dueDate).toLocaleDateString()}
              </Typography>
              <InvoiceAgingBadge
                dueDate={status.dueDate}
                status={status.status}
                variant="chip"
                size="small"
                animated={true}
              />
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <>
      <Card className={className} sx={{ height: '100%' }}>
        <CardHeader
          title="Payment Insights"
          action={
            <Button
              startIcon={<TimelineIcon />}
              onClick={() => setTimelineDialogOpen(true)}
              size="small"
              variant="outlined"
            >
              View Timeline
            </Button>
          }
          avatar={<Insights color="primary" />}
        />
        <CardContent>
          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
            sx={{ mb: 3 }}
            variant="fullWidth"
          >
            <Tab label="Overview" />
            <Tab label="Status Examples" />
          </Tabs>

          {selectedTab === 0 && (
            <Grid container spacing={2}>
              {paymentInsights.map((insight, index) => (
                <Grid xs={12} sm={6} md={3} key={insight.label}>
                  {renderInsightCard(insight, index)}
                </Grid>
              ))}
            </Grid>
          )}

          {selectedTab === 1 && renderStatusExamples()}
        </CardContent>
      </Card>

      {/* Payment Timeline Dialog */}
      <Dialog
        open={timelineDialogOpen}
        onClose={() => setTimelineDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <TimelineIcon sx={{ mr: 1 }} />
          Sample Payment Timeline
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This demonstrates the payment timeline component showing the lifecycle of an invoice payment.
          </Typography>
          <PaymentTimeline
            events={samplePaymentEvents}
            totalAmount={3000}
            currency="USD"
            compact={false}
            animated={true}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimelineDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentInsightsWidget;