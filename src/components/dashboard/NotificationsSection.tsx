import { useBNPLStore } from '../../store';
import { useComputedNotifications } from '../../store/selectors';

const SEVERITY_STYLES = {
  critical: {
    dot: 'bg-terminal-red',
    border: 'border-l-terminal-red',
    title: 'text-terminal-red',
  },
  warning: {
    dot: 'bg-terminal-amber',
    border: 'border-l-terminal-amber',
    title: 'text-terminal-amber',
  },
  info: {
    dot: 'bg-terminal-green',
    border: 'border-l-terminal-green',
    title: 'text-terminal-green',
  },
} as const;

function NotificationRow({
  notification,
  onClick,
}: {
  notification: ReturnType<typeof useComputedNotifications>[number];
  onClick: () => void;
}) {
  const styles = SEVERITY_STYLES[notification.severity];
  const isClickable = notification.orderId !== undefined;

  return (
    <div
      className={`flex items-start gap-2 px-2 py-1.5 border-l-2 ${styles.border} ${
        isClickable ? 'cursor-pointer hover:bg-dark-hover transition-colors' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
    >
      <span className={`w-1.5 h-1.5 mt-1 flex-shrink-0 ${styles.dot}`} />
      <div className="min-w-0">
        <div className={`text-2xs font-bold ${styles.title}`}>{notification.title}</div>
        <div className="text-2xs text-terminal-muted">{notification.message}</div>
      </div>
    </div>
  );
}

export function NotificationsSection() {
  const openOrderDetailModal = useBNPLStore((s) => s.openOrderDetailModal);
  const notifications = useComputedNotifications();

  const handleClick = (orderId?: string) => {
    if (orderId) openOrderDetailModal(orderId);
  };

  const critical = notifications.filter((n) => n.severity === 'critical');
  const warning = notifications.filter((n) => n.severity === 'warning');
  const info = notifications.filter((n) => n.severity === 'info');

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">NOTIFICATIONS</span>
          <span className="text-2xs text-terminal-muted">
            {notifications.length > 0 ? `${notifications.length} ALERT${notifications.length !== 1 ? 'S' : ''}` : 'NOMINAL'}
          </span>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-terminal-green text-xs font-bold">ALL SYSTEMS NOMINAL</span>
            <p className="text-terminal-muted text-2xs mt-1">No alerts or notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-border/50">
            {critical.length > 0 && (
              <div className="px-3 py-2">
                <div className="text-terminal-red text-2xs font-bold tracking-wider mb-1.5">
                  CRITICAL ({critical.length})
                </div>
                <div className="space-y-1">
                  {critical.map((n) => (
                    <NotificationRow key={n.id} notification={n} onClick={() => handleClick(n.orderId)} />
                  ))}
                </div>
              </div>
            )}
            {warning.length > 0 && (
              <div className="px-3 py-2">
                <div className="text-terminal-amber text-2xs font-bold tracking-wider mb-1.5">
                  WARNING ({warning.length})
                </div>
                <div className="space-y-1">
                  {warning.map((n) => (
                    <NotificationRow key={n.id} notification={n} onClick={() => handleClick(n.orderId)} />
                  ))}
                </div>
              </div>
            )}
            {info.length > 0 && (
              <div className="px-3 py-2">
                <div className="text-terminal-green text-2xs font-bold tracking-wider mb-1.5">
                  INFO ({info.length})
                </div>
                <div className="space-y-1">
                  {info.map((n) => (
                    <NotificationRow key={n.id} notification={n} onClick={() => handleClick(n.orderId)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
