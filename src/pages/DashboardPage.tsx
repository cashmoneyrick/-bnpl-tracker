import { SummaryCards } from '../components/dashboard/SummaryCards';
import { PlatformUtilization } from '../components/dashboard/PlatformUtilization';
import { UpcomingPayments } from '../components/dashboard/UpcomingPayments';
import { OverdueAlerts } from '../components/dashboard/OverdueAlerts';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Track your BNPL payments at a glance</p>
      </div>

      {/* Overdue Alerts - shown prominently at top if any */}
      <OverdueAlerts />

      {/* Summary Cards */}
      <SummaryCards />

      {/* Two column layout for utilization and upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlatformUtilization />
        <UpcomingPayments />
      </div>
    </div>
  );
}
