import React, { useState, useCallback } from 'react';
import { 
  Typography, 
  Box, 
  Button, 
  Alert,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import { 
  Add as AddIcon,
  Receipt as ReceiptIcon,
  PlayArrow as GenerateIcon,
} from '@mui/icons-material';
import InvoiceList from '../components/invoices/InvoiceList';
import InvoiceForm from '../components/invoices/InvoiceForm';
import InvoiceDeleteDialog from '../components/invoices/InvoiceDeleteDialog';
import { 
  InvoiceWithRelations, 
  InvoiceStatus, 
  invoiceService,
  formatCurrency 
} from '../services/invoiceService';
import { orderService } from '../services/orderService';

const Invoices: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState('');
  const [generateError, setGenerateError] = useState('');

  // Refresh invoices list
  const refreshInvoices = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Handle create invoice
  const handleCreateClick = () => {
    setShowCreateForm(true);
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    refreshInvoices();
  };

  const handleCreateClose = () => {
    setShowCreateForm(false);
  };

  // Handle delete invoice
  const handleDeleteInvoice = (invoice: InvoiceWithRelations) => {
    setSelectedInvoice(invoice);
    setShowDeleteDialog(true);
  };

  const handleDeleteSuccess = () => {
    setShowDeleteDialog(false);
    setSelectedInvoice(null);
    refreshInvoices();
  };

  const handleDeleteClose = () => {
    setShowDeleteDialog(false);
    setSelectedInvoice(null);
  };

  // Handle status change
  const handleStatusChange = async (invoice: InvoiceWithRelations, newStatus: InvoiceStatus) => {
    try {
      setStatusUpdateError('');
      await invoiceService.updateInvoiceStatus(invoice.id, newStatus);
      refreshInvoices();
    } catch (err: any) {
      setStatusUpdateError(
        err.response?.data?.message || `Failed to update invoice status to ${newStatus}`
      );
    }
  };

  // Handle invoice selection (for future invoice details view)  
  const handleInvoiceSelect = (invoice: InvoiceWithRelations) => {
    // TODO: Navigate to invoice details page or show invoice details modal
    // For now, selection is handled silently
  };

  // Handle generate invoices from due orders
  const handleGenerateInvoices = async () => {
    try {
      setGenerateError('');
      setGenerateSuccess('');

      // Get orders that are due for invoice generation
      const response = await orderService.getOrders({ 
        status: 'ACTIVE',
        limit: 100 
      });

      const dueOrders = response.orders.filter(order => {
        const nextInvoiceDate = new Date(order.nextInvoiceDate);
        const now = new Date();
        return nextInvoiceDate <= now;
      });

      if (dueOrders.length === 0) {
        setGenerateSuccess('No orders are currently due for invoice generation.');
        return;
      }

      let generatedCount = 0;
      const errors: string[] = [];

      for (const order of dueOrders) {
        try {
          await invoiceService.generateInvoiceFromOrder(order.id);
          generatedCount++;
        } catch (err: any) {
          errors.push(`${order.description}: ${err.response?.data?.message || 'Failed to generate'}`);
        }
      }

      if (generatedCount > 0) {
        setGenerateSuccess(
          `Successfully generated ${generatedCount} invoice${generatedCount > 1 ? 's' : ''} from due orders.`
        );
        refreshInvoices();
      }

      if (errors.length > 0) {
        setGenerateError(
          `Some invoices could not be generated: ${errors.join('; ')}`
        );
      }
    } catch (err: any) {
      setGenerateError(
        err.response?.data?.message || 'Failed to generate invoices from orders'
      );
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
          <ReceiptIcon sx={{ mr: 1 }} />
          Invoices
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Generate invoices from due orders">
            <Button
              variant="outlined"
              startIcon={<GenerateIcon />}
              onClick={handleGenerateInvoices}
            >
              Generate from Orders
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
          >
            Create Manual Invoice
          </Button>
        </Box>
      </Box>

      {/* Success Messages */}
      {generateSuccess && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          onClose={() => setGenerateSuccess('')}
        >
          {generateSuccess}
        </Alert>
      )}

      {/* Error Messages */}
      {statusUpdateError && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setStatusUpdateError('')}
        >
          {statusUpdateError}
        </Alert>
      )}

      {generateError && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          onClose={() => setGenerateError('')}
        >
          {generateError}
        </Alert>
      )}

      {/* Quick Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Invoices
              </Typography>
              <Typography variant="h5">
                {/* This would come from invoice statistics API */}
                --
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Outstanding Amount
              </Typography>
              <Typography variant="h5" color="warning.main">
                {/* This would come from invoice statistics API */}
                --
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Paid This Month
              </Typography>
              <Typography variant="h5" color="success.main">
                {/* This would come from invoice statistics API */}
                --
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Overdue Invoices
              </Typography>
              <Typography variant="h5" color="error.main">
                {/* This would come from invoice statistics API */}
                --
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invoices List */}
      <InvoiceList
        onInvoiceSelect={handleInvoiceSelect}
        onInvoiceEdit={handleInvoiceSelect} // For now, same as select
        onInvoiceDelete={handleDeleteInvoice}
        onStatusChange={handleStatusChange}
        refreshTrigger={refreshTrigger}
      />

      {/* Create Invoice Form */}
      <InvoiceForm
        open={showCreateForm}
        onClose={handleCreateClose}
        onSuccess={handleCreateSuccess}
        title="Create Manual Invoice"
      />

      {/* Delete Invoice Dialog */}
      <InvoiceDeleteDialog
        open={showDeleteDialog}
        onClose={handleDeleteClose}
        onSuccess={handleDeleteSuccess}
        invoice={selectedInvoice}
      />
    </Box>
  );
};

export default Invoices;