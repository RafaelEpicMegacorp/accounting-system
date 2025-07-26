import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  Checkbox,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Receipt as ReceiptIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
  Alarm as AlarmIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { 
  InvoiceWithRelations, 
  InvoiceStatus,
  getStatusColor,
  getStatusDisplayText,
  formatCurrency,
  formatDate,
  getDueDateStatus,
  canDeleteInvoice,
  getNextAllowedStatuses
} from '../../services/invoiceService';

interface InvoiceCardProps {
  invoice: InvoiceWithRelations;
  onSelect?: (invoice: InvoiceWithRelations) => void;
  onEdit?: (invoice: InvoiceWithRelations) => void;
  onDelete?: (invoice: InvoiceWithRelations) => void;
  onStatusChange?: (invoice: InvoiceWithRelations, newStatus: InvoiceStatus) => void;
  onPdfDownload?: (invoice: InvoiceWithRelations) => void;
  onSendEmail?: (invoice: InvoiceWithRelations) => void;
  onSendReminder?: (invoice: InvoiceWithRelations, reminderType: 'before_due' | 'due_today' | 'overdue') => void;
  onRecordPayment?: (invoice: InvoiceWithRelations) => void;
  onViewPaymentHistory?: (invoice: InvoiceWithRelations) => void;
  selected?: boolean;
  onToggleSelection?: (invoice: InvoiceWithRelations) => void;
  selectable?: boolean;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onSelect,
  onEdit,
  onDelete,
  onStatusChange,
  onPdfDownload,
  onSendEmail,
  onSendReminder,
  onRecordPayment,
  onViewPaymentHistory,
  selected = false,
  onToggleSelection,
  selectable = false,
}) => {
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const dueDateStatus = getDueDateStatus(invoice);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(invoice);
    }
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

  const canSendEmail = (invoice: InvoiceWithRelations): boolean => {
    return invoice.status !== 'CANCELLED';
  };

  const canSendReminder = (invoice: InvoiceWithRelations): boolean => {
    return ['SENT', 'OVERDUE'].includes(invoice.status);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}
      transition={{ duration: 0.2 }}
    >
      <Card
        sx={{
          cursor: 'pointer',
          position: 'relative',
          border: selected ? '2px solid' : '1px solid',
          borderColor: selected ? 'primary.main' : 'divider',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 3,
          },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={handleCardClick}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {selectable && (
                <Checkbox
                  checked={selected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelection?.(invoice);
                  }}
                  sx={{ mr: 1, p: 0.5 }}
                />
              )}
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, mr: 2 }}>
                <ReceiptIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div" fontWeight="medium">
                  {invoice.invoiceNumber}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Issued {formatDate(invoice.issueDate)}
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{ mt: -1 }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>

          {/* Client Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              {invoice.client.company ? (
                <BusinessIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              ) : (
                <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              )}
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
            </Box>
          </Box>

          {/* Order Info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Order: {invoice.order?.description || 'Manual Invoice'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {invoice.order?.frequency || 'One-time'}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Amount and Status */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MoneyIcon sx={{ fontSize: 20, mr: 1, color: 'success.main' }} />
              <Typography variant="h6" fontWeight="medium" color="success.main">
                {formatCurrency(invoice.amount)}
              </Typography>
            </Box>
            <Chip
              label={getStatusDisplayText(invoice.status)}
              color={getStatusColor(invoice.status)}
              size="small"
              icon={getStatusIcon(invoice.status)}
            />
          </Box>

          {/* Due Date */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Due: {formatDate(invoice.dueDate)}
            </Typography>
            <Chip
              label={dueDateStatus.text}
              color={dueDateStatus.color}
              size="small"
              variant="outlined"
            />
          </Box>
        </CardContent>

        {/* Actions Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => { onEdit?.(invoice); handleMenuClose(); }}>
            <EditIcon sx={{ mr: 1, fontSize: 20 }} />
            View Details
          </MenuItem>
          
          <MenuItem onClick={() => { onPdfDownload?.(invoice); handleMenuClose(); }}>
            <PdfIcon sx={{ mr: 1, fontSize: 20 }} />
            Download PDF
          </MenuItem>
          
          {/* Payment Options */}
          {invoice.status !== 'CANCELLED' && (
            <>
              <MenuItem onClick={() => { onRecordPayment?.(invoice); handleMenuClose(); }}>
                <PaymentIcon sx={{ mr: 1, fontSize: 20, color: 'success.main' }} />
                Record Payment
              </MenuItem>
              <MenuItem onClick={() => { onViewPaymentHistory?.(invoice); handleMenuClose(); }}>
                <HistoryIcon sx={{ mr: 1, fontSize: 20, color: 'info.main' }} />
                Payment History
              </MenuItem>
            </>
          )}
          
          {/* Email Options */}
          {canSendEmail(invoice) && (
            <MenuItem onClick={() => { onSendEmail?.(invoice); handleMenuClose(); }}>
              <EmailIcon sx={{ mr: 1, fontSize: 20 }} />
              Send Email
            </MenuItem>
          )}
          
          {/* Payment Reminder Options */}
          {canSendReminder(invoice) && (
            <>
              <MenuItem onClick={() => { onSendReminder?.(invoice, 'before_due'); handleMenuClose(); }}>
                <AlarmIcon sx={{ mr: 1, fontSize: 20, color: 'info.main' }} />
                Send Friendly Reminder
              </MenuItem>
              <MenuItem onClick={() => { onSendReminder?.(invoice, 'due_today'); handleMenuClose(); }}>
                <AlarmIcon sx={{ mr: 1, fontSize: 20, color: 'warning.main' }} />
                Send Due Today Notice
              </MenuItem>
              <MenuItem onClick={() => { onSendReminder?.(invoice, 'overdue'); handleMenuClose(); }}>
                <AlarmIcon sx={{ mr: 1, fontSize: 20, color: 'error.main' }} />
                Send Overdue Notice
              </MenuItem>
            </>
          )}
          
          {/* Status Change Options */}
          {getNextAllowedStatuses(invoice).map((status) => (
            <MenuItem key={status} onClick={() => { onStatusChange?.(invoice, status); handleMenuClose(); }}>
              {getStatusIcon(status) && React.cloneElement(getStatusIcon(status)!, { sx: { mr: 1, fontSize: 20, color: `${getStatusColor(status)}.main` } })}
              Mark as {getStatusDisplayText(status)}
            </MenuItem>
          ))}
          
          {/* Delete Option (only for draft invoices) */}
          {canDeleteInvoice(invoice) && (
            <MenuItem onClick={() => { onDelete?.(invoice); handleMenuClose(); }} sx={{ color: 'error.main' }}>
              <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
              Delete Invoice
            </MenuItem>
          )}
        </Menu>
      </Card>
    </motion.div>
  );
};

export default InvoiceCard;