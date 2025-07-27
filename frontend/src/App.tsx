import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import ThemeProvider from './theme/ThemeProvider';
import ThemeToggle from './components/ThemeToggle';
import AppLayout from './components/layout/AppLayout';
import { BreadcrumbProvider } from './components/navigation/BreadcrumbProvider';
import Breadcrumbs from './components/navigation/Breadcrumbs';
import { SlidingPanelProvider } from './components/layout/SlidingPanelProvider';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Orders = lazy(() => import('./pages/Orders'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Services = lazy(() => import('./pages/Services'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

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
                      <Suspense fallback={<LoadingSpinner message="Loading..." />}>
                        <Login />
                      </Suspense>
                    </Container>
                  </>
                } />
                <Route path="/register" element={
                  <>
                    <SimpleNavigation />
                    <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
                      <Suspense fallback={<LoadingSpinner message="Loading..." />}>
                        <Register />
                      </Suspense>
                    </Container>
                  </>
                } />
                <Route path="/" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <AuthenticatedPageWrapper>
                      <Suspense fallback={<LoadingSpinner message="Loading dashboard..." />}>
                        <Dashboard />
                      </Suspense>
                    </AuthenticatedPageWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/clients" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <AuthenticatedPageWrapper>
                      <Suspense fallback={<LoadingSpinner message="Loading clients..." />}>
                        <Clients />
                      </Suspense>
                    </AuthenticatedPageWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/orders" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <AuthenticatedPageWrapper>
                      <Suspense fallback={<LoadingSpinner message="Loading orders..." />}>
                        <Orders />
                      </Suspense>
                    </AuthenticatedPageWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/invoices" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <AuthenticatedPageWrapper>
                      <Suspense fallback={<LoadingSpinner message="Loading invoices..." />}>
                        <Invoices />
                      </Suspense>
                    </AuthenticatedPageWrapper>
                  </ProtectedRoute>
                } />
                <Route path="/services" element={
                  <ProtectedRoute fallback={<Navigate to="/login" replace />}>
                    <AuthenticatedPageWrapper>
                      <Suspense fallback={<LoadingSpinner message="Loading services..." />}>
                        <Services />
                      </Suspense>
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
