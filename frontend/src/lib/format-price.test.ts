import { describe, expect, it } from 'vitest';
import {
  calculatePriceDropPercent,
  formatPrice,
  parseMoneyToMinorUnits,
} from '@/lib/format-price';

describe('format-price', () => {
  it('parses decimal amounts to minor units without float precision drift', () => {
    expect(parseMoneyToMinorUnits('89999.00')).toBe(8999900);
    expect(parseMoneyToMinorUnits('19.99')).toBe(1999);
    expect(parseMoneyToMinorUnits('100.1')).toBe(10010);
    expect(parseMoneyToMinorUnits('-42.50')).toBe(-4250);
    expect(parseMoneyToMinorUnits('')).toBeNull();
    expect(parseMoneyToMinorUnits('not-a-number')).toBeNull();
  });

  it('formats INR amounts with Indian grouping and omits zero paise', () => {
    expect(formatPrice({ amount: '89999.00', currency: 'INR' })).toBe(
      '₹89,999',
    );
    expect(formatPrice({ amount: '139999.00', currency: 'INR' })).toBe(
      '₹1,39,999',
    );
    expect(formatPrice({ amount: '89999.50', currency: 'INR' })).toBe(
      '₹89,999.50',
    );
    expect(formatPrice({ amount: '0.00', currency: 'INR' })).toBe('₹0');
  });

  it('formats non-INR currencies and invalid amounts safely', () => {
    expect(formatPrice({ amount: '199.00', currency: 'USD' })).toBe('$199');
    expect(formatPrice({ amount: 'bad', currency: 'INR' })).toBe('—');
  });

  it('computes price drop percentages only when the current price is strictly lower in the same currency', () => {
    expect(
      calculatePriceDropPercent(
        { amount: '85000.00', currency: 'INR' },
        { amount: '100000.00', currency: 'INR' },
      ),
    ).toBe(15);

    expect(
      calculatePriceDropPercent(
        { amount: '100000.00', currency: 'INR' },
        { amount: '100000.00', currency: 'INR' },
      ),
    ).toBeNull();

    expect(
      calculatePriceDropPercent(
        { amount: '105000.00', currency: 'INR' },
        { amount: '100000.00', currency: 'INR' },
      ),
    ).toBeNull();

    expect(
      calculatePriceDropPercent(
        { amount: '85000.00', currency: 'INR' },
        { amount: '100000.00', currency: 'USD' },
      ),
    ).toBeNull();
  });
});
