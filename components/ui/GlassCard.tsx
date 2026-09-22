import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function GlassCard({ children, className, hoverEffect = true, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-xl p-6 shadow-sm transition-all duration-300 dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:shadow-none',
        hoverEffect && 'hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:border-blue-500/40',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
