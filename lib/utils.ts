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

/**
 * Centralized percentage formatting utility for Vietnamese locale
 * @param value - The percentage value to format (number, null, or undefined)
 * @returns Formatted percentage string with proper Vietnamese locale formatting
 */
export function formatPercentage(value: number | null | undefined): string {
  // Handle null, undefined cases
  if (value === null || value === undefined) {
    return "-";
  }

  // Handle zero case - show as 0%
  if (value === 0) {
    return "0%";
  }

  // Handle NaN case
  if (isNaN(value)) {
    return "-";
  }

  // Format using Vietnamese locale with percent style
  // Note: value / 100 is important because Intl.NumberFormat expects decimal values for percent style
  return new Intl.NumberFormat('vi-VN', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
}
