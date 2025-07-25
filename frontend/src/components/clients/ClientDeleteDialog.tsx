import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { clientService, type ClientWithCounts } from '../../services/clientService';

interface ClientDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: ClientWithCounts | null;
}

const ClientDeleteDialog: React.FC<ClientDeleteDialogProps> = ({
  open,
  onClose,
  onSuccess,
  client,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!client) return;

    setIsDeleting(true);
    setError('');

    try {
      await clientService.deleteClient(client.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete client');
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

  if (!client) return null;

  const hasOrders = client._count.orders > 0;
  const hasInvoices = client._count.invoices > 0;
  const hasDependencies = hasOrders || hasInvoices;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
          Delete Client
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" gutterBottom>
          Are you sure you want to delete <strong>{client.name}</strong>?
        </Typography>

        {hasDependencies && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Warning:</strong> This client has associated data:
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {hasOrders && (
                <li>
                  <Typography variant="body2">
                    {client._count.orders} order{client._count.orders !== 1 ? 's' : ''}
                  </Typography>
                </li>
              )}
              {hasInvoices && (
                <li>
                  <Typography variant="body2">
                    {client._count.invoices} invoice{client._count.invoices !== 1 ? 's' : ''}
                  </Typography>
                </li>
              )}
            </ul>
            <Typography variant="body2">
              Deleting this client may not be possible if there are active orders or unpaid invoices.
            </Typography>
          </Alert>
        )}

        {!hasDependencies && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              This action cannot be undone. The client and all associated data will be permanently removed.
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
          {isDeleting ? 'Deleting...' : 'Delete Client'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientDeleteDialog;