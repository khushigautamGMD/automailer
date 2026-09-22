import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'blue' | 'green' | 'amber' | 'rose' | 'purple' | 'zinc';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
};

const dotStyles: Record<BadgeVariant, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  purple: 'bg-purple-500',
  zinc: 'bg-zinc-400',
};

export function Badge({ children, variant = 'zinc', className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', dotStyles[variant])} />}
      {children}
    </span>
  );
}
