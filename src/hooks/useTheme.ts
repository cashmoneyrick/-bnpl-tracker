import { useCallback } from 'react';
import type { ThemeColors, ThemePreset } from '../types/theme';
import { BUILT_IN_PRESETS, DEFAULT_PRESET_ID } from '../constants/themes';

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function lightenHex(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function dimHex(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.substring(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.substring(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.substring(4, 6), 16) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function applyTheme(colors: ThemeColors) {
  const root = document.documentElement;
  const hover = lightenHex(colors.card, 0.04);
  const muted = dimHex(colors.text, 0.52);

  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-accent-rgb', hexToRgb(colors.accent));
  root.style.setProperty('--color-bg', colors.bg);
  root.style.setProperty('--color-bg-rgb', hexToRgb(colors.bg));
  root.style.setProperty('--color-card', colors.card);
  root.style.setProperty('--color-card-rgb', hexToRgb(colors.card));
  root.style.setProperty('--color-text', colors.text);
  root.style.setProperty('--color-text-rgb', hexToRgb(colors.text));
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-border-rgb', hexToRgb(colors.border));
  root.style.setProperty('--color-hover', hover);
  root.style.setProperty('--color-hover-rgb', hexToRgb(hover));
  root.style.setProperty('--color-muted', muted);
  root.style.setProperty('--color-muted-rgb', hexToRgb(muted));
}

export function resolvePreset(presetId: string, customPresets: ThemePreset[]): ThemePreset {
  const builtIn = BUILT_IN_PRESETS.find(p => p.id === presetId);
  if (builtIn) return builtIn;
  const custom = customPresets.find(p => p.id === presetId);
  if (custom) return custom;
  return BUILT_IN_PRESETS.find(p => p.id === DEFAULT_PRESET_ID)!;
}

export function useTheme() {
  const apply = useCallback((colors: ThemeColors) => {
    applyTheme(colors);
  }, []);

  return { applyTheme: apply, resolvePreset };
}
