import React, { useState, useCallback } from 'react';
import { Typography, Box, Button, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import OrderList from '../components/orders/OrderList';
import OrderForm from '../components/orders/OrderForm';
import OrderDeleteDialog from '../components/orders/OrderDeleteDialog';
import { OrderWithClient, OrderStatus, orderService } from '../services/orderService';

const Orders: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithClient | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusUpdateError, setStatusUpdateError] = useState('');

  // Refresh orders list
  const refreshOrders = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Handle create order
  const handleCreateClick = () => {
    setSelectedOrder(null);
    setShowCreateForm(true);
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    refreshOrders();
  };

  const handleCreateClose = () => {
    setShowCreateForm(false);
    setSelectedOrder(null);
  };

  // Handle edit order
  const handleEditOrder = (order: OrderWithClient) => {
    setSelectedOrder(order);
    setShowEditForm(true);
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    setSelectedOrder(null);
    refreshOrders();
  };

  const handleEditClose = () => {
    setShowEditForm(false);
    setSelectedOrder(null);
  };

  // Handle delete order
  const handleDeleteOrder = (order: OrderWithClient) => {
    setSelectedOrder(order);
    setShowDeleteDialog(true);
  };

  const handleDeleteSuccess = () => {
    setShowDeleteDialog(false);
    setSelectedOrder(null);
    refreshOrders();
  };

  const handleDeleteClose = () => {
    setShowDeleteDialog(false);
    setSelectedOrder(null);
  };

  // Handle status change
  const handleStatusChange = async (order: OrderWithClient, newStatus: OrderStatus) => {
    try {
      setStatusUpdateError('');
      await orderService.updateOrderStatus(order.id, newStatus);
      refreshOrders();
    } catch (err: any) {
      setStatusUpdateError(
        err.response?.data?.message || `Failed to update order status to ${newStatus}`
      );
    }
  };

  // Handle order selection (for future order details view)
  const handleOrderSelect = (order: OrderWithClient) => {
    // TODO: Navigate to order details page or show order details modal
    // For now, selection is handled silently
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Recurring Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          Create Order
        </Button>
      </Box>

      {/* Status Update Error */}
      {statusUpdateError && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setStatusUpdateError('')}
        >
          {statusUpdateError}
        </Alert>
      )}

      {/* Orders List */}
      <OrderList
        onOrderSelect={handleOrderSelect}
        onOrderEdit={handleEditOrder}
        onOrderDelete={handleDeleteOrder}
        onStatusChange={handleStatusChange}
        refreshTrigger={refreshTrigger}
      />

      {/* Create Order Form */}
      <OrderForm
        open={showCreateForm}
        onClose={handleCreateClose}
        onSuccess={handleCreateSuccess}
        title="Create New Recurring Order"
      />

      {/* Edit Order Form */}
      <OrderForm
        open={showEditForm}
        onClose={handleEditClose}
        onSuccess={handleEditSuccess}
        order={selectedOrder}
        title="Edit Order"
      />

      {/* Delete Order Dialog */}
      <OrderDeleteDialog
        open={showDeleteDialog}
        onClose={handleDeleteClose}
        onSuccess={handleDeleteSuccess}
        order={selectedOrder}
      />
    </Box>
  );
};

export default Orders;