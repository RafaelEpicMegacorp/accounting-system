import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { 
  Warning as WarningIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { 
  invoiceService, 
  InvoiceWithRelations,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusDisplayText,
} from '../../services/invoiceService';

interface InvoiceDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: InvoiceWithRelations | null;
}

const InvoiceDeleteDialog: React.FC<InvoiceDeleteDialogProps> = ({
  open,
  onClose,
  onSuccess,
  invoice,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!invoice) return;

    setIsDeleting(true);
    setError('');

    try {
      await invoiceService.deleteInvoice(invoice.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError('');
      onClose();
    }
  };

  if (!invoice) return null;

  const canDelete = invoice.status === 'DRAFT';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <WarningIcon sx={{ mr: 1, color: canDelete ? 'warning.main' : 'error.main' }} />
        {canDelete ? 'Delete Invoice' : 'Cannot Delete Invoice'}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {canDelete ? (
          <>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </Typography>
            
            <Card sx={{ mt: 2, bgcolor: 'grey.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <ReceiptIcon sx={{ mr: 2, mt: 0.5, color: 'primary.main' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="medium">
                      {invoice.invoiceNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Issued {formatDate(invoice.issueDate)} • Due {formatDate(invoice.dueDate)}
                    </Typography>
                  </Box>
                  <Chip
                    label={getStatusDisplayText(invoice.status)}
                    color={getStatusColor(invoice.status)}
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    <strong>Client:</strong> {invoice.client.name}
                    {invoice.client.company && ` (${invoice.client.company})`}
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Order:</strong> {invoice.order?.description || 'Manual Invoice'}
                </Typography>

                <Typography variant="body2">
                  <strong>Amount:</strong> {formatCurrency(invoice.amount)}
                </Typography>
              </CardContent>
            </Card>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Only draft invoices can be deleted. Once an invoice is sent, 
                it should be cancelled instead to maintain proper audit trails.
              </Typography>
            </Alert>
          </>
        ) : (
          <>
            <Typography variant="body1" gutterBottom>
              This invoice cannot be deleted because it has already been sent or processed.
            </Typography>

            <Card sx={{ mt: 2, bgcolor: 'grey.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <ReceiptIcon sx={{ mr: 2, mt: 0.5, color: 'primary.main' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="medium">
                      {invoice.invoiceNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current Status: 
                      <Chip
                        label={getStatusDisplayText(invoice.status)}
                        color={getStatusColor(invoice.status)}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Client:</strong> {invoice.client.name}
                  {invoice.client.company && ` (${invoice.client.company})`}
                </Typography>

                <Typography variant="body2">
                  <strong>Amount:</strong> {formatCurrency(invoice.amount)}
                </Typography>
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Alternative:</strong> If you need to cancel this invoice, 
                you can change its status to "Cancelled" from the invoice actions menu. 
                This will maintain the invoice record for audit purposes while marking it as inactive.
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={isDeleting}
        >
          {canDelete ? 'Cancel' : 'Close'}
        </Button>
        {canDelete && (
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : undefined}
          >
            {isDeleting ? 'Deleting...' : 'Delete Invoice'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceDeleteDialog;