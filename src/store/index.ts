import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Order,
  Payment,
  Platform,
  Subscription,
  NewOrderInput,
  PlatformId,
  ExportedData,
  NotificationSettings,
} from '../types';
import { storage } from '../services/storage';
import {
  calculatePayments,
  shiftPaymentDates,
  recalculatePaymentDates,
  redistributePaymentAmounts,
  getDateDelta,
} from '../services/paymentCalculator';
import { parseISO, isBefore, startOfDay } from 'date-fns';

interface BNPLStore {
  // State
  orders: Order[];
  payments: Payment[];
  platforms: Platform[];
  subscriptions: Subscription[];
  notificationSettings: NotificationSettings;
  geminiApiKey: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  isInitializing: boolean; // Lock to prevent race conditions

  // UI State
  quickAddModalOpen: boolean;
  orderDetailModalOpen: boolean;
  selectedOrderId: string | null;
  sidebarCollapsed: boolean;

  // Actions
  initialize: () => Promise<void>;
  addOrder: (input: NewOrderInput) => Promise<{ order: Order; payments: Payment[] }>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  markPaymentPaid: (paymentId: string, customPaidDate?: string) => Promise<void>;
  markPaymentUnpaid: (paymentId: string) => Promise<void>;
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;
  addPaymentToOrder: (orderId: string, amount: number, dueDate: string) => Promise<Payment>;
  updatePlatformLimit: (platformId: PlatformId, limit: number) => Promise<void>;
  updatePlatformSchedule: (
    platformId: PlatformId,
    installments: number,
    intervalDays: number
  ) => Promise<void>;
  updateSubscription: (subscription: Subscription) => Promise<void>;
  updateOverduePayments: () => Promise<void>;
  updateNotificationSettings: (settings: NotificationSettings) => void;
  setGeminiApiKey: (key: string | null) => void;

  // UI Actions
  openQuickAddModal: () => void;
  closeQuickAddModal: () => void;
  openOrderDetailModal: (orderId: string) => void;
  closeOrderDetailModal: () => void;
  toggleSidebar: () => void;

