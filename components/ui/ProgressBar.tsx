import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0 to 100
  className?: string;
  showLabel?: boolean;
  colorClass?: string;
}

export function ProgressBar({ value, className, showLabel = true, colorClass = 'bg-blue-600 dark:bg-blue-500' }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          <span>Sending Progress</span>
          <span>{clampedValue}%</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={cn('h-full transition-all duration-500 ease-out rounded-full', colorClass)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
