import { addDays, format, parseISO, differenceInDays } from 'date-fns';
import type { CalculatedPayment, Payment } from '../types';

interface PaymentCalculationInput {
  totalAmount: number; // in cents
  firstPaymentDate: Date;
  installments: number;
  intervalDays: number;
  apr?: number; // Annual Percentage Rate as decimal (e.g., 0.15 = 15%)
}

interface PaymentCalculationResult {
  payments: CalculatedPayment[];
  totalAmount: number; // Total amount including any interest
  totalInterest: number; // Interest charged (0 if no APR)
}

/**
 * Calculate payment schedule for a BNPL order
 *
 * For standard BNPL (no APR):
 * - Splits total evenly across installments
 * - First payment gets any remainder cents
 *
 * For Affirm with APR:
 * - Uses simple interest calculation spread across payments
 * - Each payment is principal + proportional interest
 */
export function calculatePayments(input: PaymentCalculationInput): PaymentCalculationResult {
  const { totalAmount, firstPaymentDate, installments, intervalDays, apr } = input;

  if (installments < 1) {
    throw new Error('Must have at least 1 installment');
  }

  if (totalAmount < 0) {
    throw new Error('Amount cannot be negative');
  }

  // Calculate total duration in years for interest calculation
  const totalDays = (installments - 1) * intervalDays;
  const durationYears = totalDays / 365;

  // Calculate total interest if APR is provided
  let totalInterest = 0;
  if (apr && apr > 0) {
    // Simple interest: I = P * r * t
    totalInterest = Math.round(totalAmount * apr * durationYears);
  }

  const totalWithInterest = totalAmount + totalInterest;

  // Calculate base payment amount (integer division)
  const basePayment = Math.floor(totalWithInterest / installments);

  // Calculate remainder to add to first payment
  const remainder = totalWithInterest - basePayment * installments;

  const payments: CalculatedPayment[] = [];

  for (let i = 0; i < installments; i++) {
    const dueDate = addDays(firstPaymentDate, i * intervalDays);

    // First payment gets the remainder (common BNPL practice)
    const amount = i === 0 ? basePayment + remainder : basePayment;

    payments.push({
      installmentNumber: i + 1,
      amount,
      dueDate,
    });
  }

  return {
    payments,
    totalAmount: totalWithInterest,
    totalInterest,
  };
}

/**
 * Recalculate payments with manual overrides
 *
 * Allows user to override specific payment amounts while
 * warning if the total doesn't match
 */
export function applyPaymentOverrides(
  calculatedPayments: CalculatedPayment[],
  overrides: Record<number, { amount?: number; dueDate?: Date }>
): {
  payments: CalculatedPayment[];
  totalAmount: number;
  hasOverrides: boolean;
} {
  const payments = calculatedPayments.map((payment) => {
    const override = overrides[payment.installmentNumber];
    if (override) {
      return {
        ...payment,
        amount: override.amount ?? payment.amount,
        dueDate: override.dueDate ?? payment.dueDate,
      };
    }
    return payment;
  });

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const hasOverrides = Object.keys(overrides).length > 0;

  return {
    payments,
    totalAmount,
    hasOverrides,
  };
}

/**
 * Calculate monthly payment for Affirm with APR
 * Using standard amortization formula
 */
export function calculateAmortizedPayment(
  principal: number, // in cents
  apr: number, // as decimal
  installments: number,
  intervalDays: number
): number {
  if (apr === 0) {
    return Math.round(principal / installments);
  }

  // Convert APR to periodic rate
  const periodsPerYear = 365 / intervalDays;
  const periodicRate = apr / periodsPerYear;

  // Amortization formula: P * [r(1+r)^n] / [(1+r)^n - 1]
  const numerator = periodicRate * Math.pow(1 + periodicRate, installments);
  const denominator = Math.pow(1 + periodicRate, installments) - 1;

  const payment = principal * (numerator / denominator);

  return Math.round(payment);
}

/**
 * Estimate total interest for a loan
 */
export function estimateInterest(
  principal: number, // in cents
  apr: number, // as decimal
  installments: number,
  intervalDays: number
): number {
  if (apr === 0) return 0;

  const monthlyPayment = calculateAmortizedPayment(principal, apr, installments, intervalDays);
  const totalPayments = monthlyPayment * installments;
  return totalPayments - principal;
}

/**
 * Shift all payment due dates by a delta (in days)
 * Used when the first payment date changes
 */
export function shiftPaymentDates(
  payments: Payment[],
  deltaDays: number
): Payment[] {
  if (deltaDays === 0) return payments;

  return payments.map((p) => ({
    ...p,
    dueDate: format(addDays(parseISO(p.dueDate), deltaDays), 'yyyy-MM-dd'),
  }));
}

/**
 * Recalculate payment dates based on new interval
 * Keeps first payment date as anchor, recalculates subsequent dates
 */
export function recalculatePaymentDates(
  payments: Payment[],
  firstPaymentDate: string,
  intervalDays: number
): Payment[] {
  const sorted = [...payments].sort((a, b) => a.installmentNumber - b.installmentNumber);
  const baseDate = parseISO(firstPaymentDate);

  return sorted.map((p, index) => ({
    ...p,
    dueDate: format(addDays(baseDate, index * intervalDays), 'yyyy-MM-dd'),
  }));
}

/**
 * Redistribute total amount across payments, respecting manual overrides
 *
 * - Payments with isManualOverride=true keep their amounts
 * - Remaining amount is distributed evenly across non-manual payments
 * - First non-manual payment gets any remainder cents
 */
export function redistributePaymentAmounts(
  payments: Payment[],
  newTotal: number
): { payments: Payment[]; error?: string } {
  const manualPayments = payments.filter((p) => p.isManualOverride);
  const autoPayments = payments.filter((p) => !p.isManualOverride);

  const manualTotal = manualPayments.reduce((sum, p) => sum + p.amount, 0);

  // Check if manual payments exceed new total
  if (manualTotal > newTotal) {
    return {
      payments,
      error: 'Manual override payments exceed new total amount',
    };
  }

  // If all payments are manual and don't match total, error
  if (autoPayments.length === 0 && manualTotal !== newTotal) {
    return {
      payments,
      error: 'All payments have manual overrides - cannot redistribute',
    };
  }

  // If all payments are manual and match total, no changes needed
  if (autoPayments.length === 0) {
    return { payments };
  }

  // Calculate amount to distribute to auto payments
  const remaining = newTotal - manualTotal;
  const baseAmount = Math.floor(remaining / autoPayments.length);
  const remainder = remaining - baseAmount * autoPayments.length;

  // Sort auto payments by installment number for consistent remainder assignment
  const sortedAuto = [...autoPayments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );

  return {
    payments: payments.map((p) => {
      if (p.isManualOverride) return p;

      const autoIndex = sortedAuto.findIndex((ap) => ap.id === p.id);
      // First auto payment gets remainder
      const amount = autoIndex === 0 ? baseAmount + remainder : baseAmount;

      return { ...p, amount };
    }),
  };
}

/**
 * Calculate the difference in days between two date strings
 */
export function getDateDelta(oldDate: string, newDate: string): number {
  return differenceInDays(parseISO(newDate), parseISO(oldDate));
}
