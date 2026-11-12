import type { BudgetSettings, EventStatus } from '../types/exchange';

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
};

export function formatCurrency(amount: number, currency = 'PHP'): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${sym}${amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatBudget(budget: BudgetSettings): string {
  const { amount, min, max, currency } = budget;
  if (min !== undefined && max !== undefined) {
    return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
  }
  if (amount !== undefined) {
    return formatCurrency(amount, currency);
  }
  if (min !== undefined) {
    return `From ${formatCurrency(min, currency)}`;
  }
  if (max !== undefined) {
    return `Up to ${formatCurrency(max, currency)}`;
  }
  return 'Flexible / No fixed budget';
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not set';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getStatusLabel(status: EventStatus): string {
  switch (status) {
    case 'CREATED':
      return 'Created · Open';
    case 'COLLECTING':
      return 'Collecting Submissions';
    case 'REGISTRATION_CLOSED':
      return 'Registration Closed';
    case 'READY':
      return 'Ready for Draw';
    case 'LOCKED':
      return 'Draw in Progress';
    case 'DRAWN':
      return 'Drawn · Matches Revealed';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
  }
}
