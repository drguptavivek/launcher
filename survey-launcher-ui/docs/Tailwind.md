# SurveyLauncher Admin - TailwindCSS 4 Theme System Documentation

## Overview

This document provides comprehensive documentation for the TailwindCSS 4 theme system used in the SurveyLauncher Admin Frontend. It covers the modern oklch color system, component design tokens, and theming architecture.

## Table of Contents

1. [Color System](#color-system)
2. [Design Tokens](#design-tokens)
3. [Component Theming](#component-theming)
4. [Custom Utilities](#custom-utilities)
5. [Dark Mode Support](#dark-mode-support)
6. [Responsive Design](#responsive-design)
7. [Animation System](#animation-system)
8. [Typography](#typography)
9. [Best Practices](#best-practices)

---

## Color System

### **Modern oklch Color Space**

The SurveyLauncher Admin uses TailwindCSS 4's modern oklch (OK Lab) color space for better color accuracy and consistency across devices.

```css
/* Primary Colors - Blue Palette */
--color-primary-50: oklch(0.98 0.01 264);
--color-primary-100: oklch(0.96 0.02 264);
--color-primary-200: oklch(0.93 0.03 264);
--color-primary-300: oklch(0.88 0.04 264);
--color-primary-400: oklch(0.82 0.05 264);
--color-primary-500: oklch(0.71 0.06 264);
--color-primary-600: oklch(0.61 0.07 264);
--color-primary-700: oklch(0.52 0.08 264);
--color-primary-800: oklch(0.42 0.09 264);
--color-primary-900: oklch(0.33 0.10 264);
--color-primary-950: oklch(0.25 0.12 264);

/* Success Colors - Green Palette */
--color-success-50: oklch(0.99 0.01 152);
--color-success-100: oklch(0.97 0.02 152);
--color-success-200: oklch(0.93 0.03 152);
--color-success-300: oklch(0.88 0.05 152);
--color-success-400: oklch(0.83 0.07 152);
--color-success-500: oklch(0.73 0.09 152);
--color-success-600: oklch(0.64 0.11 152);
--color-success-700: oklch(0.54 0.13 152);
--color-success-800: oklch(0.44 0.15 152);
--color-success-900: oklch(0.36 0.17 152);
--color-success-950: oklch(0.20 0.20 152);

/* Warning Colors - Amber Palette */
--color-warning-50: oklch(0.99 0.02 95);
--color-warning-100: oklch(0.97 0.04 95);
--color-warning-200: oklch(0.94 0.06 95);
--color-warning-300: oklch(0.90 0.09 95);
--color-warning-400: oklch(0.84 0.12 95);
--color-warning-500: oklch(0.77 0.15 95);
--color-warning-600: oklch(0.67 0.18 95);
--color-warning-700: oklch(0.55 0.21 95);
--color-warning-800: oklch(0.43 0.23 95);
--color-warning-900: oklch(0.32 0.24 95);
--color-warning-950: oklch(0.20 0.26 95);

/* Error Colors - Red Palette */
--color-error-50: oklch(0.99 0.01 20);
--color-error-100: oklch(0.97 0.02 20);
--color-error-200: oklch(0.94 0.03 20);
--color-error-300: oklch(0.91 0.05 20);
--color-error-400: oklch(0.87 0.07 20);
--color-error-500: oklch(0.78 0.09 20);
--color-error-600: oklch(0.66 0.12 20);
--color-error-700: oklch(0.54 0.15 20);
--color-error-800: oklch(0.41 0.17 20);
--color-error-900: oklch(0.31 0.20 20);
--color-error-950: oklch(0.20 0.24 20);
```

### **Color Usage Guidelines**

#### **Primary Colors (Blue)**
- **Primary Actions**: Login buttons, primary CTA, navigation
- **Brand Elements**: Logo, headers, accents
- **Interactive Elements**: Links, selected states

#### **Success Colors (Green)**
- **Success Messages**: Form submissions, completed actions
- **Positive Indicators**: Online status, active states
- **Confirmation**: Success dialogs, completion badges

#### **Warning Colors (Amber)**
- **Warning Messages**: Form validation warnings
- **Pending States**: Loading indicators, processing
- **Attention Required**: Notifications, alerts

#### **Error Colors (Red)**
- **Error Messages**: Form validation errors, API failures
- **Negative Indicators**: Offline status, failed states
- **Critical Alerts**: System errors, danger warnings

#### **Neutral Colors (Gray)**
- **Text**: Body text, labels, descriptions
- **Borders**: Dividers, input borders, outlines
- **Backgrounds**: Page backgrounds, cards, surfaces

---

## Design Tokens

### **Spacing Scale**

```css
/* Consistent spacing using 4px base unit */
--spacing-xs: 0.25rem;    /* 4px */
--spacing-sm: 0.5rem;     /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 2.5rem;   /* 40px */
--spacing-3xl: 3rem;     /* 48px */
--spacing-4xl: 4rem;     /* 64px */
--spacing-5xl: 5rem;     /* 80px */
```

### **Border Radius Scale**

```css
/* Consistent border radius */
--radius-none: 0;
--radius-sm: 0.125rem;  /* 2px */
--radius-md: 0.375rem;   /* 6px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-2xl: 1rem;      /* 16px */
--radius-3xl: 1.5rem;    /* 24px */
--radius-full: 9999px;
```

### **Shadow Scale**

```css
/* Consistent shadow elevations */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
--shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
```

---

## Component Theming

### **Button Variants**

```css
/* Base button styles */
.btn {
  @apply inline-flex items-center justify-center font-medium rounded-lg;
  @apply transition-colors duration-150;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

/* Size variants */
.btn-sm {
  @apply px-3 py-1.5 text-xs gap-1;
}

.btn-md {
  @apply px-4 py-2 text-sm gap-2;
}

.btn-lg {
  @apply px-6 py-3 text-base gap-2;
}

.btn-xl {
  @apply px-8 py-4 text-lg gap-2;
}

/* Color variants */
.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700;
  @apply focus:ring-primary-500 active:bg-primary-800;
}

.btn-secondary {
  @apply bg-neutral-100 text-neutral-900 hover:bg-neutral-200;
  @apply focus:ring-neutral-500 active:bg-neutral-300;
}

.btn-success {
  @apply bg-success-600 text-white hover:bg-success-700;
  @apply focus:ring-success-500 active:bg-success-800;
}

.btn-warning {
  @apply bg-warning-600 text-white hover:bg-warning-700;
  @apply focus:ring-warning-500 active:bg-warning-800;
}

.btn-error {
  @apply bg-error-600 text-white hover:bg-error-700;
  @apply focus:ring-error-500 active:bg-error-800;
}

.btn-ghost {
  @apply text-neutral-600 hover:bg-neutral-100;
  @apply focus:ring-neutral-500 active:bg-neutral-200;
}

.btn-outline {
  @apply border-2 border-primary-600 text-primary-600;
  @apply hover:bg-primary-50 focus:ring-primary-500 active:bg-primary-100;
}
```

### **Card Variants**

```css
/* Base card styles */
.card {
  @apply bg-white border border-neutral-200 rounded-lg;
  @apply shadow-sm transition-shadow duration-150;
}

/* Interactive card */
.card-interactive {
  @apply hover:shadow-md cursor-pointer;
  @apply active:shadow-lg;
}

/* Elevated card */
.card-elevated {
  @apply shadow-lg border-neutral-100;
}

/* Status cards */
.card-success {
  @apply bg-success-50 border-success-200 text-success-800;
}

.card-warning {
  @apply bg-warning-50 border-warning-200 text-warning-800;
}

.card-error {
  @apply bg-error-50 border-error-200 text-error-800;
}

.card-info {
  @apply bg-primary-50 border-primary-200 text-primary-800;
}
```

### **Form Element Variants**

```css
/* Input field styles */
.input {
  @apply w-full px-3 py-2 border border-neutral-300 rounded-md;
  @apply bg-white text-neutral-900 placeholder-neutral-500;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  @apply disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed;
}

.input-error {
  @apply border-error-500 focus:ring-error-500;
}

.input-success {
  @apply border-success-500 focus:ring-success-500;
}

/* Textarea styles */
.textarea {
  @apply input resize-y min-h-24;
}

/* Select styles */
.select {
  @apply input appearance-none cursor-pointer;
  @apply bg-white;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

/* Checkbox styles */
.checkbox {
  @apply w-4 h-4 text-primary-600 border-neutral-300;
  @apply rounded focus:ring-primary-500;
  @apply disabled:border-neutral-200 disabled:text-neutral-400;
}
```

---

## Custom Utilities

### **Status Utilities**

```css
/* Status indicators */
.status-success {
  @apply bg-success-100 text-success-800 border-success-200;
}

.status-warning {
  @apply bg-warning-100 text-warning-800 border-warning-200;
}

.status-error {
  @apply bg-error-100 text-error-800 border-error-200;
}

.status-info {
  @apply bg-primary-100 text-primary-800 border-primary-200;
}

.status-idle {
  @apply bg-neutral-100 text-neutral-800 border-neutral-200;
}

/* Online/Offline status */
.status-online {
  @apply bg-success-500;
  @apply w-3 h-3 rounded-full;
  @apply ring-2 ring-success-200;
}

.status-offline {
  @apply bg-neutral-400;
  @apply w-3 h-3 rounded-full;
  @apply ring-2 ring-neutral-200;
}
```

### **Layout Utilities**

```css
/* Container */
.container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}

/* Section spacing */
.section-sm {
  @apply py-8;
}

.section-md {
  @apply py-12;
}

.section-lg {
  @apply py-16;
}

/* Card layouts */
.card-grid {
  @apply grid gap-6;
  @apply grid-cols-1 sm:grid-cols-2 lg:grid-cols-3;
}

.card-list {
  @apply space-y-4;
}
```

### **Text Utilities**

```css
/* Text colors */
.text-primary {
  @apply text-primary-600;
}

.text-success {
  @apply text-success-600;
}

.text-warning {
  @apply text-warning-600;
}

.text-error {
  @apply text-error-600;
}

/* Text sizes */
.text-xs {
  @apply text-xs leading-tight;
}

.text-sm {
  @apply text-sm leading-snug;
}

.text-base {
  @apply text-base leading-normal;
}

.text-lg {
  @apply text-lg leading-relaxed;
}

.text-xl {
  @apply text-xl leading-relaxed;
}

.text-2xl {
  @apply text-2xl leading-tight;
}

/* Font weights */
.font-light {
  @apply font-light;
}

.font-normal {
  @apply font-normal;
}

.font-medium {
  @apply font-medium;
}

.font-semibold {
  @apply font-semibold;
}

.font-bold {
  @apply font-bold;
}
```

### **Animation Utilities**

```css
/* Transition utilities */
.transition {
  @apply transition-colors duration-150 ease-in-out;
}

.transition-transform {
  @apply transition-transform duration-150 ease-in-out;
}

.transition-opacity {
  @apply transition-opacity duration-150 ease-in-out;
}

/* Hover effects */
.hover-lift {
  @apply hover:-translate-y-0.5 hover:shadow-md;
}

.hover-glow {
  @apply hover:ring-4 hover:ring-primary-200;
}

/* Loading states */
.loading-pulse {
  @apply animate-pulse;
}

.loading-bounce {
  @apply animate-bounce;
}
```

---

## Dark Mode Support

### **Dark Mode Configuration**

```css
/* Dark mode color overrides */
.dark {
  /* Dark mode background colors */
  --color-background: oklch(0.09 0.01 264);
  --color-foreground: oklch(0.98 0.01 264);
  --color-card: oklch(0.13 0.02 264);
  --color-card-foreground: oklch(0.98 0.01 264);
  --color-popover: oklch(0.13 0.02 264);
  --color-popover-foreground: oklch(0.98 0.01 264);
  --color-primary: oklch(0.92 0.01 264);
  --color-primary-foreground: oklch(0.13 0.02 264);
  --color-secondary: oklch(0.27 0.03 264);
  --color-secondary-foreground: oklch(0.98 0.01 264);
  --color-muted: oklch(0.27 0.03 264);
  --color-muted-foreground: oklch(0.71 0.02 264);
  --color-accent: oklch(0.27 0.03 264);
  --color-accent-foreground: oklch(0.98 0.01 264);
  --color-destructive: oklch(0.70 0.19 22);
  --color-border: oklch(0.27 0.03 264);
  --color-input: oklch(1 0 0 / 15%);
  --color-ring: oklch(0.55 0.02 264);
}
```

### **Dark Mode Toggle Implementation**

```svelte
<!-- ThemeToggle.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  let isDark = $state(false);

  onMount(() => {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDark = localStorage.getItem('theme') === 'dark' ||
               (!localStorage.getItem('theme') && prefersDark);

    // Apply theme
    updateTheme(isDark);

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        isDark = e.matches;
        updateTheme(isDark);
      }
    });
  });

  $effect(() => {
    updateTheme(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });

  function updateTheme(dark: boolean) {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function toggleTheme() {
    isDark = !isDark;
  }
</script>

<button
  onclick={toggleTheme}
  class="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if isDark}
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-9"/>
    </svg>
  {:else}
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  {/if}
</button>
```

---

## Responsive Design

### **Breakpoint System**

```css
/* Responsive breakpoints */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */

/* Responsive utilities */
.hidden-mobile {
  @apply block sm:hidden;
}

.hidden-tablet {
  @apply hidden sm:block md:hidden lg:hidden;
}

.hidden-desktop {
  @apply hidden md:block lg:hidden;
}

.visible-mobile {
  @apply hidden sm:block md:hidden lg:hidden;
}

.visible-tablet {
  @apply block sm:hidden md:block lg:hidden;
}

.visible-desktop {
  @apply hidden md:block lg:block;
}
```

### **Responsive Grid Systems**

```css
/* Responsive grid */
.grid-responsive {
  @apply grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3;
}

.grid-sidebar {
  @apply grid gap-6 grid-cols-1 lg:grid-cols-4;
}

.grid-dashboard {
  @apply grid gap-6 grid-cols-1 xl:grid-cols-4;
}

/* Responsive container */
.container-responsive {
  @apply container mx-auto px-4 sm:px-6 lg:px-8;
  @apply max-w-none sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl;
}

/* Responsive spacing */
.section-responsive {
  @apply py-8 sm:py-12 lg:py-16;
}
```

### **Mobile-First Design Patterns**

```css
/* Mobile-first card layout */
.card-responsive {
  @apply w-full p-4 sm:p-6 lg:p-8;
  @apply sm:w-auto sm:max-w-md lg:max-w-lg;
}

/* Mobile-first navigation */
.nav-mobile {
  @apply flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4;
  @apply text-sm sm:text-base;
}

/* Mobile-first typography */
.title-responsive {
  @apply text-2xl sm:text-3xl lg:text-4xl;
  @apply leading-tight sm:leading-none;
}

/* Mobile-first forms */
.form-responsive {
  @apply space-y-4 sm:space-y-6;
}

.form-row {
  @apply space-y-4 sm:flex sm:space-y-0 sm:space-x-4;
}

.form-field {
  @apply flex-1;
}
```

---

## Animation System

### **CSS Custom Properties for Animations**

```css
/* Animation durations */
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 350ms;

/* Animation easings */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);

/* Animation keyframes */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}
```

### **Animation Utilities**

```css
/* Fade animations */
.animate-fade-in {
  animation: fadeIn var(--duration-normal) ease-in-out;
}

.animate-fade-out {
  animation: fadeOut var(--duration-normal) ease-in-out;
}

/* Slide animations */
.animate-slide-in-up {
  animation: slideInUp var(--duration-normal) ease-out;
}

.animate-slide-in-down {
  animation: slideInDown var(--duration-normal) ease-out;
}

.animate-slide-in-right {
  animation: slideInRight var(--duration-normal) ease-out;
}

.animate-slide-in-left {
  animation: slideInLeft var(--duration-normal) ease-out;
}

/* Scale animations */
.animate-scale-in {
  animation: scaleIn var(--duration-normal) ease-out;
}

/* Loading animations */
.animate-spin {
  animation: spin 1s linear infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce {
  animation: bounce 1s infinite;
}

/* Transition utilities */
.transition-all {
  @apply transition-all duration-150 ease-in-out;
}

.transition-colors {
  @apply transition-colors duration-150 ease-in-out;
}

.transition-transform {
  @apply transition-transform duration-150 ease-in-out;
}

.transition-opacity {
  @apply transition-opacity duration-150 ease-in-out;
}

/* Hover animations */
.hover-lift {
  @apply hover:scale-105 hover:shadow-lg;
  @apply transition-transform duration-150 ease-out;
}

.hover-glow {
  @apply hover:ring-4 hover:ring-primary-200;
  @apply transition-all duration-150 ease-in-out;
}

.hover-rotate {
  @apply hover:rotate-3;
  @apply transition-transform duration-150 ease-in-out;
}

/* Focus animations */
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  @apply transition-all duration-150 ease-in-out;
}
```

### **Staggered Animations**

```css
/* Staggered list animations */
.stagger-list {
  > * {
    animation: slideInUp var(--duration-normal) ease-out;
    animation-fill-mode: both;
  }

  > *:nth-child(1) { animation-delay: 50ms; }
  > *:nth-child(2) { animation-delay: 100ms; }
  > *:nth-child(3) { animation-delay: 150ms; }
  > *:nth-child(4) { animation-delay: 200ms; }
  > *:nth-child(5) { animation-delay: 250ms; }
  > *:nth-child(n + 6) { animation-delay: 300ms; }
}

/* Staggered fade animations */
.stagger-fade {
  > * {
    animation: fadeIn var(--duration-normal) ease-in-out;
    animation-fill-mode: both;
  }

  > *:nth-child(1) { animation-delay: 100ms; }
  > *:nth-child(2) { animation-delay: 200ms; }
  > *:nth-child(3) { animation-delay: 300ms; }
  > *:nth-child(4) { animation-delay: 400ms; }
}
```

### **Reduced Motion Support**

```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  /* Disable animations for users who prefer reduced motion */
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Keep essential transitions */
  .transition-essential {
    transition-duration: 0.01ms !important;
  }
}
```

---

## Typography

### **Font Family System**

```css
/* Font families */
.font-sans {
  font-family: 'Inter', system-ui, sans-serif;
}

.font-mono {
  font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
}

/* Font sizes */
.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-base {
  font-size: 1rem;
  line-height: 1.5rem;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.text-xl {
  font-size: 1.25rem;
  line-height: 1.75rem;
}

.text-2xl {
  font-size: 1.5rem;
  line-height: 2rem;
}

.text-3xl {
  font-size: 1.875rem;
  line-height: 2.25rem;
}

.text-4xl {
  font-size: 2.25rem;
  line-height: 2.5rem;
}

.text-5xl {
  font-size: 3rem;
  line-height: 1;
}

.text-6xl {
  font-size: 3.75rem;
  line-height: 1;
}
```

### **Typography Utilities**

```css
/* Headings */
.h1 {
  @apply text-4xl font-bold tracking-tight;
}

.h2 {
  @apply text-3xl font-bold tracking-tight;
}

.h3 {
  @apply text-2xl font-semibold tracking-tight;
}

.h4 {
  @apply text-xl font-semibold;
}

.h5 {
  @apply text-lg font-medium;
}

.h6 {
  @apply text-base font-medium;
}

/* Body text */
.lead {
  @apply text-xl text-neutral-600 dark:text-neutral-400;
}

.small {
  @apply text-sm text-neutral-500 dark:text-neutral-400;
}

/* Text utilities */
.text-muted {
  @apply text-neutral-500 dark:text-neutral-400;
}

.text-primary {
  @apply text-primary-600 dark:text-primary-400;
}

.text-success {
  @apply text-success-600 dark:text-success-400;
}

.text-warning {
  @apply text-warning-600 dark:text-warning-400;
}

.text-error {
  @apply text-error-600 dark:text-error-400;
}

/* Font weights */
.font-light {
  font-weight: 300;
}

.font-normal {
  font-weight: 400;
}

.font-medium {
  font-weight: 500;
}

.font-semibold {
  font-weight: 600;
}

.font-bold {
  font-weight: 700;
}

/* Line heights */
.leading-tight {
  line-height: 1.25;
}

.leading-snug {
  line-height: 1.375;
}

.leading-normal {
  line-height: 1.5;
}

.leading-relaxed {
  line-height: 1.625;
}

.leading-loose {
  line-height: 2;
}

/* Text decoration */
.underline {
  text-decoration: underline;
}

.line-through {
  text-decoration: line-through;
}

.no-underline {
  text-decoration: none;
}

/* Text alignment */
.text-left {
  text-align: left;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.text-justify {
  text-align: justify;
}

/* Text transform */
.uppercase {
  text-transform: uppercase;
}

.lowercase {
  text-transform: lowercase;
}

.capitalize {
  text-transform: capitalize;
}
```

---

## Best Practices

### **1. Use Semantic Color Names**

```css
/* Good */
.btn-primary {
  @apply bg-primary-600 text-white;
}

.card-success {
  @apply bg-success-100 border-success-200;
}

/* Avoid */
.btn-blue {
  @apply bg-blue-600 text-white;
}

.card-green {
  @apply bg-green-100 border-green-200;
}
```

### **2. Use Consistent Spacing**

```css
/* Good */
.card {
  @apply p-6 space-y-4;
}

.button-group {
  @apply flex gap-2;
}

/* Avoid */
.card {
  @apply p-6 py-8 px-4 gap-x-4 gap-y-8;
}
```

### **3. Leverage Responsive Utilities**

```css
/* Mobile-first approach */
.container {
  @apply px-4 sm:px-6 lg:px-8;
}

.grid {
  @apply grid-cols-1 sm:grid-cols-2 lg:grid-cols-3;
}
```

### **4. Use Dark Mode Classes**

```css
/* Good */
.navbar {
  @apply bg-white dark:bg-gray-900;
  @apply border-gray-200 dark:border-gray-700;
}

/* Avoid */
.navbar {
  @apply bg-white;
}

.navbar.dark {
  @apply bg-gray-900;
}
```

### **5. Use Animation Sparingly**

```css
/* Good - meaningful animations */
.button {
  @apply transition-transform hover:scale-105;
}

.modal {
  @apply animate-fade-in;
}

/* Avoid - excessive animations */
.div {
  @apply animate-spin hover:rotate-180 hover:scale-125 hover:bg-blue-500;
}
```

### **6. Use Custom Properties for Theming**

```css
/* Good */
.btn {
  background-color: var(--color-primary-600);
  color: var(--color-white);
}

/* Avoid */
.btn {
  background-color: #3b82f6;
  color: #ffffff;
}
```

### **7. Use Utility-First Approach**

```css
/* Good - utility classes */
.card {
  @apply bg-white rounded-lg shadow-md p-6;
}

/* Avoid - custom CSS when utilities suffice */
.custom-card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}
```

### **8. Consider Accessibility**

```css
/* Good - accessible colors */
.success-message {
  @apply bg-success-100 text-success-800 border-success-200;
  @apply focus:ring-2 focus:ring-success-500 focus:ring-offset-2;
}

/* Good - focus states */
.button {
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500;
}

/* Good - reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .animated {
    animation: none;
  }
}
```

This TailwindCSS 4 theme system provides a comprehensive, modern foundation for the SurveyLauncher Admin Frontend with excellent color accuracy, responsive design, and accessibility support. The oklch color space ensures consistent appearance across devices while the utility-first approach enables rapid development and easy maintenance.