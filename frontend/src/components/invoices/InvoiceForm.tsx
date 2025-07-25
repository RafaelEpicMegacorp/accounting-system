// @ts-nocheck
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
  Typography,
  Card,
  CardContent,
  InputAdornment,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { 
  Receipt as ReceiptIcon, 
  AttachMoney as MoneyIcon,
  DateRange as DateIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { 
  invoiceService, 
  Invoice, 
  InvoiceFormData,
  formatCurrency,
  formatDate,
  getCurrencyOptions,
  Currency
} from '../../services/invoiceService';
import { clientService, Client } from '../../services/clientService';
import { orderService, OrderWithClient } from '../../services/orderService';
import { companyService, Company } from '../../services/companyService';
import { serviceLibraryService, ServiceLibrary, getServiceCategoryOptions } from '../../services/serviceLibraryService';

interface InvoiceFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (invoice: Invoice) => void;
  title?: string;
  preselectedClientId?: string;
  preselectedOrderId?: string;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  open,
  onClose,
  onSuccess,
  title = 'Create Manual Invoice',
  preselectedClientId,
  preselectedOrderId,
}) => {
  // Calculate default dates (issue date: today, due date: 30 days from today)
  const getDefaultDates = () => {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 30);
    
    return {
      issueDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
    };
  };

  const [formData, setFormData] = useState<InvoiceFormData>(() => {
    const dates = getDefaultDates();
    return {
      clientId: preselectedClientId || '',
      companyId: '',
      orderId: preselectedOrderId,
      amount: 0,
      currency: 'USD',
      issueDate: dates.issueDate,
      dueDate: dates.dueDate,
      items: [],
    };
  });
  
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [services, setServices] = useState<ServiceLibrary[]>([]);
  const [orders, setOrders] = useState<OrderWithClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithClient | null>(null);
  const [errors, setErrors] = useState<Partial<InvoiceFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

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

  // Load companies
  const loadCompanies = async () => {
    try {
      const companiesData = await companyService.getCompanies();
      setCompanies(companiesData);
      // Set first company as default if available
      if (companiesData.length > 0 && !formData.companyId) {
        setSelectedCompany(companiesData[0]);
        setFormData(prev => ({ ...prev, companyId: companiesData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  // Load services
  const loadServices = async () => {
    try {
      const servicesData = await serviceLibraryService.getServices({ isActive: true });
      setServices(servicesData);
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  };

  // Load orders for selected client
  const loadOrdersForClient = async (clientId: string) => {
    try {
      setLoadingOrders(true);
      const response = await orderService.getOrders({ 
        clientId, 
        status: 'ACTIVE',
        limit: 100 
      });
      setOrders(response.orders);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open) {
      const dates = getDefaultDates();
      setFormData({
        clientId: preselectedClientId || '',
        companyId: '',
        orderId: preselectedOrderId,
        amount: 0,
        currency: 'USD',
        issueDate: dates.issueDate,
        dueDate: dates.dueDate,
        items: [],
      });
      setErrors({});
      setError('');
      setSelectedOrder(null);
      setSelectedClient(null);
      setSelectedCompany(null);
      
      // Load initial data
      loadClients();
      loadCompanies();
      loadServices();
      
      // Set preselected client if provided
      if (preselectedClientId) {
        const client = clients.find(c => c.id === preselectedClientId);
        setSelectedClient(client || null);
        if (client) {
          loadOrdersForClient(preselectedClientId);
        }
      } else {
        setOrders([]);
      }
    }
  }, [open, preselectedClientId, preselectedOrderId]);

  // Update selected client when clients load
  useEffect(() => {
    if (preselectedClientId && clients.length > 0) {
      const client = clients.find(c => c.id === preselectedClientId);
      setSelectedClient(client || null);
      if (client) {
        loadOrdersForClient(preselectedClientId);
      }
    }
  }, [clients, preselectedClientId]);

  // Update selected order when orders load
  useEffect(() => {
    if (preselectedOrderId && orders.length > 0) {
      const order = orders.find(o => o.id === preselectedOrderId);
      setSelectedOrder(order || null);
      if (order) {
        setFormData(prev => ({ ...prev, amount: order.amount }));
      }
    }
  }, [orders, preselectedOrderId]);

  // Handle input changes
  const handleInputChange = (field: keyof InvoiceFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'amount' ? parseFloat(event.target.value) || 0 : event.target.value;
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
    setSelectedOrder(null);
    setFormData(prev => ({ ...prev, orderId: undefined, amount: 0 }));
    
    if (client) {
      loadOrdersForClient(client.id);
    } else {
      setOrders([]);
    }
    
    if (errors.clientId) {
      setErrors(prev => ({ ...prev, clientId: undefined }));
    }
  };

  // Handle company selection
  const handleCompanyChange = (company: Company | null) => {
    setSelectedCompany(company);
    setFormData(prev => ({ ...prev, companyId: company?.id || '' }));
    
    if (errors.companyId) {
      setErrors(prev => ({ ...prev, companyId: undefined }));
    }
  };

  // Handle order selection
  const handleOrderChange = (order: OrderWithClient | null) => {
    setSelectedOrder(order);
    setFormData(prev => ({ 
      ...prev, 
      orderId: order?.id,
      amount: order?.amount || 0
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<InvoiceFormData> = {};

    // Client validation
    if (!formData.clientId) {
      newErrors.clientId = 'Please select a client';
    }

    // Company validation
    if (!formData.companyId) {
      newErrors.companyId = 'Please select a company';
    }

    // Amount validation
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (formData.amount > 999999.99) {
      newErrors.amount = 'Amount must not exceed $999,999.99';
    }

    // Date validation
    const issueDate = new Date(formData.issueDate);
    const dueDate = new Date(formData.dueDate);
    
    if (dueDate <= issueDate) {
      newErrors.dueDate = 'Due date must be after issue date';
    }

    // Issue date should not be too far in the past
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (issueDate < thirtyDaysAgo) {
      newErrors.issueDate = 'Issue date cannot be more than 30 days in the past';
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
      const invoice = await invoiceService.createInvoice(formData);
      onSuccess(invoice);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create invoice');
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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <ReceiptIcon sx={{ mr: 1 }} />
        {title}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Company Selection */}
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={companies}
              getOptionLabel={(option) => option.name}
              value={selectedCompany}
              onChange={(_, newValue) => handleCompanyChange(newValue)}
              disabled={isSubmitting}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Your Company"
                  required
                  error={Boolean(errors.companyId)}
                  helperText={errors.companyId}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* Currency Selection */}
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as Currency }))}
              disabled={isSubmitting}
            >
              {getCurrencyOptions().map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.symbol} {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Client Selection */}
          <Grid item xs={12}>
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
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
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

          {/* Order Selection (Optional) */}
          {selectedClient && (
            <Grid item xs={12}>
              <Autocomplete
                options={orders}
                getOptionLabel={(option) => `${option.description} (${formatCurrency(option.amount)})`}
                value={selectedOrder}
                onChange={(_, newValue) => handleOrderChange(newValue)}
                loading={loadingOrders}
                disabled={isSubmitting}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Order (Optional)"
                    helperText="Select an order to copy amount and description"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingOrders ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          )}

          {/* Amount */}
          <Grid item xs={12} md={6}>
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
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon color="action" />
                    {getCurrencyOptions().find(c => c.value === formData.currency)?.symbol || '$'}
                  </InputAdornment>
                ),
              }}
              inputProps={{
                min: 0,
                step: 0.01,
              }}
            />
          </Grid>

          {/* Issue Date */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Issue Date"
              name="issueDate"
              type="date"
              value={formData.issueDate}
              onChange={handleInputChange('issueDate')}
              error={Boolean(errors.issueDate)}
              helperText={errors.issueDate}
              required
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DateIcon color="action" />
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          {/* Due Date */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Due Date"
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleInputChange('dueDate')}
              error={Boolean(errors.dueDate)}
              helperText={errors.dueDate}
              required
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DateIcon color="action" />
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          {/* Invoice Preview */}
          {formData.amount > 0 && selectedClient && selectedCompany && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: 'grey.50' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <ReceiptIcon sx={{ mr: 1, color: 'primary.main' }} />
                    Invoice Preview
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        From Company
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedCompany.name}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Client
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedClient.name}
                        {selectedClient.company && ` (${selectedClient.company})`}
                      </Typography>
                    </Grid>
                    
                    {selectedOrder && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Related Order
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedOrder.description}
                        </Typography>
                      </Grid>
                    )}
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Amount
                      </Typography>
                      <Typography variant="h6" color="primary.main" sx={{ display: 'flex', alignItems: 'center' }}>
                        <MoneyIcon sx={{ mr: 0.5, fontSize: 20 }} />
                        {formatCurrency(formData.amount, formData.currency)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Due Date
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formatDate(formData.dueDate)}
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
          {isSubmitting ? 'Creating...' : 'Create Invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceForm;