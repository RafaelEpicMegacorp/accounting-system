import React from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Typography,
  Paper,
  Box,
  Chip,
  styled,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send,
  Visibility,
  Payment,
  CheckCircle,
  Warning,
  Schedule,
  Receipt,
  Email,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '../../services/invoiceService';

interface PaymentEvent {
  id: string;
  type: 'created' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'reminder' | 'partial_payment';
  date: string;
  amount?: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface PaymentTimelineProps {
  events: PaymentEvent[];
  totalAmount: number;
  currency?: string;
  compact?: boolean;
  animated?: boolean;
}

const StyledTimelineItem = styled(TimelineItem)(({ theme }) => ({
  '&:before': {
    display: 'none',
  },
  minHeight: 60,
}));

const TimelineCard = styled(motion(Paper))(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1),
  boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.1)}`,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.15)}`,
    transform: 'translateY(-2px)',
  },
}));

const EventHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 8,
});

const PaymentTimeline: React.FC<PaymentTimelineProps> = ({
  events,
  totalAmount,
  currency = 'USD',
  compact = false,
  animated = true,
}) => {
  const theme = useTheme();

  const getEventConfig = (event: PaymentEvent) => {
    switch (event.type) {
      case 'created':
        return {
          icon: <Receipt sx={{ fontSize: 20 }} />,
          color: theme.palette.info.main,
          backgroundColor: alpha(theme.palette.info.main, 0.1),
          title: 'Invoice Created',
          description: 'Invoice was created and saved as draft',
          chipColor: 'info' as const,
          chipLabel: 'Created',
        };
      case 'sent':
        return {
          icon: <Send sx={{ fontSize: 20 }} />,
          color: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          title: 'Invoice Sent',
          description: 'Invoice was sent to client',
          chipColor: 'primary' as const,
          chipLabel: 'Sent',
        };
      case 'viewed':
        return {
          icon: <Visibility sx={{ fontSize: 20 }} />,
          color: theme.palette.secondary.main,
          backgroundColor: alpha(theme.palette.secondary.main, 0.1),
          title: 'Invoice Viewed',
          description: 'Client opened and viewed the invoice',
          chipColor: 'secondary' as const,
          chipLabel: 'Viewed',
        };
      case 'paid':
        return {
          icon: <CheckCircle sx={{ fontSize: 20 }} />,
          color: theme.palette.success.main,
          backgroundColor: alpha(theme.palette.success.main, 0.1),
          title: 'Payment Received',
          description: 'Full payment has been received',
          chipColor: 'success' as const,
          chipLabel: 'Paid',
        };
      case 'partial_payment':
        return {
          icon: <Payment sx={{ fontSize: 20 }} />,
          color: theme.palette.warning.main,
          backgroundColor: alpha(theme.palette.warning.main, 0.1),
          title: 'Partial Payment',
          description: 'Partial payment has been received',
          chipColor: 'warning' as const,
          chipLabel: 'Partial',
        };
      case 'overdue':
        return {
          icon: <ErrorIcon sx={{ fontSize: 20 }} />,
          color: theme.palette.error.main,
          backgroundColor: alpha(theme.palette.error.main, 0.1),
          title: 'Invoice Overdue',
          description: 'Invoice payment is now overdue',
          chipColor: 'error' as const,
          chipLabel: 'Overdue',
        };
      case 'reminder':
        return {
          icon: <Email sx={{ fontSize: 20 }} />,
          color: theme.palette.orange?.main || theme.palette.warning.main,
          backgroundColor: alpha(theme.palette.orange?.main || theme.palette.warning.main, 0.1),
          title: 'Reminder Sent',
          description: 'Payment reminder was sent to client',
          chipColor: 'warning' as const,
          chipLabel: 'Reminder',
        };
      default:
        return {
          icon: <Schedule sx={{ fontSize: 20 }} />,
          color: theme.palette.grey[500],
          backgroundColor: alpha(theme.palette.grey[500], 0.1),
          title: 'Unknown Event',
          description: 'Unknown event type',
          chipColor: 'default' as const,
          chipLabel: 'Unknown',
        };
    }
  };

  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (index: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: index * 0.1,
        duration: 0.3,
      },
    }),
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {sortedEvents.map((event, index) => {
          const config = getEventConfig(event);
          return (
            <motion.div
              key={event.id}
              variants={animated ? itemVariants : {}}
              initial={animated ? 'hidden' : false}
              animate={animated ? 'visible' : false}
              custom={index}
            >
              <Chip
                icon={config.icon}
                label={config.chipLabel}
                color={config.chipColor}
                size="small"
                sx={{
                  '& .MuiChip-icon': {
                    color: 'inherit',
                  },
                }}
              />
            </motion.div>
          );
        })}
      </Box>
    );
  }

  return (
    <Timeline position="right">
      {sortedEvents.map((event, index) => {
        const config = getEventConfig(event);
        const isLast = index === sortedEvents.length - 1;

        return (
          <StyledTimelineItem key={event.id}>
            <TimelineOppositeContent sx={{ flex: 0.3, paddingRight: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {formatDate(event.date)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(event.date).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Typography>
            </TimelineOppositeContent>

            <TimelineSeparator>
              <TimelineDot
                sx={{
                  backgroundColor: config.backgroundColor,
                  border: `2px solid ${config.color}`,
                  color: config.color,
                  padding: 1,
                }}
              >
                {config.icon}
              </TimelineDot>
              {!isLast && (
                <TimelineConnector 
                  sx={{ 
                    backgroundColor: theme.palette.divider,
                    minHeight: 40,
                  }} 
                />
              )}
            </TimelineSeparator>

            <TimelineContent sx={{ flex: 1 }}>
              <motion.div
                variants={animated ? itemVariants : {}}
                initial={animated ? 'hidden' : false}
                animate={animated ? 'visible' : false}
                custom={index}
              >
                <TimelineCard
                  whileHover={animated ? { y: -2 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <EventHeader>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {config.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.description || config.description}
                      </Typography>
                    </Box>
                    <Chip
                      label={config.chipLabel}
                      color={config.chipColor}
                      size="small"
                      sx={{
                        minWidth: 70,
                        '& .MuiChip-label': {
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        },
                      }}
                    />
                  </EventHeader>

                  {event.amount && (
                    <Box sx={{ 
                      mt: 1, 
                      p: 1, 
                      backgroundColor: alpha(config.color, 0.05),
                      borderRadius: 1,
                      border: `1px solid ${alpha(config.color, 0.2)}`,
                    }}>
                      <Typography variant="body2" fontWeight={600} color={config.color}>
                        {formatCurrency(event.amount, currency)}
                        {event.type === 'partial_payment' && (
                          <Typography 
                            component="span" 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            of {formatCurrency(totalAmount, currency)}
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  )}

                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <Typography 
                          key={key}
                          variant="caption" 
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {key}: {String(value)}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </TimelineCard>
              </motion.div>
            </TimelineContent>
          </StyledTimelineItem>
        );
      })}
    </Timeline>
  );
};

export default PaymentTimeline;