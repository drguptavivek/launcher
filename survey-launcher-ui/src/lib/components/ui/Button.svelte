<!-- SurveyLauncher Admin Button Component -->
<!-- Accessible, configurable button with multiple variants and sizes -->

<script lang="ts">
	import { buttonStates } from '$lib/styles/utils';
	import { createEventDispatcher } from 'svelte';
	import type { ComponentProps } from 'svelte';

	// Button variants
	type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'ghost';
	type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

	// Props
	interface Props extends ComponentProps<'button'> {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		loading?: boolean;
		loadingText?: string;
		icon?: string;
		iconPosition?: 'start' | 'end';
		fullWidth?: boolean;
		rounded?: boolean;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		loadingText = 'Loading...',
		icon,
		iconPosition = 'start',
		fullWidth = false,
		rounded = false,
		type = 'button',
		class: className = '',
		children,
		...restProps
	}: Props = $props();

	// Event dispatching
	const dispatch = createEventDispatcher<{
		click: MouseEvent;
	}>();

	// Handle click events
	function handleClick(event: MouseEvent) {
		if (disabled || loading) {
			event.preventDefault();
			return;
		}

		dispatch('click', event);
	}

	// Generate CSS classes
	const buttonClasses = $derived(() => {
		const baseClasses = [
			'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
			fullWidth ? 'w-full' : '',
			rounded ? 'rounded-full' : 'rounded-lg'
		].filter(Boolean).join(' ');

		// Size classes
		const sizeClasses = {
			xs: 'px-2.5 py-1.5 text-xs gap-1',
			sm: 'px-3 py-2 text-sm gap-1.5',
			md: 'px-4 py-2.5 text-sm gap-2',
			lg: 'px-6 py-3 text-base gap-2',
			xl: 'px-8 py-4 text-base gap-2'
		};

		// Variant classes
		const variantClasses = {
			primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 active:bg-primary-800',
			secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-500 active:bg-neutral-300',
			success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 active:bg-success-800',
			warning: 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500 active:bg-warning-800',
			error: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 active:bg-error-800',
			outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500 active:bg-primary-100',
			ghost: 'text-primary-600 hover:bg-primary-50 focus:ring-primary-500 active:bg-primary-100'
		};

		return [
			baseClasses,
			sizeClasses[size],
			variantClasses[variant],
			className
		].filter(Boolean).join(' ');
	});

	// Generate content for loading state
	const buttonContent = $derived(() => {
		if (loading) {
			return {
				startIcon: '🔄',
				endIcon: null,
				text: loadingText,
				showChildren: false
			};
		}

		return {
			startIcon: iconPosition === 'start' ? icon : null,
			endIcon: iconPosition === 'end' ? icon : null,
			text: children,
			showChildren: true
		};
	});
</script>

<button
	{type}
	class={buttonClasses}
	{disabled}
	aria-disabled={disabled || loading}
	aria-describedby={loading ? 'loading-text' : undefined}
	aria-busy={loading}
	{...restProps}
	onclick={handleClick}
>
	{#if loading}
		<span id="loading-text" class="sr-only">Loading</span>
	{/if}

	{#if buttonContent.startIcon}
		<span class="button-icon" aria-hidden="true">{@html buttonContent.startIcon}</span>
	{/if}

	{#if buttonContent.text && buttonContent.showChildren}
		<span class="button-text">{@render children()}</span>
	{:else if buttonContent.text && !buttonContent.showChildren}
		<span class="button-text">{buttonContent.text}</span>
	{/if}

	{#if buttonContent.endIcon}
		<span class="button-icon" aria-hidden="true">{@html buttonContent.endIcon}</span>
	{/if}

	{#if loading}
		<span class="animate-spin ml-2" aria-hidden="true">⏳</span>
	{/if}
</button>

<style>
	/* Custom button styles that work with Tailwind */
	@layer components {
		.button-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}

		.button-text {
			display: inline-block;
		}

		/* Focus styles for better accessibility */
		button:focus-visible {
			outline: 2px solid theme('colors.primary.500');
			outline-offset: 2px;
		}

		/* Reduced motion support */
		@media (prefers-reduced-motion: reduce) {
			button {
				transition: none;
			}

			.animate-spin {
				animation: none;
			}
		}
	}
</style>