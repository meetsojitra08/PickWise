import type { MoneyValue } from '@/types/api';

const DEFAULT_CURRENCY = 'INR';
const DECIMAL_MONEY_PATTERN = /^([+-])?(\d+)(?:\.(\d+))?$/;

function normalizeCurrency(currency: string): string {
  const trimmed = currency.trim().toUpperCase();
  return trimmed.length === 3 ? trimmed : DEFAULT_CURRENCY;
}

function localeForCurrency(currency: string): string {
  return currency === 'INR' ? 'en-IN' : 'en-US';
}

/**
 * Parse a decimal money value into integer minor units (paise/cents) without float rounding.
 */
export function parseMoneyToMinorUnits(amount: string | number): number | null {
  const raw = typeof amount === 'number' ? String(amount) : amount.trim();

  if (raw === '') {
    return null;
  }

  const match = DECIMAL_MONEY_PATTERN.exec(raw);

  if (!match) {
    return null;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const whole = Number(match[2]);
  const rawFraction = (match[3] ?? '').padEnd(2, '0');
  const cents = Number(rawFraction.slice(0, 2));

  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(cents)) {
    return null;
  }

  const minorUnits = whole * 100 + cents;

  return Number.isSafeInteger(minorUnits) ? sign * minorUnits : null;
}

/**
 * Format an API MoneyValue using currency-aware grouping and clean decimal precision.
 */
export function formatPrice(money: MoneyValue): string {
  const minorUnits = parseMoneyToMinorUnits(money.amount);

  if (minorUnits === null) {
    return '—';
  }

  const currency = normalizeCurrency(money.currency);
  const hasFractionalUnits = Math.abs(minorUnits) % 100 !== 0;
  const decimalValue = minorUnits / 100;
  const fractionDigits = hasFractionalUnits ? 2 : 0;

  try {
    return new Intl.NumberFormat(localeForCurrency(currency), {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(decimalValue);
  } catch {
    return `${currency} ${decimalValue.toFixed(fractionDigits)}`;
  }
}

/**
 * Calculate the integer percentage drop between a previous price and a lower current price.
 */
export function calculatePriceDropPercent(
  current: MoneyValue,
  previous: MoneyValue,
): number | null {
  if (
    normalizeCurrency(current.currency) !== normalizeCurrency(previous.currency)
  ) {
    return null;
  }

  const currentUnits = parseMoneyToMinorUnits(current.amount);
  const previousUnits = parseMoneyToMinorUnits(previous.amount);

  if (
    currentUnits === null ||
    previousUnits === null ||
    previousUnits <= 0 ||
    currentUnits < 0 ||
    currentUnits >= previousUnits
  ) {
    return null;
  }

  const dropPercent = Math.round(
    ((previousUnits - currentUnits) * 100) / previousUnits,
  );

  return dropPercent >= 1 ? dropPercent : null;
}
