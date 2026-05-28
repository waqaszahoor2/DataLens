"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Palette, X, Check, ChevronDown
} from "lucide-react";
import { useStore } from "@/lib/store";

const PRESET_COLORS = [
  { name: "White", value: "#FFFFFF" },
  { name: "Light Gray", value: "#F2F4F7" },
  { name: "Mint", value: "#E1F5EE" },
  { name: "Sky Blue", value: "#EBF5FF" },
  { name: "Lavender", value: "#F0EDFF" },
  { name: "Peach", value: "#FFF1ED" },
  { name: "Soft Yellow", value: "#FFFBEB" },
  { name: "Dark Navy", value: "#0D1B2A" },
  { name: "Dark Green", value: "#0A1F14" },
  { name: "Charcoal", value: "#1A1A2E" },
  { name: "Deep Purple", value: "#16002C" },
  { name: "Slate", value: "#1E293B" },
];

export default function CanvasBgPicker() {
  const { canvasBg, setCanvasBg } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [customHex, setCustomHex] = useState(canvasBg);

  const isDark = useMemo(() => {
    const hex = canvasBg.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }, [canvasBg]);

  const handleCustomHex = useCallback(() => {
    const hex = customHex.startsWith("#") ? customHex : `#${customHex}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setCanvasBg(hex);
    }
  }, [customHex, setCanvasBg]);

  return (
    <div className="relative">
      <button
        id="canvas-bg-picker-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="dl-btn-secondary gap-2 text-sm"
      >
        <div
          className="w-4 h-4 rounded-full border border-border flex-shrink-0"
          style={{ backgroundColor: canvasBg }}
        />
        <Palette className="w-4 h-4" />
        Canvas BG
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 dl-card p-4 w-72 shadow-panel animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-text1 text-sm">Canvas Background</h4>
            <button onClick={() => setIsOpen(false)} className="text-text3 hover:text-text1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Color grid */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                id={`bg-color-${color.name.replace(/\s/g, "-").toLowerCase()}`}
                onClick={() => setCanvasBg(color.value)}
                title={color.name}
                className="relative w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: color.value,
                  borderColor: canvasBg === color.value ? "#1D9E75" : "#E4E7EC",
                }}
              >
                {canvasBg === color.value && (
                  <div className={`absolute inset-0 flex items-center justify-center rounded-[6px]`}>
                    <Check className={`w-3 h-3 ${isDark ? "text-white" : "text-brand"}`} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom hex */}
          <div>
            <label className="dl-label text-xs">Custom Hex Color</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-border"
                  style={{ backgroundColor: canvasBg }}
                />
                <input
                  id="canvas-bg-custom-input"
                  type="text"
                  className="dl-input pl-8 font-mono text-sm"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomHex()}
                  placeholder="#FFFFFF"
                  maxLength={7}
                />
              </div>
              <button onClick={handleCustomHex} className="dl-btn-primary px-3">
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 p-2 rounded-lg text-center text-xs"
            style={{ backgroundColor: canvasBg, color: isDark ? "#fff" : "#101828", border: "1px solid #E4E7EC" }}
          >
            Preview: {canvasBg}
          </div>
        </div>
      )}
    </div>
  );
}
