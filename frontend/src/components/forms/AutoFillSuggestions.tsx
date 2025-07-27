import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Collapse,
  Alert,
  styled,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AutoFixHigh as MagicIcon,
  CheckCircle as AcceptIcon,
  Close as RejectIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Psychology as AIIcon,
  TrendingUp as ConfidenceIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../services/invoiceService';

interface AutoFillSuggestion {
  field: string;
  value: any;
  confidence: number;
  reason: string;
}

interface AutoFillSuggestionsProps {
  suggestions: AutoFillSuggestion[];
  onApplySuggestion: (suggestion: AutoFillSuggestion) => void;
  onApplyAllSuggestions: () => void;
  onRejectSuggestion: (suggestion: AutoFillSuggestion) => void;
  onClearSuggestions: () => void;
  isLoading?: boolean;
  className?: string;
}

const SuggestionCard = styled(motion(Card))(({ theme }) => ({
  marginBottom: theme.spacing(2),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  backgroundColor: alpha(theme.palette.primary.main, 0.02),
  '&:hover': {
    borderColor: alpha(theme.palette.primary.main, 0.4),
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  },
}));

const ConfidenceBar = styled(LinearProgress)<{ confidence: number }>(
  ({ theme, confidence }) => ({
    height: 6,
    borderRadius: 3,
    backgroundColor: alpha(theme.palette.grey[300], 0.3),
    '& .MuiLinearProgress-bar': {
      borderRadius: 3,
      backgroundColor: confidence >= 0.8 
        ? theme.palette.success.main
        : confidence >= 0.6
        ? theme.palette.warning.main
        : theme.palette.error.main,
    },
  })
);

const SuggestionItem = styled(motion(ListItem))(({ theme }) => ({
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: alpha(theme.palette.action.hover, 0.1),
  },
}));

const AutoFillSuggestions: React.FC<AutoFillSuggestionsProps> = ({
  suggestions,
  onApplySuggestion,
  onApplyAllSuggestions,
  onRejectSuggestion,
  onClearSuggestions,
  isLoading = false,
  className,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(true);

  const getFieldDisplayName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      amount: 'Amount',
      currency: 'Currency',
      dueDate: 'Due Date',
      issueDate: 'Issue Date',
      clientId: 'Client',
      companyId: 'Company',
      orderId: 'Order',
      description: 'Description',
    };
    return fieldMap[field] || field;
  };

  const formatSuggestionValue = (field: string, value: any): string => {
    switch (field) {
      case 'amount':
        return formatCurrency(value);
      case 'dueDate':
      case 'issueDate':
        return new Date(value).toLocaleDateString();
      case 'currency':
        return value;
      default:
        return String(value);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return theme.palette.success.main;
    if (confidence >= 0.6) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.3,
        staggerChildren: 0.1
      }
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
  };

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <SuggestionCard>
        <CardContent sx={{ pb: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
              cursor: 'pointer',
            }}
            onClick={() => setExpanded(!expanded)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Smart Auto-Fill Suggestions
              </Typography>
              <Chip
                label={suggestions.length}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {suggestions.length > 1 && (
                <Button
                  size="small"
                  startIcon={<MagicIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyAllSuggestions();
                  }}
                  variant="outlined"
                >
                  Apply All
                </Button>
              )}
              <IconButton size="small">
                {expanded ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            </Box>
          </Box>

          <Collapse in={expanded}>
            {isLoading ? (
              <Box sx={{ py: 2 }}>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Analyzing patterns and generating suggestions...
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                <AnimatePresence>
                  {suggestions.map((suggestion, index) => (
                    <SuggestionItem
                      key={`${suggestion.field}-${index}`}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      sx={{ pl: 2, pr: 1 }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {getFieldDisplayName(suggestion.field)}:
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {formatSuggestionValue(suggestion.field, suggestion.value)}
                            </Typography>
                            <Chip
                              label={getConfidenceLabel(suggestion.confidence)}
                              size="small"
                              sx={{
                                fontSize: '0.7rem',
                                height: 20,
                                backgroundColor: alpha(getConfidenceColor(suggestion.confidence), 0.1),
                                color: getConfidenceColor(suggestion.confidence),
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {suggestion.reason}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                              <ConfidenceIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <ConfidenceBar
                                variant="determinate"
                                value={suggestion.confidence * 100}
                                confidence={suggestion.confidence}
                                sx={{ flexGrow: 1, maxWidth: 100 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {Math.round(suggestion.confidence * 100)}%
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => onApplySuggestion(suggestion)}
                            sx={{
                              color: 'success.main',
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.success.main, 0.1),
                              },
                            }}
                          >
                            <AcceptIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => onRejectSuggestion(suggestion)}
                            sx={{
                              color: 'error.main',
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.error.main, 0.1),
                              },
                            }}
                          >
                            <RejectIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </SuggestionItem>
                  ))}
                </AnimatePresence>
              </List>
            )}

            {suggestions.length > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                  <strong>AI-powered suggestions</strong> based on your client history, 
                  order patterns, and form usage patterns. Click ✓ to apply or ✗ to dismiss.
                </Alert>
              </Box>
            )}
          </Collapse>
        </CardContent>
      </SuggestionCard>
    </motion.div>
  );
};

export default AutoFillSuggestions;