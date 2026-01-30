import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { useBNPLStore } from '../store';
import {
  useOnTimeRate,
  useOnTimeStreak,
  useWeeklyDeployment,
  useAllPlatformGoals,
  useTotalLimitGrowth,
  useArbitrageStats,
  useArbitrageOrders,
  useOrdersByType,
  useTotalAvailableCredit,
} from '../store/selectors';
import { formatCurrency } from '../utils/currency';

const ORDER_TYPE_COLORS: Record<string, string> = {
  personal: '#3b82f6',    // blue
  necessity: '#22c55e',   // green
  arbitrage: '#f59e0b',   // amber
};

export function AnalyticsPage() {
  const navigate = useNavigate();
  const platforms = useBNPLStore((state) => state.platforms);
  const limitHistory = useBNPLStore((state) => state.limitHistory);

  // Trust metrics
  const onTimeRate = useOnTimeRate();
  const onTimeStreak = useOnTimeStreak();

  // Credit metrics
  const weeklyDeployment = useWeeklyDeployment();
  const totalAvailable = useTotalAvailableCredit();

  // Platform goals
  const platformGoals = useAllPlatformGoals();

  // Limit growth
  const limitGrowth = useTotalLimitGrowth();

  // Arbitrage
  const arbitrageStats = useArbitrageStats();
  const arbitrageOrders = useArbitrageOrders();
  const hasArbitrageOrders = arbitrageOrders.length > 0;

  // Order breakdown
  const ordersByType = useOrdersByType();

  // Pie chart data for order type breakdown
  const orderTypePieData = useMemo(() => {
    const data = [];
    if (ordersByType.personal.count > 0) {
      data.push({
        name: 'Personal',
        value: ordersByType.personal.total,
        color: ORDER_TYPE_COLORS.personal,
      });
    }
    if (ordersByType.necessity.count > 0) {
      data.push({
        name: 'Necessity',
        value: ordersByType.necessity.total,
        color: ORDER_TYPE_COLORS.necessity,
      });
    }
    if (ordersByType.arbitrage.count > 0) {
      data.push({
        name: 'Arbitrage',
        value: ordersByType.arbitrage.total,
        color: ORDER_TYPE_COLORS.arbitrage,
      });
    }
    return data;
  }, [ordersByType]);

  // Get trust status message
  const getTrustStatus = () => {
    if (onTimeRate >= 100) return { message: 'Perfect record', color: 'text-green-400' };
    if (onTimeRate >= 90) return { message: 'Excellent standing', color: 'text-green-400' };
    if (onTimeRate >= 75) return { message: 'Good standing', color: 'text-blue-400' };
    if (onTimeRate >= 50) return { message: 'Needs improvement', color: 'text-amber-400' };
    return { message: 'Critical - pay on time', color: 'text-red-400' };
  };

  const trustStatus = getTrustStatus();

  // Recent limit changes (last 5)
  const recentLimitChanges = useMemo(() => {
    return [...limitHistory]
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
      .slice(0, 5)
      .map((change) => ({
        ...change,
        platform: platforms.find((p) => p.id === change.platformId),
      }));
  }, [limitHistory, platforms]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Capital Strategy</h1>
        <p className="text-gray-400 mt-1">Track your credit-building progress and deployment</p>
      </div>

      {/* Section 1: Trust Score */}
      <Card className="bg-gradient-to-br from-green-500/10 to-transparent">
        <h3 className="text-lg font-semibold text-white mb-4">Trust Score</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* On-Time Rate */}
          <div className="text-center md:text-left">
            <p className="text-4xl font-bold text-white">{Math.round(onTimeRate)}%</p>
            <p className="text-sm text-gray-400 mt-1">On-Time Payment Rate</p>
          </div>

          {/* Streak */}
          <div className="text-center flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2">
              <svg
                className="w-6 h-6 text-amber-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12.9 2.6l2.3 5a1 1 0 00.8.5l5.4.5a1 1 0 01.6 1.7l-4.1 3.5a1 1 0 00-.3 1l1.2 5.3a1 1 0 01-1.5 1.1L12.4 18a1 1 0 00-1 0l-4.8 2.9a1 1 0 01-1.5-1.1l1.2-5.3a1 1 0 00-.3-1L2 10.3a1 1 0 01.6-1.7l5.4-.5a1 1 0 00.8-.5l2.3-5a1 1 0 011.8 0z" />
              </svg>
              <p className="text-3xl font-bold text-white">{onTimeStreak}</p>
            </div>
            <p className="text-sm text-gray-400 mt-1">Consecutive on-time payments</p>
          </div>

          {/* Status */}
          <div className="text-center md:text-right">
            <p className={`text-xl font-semibold ${trustStatus.color}`}>
              {trustStatus.message}
            </p>
            <p className="text-sm text-gray-400 mt-1">Current Status</p>
          </div>
        </div>
      </Card>

      {/* Section 2: Available Capital */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Available Capital</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Available */}
          <div>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalAvailable)}</p>
            <p className="text-sm text-gray-400 mt-1">Total Available Credit</p>
          </div>

          {/* Weekly Deployment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Weekly Deployment</p>
              <p className="text-white font-medium">{formatCurrency(weeklyDeployment.amount)}</p>
            </div>
            <div className="h-3 bg-dark-card rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  weeklyDeployment.isOverExtended
                    ? 'bg-red-500'
                    : weeklyDeployment.warningThreshold
                    ? 'bg-amber-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((weeklyDeployment.amount / 60000) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">$0</p>
              <p className="text-xs text-gray-500">$600</p>
            </div>
            {weeklyDeployment.isOverExtended && (
              <p className="text-sm text-red-400 mt-2">
                Warning: Over $600 deployed this week
              </p>
            )}
            {!weeklyDeployment.isOverExtended && weeklyDeployment.warningThreshold && (
              <p className="text-sm text-amber-400 mt-2">
                Approaching weekly limit threshold
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Section 3: Platform Goals */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Platform Goals</h3>
          <Button size="sm" variant="secondary" onClick={() => navigate('/settings')}>
            Edit Goals
          </Button>
        </div>

        {/* Flexible Tier */}
        {platformGoals.flexible.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-400 mb-3">Flexible (Virtual Visa)</p>
            <div className="space-y-3">
              {platformGoals.flexible.map(({ platform, currentLimit, goalLimit, progress }) => (
                <div key={platform.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: platform.color }}
                      />
                      <span className="text-white text-sm">{platform.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {formatCurrency(currentLimit)} / {formatCurrency(goalLimit)}
                    </span>
                  </div>
                  <div className="h-2 bg-dark-card rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: platform.color,
                      }}
                    />
                  </div>
                  {progress >= 100 && (
                    <p className="text-xs text-green-400 mt-1">Goal reached!</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Limited Tier */}
        {platformGoals.limited.length > 0 && (
          <div>
            <p className="text-sm font-medium text-amber-400 mb-3">Limited (Merchant-specific)</p>
            <div className="space-y-3">
              {platformGoals.limited.map(({ platform, currentLimit, goalLimit, progress }) => (
                <div key={platform.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: platform.color }}
                      />
                      <span className="text-white text-sm">{platform.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {formatCurrency(currentLimit)} / {formatCurrency(goalLimit)}
                    </span>
                  </div>
                  <div className="h-2 bg-dark-card rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: platform.color,
                      }}
                    />
                  </div>
                  {progress >= 100 && (
                    <p className="text-xs text-green-400 mt-1">Goal reached!</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {platformGoals.flexible.length === 0 && platformGoals.limited.length === 0 && (
          <p className="text-gray-500 text-sm">
            No goals set. Set platform goals in Settings to track your progress.
          </p>
        )}
      </Card>

      {/* Section 4: Limit Growth History */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Limit Growth</h3>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-dark-hover rounded-lg">
          <div>
            <p className="text-sm text-gray-400">Starting Total</p>
            <p className="text-xl font-semibold text-white">
              {formatCurrency(limitGrowth.startingTotal)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Current Total</p>
            <p className="text-xl font-semibold text-white">
              {formatCurrency(limitGrowth.currentTotal)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Total Growth</p>
            <p className={`text-xl font-semibold ${limitGrowth.growthAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {limitGrowth.growthAmount >= 0 ? '+' : ''}{formatCurrency(limitGrowth.growthAmount)}
              {limitGrowth.growthPercent > 0 && (
                <span className="text-sm ml-1">({limitGrowth.growthPercent.toFixed(0)}%)</span>
              )}
            </p>
          </div>
        </div>

        {/* Recent Changes */}
        {recentLimitChanges.length > 0 ? (
          <div>
            <p className="text-sm text-gray-400 mb-3">Recent Limit Increases</p>
            <div className="space-y-2">
              {recentLimitChanges.map((change) => {
                const increase = change.newLimit - change.previousLimit;
                return (
                  <div
                    key={change.id}
                    className="flex items-center justify-between py-2 border-b border-dark-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {change.platform && (
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: change.platform.color }}
                        />
                      )}
                      <div>
                        <p className="text-white text-sm">
                          {change.platform?.name || change.platformId}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(change.changedAt), 'MMM d, yyyy')} • {change.onTimeStreakAtChange} on-time streak
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-medium ${increase >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {increase >= 0 ? '+' : ''}{formatCurrency(increase)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            No limit changes recorded yet. Changes are tracked when you update platform limits.
          </p>
        )}
      </Card>

      {/* Section 5: Arbitrage Performance (conditional) */}
      {hasArbitrageOrders && (
        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent">
          <h3 className="text-lg font-semibold text-white mb-4">Arbitrage Performance</h3>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-400">Total Deployed</p>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(arbitrageStats.totalPurchased)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Sales</p>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(arbitrageStats.totalSaleAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Net Cash</p>
              <p className={`text-xl font-semibold ${arbitrageStats.totalNetCash >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {arbitrageStats.totalNetCash >= 0 ? '+' : ''}{formatCurrency(Math.abs(arbitrageStats.totalNetCash))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Avg Cost of Capital</p>
              <p className="text-xl font-semibold text-white">
                {arbitrageStats.averageCostOfCapital > 0
                  ? `${arbitrageStats.averageCostOfCapital.toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
          </div>

          {/* Pending Sales */}
          {arbitrageStats.pendingSales > 0 && (
            <p className="text-sm text-amber-400 mb-4">
              {arbitrageStats.pendingSales} order{arbitrageStats.pendingSales > 1 ? 's' : ''} pending sale
            </p>
          )}

          {/* Recent Arbitrage Orders */}
          {arbitrageOrders.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-3">Recent Orders</p>
              <div className="space-y-2">
                {arbitrageOrders.slice(0, 5).map((order) => {
                  const platform = platforms.find((p) => p.id === order.platformId);
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-2 border-b border-amber-500/20 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        {platform && (
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: platform.color }}
                          />
                        )}
                        <div>
                          <p className="text-white text-sm">
                            {order.storeName || platform?.name || order.platformId}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(order.totalAmount)} purchase
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {order.saleAmount ? (
                          <>
                            <p className={`text-sm font-medium ${order.isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                              {order.netCash >= 0 ? '+' : ''}{formatCurrency(order.netCash)}
                            </p>
                            {!order.isProfitable && (
                              <p className="text-xs text-gray-500">
                                {order.costOfCapitalPercent.toFixed(1)}% cost
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">Pending sale</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Section 6: Order Breakdown by Type */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Order Breakdown</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          {orderTypePieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderTypePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {orderTypePieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #262626',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No orders yet
            </div>
          )}

          {/* Legend & Stats */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: ORDER_TYPE_COLORS.personal }}
              />
              <div className="flex-1">
                <p className="text-white">Personal</p>
                <p className="text-sm text-gray-400">
                  {ordersByType.personal.count} orders • {formatCurrency(ordersByType.personal.total)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: ORDER_TYPE_COLORS.necessity }}
              />
              <div className="flex-1">
                <p className="text-white">Necessity</p>
                <p className="text-sm text-gray-400">
                  {ordersByType.necessity.count} orders • {formatCurrency(ordersByType.necessity.total)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: ORDER_TYPE_COLORS.arbitrage }}
              />
              <div className="flex-1">
                <p className="text-white">Arbitrage</p>
                <p className="text-sm text-gray-400">
                  {ordersByType.arbitrage.count} orders • {formatCurrency(ordersByType.arbitrage.total)}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-dark-border">
              <p className="text-sm text-gray-400">Total Deployed (All Time)</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(
                  ordersByType.personal.total +
                  ordersByType.necessity.total +
                  ordersByType.arbitrage.total
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
