import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Centralized number formatting utility for Vietnamese locale
 * @param value - The value to format (number, string, null, or undefined)
 * @returns Formatted string with Vietnamese thousand separators or "-" for invalid values
 */
export function formatNumber(value: number | string | null | undefined): string {
  // Handle null, undefined, or empty string cases
  if (value === null || value === undefined || value === '') {
    return "-";
  }

  // Parse the value to a number
  const numberValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle NaN or zero cases
  if (isNaN(numberValue) || numberValue === 0) {
    return "-";
  }

  // Format using Vietnamese locale (dots as thousand separators)
  return new Intl.NumberFormat('vi-VN').format(numberValue);
}
