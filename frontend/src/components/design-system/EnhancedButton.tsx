import React from 'react';
import { Button, ButtonProps, CircularProgress, useTheme, alpha } from '@mui/material';
import { motion, MotionProps } from 'framer-motion';
import { designTokens } from '../../theme/theme';

interface EnhancedButtonProps extends Omit<ButtonProps, 'component'> {
  loading?: boolean;
  loadingText?: string;
  motionProps?: MotionProps;
  variant?: 'contained' | 'outlined' | 'text' | 'soft';
}

const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  loading = false,
  loadingText,
  motionProps,
  variant = 'contained',
  children,
  disabled,
  sx,
  ...props
}) => {
  const theme = useTheme();

  const getVariantStyles = () => {
    const baseStyles = {
      borderRadius: designTokens.borderRadius.md,
      textTransform: 'none' as const,
      fontWeight: designTokens.typography.fontWeights.medium,
      fontSize: '0.875rem',
      padding: '12px 24px',
      minHeight: '44px', // Touch target size
      transition: `all ${designTokens.animations.durations.short}ms ${designTokens.animations.easings.emphasized}`,
      '&:focus-visible': {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: '2px',
      },
    };

    switch (variant) {
      case 'contained':
        return {
          ...baseStyles,
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          boxShadow: designTokens.shadows.sm,
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
            boxShadow: designTokens.shadows.md,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0px)',
            boxShadow: designTokens.shadows.sm,
          },
        };

      case 'outlined':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          color: theme.palette.primary.main,
          border: `2px solid ${theme.palette.primary.main}`,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            borderColor: theme.palette.primary.dark,
            transform: 'translateY(-1px)',
          },
        };

      case 'text':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          color: theme.palette.primary.main,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          },
        };

      case 'soft':
        return {
          ...baseStyles,
          backgroundColor: alpha(theme.palette.primary.main, 0.12),
          color: theme.palette.primary.main,
          border: 'none',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.16),
            transform: 'translateY(-1px)',
          },
        };

      default:
        return baseStyles;
    }
  };

  const buttonVariants = {
    initial: {
      scale: 1,
    },
    hover: {
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    },
    tap: {
      scale: 0.98,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    },
  };

  const content = loading ? (
    <>
      <CircularProgress
        size={16}
        sx={{
          mr: 1,
          color: variant === 'contained' 
            ? theme.palette.primary.contrastText 
            : theme.palette.primary.main,
        }}
      />
      {loadingText || children}
    </>
  ) : (
    children
  );

  return (
    <motion.div
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      {...motionProps}
    >
      <Button
        disabled={disabled || loading}
        sx={{
          ...getVariantStyles(),
          ...sx,
        }}
        {...props}
      >
        {content}
      </Button>
    </motion.div>
  );
};

export default EnhancedButton;