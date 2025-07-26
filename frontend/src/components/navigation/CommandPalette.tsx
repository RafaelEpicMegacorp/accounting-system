import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Chip,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  NavigateNext as NavigateIcon,
  PlayArrow as ActionIcon,
  Settings as SettingsIcon,
  Lightbulb as SuggestionIcon,
} from '@mui/icons-material';
import { getQuickActions, navigationItems, QuickAction } from './navigationConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useAppTheme } from '../../theme/ThemeProvider';
import { designTokens } from '../../theme/theme';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { toggleMode } = useAppTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get actions with proper implementations
  const quickActions = getQuickActions().map(action => ({
    ...action,
    action: () => {
      switch (action.id) {
        case 'toggle-theme':
          toggleMode();
          break;
        default:
          if (action.id.startsWith('nav-')) {
            const path = action.id.replace('nav-', '');
            const navItem = navigationItems.find(item => item.id === path);
            if (navItem) {
              navigate(navItem.path);
            }
          } else {
            // Placeholder for other actions
            console.log(`Executing action: ${action.id}`);
          }
          break;
      }
      onClose();
    },
  }));

  // Filter actions based on authentication
  const filteredActions = quickActions.filter(action => {
    if (action.category === 'navigation') {
      const navId = action.id.replace('nav-', '');
      const navItem = navigationItems.find(item => item.id === navId);
      return !navItem?.requiresAuth || isAuthenticated;
    }
    return action.category !== 'action' || isAuthenticated;
  });

  // Group actions by category
  const groupedActions = filteredActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  // Keyboard shortcuts
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    if (!open) {
      // Will be handled by parent component
    }
  }, { enableOnContentEditable: true, enableOnFormTags: true });

  useHotkeys('escape', () => {
    if (open) {
      onClose();
    }
  }, { enableOnContentEditable: true, enableOnFormTags: true });

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [open]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation':
        return NavigateIcon;
      case 'action':
        return ActionIcon;
      case 'settings':
        return SettingsIcon;
      default:
        return SuggestionIcon;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'navigation':
        return 'Navigation';
      case 'action':
        return 'Actions';
      case 'settings':
        return 'Settings';
      case 'search':
        return 'Search';
      default:
        return 'Suggestions';
    }
  };

  const dialogVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: -20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
        duration: 0.2,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -20,
      transition: {
        duration: 0.15,
      },
    },
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={onClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            component: motion.div,
            variants: dialogVariants,
            initial: "hidden",
            animate: "visible",
            exit: "exit",
            sx: {
              borderRadius: 3,
              boxShadow: designTokens.shadows.xl,
              backgroundColor: theme.palette.background.paper,
              backgroundImage: 'none',
              overflow: 'hidden',
            },
          }}
          sx={{
            '& .MuiBackdrop-root': {
              backgroundColor: alpha(theme.palette.common.black, 0.4),
              backdropFilter: 'blur(8px)',
            },
          }}
        >
          <DialogContent sx={{ p: 0 }}>
            <Command
              style={{
                backgroundColor: 'transparent',
              }}
            >
              {/* Search Input */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 3,
                  py: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 2 }} />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search for actions, pages, or settings..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '1rem',
                    color: theme.palette.text.primary,
                    width: '100%',
                    fontFamily: theme.typography.fontFamily,
                  }}
                />
                <Chip
                  label="ESC"
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 24,
                    fontSize: '0.75rem',
                    borderColor: theme.palette.divider,
                  }}
                />
              </Box>

              {/* Results */}
              <Command.List
                style={{
                  maxHeight: '400px',
                  overflow: 'auto',
                  padding: '8px',
                }}
              >
                <Command.Empty>
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    <SuggestionIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2">
                      No results found for "{search}"
                    </Typography>
                  </Box>
                </Command.Empty>

                {Object.entries(groupedActions).map(([category, actions]) => {
                  const CategoryIcon = getCategoryIcon(category);
                  
                  return (
                    <Command.Group key={category} heading={getCategoryLabel(category)}>
                      <Box sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            px: 2,
                            py: 1,
                            mb: 1,
                          }}
                        >
                          <CategoryIcon
                            sx={{
                              fontSize: 16,
                              color: theme.palette.text.secondary,
                              mr: 1,
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              color: theme.palette.text.secondary,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                            }}
                          >
                            {getCategoryLabel(category)}
                          </Typography>
                        </Box>
                        {actions.map((action) => (
                          <Command.Item
                            key={action.id}
                            value={`${action.label} ${action.keywords?.join(' ') || ''}`}
                            onSelect={() => action.action()}
                            style={{
                              padding: 0,
                              margin: 0,
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 2,
                                py: 1.5,
                                borderRadius: 2,
                                cursor: 'pointer',
                                transition: `all ${designTokens.animations.durations.shorter}ms`,
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                },
                                '&[data-selected="true"]': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                  borderLeft: `3px solid ${theme.palette.primary.main}`,
                                },
                              }}
                            >
                              {action.icon && (
                                <Box
                                  sx={{
                                    mr: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: theme.palette.text.secondary,
                                  }}
                                >
                                  <action.icon fontSize="small" />
                                </Box>
                              )}
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {action.label}
                                </Typography>
                                {action.description && (
                                  <Typography
                                    variant="caption"
                                    sx={{ color: theme.palette.text.secondary }}
                                  >
                                    {action.description}
                                  </Typography>
                                )}
                              </Box>
                              {action.shortcut && (
                                <Chip
                                  label={action.shortcut}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    borderColor: theme.palette.divider,
                                    '& .MuiChip-label': {
                                      px: 1,
                                    },
                                  }}
                                />
                              )}
                            </Box>
                          </Command.Item>
                        ))}
                      </Box>
                      {Object.keys(groupedActions).indexOf(category) < Object.keys(groupedActions).length - 1 && (
                        <Divider sx={{ my: 1 }} />
                      )}
                    </Command.Group>
                  );
                })}
              </Command.List>

              {/* Footer */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 3,
                  py: 2,
                  borderTop: `1px solid ${theme.palette.divider}`,
                  backgroundColor: alpha(theme.palette.background.default, 0.5),
                }}
              >
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip label="↑↓" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                    <Typography variant="caption" color="text.secondary">
                      navigate
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip label="↵" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                    <Typography variant="caption" color="text.secondary">
                      select
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {filteredActions.length} commands available
                </Typography>
              </Box>
            </Command>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;