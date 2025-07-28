import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
} from '@mui/material';
import { Refresh, BugReport } from '@mui/icons-material';
import { error } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(err: Error, errorInfo: ErrorInfo) {
    // Log the error to our logging system
    error('Error caught by boundary:', err, errorInfo);
    
    this.setState({
      error: err,
      errorInfo,
    });
  }

  private handleRefresh = () => {
    // Reset the error boundary
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    // Reload the entire page
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
          <Card>
            <CardContent>
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BugReport />
                    {this.props.title || 'Something went wrong'}
                  </Box>
                </AlertTitle>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {this.props.description || 
                    'An unexpected error occurred while loading this component. Please try refreshing or reload the page.'}
                </Typography>
              </Alert>

              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleRefresh}
                  size="small"
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  onClick={this.handleReload}
                  size="small"
                >
                  Reload Page
                </Button>
              </Stack>

              {this.props.showDetails && this.state.error && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle>Error Details</AlertTitle>
                  <Typography variant="body2" component="pre" sx={{ 
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 200,
                    fontFamily: 'monospace'
                  }}>
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;