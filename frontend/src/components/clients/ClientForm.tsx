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
} from '@mui/material';
import { clientService, Client, ClientFormData } from '../../services/clientService';

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (client: Client) => void;
  client?: Client | null; // If provided, we're editing
  title?: string;
}

const ClientForm: React.FC<ClientFormProps> = ({
  open,
  onClose,
  onSuccess,
  client = null,
  title,
}) => {
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState<Partial<ClientFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(client);
  const dialogTitle = title || (isEditing ? 'Edit Client' : 'Add New Client');

  // Initialize form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        company: client.company || '',
        phone: client.phone || '',
        address: client.address || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        address: '',
      });
    }
    setErrors({});
    setError('');
  }, [client, open]);

  // Handle input changes
  const handleInputChange = (field: keyof ClientFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<ClientFormData> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must not exceed 100 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Company validation (optional)
    if (formData.company && formData.company.trim().length > 100) {
      newErrors.company = 'Company name must not exceed 100 characters';
    }

    // Phone validation (optional)
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s|-|\(|\)/g, ''))) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    // Address validation (optional)
    if (formData.address && formData.address.trim().length > 500) {
      newErrors.address = 'Address must not exceed 500 characters';
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
      let savedClient: Client;

      if (isEditing && client) {
        savedClient = await clientService.updateClient(client.id, formData);
      } else {
        savedClient = await clientService.createClient(formData);
      }

      onSuccess(savedClient);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} client`);
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
      maxWidth="sm"
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

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange('name')}
              error={Boolean(errors.name)}
              helperText={errors.name}
              required
              disabled={isSubmitting}
              autoFocus={!isEditing}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={Boolean(errors.email)}
              helperText={errors.email}
              required
              disabled={isSubmitting}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Company"
              name="company"
              value={formData.company}
              onChange={handleInputChange('company')}
              error={Boolean(errors.company)}
              helperText={errors.company}
              disabled={isSubmitting}
              placeholder="Optional"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              error={Boolean(errors.phone)}
              helperText={errors.phone}
              disabled={isSubmitting}
              placeholder="Optional"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange('address')}
              error={Boolean(errors.address)}
              helperText={errors.address}
              disabled={isSubmitting}
              multiline
              rows={3}
              placeholder="Optional"
            />
          </Grid>
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
            : (isEditing ? 'Update Client' : 'Create Client')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientForm;