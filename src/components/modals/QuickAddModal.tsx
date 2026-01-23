import { useState, useMemo, useEffect, useRef } from 'react';
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
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);

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

  // Ref to track when JSON is being applied (prevents useEffect from clearing overrides)
  const isApplyingJsonRef = useRef(false);

  // Track payments to mark as paid after order creation (from JSON import)
  const [pendingPaidPayments, setPendingPaidPayments] = useState<
    Array<{ installment: number; paidDate?: string }>
  >([]);

  // Valid platform IDs for JSON validation
  const VALID_PLATFORM_IDS = ['afterpay', 'sezzle', 'klarna', 'zip', 'four', 'affirm'] as const;

  // Field aliases for flexible JSON parsing
  const PLATFORM_ALIASES = ['platform', 'provider', 'app', 'bnpl', 'service'];
  const STORE_ALIASES = ['store', 'merchant', 'retailer', 'vendor', 'shop', 'seller'];
  const TOTAL_ALIASES = ['total', 'totalamount', 'total_amount', 'amount', 'ordertotal', 'order_total', 'price'];
  const PAYMENT_AMOUNT_ALIASES = ['amount', 'payment', 'due', 'price'];
  const PAYMENT_DATE_ALIASES = ['date', 'duedate', 'due_date'];
  const PAYMENT_STATUS_ALIASES = ['status', 'state'];
  const PAYMENT_PAIDDATE_ALIASES = ['paiddate', 'paid_date', 'paidDate'];

  // Find field value using multiple possible key names (case-insensitive)
  const findField = (obj: Record<string, unknown>, aliases: string[]): unknown => {
    const lowerKeys = Object.keys(obj).reduce((acc, key) => {
      acc[key.toLowerCase()] = key;
      return acc;
    }, {} as Record<string, string>);

    for (const alias of aliases) {
      const originalKey = lowerKeys[alias.toLowerCase()];
      if (originalKey && obj[originalKey] !== undefined) {
        return obj[originalKey];
      }
    }
    return undefined;
  };

  // Normalize amount: "$1,234.56" → 1234.56
  const normalizeAmount = (value: unknown): number | null => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[$,]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Normalize date to YYYY-MM-DD
  const normalizeDate = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const str = value.trim();

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // MM/DD/YYYY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [, m, d, y] = slashMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Try parsing with Date (handles "Jan 23, 2026", "23 Jan 2026", etc.)
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return null;
  };

  // Normalize platform name: "After Pay" → "afterpay"
  const normalizePlatform = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    return value.toLowerCase().replace(/\s+/g, '');
  };

  // Normalize status: various values → 'paid' | 'pending'
  const normalizeStatus = (value: unknown): 'paid' | 'pending' => {
    if (typeof value !== 'string') return 'pending';
    const str = value.toLowerCase().trim();

    // Values that mean "paid"
    if (['paid', 'complete', 'completed'].includes(str)) {
      return 'paid';
    }

    // Everything else (including 'pending', 'upcoming', 'scheduled', 'due', or unrecognized) → pending
    return 'pending';
  };

  // Find payments array (may be nested)
  const findPaymentsArray = (obj: Record<string, unknown>): unknown[] | null => {
    const paymentAliases = ['payments', 'paymentplan', 'payment_plan', 'schedule', 'installments', 'instalments'];

    // Check root level
    const rootPayments = findField(obj, paymentAliases);
    if (Array.isArray(rootPayments)) return rootPayments;

    // Check one level deep (data.payments, order.payments, etc.)
    for (const key of Object.keys(obj)) {
      const nested = obj[key];
      if (typeof nested === 'object' && nested !== null && !Array.isArray(nested)) {
        const nestedPayments = findField(nested as Record<string, unknown>, paymentAliases);
        if (Array.isArray(nestedPayments)) return nestedPayments;
      }
    }

    return null;
  };

  // Parse and validate order JSON (flexible with field names and formats)
  const parseOrderJson = (jsonString: string): {
    platform: PlatformId;
    store?: string;
    total: number;
    payments: Array<{ amount: number; date: string; status: 'paid' | 'pending'; paidDate?: string }>;
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

    // Find and validate platform
    const rawPlatform = findField(obj, PLATFORM_ALIASES);
    if (!rawPlatform) {
      throw new Error('Missing required field: platform');
    }
    const normalizedPlatform = normalizePlatform(rawPlatform);
    if (!normalizedPlatform || !VALID_PLATFORM_IDS.includes(normalizedPlatform as typeof VALID_PLATFORM_IDS[number])) {
      throw new Error('Invalid platform. Must be one of: afterpay, sezzle, klarna, zip, four, affirm');
    }

    // Find and validate total
    const rawTotal = findField(obj, TOTAL_ALIASES);
    if (rawTotal === undefined) {
      throw new Error('Missing required field: total');
    }
    const total = normalizeAmount(rawTotal);
    if (total === null || total <= 0) {
      throw new Error('Total must be a positive number');
    }

    // Find store (optional)
    const rawStore = findField(obj, STORE_ALIASES);
    const store = typeof rawStore === 'string' ? rawStore : undefined;

    // Find and validate payments array
    const paymentsArray = findPaymentsArray(obj);
    if (!paymentsArray || paymentsArray.length === 0) {
      throw new Error('Missing required field: payments');
    }

    // Parse each payment
    const payments = paymentsArray.map((payment: unknown, index: number) => {
      const paymentNum = index + 1;
      if (typeof payment !== 'object' || payment === null) {
        throw new Error(`Payment #${paymentNum} is invalid`);
      }
      const p = payment as Record<string, unknown>;

      // Amount
      const rawAmount = findField(p, PAYMENT_AMOUNT_ALIASES);
      if (rawAmount === undefined) {
        throw new Error(`Payment #${paymentNum} is missing required field: amount`);
      }
      const amount = normalizeAmount(rawAmount);
      if (amount === null || amount <= 0) {
        throw new Error(`Payment #${paymentNum} amount must be a positive number`);
      }

      // Date
      const rawDate = findField(p, PAYMENT_DATE_ALIASES);
      if (!rawDate) {
        throw new Error(`Payment #${paymentNum} is missing required field: date`);
      }
      const date = normalizeDate(rawDate);
      if (!date) {
        throw new Error(`Invalid date format for payment #${paymentNum}`);
      }

      // Status (optional) - normalize various values to 'paid' or 'pending'
      const rawStatus = findField(p, PAYMENT_STATUS_ALIASES);
      const status = normalizeStatus(rawStatus);

      // PaidDate (optional)
      let paidDate: string | undefined;
      const rawPaidDate = findField(p, PAYMENT_PAIDDATE_ALIASES);
      if (rawPaidDate !== undefined) {
        paidDate = normalizeDate(rawPaidDate) ?? undefined;
        if (rawPaidDate && !paidDate) {
          throw new Error(`Invalid paidDate format for payment #${paymentNum}`);
        }
      }

      return { amount, date, status, paidDate };
    });

    return {
      platform: normalizedPlatform as PlatformId,
      store,
      total,
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
      setPendingPaidPayments([]);
    }
  }, [isOpen]);

  // Clear overrides when platform changes (but not when applying JSON)
  useEffect(() => {
    if (isApplyingJsonRef.current) {
      isApplyingJsonRef.current = false;
      return;
    }
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

      // Mark that we're applying JSON to prevent useEffect from clearing overrides
      isApplyingJsonRef.current = true;

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

      // Track payments that should be marked as paid after order creation
      const paidPayments = parsed.payments
        .map((p, i) => ({ installment: i + 1, status: p.status, paidDate: p.paidDate }))
        .filter(p => p.status === 'paid')
        .map(p => ({ installment: p.installment, paidDate: p.paidDate }));
      setPendingPaidPayments(paidPayments);

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
      const { order, payments: createdPayments } = await addOrder({
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

      // Mark payments as paid based on JSON import statuses
      if (pendingPaidPayments.length > 0) {
        for (const pending of pendingPaidPayments) {
          const payment = createdPayments.find(
            p => p.installmentNumber === pending.installment
          );
          if (payment) {
            await markPaymentPaid(payment.id, pending.paidDate);
          }
        }
        setPendingPaidPayments([]);
      }

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
