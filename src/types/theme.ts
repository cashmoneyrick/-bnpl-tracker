export interface ThemeColors {
  accent: string;
  bg: string;
  card: string;
  text: string;
  border: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  colors: ThemeColors;
  isBuiltIn: boolean;
}

export interface ThemeState {
  activePresetId: string;
  customPresets: ThemePreset[];
}
