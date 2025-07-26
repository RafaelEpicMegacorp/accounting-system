import React from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { NavigationItem as NavigationItemType } from './navigationConfig';
import { designTokens } from '../../theme/theme';

interface NavigationItemProps {
  item: NavigationItemType;
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
}

const NavigationItem: React.FC<NavigationItemProps> = ({
  item,
  collapsed,
  active,
  onClick,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(item.path);
    if (onClick) onClick();
  };

  const iconVariants = {
    active: {
      scale: 1.1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20,
      },
    },
    inactive: {
      scale: 1,
    },
  };

  const labelVariants = {
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.2,
        delay: 0.1,
      },
    },
    hidden: {
      opacity: 0,
      x: -10,
      transition: {
        duration: 0.15,
      },
    },
  };

  const activeStyles = {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    borderRight: `3px solid ${theme.palette.primary.main}`,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    },
    '& .MuiListItemIcon-root': {
      color: theme.palette.primary.main,
    },
    '& .MuiListItemText-primary': {
      color: theme.palette.primary.main,
      fontWeight: 600,
    },
  };

  const inactiveStyles = {
    borderRadius: 2,
    margin: '2px 0',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateX(4px)',
    },
    '& .MuiListItemIcon-root': {
      color: theme.palette.text.secondary,
    },
    '& .MuiListItemText-primary': {
      color: theme.palette.text.primary,
    },
    transition: `all ${designTokens.animations.durations.short}ms ${designTokens.animations.easings.easeOut}`,
  };

  const buttonContent = (
    <ListItemButton
      onClick={handleClick}
      sx={{
        ...(active ? activeStyles : inactiveStyles),
        minHeight: 48,
        px: collapsed ? 1.5 : 2,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: collapsed ? 'auto' : 40,
          justifyContent: 'center',
        }}
      >
        <motion.div
          variants={iconVariants}
          animate={active ? 'active' : 'inactive'}
        >
          <Badge
            badgeContent={item.badge}
            color="error"
            variant="dot"
            invisible={!item.badge}
          >
            <item.icon fontSize="small" />
          </Badge>
        </motion.div>
      </ListItemIcon>

      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            variants={labelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{ width: '100%' }}
          >
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                variant: 'body2',
                sx: {
                  fontWeight: active ? 600 : 500,
                  transition: `color ${designTokens.animations.durations.shorter}ms`,
                },
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </ListItemButton>
  );

  if (collapsed) {
    return (
      <ListItem disablePadding>
        <Tooltip
          title={item.label}
          placement="right"
          arrow
          slotProps={{
            tooltip: {
              sx: {
                backgroundColor: theme.palette.grey[900],
                color: theme.palette.common.white,
                fontSize: '0.75rem',
                fontWeight: 500,
              },
            },
            arrow: {
              sx: {
                color: theme.palette.grey[900],
              },
            },
          }}
        >
          <motion.div
            whileHover={{
              scale: 1.05,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 25,
              },
            }}
            whileTap={{
              scale: 0.95,
            }}
            style={{ width: '100%' }}
          >
            {buttonContent}
          </motion.div>
        </Tooltip>
      </ListItem>
    );
  }

  return (
    <ListItem disablePadding>
      <motion.div
        whileHover={!active ? {
          scale: 1.02,
          transition: {
            type: "spring",
            stiffness: 400,
            damping: 25,
          },
        } : undefined}
        whileTap={{
          scale: 0.98,
        }}
        style={{ width: '100%' }}
      >
        {buttonContent}
      </motion.div>
    </ListItem>
  );
};

export default NavigationItem;