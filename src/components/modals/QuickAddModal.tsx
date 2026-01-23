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

  // Custom installments (0 means use platform default)
  const [customInstallments, setCustomInstallments] = useState(0);
  const [aprInput, setAprInput] = useState('0');

  // Manual overrides - tracks which payments have been manually edited
  const [overrides, setOverrides] = useState<
    Record<number, { amount?: number; dueDate?: string }>
  >({});

  // JSON input state
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Valid platform IDs for JSON validation
  const VALID_PLATFORM_IDS = ['afterpay', 'sezzle', 'klarna', 'zip', 'four', 'affirm'] as const;

  // Parse and validate order JSON
  const parseOrderJson = (jsonString: string): {
    platform: PlatformId;
    store?: string;
    total: number;
    payments: Array<{ amount: number; date: string }>;
  } => {
    let data: unknown;
    try {
      data = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON format');
    }

    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid JSON format');
    }

    const obj = data as Record<string, unknown>;

    // Validate platform
    if (!obj.platform) {
      throw new Error('Missing required field: platform');
    }
    if (!VALID_PLATFORM_IDS.includes(obj.platform as typeof VALID_PLATFORM_IDS[number])) {
      throw new Error('Invalid platform. Must be one of: afterpay, sezzle, klarna, zip, four, affirm');
    }

    // Validate total
    if (obj.total === undefined || obj.total === null) {
      throw new Error('Missing required field: total');
    }
    if (typeof obj.total !== 'number' || obj.total <= 0) {
      throw new Error('Total must be a positive number');
    }

    // Validate payments
    if (!obj.payments) {
      throw new Error('Missing required field: payments');
    }
    if (!Array.isArray(obj.payments) || obj.payments.length === 0) {
      throw new Error('Payments array must have at least one payment');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const payments = obj.payments.map((payment: unknown, index: number) => {
      const paymentNum = index + 1;
      if (typeof payment !== 'object' || payment === null) {
        throw new Error(`Payment #${paymentNum} is invalid`);
      }
      const p = payment as Record<string, unknown>;

      if (p.amount === undefined || p.amount === null) {
        throw new Error(`Payment #${paymentNum} is missing required field: amount`);
      }
      if (typeof p.amount !== 'number' || p.amount <= 0) {
        throw new Error(`Payment #${paymentNum} amount must be a positive number`);
      }

      if (!p.date) {
        throw new Error(`Payment #${paymentNum} is missing required field: date`);
      }
      if (typeof p.date !== 'string' || !dateRegex.test(p.date)) {
        throw new Error(`Invalid date format for payment #${paymentNum}. Use YYYY-MM-DD`);
      }

      return { amount: p.amount, date: p.date };
    });

    return {
      platform: obj.platform as PlatformId,
      store: typeof obj.store === 'string' ? obj.store : undefined,
      total: obj.total,
      payments,
    };
  };

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

    const installments = customInstallments || platform.defaultInstallments;
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

  // Check for total mismatch - show warning when payments don't sum to total
  const paymentsTotal = displayPayments.reduce((sum, p) => sum + p.amount, 0);
  const hasMismatch =
    displayPayments.length > 0 &&
    amountInCents &&
    paymentsTotal !== amountInCents;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPlatformId('afterpay');
      setStoreName('');
      setAmountInput('');
      setFirstPaymentDate(formatDateInput(new Date()));
      setCustomInstallments(0);
      setAprInput('0');
      setOverrides({});
      setShowJsonInput(false);
      setJsonInput('');
      setJsonError(null);
    }
  }, [isOpen]);

  // Clear overrides when platform changes
  useEffect(() => {
    setOverrides({});
    setCustomInstallments(0);
  }, [platformId]);

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

  const handleApplyJson = () => {
    try {
      const parsed = parseOrderJson(jsonInput);

      // Set form fields
      setPlatformId(parsed.platform);
      setStoreName(parsed.store || '');
      setAmountInput(parsed.total.toFixed(2));
      setFirstPaymentDate(parsed.payments[0].date);
      setCustomInstallments(parsed.payments.length);

      // Build overrides from payments
      const newOverrides: Record<number, { amount?: number; dueDate?: string }> = {};
      parsed.payments.forEach((payment, index) => {
        newOverrides[index + 1] = {
          amount: Math.round(payment.amount * 100), // Convert to cents
          dueDate: payment.date,
        };
      });
      setOverrides(newOverrides);

      // Clear JSON state and return to form view
      setJsonInput('');
      setJsonError(null);
      setShowJsonInput(false);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
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
        customInstallments: customInstallments || undefined,
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
                value={customInstallments || platform?.defaultInstallments || 4}
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

        {/* Paste JSON Link */}
        {!showJsonInput && (
          <button
            type="button"
            onClick={() => setShowJsonInput(true)}
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Paste JSON
          </button>
        )}

        {/* JSON Input Section */}
        {showJsonInput && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Paste Order JSON
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowJsonInput(false);
                  setJsonInput('');
                  setJsonError(null);
                }}
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{"platform": "klarna", "total": 85.00, "payments": [...]}'
              className="w-full h-32 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {jsonError && (
              <p className="text-sm text-red-400">{jsonError}</p>
            )}
            <Button
              type="button"
              onClick={handleApplyJson}
              disabled={!jsonInput.trim()}
            >
              Apply JSON
            </Button>
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
                Payments sum to {formatCurrency(paymentsTotal)} but total is{' '}
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
