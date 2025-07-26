import React, { useState } from 'react';
import {
  Drawer,
  List,
  Box,
  IconButton,
  Typography,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  MenuOpen as MenuOpenIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useAppTheme } from '../../theme/ThemeProvider';
import ThemeToggle from '../ThemeToggle';
import NavigationItem from './NavigationItem';
import { getFilteredNavigation } from './navigationConfig';
import { designTokens } from '../../theme/theme';

interface SidebarNavigationProps {
  open: boolean;
  onToggle: () => void;
  onClose?: () => void;
  variant?: 'permanent' | 'temporary';
}

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 72;

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  open,
  onToggle,
  onClose,
  variant = 'permanent',
}) => {
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [collapsed, setCollapsed] = useState(false);
  const navigationItems = getFilteredNavigation(isAuthenticated);

  const isCollapsed = collapsed && !isMobile;
  const drawerWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const handleToggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = () => {
    logout();
    if (onClose) onClose();
  };

  const sidebarVariants = {
    expanded: {
      width: SIDEBAR_WIDTH,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    collapsed: {
      width: SIDEBAR_COLLAPSED_WIDTH,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const logoVariants = {
    expanded: {
      opacity: 1,
      scale: 1,
      transition: { delay: 0.1 },
    },
    collapsed: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2 },
    },
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isDark ? 'background.paper' : 'background.default',
        borderRight: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`,
          minHeight: 64,
        }}
      >
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              variants={logoVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                }}
              >
                A
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Accounting
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Tooltip title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <IconButton
            onClick={isMobile ? onToggle : handleToggleCollapse}
            size="small"
            sx={{
              borderRadius: 2,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            {isCollapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <List sx={{ p: 1 }}>
          {navigationItems.map((item) => (
            <NavigationItem
              key={item.id}
              item={item}
              collapsed={isCollapsed}
              active={location.pathname === item.path}
              onClick={onClose}
            />
          ))}
        </List>
      </Box>

      {/* User Section */}
      {isAuthenticated && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            {!isCollapsed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: theme.palette.action.hover,
                    mb: 1,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: theme.palette.primary.main,
                      fontSize: '1rem',
                    }}
                  >
                    {user?.name?.charAt(0) || 'U'}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user?.name || 'User'}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {user?.email || 'user@example.com'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <ThemeToggle size="small" />
                  <Tooltip title="Logout">
                    <IconButton
                      onClick={handleLogout}
                      size="small"
                      sx={{
                        color: theme.palette.error.main,
                        '&:hover': {
                          backgroundColor: theme.palette.error.main + '20',
                        },
                      }}
                    >
                      <LogoutIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </motion.div>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                <Tooltip title={user?.name || 'User'} placement="right">
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: theme.palette.primary.main,
                      fontSize: '0.875rem',
                    }}
                  >
                    {user?.name?.charAt(0) || 'U'}
                  </Avatar>
                </Tooltip>
                <ThemeToggle size="small" />
                <Tooltip title="Logout" placement="right">
                  <IconButton
                    onClick={handleLogout}
                    size="small"
                    sx={{
                      color: theme.palette.error.main,
                      '&:hover': {
                        backgroundColor: theme.palette.error.main + '20',
                      },
                    }}
                  >
                    <LogoutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <motion.div
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      style={{ flexShrink: 0 }}
    >
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            transition: 'none', // Let Framer Motion handle transitions
            position: 'relative',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </motion.div>
  );
};

export default SidebarNavigation;