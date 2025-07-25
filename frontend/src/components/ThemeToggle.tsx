import React from 'react';
import { IconButton, Tooltip, useTheme as useMuiTheme } from '@mui/material';
import { 
  LightMode as LightIcon,
  DarkMode as DarkIcon,
  SettingsBrightness as SystemIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../theme/ThemeProvider';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'medium',
  showLabel = false 
}) => {
  const { mode, toggleMode } = useTheme();
  const muiTheme = useMuiTheme();

  const getIcon = () => {
    switch (mode) {
      case 'light':
        return <LightIcon />;
      case 'dark':
        return <DarkIcon />;
      case 'system':
        return <SystemIcon />;
      default:
        return <LightIcon />;
    }
  };

  const getTooltip = () => {
    switch (mode) {
      case 'light':
        return 'Switch to dark mode';
      case 'dark':
        return 'Switch to system preference';
      case 'system':
        return 'Switch to light mode';
      default:
        return 'Toggle theme';
    }
  };

  const iconVariants = {
    initial: { 
      scale: 0.8, 
      rotate: -180,
      opacity: 0 
    },
    animate: { 
      scale: 1, 
      rotate: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
        duration: 0.3
      }
    },
    exit: { 
      scale: 0.8, 
      rotate: 180,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      }
    },
    tap: {
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      }
    }
  };

  return (
    <Tooltip title={getTooltip()} placement="bottom">
      <motion.div
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
      >
        <IconButton
          onClick={toggleMode}
          size={size}
          sx={{
            borderRadius: 2,
            bgcolor: muiTheme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.08)' 
              : 'rgba(0, 0, 0, 0.04)',
            '&:hover': {
              bgcolor: muiTheme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.12)' 
                : 'rgba(0, 0, 0, 0.08)',
            },
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          aria-label="Toggle theme mode"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={iconVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getIcon()}
            </motion.div>
          </AnimatePresence>
        </IconButton>
      </motion.div>
    </Tooltip>
  );
};

export default ThemeToggle;