import { useState, useMemo, useEffect, useRef } from 'react';
import { Modal } from '../shared/Modal';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { useToast } from '../shared/Toast';
import { useBNPLStore } from '../../store';
import { calculatePayments } from '../../services/paymentCalculator';
import { extractOrderFromImage } from '../../services/gemini';
import {
  formatCurrency,
  parseDollarInput,
  formatNumberInput,
} from '../../utils/currency';
import { formatDateInput, isValidDateString } from '../../utils/date';
import { parseISO, format } from 'date-fns';
import { ORDER_TAG_OPTIONS, type PlatformId, type OrderType } from '../../types';
import { AFFIRM_INSTALLMENT_OPTIONS } from '../../constants/platforms';

// Order type options for the selector
const ORDER_TYPE_OPTIONS: Array<{ value: OrderType; label: string; color: string; bgColor: string }> = [
  { value: 'personal', label: 'Personal', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
  { value: 'necessity', label: 'Necessity', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.2)' },
  { value: 'arbitrage', label: 'Arbitrage', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.2)' },
];

export function QuickAddModal() {
  const { showToast } = useToast();
  const isOpen = useBNPLStore((state) => state.quickAddModalOpen);
  const closeModal = useBNPLStore((state) => state.closeQuickAddModal);
  const addOrder = useBNPLStore((state) => state.addOrder);
  const platforms = useBNPLStore((state) => state.platforms);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const geminiApiKey = useBNPLStore((state) => state.geminiApiKey);

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

  // Payment frequency (0 means use platform default)
  const [intervalDays, setIntervalDays] = useState(0);
  const [showCustomInterval, setShowCustomInterval] = useState(false);

  // Frequency options
  const FREQUENCY_OPTIONS = [
    { label: 'Platform Default', days: 0 },
    { label: 'Weekly', days: 7 },
    { label: 'Bi-weekly', days: 14 },
    { label: 'Monthly', days: 30 },
    { label: 'Custom', days: -1 },
  ];

  // Tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Notes
  const [notes, setNotes] = useState('');

  // Order type
  const [orderType, setOrderType] = useState<OrderType>('personal');
  const [saleAmountInput, setSaleAmountInput] = useState('');

  // Manual overrides - tracks which payments have been manually edited
  const [overrides, setOverrides] = useState<
    Record<number, { amount?: number; dueDate?: string }>
  >({});

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // JSON input state
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Ref to track when JSON is being applied (prevents useEffect from clearing overrides)
  const isApplyingJsonRef = useRef(false);

  // Screenshot import state
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);

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
  const INTERVAL_ALIASES = ['interval', 'intervaldays', 'interval_days', 'frequency', 'daysbetween', 'days_between'];
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

    // YYYY/MM/DD
    const slashMatch2 = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (slashMatch2) {
      const [, y, m, d] = slashMatch2;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // "Month Day, Year" format (e.g., "Jan 23, 2026", "January 23, 2026")
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthDayYear = str.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
    if (monthDayYear) {
      const [, monthStr, day, year] = monthDayYear;
      const monthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
      if (monthIndex !== -1) {
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    // "Day Month Year" format (e.g., "23 Jan 2026")
    const dayMonthYear = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
    if (dayMonthYear) {
      const [, day, monthStr, year] = dayMonthYear;
      const monthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
      if (monthIndex !== -1) {
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
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
    intervalDays?: number;
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

    // Find intervalDays (optional)
    const rawInterval = findField(obj, INTERVAL_ALIASES);
    let intervalDays: number | undefined;
    if (rawInterval !== undefined) {
      const interval = typeof rawInterval === 'number' ? rawInterval : parseInt(String(rawInterval));
      if (!isNaN(interval) && interval > 0 && interval <= 365) {
        intervalDays = interval;
      }
    }

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
      intervalDays,
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
    const actualIntervalDays = intervalDays > 0 ? intervalDays : platform.defaultIntervalDays;
    const apr =
      platformId === 'affirm' ? parseFloat(aprInput) / 100 || 0 : undefined;

    try {
      const result = calculatePayments({
        totalAmount: amountInCents,
        firstPaymentDate: parseISO(firstPaymentDate),
        installments,
        intervalDays: actualIntervalDays,
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
    intervalDays,
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
      setIntervalDays(0);
      setShowCustomInterval(false);
      setSelectedTags([]);
      setNotes('');
      setOrderType('personal');
      setSaleAmountInput('');
      setOverrides({});
      setShowAdvanced(false);
      setShowJsonInput(false);
      setJsonInput('');
      setJsonError(null);
      setPendingPaidPayments([]);
      setIsExtracting(false);
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

      // Set interval days if provided
      if (parsed.intervalDays) {
        setIntervalDays(parsed.intervalDays);
        setShowCustomInterval(true);
      } else {
        setIntervalDays(0);
        setShowCustomInterval(false);
      }

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

  const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!geminiApiKey) {
      showToast('Please add your Gemini API key in Settings first', 'error');
      return;
    }

    setIsExtracting(true);
    try {
      const extracted = await extractOrderFromImage(file, geminiApiKey);

      // Apply extracted data directly to form fields
      // Note: Can't use setJsonInput + handleApplyJson because state updates are async
      isApplyingJsonRef.current = true;

      // Normalize platform (lowercase, remove spaces)
      const normalizedPlatform = extracted.platform.toLowerCase().replace(/\s+/g, '');
      if (VALID_PLATFORM_IDS.includes(normalizedPlatform as typeof VALID_PLATFORM_IDS[number])) {
        setPlatformId(normalizedPlatform as PlatformId);
      }

      setStoreName(extracted.store || '');
      setAmountInput(extracted.total.toFixed(2));
      setFirstPaymentDate(extracted.payments[0]?.date || format(new Date(), 'yyyy-MM-dd'));
      setCustomInstallments(extracted.payments.length);

      // Build overrides from payments
      const newOverrides: Record<number, { amount?: number; dueDate?: string }> = {};
      extracted.payments.forEach((payment, index) => {
        newOverrides[index + 1] = {
          amount: Math.round(payment.amount * 100), // Convert to cents
          dueDate: payment.date,
        };
      });
      setOverrides(newOverrides);

      // Track payments that should be marked as paid after order creation
      const paidPayments = extracted.payments
        .map((p, i) => ({ installment: i + 1, status: p.status }))
        .filter(p => p.status === 'paid')
        .map(p => ({ installment: p.installment }));
      setPendingPaidPayments(paidPayments);

      showToast('Order extracted from screenshot', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to extract order', 'error');
    } finally {
      setIsExtracting(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amountInCents || amountInCents <= 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse sale amount for arbitrage orders
      const saleAmountParsed = orderType === 'arbitrage' && saleAmountInput
        ? parseDollarInput(saleAmountInput)
        : null;
      const saleAmountCents = saleAmountParsed && saleAmountParsed > 0 ? saleAmountParsed : undefined;

      const { payments: createdPayments } = await addOrder({
        platformId,
        storeName: storeName.trim() || undefined,
        totalAmount: amountInCents,
        firstPaymentDate,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        notes: notes.trim() || undefined,
        intervalDays: intervalDays > 0 ? intervalDays : undefined,
        customInstallments: customInstallments || undefined,
        apr:
          platformId === 'affirm' && parseFloat(aprInput) > 0
            ? parseFloat(aprInput) / 100
            : undefined,
        paymentOverrides:
          Object.keys(overrides).length > 0 ? overrides : undefined,
        orderType,
        saleAmount: saleAmountCents,
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

      const platform = platforms.find(p => p.id === platformId);
      showToast(`Order added to ${platform?.name || 'platform'}`, 'success');
      closeModal();
    } catch (error) {
      console.error('Failed to add order:', error);
      showToast('Failed to add order', 'error');
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

        {/* Order Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Order Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ORDER_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setOrderType(opt.value)}
                className={`
                  flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all
                  ${
                    orderType === opt.value
                      ? 'border-current'
                      : 'border-dark-border hover:border-gray-600'
                  }
                `}
                style={{
                  color: orderType === opt.value ? opt.color : '#9ca3af',
                  backgroundColor: orderType === opt.value ? opt.bgColor : 'transparent',
                }}
              >
                <span className="font-medium">{opt.label}</span>
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

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Category (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {ORDER_TAG_OPTIONS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTags((prev) =>
                      isSelected
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-dark-hover text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Birthday gift for mom, Split with roommate"
            className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Amount */}
        <Input
          label="Total Amount"
          placeholder="0.00"
          value={amountInput}
          onChange={handleAmountChange}
          autoFocus
          error={
            amountInput && !amountInCents ? 'Enter a valid amount' : undefined
          }
        />

        {/* Expected Sale Amount (for arbitrage orders) */}
        {orderType === 'arbitrage' && (
          <Input
            label="Expected Sale Amount (optional)"
            placeholder="0.00"
            value={saleAmountInput}
            onChange={(e) => setSaleAmountInput(formatNumberInput(e.target.value))}
            helperText="What you expect to sell this item for"
          />
        )}

        {/* First Payment Date */}
        <Input
          label="First Payment Date"
          type="date"
          value={firstPaymentDate}
          onChange={(e) => setFirstPaymentDate(e.target.value)}
        />

        {/* Payment Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Payment Frequency
          </label>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_OPTIONS.map((opt) => {
              const isSelected =
                opt.days === -1
                  ? showCustomInterval
                  : opt.days === intervalDays && !showCustomInterval;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    if (opt.days === -1) {
                      setShowCustomInterval(true);
                      setIntervalDays(platform?.defaultIntervalDays || 14);
                    } else {
                      setShowCustomInterval(false);
                      setIntervalDays(opt.days);
                    }
                    setOverrides({}); // Clear overrides when frequency changes
                  }}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-dark-hover text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {opt.label}
                  {opt.days === 0 && platform && (
                    <span className="ml-1 text-xs opacity-70">
                      ({platform.defaultIntervalDays}d)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {showCustomInterval && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                value={intervalDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setIntervalDays(Math.max(1, Math.min(365, val)));
                  setOverrides({});
                }}
                className="w-20 px-3 py-1.5 bg-dark-card border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={1}
                max={365}
              />
              <span className="text-sm text-gray-400">days between payments</span>
            </div>
          )}
        </div>

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

        {/* Hidden file input for screenshot import */}
        <input
          ref={screenshotInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleScreenshotSelect}
        />

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Options
          <span className="text-xs text-gray-500">(import, edit payments)</span>
        </button>

        {/* Advanced Options Content */}
        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2 border-dark-border">
            {/* Import Options */}
            {!showJsonInput && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowJsonInput(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-dark-hover text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Paste JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!geminiApiKey) {
                      showToast('Please add your Gemini API key in Settings first', 'error');
                      return;
                    }
                    screenshotInputRef.current?.click();
                  }}
                  disabled={isExtracting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-dark-hover text-gray-300 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {isExtracting ? 'Extracting...' : 'Import Screenshot'}
                </button>
              </div>
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
