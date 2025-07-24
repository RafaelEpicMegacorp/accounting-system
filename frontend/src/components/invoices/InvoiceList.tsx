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
  Send as SendIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { 
  invoiceService, 
  InvoiceWithRelations, 
  InvoiceSearchParams, 
  InvoiceStatus,
  getStatusOptions,
  getStatusColor,
  getStatusDisplayText,
  formatCurrency,
  formatDate,
  getDueDateStatus,
  canDeleteInvoice,
  canUpdateStatus,
  getNextAllowedStatuses
} from '../../services/invoiceService';

interface InvoiceListProps {
  onInvoiceSelect?: (invoice: InvoiceWithRelations) => void;
  onInvoiceEdit?: (invoice: InvoiceWithRelations) => void;
  onInvoiceDelete?: (invoice: InvoiceWithRelations) => void;
  onStatusChange?: (invoice: InvoiceWithRelations, newStatus: InvoiceStatus) => void;
  refreshTrigger?: number;
}

const InvoiceList: React.FC<InvoiceListProps> = ({
  onInvoiceSelect,
  onInvoiceEdit,
  onInvoiceDelete,
  onStatusChange,
  refreshTrigger = 0,
}) => {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);

  // Load invoices
  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError('');

      const params: InvoiceSearchParams = {
        page: page + 1, // API uses 1-based pagination
        limit: rowsPerPage,
        search: searchQuery.trim(),
        status: statusFilter || undefined,
        sortBy,
        sortOrder,
      };

      const response = await invoiceService.getInvoices(params);
      setInvoices(response.invoices);
      setTotalCount(response.pagination.totalCount);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load invoices');
      setInvoices([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load invoices on mount and when dependencies change
  useEffect(() => {
    loadInvoices();
  }, [page, rowsPerPage, searchQuery, statusFilter, sortBy, sortOrder, refreshTrigger]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0); // Reset to first page on search
      loadInvoices();
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, invoice: InvoiceWithRelations) => {
    setMenuAnchor(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedInvoice(null);
  };

  const handleInvoiceClick = (invoice: InvoiceWithRelations) => {
    if (onInvoiceSelect) {
      onInvoiceSelect(invoice);
    }
  };

  const handleEdit = () => {
    if (selectedInvoice && onInvoiceEdit) {
      onInvoiceEdit(selectedInvoice);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedInvoice && onInvoiceDelete) {
      onInvoiceDelete(selectedInvoice);
    }
    handleMenuClose();
  };

  const handleStatusChange = (newStatus: InvoiceStatus) => {
    if (selectedInvoice && onStatusChange) {
      onStatusChange(selectedInvoice, newStatus);
    }
    handleMenuClose();
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'DRAFT':
        return <EditIcon sx={{ fontSize: 16 }} />;
      case 'SENT':
        return <SendIcon sx={{ fontSize: 16 }} />;
      case 'PAID':
        return <CheckIcon sx={{ fontSize: 16 }} />;
      case 'OVERDUE':
        return <ScheduleIcon sx={{ fontSize: 16 }} />;
      case 'CANCELLED':
        return <CancelIcon sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  if (loading && invoices.length === 0) {
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
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Search invoices by number, client, or order..."
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
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
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
          </Grid>

          {/* Invoices Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Order</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => {
                  const dueDateStatus = getDueDateStatus(invoice);
                  
                  return (
                    <TableRow
                      key={invoice.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleInvoiceClick(invoice)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                            <ReceiptIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="medium">
                              {invoice.invoiceNumber}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Issued {formatDate(invoice.issueDate)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {invoice.client.name}
                          </Typography>
                          {invoice.client.company && (
                            <Typography variant="caption" color="text.secondary">
                              {invoice.client.company}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {invoice.order.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {invoice.order.frequency}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <MoneyIcon sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(invoice.amount)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusDisplayText(invoice.status)}
                          color={getStatusColor(invoice.status)}
                          size="small"
                          icon={getStatusIcon(invoice.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {formatDate(invoice.dueDate)}
                          </Typography>
                          <Chip
                            label={dueDateStatus.text}
                            color={dueDateStatus.color}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="More actions">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuOpen(e, invoice);
                            }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
          {!loading && invoices.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                {searchQuery || statusFilter
                  ? 'No invoices found matching your filters'
                  : 'No invoices yet'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {searchQuery || statusFilter
                  ? 'Try adjusting your search terms or filters'
                  : 'Create your first invoice or generate one from an order'
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
          View Details
        </MenuItem>
        
        {/* Status Change Options */}
        {selectedInvoice && getNextAllowedStatuses(selectedInvoice).map((status) => (
          <MenuItem key={status} onClick={() => handleStatusChange(status)}>
            {getStatusIcon(status) && React.cloneElement(getStatusIcon(status)!, { sx: { mr: 1, fontSize: 20, color: `${getStatusColor(status)}.main` } })}
            Mark as {getStatusDisplayText(status)}
          </MenuItem>
        ))}
        
        {/* Delete Option (only for draft invoices) */}
        {selectedInvoice && canDeleteInvoice(selectedInvoice) && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
            Delete Invoice
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default InvoiceList;