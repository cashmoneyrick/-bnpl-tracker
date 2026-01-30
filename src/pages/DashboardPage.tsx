import { SummaryCards } from '../components/dashboard/SummaryCards';
import { OverdueAlerts } from '../components/dashboard/OverdueAlerts';
import { InsightStrip } from '../components/dashboard/InsightStrip';

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

      {/* Subtle insight at bottom */}
      <InsightStrip />
    </div>
  );
}
