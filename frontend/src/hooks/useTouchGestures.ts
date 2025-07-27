import React, { useEffect, useRef, useCallback } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  threshold?: number; // Minimum distance for swipe
  preventDefault?: boolean;
}

interface TouchData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startTime: number;
  endTime: number;
  touchCount: number;
  initialDistance?: number;
}

export const useTouchGestures = (options: TouchGestureOptions = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onTap,
    onDoubleTap,
    threshold = 50,
    preventDefault = true,
  } = options;

  const touchDataRef = useRef<TouchData>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    startTime: 0,
    endTime: 0,
    touchCount: 0,
  });

  const lastTapRef = useRef(0);
  const elementRef = useRef<HTMLElement | null>(null);

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const touchData = touchDataRef.current;

    touchData.startX = touch.clientX;
    touchData.startY = touch.clientY;
    touchData.startTime = Date.now();
    touchData.touchCount = e.touches.length;

    // Handle pinch gesture setup
    if (e.touches.length === 2 && onPinch) {
      touchData.initialDistance = getDistance(e.touches[0], e.touches[1]);
    }
  }, [preventDefault, onPinch, getDistance]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }

    const touchData = touchDataRef.current;

    // Handle pinch gesture
    if (e.touches.length === 2 && onPinch && touchData.initialDistance) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / touchData.initialDistance;
      onPinch(scale);
    }
  }, [preventDefault, onPinch, getDistance]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }

    const touch = e.changedTouches[0];
    const touchData = touchDataRef.current;

    touchData.endX = touch.clientX;
    touchData.endY = touch.clientY;
    touchData.endTime = Date.now();

    const deltaX = touchData.endX - touchData.startX;
    const deltaY = touchData.endY - touchData.startY;
    const deltaTime = touchData.endTime - touchData.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Handle tap gestures
    if (distance < threshold && deltaTime < 300) {
      if (onTap) {
        onTap();
      }

      // Handle double tap
      if (onDoubleTap) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          onDoubleTap();
        }
        lastTapRef.current = now;
      }
      return;
    }

    // Handle swipe gestures
    if (distance >= threshold) {
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontal) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }
  }, [
    preventDefault,
    threshold,
    onTap,
    onDoubleTap,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  ]);

  const attachGestures = useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      // Remove existing listeners
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
    }

    elementRef.current = element;

    if (element) {
      // Add new listeners
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchstart', handleTouchStart);
        elementRef.current.removeEventListener('touchmove', handleTouchMove);
        elementRef.current.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { attachGestures };
};

// Hook for chart-specific touch gestures
export const useChartTouchGestures = (options: {
  onZoom?: (scale: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onNextChart?: () => void;
  onPrevChart?: () => void;
  onRefresh?: () => void;
}) => {
  const { onZoom, onPan, onNextChart, onPrevChart, onRefresh } = options;

  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  const { attachGestures } = useTouchGestures({
    onSwipeLeft: onNextChart,
    onSwipeRight: onPrevChart,
    onDoubleTap: onRefresh,
    onPinch: onZoom,
    threshold: 30,
  });

  // Custom pan handling for charts
  const attachChartGestures = useCallback((element: HTMLElement | null) => {
    attachGestures(element);

    if (element && onPan) {
      const handlePanStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          panStartRef.current = { x: touch.clientX, y: touch.clientY };
        }
      };

      const handlePanMove = (e: TouchEvent) => {
        if (e.touches.length === 1 && panStartRef.current) {
          const touch = e.touches[0];
          const deltaX = touch.clientX - panStartRef.current.x;
          const deltaY = touch.clientY - panStartRef.current.y;
          onPan(deltaX, deltaY);
          panStartRef.current = { x: touch.clientX, y: touch.clientY };
        }
      };

      const handlePanEnd = () => {
        panStartRef.current = null;
      };

      element.addEventListener('touchstart', handlePanStart, { passive: false });
      element.addEventListener('touchmove', handlePanMove, { passive: false });
      element.addEventListener('touchend', handlePanEnd, { passive: false });

      return () => {
        element.removeEventListener('touchstart', handlePanStart);
        element.removeEventListener('touchmove', handlePanMove);
        element.removeEventListener('touchend', handlePanEnd);
      };
    }
  }, [attachGestures, onPan]);

  return { attachChartGestures };
};

// Mobile detection utility
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Touch capability detection
export const hasTouchCapability = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Responsive breakpoint utilities for mobile optimization
export const mobileBreakpoints = {
  xs: '(max-width: 599px)',
  sm: '(max-width: 959px)',
  md: '(max-width: 1279px)',
  touch: '(pointer: coarse)', // Touch-capable devices
  hover: '(hover: hover)', // Devices that can hover
};

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia(mobileBreakpoints.sm).matches);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

export default useTouchGestures;