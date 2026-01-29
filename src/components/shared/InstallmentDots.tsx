interface InstallmentDotsProps {
  total: number;
  paid: number;
  overdue?: number;
  size?: 'sm' | 'md';
}

export function InstallmentDots({
  total,
  paid,
  overdue = 0,
  size = 'sm',
}: InstallmentDotsProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const gap = size === 'sm' ? 'gap-1' : 'gap-1.5';

  // Calculate status for each dot
  const dots = Array.from({ length: total }, (_, i) => {
    if (i < paid) return 'paid';
    if (i < paid + overdue) return 'overdue';
    return 'pending';
  });

  return (
    <div className={`flex items-center ${gap}`}>
      {dots.map((status, i) => (
        <span
          key={i}
          className={`${dotSize} rounded-full ${
            status === 'paid'
              ? 'bg-green-500'
              : status === 'overdue'
              ? 'bg-red-500'
              : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
}
