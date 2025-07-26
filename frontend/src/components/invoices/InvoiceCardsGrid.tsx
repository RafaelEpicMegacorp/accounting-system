import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { InvoiceWithRelations, InvoiceStatus } from '../../services/invoiceService';
import InvoiceCard from './InvoiceCard';

interface InvoiceCardsGridProps {
  invoices: InvoiceWithRelations[];
  loading?: boolean;
  searchQuery?: string;
  statusFilter?: string;
  selectedInvoices?: string[];
  onInvoiceSelect?: (invoice: InvoiceWithRelations) => void;
  onInvoiceEdit?: (invoice: InvoiceWithRelations) => void;
  onInvoiceDelete?: (invoice: InvoiceWithRelations) => void;
  onStatusChange?: (invoice: InvoiceWithRelations, newStatus: InvoiceStatus) => void;
  onPdfDownload?: (invoice: InvoiceWithRelations) => void;
  onSendEmail?: (invoice: InvoiceWithRelations) => void;
  onSendReminder?: (invoice: InvoiceWithRelations, reminderType: 'before_due' | 'due_today' | 'overdue') => void;
  onRecordPayment?: (invoice: InvoiceWithRelations) => void;
  onViewPaymentHistory?: (invoice: InvoiceWithRelations) => void;
  onToggleSelection?: (invoice: InvoiceWithRelations) => void;
  selectable?: boolean;
}

const InvoiceCardsGrid: React.FC<InvoiceCardsGridProps> = ({
  invoices,
  loading = false,
  searchQuery,
  statusFilter,
  selectedInvoices = [],
  onInvoiceSelect,
  onInvoiceEdit,
  onInvoiceDelete,
  onStatusChange,
  onPdfDownload,
  onSendEmail,
  onSendReminder,
  onRecordPayment,
  onViewPaymentHistory,
  onToggleSelection,
  selectable = false,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
  };

  if (loading && invoices.length === 0) {
    return (
      <Grid container spacing={3}>
        {[...Array(6)].map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Box
                sx={{
                  height: 280,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%': {
                      opacity: 1,
                    },
                    '50%': {
                      opacity: 0.5,
                    },
                    '100%': {
                      opacity: 1,
                    },
                  },
                }}
              />
            </motion.div>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!loading && invoices.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {searchQuery || statusFilter
            ? 'No invoices found matching your filters'
            : 'No invoices yet'
          }
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {searchQuery || statusFilter
            ? 'Try adjusting your search terms or filters'
            : 'Create your first invoice or generate one from an order'
          }
        </Typography>
      </Box>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        <Grid container spacing={3}>
          {invoices.map((invoice) => (
            <Grid item xs={12} sm={6} md={4} key={invoice.id}>
              <motion.div
                variants={itemVariants}
                layout
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.3 }}
              >
                <InvoiceCard
                  invoice={invoice}
                  selected={selectedInvoices.includes(invoice.id)}
                  selectable={selectable}
                  onSelect={onInvoiceSelect}
                  onEdit={onInvoiceEdit}
                  onDelete={onInvoiceDelete}
                  onStatusChange={onStatusChange}
                  onPdfDownload={onPdfDownload}
                  onSendEmail={onSendEmail}
                  onSendReminder={onSendReminder}
                  onRecordPayment={onRecordPayment}
                  onViewPaymentHistory={onViewPaymentHistory}
                  onToggleSelection={onToggleSelection}
                />
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </AnimatePresence>
    </motion.div>
  );
};

export default InvoiceCardsGrid;