  // Data Operations
  exportData: () => Promise<ExportedData>;
  importData: (data: ExportedData) => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useBNPLStore = create<BNPLStore>((set, get) => ({
  // Initial state
  orders: [],
  payments: [],
  platforms: [],
  subscriptions: [],
  notificationSettings: {
    enabled: false,
    daysBefore: 1,
    notifyOnDueDate: true,
    notifyOverdue: true,
  },
  geminiApiKey: null,
  isLoading: false,
  isInitialized: false,
  isInitializing: false,

  // UI State
  quickAddModalOpen: false,
  orderDetailModalOpen: false,
  selectedOrderId: null,
  sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',

  // Initialize store from IndexedDB
  initialize: async () => {
    // Prevent race conditions - check both flags synchronously
    const { isInitialized, isInitializing } = get();
    if (isInitialized || isInitializing) return;

    // Set lock immediately (synchronous) before any async work
    set({ isLoading: true, isInitializing: true });

    try {
      await storage.init();

      const [orders, payments, platforms, subscriptions] = await Promise.all([
        storage.getAllOrders(),
        storage.getAllPayments(),
        storage.getAllPlatforms(),
        storage.getAllSubscriptions(),
      ]);

      console.log('[Store] Initialized with:', {
        orders: orders.length,
        payments: payments.length,
        platforms: platforms.length,
        subscriptions: subscriptions.length,
      });

      const notificationSettings = storage.getNotificationSettings();
      const geminiApiKey = storage.getGeminiApiKey();

      set({
        orders,
        payments,
        platforms,
        subscriptions,
        notificationSettings,
        geminiApiKey,
        isLoading: false,
        isInitialized: true,
        isInitializing: false,
      });

      // Update overdue statuses
      await get().updateOverduePayments();
    } catch (error) {
      console.error('Failed to initialize store:', error);
      set({ isLoading: false, isInitializing: false });
    }
  },

  // Add a new order with calculated payments
  addOrder: async (input: NewOrderInput) => {
    const { platforms } = get();
    const platform = platforms.find((p) => p.id === input.platformId);

    if (!platform) {
      throw new Error(`Platform not found: ${input.platformId}`);
    }

    // Determine installments and interval (per-order override or platform default)
    const installments =
      input.customInstallments ?? platform.defaultInstallments;
    const intervalDays = input.intervalDays ?? platform.defaultIntervalDays;

    // Calculate payments
    const { payments: calculatedPayments } = calculatePayments({
      totalAmount: input.totalAmount,
      firstPaymentDate: parseISO(input.firstPaymentDate),
      installments,
      intervalDays,
      apr: input.apr,
    });

    // Create order
    const order: Order = {
      id: uuidv4(),
      platformId: input.platformId,
      storeName: input.storeName,
      totalAmount: input.totalAmount,
      firstPaymentDate: input.firstPaymentDate,
      status: 'active',
      createdAt: new Date().toISOString(),
      tags: input.tags,
      notes: input.notes,
      intervalDays: input.intervalDays, // Store per-order interval if provided
      customInstallments: input.customInstallments,
      apr: input.apr,
    };

    // Create payment records
    const paymentRecords: Payment[] = calculatedPayments.map((cp) => {
      const override = input.paymentOverrides?.[cp.installmentNumber];

      return {
        id: uuidv4(),
        orderId: order.id,
        platformId: input.platformId,
        amount: override?.amount ?? cp.amount,
        dueDate: override?.dueDate ?? cp.dueDate.toISOString(),
        installmentNumber: cp.installmentNumber,
        status: 'pending' as const,
        isManualOverride: !!override,
      };
    });

    // Save to storage (transactional - rollback on failure)
    const savedPaymentIds: string[] = [];
    try {
      await storage.saveOrder(order);
      for (const payment of paymentRecords) {
        await storage.savePayment(payment);
        savedPaymentIds.push(payment.id);
      }
    } catch (error) {
      // Rollback: delete saved payments and order
      for (const paymentId of savedPaymentIds) {
        try {
          await storage.deletePayment(paymentId);
        } catch {
          // Ignore rollback errors
        }
      }
      try {
        await storage.deleteOrder(order.id);
      } catch {
        // Ignore rollback errors
      }
      throw error;
    }

    // Update state
    set((state) => ({
      orders: [...state.orders, order],
      payments: [...state.payments, ...paymentRecords],
    }));

    // Check for overdue
    await get().updateOverduePayments();

    return { order, payments: paymentRecords };
  },

  // Update an existing order with smart recalculation
  updateOrder: async (id: string, updates: Partial<Order>) => {
    const { orders, payments } = get();
    const currentOrder = orders.find((o) => o.id === id);

    if (!currentOrder) {
      throw new Error(`Order not found: ${id}`);
    }

    const orderPayments = payments
      .filter((p) => p.orderId === id)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);

    let updatedPayments = [...orderPayments];

    // 1. Handle intervalDays change - recalculate all payment dates
    if (
      updates.intervalDays !== undefined &&
      updates.intervalDays !== currentOrder.intervalDays
    ) {
      const firstDate =
        updates.firstPaymentDate || currentOrder.firstPaymentDate;
      updatedPayments = recalculatePaymentDates(
        updatedPayments,
        firstDate,
        updates.intervalDays
      );
    }

    // 2. Handle firstPaymentDate change - shift all dates by delta
    // (Only if intervalDays didn't change, since that already recalculates dates)
    if (
      updates.firstPaymentDate !== undefined &&
      updates.firstPaymentDate !== currentOrder.firstPaymentDate &&
      updates.intervalDays === undefined
    ) {
      const deltaDays = getDateDelta(
        currentOrder.firstPaymentDate,
        updates.firstPaymentDate
      );
      updatedPayments = shiftPaymentDates(updatedPayments, deltaDays);
    }

    // 3. Handle totalAmount change - redistribute amounts respecting manual overrides
    if (
      updates.totalAmount !== undefined &&
      updates.totalAmount !== currentOrder.totalAmount
    ) {
      const { payments: redistributed, error } = redistributePaymentAmounts(
        updatedPayments,
        updates.totalAmount
      );
      if (error) {
        throw new Error(error);
      }
      updatedPayments = redistributed;
    }

    // Save updated order
    const updatedOrder = { ...currentOrder, ...updates };
    await storage.saveOrder(updatedOrder);

    // Save updated payments (only those that changed)
    const changedPayments: Payment[] = [];
    for (const payment of updatedPayments) {
      const original = orderPayments.find((p) => p.id === payment.id);
      if (
        original &&
        (original.amount !== payment.amount ||
          original.dueDate !== payment.dueDate)
      ) {
        await storage.savePayment(payment);
        changedPayments.push(payment);
      }
    }

    // Update state atomically
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
      payments: state.payments.map((p) => {
        const updated = updatedPayments.find((up) => up.id === p.id);
        return updated || p;
      }),
    }));

