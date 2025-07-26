import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as OrderIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

export interface SearchSuggestion {
  id: string;
  type: 'client' | 'invoice' | 'order' | 'history' | 'trending';
  title: string;
  subtitle?: string;
  category: string;
}

interface AdvancedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  showHistory?: boolean;
  maxSuggestions?: number;
}

const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search invoices, clients, orders...",
  showHistory = true,
  maxSuggestions = 8,
}) => {
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Search history from localStorage
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('search-history');
    return saved ? JSON.parse(saved) : [];
  });

  // Debounced search suggestions
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['search-suggestions', value],
    queryFn: async () => {
      if (!value.trim() || value.length < 2) return [];
      
      // This would normally call your API
      // For now, we'll return mock suggestions
      const mockSuggestions: SearchSuggestion[] = [
        {
          id: '1',
          type: 'client',
          title: 'Acme Corporation',
          subtitle: '15 invoices',
          category: 'Clients',
        },
        {
          id: '2',
          type: 'invoice',
          title: 'INV-2024-001',
          subtitle: '$2,500.00 • Due in 5 days',
          category: 'Invoices',
        },
        {
          id: '3',
          type: 'order',
          title: 'Monthly Web Hosting',
          subtitle: 'Recurring order • Next: Jan 15',
          category: 'Orders',
        },
      ].filter(item => 
        item.title.toLowerCase().includes(value.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(value.toLowerCase())
      );

      return mockSuggestions;
    },
    enabled: value.length >= 2,
    staleTime: 30000, // 30 seconds
  });

  // Get all suggestions including history
  const allSuggestions = React.useMemo(() => {
    const results: SearchSuggestion[] = [];

    // Add search suggestions from API
    results.push(...suggestions);

    // Add search history if showing and query is short
    if (showHistory && value.length < 2) {
      const historySuggestions: SearchSuggestion[] = searchHistory
        .slice(0, 3)
        .map((term, index) => ({
          id: `history-${index}`,
          type: 'history' as const,
          title: term,
          category: 'Recent Searches',
        }));
      results.push(...historySuggestions);
    }

    // Add trending searches if no query
    if (!value.trim()) {
      const trendingSuggestions: SearchSuggestion[] = [
        {
          id: 'trending-1',
          type: 'trending',
          title: 'overdue invoices',
          category: 'Trending',
        },
        {
          id: 'trending-2',
          type: 'trending',
          title: 'this month',
          category: 'Trending',
        },
      ];
      results.push(...trendingSuggestions);
    }

    return results.slice(0, maxSuggestions);
  }, [suggestions, searchHistory, value, showHistory, maxSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!focused || allSuggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(allSuggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setFocused(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    const searchTerm = suggestion.title;
    onChange(searchTerm);
    addToHistory(searchTerm);
    onSearch(searchTerm);
    setFocused(false);
    setSelectedIndex(-1);
  };

  // Handle search submission
  const handleSearch = () => {
    if (value.trim()) {
      addToHistory(value.trim());
      onSearch(value.trim());
      setFocused(false);
      setSelectedIndex(-1);
    }
  };

  // Add to search history
  const addToHistory = (term: string) => {
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('search-history', JSON.stringify(newHistory));
  };

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search-history');
  };

  // Get icon for suggestion type
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'client':
        return <PersonIcon fontSize="small" />;
      case 'invoice':
        return <ReceiptIcon fontSize="small" />;
      case 'order':
        return <OrderIcon fontSize="small" />;
      case 'history':
        return <HistoryIcon fontSize="small" />;
      case 'trending':
        return <TrendingIcon fontSize="small" />;
      default:
        return <SearchIcon fontSize="small" />;
    }
  };

  // Group suggestions by category
  const groupedSuggestions = React.useMemo(() => {
    const groups: Record<string, SearchSuggestion[]> = {};
    allSuggestions.forEach(suggestion => {
      if (!groups[suggestion.category]) {
        groups[suggestion.category] = [];
      }
      groups[suggestion.category].push(suggestion);
    });
    return groups;
  }, [allSuggestions]);

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <TextField
        ref={inputRef}
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Delay to allow clicking on suggestions
          setTimeout(() => setFocused(false), 150);
        }}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: value && (
            <InputAdornment position="end">
              <Tooltip title="Clear search">
                <IconButton
                  size="small"
                  onClick={() => onChange('')}
                  edge="end"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            transition: 'all 0.2s ease-in-out',
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
              },
            },
          },
        }}
      />

      {/* Search Suggestions Dropdown */}
      <AnimatePresence>
        {focused && (allSuggestions.length > 0 || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1300,
              marginTop: 4,
            }}
          >
            <Paper
              elevation={8}
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                backdropFilter: 'blur(10px)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {isLoading ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Searching...
                  </Typography>
                </Box>
              ) : (
                <List ref={listRef} dense>
                  {Object.entries(groupedSuggestions).map(([category, items], categoryIndex) => (
                    <React.Fragment key={category}>
                      {categoryIndex > 0 && <Divider />}
                      
                      {/* Category Header */}
                      <ListItem
                        sx={{
                          py: 0.5,
                          bgcolor: 'action.hover',
                          borderRadius: 0,
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 'medium', textTransform: 'uppercase' }}
                        >
                          {category}
                        </Typography>
                        {category === 'Recent Searches' && searchHistory.length > 0 && (
                          <Tooltip title="Clear history">
                            <IconButton
                              size="small"
                              onClick={clearHistory}
                              sx={{ ml: 'auto', p: 0.5 }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </ListItem>

                      {/* Category Items */}
                      {items.map((suggestion, index) => {
                        const globalIndex = allSuggestions.indexOf(suggestion);
                        const isSelected = selectedIndex === globalIndex;
                        
                        return (
                          <ListItem
                            key={suggestion.id}
                            button
                            selected={isSelected}
                            onClick={() => handleSuggestionClick(suggestion)}
                            sx={{
                              borderRadius: 1,
                              mx: 1,
                              mb: 0.5,
                              '&.Mui-selected': {
                                bgcolor: 'primary.light',
                                color: 'primary.contrastText',
                                '&:hover': {
                                  bgcolor: 'primary.main',
                                },
                              },
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                              {getSuggestionIcon(suggestion.type)}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: suggestion.type === 'history' ? 'normal' : 'medium',
                                  }}
                                >
                                  {suggestion.title}
                                </Typography>
                              }
                              secondary={
                                suggestion.subtitle && (
                                  <Typography variant="caption" color="text.secondary">
                                    {suggestion.subtitle}
                                  </Typography>
                                )
                              }
                            />
                          </ListItem>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default AdvancedSearchBar;