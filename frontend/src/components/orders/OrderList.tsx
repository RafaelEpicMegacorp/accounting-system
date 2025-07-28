import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Typography,
  Avatar,
  Tooltip,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { 
  orderService, 
  OrderWithClient, 
  OrderSearchParams, 
  OrderStatus, 
  OrderFrequency,
  getFrequencyDisplayText,
  getStatusOptions,
  getFrequencyOptions,
  formatCurrency,
  formatDate
} from '../../services/orderService';

interface OrderListProps {
  onOrderSelect?: (order: OrderWithClient) => void;
  onOrderEdit?: (order: OrderWithClient) => void;
  onOrderDelete?: (order: OrderWithClient) => void;
  onStatusChange?: (order: OrderWithClient, newStatus: OrderStatus) => void;
  refreshTrigger?: number;
}

const OrderList: React.FC<OrderListProps> = ({
  onOrderSelect,
  onOrderEdit,
  onOrderDelete,
  onStatusChange,
  refreshTrigger = 0,
}) => {
  const [orders, setOrders] = useState<OrderWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [frequencyFilter, setFrequencyFilter] = useState<OrderFrequency | ''>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithClient | null>(null);

  // Load orders
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');

      const params: OrderSearchParams = {
        page: page + 1, // API uses 1-based pagination
        limit: rowsPerPage,
        search: searchQuery.trim(),
        status: statusFilter || undefined,
        frequency: frequencyFilter || undefined,
        sortBy,
        sortOrder,
      };

      const response = await orderService.getOrders(params);
      setOrders(response.orders);
      setTotalCount(response.pagination.totalCount);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load orders');
      setOrders([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load orders on mount and when dependencies change
  useEffect(() => {
    loadOrders();
  }, [page, rowsPerPage, searchQuery, statusFilter, frequencyFilter, sortBy, sortOrder, refreshTrigger]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0); // Reset to first page on search
      loadOrders();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, order: OrderWithClient) => {
    setMenuAnchor(event.currentTarget);
    setSelectedOrder(order);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedOrder(null);
  };

  const handleOrderClick = (order: OrderWithClient) => {
    if (onOrderSelect) {
      onOrderSelect(order);
    }
  };

  const handleEdit = () => {
    if (selectedOrder && onOrderEdit) {
      onOrderEdit(selectedOrder);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedOrder && onOrderDelete) {
      onOrderDelete(selectedOrder);
    }
    handleMenuClose();
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (selectedOrder && onStatusChange) {
      onStatusChange(selectedOrder, newStatus);
    }
    handleMenuClose();
  };

  const getStatusColor = (status: OrderStatus): 'success' | 'warning' | 'error' => {
    const statusOption = getStatusOptions().find(option => option.value === status);
    return (statusOption?.color as 'success' | 'warning' | 'error') || 'default';
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <PlayIcon sx={{ fontSize: 16 }} />;
      case 'PAUSED':
        return <PauseIcon sx={{ fontSize: 16 }} />;
      case 'CANCELLED':
        return <StopIcon sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  if (loading && orders.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {/* Search and Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search orders by description or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {getStatusOptions().map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={frequencyFilter}
                  label="Frequency"
                  onChange={(e) => setFrequencyFilter(e.target.value as OrderFrequency | '')}
                >
                  <MenuItem value="">All Frequencies</MenuItem>
                  {getFrequencyOptions().map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Orders Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Amount & Frequency</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Next Invoice</TableCell>
                  <TableCell align="center">Invoices</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleOrderClick(order)}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {order.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created {formatDate(order.createdAt)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {order.client.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {order.client.name}
                          </Typography>
                          {order.client.company && (
                            <Typography variant="caption" color="text.secondary">
                              {order.client.company}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(order.amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getFrequencyDisplayText(order.frequency, order.customDays)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        color={getStatusColor(order.status)}
                        size="small"
                        icon={getStatusIcon(order.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {formatDate(order.nextInvoiceDate)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={order._count.invoices}
                        size="small"
                        color={order._count.invoices > 0 ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="More actions">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, order);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />

          {/* No Results */}
          {!loading && orders.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                {searchQuery || statusFilter || frequencyFilter
                  ? 'No orders found matching your filters'
                  : 'No orders yet'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {searchQuery || statusFilter || frequencyFilter
                  ? 'Try adjusting your search terms or filters'
                  : 'Create your first recurring order to get started'
                }
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1, fontSize: 20 }} />
          Edit Order
        </MenuItem>
        
        {selectedOrder?.status !== 'ACTIVE' && (
          <MenuItem onClick={() => handleStatusChange('ACTIVE')}>
            <PlayIcon sx={{ mr: 1, fontSize: 20, color: 'success.main' }} />
            Activate Order
          </MenuItem>
        )}
        
        {selectedOrder?.status === 'ACTIVE' && (
          <MenuItem onClick={() => handleStatusChange('PAUSED')}>
            <PauseIcon sx={{ mr: 1, fontSize: 20, color: 'warning.main' }} />
            Pause Order
          </MenuItem>
        )}
        
        {selectedOrder?.status !== 'CANCELLED' && (
          <MenuItem onClick={() => handleStatusChange('CANCELLED')}>
            <StopIcon sx={{ mr: 1, fontSize: 20, color: 'error.main' }} />
            Cancel Order
          </MenuItem>
        )}
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
          Delete Order
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default OrderList;