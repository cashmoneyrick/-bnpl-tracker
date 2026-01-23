import { useState, useMemo, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { useBNPLStore } from '../../store';
import { calculatePayments } from '../../services/paymentCalculator';
import {
  formatCurrency,
  parseDollarInput,
  formatNumberInput,
} from '../../utils/currency';
import { formatDateInput, isValidDateString } from '../../utils/date';
import { parseISO } from 'date-fns';
import type { PlatformId } from '../../types';
import { AFFIRM_INSTALLMENT_OPTIONS } from '../../constants/platforms';

export function QuickAddModal() {
  const isOpen = useBNPLStore((state) => state.quickAddModalOpen);
  const closeModal = useBNPLStore((state) => state.closeQuickAddModal);
  const addOrder = useBNPLStore((state) => state.addOrder);
  const platforms = useBNPLStore((state) => state.platforms);

  // Form state
  const [platformId, setPlatformId] = useState<PlatformId>('afterpay');
  const [storeName, setStoreName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [firstPaymentDate, setFirstPaymentDate] = useState(
    formatDateInput(new Date())
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Affirm-specific state
  const [customInstallments, setCustomInstallments] = useState(4);
  const [aprInput, setAprInput] = useState('0');

  // Manual overrides - tracks which payments have been manually edited
  const [overrides, setOverrides] = useState<
    Record<number, { amount?: number; dueDate?: string }>
  >({});

  // Get platform
  const platform = platforms.find((p) => p.id === platformId);

  // Parse amount
  const amountInCents = useMemo(() => {
    return parseDollarInput(amountInput);
  }, [amountInput]);

  // Calculate payments
  const calculatedPayments = useMemo(() => {
    // Validate inputs before calculating
    if (!amountInCents || amountInCents <= 0 || !platform) {
      return [];
    }

    // Validate date string before parsing
    if (!isValidDateString(firstPaymentDate)) {
      return [];
    }

    const installments =
      platformId === 'affirm' ? customInstallments : platform.defaultInstallments;
    const apr =
      platformId === 'affirm' ? parseFloat(aprInput) / 100 || 0 : undefined;

    try {
      const result = calculatePayments({
        totalAmount: amountInCents,
        firstPaymentDate: parseISO(firstPaymentDate),
        installments,
        intervalDays: platform.defaultIntervalDays,
        apr,
      });
      return result.payments;
    } catch {
      return [];
    }
  }, [
    amountInCents,
    firstPaymentDate,
    platform,
    platformId,
    customInstallments,
    aprInput,
  ]);

  // Apply overrides to payments and recalculate non-overridden amounts
  const displayPayments = useMemo(() => {
    if (calculatedPayments.length === 0 || !amountInCents) {
      return [];
    }

    // Find which payments have manually overridden amounts
    const overriddenInstallments = Object.entries(overrides)
      .filter(([, override]) => override.amount !== undefined)
      .map(([installment]) => Number(installment));

    // Sum of manually overridden amounts
    const overriddenTotal = overriddenInstallments.reduce(
      (sum, installment) => sum + (overrides[installment]?.amount || 0),
      0
    );

    // Find non-overridden payments
    const nonOverriddenPayments = calculatedPayments.filter(
      (p) => !overriddenInstallments.includes(p.installmentNumber)
    );

    // Calculate remaining amount to distribute among non-overridden payments
    const remainingAmount = amountInCents - overriddenTotal;
    const nonOverriddenCount = nonOverriddenPayments.length;

    // Distribute remaining amount evenly (with remainder going to first non-overridden)
    let distributedAmounts: Record<number, number> = {};
    if (nonOverriddenCount > 0 && remainingAmount > 0) {
      const baseAmount = Math.floor(remainingAmount / nonOverriddenCount);
      const remainder = remainingAmount % nonOverriddenCount;

      nonOverriddenPayments.forEach((p, index) => {
        distributedAmounts[p.installmentNumber] = baseAmount + (index === 0 ? remainder : 0);
      });
    }

    return calculatedPayments.map((payment) => {
      const override = overrides[payment.installmentNumber];
      const hasAmountOverride = override?.amount !== undefined;

      // Use override amount if manually set, otherwise use recalculated amount
      const amount = hasAmountOverride
        ? override.amount!
        : (distributedAmounts[payment.installmentNumber] ?? payment.amount);

      // Only parse override date if it's valid, otherwise keep original
      const overrideDueDate = override?.dueDate && isValidDateString(override.dueDate)
        ? parseISO(override.dueDate)
        : payment.dueDate;

      return {
        ...payment,
        amount,
        dueDate: overrideDueDate,
        isOverridden: hasAmountOverride,
      };
    });
  }, [calculatedPayments, overrides, amountInCents]);

  // Check for total mismatch - only show warning if ALL payments are overridden
  const allPaymentsOverridden = calculatedPayments.length > 0 &&
    calculatedPayments.every((p) => overrides[p.installmentNumber]?.amount !== undefined);
  const totalOverride = displayPayments.reduce((sum, p) => sum + p.amount, 0);
  const hasMismatch =
    allPaymentsOverridden &&
    amountInCents &&
    totalOverride !== amountInCents;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPlatformId('afterpay');
      setStoreName('');
      setAmountInput('');
      setFirstPaymentDate(formatDateInput(new Date()));
      setCustomInstallments(4);
      setAprInput('0');
      setOverrides({});
    }
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberInput(e.target.value);
    setAmountInput(formatted);
    // Clear overrides when amount changes
    setOverrides({});
  };

  const handleOverrideAmount = (installment: number, value: string) => {
    const amount = parseDollarInput(value);
    if (amount !== null) {
      setOverrides((prev) => ({
        ...prev,
        [installment]: { ...prev[installment], amount },
      }));
    }
  };

  const handleOverrideDate = (installment: number, value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [installment]: { ...prev[installment], dueDate: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amountInCents || amountInCents <= 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await addOrder({
        platformId,
        storeName: storeName.trim() || undefined,
        totalAmount: amountInCents,
        firstPaymentDate,
        customInstallments: platformId === 'affirm' ? customInstallments : undefined,
        apr:
          platformId === 'affirm' && parseFloat(aprInput) > 0
            ? parseFloat(aprInput) / 100
            : undefined,
        paymentOverrides:
          Object.keys(overrides).length > 0 ? overrides : undefined,
      });

      closeModal();
    } catch (error) {
      console.error('Failed to add order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Add Order" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Platform Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Platform
          </label>
          <div className="grid grid-cols-3 gap-2">
            {platforms.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatformId(p.id)}
                className={`
                  flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all
                  ${
                    platformId === p.id
                      ? 'border-current bg-dark-hover'
                      : 'border-dark-border hover:border-gray-600'
                  }
                `}
                style={{
                  color: platformId === p.id ? p.color : '#9ca3af',
                }}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-medium">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Store Name */}
        <Input
          label="Store Name (optional)"
          placeholder="e.g., Amazon, Target"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />

        {/* Amount */}
        <Input
          label="Total Amount"
          placeholder="0.00"
          value={amountInput}
          onChange={handleAmountChange}
          error={
            amountInput && !amountInCents ? 'Enter a valid amount' : undefined
          }
        />

        {/* First Payment Date */}
        <Input
          label="First Payment Date"
          type="date"
          value={firstPaymentDate}
          onChange={(e) => setFirstPaymentDate(e.target.value)}
        />

        {/* Affirm-specific fields */}
        {platformId === 'affirm' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Installments
              </label>
              <select
                value={customInstallments}
                onChange={(e) => setCustomInstallments(Number(e.target.value))}
                className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {AFFIRM_INSTALLMENT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} payments
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="APR %"
              placeholder="0"
              value={aprInput}
              onChange={(e) => setAprInput(e.target.value)}
              helperText="Enter 0 for 0% APR"
            />
          </div>
        )}

        {/* Payment Preview */}
        {displayPayments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Payment Schedule
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {displayPayments.map((payment) => (
                <div
                  key={payment.installmentNumber}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border
                    ${
                      payment.isOverridden
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-dark-hover border-dark-border'
                    }
                  `}
                >
                  <span className="text-gray-400 text-sm w-6">
                    #{payment.installmentNumber}
                  </span>
                  <input
                    type="text"
                    value={
                      payment.isOverridden
                        ? (payment.amount / 100).toFixed(2)
                        : (payment.amount / 100).toFixed(2)
                    }
                    onChange={(e) =>
                      handleOverrideAmount(payment.installmentNumber, e.target.value)
                    }
                    className="w-24 px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
                  />
                  <input
                    type="date"
                    value={formatDateInput(payment.dueDate)}
                    onChange={(e) =>
                      handleOverrideDate(payment.installmentNumber, e.target.value)
                    }
                    className="flex-1 px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
                  />
                </div>
              ))}
            </div>
            {hasMismatch && (
              <p className="mt-2 text-sm text-amber-400 flex items-center gap-1.5">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Payments total {formatCurrency(totalOverride)} but order is{' '}
                {formatCurrency(amountInCents || 0)}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-dark-border">
          <Button type="button" variant="secondary" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!amountInCents || amountInCents <= 0 || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Order'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
