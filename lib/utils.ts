import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Interpolates variables like {{firstname}}, {{company}}, etc. into email HTML or text strings.
 */
export function interpolateVariables(
  templateText: string,
  variables: Record<string, string | undefined>
): string {
  if (!templateText) return '';
  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const lowerKey = key.toLowerCase();
    const foundValue = Object.keys(variables).find(
      (k) => k.toLowerCase() === lowerKey
    );
    if (foundValue && variables[foundValue] !== undefined && variables[foundValue] !== null) {
      return String(variables[foundValue]);
    }
    // Default fallback formatting for common tags if missing
    if (lowerKey === 'firstname') return 'Friend';
    if (lowerKey === 'company') return 'your company';
    return match;
  });
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function calculatePercentage(part: number, total: number): number {
  if (!total || total === 0) return 0;
  return Math.round((part / total) * 100);
}
