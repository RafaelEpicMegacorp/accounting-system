import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, AppBar, Toolbar, Typography, Box, Button, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth, ProtectedRoute } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Orders from './pages/Orders';
import Invoices from './pages/Invoices';
import Services from './pages/Services';
import Login from './pages/Login';
import Register from './pages/Register';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Navigation component with auth awareness
const Navigation: React.FC = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Accounting System
          </Typography>
          <CircularProgress size={24} color="inherit" />
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Accounting System
        </Typography>
        {isAuthenticated ? (
          <>
            <Button color="inherit" href="/">Dashboard</Button>
            <Button color="inherit" href="/clients">Clients</Button>
            <Button color="inherit" href="/orders">Orders</Button>
            <Button color="inherit" href="/invoices">Invoices</Button>
            <Button color="inherit" href="/services">Services</Button>
            <Typography variant="body2" sx={{ mx: 2 }}>
              Hello, {user?.name}
            </Typography>
            <Button color="inherit" onClick={logout}>Logout</Button>
          </>
        ) : (
          <>
            <Button color="inherit" href="/login">Login</Button>
            <Button color="inherit" href="/register">Register</Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navigation />
            
            <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/clients" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <Clients />
                  </ProtectedRoute>
                } />
                <Route path="/orders" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <Orders />
                  </ProtectedRoute>
                } />
                <Route path="/invoices" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <Invoices />
                  </ProtectedRoute>
                } />
                <Route path="/services" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <Services />
                  </ProtectedRoute>
                } />
              </Routes>
            </Container>
            
            <Box component="footer" sx={{ py: 2, mt: 'auto', backgroundColor: 'grey.100' }}>
              <Container maxWidth="lg">
                <Typography variant="body2" color="text.secondary" align="center">
                  © 2024 Accounting System. Built with React and Material-UI.
                </Typography>
              </Container>
            </Box>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
