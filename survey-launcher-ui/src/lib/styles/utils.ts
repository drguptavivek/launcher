// SurveyLauncher Admin Style Utilities
// Helper functions and classes for styling

import { colors, typography, spacing, borderRadius, shadows } from './design-tokens';

// Color utility functions
export const getColorValue = (colorPath: string) => {
	const keys = colorPath.split('.');
	let value: any = colors;

	for (const key of keys) {
		value = value[key];
	}

	return value || colorPath;
};

// Status color mapping
export const statusColors = {
	success: colors.success[500],
	warning: colors.warning[500],
	error: colors.error[500],
	info: colors.primary[500],
	idle: colors.neutral[400],
	white: '#ffffff'
};

// Component state utilities
export const buttonStates = {
	default: {
		background: colors.primary[600],
		hover: colors.primary[700],
		active: colors.primary[800],
		disabled: colors.neutral[300]
	},
	secondary: {
		background: colors.neutral[100],
		hover: colors.neutral[200],
		active: colors.neutral[300],
		disabled: colors.neutral[50]
	},
	success: {
		background: colors.success[600],
		hover: colors.success[700],
		active: colors.success[800],
		disabled: colors.success[300]
	},
	warning: {
		background: colors.warning[600],
		hover: colors.warning[700],
		active: colors.warning[800],
		disabled: colors.warning[300]
	},
	error: {
		background: colors.error[600],
		hover: colors.error[700],
		active: colors.error[800],
		disabled: colors.error[300]
	}
};

// Form field states
export const formFieldStates = {
	default: {
		border: colors.neutral[300],
		background: colors.neutral[50],
		placeholder: colors.neutral[500]
	},
	focus: {
		border: colors.primary[500],
		background: statusColors.white,
		placeholder: colors.neutral[400]
	},
	error: {
		border: colors.error[500],
		background: colors.error[50],
		placeholder: colors.error[400]
	},
	disabled: {
		border: colors.neutral[200],
		background: colors.neutral[100],
		placeholder: colors.neutral[400]
	}
};

// Layout utilities
export const layout = {
	container: {
		maxWidth: '1280px',
		padding: '0 1rem'
	},
	sidebar: {
		width: '280px',
		background: colors.neutral[900],
		text: colors.neutral[100]
	},
	header: {
		height: '64px',
		background: statusColors.white,
		border: colors.neutral[200]
	}
};

// Data visualization colors
export const chartColors = {
	primary: [
		colors.primary[500],
		colors.primary[400],
		colors.primary[300],
		colors.primary[200]
	],
	success: [
		colors.success[500],
		colors.success[400],
		colors.success[300],
		colors.success[200]
	],
	warning: [
		colors.warning[500],
		colors.warning[400],
		colors.warning[300],
		colors.warning[200]
	],
	error: [
		colors.error[500],
		colors.error[400],
		colors.error[300],
		colors.error[200]
	],
	neutral: [
		colors.neutral[500],
		colors.neutral[400],
		colors.neutral[300],
		colors.neutral[200]
	]
};

// CSS custom properties generator
export const generateCSSCustomProperties = () => {
	return `:root {
		/* Colors */
		--color-primary-50: ${colors.primary[50]};
		--color-primary-100: ${colors.primary[100]};
		--color-primary-200: ${colors.primary[200]};
		--color-primary-300: ${colors.primary[300]};
		--color-primary-400: ${colors.primary[400]};
		--color-primary-500: ${colors.primary[500]};
		--color-primary-600: ${colors.primary[600]};
		--color-primary-700: ${colors.primary[700]};
		--color-primary-800: ${colors.primary[800]};
		--color-primary-900: ${colors.primary[900]};
		--color-primary-950: ${colors.primary[950]};

		--color-success-50: ${colors.success[50]};
		--color-success-500: ${colors.success[500]};
		--color-success-600: ${colors.success[600]};

		--color-warning-50: ${colors.warning[50]};
		--color-warning-500: ${colors.warning[500]};
		--color-warning-600: ${colors.warning[600]};

		--color-error-50: ${colors.error[50]};
		--color-error-500: ${colors.error[500]};
		--color-error-600: ${colors.error[600]};

		--color-neutral-50: ${colors.neutral[50]};
		--color-neutral-100: ${colors.neutral[100]};
		--color-neutral-200: ${colors.neutral[200]};
		--color-neutral-300: ${colors.neutral[300]};
		--color-neutral-400: ${colors.neutral[400]};
		--color-neutral-500: ${colors.neutral[500]};
		--color-neutral-600: ${colors.neutral[600]};
		--color-neutral-700: ${colors.neutral[700]};
		--color-neutral-800: ${colors.neutral[800]};
		--color-neutral-900: ${colors.neutral[900]};
		--color-neutral-950: ${colors.neutral[950]};

		/* Typography */
		--font-sans: ${typography.fonts.sans.join(', ')};
		--font-mono: ${typography.fonts.mono.join(', ')};

		/* Spacing */
		--spacing-xs: ${spacing[1]};
		--spacing-sm: ${spacing[2]};
		--spacing-md: ${spacing[4]};
		--spacing-lg: ${spacing[6]};
		--spacing-xl: ${spacing[8]};
		--spacing-2xl: ${spacing[10]};

		/* Border Radius */
		--radius-sm: ${borderRadius.sm};
		--radius-md: ${borderRadius.md};
		--radius-lg: ${borderRadius.lg};
		--radius-xl: ${borderRadius.xl};

		/* Shadows */
		--shadow-sm: ${shadows.sm};
		--shadow-md: ${shadows.md};
		--shadow-lg: ${shadows.lg};
		--shadow-xl: ${shadows.xl};
	}`;
};

// Utility class generators
export const createUtilityClasses = () => {
	return {
		// Status utilities
		status: {
			success: 'bg-success-100 text-success-800 border-success-200',
			warning: 'bg-warning-100 text-warning-800 border-warning-200',
			error: 'bg-error-100 text-error-800 border-error-200',
			info: 'bg-primary-100 text-primary-800 border-primary-200',
			idle: 'bg-neutral-100 text-neutral-800 border-neutral-200'
		},

		// Card utilities
		card: {
			base: 'bg-white border border-neutral-200 rounded-lg shadow-sm',
			interactive: 'hover:shadow-md transition-shadow duration-150',
			elevated: 'shadow-lg border-neutral-100'
		},

		// Button utilities
		button: {
			base: 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
			sizes: {
				sm: 'px-3 py-1.5 text-sm',
				md: 'px-4 py-2 text-base',
				lg: 'px-6 py-3 text-lg',
				xl: 'px-8 py-4 text-xl'
			},
			variants: {
				primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
				secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-500',
				success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500',
				warning: 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500',
				error: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500'
			}
		}
	};
};