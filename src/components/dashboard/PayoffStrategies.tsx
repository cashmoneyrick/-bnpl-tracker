import { useState } from 'react';
import { usePayoffStrategies, type PayoffStep } from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

function StrategyTable({ steps }: { steps: PayoffStep[] }) {
  if (steps.length === 0) {
    return <div className="text-terminal-muted text-2xs py-4 text-center">NO ACTIVE BALANCES</div>;
  }

  let cumulativeFreed = 0;

  return (
    <div className="divide-y divide-dark-border/50">
      {steps.map((step, i) => {
        cumulativeFreed += step.creditFreed;
        return (
          <div key={step.orderId} className="px-3 py-2 flex items-center justify-between text-2xs row-glow">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-terminal-muted w-4 shrink-0">{i + 1}.</span>
              <span className="w-2 h-2 shrink-0" style={{ backgroundColor: step.platformColor }} />
              <span className="text-white truncate">{step.storeName}</span>
              <span className="text-terminal-muted hidden sm:inline">{step.platformName}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-terminal-amber font-semibold">{formatCurrency(step.remainingBalance)}</span>
              <span className="text-terminal-green hidden sm:inline">+{formatCurrency(cumulativeFreed)} freed</span>
              <span className="text-terminal-muted hidden sm:inline">→ {step.platformUtilAfter}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PayoffStrategies() {
  const { snowball, avalanche } = usePayoffStrategies();
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');

  if (snowball.length === 0) return null;

  const totalToPayoff = snowball.reduce((sum, s) => sum + s.remainingBalance, 0);

  return (
    <div className="hud-section">
      <div className="hud-section-inner relative">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dark-border">
          <span className="terminal-label">PAYOFF STRATEGIES</span>
          <span className="text-2xs text-terminal-muted">{formatCurrency(totalToPayoff)} REMAINING</span>
        </div>

        {/* Strategy toggle */}
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setStrategy('snowball')}
            className={`flex-1 px-3 py-1.5 text-2xs uppercase tracking-wider transition-colors ${
              strategy === 'snowball'
                ? 'text-terminal-amber bg-terminal-amber/5 border-b-2 border-terminal-amber'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            SNOWBALL
            <span className="text-terminal-muted ml-1 hidden sm:inline">smallest first</span>
          </button>
          <button
            onClick={() => setStrategy('avalanche')}
            className={`flex-1 px-3 py-1.5 text-2xs uppercase tracking-wider transition-colors ${
              strategy === 'avalanche'
                ? 'text-terminal-amber bg-terminal-amber/5 border-b-2 border-terminal-amber'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            AVALANCHE
            <span className="text-terminal-muted ml-1 hidden sm:inline">highest util first</span>
          </button>
        </div>

        <StrategyTable steps={strategy === 'snowball' ? snowball : avalanche} />
      </div>
    </div>
  );
}
