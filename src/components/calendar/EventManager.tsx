import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useBNPLStore } from '../../store';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { ListView } from './ListView';
import { EventModal } from './EventModal';
import type { CalendarEvent, CalendarViewType, UnifiedCalendarEvent } from '../../types/calendar';

const VIEW_LABELS: { key: CalendarViewType; label: string }[] = [
  { key: 'month', label: 'MONTH' },
  { key: 'week', label: 'WEEK' },
  { key: 'day', label: 'DAY' },
  { key: 'list', label: 'LIST' },
];

export function EventManager() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>('month');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<UnifiedCalendarEvent | null>(null);

  const events = useCalendarEvents();
  const addCalendarEvent = useBNPLStore((s) => s.addCalendarEvent);
  const updateCalendarEvent = useBNPLStore((s) => s.updateCalendarEvent);
  const deleteCalendarEvent = useBNPLStore((s) => s.deleteCalendarEvent);
  const openOrderDetailModal = useBNPLStore((s) => s.openOrderDetailModal);

  // Navigation
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === 'month') d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
      else if (view === 'week') d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
      else if (view === 'day') d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
      return d;
    });
  }, [view]);

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  // Event handling
  const handleEventClick = useCallback((event: UnifiedCalendarEvent) => {
    if (event.type === 'payment') {
      openOrderDetailModal(event.orderId);
    } else {
      setEditingEvent(event.event);
      setIsEventModalOpen(true);
    }
  }, [openOrderDetailModal]);

  const handleSaveEvent = useCallback((event: CalendarEvent) => {
    if (editingEvent) {
      updateCalendarEvent(event.id, event);
    } else {
      addCalendarEvent(event);
    }
    setEditingEvent(null);
  }, [editingEvent, addCalendarEvent, updateCalendarEvent]);

  const handleDeleteEvent = useCallback((id: string) => {
    deleteCalendarEvent(id);
    setEditingEvent(null);
  }, [deleteCalendarEvent]);

  const handleCreateNew = useCallback(() => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  }, []);

  // Drag and drop for personal events
  const handleDrop = useCallback((date: Date, hour?: number) => {
    if (!draggedEvent || draggedEvent.type !== 'personal') return;

    const ev = draggedEvent.event;
    const duration = new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime();
    const newStart = new Date(date);
    if (hour !== undefined) newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    updateCalendarEvent(ev.id, {
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
    });
    setDraggedEvent(null);
  }, [draggedEvent, updateCalendarEvent]);

  // Title
  const title = (() => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy').toUpperCase();
    if (view === 'week') return `WEEK OF ${format(currentDate, 'MMM d').toUpperCase()}`;
    if (view === 'day') return format(currentDate, 'EEEE, MMM d, yyyy').toUpperCase();
    return 'ALL EVENTS';
  })();

  return (
    <div className="fade-up-1">
      {/* Header bar */}
      <div className="border border-dark-border bg-dark-card mb-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 sm:p-2">
          {/* Left: Title + Nav */}
          <div className="flex items-center gap-2">
            <span className="terminal-label shrink-0">CALENDAR</span>
            <span className="text-dark-border hidden sm:inline">|</span>
            <span className="text-terminal-text text-xs sm:text-2xs font-medium truncate">{title}</span>
          </div>

          {/* Right: Nav arrows + view tabs + new event */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Nav arrows */}
            <button
              onClick={() => navigateDate('prev')}
              className="px-2 py-1 text-terminal-muted hover:text-terminal-amber text-xs transition-colors"
            >
              ‹
            </button>
            <button
              onClick={goToday}
              className="px-2 py-1 text-2xs text-terminal-muted hover:text-terminal-amber uppercase tracking-wider transition-colors"
            >
              TODAY
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="px-2 py-1 text-terminal-muted hover:text-terminal-amber text-xs transition-colors"
            >
              ›
            </button>

            <span className="text-dark-border">|</span>

            {/* View tabs — mobile: select, desktop: buttons */}
            <div className="sm:hidden">
              <select
                value={view}
                onChange={(e) => setView(e.target.value as CalendarViewType)}
                className="bg-dark-card border border-dark-border text-terminal-text text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-terminal-amber"
              >
                {VIEW_LABELS.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="hidden sm:flex items-center gap-0">
              {VIEW_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`px-2 py-1 text-2xs uppercase tracking-wider transition-colors ${
                    view === key
                      ? 'text-terminal-amber bg-terminal-amber/10'
                      : 'text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <span className="text-dark-border">|</span>

            {/* New event button */}
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1 px-2 py-1 text-2xs sm:text-2xs text-terminal-amber hover:bg-terminal-amber/10 uppercase tracking-wider transition-colors font-medium"
            >
              <span className="text-terminal-amber/60">[</span>+<span className="text-terminal-amber/60">]</span>
              <span className="hidden sm:inline ml-0.5">EVENT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar body */}
      {view === 'month' && (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onDrop={(date) => handleDrop(date)}
        />
      )}
      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onDrop={handleDrop}
        />
      )}
      {view === 'day' && (
        <DayView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onDrop={handleDrop}
        />
      )}
      {view === 'list' && (
        <ListView
          events={events}
          onEventClick={handleEventClick}
        />
      )}

      {/* Event modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => { setIsEventModalOpen(false); setEditingEvent(null); }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={editingEvent}
      />
    </div>
  );
}
