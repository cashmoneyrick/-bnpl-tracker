import { useBNPLStore } from '../store';

/**
 * Seed the app with test data
 */
export async function seedTestData() {
  const store = useBNPLStore.getState();

  // Test orders with different platforms
  const testOrders = [
    {
      platformId: 'afterpay' as const,
      storeName: 'Amazon',
      totalAmount: 12000, // $120.00
      firstPaymentDate: new Date().toISOString().split('T')[0],
    },
    {
      platformId: 'klarna' as const,
      storeName: 'Target',
      totalAmount: 8500, // $85.00
      firstPaymentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    },
    {
      platformId: 'sezzle' as const,
      storeName: 'Best Buy',
      totalAmount: 24999, // $249.99
      firstPaymentDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days ago
    },
    {
      platformId: 'zip' as const,
      storeName: 'Walmart',
      totalAmount: 4500, // $45.00
      firstPaymentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
    },
    {
      platformId: 'four' as const,
      storeName: 'Nike',
      totalAmount: 15000, // $150.00
      firstPaymentDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 21 days ago
    },
    {
      platformId: 'affirm' as const,
      storeName: 'Apple',
      totalAmount: 99900, // $999.00
      firstPaymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      customInstallments: 12,
      apr: 0.15, // 15% APR
    },
  ];

  console.log('Seeding test data...');

  for (const order of testOrders) {
    try {
      await store.addOrder(order);
      console.log(`Added order: ${order.storeName} (${order.platformId})`);
    } catch (error) {
      console.error(`Failed to add order ${order.storeName}:`, error);
    }
  }

  console.log('Test data seeded successfully!');
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).seedTestData = seedTestData;
}
