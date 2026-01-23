interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  color = '#3b82f6',
  size = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  // Determine warning/danger state
  const isWarning = clampedValue >= 80 && clampedValue < 100;
  const isDanger = clampedValue >= 100;

  // Override color for warning/danger
  let barColor = color;
  if (isDanger) {
    barColor = '#ef4444'; // red
  } else if (isWarning) {
    barColor = '#f59e0b'; // amber
  }

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`
          w-full rounded-full bg-dark-border overflow-hidden
          ${sizes[size]}
        `}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, clampedValue)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-400 mt-1">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
