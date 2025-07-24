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
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { orderService, OrderWithClient } from '../../services/orderService';

interface OrderDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: OrderWithClient | null;
}

const OrderDeleteDialog: React.FC<OrderDeleteDialogProps> = ({
  open,
  onClose,
  onSuccess,
  order,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!order) return;

    setIsDeleting(true);
    setError('');

    try {
      await orderService.deleteOrder(order.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete order');
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

  if (!order) return null;

  const hasInvoices = order._count.invoices > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
        Delete Order
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" gutterBottom>
          Are you sure you want to delete this order?
        </Typography>
        
        <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, my: 2 }}>
          <Typography variant="subtitle2" fontWeight="medium">
            {order.description}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Client: {order.client.name}
            {order.client.company && ` (${order.client.company})`}
          </Typography>
        </Box>

        {hasInvoices ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> This order has {order._count.invoices} associated invoice{order._count.invoices !== 1 ? 's' : ''}. 
              The order will be cancelled instead of permanently deleted to preserve invoice history.
            </Typography>
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              This order has no associated invoices and will be permanently deleted.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={isDeleting}
          startIcon={isDeleting ? <CircularProgress size={20} /> : undefined}
        >
          {isDeleting 
            ? 'Deleting...' 
            : (hasInvoices ? 'Cancel Order' : 'Delete Order')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderDeleteDialog;