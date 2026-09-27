import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost';

const styles: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong',
  secondary: 'border border-line bg-panel text-ink hover:bg-surface',
  ghost: 'text-muted hover:bg-surface hover:text-ink',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

export function Button({ variant = 'primary', isLoading, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  );
}
