import { addDays } from 'date-fns';
import type { CalculatedPayment } from '../types';

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
