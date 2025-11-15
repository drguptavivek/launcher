<!-- Badge Component -->
<script lang="ts">
  let {
    variant = 'default',
    size = 'md',
    class: className = '',
    children
  } = $props<{
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    children?: any;
  }>();

  const baseClasses = [
    'inline-flex',
    'items-center',
    'rounded-full',
    'font-medium',
    'transition-colors',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-ring-offset-background'
  ];

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  const badgeClasses = [
    ...baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');
</script>

<div {class={badgeClasses}>
  {children}
</div>