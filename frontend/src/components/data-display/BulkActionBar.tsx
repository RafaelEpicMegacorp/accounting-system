import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Chip,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
  MoreHoriz as MoreIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { InvoiceStatus, getStatusDisplayText } from '../../services/invoiceService';

interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  requiresConfirmation?: boolean;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAction: (actionId: string) => void;
  actions?: BulkAction[];
  loading?: boolean;
}

const defaultActions: BulkAction[] = [
  {
    id: 'send',
    label: 'Send Invoices',
    icon: <SendIcon />,
    color: 'primary',
  },
  {
    id: 'mark-paid',
    label: 'Mark as Paid',
    icon: <CheckIcon />,
    color: 'success',
  },
  {
    id: 'download-pdf',
    label: 'Download PDFs',
    icon: <PdfIcon />,
    color: 'info',
  },
  {
    id: 'send-email',
    label: 'Send Emails',
    icon: <EmailIcon />,
    color: 'primary',
  },
  {
    id: 'cancel',
    label: 'Cancel Invoices',
    icon: <CancelIcon />,
    color: 'warning',
    requiresConfirmation: true,
  },
  {
    id: 'delete',
    label: 'Delete Invoices',
    icon: <DeleteIcon />,
    color: 'error',
    requiresConfirmation: true,
  },
];

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkAction,
  actions = defaultActions,
  loading = false,
}) => {
  const [moreMenuAnchor, setMoreMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleMoreClick = (event: React.MouseEvent<HTMLElement>) => {
    setMoreMenuAnchor(event.currentTarget);
  };

  const handleMoreClose = () => {
    setMoreMenuAnchor(null);
  };

  const handleActionClick = (actionId: string) => {
    onBulkAction(actionId);
    handleMoreClose();
  };

  const primaryActions = actions.slice(0, 3);
  const secondaryActions = actions.slice(3);

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1300,
          }}
        >
          <Paper
            elevation={8}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 3,
              py: 2,
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              minHeight: 64,
              backdropFilter: 'blur(10px)',
              boxShadow: (theme) => `0 8px 32px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
            }}
          >
            {/* Selection Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${selectedCount} selected`}
                color="primary"
                size="small"
                sx={{ fontWeight: 'medium' }}
              />
              <Tooltip title="Clear selection">
                <IconButton
                  size="small"
                  onClick={onClearSelection}
                  sx={{ ml: 1 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Primary Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {primaryActions.map((action) => (
                <Tooltip key={action.id} title={action.label}>
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={action.icon}
                      onClick={() => handleActionClick(action.id)}
                      disabled={loading || action.disabled}
                      color={action.color}
                      sx={{
                        minWidth: 'auto',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: 2,
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      {action.label}
                    </Button>
                  </span>
                </Tooltip>
              ))}

              {/* More Actions Menu */}
              {secondaryActions.length > 0 && (
                <>
                  <Tooltip title="More actions">
                    <IconButton
                      onClick={handleMoreClick}
                      disabled={loading}
                      sx={{
                        '&:hover': {
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      <MoreIcon />
                    </IconButton>
                  </Tooltip>

                  <Menu
                    anchorEl={moreMenuAnchor}
                    open={Boolean(moreMenuAnchor)}
                    onClose={handleMoreClose}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'center',
                    }}
                    transformOrigin={{
                      vertical: 'bottom',
                      horizontal: 'center',
                    }}
                    PaperProps={{
                      sx: {
                        minWidth: 180,
                        '& .MuiMenuItem-root': {
                          borderRadius: 1,
                          mx: 1,
                          my: 0.5,
                        },
                      },
                    }}
                  >
                    {secondaryActions.map((action) => (
                      <MenuItem
                        key={action.id}
                        onClick={() => handleActionClick(action.id)}
                        disabled={loading || action.disabled}
                        sx={{
                          color: action.color === 'error' ? 'error.main' : 'inherit',
                        }}
                      >
                        <ListItemIcon sx={{ color: 'inherit' }}>
                          {action.icon}
                        </ListItemIcon>
                        <ListItemText primary={action.label} />
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Box>
          </Paper>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkActionBar;