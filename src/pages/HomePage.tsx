import { useBNPLStore } from '../store';
import { useTotalOwed } from '../store/selectors';
import { formatCurrency } from '../utils/currency';
import { DailyBriefingSection } from '../components/dashboard/DailyBriefingSection';
import { NotificationsSection } from '../components/dashboard/NotificationsSection';
import { OperationsView } from '../views/OperationsView';
import { TimelineView } from '../views/TimelineView';
import { AnalyticsView } from '../views/AnalyticsView';
import { CalendarView } from '../views/CalendarView';
import { ReportSection } from '../components/dashboard/ReportSection';
import { SettingsSection } from '../components/dashboard/SettingsSection';

export function HomePage() {
  const totalOwed = useTotalOwed();
  const liveModeEnabled = useBNPLStore((s) => s.liveModeEnabled);
  const toggleLiveMode = useBNPLStore((s) => s.toggleLiveMode);

  return (
    <>
      {/* Branding strip */}
      <div className="flex items-center justify-between px-3 py-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-terminal-amber font-bold tracking-wider text-sm">JOURNAL</span>
          <span className="text-dark-border">│</span>
          <span className="text-terminal-muted text-2xs">OWED</span>
          <span className="text-terminal-amber font-semibold text-xs">{formatCurrency(totalOwed)}</span>
        </div>
        <button
          onClick={toggleLiveMode}
          className={`text-2xs uppercase tracking-wider transition-colors ${
            liveModeEnabled ? 'text-terminal-green' : 'text-terminal-muted hover:text-terminal-amber'
          }`}
        >
          {liveModeEnabled ? '● LIVE' : 'LIVE'}
        </button>
      </div>

      <DailyBriefingSection />
      <NotificationsSection />
      <OperationsView />
      <TimelineView />
      <AnalyticsView />
      <CalendarView />
      <ReportSection />
      <SettingsSection />
    </>
  );
}
