// store/useCanvasStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type BackgroundType = "solid" | "gradient" | "pattern" | "image";
export type GradientDirection = "horizontal" | "vertical" | "diagonal" | "radial";
export type PatternType = "dots" | "graph" | "diagonal" | "hexagons" | "circuit" | "noise";
export type CardBackground = "transparent" | "white" | "dark" | "glass";
export type BorderStyle = "none" | "solid" | "dashed" | "glow";
export type ShadowStyle = "none" | "soft" | "medium" | "hard";
export type FontFamily = "DM Sans" | "Inter" | "Geist" | "Mono" | "Serif";

export interface PresetTheme {
  id: string;
  name: string;
  background: Partial<CanvasBackground>;
  card: Partial<CardStyle>;
  typography: Partial<Typography>;
  isDark?: boolean;
}

export interface CanvasBackground {
  type: BackgroundType;
  solidColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientDirection: GradientDirection;
  pattern: PatternType;
  imageUrl: string;
  imageOpacity: number;
}

export interface CardStyle {
  background: CardBackground;
  borderStyle: BorderStyle;
  borderColor: string;
  shadow: ShadowStyle;
  borderRadius: number;
}

export interface Typography {
  fontFamily: FontFamily;
  baseFontSize: number;
  headingColor: string;
  bodyColor: string;
}

export const PRESET_THEMES: PresetTheme[] = [
  {
    id: "clean-white",
    name: "Clean White",
    background: { type: "solid", solidColor: "#F7F8FA" },
    card: { background: "white", borderStyle: "solid", borderColor: "#E4E7EC", shadow: "soft", borderRadius: 10 },
    typography: { fontFamily: "DM Sans", headingColor: "#101828", bodyColor: "#475467" },
  },
  {
    id: "dark-slate",
    name: "Dark Slate",
    isDark: true,
    background: { type: "solid", solidColor: "#1E1E2E" },
    card: { background: "dark", borderStyle: "solid", borderColor: "#383856", shadow: "medium", borderRadius: 10 },
    typography: { fontFamily: "DM Sans", headingColor: "#E2E8F0", bodyColor: "#94A3B8" },
  },
  {
    id: "midnight-blue",
    name: "Midnight Blue",
    isDark: true,
    background: { type: "solid", solidColor: "#0F1729" },
    card: { background: "glass", borderStyle: "solid", borderColor: "#1e3a5f", shadow: "medium", borderRadius: 14 },
    typography: { fontFamily: "DM Sans", headingColor: "#E2E8F0", bodyColor: "#94A3B8" },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    isDark: true,
    background: { type: "gradient", gradientStart: "#0A2F1E", gradientEnd: "#1a5c3a", gradientDirection: "diagonal" },
    card: { background: "glass", borderStyle: "solid", borderColor: "#2d7a50", shadow: "soft", borderRadius: 12 },
    typography: { fontFamily: "DM Sans", headingColor: "#D1FAE5", bodyColor: "#6EE7B7" },
  },
  {
    id: "warm-sand",
    name: "Warm Sand",
    background: { type: "gradient", gradientStart: "#FDF6EC", gradientEnd: "#F5E6CC", gradientDirection: "vertical" },
    card: { background: "white", borderStyle: "solid", borderColor: "#E8D5B7", shadow: "soft", borderRadius: 10 },
    typography: { fontFamily: "DM Sans", headingColor: "#78350F", bodyColor: "#92400E" },
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    background: { type: "gradient", gradientStart: "#FFF1F2", gradientEnd: "#FFE4E6", gradientDirection: "diagonal" },
    card: { background: "white", borderStyle: "solid", borderColor: "#FECDD3", shadow: "soft", borderRadius: 12 },
    typography: { fontFamily: "DM Sans", headingColor: "#881337", bodyColor: "#BE123C" },
  },
  {
    id: "neon-cyber",
    name: "Neon Cyber",
    isDark: true,
    background: { type: "solid", solidColor: "#09090F" },
    card: { background: "glass", borderStyle: "glow", borderColor: "#7C3AED", shadow: "hard", borderRadius: 8 },
    typography: { fontFamily: "Mono", headingColor: "#E9D5FF", bodyColor: "#A78BFA" },
  },
  {
    id: "blueprint",
    name: "Blueprint",
    isDark: true,
    background: { type: "pattern", solidColor: "#0A1929", pattern: "graph" },
    card: { background: "dark", borderStyle: "solid", borderColor: "#1565C0", shadow: "medium", borderRadius: 6 },
    typography: { fontFamily: "Mono", headingColor: "#E3F2FD", bodyColor: "#90CAF9" },
  },
  {
    id: "paper",
    name: "Paper",
    background: { type: "pattern", solidColor: "#FAFAF7", pattern: "noise" },
    card: { background: "white", borderStyle: "solid", borderColor: "#D6D3D1", shadow: "soft", borderRadius: 8 },
    typography: { fontFamily: "Serif", headingColor: "#1C1917", bodyColor: "#57534E" },
  },
  {
    id: "ocean",
    name: "Ocean",
    isDark: true,
    background: { type: "gradient", gradientStart: "#0C4A6E", gradientEnd: "#0E7490", gradientDirection: "diagonal" },
    card: { background: "glass", borderStyle: "solid", borderColor: "#0891B2", shadow: "medium", borderRadius: 12 },
    typography: { fontFamily: "DM Sans", headingColor: "#E0F7FA", bodyColor: "#80DEEA" },
  },
  {
    id: "sunset",
    name: "Sunset",
    background: { type: "gradient", gradientStart: "#FFF7ED", gradientEnd: "#FFDDB4", gradientDirection: "diagonal" },
    card: { background: "white", borderStyle: "solid", borderColor: "#FDBA74", shadow: "soft", borderRadius: 12 },
    typography: { fontFamily: "DM Sans", headingColor: "#7C2D12", bodyColor: "#9A3412" },
  },
  {
    id: "monochrome",
    name: "Monochrome",
    background: { type: "solid", solidColor: "#F5F5F5" },
    card: { background: "white", borderStyle: "solid", borderColor: "#D1D5DB", shadow: "none", borderRadius: 4 },
    typography: { fontFamily: "Inter", headingColor: "#111827", bodyColor: "#6B7280" },
  },
];

