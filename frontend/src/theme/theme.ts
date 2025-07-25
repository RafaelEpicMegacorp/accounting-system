import { createTheme, ThemeOptions } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// Design tokens following Material Design 3 principles
const designTokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontWeights: {
      light: 300,
      regular: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
    },
  },
  shadows: {
    subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  animations: {
    durations: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easings: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      // Material Design 3 Expressive easings
      emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
      emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
      emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
    },
  },
};

// Modern color palette with accessibility in mind
const lightPalette = {
  primary: {
    main: '#2563eb',
    light: '#3b82f6',
    dark: '#1d4ed8',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#7c3aed',
    light: '#8b5cf6',
    dark: '#6d28d9',
    contrastText: '#ffffff',
  },
  success: {
    main: '#059669',
    light: '#10b981',
    dark: '#047857',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#d97706',
    light: '#f59e0b',
    dark: '#b45309',
    contrastText: '#ffffff',
  },
  error: {
    main: '#dc2626',
    light: '#ef4444',
    dark: '#b91c1c',
    contrastText: '#ffffff',
  },
  info: {
    main: '#0891b2',
    light: '#06b6d4',
    dark: '#0e7490',
    contrastText: '#ffffff',
  },
  grey: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  background: {
    default: '#ffffff',
    paper: '#ffffff',
    neutral: '#f9fafb',
  },
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    disabled: '#9ca3af',
  },
};

const darkPalette = {
  primary: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    contrastText: '#ffffff',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    contrastText: '#000000',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    contrastText: '#ffffff',
  },
  info: {
    main: '#06b6d4',
    light: '#22d3ee',
    dark: '#0891b2',
    contrastText: '#ffffff',
  },
  grey: {
    50: '#111827',
    100: '#1f2937',
    200: '#374151',
    300: '#4b5563',
    400: '#6b7280',
    500: '#9ca3af',
    600: '#d1d5db',
    700: '#e5e7eb',
    800: '#f3f4f6',
    900: '#f9fafb',
  },
  background: {
    default: '#0f172a',
    paper: '#1e293b',
    neutral: '#111827',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    disabled: '#64748b',
  },
};

// Create theme with enhanced typography and Material Design 3 components
const createAppTheme = (mode: 'light' | 'dark'): ThemeOptions => {
  const palette = mode === 'light' ? lightPalette : darkPalette;
  
  return {
    palette: {
      mode,
      ...palette,
    },
    typography: {
      fontFamily: designTokens.typography.fontFamily,
      fontWeightLight: designTokens.typography.fontWeights.light,
      fontWeightRegular: designTokens.typography.fontWeights.regular,
      fontWeightMedium: designTokens.typography.fontWeights.medium,
      fontWeightBold: designTokens.typography.fontWeights.bold,
      
      // Enhanced typography scale following Material Design 3
      h1: {
        fontSize: '2.5rem',
        fontWeight: designTokens.typography.fontWeights.bold,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: designTokens.typography.fontWeights.bold,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: designTokens.typography.fontWeights.semiBold,
        lineHeight: 1.3,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: designTokens.typography.fontWeights.semiBold,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: designTokens.typography.fontWeights.medium,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: designTokens.typography.fontWeights.medium,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: '1rem',
        fontWeight: designTokens.typography.fontWeights.regular,
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: designTokens.typography.fontWeights.regular,
        lineHeight: 1.5,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: designTokens.typography.fontWeights.regular,
        lineHeight: 1.4,
        color: palette.text.secondary,
      },
    },
    shape: {
      borderRadius: designTokens.borderRadius.md,
    },
    spacing: designTokens.spacing.sm,
    
    components: {
      // Enhanced Button with Material Design 3 styling
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.lg,
            textTransform: 'none',
            fontWeight: designTokens.typography.fontWeights.medium,
            fontSize: '0.875rem',
            padding: '12px 24px',
            boxShadow: 'none',
            transition: `all ${designTokens.animations.durations.short}ms ${designTokens.animations.easings.emphasized}`,
            '&:hover': {
              boxShadow: designTokens.shadows.sm,
              transform: 'translateY(-1px)',
            },
          },
          contained: {
            '&:hover': {
              boxShadow: designTokens.shadows.md,
            },
          },
        },
      },
      
      // Enhanced Card with modern styling
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.lg,
            boxShadow: designTokens.shadows.sm,
            border: `1px solid ${alpha(palette.grey[300], 0.12)}`,
            transition: `all ${designTokens.animations.durations.short}ms ${designTokens.animations.easings.easeOut}`,
            '&:hover': {
              boxShadow: designTokens.shadows.md,
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      
      // Enhanced Paper component
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.lg,
            backgroundImage: 'none',
          },
          elevation1: {
            boxShadow: designTokens.shadows.sm,
          },
          elevation2: {
            boxShadow: designTokens.shadows.md,
          },
          elevation3: {
            boxShadow: designTokens.shadows.lg,
          },
        },
      },
      
      // Enhanced AppBar
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderBottom: `1px solid ${alpha(palette.grey[300], 0.12)}`,
            backgroundColor: palette.background.paper,
            color: palette.text.primary,
          },
        },
      },
      
      // Enhanced TextField
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: designTokens.borderRadius.md,
              transition: `all ${designTokens.animations.durations.shorter}ms ${designTokens.animations.easings.easeOut}`,
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: palette.primary.main,
                },
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderWidth: '2px',
                },
              },
            },
          },
        },
      },
      
      // Enhanced Chip
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.sm,
            fontWeight: designTokens.typography.fontWeights.medium,
          },
        },
      },
    },
    
    transitions: {
      duration: designTokens.animations.durations,
      easing: designTokens.animations.easings,
    },
  };
};

// Export light and dark themes
export const lightTheme = createTheme(createAppTheme('light'));
export const darkTheme = createTheme(createAppTheme('dark'));

// Export design tokens for use in components
export { designTokens };

// Theme context type
export type ThemeMode = 'light' | 'dark' | 'system';