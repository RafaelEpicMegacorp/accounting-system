import React, { useState } from 'react';
import { Typography, Box, Button, Alert, Snackbar } from '@mui/material';
import { Add } from '@mui/icons-material';
import ClientList from '../components/clients/ClientList';
import ClientForm from '../components/clients/ClientForm';
import ClientDeleteDialog from '../components/clients/ClientDeleteDialog';
import { Client, ClientWithCounts } from '../services/clientService';

const Clients: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientWithCounts | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  // Handle opening the form for new client
  const handleAddClient = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  // Handle opening the form for editing
  const handleEditClient = (client: ClientWithCounts) => {
    setEditingClient(client);
    setShowForm(true);
  };

  // Handle opening delete dialog
  const handleDeleteClient = (client: ClientWithCounts) => {
    setDeletingClient(client);
    setShowDeleteDialog(true);
  };

  // Handle successful form submission
  const handleFormSuccess = (client: Client) => {
    const action = editingClient ? 'updated' : 'created';
    setSuccessMessage(`Client ${action} successfully!`);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh
  };

  // Handle successful deletion
  const handleDeleteSuccess = () => {
    setSuccessMessage('Client deleted successfully!');
    setRefreshTrigger(prev => prev + 1); // Trigger refresh
  };

  // Handle closing forms
  const handleFormClose = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  const handleDeleteDialogClose = () => {
    setShowDeleteDialog(false);
    setDeletingClient(null);
  };

  const handleSuccessMessageClose = () => {
    setSuccessMessage('');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Clients
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddClient}
        >
          Add Client
        </Button>
      </Box>
      
      {/* Client List */}
      <ClientList
        onClientEdit={handleEditClient}
        onClientDelete={handleDeleteClient}
        refreshTrigger={refreshTrigger}
      />

      {/* Client Form Dialog */}
      <ClientForm
        open={showForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        client={editingClient}
      />

      {/* Delete Confirmation Dialog */}
      <ClientDeleteDialog
        open={showDeleteDialog}
        onClose={handleDeleteDialogClose}
        onSuccess={handleDeleteSuccess}
        client={deletingClient}
      />

      {/* Success Message */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        onClose={handleSuccessMessageClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSuccessMessageClose} 
          severity="success" 
          variant="filled"
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Clients;