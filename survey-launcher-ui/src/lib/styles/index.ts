// SurveyLauncher Admin Design System
// Main entry point for all design tokens and utilities

export * from './design-tokens';
export * from './utils';

// CSS injection for global styles
export const injectGlobalStyles = () => {
  if (typeof document !== 'undefined') {
    import('./globals.css');
  }
};

// Design version for tracking updates
export const DESIGN_VERSION = '1.0.0';

// Theme configuration
export const theme = {
  name: 'SurveyLauncher Admin',
  version: DESIGN_VERSION,
  colors: {
    primary: {
      light: '#2563eb',
      main: '#1d4ed8',
      dark: '#1e40af'
    },
    success: {
      light: '#16a34a',
      main: '#15803d',
      dark: '#166534'
    },
    warning: {
      light: '#d97706',
      main: '#b45309',
      dark: '#92400e'
    },
    error: {
      light: '#dc2626',
      main: '#b91c1c',
      dark: '#991b1b'
    },
    neutral: {
      light: '#4b5563',
      main: '#374151',
      dark: '#1f2937'
    }
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace']
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  }
};