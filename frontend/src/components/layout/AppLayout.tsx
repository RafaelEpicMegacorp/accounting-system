import React, { useState } from 'react';
import {
  Box,
  useTheme,
  useMediaQuery,
  Fab,
  Zoom,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useHotkeys } from 'react-hotkeys-hook';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import SidebarNavigation from '../navigation/SidebarNavigation';
import CommandPalette from '../navigation/CommandPalette';
import { designTokens } from '../../theme/theme';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Keyboard shortcuts
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  }, { enableOnContentEditable: true, enableOnFormTags: true });

  useHotkeys('ctrl+/, cmd+/', (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  }, { enableOnContentEditable: true, enableOnFormTags: true });

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleCommandPaletteClose = () => {
    setCommandPaletteOpen(false);
  };

  // For non-authenticated users, show simple layout
  if (!isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {children}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <SidebarNavigation
        open={sidebarOpen}
        onToggle={handleSidebarToggle}
        onClose={handleSidebarClose}
        variant={isMobile ? 'temporary' : 'permanent'}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Page Content */}
        <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 } }}>
          {children}
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 2,
            px: { xs: 2, sm: 3, md: 4 },
            mt: 'auto',
            backgroundColor: theme.palette.background.paper,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ textAlign: 'center', color: theme.palette.text.secondary }}>
            © 2024 Accounting System. Built with modern design principles.
          </Box>
        </Box>
      </Box>

      {/* Floating Action Buttons */}
      <Box
        sx={{
          position: 'fixed',
          bottom: designTokens.spacing.lg,
          right: designTokens.spacing.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          zIndex: theme.zIndex.speedDial,
        }}
      >
        {/* Command Palette FAB */}
        <Zoom in={true} timeout={300}>
          <Tooltip title="Search (⌘K)" placement="left">
            <Fab
              color="secondary"
              aria-label="search"
              onClick={() => setCommandPaletteOpen(true)}
              sx={{
                '&:hover': {
                  transform: 'scale(1.1)',
                },
                transition: 'transform 0.2s ease-in-out',
              }}
            >
              <SearchIcon />
            </Fab>
          </Tooltip>
        </Zoom>

        {/* Quick Add FAB */}
        <Zoom in={true} timeout={400}>
          <Tooltip title="Quick Add" placement="left">
            <Fab
              color="primary"
              aria-label="add"
              onClick={() => setCommandPaletteOpen(true)} // Opens command palette for quick actions
              sx={{
                '&:hover': {
                  transform: 'scale(1.1)',
                },
                transition: 'transform 0.2s ease-in-out',
              }}
            >
              <AddIcon />
            </Fab>
          </Tooltip>
        </Zoom>
      </Box>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={handleCommandPaletteClose}
      />
    </Box>
  );
};

export default AppLayout;