interface CanvasState {
  background: CanvasBackground;
  card: CardStyle;
  typography: Typography;
  isDarkMode: boolean;
  isSettingsOpen: boolean;
  activePresetId: string;
  isEmergencyMode: boolean;
  mobileMenuOpen: boolean;

  setBackground: (bg: Partial<CanvasBackground>) => void;
  setCard: (card: Partial<CardStyle>) => void;
  setTypography: (typo: Partial<Typography>) => void;
  applyPreset: (presetId: string) => void;
  toggleDarkMode: () => void;
  setSettingsOpen: (open: boolean) => void;
  setEmergencyMode: (active: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  exportTheme: () => string;
  importTheme: (json: string) => void;
}

const DEFAULT_BG: CanvasBackground = {
  type: "solid",
  solidColor: "#F7F8FA",
  gradientStart: "#1D9E75",
  gradientEnd: "#533AB9",
  gradientDirection: "diagonal",
  pattern: "dots",
  imageUrl: "",
  imageOpacity: 0.5,
};

const DEFAULT_CARD: CardStyle = {
  background: "white",
  borderStyle: "solid",
  borderColor: "#E4E7EC",
  shadow: "soft",
  borderRadius: 10,
};

const DEFAULT_TYPO: Typography = {
  fontFamily: "DM Sans",
  baseFontSize: 14,
  headingColor: "#101828",
  bodyColor: "#475467",
};

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      background: DEFAULT_BG,
      card: DEFAULT_CARD,
      typography: DEFAULT_TYPO,
      isDarkMode: false,
      isSettingsOpen: false,
      activePresetId: "clean-white",
      isEmergencyMode: false,
      mobileMenuOpen: false,

      setBackground: (bg) => set((s) => ({ background: { ...s.background, ...bg } })),
      setCard: (card) => set((s) => ({ card: { ...s.card, ...card } })),
      setTypography: (typo) => set((s) => ({ typography: { ...s.typography, ...typo } })),

      applyPreset: (presetId) => {
        const preset = PRESET_THEMES.find((p) => p.id === presetId);
        if (!preset) return;
        set((s) => ({
          background: { ...s.background, ...preset.background },
          card: { ...s.card, ...preset.card },
          typography: { ...s.typography, ...preset.typography },
          isDarkMode: preset.isDark ?? false,
          activePresetId: presetId,
        }));
      },

      toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setEmergencyMode: (active) => set({ isEmergencyMode: active }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

      exportTheme: () => {
        const { background, card, typography, isDarkMode } = get();
        return JSON.stringify({ background, card, typography, isDarkMode }, null, 2);
      },

      importTheme: (json) => {
        try {
          const theme = JSON.parse(json);
          set({
            background: { ...DEFAULT_BG, ...theme.background },
            card: { ...DEFAULT_CARD, ...theme.card },
            typography: { ...DEFAULT_TYPO, ...theme.typography },
            isDarkMode: theme.isDarkMode ?? false,
          });
        } catch {
          console.error("Invalid theme JSON");
        }
      },
    }),
    { name: "datalens-canvas", storage: createJSONStorage(() => localStorage) }
  )
);
