import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  paymentService,
  PaymentHistory,
  Payment,
  formatCurrency,
  formatDateTime,
  getPaymentMethodLabel,
} from '../../services/paymentService';

interface PaymentHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  invoiceId: string | null;
  onPaymentDeleted?: () => void;
}

const PaymentHistoryDialog: React.FC<PaymentHistoryDialogProps> = ({
  open,
  onClose,
  invoiceId,
  onPaymentDeleted,
}) => {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (open && invoiceId) {
      loadPaymentHistory();
    }
  }, [open, invoiceId]);

  const loadPaymentHistory = async () => {
    if (!invoiceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const history = await paymentService.getInvoicePaymentHistory(invoiceId);
      setPaymentHistory(history);
    } catch (error: any) {
      console.error('Error loading payment history:', error);
      setError(error.response?.data?.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    setDeletingPaymentId(paymentId);
    
    try {
      await paymentService.deletePayment(paymentId);
      await loadPaymentHistory(); // Reload to get updated data
      if (onPaymentDeleted) {
        onPaymentDeleted();
      }
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      setError(error.response?.data?.message || 'Failed to delete payment');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER':
        return 'primary';
      case 'CREDIT_CARD':
        return 'secondary';
      case 'CHECK':
        return 'success';
      case 'CASH':
        return 'warning';
      case 'OTHER':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Payment History
        </Typography>
        {paymentHistory && (
          <Typography variant="body2" color="text.secondary">
            Invoice {paymentHistory.invoice.invoiceNumber} - {paymentHistory.invoice.client.name}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {paymentHistory && !loading && (
          <>
            {/* Payment Summary */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Payment Summary
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2">
                    <strong>Invoice Total:</strong> {formatCurrency(paymentHistory.invoice.amount)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Total Paid:</strong> {formatCurrency(paymentHistory.summary.totalPaid)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Remaining Balance:</strong> {formatCurrency(paymentHistory.summary.remainingAmount)}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Chip
                    label={paymentHistory.summary.isFullyPaid ? 'Fully Paid' : 'Partially Paid'}
                    color={paymentHistory.summary.isFullyPaid ? 'success' : 'warning'}
                    variant="filled"
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {paymentHistory.summary.paymentCount} payment{paymentHistory.summary.paymentCount !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Payment History Table */}
            {paymentHistory.payments.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Payment Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentHistory.payments.map((payment) => (
                      <TableRow
                        key={payment.id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(payment.paidDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(payment.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getPaymentMethodLabel(payment.method)}
                            color={getPaymentMethodColor(payment.method) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {payment.notes || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" justifyContent="center" gap={1}>
                            <Tooltip title="Edit Payment">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  // TODO: Implement edit functionality
                                  // Payment edit functionality will be added later
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Payment">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeletePayment(payment.id)}
                                disabled={deletingPaymentId === payment.id}
                              >
                                {deletingPaymentId === payment.id ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <DeleteIcon />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No payments have been recorded for this invoice yet.
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentHistoryDialog;