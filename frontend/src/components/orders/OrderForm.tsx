import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Card,
  CardContent,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import { Schedule as ScheduleIcon, AttachMoney as MoneyIcon } from '@mui/icons-material';
import { 
  orderService, 
  Order, 
  OrderFormData, 
  OrderFrequency,
  getFrequencyOptions,
  getFrequencyDisplayText,
  formatCurrency,
  formatDate,
  calculateEstimatedAnnualRevenue
} from '../../services/orderService';
import { clientService, Client } from '../../services/clientService';

interface OrderFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (order: Order) => void;
  order?: Order | null; // If provided, we're editing
  title?: string;
  preselectedClientId?: string;
}

const OrderForm: React.FC<OrderFormProps> = ({
  open,
  onClose,
  onSuccess,
  order = null,
  title,
  preselectedClientId,
}) => {
  const [formData, setFormData] = useState<OrderFormData>({
    clientId: '',
    description: '',
    amount: 0,
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0], // Today's date
    customDays: undefined,
    leadTimeDays: undefined,
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [errors, setErrors] = useState<Partial<OrderFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingClients, setLoadingClients] = useState(false);

  const isEditing = Boolean(order);
  const dialogTitle = title || (isEditing ? 'Edit Order' : 'Create New Order');

  // Load clients
  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await clientService.getClients({ limit: 100 });
      setClients(response.clients);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  // Initialize form data when order changes
  useEffect(() => {
    if (order) {
      setFormData({
        clientId: order.clientId,
        description: order.description,
        amount: order.amount,
        frequency: order.frequency,
        startDate: order.startDate.split('T')[0],
        customDays: order.customDays || undefined,
        leadTimeDays: order.leadTimeDays || undefined,
      });
      
      // Find and set selected client
      const client = clients.find(c => c.id === order.clientId);
      setSelectedClient(client || null);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        clientId: preselectedClientId || '',
        description: '',
        amount: 0,
        frequency: 'MONTHLY',
        startDate: today,
        customDays: undefined,
        leadTimeDays: undefined,
      });
      
      // Find and set preselected client
      if (preselectedClientId) {
        const client = clients.find(c => c.id === preselectedClientId);
        setSelectedClient(client || null);
      } else {
        setSelectedClient(null);
      }
    }
    setErrors({});
    setError('');
  }, [order, open, clients, preselectedClientId]);

  // Load clients when dialog opens
  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  // Handle input changes
  const handleInputChange = (field: keyof OrderFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle client selection
  const handleClientChange = (client: Client | null) => {
    setSelectedClient(client);
    setFormData(prev => ({ ...prev, clientId: client?.id || '' }));
    
    if (errors.clientId) {
      setErrors(prev => ({ ...prev, clientId: undefined }));
    }
  };

  // Handle frequency change
  const handleFrequencyChange = (frequency: OrderFrequency) => {
    setFormData(prev => ({
      ...prev,
      frequency,
      customDays: frequency === 'CUSTOM' ? 30 : undefined,
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<OrderFormData> = {};

    // Client validation
    if (!formData.clientId) {
      newErrors.clientId = 'Please select a client';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 5) {
      newErrors.description = 'Description must be at least 5 characters';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must not exceed 500 characters';
    }

    // Amount validation
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (formData.amount > 999999.99) {
      newErrors.amount = 'Amount must not exceed $999,999.99';
    }

    // Custom days validation
    if (formData.frequency === 'CUSTOM') {
      if (!formData.customDays || formData.customDays < 1 || formData.customDays > 365) {
        newErrors.customDays = 'Custom days must be between 1 and 365';
      }
    }

    // Start date validation
    const startDate = new Date(formData.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      newErrors.startDate = 'Start date cannot be in the past';
    }

    // Lead time validation
    if (formData.leadTimeDays !== undefined && 
        (formData.leadTimeDays < 0 || formData.leadTimeDays > 30)) {
      newErrors.leadTimeDays = 'Lead time must be between 0 and 30 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let savedOrder: Order;

      const submitData = {
        ...formData,
        amount: Number(formData.amount),
        customDays: formData.frequency === 'CUSTOM' ? formData.customDays : undefined,
      };

      if (isEditing && order) {
        savedOrder = await orderService.updateOrder(order.id, submitData);
      } else {
        savedOrder = await orderService.createOrder(submitData);
      }

      onSuccess(savedOrder);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} order`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Calculate estimated revenue
  const estimatedRevenue = calculateEstimatedAnnualRevenue(
    formData.amount,
    formData.frequency,
    formData.customDays
  );

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>{dialogTitle}</DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Client Selection */}
          <Grid xs={12}>
            <Autocomplete
              options={clients}
              getOptionLabel={(option) => `${option.name} ${option.company ? `(${option.company})` : ''}`}
              value={selectedClient}
              onChange={(_, newValue) => handleClientChange(newValue)}
              loading={loadingClients}
              disabled={isSubmitting}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Client"
                  required
                  error={Boolean(errors.clientId)}
                  helperText={errors.clientId}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingClients ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* Description */}
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange('description')}
              error={Boolean(errors.description)}
              helperText={errors.description}
              required
              disabled={isSubmitting}
              multiline
              rows={2}
              placeholder="e.g., Monthly website maintenance, Weekly cleaning service..."
            />
          </Grid>

          {/* Amount and Frequency */}
          <Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="Amount"
              name="amount"
              type="number"
              value={formData.amount || ''}
              onChange={handleInputChange('amount')}
              error={Boolean(errors.amount)}
              helperText={errors.amount}
              required
              disabled={isSubmitting}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{
                min: 0,
                step: 0.01,
              }}
            />
          </Grid>

          <Grid xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={formData.frequency}
                label="Frequency"
                onChange={(e) => handleFrequencyChange(e.target.value as OrderFrequency)}
                disabled={isSubmitting}
              >
                {getFrequencyOptions().map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Custom Days (if frequency is CUSTOM) */}
          {formData.frequency === 'CUSTOM' && (
            <Grid xs={12} md={6}>
              <TextField
                fullWidth
                label="Custom Days"
                name="customDays"
                type="number"
                value={formData.customDays || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  customDays: parseInt(e.target.value) || undefined 
                }))}
                error={Boolean(errors.customDays)}
                helperText={errors.customDays || 'Number of days between invoices (1-365)'}
                required
                disabled={isSubmitting}
                inputProps={{
                  min: 1,
                  max: 365,
                }}
              />
            </Grid>
          )}

          {/* Start Date */}
          <Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="Start Date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleInputChange('startDate')}
              error={Boolean(errors.startDate)}
              helperText={errors.startDate}
              required
              disabled={isSubmitting}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          {/* Lead Time (Optional) */}
          <Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="Lead Time (Days)"
              name="leadTimeDays"
              type="number"
              value={formData.leadTimeDays || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                leadTimeDays: parseInt(e.target.value) || undefined 
              }))}
              error={Boolean(errors.leadTimeDays)}
              helperText={errors.leadTimeDays || 'Days before due date to generate invoice (optional)'}
              disabled={isSubmitting}
              inputProps={{
                min: 0,
                max: 30,
              }}
            />
          </Grid>

          {/* Order Summary */}
          {formData.amount > 0 && (
            <Grid xs={12}>
              <Card sx={{ bgcolor: 'grey.50' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                    Order Summary
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Billing Frequency
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {getFrequencyDisplayText(formData.frequency, formData.customDays)}
                      </Typography>
                    </Grid>
                    
                    <Grid xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Amount per Invoice
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formatCurrency(formData.amount)}
                      </Typography>
                    </Grid>
                    
                    <Grid xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Estimated Annual Revenue
                      </Typography>
                      <Typography variant="h6" color="primary.main" sx={{ display: 'flex', alignItems: 'center' }}>
                        <MoneyIcon sx={{ mr: 0.5, fontSize: 20 }} />
                        {formatCurrency(estimatedRevenue)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : undefined}
        >
          {isSubmitting 
            ? (isEditing ? 'Updating...' : 'Creating...')
            : (isEditing ? 'Update Order' : 'Create Order')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderForm;