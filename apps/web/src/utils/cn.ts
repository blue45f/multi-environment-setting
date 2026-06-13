import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names with Tailwind-aware conflict resolution.
 * `cn('p-2', condition && 'p-4')` → later utility wins, duplicates collapse.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
