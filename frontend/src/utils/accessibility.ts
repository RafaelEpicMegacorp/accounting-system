// Accessibility utilities for WCAG 2.1 AA compliance

/**
 * Check if a color combination meets WCAG AA contrast requirements
 * @param foreground - Hex color for text
 * @param background - Hex color for background
 * @returns boolean indicating if contrast ratio is >= 4.5:1
 */
export function hasAccessibleContrast(foreground: string, background: string): boolean {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= 4.5;
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 * @param hex - Hex color string
 * @returns Relative luminance (0-1)
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 * @param hex - Hex color string
 * @returns RGB object or null if invalid
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Announce content to screen readers
 * @param message - Message to announce
 * @param priority - Announcement priority
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Generate a unique ID for form elements
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export function generateUniqueId(prefix = 'element'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Focus management utilities
 */
export const focusManager = {
  /**
   * Trap focus within a container element
   * @param container - Container element to trap focus in
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },

  /**
   * Set focus to element after a delay
   * @param element - Element to focus
   * @param delay - Delay in milliseconds
   */
  focusWithDelay(element: HTMLElement, delay = 100): void {
    setTimeout(() => {
      element.focus();
    }, delay);
  },

  /**
   * Focus first error in a form
   * @param formElement - Form element to search
   */
  focusFirstError(formElement: HTMLFormElement): void {
    const errorElement = formElement.querySelector('[aria-invalid="true"], .error') as HTMLElement;
    if (errorElement) {
      errorElement.focus();
    }
  }
};

/**
 * Keyboard navigation utilities
 */
export const keyboardNav = {
  /**
   * Handle arrow key navigation in a list
   * @param event - Keyboard event
   * @param currentIndex - Current focused index
   * @param itemCount - Total number of items
   * @param onIndexChange - Callback when index changes
   */
  handleArrowNavigation(
    event: KeyboardEvent,
    currentIndex: number,
    itemCount: number,
    onIndexChange: (index: number) => void
  ): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        onIndexChange((currentIndex + 1) % itemCount);
        break;
      case 'ArrowUp':
        event.preventDefault();
        onIndexChange(currentIndex === 0 ? itemCount - 1 : currentIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        onIndexChange(0);
        break;
      case 'End':
        event.preventDefault();
        onIndexChange(itemCount - 1);
        break;
    }
  },

  /**
   * Check if element is focused
   * @param element - Element to check
   * @returns boolean
   */
  isFocused(element: HTMLElement): boolean {
    return document.activeElement === element;
  }
};

/**
 * Screen reader utilities
 */
export const screenReader = {
  /**
   * Hide element from screen readers
   * @param element - Element to hide
   */
  hide(element: HTMLElement): void {
    element.setAttribute('aria-hidden', 'true');
  },

  /**
   * Show element to screen readers
   * @param element - Element to show
   */
  show(element: HTMLElement): void {
    element.removeAttribute('aria-hidden');
  },

  /**
   * Set element as description for another element
   * @param descriptionElement - Element containing description
   * @param targetElement - Element being described
   */
  setDescription(descriptionElement: HTMLElement, targetElement: HTMLElement): void {
    const id = generateUniqueId('description');
    descriptionElement.id = id;
    targetElement.setAttribute('aria-describedby', id);
  }
};

/**
 * Validate WCAG compliance for common patterns
 */
export const wcagValidator = {
  /**
   * Check if text has sufficient contrast
   * @param textColor - Text color in hex
   * @param backgroundColor - Background color in hex
   * @returns Validation result
   */
  validateTextContrast(textColor: string, backgroundColor: string): {
    isValid: boolean;
    ratio: number;
    level: 'AAA' | 'AA' | 'Fail';
  } {
    const ratio = getContrastRatio(textColor, backgroundColor);
    return {
      isValid: ratio >= 4.5,
      ratio,
      level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail'
    };
  },

  /**
   * Check if interactive element has accessible name
   * @param element - Interactive element
   * @returns boolean
   */
  hasAccessibleName(element: HTMLElement): boolean {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.getAttribute('title')
    );
  },

  /**
   * Check if form field has associated label
   * @param input - Input element
   * @returns boolean
   */
  hasAssociatedLabel(input: HTMLInputElement): boolean {
    const id = input.id;
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    const ariaLabel = input.getAttribute('aria-label');
    
    if (ariaLabel || ariaLabelledBy) return true;
    if (!id) return false;
    
    return !!document.querySelector(`label[for="${id}"]`);
  }
};

/**
 * CSS class for screen reader only content
 */
export const srOnlyClass = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

// Add screen reader only styles to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = srOnlyClass;
  document.head.appendChild(style);
}