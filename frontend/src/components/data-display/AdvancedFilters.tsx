import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuList,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Collapse,
  Typography,
  Divider,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Bookmark as BookmarkIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { InvoiceStatus, getStatusOptions } from '../../services/invoiceService';

export interface FilterState {
  status: InvoiceStatus | '';
  clientSearch: string;
  amountMin: string;
  amountMax: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  orderType: 'all' | 'manual' | 'recurring';
  dueDateStatus: 'all' | 'upcoming' | 'due' | 'overdue';
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: Date;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApplyFilters: () => void;
  loading?: boolean;
}

const defaultFilters: FilterState = {
  status: '',
  clientSearch: '',
  amountMin: '',
  amountMax: '',
  dateFrom: null,
  dateTo: null,
  orderType: 'all',
  dueDateStatus: 'all',
};

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  loading = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveMenuAnchor, setSaveMenuAnchor] = useState<null | HTMLElement>(null);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Load saved filters from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('invoice-saved-filters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedFilters(parsed.map((f: any) => ({
          ...f,
          createdAt: new Date(f.createdAt),
          filters: {
            ...f.filters,
            dateFrom: f.filters.dateFrom ? new Date(f.filters.dateFrom) : null,
            dateTo: f.filters.dateTo ? new Date(f.filters.dateTo) : null,
          }
        })));
      } catch (error) {
        console.error('Failed to load saved filters:', error);
      }
    }
  }, []);

  // Save filters to localStorage whenever savedFilters changes
  useEffect(() => {
    localStorage.setItem('invoice-saved-filters', JSON.stringify(savedFilters));
  }, [savedFilters]);

  const handleFilterChange = (field: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [field]: value };
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    onFiltersChange(defaultFilters);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: { ...filters },
      createdAt: new Date(),
    };

    setSavedFilters(prev => [newFilter, ...prev]);
    setFilterName('');
    setShowSaveDialog(false);
    setSaveMenuAnchor(null);
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    onFiltersChange(savedFilter.filters);
    setSaveMenuAnchor(null);
  };

  const handleDeleteFilter = (filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const isFiltersApplied = () => {
    return Object.keys(filters).some(key => {
      const value = filters[key as keyof FilterState];
      const defaultValue = defaultFilters[key as keyof FilterState];
      
      if (value instanceof Date || defaultValue instanceof Date) {
        return value !== defaultValue;
      }
      return value !== defaultValue;
    });
  };

  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(key => {
      const value = filters[key as keyof FilterState];
      const defaultValue = defaultFilters[key as keyof FilterState];
      
      if (value instanceof Date || defaultValue instanceof Date) {
        return value !== defaultValue;
      }
      return value !== defaultValue && value !== '';
    }).length;
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        {/* Filter Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={() => setExpanded(!expanded)}
              sx={{ mr: 1 }}
            >
              {expanded ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
            <FilterIcon sx={{ mr: 1, color: 'action.active' }} />
            <Typography variant="h6" component="span">
              Advanced Filters
            </Typography>
            {getActiveFiltersCount() > 0 && (
              <Chip
                label={`${getActiveFiltersCount()} active`}
                size="small"
                color="primary"
                sx={{ ml: 2 }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Saved Filters Menu */}
            <Tooltip title="Saved filters">
              <IconButton
                onClick={(e) => setSaveMenuAnchor(e.currentTarget)}
                color={savedFilters.length > 0 ? 'primary' : 'default'}
              >
                <BookmarkIcon />
              </IconButton>
            </Tooltip>

            {/* Clear Filters */}
            {isFiltersApplied() && (
              <Tooltip title="Clear filters">
                <IconButton onClick={handleClearFilters} color="error">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            )}

            {/* Apply Button */}
            <Button
              variant={isFiltersApplied() ? 'contained' : 'outlined'}
              onClick={onApplyFilters}
              disabled={loading}
              startIcon={<FilterIcon />}
            >
              Apply Filters
            </Button>
          </Box>
        </Box>

        {/* Filter Controls */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                {/* Status Filter */}
                <Grid xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.status}
                      label="Status"
                      onChange={(e) => handleFilterChange('status', e.target.value)}
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

                {/* Client Search */}
                <Grid xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Client Name"
                    value={filters.clientSearch}
                    onChange={(e) => handleFilterChange('clientSearch', e.target.value)}
                    placeholder="Search by client name..."
                  />
                </Grid>

                {/* Amount Range */}
                <Grid xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Min Amount"
                    type="number"
                    value={filters.amountMin}
                    onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                    placeholder="0"
                  />
                </Grid>

                <Grid xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Max Amount"
                    type="number"
                    value={filters.amountMax}
                    onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                    placeholder="No limit"
                  />
                </Grid>

                {/* Date Range */}
                <Grid xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Date From"
                    value={filters.dateFrom}
                    onChange={(date) => handleFilterChange('dateFrom', date)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </Grid>

                <Grid xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Date To"
                    value={filters.dateTo}
                    onChange={(date) => handleFilterChange('dateTo', date)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </Grid>

                {/* Order Type */}
                <Grid xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Order Type</InputLabel>
                    <Select
                      value={filters.orderType}
                      label="Order Type"
                      onChange={(e) => handleFilterChange('orderType', e.target.value)}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="manual">Manual Invoices</MenuItem>
                      <MenuItem value="recurring">Recurring Orders</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Due Date Status */}
                <Grid xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Due Date Status</InputLabel>
                    <Select
                      value={filters.dueDateStatus}
                      label="Due Date Status"
                      onChange={(e) => handleFilterChange('dueDateStatus', e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="upcoming">Upcoming (7 days)</MenuItem>
                      <MenuItem value="due">Due Today</MenuItem>
                      <MenuItem value="overdue">Overdue</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Save Filter Section */}
              {isFiltersApplied() && (
                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                      size="small"
                      label="Filter Name"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="e.g., Overdue Invoices"
                      sx={{ minWidth: 200 }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveFilter}
                      disabled={!filterName.trim()}
                    >
                      Save Filter
                    </Button>
                  </Box>
                </Box>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Filters Menu */}
        <Menu
          anchorEl={saveMenuAnchor}
          open={Boolean(saveMenuAnchor)}
          onClose={() => setSaveMenuAnchor(null)}
          PaperProps={{
            style: {
              maxHeight: 300,
              width: 300,
            },
          }}
        >
          {savedFilters.length === 0 ? (
            <MenuItem disabled>
              <ListItemText primary="No saved filters" />
            </MenuItem>
          ) : (
            savedFilters.map((savedFilter) => (
              <MenuItem
                key={savedFilter.id}
                onClick={() => handleLoadFilter(savedFilter)}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  pr: 1,
                }}
              >
                <ListItemText
                  primary={savedFilter.name}
                  secondary={`Saved ${savedFilter.createdAt.toLocaleDateString()}`}
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFilter(savedFilter.id);
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </MenuItem>
            ))
          )}
        </Menu>
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;