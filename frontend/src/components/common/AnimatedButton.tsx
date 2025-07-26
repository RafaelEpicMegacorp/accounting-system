import React from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';

interface AnimatedButtonProps extends ButtonProps {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  animationType?: 'scale' | 'pulse' | 'bounce' | 'slide';
  loadingText?: string;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  loading = false,
  success = false,
  error = false,
  animationType = 'scale',
  loadingText,
  disabled,
  sx,
  ...props
}) => {
  const getAnimationProps = () => {
    switch (animationType) {
      case 'scale':
        return {
          whiteHover: { scale: 1.05 },
          whileTap: { scale: 0.95 },
        };
      case 'pulse':
        return {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.98 },
          animate: success ? { scale: [1, 1.05, 1] } : undefined,
          transition: { duration: 0.3 },
        };
      case 'bounce':
        return {
          whileHover: { y: -2 },
          whileTap: { y: 0 },
          animate: success ? { y: [0, -5, 0] } : undefined,
        };
      case 'slide':
        return {
          whileHover: { x: 2 },
          whileTap: { x: 0 },
        };
      default:
        return {};
    }
  };

  const getButtonColor = () => {
    if (error) return 'error';
    if (success) return 'success';
    return props.color || 'primary';
  };

  const getButtonVariant = () => {
    if (success) return 'contained';
    return props.variant || 'contained';
  };

  return (
    <Button
      component={motion.button}
      {...getAnimationProps()}
      {...props}
      color={getButtonColor()}
      variant={getButtonVariant()}
      disabled={disabled || loading}
      sx={{
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        ...(success && {
          bgcolor: 'success.main',
          '&:hover': {
            bgcolor: 'success.dark',
          },
        }),
        ...(error && {
          bgcolor: 'error.main',
          '&:hover': {
            bgcolor: 'error.dark',
          },
        }),
        ...sx,
      }}
    >
      {loading && (
        <CircularProgress
          size={16}
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: '-8px',
            marginTop: '-8px',
            color: 'inherit',
          }}
        />
      )}
      <span
        style={{
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out',
        }}
      >
        {loading && loadingText ? loadingText : children}
      </span>
    </Button>
  );
};

export default AnimatedButton;