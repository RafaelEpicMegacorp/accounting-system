import React from 'react';
import { Card, CardProps, useTheme, alpha } from '@mui/material';
import { motion, MotionProps } from 'framer-motion';
import { designTokens } from '../../theme/theme';

interface EnhancedCardProps extends Omit<CardProps, 'component'> {
  variant?: 'elevated' | 'outlined' | 'filled';
  interactive?: boolean;
  hover?: boolean;
  motionProps?: MotionProps;
}

const EnhancedCard: React.FC<EnhancedCardProps> = ({
  variant = 'elevated',
  interactive = false,
  hover = true,
  motionProps,
  children,
  sx,
  ...props
}) => {
  const theme = useTheme();

  const getVariantStyles = () => {
    const baseStyles = {
      borderRadius: designTokens.borderRadius.lg,
      transition: `all ${designTokens.animations.durations.short}ms ${designTokens.animations.easings.emphasized}`,
      cursor: interactive ? 'pointer' : 'default',
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyles,
          backgroundColor: theme.palette.background.paper,
          boxShadow: designTokens.shadows.sm,
          border: 'none',
          '&:hover': hover ? {
            boxShadow: designTokens.shadows.md,
            transform: interactive ? 'translateY(-2px)' : 'translateY(-1px)',
          } : {},
        };

      case 'outlined':
        return {
          ...baseStyles,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${alpha(theme.palette.grey[300], 0.3)}`,
          boxShadow: 'none',
          '&:hover': hover ? {
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`,
            transform: interactive ? 'translateY(-1px)' : 'none',
          } : {},
        };

      case 'filled':
        return {
          ...baseStyles,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          border: 'none',
          boxShadow: 'none',
          '&:hover': hover ? {
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            transform: interactive ? 'translateY(-1px)' : 'none',
          } : {},
        };

      default:
        return baseStyles;
    }
  };

  const cardVariants = {
    initial: {
      scale: 0.95,
      opacity: 0,
      y: 20,
    },
    animate: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
        duration: 0.4,
      },
    },
    hover: interactive ? {
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    } : {},
    tap: interactive ? {
      scale: 0.98,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    } : {},
  };

  if (motionProps || interactive) {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover={interactive ? "hover" : undefined}
        whileTap={interactive ? "tap" : undefined}
        {...motionProps}
      >
        <Card
          sx={{
            ...getVariantStyles(),
            ...sx,
          }}
          {...props}
        >
          {children}
        </Card>
      </motion.div>
    );
  }

  return (
    <Card
      sx={{
        ...getVariantStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

export default EnhancedCard;