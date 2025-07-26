import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Chip,
  styled,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Warning,
  Error as ErrorIcon,
  HourglassEmpty,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../services/invoiceService';

export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'overdue' | 'draft';

interface PaymentStatusIndicatorProps {
  status: PaymentStatus;
  amount: number;
  paidAmount?: number;
  currency?: string;
  dueDate?: string;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  animated?: boolean;
}

const StatusContainer = styled(motion.div)<{ size: string }>(({ theme, size }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: size === 'small' ? theme.spacing(0.5) : theme.spacing(1),
  minWidth: size === 'small' ? 120 : size === 'medium' ? 160 : 200,
}));

const StatusHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
}));

const StyledLinearProgress = styled(LinearProgress)<{ status: PaymentStatus }>(
  ({ theme, status }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'paid':
          return theme.palette.success.main;
        case 'partial':
          return theme.palette.warning.main;
        case 'pending':
          return theme.palette.info.main;
        case 'overdue':
          return theme.palette.error.main;
        case 'draft':
          return theme.palette.grey[400];
        default:
          return theme.palette.primary.main;
      }
    };

    return {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.palette.grey[200],
      '& .MuiLinearProgress-bar': {
        borderRadius: 4,
        backgroundColor: getStatusColor(),
        transition: 'all 0.3s ease-in-out',
      },
    };
  }
);

const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  status,
  amount,
  paidAmount = 0,
  currency = 'USD',
  dueDate,
  size = 'medium',
  showProgress = true,
  animated = true,
}) => {
  const theme = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'paid':
        return {
          label: 'Paid',
          icon: <CheckCircle sx={{ fontSize: size === 'small' ? 16 : 20 }} />,
          color: theme.palette.success.main,
          chipColor: 'success' as const,
        };
      case 'partial':
        return {
          label: 'Partially Paid',
          icon: <HourglassEmpty sx={{ fontSize: size === 'small' ? 16 : 20 }} />,
          color: theme.palette.warning.main,
          chipColor: 'warning' as const,
        };
      case 'pending':
        return {
          label: 'Pending',
          icon: <Schedule sx={{ fontSize: size === 'small' ? 16 : 20 }} />,
          color: theme.palette.info.main,
          chipColor: 'info' as const,
        };
      case 'overdue':
        return {
          label: 'Overdue',
          icon: <ErrorIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />,
          color: theme.palette.error.main,
          chipColor: 'error' as const,
        };
      case 'draft':
        return {
          label: 'Draft',
          icon: <Warning sx={{ fontSize: size === 'small' ? 16 : 20 }} />,
          color: theme.palette.grey[500],
          chipColor: 'default' as const,
        };
      default:
        return {
          label: 'Unknown',
          icon: <Warning sx={{ fontSize: size === 'small' ? 16 : 20 }} />,
          color: theme.palette.grey[500],
          chipColor: 'default' as const,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const progress = amount > 0 ? (paidAmount / amount) * 100 : 0;
  const remainingAmount = amount - paidAmount;

  const getDueDateMessage = () => {
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
    return null;
  };

  const dueDateMessage = getDueDateMessage();

  const containerVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    hover: { scale: 1.02 },
  };

  const progressVariants = {
    initial: { width: 0 },
    animate: { width: `${progress}%` },
  };

  return (
    <StatusContainer
      size={size}
      variants={animated ? containerVariants : {}}
      initial={animated ? 'initial' : false}
      animate={animated ? 'animate' : false}
      whileHover={animated ? 'hover' : false}
      transition={{ duration: 0.3 }}
    >
      <StatusHeader>
        <Chip
          icon={statusConfig.icon}
          label={statusConfig.label}
          color={statusConfig.chipColor}
          size={size === 'small' ? 'small' : 'medium'}
          sx={{
            fontWeight: 600,
            '& .MuiChip-icon': {
              color: 'inherit',
            },
          }}
        />
        {dueDateMessage && (
          <Tooltip title={dueDateMessage}>
            <Typography
              variant={size === 'small' ? 'caption' : 'body2'}
              color="text.secondary"
              sx={{ fontSize: size === 'small' ? '0.7rem' : undefined }}
            >
              {dueDateMessage.split(' ').slice(0, 2).join(' ')}
            </Typography>
          </Tooltip>
        )}
      </StatusHeader>

      {showProgress && status !== 'draft' && (
        <ProgressContainer>
          <StyledLinearProgress
            variant="determinate"
            value={progress}
            status={status}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              variant={size === 'small' ? 'caption' : 'body2'}
              color="text.secondary"
              sx={{ fontSize: size === 'small' ? '0.7rem' : undefined }}
            >
              {formatCurrency(paidAmount, currency)} of {formatCurrency(amount, currency)}
            </Typography>
            {remainingAmount > 0 && (
              <Typography
                variant={size === 'small' ? 'caption' : 'body2'}
                color={status === 'overdue' ? 'error.main' : 'text.secondary'}
                sx={{ 
                  fontSize: size === 'small' ? '0.7rem' : undefined,
                  fontWeight: status === 'overdue' ? 600 : 400,
                }}
              >
                {formatCurrency(remainingAmount, currency)} remaining
              </Typography>
            )}
          </Box>
        </ProgressContainer>
      )}

      {status === 'draft' && (
        <Typography
          variant={size === 'small' ? 'caption' : 'body2'}
          color="text.secondary"
          sx={{ fontSize: size === 'small' ? '0.7rem' : undefined }}
        >
          {formatCurrency(amount, currency)} (unsent)
        </Typography>
      )}
    </StatusContainer>
  );
};

export default PaymentStatusIndicator;