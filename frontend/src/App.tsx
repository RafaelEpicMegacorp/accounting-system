import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Box, Button, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth, ProtectedRoute } from './contexts/AuthContext';
import ThemeProvider from './theme/ThemeProvider';
import ThemeToggle from './components/ThemeToggle';
import AppLayout from './components/layout/AppLayout';
import { BreadcrumbProvider } from './components/navigation/BreadcrumbProvider';
import Breadcrumbs from './components/navigation/Breadcrumbs';
import { SlidingPanelProvider } from './components/layout/SlidingPanelProvider';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Orders from './pages/Orders';
import Invoices from './pages/Invoices';
import Services from './pages/Services';
import Login from './pages/Login';
import Register from './pages/Register';

// Simple navigation for unauthenticated users
const SimpleNavigation: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Accounting System
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <ThemeToggle size="small" />
        <Button color="inherit" href="/login">Login</Button>
        <Button color="inherit" href="/register">Register</Button>
      </Toolbar>
    </AppBar>
  );
};

// Page wrapper that adds breadcrumbs for authenticated pages
const AuthenticatedPageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <Breadcrumbs variant="default" />
      {children}
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <BreadcrumbProvider>
            <SlidingPanelProvider>
              <Router>
              <AppLayout>
              <Routes>
                <Route path="/login" element={
                  <>
                    <SimpleNavigation />
                    <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
                      <Login />
                    </Container>
                  </>
                } />
                <Route path="/register" element={
                  <>
                    <SimpleNavigation />
                    <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
                      <Register />
                    </Container>
                  </>
                } />
                <Route path="/" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <AuthenticatedPageWrapper>
                      <Dashboard />
                    </AuthenticatedPageWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/clients" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <AuthenticatedPageWrapper>
                      <Clients />
                    </AuthenticatedPageWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/orders" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <AuthenticatedPageWrapper>
                      <Orders />
                    </AuthenticatedPageWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/invoices" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <AuthenticatedPageWrapper>
                      <Invoices />
                    </AuthenticatedPageWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/services" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <AuthenticatedPageWrapper>
                      <Services />
                    </AuthenticatedPageWrapper>
                  </ProtectedRoute>
                } />
              </Routes>
              </AppLayout>
              </Router>
            </SlidingPanelProvider>
          </BreadcrumbProvider>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
