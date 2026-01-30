import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useToast } from '../shared/Toast';
import { useBNPLStore } from '../../store';
import { useOrder, useOrderPayments, usePlatform } from '../../store/selectors';
import { formatCurrency, parseDollarInput, formatNumberInput } from '../../utils/currency';
import { formatDateInput } from '../../utils/date';
import { format, parseISO } from 'date-fns';
import { ORDER_TAG_OPTIONS, type PlatformId, type Order, type OrderType } from '../../types';

export function OrderDetailModal() {
  const { showToast } = useToast();
  const isOpen = useBNPLStore((state) => state.orderDetailModalOpen);
  const selectedOrderId = useBNPLStore((state) => state.selectedOrderId);
  const closeModal = useBNPLStore((state) => state.closeOrderDetailModal);
  const markPaymentPaid = useBNPLStore((state) => state.markPaymentPaid);
  const markPaymentUnpaid = useBNPLStore((state) => state.markPaymentUnpaid);
  const deleteOrder = useBNPLStore((state) => state.deleteOrder);
  const updateOrder = useBNPLStore((state) => state.updateOrder);
  const updatePayment = useBNPLStore((state) => state.updatePayment);
  const deletePayment = useBNPLStore((state) => state.deletePayment);
  const addPaymentToOrder = useBNPLStore((state) => state.addPaymentToOrder);
  const platforms = useBNPLStore((state) => state.platforms);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Inline editing states
  const [editingOrderInfo, setEditingOrderInfo] = useState(false);
  const [editStoreName, setEditStoreName] = useState('');
  const [editPlatformId, setEditPlatformId] = useState<PlatformId>('afterpay');
  const [editNotes, setEditNotes] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editFirstPaymentDate, setEditFirstPaymentDate] = useState('');
  const [editIntervalDays, setEditIntervalDays] = useState(0);
  const [showCustomIntervalEdit, setShowCustomIntervalEdit] = useState(false);
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editStatus, setEditStatus] = useState<Order['status']>('active');
  const [editOrderType, setEditOrderType] = useState<OrderType>('personal');

  // Arbitrage editing states
  const [editingSaleInfo, setEditingSaleInfo] = useState(false);
  const [editSaleAmount, setEditSaleAmount] = useState('');
  const [editSaleDate, setEditSaleDate] = useState('');

  // Status options for editing
  const STATUS_OPTIONS: { value: Order['status']; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
  ];

  // Frequency options for editing
  const FREQUENCY_OPTIONS = [
    { label: 'Platform Default', days: 0 },
    { label: 'Weekly', days: 7 },
    { label: 'Bi-weekly', days: 14 },
    { label: 'Monthly', days: 30 },
    { label: 'Custom', days: -1 },
  ];

  // Order type options
  const ORDER_TYPE_OPTIONS: Array<{ value: OrderType; label: string; color: string; bgColor: string }> = [
    { value: 'personal', label: 'Personal', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
    { value: 'necessity', label: 'Necessity', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.2)' },
    { value: 'arbitrage', label: 'Arbitrage', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.2)' },
  ];

  // Per-payment editing
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');

  // Adding new payment
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState('');

  const order = useOrder(selectedOrderId || '');
  const payments = useOrderPayments(selectedOrderId || '');
  const platform = usePlatform(order?.platformId || 'afterpay');

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingOrderInfo(false);
      setEditingPaymentId(null);
      setShowAddPayment(false);
      setNewPaymentAmount('');
      setNewPaymentDate('');
      setEditingSaleInfo(false);
      setEditSaleAmount('');
      setEditSaleDate('');
    }
  }, [isOpen]);

  if (!isOpen || !order || !platform) {
    return null;
  }

  const handleMarkPaid = async (paymentId: string) => {
    await markPaymentPaid(paymentId);
  };

  const handleMarkUnpaid = async (paymentId: string) => {
    await markPaymentUnpaid(paymentId);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteOrder(order.id);
      showToast('Order deleted', 'success');
      setShowDeleteConfirm(false);
      closeModal();
    } catch (error) {
      console.error('Failed to delete order:', error);
      showToast('Failed to delete order', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Order info editing
  const handleStartEditOrderInfo = () => {
    setEditStoreName(order.storeName || '');
    setEditPlatformId(order.platformId);
    setEditNotes(order.notes || '');
    setEditTotalAmount((order.totalAmount / 100).toFixed(2));
    setEditTags(order.tags || []);
    setEditFirstPaymentDate(order.firstPaymentDate);
    const currentInterval = order.intervalDays || 0;
    setEditIntervalDays(currentInterval);
    // Show custom interval if it's set and doesn't match presets
    const isPreset = [0, 7, 14, 30].includes(currentInterval);
    setShowCustomIntervalEdit(currentInterval > 0 && !isPreset);
    setEditCreatedAt(order.createdAt.split('T')[0]);
    setEditStatus(order.status);
    setEditOrderType(order.orderType || 'personal');
    setEditingOrderInfo(true);
  };

  const toggleTag = (tag: string) => {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveOrderInfo = async () => {
    try {
      const updates: Record<string, unknown> = {};
      if (editStoreName !== (order.storeName || '')) {
        updates.storeName = editStoreName || undefined;
      }
      if (editPlatformId !== order.platformId) {
        updates.platformId = editPlatformId;
      }
      if (editNotes !== (order.notes || '')) {
        updates.notes = editNotes || undefined;
      }
      // Handle tags change
      const currentTags = order.tags || [];
      const tagsChanged =
        editTags.length !== currentTags.length ||
        editTags.some((t) => !currentTags.includes(t));
      if (tagsChanged) {
        updates.tags = editTags.length > 0 ? editTags : undefined;
      }
      // Handle total amount change
      const newTotalAmount = parseDollarInput(editTotalAmount);
      if (newTotalAmount !== null && newTotalAmount > 0 && newTotalAmount !== order.totalAmount) {
        updates.totalAmount = newTotalAmount;
      }
      // Handle first payment date change
      if (editFirstPaymentDate !== order.firstPaymentDate) {
        updates.firstPaymentDate = editFirstPaymentDate;
      }
      // Handle interval days change
      const currentInterval = order.intervalDays || 0;
      const newInterval = editIntervalDays > 0 ? editIntervalDays : undefined;
      if ((newInterval || 0) !== currentInterval) {
        updates.intervalDays = newInterval;
      }
      // Handle created date change
      if (editCreatedAt !== order.createdAt.split('T')[0]) {
        updates.createdAt = editCreatedAt + 'T00:00:00.000Z';
      }
      // Handle status change
      if (editStatus !== order.status) {
        updates.status = editStatus;
      }
      // Handle order type change
      const currentOrderType = order.orderType || 'personal';
      if (editOrderType !== currentOrderType) {
        updates.orderType = editOrderType;
      }

      if (Object.keys(updates).length > 0) {
        await updateOrder(order.id, updates);
        // Build message based on what changed
        const recalculated =
          updates.totalAmount !== undefined ||
          updates.firstPaymentDate !== undefined ||
          updates.intervalDays !== undefined;
        const message = recalculated
          ? 'Order updated - payments recalculated'
          : 'Order updated';
        showToast(message, 'success');
      }
      setEditingOrderInfo(false);
    } catch (error) {
      console.error('Failed to update order:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to update order';
      showToast(errorMsg, 'error');
    }
  };

  // Arbitrage sale info editing
  const handleStartEditSaleInfo = () => {
    setEditSaleAmount(order.saleAmount ? (order.saleAmount / 100).toFixed(2) : '');
    setEditSaleDate(order.saleDate || '');
    setEditingSaleInfo(true);
  };

  const handleSaveSaleInfo = async () => {
    try {
      const updates: Record<string, unknown> = {};
      const newSaleAmount = editSaleAmount ? parseDollarInput(editSaleAmount) : null;

      // Handle sale amount change
      if (newSaleAmount !== null && newSaleAmount > 0) {
        if (newSaleAmount !== order.saleAmount) {
          updates.saleAmount = newSaleAmount;
        }
      } else if (order.saleAmount && !editSaleAmount) {
        // Clear sale amount if emptied
        updates.saleAmount = undefined;
      }

      // Handle sale date change
      if (editSaleDate !== (order.saleDate || '')) {
        updates.saleDate = editSaleDate || undefined;
      }

      if (Object.keys(updates).length > 0) {
        await updateOrder(order.id, updates);
        showToast('Sale info updated', 'success');
      }
      setEditingSaleInfo(false);
    } catch (error) {
      console.error('Failed to update sale info:', error);
      showToast('Failed to update sale info', 'error');
    }
  };

  const handleMarkAsSold = async () => {
    try {
      const today = formatDateInput(new Date());
      await updateOrder(order.id, { saleDate: today });
      showToast('Marked as sold', 'success');
    } catch (error) {
      console.error('Failed to mark as sold:', error);
      showToast('Failed to mark as sold', 'error');
    }
  };

  // Computed arbitrage metrics
  const netCash = order.saleAmount && order.totalAmount
    ? order.saleAmount - order.totalAmount
    : null;
  const costOfCapitalPercent = order.saleAmount && order.totalAmount && order.saleAmount < order.totalAmount
    ? ((order.totalAmount - order.saleAmount) / order.totalAmount) * 100
    : null;
  const isArbitrageOrder = order.orderType === 'arbitrage';
  const orderTypeInfo = ORDER_TYPE_OPTIONS.find(o => o.value === (order.orderType || 'personal'));

  // Payment editing
  const handleStartEditPayment = (paymentId: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (payment) {
      setEditPaymentAmount((payment.amount / 100).toFixed(2));
      setEditPaymentDate(formatDateInput(parseISO(payment.dueDate)));
      setEditingPaymentId(paymentId);
    }
  };

  const handleSavePayment = async () => {
    if (!editingPaymentId) return;

    const payment = payments.find((p) => p.id === editingPaymentId);
    if (!payment) return;

    try {
      const newAmount = parseDollarInput(editPaymentAmount);
      const updates: Record<string, unknown> = {};

      if (newAmount !== null && newAmount !== payment.amount) {
        updates.amount = newAmount;
      }

      const currentDate = formatDateInput(parseISO(payment.dueDate));
      if (editPaymentDate !== currentDate) {
        updates.dueDate = editPaymentDate;
        // Reset overdue status if date changed to future
        const newDate = parseISO(editPaymentDate);
        if (newDate > new Date() && payment.status === 'overdue') {
          updates.status = 'pending';
        }
      }

      if (Object.keys(updates).length > 0) {
        await updatePayment(editingPaymentId, updates);
        showToast('Payment updated', 'success');
      }
      setEditingPaymentId(null);
    } catch (error) {
      console.error('Failed to update payment:', error);
      showToast('Failed to update payment', 'error');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deletePayment(paymentId);
      showToast('Payment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete payment:', error);
      showToast('Failed to delete payment', 'error');
    }
  };

  const handleStartAddPayment = () => {
    // Default to 14 days after the last payment
    const lastPayment = payments[payments.length - 1];
    if (lastPayment) {
      const lastDate = parseISO(lastPayment.dueDate);
      const newDate = new Date(lastDate);
      newDate.setDate(newDate.getDate() + 14);
      setNewPaymentDate(formatDateInput(newDate));
      // Default amount to average of existing payments
      const avgAmount = order.totalAmount / payments.length;
      setNewPaymentAmount((avgAmount / 100).toFixed(2));
    } else {
      setNewPaymentDate(formatDateInput(new Date()));
      setNewPaymentAmount('');
    }
    setShowAddPayment(true);
  };

  const handleAddPayment = async () => {
    const amount = parseDollarInput(newPaymentAmount);
    if (amount === null || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    if (!newPaymentDate) {
      showToast('Please select a date', 'error');
      return;
    }

    try {
      await addPaymentToOrder(order.id, amount, newPaymentDate);
      showToast('Payment added', 'success');
      setShowAddPayment(false);
      setNewPaymentAmount('');
      setNewPaymentDate('');
    } catch (error) {
      console.error('Failed to add payment:', error);
      showToast('Failed to add payment', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy');
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Order Details" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          {editingOrderInfo ? (
            <div className="flex-1 space-y-3">
              {/* Platform Selector */}
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setEditPlatformId(p.id)}
                    className={`
                      flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all text-sm
                      ${
                        editPlatformId === p.id
                          ? 'border-current bg-dark-hover'
                          : 'border-dark-border hover:border-gray-600'
                      }
                    `}
                    style={{
                      color: editPlatformId === p.id ? p.color : '#9ca3af',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-medium">{p.name}</span>
                  </button>
                ))}
              </div>
              {/* Store Name */}
              <Input
                label="Store Name"
                placeholder="e.g., Amazon, Target"
                value={editStoreName}
                onChange={(e) => setEditStoreName(e.target.value)}
              />
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g., Birthday gift for mom"
                  className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {ORDER_TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        editTags.includes(tag)
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : 'bg-dark-card text-gray-400 border border-dark-border hover:border-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              {/* Order Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Order Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {ORDER_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditOrderType(opt.value)}
                      className="px-3 py-1 text-sm rounded-full transition-colors border"
                      style={{
                        backgroundColor: editOrderType === opt.value ? opt.bgColor : 'transparent',
                        borderColor: editOrderType === opt.value ? opt.color : 'var(--color-dark-border, #374151)',
                        color: editOrderType === opt.value ? opt.color : '#9ca3af',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* First Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  First Payment Date
                </label>
                <input
                  type="date"
                  value={editFirstPaymentDate}
                  onChange={(e) => setEditFirstPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Changing this will shift all payment dates
                </p>
              </div>
              {/* Payment Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Payment Frequency
                </label>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCY_OPTIONS.map((opt) => {
                    const isSelected =
                      opt.days === -1
                        ? showCustomIntervalEdit
                        : opt.days === editIntervalDays && !showCustomIntervalEdit;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          if (opt.days === -1) {
                            setShowCustomIntervalEdit(true);
                            if (editIntervalDays === 0) {
                              setEditIntervalDays(platform.defaultIntervalDays);
                            }
                          } else {
                            setShowCustomIntervalEdit(false);
                            setEditIntervalDays(opt.days);
                          }
                        }}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          isSelected
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-dark-card text-gray-400 border border-dark-border hover:border-gray-600'
                        }`}
                      >
                        {opt.label}
                        {opt.days === 0 && (
                          <span className="ml-1 opacity-70">
                            ({platform.defaultIntervalDays}d)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {showCustomIntervalEdit && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      value={editIntervalDays}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setEditIntervalDays(Math.max(1, Math.min(365, val)));
                      }}
                      className="w-20 px-3 py-1.5 bg-dark-card border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={1}
                      max={365}
                    />
                    <span className="text-sm text-gray-400">days between payments</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Changing this will recalculate all payment dates
                </p>
              </div>
              {/* Save/Cancel */}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveOrderInfo}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingOrderInfo(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: platform.color }}
                />
                <div>
                  <h3 className="text-lg font-semibold text-white">{platform.name}</h3>
                  {order.storeName && (
                    <p className="text-sm text-gray-400">{order.storeName}</p>
                  )}
                  {/* Order Type Badge */}
                  {orderTypeInfo && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1"
                      style={{
                        backgroundColor: orderTypeInfo.bgColor,
                        color: orderTypeInfo.color,
                      }}
                    >
                      {orderTypeInfo.label}
                    </span>
                  )}
                  {order.tags && order.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {order.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-dark-hover text-gray-400 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {order.notes && (
                    <p className="text-sm text-gray-400 mt-1 italic">"{order.notes}"</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleStartEditOrderInfo}
                className="p-1.5 text-gray-400 hover:text-white transition-colors rounded"
                title="Edit order info"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-dark-hover rounded-lg">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
            {editingOrderInfo ? (
              <div className="mt-1">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="text"
                    value={editTotalAmount}
                    onChange={(e) => setEditTotalAmount(formatNumberInput(e.target.value))}
                    className="w-full pl-6 pr-2 py-1 bg-dark-card border border-dark-border rounded text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Payments will be recalculated
                </p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-white mt-1">
                {formatCurrency(order.totalAmount)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Created</p>
            {editingOrderInfo ? (
              <input
                type="date"
                value={editCreatedAt}
                onChange={(e) => setEditCreatedAt(e.target.value)}
                className="mt-1 w-full px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-lg font-semibold text-white mt-1">
                {formatDate(order.createdAt)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
            {editingOrderInfo ? (
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as Order['status'])}
                className="mt-1 w-full px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'completed'
                      ? 'bg-green-500/10 text-green-400'
                      : order.status === 'cancelled'
                      ? 'bg-gray-500/10 text-gray-400'
                      : order.status === 'refunded'
                      ? 'bg-purple-500/10 text-purple-400'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Arbitrage Section - only show for arbitrage orders */}
        {isArbitrageOrder && (
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-amber-400">Arbitrage Details</h4>
              {!editingSaleInfo && (
                <button
                  onClick={handleStartEditSaleInfo}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors rounded"
                  title="Edit sale info"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>

            {editingSaleInfo ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sale Amount</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="text"
                        value={editSaleAmount}
                        onChange={(e) => setEditSaleAmount(formatNumberInput(e.target.value))}
                        className="w-full pl-6 pr-2 py-1.5 bg-dark-card border border-dark-border rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sale Date</label>
                    <input
                      type="date"
                      value={editSaleDate}
                      onChange={(e) => setEditSaleDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-dark-card border border-dark-border rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveSaleInfo}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingSaleInfo(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Sale Amount</p>
                    <p className="text-white font-medium">
                      {order.saleAmount ? formatCurrency(order.saleAmount) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Sale Date</p>
                    <p className="text-white font-medium">
                      {order.saleDate ? formatDate(order.saleDate) : '—'}
                    </p>
                  </div>
                </div>

                {/* Computed metrics */}
                {order.saleAmount && (
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-amber-500/20">
                    <div>
                      <p className="text-xs text-gray-500">Net Cash</p>
                      <p className={`font-semibold ${netCash && netCash >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {netCash !== null ? (netCash >= 0 ? '+' : '') + formatCurrency(Math.abs(netCash)) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cost of Capital</p>
                      <p className={`font-semibold ${costOfCapitalPercent !== null ? 'text-red-400' : 'text-green-400'}`}>
                        {costOfCapitalPercent !== null
                          ? `${costOfCapitalPercent.toFixed(1)}%`
                          : 'Profitable'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mark as Sold button */}
                {!order.saleDate && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleMarkAsSold}
                    className="w-full mt-2"
                  >
                    Mark as Sold
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment Schedule */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Payment Schedule</h4>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  payment.status === 'paid'
                    ? 'bg-green-500/5 border-green-500/30'
                    : payment.status === 'overdue'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-dark-hover border-dark-border'
                }`}
              >
                {editingPaymentId === payment.id ? (
                  <>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-gray-500 text-sm w-6">
                        #{payment.installmentNumber}
                      </span>
                      <input
                        type="text"
                        value={editPaymentAmount}
                        onChange={(e) => setEditPaymentAmount(formatNumberInput(e.target.value))}
                        className="w-24 px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
                        placeholder="0.00"
                      />
                      <input
                        type="date"
                        value={editPaymentDate}
                        onChange={(e) => setEditPaymentDate(e.target.value)}
                        className="flex-1 px-2 py-1 bg-dark-card border border-dark-border rounded text-white text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={handleSavePayment}
                        className="p-1 text-green-400 hover:text-green-300 transition-colors"
                        title="Save"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditingPaymentId(null)}
                        className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
                        title="Cancel"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeletePayment(payment.id)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete payment"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {payment.status === 'paid' ? (
                          <svg
                            className="w-5 h-5 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : payment.status === 'overdue' ? (
                          <svg
                            className="w-5 h-5 text-red-400"
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
                        ) : (
                          <span className="w-5 h-5 flex items-center justify-center text-gray-500 text-sm font-medium">
                            #{payment.installmentNumber}
                          </span>
                        )}
                      </div>

                      {/* Payment Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {formatCurrency(payment.amount)}
                          </span>
                          <span className="text-gray-400">
                            {payment.status === 'paid' ? 'paid' : `due ${formatDate(payment.dueDate)}`}
                          </span>
                        </div>
                        {payment.paidDate && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Paid on {formatDate(payment.paidDate)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleStartEditPayment(payment.id)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Edit payment"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>

                      {/* Mark Paid/Undo */}
                      {payment.status === 'paid' ? (
                        <button
                          onClick={() => handleMarkUnpaid(payment.id)}
                          className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                          Undo
                        </button>
                      ) : (
                        <Button
                          size="sm"
                          variant={payment.status === 'overdue' ? 'danger' : 'secondary'}
                          onClick={() => handleMarkPaid(payment.id)}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add Payment */}
          {showAddPayment ? (
            <div className="mt-3 p-3 rounded-lg border border-dashed border-dark-border bg-dark-hover/50">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      value={newPaymentAmount}
                      onChange={(e) => setNewPaymentAmount(formatNumberInput(e.target.value))}
                      className="w-full pl-6 pr-2 py-1.5 bg-dark-card border border-dark-border rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newPaymentDate}
                    onChange={(e) => setNewPaymentDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-dark-card border border-dark-border rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" onClick={handleAddPayment}>
                  Add Payment
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddPayment(false);
                    setNewPaymentAmount('');
                    setNewPaymentDate('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartAddPayment}
              className="mt-3 w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-dark-border text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Payment
            </button>
          )}
        </div>

        {/* Delete Order */}
        <div className="pt-4 border-t border-dark-border">
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete Order
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Order"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm font-medium">Warning</p>
            <p className="text-gray-300 text-sm mt-1">
              This will permanently delete this order and all its payments. This cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Order'}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
