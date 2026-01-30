import { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#ffffff', // White
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#6b7280', // Gray
];

export function ColorPicker({ color, onChange }: ColorPickerProps) {
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
      {/* Color Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-dark-border hover:border-gray-600 transition-colors"
        title="Stroke Color"
      >
        <div
          className="w-5 h-5 rounded border border-gray-600"
          style={{ backgroundColor: color }}
        />
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50">
          {/* Preset Colors */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                onClick={() => {
                  onChange(presetColor);
                  setIsOpen(false);
                }}
                className={`w-7 h-7 rounded-lg border-2 transition-all ${
                  color === presetColor
                    ? 'border-blue-500 scale-110'
                    : 'border-transparent hover:border-gray-500'
                }`}
                style={{ backgroundColor: presetColor }}
                title={presetColor}
              />
            ))}
          </div>

          {/* Custom Color Input */}
          <div className="flex items-center gap-2 pt-2 border-t border-dark-border">
            <label className="text-xs text-gray-400">Custom:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                  onChange(e.target.value);
                }
              }}
              className="flex-1 px-2 py-1 text-xs bg-dark-bg border border-dark-border rounded text-white font-mono"
              placeholder="#ffffff"
            />
          </div>
        </div>
      )}
    </div>
  );
}
