import { useState, useRef, useEffect } from 'react';

interface SizeSliderProps {
  size: number;
  min?: number;
  max?: number;
  onChange: (size: number) => void;
  label?: string;
}

export function SizeSlider({
  size,
  min = 1,
  max = 50,
  onChange,
  label = 'Size',
}: SizeSliderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      {/* Size Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-dark-border hover:border-gray-600 transition-colors"
        title={label}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          <div
            className="rounded-full bg-white"
            style={{
              width: Math.max(4, Math.min(16, size)),
              height: Math.max(4, Math.min(16, size)),
            }}
          />
        </div>
        <span className="text-xs text-gray-300 min-w-[24px]">{size}px</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 w-48">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">{label}</span>
            <span className="text-xs text-white font-mono">{size}px</span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={min}
            max={max}
            value={size}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          {/* Quick Size Buttons */}
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-dark-border">
            {[1, 3, 5, 10, 20, 30].map((presetSize) => (
              <button
                key={presetSize}
                onClick={() => {
                  onChange(presetSize);
                }}
                className={`flex-1 py-1 text-xs rounded transition-colors ${
                  size === presetSize
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:bg-dark-hover hover:text-white'
                }`}
              >
                {presetSize}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
