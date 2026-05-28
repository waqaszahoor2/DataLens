"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/topbar/Topbar";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useDataStore } from "@/store/useDataStore";
import { useDevice } from "@/lib/useDevice";
import { PRESET_THEMES } from "@/store/useCanvasStore";
import { Settings, Trash2, Download, Upload, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const {
    isDarkMode, toggleDarkMode, activePresetId, applyPreset,
    exportTheme, importTheme,
  } = useCanvasStore();
  const { clearSession } = useDataStore();
  const device = useDevice();

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
      reader.onload = (ev) => importTheme(ev.target?.result as string);
      reader.readAsText(file);
    };
    input.click();
  };

  const isMobile = device === "mobile";

  // Dynamic layout margins based on responsive sidebar collapse state
  const paddingLeftClass = isMobile
    ? "pl-0"
    : device === "tablet"
      ? "pl-14"
      : "pl-56 3xl:pl-64";

  return (
    <div className={cn("h-screen flex overflow-hidden", isDarkMode ? "bg-gray-950" : "bg-surface2")}>
      <Sidebar />

      <div className={cn("flex-grow flex flex-col min-w-0 transition-all duration-300", paddingLeftClass)}>
        <Topbar />

        <main className="flex-1 overflow-y-auto custom-scroll pt-[52px]">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8 pb-20">
            {/* Appearance */}
            <section>
              <h2 className={cn("text-sm md:text-base font-bold mb-3 flex items-center gap-2", isDarkMode ? "text-white" : "text-text-primary")}>
                <Settings className="w-4 h-4 text-brand" />
                Appearance Chrome
              </h2>
              <div className={cn("rounded-xl border p-4 space-y-4", isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border shadow-card")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn("text-xs md:text-sm font-semibold", isDarkMode ? "text-white" : "text-text-primary")}>Interface Dark Mode</p>
                    <p className={cn("text-[10px] md:text-xs mt-0.5", isDarkMode ? "text-gray-500" : "text-text-tertiary")}>Toggle the main dashboard UI theme chrome dark mode</p>
                  </div>
                  <button onClick={toggleDarkMode} className={cn("w-11 h-6 rounded-full relative transition-colors", isDarkMode ? "bg-brand" : "bg-gray-300")}>
                    <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform", isDarkMode ? "translate-x-6" : "translate-x-1")} />
                  </button>
                </div>
              </div>
            </section>

            {/* Theme Presets */}
            <section>
              <h2 className={cn("text-sm md:text-base font-bold mb-3", isDarkMode ? "text-white" : "text-text-primary")}>Canvas Themes Presets</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRESET_THEMES.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={cn(
                      "relative rounded-xl p-3 md:p-4 text-left border-2 transition-all duration-200 h-20 shadow-sm",
                      activePresetId === preset.id ? "border-brand ring-2 ring-brand/10" : "border-border hover:border-brand/40"
                    )}
                    style={{
                      background: preset.background.type === "gradient"
                        ? `linear-gradient(135deg, ${preset.background.gradientStart}, ${preset.background.gradientEnd})`
                        : preset.background.solidColor ?? "#F7F8FA",
                    }}
                  >
                    <div className={cn("text-[10px] md:text-xs font-bold truncate pr-4", preset.isDark ? "text-white" : "text-gray-900")}>
                      {preset.name}
                    </div>
                    {activePresetId === preset.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-brand rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Theme I/O */}
            <section>
              <h2 className={cn("text-sm md:text-base font-bold mb-3", isDarkMode ? "text-white" : "text-text-primary")}>Theme Import & Export</h2>
              <div className={cn("rounded-xl border p-4 space-y-3", isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border shadow-card")}>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={handleExport} className="py-2.5 px-4 border border-border hover:bg-muted text-xs font-bold rounded-lg flex-1 flex items-center justify-center gap-1.5 transition-all">
                    <Download className="w-4 h-4 text-brand" />
                    Export Theme file
                  </button>
                  <button onClick={handleImport} className="py-2.5 px-4 border border-border hover:bg-muted text-xs font-bold rounded-lg flex-1 flex items-center justify-center gap-1.5 transition-all">
                    <Upload className="w-4 h-4 text-brand" />
                    Import Theme file
                  </button>
                </div>
                <p className={cn("text-[10px] md:text-xs leading-normal", isDarkMode ? "text-gray-600" : "text-text-tertiary")}>
                  Theme files store canvas gradients, custom border styles, panel padding configurations, and base typeface variables.
                </p>
              </div>
            </section>

            {/* Data */}
            <section>
              <h2 className={cn("text-sm md:text-base font-bold mb-3", isDarkMode ? "text-white" : "text-text-primary")}>Clean Sessions Data</h2>
              <div className={cn("rounded-xl border p-4", isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border shadow-card")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn("text-xs md:text-sm font-semibold", isDarkMode ? "text-white" : "text-text-primary")}>Purge Session Data</p>
                    <p className={cn("text-[10px] md:text-xs mt-0.5", isDarkMode ? "text-gray-500" : "text-text-tertiary")}>Instantly clear active dataframes, pipelines and charts</p>
                  </div>
                  <button onClick={clearSession} className="py-2 px-3.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all border border-red-200">
                    <Trash2 className="w-4 h-4" />
                    Purge Data
                  </button>
                </div>
              </div>
            </section>

            {/* About */}
            <section>
              <div className={cn("rounded-xl border p-4 text-center", isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border shadow-card")}>
                <p className={cn("text-[10px] md:text-xs leading-relaxed", isDarkMode ? "text-gray-600" : "text-text-tertiary")}>
                  DataLens shell engine v2.0 · Professional Analytics Portal<br />
                  AI capabilities provided by Claude Claude Sonnet 3.5 · Powered by Vercel
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
