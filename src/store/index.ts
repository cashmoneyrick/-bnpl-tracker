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
import { calculatePayments } from '../services/paymentCalculator';
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

  // UI State
  quickAddModalOpen: boolean;
  orderDetailModalOpen: boolean;
  selectedOrderId: string | null;

  // Actions
  initialize: () => Promise<void>;
  addOrder: (input: NewOrderInput) => Promise<{ order: Order; payments: Payment[] }>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  markPaymentPaid: (paymentId: string, customPaidDate?: string) => Promise<void>;
  markPaymentUnpaid: (paymentId: string) => Promise<void>;
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
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

  // UI State
  quickAddModalOpen: false,
  orderDetailModalOpen: false,
  selectedOrderId: null,

  // Initialize store from IndexedDB
  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });

    try {
      await storage.init();

      const [orders, payments, platforms, subscriptions] = await Promise.all([
        storage.getAllOrders(),
        storage.getAllPayments(),
        storage.getAllPlatforms(),
        storage.getAllSubscriptions(),
      ]);

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
      });

      // Update overdue statuses
      await get().updateOverduePayments();
    } catch (error) {
      console.error('Failed to initialize store:', error);
      set({ isLoading: false });
    }
  },

  // Add a new order with calculated payments
  addOrder: async (input: NewOrderInput) => {
    const { platforms } = get();
    const platform = platforms.find((p) => p.id === input.platformId);

    if (!platform) {
      throw new Error(`Platform not found: ${input.platformId}`);
    }

    // Determine installments and interval
    const installments =
      input.customInstallments ?? platform.defaultInstallments;
    const intervalDays = platform.defaultIntervalDays;

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

  // Update an existing order
  updateOrder: async (id: string, updates: Partial<Order>) => {
    const { orders } = get();
    const orderIndex = orders.findIndex((o) => o.id === id);

    if (orderIndex === -1) {
      throw new Error(`Order not found: ${id}`);
    }

    const updatedOrder = { ...orders[orderIndex], ...updates };
    await storage.saveOrder(updatedOrder);

    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
    }));
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

  // Export all data
  exportData: async () => {
    return storage.exportData();
  },

  // Import data
  importData: async (data: ExportedData) => {
    await storage.importData(data);

    // Reload state
    const [orders, payments, platforms, subscriptions] = await Promise.all([
      storage.getAllOrders(),
      storage.getAllPayments(),
      storage.getAllPlatforms(),
      storage.getAllSubscriptions(),
    ]);

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
