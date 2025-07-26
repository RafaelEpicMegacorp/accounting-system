import React from 'react';
import {
  Chip,
  Badge,
  Box,
  Typography,
  styled,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Schedule,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  HourglassEmpty,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

export type AgingCategory = 'current' | 'days-1-30' | 'days-31-60' | 'days-61-90' | 'days-90-plus';

interface InvoiceAgingBadgeProps {
  dueDate: string;
  status: 'paid' | 'pending' | 'partial' | 'overdue' | 'draft';
  variant?: 'badge' | 'chip' | 'detailed';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  showTooltip?: boolean;
}

const AnimatedContainer = styled(motion.div)({
  display: 'inline-flex',
});

const DetailedContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  minWidth: 80,
}));

const AgingNumber = styled(Typography)<{ severity: string }>(({ theme, severity }) => {
  const getColor = () => {
    switch (severity) {
      case 'success':
        return theme.palette.success.main;
      case 'info':
        return theme.palette.info.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  return {
    fontWeight: 700,
    fontSize: '1.25rem',
    color: getColor(),
    lineHeight: 1,
  };
});

const InvoiceAgingBadge: React.FC<InvoiceAgingBadgeProps> = ({
  dueDate,
  status,
  variant = 'chip',
  size = 'medium',
  animated = true,
  showTooltip = true,
}) => {
  const theme = useTheme();

  const calculateAging = () => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let category: AgingCategory;
    let severity: 'success' | 'info' | 'warning' | 'error' | 'default';
    let label: string;
    let icon: React.ReactNode;
    let description: string;

    if (status === 'paid') {
      category = 'current';
      severity = 'success';
      label = 'Paid';
      icon = <CheckCircle sx={{ fontSize: size === 'small' ? 14 : 16 }} />;
      description = 'Invoice has been paid';
    } else if (status === 'draft') {
      category = 'current';
      severity = 'default';
      label = 'Draft';
      icon = <HourglassEmpty sx={{ fontSize: size === 'small' ? 14 : 16 }} />;
      description = 'Invoice is in draft status';
    } else if (diffDays <= 0) {
      category = 'current';
      severity = 'info';
      const daysUntilDue = Math.abs(diffDays);
      label = daysUntilDue === 0 ? 'Due Today' : `${daysUntilDue}d left`;
      icon = <Schedule sx={{ fontSize: size === 'small' ? 14 : 16 }} />;
      description = daysUntilDue === 0 
        ? 'Invoice is due today' 
        : `Invoice is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;
    } else if (diffDays <= 30) {
      category = 'days-1-30';
      severity = 'warning';
      label = `${diffDays}d overdue`;
      icon = <Warning sx={{ fontSize: size === 'small' ? 14 : 16 }} />;
      description = `Invoice is ${diffDays} day${diffDays !== 1 ? 's' : ''} overdue`;
    } else if (diffDays <= 60) {
      category = 'days-31-60';
      severity = 'error';
      label = `${diffDays}d overdue`;
      icon = <ErrorIcon sx={{ fontSize: size === 'small' ? 14 : 16 }} />;
      description = `Invoice is ${diffDays} days overdue (31-60 days range)`;
    } else if (diffDays <= 90) {
      category = 'days-61-90';
      severity = 'error';
      label = `${diffDays}d overdue`;
      icon = <ErrorIcon sx={{ fontSize: size === 'small' ? 14 : 16 }} />;
      description = `Invoice is ${diffDays} days overdue (61-90 days range)`;
    } else {
      category = 'days-90-plus';
      severity = 'error';
      label = `${diffDays}d overdue`;
      icon = <ErrorIcon sx={{ fontSize: size === 'small' ? 14 : 16 }} />;
      description = `Invoice is ${diffDays} days overdue (90+ days range)`;
    }

    return {
      category,
      severity,
      label,
      icon,
      description,
      daysOverdue: Math.max(0, diffDays),
      daysUntilDue: Math.max(0, -diffDays),
    };
  };

  const aging = calculateAging();

  const getAgingColor = () => {
    switch (aging.severity) {
      case 'success':
        return theme.palette.success;
      case 'info':
        return theme.palette.info;
      case 'warning':
        return theme.palette.warning;
      case 'error':
        return theme.palette.error;
      default:
        return theme.palette.grey;
    }
  };

  const agingColor = getAgingColor();

  const containerVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    hover: { scale: 1.05 },
  };

  const renderBadge = () => (
    <Badge
      badgeContent={aging.daysOverdue > 0 ? aging.daysOverdue : null}
      color={aging.severity === 'error' ? 'error' : 'warning'}
      max={999}
      sx={{
        '& .MuiBadge-badge': {
          fontSize: size === 'small' ? '0.6rem' : '0.75rem',
          height: size === 'small' ? 16 : 20,
          minWidth: size === 'small' ? 16 : 20,
        },
      }}
    >
      {aging.icon}
    </Badge>
  );

  const renderChip = () => (
    <Chip
      icon={aging.icon}
      label={aging.label}
      color={aging.severity === 'default' ? 'default' : aging.severity}
      size={size === 'large' ? 'medium' : 'small'}
      variant={aging.severity === 'success' ? 'filled' : 'outlined'}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : undefined,
        '& .MuiChip-icon': {
          color: 'inherit',
        },
        ...(aging.severity === 'error' && {
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': {
              transform: 'scale(1)',
            },
            '50%': {
              transform: 'scale(1.05)',
            },
            '100%': {
              transform: 'scale(1)',
            },
          },
        }),
      }}
    />
  );

  const renderDetailed = () => (
    <DetailedContainer>
      <Box sx={{ color: agingColor.main }}>
        {aging.icon}
      </Box>
      <AgingNumber severity={aging.severity}>
        {aging.daysOverdue > 0 ? aging.daysOverdue : aging.daysUntilDue}
      </AgingNumber>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ 
          fontSize: '0.7rem',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {aging.daysOverdue > 0 
          ? `day${aging.daysOverdue !== 1 ? 's' : ''} overdue`
          : aging.daysUntilDue > 0
          ? `day${aging.daysUntilDue !== 1 ? 's' : ''} left`
          : aging.label.toLowerCase()
        }
      </Typography>
    </DetailedContainer>
  );

  const renderContent = () => {
    switch (variant) {
      case 'badge':
        return renderBadge();
      case 'detailed':
        return renderDetailed();
      default:
        return renderChip();
    }
  };

  const content = (
    <AnimatedContainer
      variants={animated ? containerVariants : {}}
      initial={animated ? 'initial' : false}
      animate={animated ? 'animate' : false}
      whileHover={animated ? 'hover' : false}
      transition={{ duration: 0.2 }}
    >
      {renderContent()}
    </AnimatedContainer>
  );

  if (showTooltip && variant !== 'detailed') {
    return (
      <Tooltip 
        title={aging.description}
        placement="top"
        arrow
      >
        <Box component="span">
          {content}
        </Box>
      </Tooltip>
    );
  }

  return content;
};

export default InvoiceAgingBadge;