    // Check for overdue payments after date changes
    if (
      updates.firstPaymentDate !== undefined ||
      updates.intervalDays !== undefined
    ) {
      await get().updateOverduePayments();
    }
  },

  // Delete an order and its payments
  deleteOrder: async (id: string) => {
    await storage.deleteOrder(id);

    set((state) => ({
      orders: state.orders.filter((o) => o.id !== id),
      payments: state.payments.filter((p) => p.orderId !== id),
    }));
  },

  // Mark a payment as paid
  markPaymentPaid: async (paymentId: string, customPaidDate?: string) => {
    const { payments, orders } = get();
    const payment = payments.find((p) => p.id === paymentId);

    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    const paidDateValue = customPaidDate ? parseISO(customPaidDate) : new Date();
    const dueDate = parseISO(payment.dueDate);
    const paidOnTime = !isBefore(startOfDay(dueDate), startOfDay(paidDateValue));

    const updatedPayment: Payment = {
      ...payment,
      status: 'paid',
      paidDate: paidDateValue.toISOString(),
      paidOnTime,
    };

    await storage.savePayment(updatedPayment);

    // Check if all payments for this order are paid
    const orderPayments = payments.filter(
      (p) => p.orderId === payment.orderId
    );
    const allPaid = orderPayments.every(
      (p) => p.id === paymentId || p.status === 'paid'
    );

    let updatedOrder: Order | null = null;
    if (allPaid) {
      const order = orders.find((o) => o.id === payment.orderId);
      if (order) {
        updatedOrder = { ...order, status: 'completed' as const };
        await storage.saveOrder(updatedOrder);
      }
    }

    // Single atomic state update for both payment and order
    set((state) => ({
      payments: state.payments.map((p) =>
        p.id === paymentId ? updatedPayment : p
      ),
      orders: updatedOrder
        ? state.orders.map((o) =>
            o.id === payment.orderId ? updatedOrder! : o
          )
        : state.orders,
    }));
  },

  // Mark a payment as unpaid (undo)
  markPaymentUnpaid: async (paymentId: string) => {
    const { payments, orders } = get();
    const payment = payments.find((p) => p.id === paymentId);

    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    const updatedPayment: Payment = {
      ...payment,
      status: 'pending',
      paidDate: undefined,
      paidOnTime: undefined,
    };

    await storage.savePayment(updatedPayment);

    // Update order status back to active if it was completed
    const order = orders.find((o) => o.id === payment.orderId);
    let updatedOrder: Order | null = null;
    if (order && order.status === 'completed') {
      updatedOrder = { ...order, status: 'active' as const };
      await storage.saveOrder(updatedOrder);
    }

    // Single atomic state update for both payment and order
    set((state) => ({
      payments: state.payments.map((p) =>
        p.id === paymentId ? updatedPayment : p
      ),
      orders: updatedOrder
        ? state.orders.map((o) =>
            o.id === payment.orderId ? updatedOrder! : o
          )
        : state.orders,
    }));

    // Check for overdue
    await get().updateOverduePayments();
  },

  // Update a payment
  updatePayment: async (id: string, updates: Partial<Payment>) => {
    const { payments } = get();
    const paymentIndex = payments.findIndex((p) => p.id === id);

    if (paymentIndex === -1) {
      throw new Error(`Payment not found: ${id}`);
    }

    const updatedPayment = { ...payments[paymentIndex], ...updates };
    await storage.savePayment(updatedPayment);

    set((state) => ({
      payments: state.payments.map((p) =>
        p.id === id ? updatedPayment : p
      ),
    }));
  },

  // Delete a payment
  deletePayment: async (paymentId: string) => {
    await storage.deletePayment(paymentId);

    set((state) => ({
      payments: state.payments.filter((p) => p.id !== paymentId),
    }));
  },

  // Add a payment to an existing order
  addPaymentToOrder: async (orderId: string, amount: number, dueDate: string) => {
    const { orders, payments } = get();
    const order = orders.find((o) => o.id === orderId);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Find the highest installment number for this order
    const orderPayments = payments.filter((p) => p.orderId === orderId);
    const maxInstallment = orderPayments.reduce(
      (max, p) => Math.max(max, p.installmentNumber),
      0
    );

    const newPayment: Payment = {
      id: uuidv4(),
      orderId,
      platformId: order.platformId,
      amount,
      dueDate,
      installmentNumber: maxInstallment + 1,
      status: 'pending',
      isManualOverride: true,
    };

    await storage.savePayment(newPayment);

    // Update order total
    const newTotal = order.totalAmount + amount;
    const updatedOrder = { ...order, totalAmount: newTotal };
    await storage.saveOrder(updatedOrder);

    set((state) => ({
      payments: [...state.payments, newPayment],
      orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
    }));

    // Check for overdue
    await get().updateOverduePayments();

    return newPayment;
  },

  // Update platform credit limit
  updatePlatformLimit: async (platformId: PlatformId, limit: number) => {
    const { platforms } = get();
    const platform = platforms.find((p) => p.id === platformId);

    if (!platform) {
      throw new Error(`Platform not found: ${platformId}`);
    }

    const updatedPlatform = { ...platform, creditLimit: limit };
    await storage.savePlatform(updatedPlatform);

    set((state) => ({
      platforms: state.platforms.map((p) =>
        p.id === platformId ? updatedPlatform : p
      ),
    }));
  },

  // Update platform payment schedule defaults
  updatePlatformSchedule: async (
    platformId: PlatformId,
    installments: number,
    intervalDays: number
  ) => {
    const { platforms } = get();
    const platform = platforms.find((p) => p.id === platformId);

    if (!platform) {
      throw new Error(`Platform not found: ${platformId}`);
    }

    const updatedPlatform = {
      ...platform,
      defaultInstallments: installments,
      defaultIntervalDays: intervalDays,
    };
    await storage.savePlatform(updatedPlatform);

    set((state) => ({
      platforms: state.platforms.map((p) =>
        p.id === platformId ? updatedPlatform : p
      ),
    }));
  },

  // Update subscription
  updateSubscription: async (subscription: Subscription) => {
    await storage.saveSubscription(subscription);

    set((state) => {
      const existingIndex = state.subscriptions.findIndex(
        (s) => s.platformId === subscription.platformId
      );

      if (existingIndex === -1) {
        return { subscriptions: [...state.subscriptions, subscription] };
      }

      return {
        subscriptions: state.subscriptions.map((s) =>
          s.platformId === subscription.platformId ? subscription : s
        ),
      };
    });
  },

  // Update overdue payment statuses
  updateOverduePayments: async () => {
    const { payments } = get();
    const today = startOfDay(new Date());
    const updatedPayments: Payment[] = [];

    for (const payment of payments) {
      if (payment.status === 'pending') {
        const dueDate = startOfDay(parseISO(payment.dueDate));
        if (isBefore(dueDate, today)) {
          const updatedPayment = { ...payment, status: 'overdue' as const };
          await storage.savePayment(updatedPayment);
          updatedPayments.push(updatedPayment);
        }
      }
    }

    if (updatedPayments.length > 0) {
      set((state) => ({
        payments: state.payments.map((p) => {
          const updated = updatedPayments.find((u) => u.id === p.id);
          return updated ?? p;
        }),
      }));
    }
  },

  // Update notification settings
  updateNotificationSettings: (settings: NotificationSettings) => {
    storage.saveNotificationSettings(settings);
    set({ notificationSettings: settings });
  },

  // Set Gemini API key
  setGeminiApiKey: (key: string | null) => {
    if (key) {
      storage.saveGeminiApiKey(key);
    } else {
      storage.clearGeminiApiKey();
    }
    set({ geminiApiKey: key });
  },

  // UI Actions
  openQuickAddModal: () => set({ quickAddModalOpen: true }),
  closeQuickAddModal: () => set({ quickAddModalOpen: false }),
  openOrderDetailModal: (orderId: string) =>
    set({ orderDetailModalOpen: true, selectedOrderId: orderId }),
  closeOrderDetailModal: () =>
    set({ orderDetailModalOpen: false, selectedOrderId: null }),
  toggleSidebar: () => {
    const newState = !get().sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(newState));
    set({ sidebarCollapsed: newState });
  },

  // Export all data
  exportData: async () => {
    return storage.exportData();
  },

  // Import data
  importData: async (data: ExportedData) => {
    console.log('[Store] Importing data:', {
      orders: data.orders.length,
      payments: data.payments.length,
    });

    await storage.importData(data);

    // Reload state
    const [orders, payments, platforms, subscriptions] = await Promise.all([
      storage.getAllOrders(),
      storage.getAllPayments(),
      storage.getAllPlatforms(),
      storage.getAllSubscriptions(),
    ]);

    console.log('[Store] After import, loaded:', {
      orders: orders.length,
      payments: payments.length,
    });

    set({
      orders,
      payments,
      platforms,
      subscriptions,
    });

    // Update overdue statuses
    await get().updateOverduePayments();
  },

  // Clear all data
  clearAllData: async () => {
    await storage.clearAllData();

    const [platforms, subscriptions] = await Promise.all([
      storage.getAllPlatforms(),
      storage.getAllSubscriptions(),
    ]);

    set({
      orders: [],
      payments: [],
      platforms,
      subscriptions,
    });
  },
}));
