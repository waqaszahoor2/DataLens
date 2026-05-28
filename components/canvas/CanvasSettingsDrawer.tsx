"use client";

import { useState } from "react";
import {
  X, Palette, Download, Upload,
  RotateCcw, Check
} from "lucide-react";
import { useCanvasStore, PRESET_THEMES } from "@/store/useCanvasStore";
import type { BackgroundType, GradientDirection, PatternType, CardBackground, BorderStyle, ShadowStyle, FontFamily } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";

export default function CanvasSettingsDrawer() {
  const {
    background, card, typography, isDarkMode, activePresetId,
    setBackground, setCard, setTypography, applyPreset, toggleDarkMode,
    setSettingsOpen, exportTheme, importTheme,
  } = useCanvasStore();

  const [activeSection, setActiveSection] = useState<"presets" | "background" | "card" | "typography">("presets");

  const handleExport = () => {
    const json = exportTheme();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "datalens-theme.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        importTheme(ev.target?.result as string);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <>
      <div className="drawer-overlay" onClick={() => setSettingsOpen(false)} />
      <aside className="drawer animate-slide-in-right">
        {/* Header */}
        <div className="panel-header border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-brand" />
            <span className="text-sm font-semibold text-text-primary">Canvas Settings</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleImport} className="btn-icon text-text-secondary hover:text-brand" title="Import theme">
              <Upload className="w-4 h-4" />
            </button>
            <button onClick={handleExport} className="btn-icon text-text-secondary hover:text-brand" title="Export theme">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => setSettingsOpen(false)} className="btn-icon text-text-secondary hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {(["presets", "background", "card", "typography"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium capitalize transition-colors border-b-2",
                activeSection === s ? "text-brand border-brand" : "text-text-secondary border-transparent hover:text-text-primary"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
          {activeSection === "presets" && (
            <>
              <div>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Theme Presets</h4>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_THEMES.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset.id)}
                      className={cn(
                        "relative rounded-lg p-3 text-left border-2 transition-all duration-200 overflow-hidden",
                        activePresetId === preset.id ? "border-brand shadow-glow" : "border-border hover:border-brand/40"
                      )}
                      style={{
                        background: preset.background.type === "gradient"
                          ? `linear-gradient(135deg, ${preset.background.gradientStart}, ${preset.background.gradientEnd})`
                          : preset.background.solidColor ?? "#F7F8FA",
                      }}
                    >
                      <div className={cn(
                        "text-xs font-semibold",
                        preset.isDark ? "text-white" : "text-gray-900"
                      )}>
                        {preset.name}
                      </div>
                      {activePresetId === preset.id && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-brand rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dark mode toggle */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium text-text-primary">Dark Mode (UI)</span>
                <button
                  onClick={toggleDarkMode}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-colors duration-200",
                    isDarkMode ? "bg-brand" : "bg-gray-300"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                    isDarkMode ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
              </div>
            </>
          )}

          {activeSection === "background" && (
            <>
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Background Type</label>
                <div className="grid grid-cols-2 gap-1">
                  {(["solid", "gradient", "pattern", "image"] as BackgroundType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setBackground({ type })}
                      className={cn(
                        "py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors",
                        background.type === type ? "bg-brand text-white border-brand" : "bg-white text-text-secondary border-border hover:border-brand/40"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {background.type === "solid" && (
                <ColorPicker
                  label="Background Color"
                  value={background.solidColor}
                  onChange={(color) => setBackground({ solidColor: color })}
                />
              )}

              {background.type === "gradient" && (
                <>
                  <ColorPicker
                    label="Start Color"
                    value={background.gradientStart}
                    onChange={(color) => setBackground({ gradientStart: color })}
                  />
                  <ColorPicker
                    label="End Color"
                    value={background.gradientEnd}
                    onChange={(color) => setBackground({ gradientEnd: color })}
                  />
                  <div>
                    <label className="text-xs font-semibold text-text-secondary mb-2 block">Direction</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(["horizontal","vertical","diagonal","radial"] as GradientDirection[]).map((dir) => (
                        <button
                          key={dir}
                          onClick={() => setBackground({ gradientDirection: dir })}
                          className={cn(
                            "py-1 text-xs rounded border capitalize",
                            background.gradientDirection === dir ? "bg-brand text-white border-brand" : "bg-white text-text-secondary border-border"
                          )}
                        >
                          {dir}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {background.type === "pattern" && (
                <>
                  <ColorPicker
                    label="Background Color"
                    value={background.solidColor}
                    onChange={(color) => setBackground({ solidColor: color })}
                  />
                  <div>
                    <label className="text-xs font-semibold text-text-secondary mb-2 block">Pattern</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["dots","graph","diagonal","hexagons","circuit","noise"] as PatternType[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setBackground({ pattern: p })}
                          className={cn(
                            "py-1.5 text-xs rounded border capitalize",
                            background.pattern === p ? "bg-brand text-white border-brand" : "bg-white text-text-secondary border-border"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {activeSection === "card" && (
            <>
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Card Background</label>
                <div className="grid grid-cols-2 gap-1">
                  {(["white","transparent","dark","glass"] as CardBackground[]).map((bg) => (
                    <button
                      key={bg}
                      onClick={() => setCard({ background: bg })}
                      className={cn(
                        "py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors",
                        card.background === bg ? "bg-brand text-white border-brand" : "bg-white text-text-secondary border-border"
                      )}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary mb-2 block">Border Style</label>
                <div className="grid grid-cols-2 gap-1">
                  {(["none","solid","dashed","glow"] as BorderStyle[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCard({ borderStyle: s })}
                      className={cn("py-1 text-xs rounded border capitalize", card.borderStyle === s ? "bg-brand text-white border-brand" : "bg-white text-text-secondary border-border")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {card.borderStyle !== "none" && (
                <ColorPicker
                  label="Border Color"
                  value={card.borderColor}
                  onChange={(color) => setCard({ borderColor: color })}
                />
              )}

              <div>
                <label className="text-xs font-semibold text-text-secondary mb-2 block">Shadow</label>
                <div className="grid grid-cols-2 gap-1">
                  {(["none","soft","medium","hard"] as ShadowStyle[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCard({ shadow: s })}
                      className={cn("py-1 text-xs rounded border capitalize", card.shadow === s ? "bg-brand text-white border-brand" : "bg-white text-text-secondary border-border")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary mb-2 flex items-center justify-between">
                  Border Radius
                  <span className="text-text-tertiary">{card.borderRadius}px</span>
                </label>
                <input
                  type="range"
                  min={0} max={24} value={card.borderRadius}
                  onChange={(e) => setCard({ borderRadius: Number(e.target.value) })}
                  className="w-full accent-brand"
                />
              </div>
            </>
          )}

          {activeSection === "typography" && (
            <>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-2 block">Font Family</label>
                <div className="space-y-1">
                  {(["DM Sans","Inter","Geist","Mono","Serif"] as FontFamily[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTypography({ fontFamily: f })}
                      className={cn(
                        "w-full py-2 px-3 text-left text-sm rounded-lg border transition-colors",
                        typography.fontFamily === f ? "bg-brand-50 text-brand border-brand-200" : "bg-white text-text-primary border-border hover:border-brand/40"
                      )}
                      style={{ fontFamily: f === "Mono" ? "JetBrains Mono, monospace" : f === "Serif" ? "Georgia, serif" : f }}
                    >
                      {f} — The quick brown fox
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary mb-2 flex items-center justify-between">
                  Base Font Size
                  <span className="text-text-tertiary">{typography.baseFontSize}px</span>
                </label>
                <input
                  type="range"
                  min={11} max={18} value={typography.baseFontSize}
                  onChange={(e) => setTypography({ baseFontSize: Number(e.target.value) })}
                  className="w-full accent-brand"
                />
              </div>

              <ColorPicker
                label="Heading Color"
                value={typography.headingColor}
                onChange={(color) => setTypography({ headingColor: color })}
              />
              <ColorPicker
                label="Body Text Color"
                value={typography.bodyColor}
                onChange={(color) => setTypography({ bodyColor: color })}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <button
            onClick={() => {
              applyPreset("clean-white");
            }}
            className="btn-outline w-full gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
        </div>
      </aside>
    </>
  );
}

function ColorPicker({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-text-secondary mb-2 block">{label}</label>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg border border-border cursor-pointer flex-shrink-0 relative overflow-hidden"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input text-xs font-mono uppercase"
          placeholder="#FFFFFF"
          maxLength={7}
        />
      </div>
    </div>
  );
}
