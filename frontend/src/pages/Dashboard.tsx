import React from 'react';
import { Typography, Grid, Card, CardContent, Box } from '@mui/material';
import { PeopleAlt, ShoppingCart, Receipt, AttachMoney } from '@mui/icons-material';

const Dashboard: React.FC = () => {
  const stats = [
    { title: 'Total Clients', value: '0', icon: <PeopleAlt />, color: '#1976d2' },
    { title: 'Active Orders', value: '0', icon: <ShoppingCart />, color: '#2e7d32' },
    { title: 'Pending Invoices', value: '0', icon: <Receipt />, color: '#ed6c02' },
    { title: 'Outstanding Amount', value: '$0.00', icon: <AttachMoney />, color: '#d32f2f' },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Welcome to your Recurring Invoice Management System
      </Typography>
      
      <Grid container spacing={3}>
        {stats.map((stat, index) => (
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