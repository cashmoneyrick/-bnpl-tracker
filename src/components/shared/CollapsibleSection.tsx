import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  count,
  defaultExpanded = false,
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-dark-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-dark-hover/50 hover:bg-dark-hover active:bg-dark-hover transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wider text-terminal-amber">{title}</span>
          {count !== undefined && (
            <span className="text-2xs text-terminal-muted">({count})</span>
          )}
        </div>
        <span className="text-2xs text-terminal-muted font-mono">
          {isExpanded ? '[ \u2212 ]' : '[ + ]'}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-dark-border animate-scale-in">
          {children}
        </div>
      )}
    </div>
  );
}
