import type { ThemePreset } from '../types/theme';

export const BUILT_IN_PRESETS: ThemePreset[] = [
  {
    id: 'amber-terminal',
    name: 'Amber Terminal',
    colors: { accent: '#FFB000', bg: '#0B0E11', card: '#0F1215', text: '#C8CCD0', border: '#1E2328' },
    isBuiltIn: true,
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    colors: { accent: '#00D26A', bg: '#0A100E', card: '#0E1512', text: '#B8D4C8', border: '#1A2B22' },
    isBuiltIn: true,
  },
  {
    id: 'ice-blue',
    name: 'Ice Blue',
    colors: { accent: '#00BBFF', bg: '#0A0E14', card: '#0E1318', text: '#C0D4E0', border: '#1A2535' },
    isBuiltIn: true,
  },
  {
    id: 'rose-neon',
    name: 'Rose Neon',
    colors: { accent: '#FF3B7A', bg: '#110A0E', card: '#150E12', text: '#D4C0C8', border: '#2B1A22' },
    isBuiltIn: true,
  },
  {
    id: 'violet-haze',
    name: 'Violet Haze',
    colors: { accent: '#A855F7', bg: '#0E0A14', card: '#120E18', text: '#C8C0D8', border: '#221A30' },
    isBuiltIn: true,
  },
];

export const DEFAULT_PRESET_ID = 'amber-terminal';
