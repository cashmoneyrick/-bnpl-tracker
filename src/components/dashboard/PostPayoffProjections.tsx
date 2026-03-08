import { usePostPayoffProjections } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';
import { format, parseISO } from 'date-fns';

export function PostPayoffProjections() {
  const projections = usePostPayoffProjections();

  if (projections.length === 0) return null;

  const display = projections.slice(0, 5);

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">PAYOFF PROJECTIONS</span>
          <span className="text-2xs text-terminal-muted">WHAT-IF</span>
        </div>

        {/* Desktop: table */}
        <table className="hidden sm:table w-full text-2xs">
          <thead>
            <tr className="text-terminal-muted border-b border-dark-border">
              <th className="text-left py-1.5 px-3 font-medium">ORDER</th>
              <th className="text-left py-1.5 px-3 font-medium">PLATFORM</th>
              <th className="text-right py-1.5 px-3 font-medium">PAYOFF DATE</th>
              <th className="text-right py-1.5 px-3 font-medium">FREES UP</th>
              <th className="text-right py-1.5 px-3 font-medium">UTIL AFTER</th>
            </tr>
          </thead>
          <tbody>
            {display.map((proj) => (
              <tr key={proj.orderId} className="border-b border-dark-border/50 row-glow">
                <td className="py-1.5 px-3 text-white">{proj.storeName}</td>
                <td className="py-1.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: proj.platformColor }} />
                    <span style={{ color: proj.platformColor }}>{proj.platformName}</span>
                  </div>
                </td>
                <td className="py-1.5 px-3 text-right text-terminal-amber">
                  {format(parseISO(proj.completionDate), 'MMM dd')}
                </td>
                <td className="py-1.5 px-3 text-right text-terminal-green font-semibold">
                  {formatCurrency(proj.amountFreed)}
                </td>
                <td className="py-1.5 px-3 text-right">
                  <span className="text-terminal-muted">{proj.currentUtilization}%</span>
                  <span className="text-terminal-muted mx-1">→</span>
                  <span className="text-terminal-green font-semibold">{proj.projectedUtilization}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile: card layout */}
        <div className="sm:hidden divide-y divide-dark-border/50">
          {display.map((proj) => (
            <div key={proj.orderId} className="px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: proj.platformColor }} />
                  <span className="text-white text-xs font-medium">{proj.storeName}</span>
                </div>
                <span className="text-terminal-green text-xs font-semibold">{formatCurrency(proj.amountFreed)}</span>
              </div>
              <div className="flex items-center justify-between text-2xs">
                <span className="text-terminal-muted">
                  Pays off <span className="text-terminal-amber">{format(parseISO(proj.completionDate), 'MMM dd')}</span>
                </span>
                <span className="text-terminal-muted">
                  {proj.platformName} {proj.currentUtilization}% → <span className="text-terminal-green">{proj.projectedUtilization}%</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
