import React from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}) => {
  const variantStyles = {
    brand: 'bg-primary-soft text-primary-hover dark:text-accent-foreground border-primary-border',
    success: 'bg-success-soft text-success-text border-success-border',
    warning: 'bg-warning-soft text-warning-text border-warning-border',
    error: 'bg-error-soft text-error-text border-error-border',
    info: 'bg-info-soft text-info-text border-info-border',
    neutral: 'bg-muted text-foreground border-border',
    outline: 'bg-transparent text-foreground border-border',
  };

  const sizeStyles = {
    sm: 'text-[10px] font-semibold px-2 py-0.5 rounded-md gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 rounded-lg gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center border transition-colors select-none font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
