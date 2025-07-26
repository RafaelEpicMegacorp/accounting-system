import React from 'react';
import {
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
  Box,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useBreadcrumbs } from './BreadcrumbProvider';
import { designTokens } from '../../theme/theme';

interface BreadcrumbsProps {
  showHome?: boolean;
  maxItems?: number;
  variant?: 'default' | 'compact' | 'pills';
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  showHome = true,
  maxItems = 8,
  variant = 'default',
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { breadcrumbs } = useBreadcrumbs();

  const handleClick = (path: string, disabled?: boolean) => {
    if (!disabled) {
      navigate(path);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      x: 10,
      transition: { duration: 0.2 },
    },
  };

  if (breadcrumbs.length === 0) {
    return null;
  }

  const renderPillsVariant = () => (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        alignItems: 'center',
      }}
    >
      <AnimatePresence>
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const IconComponent = breadcrumb.icon;

          return (
            <motion.div
              key={`${breadcrumb.path}-${index}`}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              <Chip
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {IconComponent && (
                      <IconComponent sx={{ fontSize: 16 }} />
                    )}
                    {breadcrumb.label}
                  </Box>
                }
                variant={isLast ? 'filled' : 'outlined'}
                color={isLast ? 'primary' : 'default'}
                clickable={!breadcrumb.disabled}
                onClick={() => handleClick(breadcrumb.path, breadcrumb.disabled)}
                sx={{
                  '&:hover': !breadcrumb.disabled ? {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    transform: 'translateY(-1px)',
                  } : undefined,
                  transition: 'all 0.2s ease-in-out',
                  cursor: breadcrumb.disabled ? 'default' : 'pointer',
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </Box>
  );

  const renderCompactVariant = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontSize: '0.875rem',
      }}
    >
      <AnimatePresence>
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const IconComponent = breadcrumb.icon;

          return (
            <React.Fragment key={`${breadcrumb.path}-${index}`}>
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                {breadcrumb.disabled ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {IconComponent && (
                      <IconComponent sx={{ fontSize: 16, color: 'text.secondary' }} />
                    )}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      {breadcrumb.label}
                    </Typography>
                  </Box>
                ) : (
                  <Link
                    component={RouterLink}
                    to={breadcrumb.path}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      textDecoration: 'none',
                      color: 'text.primary',
                      '&:hover': {
                        color: 'primary.main',
                        textDecoration: 'underline',
                      },
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    {IconComponent && (
                      <IconComponent sx={{ fontSize: 16 }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {breadcrumb.label}
                    </Typography>
                  </Link>
                )}
              </motion.div>
              {!isLast && (
                <NavigateNextIcon
                  sx={{
                    fontSize: 16,
                    color: 'text.secondary',
                    opacity: 0.6,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </AnimatePresence>
    </Box>
  );

  const renderDefaultVariant = () => (
    <MuiBreadcrumbs
      maxItems={maxItems}
      separator={
        <NavigateNextIcon
          sx={{
            fontSize: 16,
            color: 'text.secondary',
            opacity: 0.7,
          }}
        />
      }
      sx={{
        '& .MuiBreadcrumbs-separator': {
          mx: 1,
        },
      }}
    >
      <AnimatePresence>
        {breadcrumbs.map((breadcrumb, index) => {
          const IconComponent = breadcrumb.icon;

          return (
            <motion.div
              key={`${breadcrumb.path}-${index}`}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              {breadcrumb.disabled ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {IconComponent && (
                    <IconComponent sx={{ fontSize: 18, color: 'text.secondary' }} />
                  )}
                  <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                    {breadcrumb.label}
                  </Typography>
                </Box>
              ) : (
                <Link
                  component={RouterLink}
                  to={breadcrumb.path}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    textDecoration: 'none',
                    color: 'text.primary',
                    '&:hover': {
                      color: 'primary.main',
                      textDecoration: 'underline',
                    },
                    transition: 'color 0.2s ease-in-out',
                  }}
                >
                  {IconComponent && (
                    <IconComponent sx={{ fontSize: 18 }} />
                  )}
                  <Typography sx={{ fontWeight: 500 }}>
                    {breadcrumb.label}
                  </Typography>
                </Link>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </MuiBreadcrumbs>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ width: '100%' }}
    >
      <Box
        sx={{
          py: 2,
          px: { xs: 0, sm: 0 },
          borderBottom: variant !== 'pills' ? `1px solid ${theme.palette.divider}` : 'none',
          mb: variant !== 'pills' ? 2 : 0,
        }}
      >
        {variant === 'pills' && renderPillsVariant()}
        {variant === 'compact' && renderCompactVariant()}
        {variant === 'default' && renderDefaultVariant()}
      </Box>
    </motion.div>
  );
};

export default Breadcrumbs;