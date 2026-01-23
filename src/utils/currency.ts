/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Format cents as currency string (e.g., "$123.45")
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Format cents as compact currency (e.g., "$1.2K")
 */
export function formatCurrencyCompact(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

/**
 * Parse a dollar string input to cents (handles "$1,234.56" or "1234.56")
 */
export function parseDollarInput(input: string): number | null {
  // Remove currency symbols, commas, and spaces
  const cleaned = input.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

/**
 * Format a number input for display while typing (adds commas)
 */
export function formatNumberInput(value: string): string {
  // Remove non-numeric characters except decimal point
  const cleaned = value.replace(/[^0-9.]/g, '');

  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }

  // Limit decimal places to 2
  if (parts[1] && parts[1].length > 2) {
    parts[1] = parts[1].slice(0, 2);
  }

  // Add commas to integer part
  if (parts[0]) {
    parts[0] = parseInt(parts[0], 10).toLocaleString('en-US');
  }

  return parts.join('.');
}
