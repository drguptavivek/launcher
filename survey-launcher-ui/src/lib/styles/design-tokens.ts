// SurveyLauncher Admin Design Tokens
// Defines all visual design constants and utilities

export const colors = {
	// Brand colors
	primary: {
		50: '#eff6ff',
		100: '#dbeafe',
		200: '#bfdbfe',
		300: '#93c5fd',
		400: '#60a5fa',
		500: '#3b82f6',
		600: '#2563eb',
		700: '#1d4ed8',
		800: '#1e40af',
		900: '#1e3a8a',
		950: '#172554'
	},

	// Success colors
	success: {
		50: '#f0fdf4',
		100: '#dcfce7',
		200: '#bbf7d0',
		300: '#86efac',
		400: '#4ade80',
		500: '#22c55e',
		600: '#16a34a',
		700: '#15803d',
		800: '#166534',
		900: '#14532d',
		950: '#052e16'
	},

	// Warning colors
	warning: {
		50: '#fffbeb',
		100: '#fef3c7',
		200: '#fde68a',
		300: '#fcd34d',
		400: '#fbbf24',
		500: '#f59e0b',
		600: '#d97706',
		700: '#b45309',
		800: '#92400e',
		900: '#78350f',
		950: '#451a03'
	},

	// Error colors
	error: {
		50: '#fef2f2',
		100: '#fee2e2',
		200: '#fecaca',
		300: '#fca5a5',
		400: '#f87171',
		500: '#ef4444',
		600: '#dc2626',
		700: '#b91c1c',
		800: '#991b1b',
		900: '#7f1d1d',
		950: '#450a0a'
	},

	// Neutral colors (grays)
	neutral: {
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
		950: '#030712'
	}
};

export const typography = {
	// Font families
	fonts: {
		sans: ['Inter', 'system-ui', 'sans-serif'],
		mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace']
	},

	// Font sizes
	sizes: {
		xs: '0.75rem',      // 12px
		sm: '0.875rem',     // 14px
		base: '1rem',       // 16px
		lg: '1.125rem',     // 18px
		xl: '1.25rem',      // 20px
		'2xl': '1.5rem',    // 24px
		'3xl': '1.875rem',  // 30px
		'4xl': '2.25rem',   // 36px
		'5xl': '3rem',      // 48px
		'6xl': '3.75rem',   // 60px
	},

	// Line heights
	lineHeights: {
		tight: '1.25',
		snug: '1.375',
		normal: '1.5',
		relaxed: '1.625',
		loose: '2'
	},

	// Font weights
	weights: {
		thin: '100',
		extralight: '200',
		light: '300',
		normal: '400',
		medium: '500',
		semibold: '600',
		bold: '700',
		extrabold: '800',
		black: '900'
	}
};

export const spacing = {
	0: '0px',
	px: '1px',
	0.5: '0.125rem',   // 2px
	1: '0.25rem',      // 4px
	1.5: '0.375rem',   // 6px
	2: '0.5rem',       // 8px
	2.5: '0.625rem',   // 10px
	3: '0.75rem',      // 12px
	3.5: '0.875rem',   // 14px
	4: '1rem',         // 16px
	5: '1.25rem',      // 20px
	6: '1.5rem',       // 24px
	7: '1.75rem',      // 28px
	8: '2rem',         // 32px
	9: '2.25rem',      // 36px
	10: '2.5rem',      // 40px
	11: '2.75rem',     // 44px
	12: '3rem',        // 48px
	14: '3.5rem',      // 56px
	16: '4rem',        // 64px
	20: '5rem',        // 80px
	24: '6rem',        // 96px
	28: '7rem',        // 112px
	32: '8rem',        // 128px
	36: '9rem',        // 144px
	40: '10rem',       // 160px
	44: '11rem',       // 176px
	48: '12rem',       // 192px
	52: '13rem',       // 208px
	56: '14rem',       // 224px
	60: '15rem',       // 240px
	64: '16rem',       // 256px
	72: '18rem',       // 288px
	80: '20rem',       // 320px
	96: '24rem',       // 384px
};

export const borderRadius = {
	none: '0px',
	sm: '0.125rem',     // 2px
	base: '0.25rem',    // 4px
	md: '0.375rem',     // 6px
	lg: '0.5rem',       // 8px
	xl: '0.75rem',      // 12px
	'2xl': '1rem',      // 16px
	'3xl': '1.5rem',    // 24px
	full: '9999px'
};

export const shadows = {
	sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
	base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
	md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
	lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
	xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
	'2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
	inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
};

export const breakpoints = {
	sm: '640px',
	md: '768px',
	lg: '1024px',
	xl: '1280px',
	'2xl': '1536px'
};

export const zIndex = {
	hide: -1,
	auto: 'auto',
	base: 0,
	docked: 10,
	dropdown: 1000,
	sticky: 1100,
	modal: 1200,
	popover: 1300,
	skipLink: 2000,
	overlay: 3000
};

export const animation = {
	durations: {
		fast: '150ms',
		normal: '250ms',
		slow: '350ms'
	},
	easings: {
		ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
		easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
		easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
		easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
	}
};

// Component-specific design tokens
export const components = {
	button: {
		height: {
			sm: '2rem',   // 32px
			md: '2.5rem', // 40px
			lg: '3rem',   // 48px
			xl: '3.5rem'  // 56px
		},
		padding: {
			sm: '0.5rem 1rem',
			md: '0.625rem 1.25rem',
			lg: '0.75rem 1.5rem',
			xl: '1rem 2rem'
		}
	},

	card: {
		padding: {
			sm: '1rem',
			md: '1.5rem',
			lg: '2rem',
			xl: '2.5rem'
		},
		shadow: shadows.base
	},

	form: {
		field: {
			height: {
				sm: '2rem',
				md: '2.5rem',
				lg: '3rem'
			},
			padding: {
				sm: '0.5rem 0.75rem',
				md: '0.625rem 1rem',
				lg: '0.75rem 1.25rem'
			}
		}
	}
};

export default {
	colors,
	typography,
	spacing,
	borderRadius,
	shadows,
	breakpoints,
	zIndex,
	animation,
	components
};