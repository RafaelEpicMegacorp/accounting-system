import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Divider,
  useTheme,
  alpha,
  Fade,
  Backdrop,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import { designTokens } from '../../theme/theme';

export interface SlidingPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: number | string;
  position?: 'left' | 'right';
  allowFullscreen?: boolean;
  allowDrag?: boolean;
  showBackdrop?: boolean;
  persistent?: boolean;
  zIndex?: number;
}

const SlidingPanel: React.FC<SlidingPanelProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = '60%',
  position = 'right',
  allowFullscreen = true,
  allowDrag = true,
  showBackdrop = true,
  persistent = false,
  zIndex = 1300,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Force mobile panels to be fullscreen
  const effectiveFullscreen = isFullscreen || isMobile;
  const effectiveWidth = effectiveFullscreen ? '100%' : width;

  // Keyboard shortcuts
  useHotkeys('escape', () => {
    if (open && !persistent) {
      onClose();
    }
  }, { enabled: open });

  useHotkeys('f', () => {
    if (open && allowFullscreen && !isMobile) {
      setIsFullscreen(!isFullscreen);
    }
  }, { enabled: open });

  // Reset fullscreen when closing
  useEffect(() => {
    if (!open) {
      setIsFullscreen(false);
    }
  }, [open]);

  const handleToggleFullscreen = () => {
    if (allowFullscreen && !isMobile) {
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    if (!allowDrag || persistent) return;

    const threshold = 150;
    const velocity = position === 'right' ? info.velocity.x : -info.velocity.x;
    const offset = position === 'right' ? info.offset.x : -info.offset.x;

    if (velocity > 500 || offset > threshold) {
      onClose();
    }
  };

  const panelVariants = {
    hidden: {
      x: position === 'right' ? '100%' : '-100%',
      transition: {
        type: 'tween',
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    visible: {
      x: 0,
      transition: {
        type: 'tween',
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: {
      x: position === 'right' ? '100%' : '-100%',
      transition: {
        type: 'tween',
        duration: 0.25,
        ease: [0.4, 0, 1, 1],
      },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  const headerHeight = 64;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          {showBackdrop && !effectiveFullscreen && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: alpha(theme.palette.common.black, 0.5),
                backdropFilter: 'blur(4px)',
                zIndex: zIndex - 1,
              }}
              onClick={!persistent ? onClose : undefined}
            />
          )}

          {/* Panel */}
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={allowDrag && !effectiveFullscreen ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{
              position: 'fixed',
              top: 0,
              [position]: 0,
              bottom: 0,
              width: effectiveWidth,
              zIndex,
              cursor: isDragging ? 'grabbing' : 'default',
            }}
          >
            <Box
              sx={{
                height: '100%',
                backgroundColor: theme.palette.background.paper,
                boxShadow: theme.shadows[16],
                display: 'flex',
                flexDirection: 'column',
                borderLeft: position === 'right' && !effectiveFullscreen ? 
                  `1px solid ${theme.palette.divider}` : 'none',
                borderRight: position === 'left' && !effectiveFullscreen ? 
                  `1px solid ${theme.palette.divider}` : 'none',
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  height: headerHeight,
                  px: 3,
                  py: 2,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: alpha(theme.palette.primary.main, 0.02),
                }}
              >
                {/* Drag Handle */}
                {allowDrag && !effectiveFullscreen && (
                  <Box
                    sx={{
                      width: 4,
                      height: 32,
                      backgroundColor: theme.palette.divider,
                      borderRadius: 2,
                      mr: 2,
                      cursor: 'grab',
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main,
                      },
                      transition: 'background-color 0.2s ease-in-out',
                    }}
                  />
                )}

                {/* Title */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  {title && (
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {title}
                    </Typography>
                  )}
                  {subtitle && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {subtitle}
                    </Typography>
                  )}
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {allowFullscreen && !isMobile && (
                    <IconButton
                      onClick={handleToggleFullscreen}
                      size="small"
                      sx={{
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                    >
                      {effectiveFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    </IconButton>
                  )}
                  
                  {!persistent && (
                    <IconButton
                      onClick={onClose}
                      size="small"
                      sx={{
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.error.main, 0.1),
                          color: theme.palette.error.main,
                        },
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* Content */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: 'auto',
                  position: 'relative',
                }}
              >
                <Fade in={open} timeout={400}>
                  <Box sx={{ height: '100%' }}>
                    {children}
                  </Box>
                </Fade>
              </Box>
            </Box>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SlidingPanel;