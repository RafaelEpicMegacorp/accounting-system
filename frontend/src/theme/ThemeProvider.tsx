import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme, ThemeMode } from './theme';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

const THEME_STORAGE_KEY = 'theme-mode';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme mode from localStorage or system preference
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored;
    }
    return 'system';
  });

  // Determine if system prefers dark mode
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Determine actual theme to use
  const isDark = mode === 'dark' || (mode === 'system' && systemPrefersDark);
  const currentTheme: Theme = isDark ? darkTheme : lightTheme;

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  // Update document class for CSS variables and external styling
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        isDark ? currentTheme.palette.background.default : currentTheme.palette.background.paper
      );
    }
  }, [isDark, currentTheme]);

  const toggleMode = () => {
    setMode(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  };

  const contextValue: ThemeContextType = {
    mode,
    setMode,
    toggleMode,
    isDark,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={currentTheme}>
        <CssBaseline enableColorScheme />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Hook for accessing theme values in components
export const useCurrentTheme = () => {
  const { isDark } = useTheme();
  return isDark ? darkTheme : lightTheme;
};

// CSS custom properties for use in styled components
export const getCSSVariables = (theme: Theme) => ({
  '--primary-main': theme.palette.primary.main,
  '--primary-light': theme.palette.primary.light,
  '--primary-dark': theme.palette.primary.dark,
  '--secondary-main': theme.palette.secondary.main,
  '--background-default': theme.palette.background.default,
  '--background-paper': theme.palette.background.paper,
  '--text-primary': theme.palette.text.primary,
  '--text-secondary': theme.palette.text.secondary,
  '--border-color': theme.palette.divider,
  '--shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  '--border-radius-sm': '8px',
  '--border-radius-md': '12px',
  '--border-radius-lg': '16px',
  '--spacing-xs': '4px',
  '--spacing-sm': '8px',
  '--spacing-md': '16px',
  '--spacing-lg': '24px',
  '--spacing-xl': '32px',
});

export default ThemeProvider;