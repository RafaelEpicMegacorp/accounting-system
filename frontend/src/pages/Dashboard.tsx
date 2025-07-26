import React, { useState, useEffect } from 'react';
import { Typography, Grid, Card, CardContent, Box } from '@mui/material';
import { PeopleAlt, ShoppingCart, Receipt, AttachMoney } from '@mui/icons-material';
import LoadingSpinner from '../components/LoadingSpinner';
import { clientService } from '../services/clientService';
import { orderService } from '../services/orderService';
import { invoiceService } from '../services/invoiceService';
import PaymentInsightsWidget from '../components/dashboard/PaymentInsightsWidget';

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

        setStats({
          totalClients: clientsResponse.pagination.totalCount,
          activeOrders: ordersResponse.pagination.totalCount,
          pendingInvoices: invoicesResponse.pagination.totalCount,
          outstandingAmount: 0 // TODO: Calculate from invoices
        });
      } catch (err: any) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const dashboardStats = [
    { title: 'Total Clients', value: stats.totalClients.toString(), icon: <PeopleAlt />, color: '#1976d2' },
    { title: 'Active Orders', value: stats.activeOrders.toString(), icon: <ShoppingCart />, color: '#2e7d32' },
    { title: 'Pending Invoices', value: stats.pendingInvoices.toString(), icon: <Receipt />, color: '#ed6c02' },
    { title: 'Outstanding Amount', value: `$${stats.outstandingAmount.toFixed(2)}`, icon: <AttachMoney />, color: '#d32f2f' },
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

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Welcome to your Recurring Invoice Management System
      </Typography>
      
      <Grid container spacing={3}>
        {dashboardStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
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
                  <Typography variant="h6" component="div">
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ color: stat.color }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Payment Insights & Analytics
        </Typography>
        <PaymentInsightsWidget />
      </Box>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Recent Activity
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="body2" color="textSecondary">
              No recent activity. Start by adding your first client!
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;