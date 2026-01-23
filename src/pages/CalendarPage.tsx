import { CalendarView } from '../components/calendar/CalendarView';

export function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <p className="text-gray-400 mt-1">View your payment schedule</p>
      </div>

      <CalendarView />
    </div>
  );
}
