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
import { motion, AnimatePresence } from 'framer-motion';
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
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Alarm as AlarmIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
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
import { paymentService } from '../../services/paymentService';
import PaymentRecordDialog from '../payments/PaymentRecordDialog';
import PaymentHistoryDialog from '../payments/PaymentHistoryDialog';
import ViewToggle, { ViewMode } from '../data-display/ViewToggle';
import InvoiceCardsGrid from './InvoiceCardsGrid';
import AdvancedFilters, { FilterState } from '../data-display/AdvancedFilters';
import { useInvoiceFilters } from '../../hooks/useInvoiceFilters';

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
  // Use the new filtering hook
  const {
    filters,
    setFilters,
    invoices,
    loading,
    error,
    totalCount,
    page,
    setPage,
    pageSize,
    setPageSize,
    applyFilters,
    refetch,
  } = useInvoiceFilters({
    autoApply: false, // Manual apply for better UX
  });

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentHistoryDialogOpen, setPaymentHistoryDialogOpen] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  const [remainingAmount, setRemainingAmount] = useState(0);

  // Handle refresh trigger from parent
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
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

  const handlePdfDownload = async () => {
    if (!selectedInvoice) return;
    
    try {
      // Use the invoiceService to download PDF
      const pdfBlob = await invoiceService.downloadInvoicePdf(selectedInvoice.id);
      
      // Create a download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${selectedInvoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      setError('Failed to download PDF. Please try again.');
    }
    
    handleMenuClose();
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice) return;
    
    try {
      const result = await invoiceService.sendInvoiceEmail(selectedInvoice.id);
      
      // Refresh the invoice list to show updated status
      refetch();
      
      // You could also show a success snackbar here
      alert(`Invoice ${selectedInvoice.invoiceNumber} sent successfully to ${result.sentTo}!`);
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      // Handle error appropriately
    }
    
    handleMenuClose();
  };

  const handleSendReminder = async (reminderType: 'before_due' | 'due_today' | 'overdue') => {
    if (!selectedInvoice) return;
    
    try {
      const result = await invoiceService.sendPaymentReminder(selectedInvoice.id, reminderType);
      
      // You could also show a success snackbar here
      const reminderTypeText = reminderType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      alert(`${reminderTypeText} reminder sent successfully to ${result.sentTo}!`);
    } catch (error) {
      console.error('Failed to send payment reminder:', error);
      // Handle error appropriately
    }
    
    handleMenuClose();
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    
    try {
      // Get detailed invoice info with payment history
      const invoiceDetail = await invoiceService.getInvoice(selectedInvoice.id);
      const paymentHistory = await paymentService.getInvoicePaymentHistory(selectedInvoice.id);
      
      setInvoiceDetails(invoiceDetail);
      setRemainingAmount(paymentHistory.summary.remainingAmount);
      setPaymentDialogOpen(true);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      setError('Failed to load invoice details. Please try again.');
    }
    
    handleMenuClose();
  };

  const handleViewPaymentHistory = () => {
    if (!selectedInvoice) return;
    
    setPaymentHistoryDialogOpen(true);
    handleMenuClose();
  };

  const handlePaymentRecorded = () => {
    // Refresh the invoice list to show updated status and amounts
    refetch();
    setPaymentDialogOpen(false);
  };

  const handlePaymentDeleted = () => {
    // Refresh the invoice list to show updated status and amounts
    refetch();
  };

  const canSendEmail = (invoice: InvoiceWithRelations): boolean => {
    // Can send email for any invoice except cancelled
    return invoice.status !== 'CANCELLED';
  };

  const canSendReminder = (invoice: InvoiceWithRelations): boolean => {
    // Can only send reminders for sent or overdue invoices
    return ['SENT', 'OVERDUE'].includes(invoice.status);
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

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={applyFilters}
        loading={loading}
      />

      <Card>
        <CardContent>
          {/* Quick Filters and View Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                placeholder="Quick search..."
                value={filters.clientSearch}
                onChange={(e) => setFilters({ ...filters, clientSearch: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                size="small"
                sx={{ minWidth: 250 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as InvoiceStatus | '' })}
                >
                  <MenuItem value="">All</MenuItem>
                  {getStatusOptions().map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </Box>

          {/* Invoices Display */}
          <AnimatePresence mode="wait">
            {viewMode === 'table' ? (
              <motion.div
                key="table"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
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
                                {invoice.order?.description || 'Manual Invoice'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {invoice.order?.frequency || 'One-time'}
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
              </motion.div>
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <InvoiceCardsGrid
                  invoices={invoices}
                  loading={loading}
                  searchQuery={filters.clientSearch}
                  statusFilter={filters.status}
                  onInvoiceSelect={onInvoiceSelect}
                  onInvoiceEdit={onInvoiceEdit}
                  onInvoiceDelete={onInvoiceDelete}
                  onStatusChange={onStatusChange}
                  onPdfDownload={handlePdfDownload}
                  onSendEmail={handleSendEmail}
                  onSendReminder={handleSendReminder}
                  onRecordPayment={handleRecordPayment}
                  onViewPaymentHistory={handleViewPaymentHistory}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination - only show for table view and when card view doesn't have its own handling */}
          {viewMode === 'table' && (
            <TablePagination
              component="div"
              count={totalCount}
              rowsPerPage={pageSize}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          )}

          {/* Pagination for card view */}
          {viewMode === 'card' && totalCount > pageSize && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <TablePagination
                component="div"
                count={totalCount}
                rowsPerPage={pageSize}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[9, 18, 27, 36]}
                showFirstButton
                showLastButton
              />
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
        
        <MenuItem onClick={handlePdfDownload}>
          <PdfIcon sx={{ mr: 1, fontSize: 20 }} />
          Download PDF
        </MenuItem>
        
        {/* Payment Options */}
        {selectedInvoice && selectedInvoice.status !== 'CANCELLED' && (
          <>
            <MenuItem onClick={handleRecordPayment}>
              <PaymentIcon sx={{ mr: 1, fontSize: 20, color: 'success.main' }} />
              Record Payment
            </MenuItem>
            <MenuItem onClick={handleViewPaymentHistory}>
              <HistoryIcon sx={{ mr: 1, fontSize: 20, color: 'info.main' }} />
              Payment History
            </MenuItem>
          </>
        )}
        
        {/* Email Options */}
        {selectedInvoice && canSendEmail(selectedInvoice) && (
          <MenuItem onClick={handleSendEmail}>
            <EmailIcon sx={{ mr: 1, fontSize: 20 }} />
            Send Email
          </MenuItem>
        )}
        
        {/* Payment Reminder Options */}
        {selectedInvoice && canSendReminder(selectedInvoice) && (
          <>
            <MenuItem onClick={() => handleSendReminder('before_due')}>
              <AlarmIcon sx={{ mr: 1, fontSize: 20, color: 'info.main' }} />
              Send Friendly Reminder
            </MenuItem>
            <MenuItem onClick={() => handleSendReminder('due_today')}>
              <AlarmIcon sx={{ mr: 1, fontSize: 20, color: 'warning.main' }} />
              Send Due Today Notice
            </MenuItem>
            <MenuItem onClick={() => handleSendReminder('overdue')}>
              <AlarmIcon sx={{ mr: 1, fontSize: 20, color: 'error.main' }} />
              Send Overdue Notice
            </MenuItem>
          </>
        )}
        
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

      {/* Payment Recording Dialog */}
      <PaymentRecordDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        invoice={invoiceDetails}
        remainingAmount={remainingAmount}
        onPaymentRecorded={handlePaymentRecorded}
      />

      {/* Payment History Dialog */}
      <PaymentHistoryDialog
        open={paymentHistoryDialogOpen}
        onClose={() => setPaymentHistoryDialogOpen(false)}
        invoiceId={selectedInvoice?.id || null}
        onPaymentDeleted={handlePaymentDeleted}
      />
    </Box>
  );
};

export default InvoiceList;