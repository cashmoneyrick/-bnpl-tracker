interface ProgressRingProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showLabel?: boolean;
  strokeWidth?: number;
}

const sizes = {
  sm: 32,
  md: 48,
  lg: 64,
};

export function ProgressRing({
  percentage,
  size = 'md',
  color = '#3b82f6',
  showLabel = true,
  strokeWidth = 3,
}: ProgressRingProps) {
  const sizeValue = sizes[size];
  const radius = (sizeValue - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={sizeValue}
        height={sizeValue}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={sizeValue / 2}
          cy={sizeValue / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={sizeValue / 2}
          cy={sizeValue / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300"
        />
      </svg>
      {showLabel && (
        <span
          className={`absolute font-medium text-white ${
            size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm'
          }`}
        >
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
