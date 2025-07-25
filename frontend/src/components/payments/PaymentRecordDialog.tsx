import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  paymentService,
  PaymentFormData,
  PaymentMethod,
  getPaymentMethodOptions,
  formatCurrency,
  validatePaymentAmount,
} from '../../services/paymentService';
import { InvoiceDetail } from '../../services/invoiceService';

interface PaymentRecordDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceDetail | null;
  remainingAmount: number;
  onPaymentRecorded: () => void;
}

const PaymentRecordDialog: React.FC<PaymentRecordDialogProps> = ({
  open,
  onClose,
  invoice,
  remainingAmount,
  onPaymentRecorded,
}) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: remainingAmount,
    method: 'BANK_TRANSFER',
    paidDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice) return;

    // Validate amount
    const amountError = validatePaymentAmount(formData.amount, remainingAmount);
    if (amountError) {
      setError(amountError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await paymentService.recordPayment(invoice.id, formData);
      onPaymentRecorded();
      handleClose();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      setError(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      amount: remainingAmount,
      method: 'BANK_TRANSFER',
      paidDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setError(null);
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData(prev => ({ ...prev, amount: value }));
    setError(null);
  };

  const handleMethodChange = (e: any) => {
    setFormData(prev => ({ ...prev, method: e.target.value as PaymentMethod }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, paidDate: date.toISOString().split('T')[0] }));
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, notes: e.target.value }));
  };

  const isFullPayment = formData.amount >= remainingAmount;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Record Payment
        </Typography>
        {invoice && (
          <Typography variant="body2" color="text.secondary">
            Invoice {invoice.invoiceNumber} - {invoice.client.name}
          </Typography>
        )}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {invoice && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Invoice Summary
              </Typography>
              <Typography variant="body2">
                <strong>Total Amount:</strong> {formatCurrency(invoice.amount)}
              </Typography>
              <Typography variant="body2">
                <strong>Remaining Balance:</strong> {formatCurrency(remainingAmount)}
              </Typography>
            </Box>
          )}

          <TextField
            label="Payment Amount"
            type="number"
            value={formData.amount}
            onChange={handleAmountChange}
            fullWidth
            required
            inputProps={{
              min: 0.01,
              max: remainingAmount,
              step: 0.01,
            }}
            sx={{ mb: 2 }}
            helperText={
              isFullPayment 
                ? "This will fully pay the invoice" 
                : `Maximum: ${formatCurrency(remainingAmount)}`
            }
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={formData.method}
              onChange={handleMethodChange}
              label="Payment Method"
              required
            >
              {getPaymentMethodOptions().map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Payment Date"
              value={formData.paidDate ? new Date(formData.paidDate) : null}
              onChange={handleDateChange}
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: { mb: 2 },
                  required: true,
                }
              }}
            />
          </LocalizationProvider>

          <TextField
            label="Notes (Optional)"
            value={formData.notes}
            onChange={handleNotesChange}
            fullWidth
            multiline
            rows={3}
            placeholder="Add any notes about this payment..."
            sx={{ mb: 2 }}
          />

          {isFullPayment && (
            <Alert severity="success" sx={{ mt: 2 }}>
              This payment will mark the invoice as PAID
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={handleClose} 
            color="inherit"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || formData.amount <= 0}
            startIcon={loading && <CircularProgress size={20} />}
          >
            Record Payment
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PaymentRecordDialog;