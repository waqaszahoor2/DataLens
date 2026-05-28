"use client";

import { useState, useMemo } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/topbar/Topbar";
import { useDataStore } from "@/store/useDataStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useDevice } from "@/lib/useDevice";
import { buildChartData, getChartColors } from "@/lib/chartBuilder";
import { generateChartTitle, COLOR_PALETTES } from "@/lib/chartBuilder";
import { generateId } from "@/lib/utils";
import type { ChartConfig, ChartType, AggFunction } from "@/store/useDataStore";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend
} from "recharts";
import { BarChart3, Save, RefreshCcw, ArrowLeft, ArrowRight, Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CHART_TYPES: Array<{ value: ChartType; label: string }> = [
  { value: "bar", label: "Bar Chart" },
  { value: "stackedBar", label: "Stacked Bar" },
  { value: "horizontalBar", label: "Horiz. Bar" },
  { value: "line", label: "Line Graph" },
  { value: "area", label: "Area Fill" },
  { value: "multiLine", label: "Multi-Line" },
  { value: "pie", label: "Pie Circle" },
  { value: "donut", label: "Donut" },
  { value: "scatter", label: "Scatter" },
  { value: "kpi", label: "KPI Indicator" },
];

export default function BuilderPage() {
  const { datasets, activeDatasetId, addChart } = useDataStore();
  const { isDarkMode } = useCanvasStore();
  const device = useDevice();

  const dataset = datasets.find((d) => d.id === activeDatasetId);
  const colNames = dataset?.columns.map((c) => c.name) ?? [];
  const numCols = dataset?.columns.filter((c) => c.type === "number").map((c) => c.name) ?? [];

  // Mobile Stepper State
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  const [config, setConfig] = useState<Partial<ChartConfig>>({
    type: "bar",
    title: "My Chart",
    aggregation: "sum",
    showLegend: false,
    showGridlines: true,
    showTooltips: true,
    colorTheme: "default",
    datasetId: activeDatasetId ?? "",
    xColumn: colNames[0] || "",
    yColumn: numCols[0] || "",
    w: 4,
    h: 3,
  });

  const update = (u: Partial<ChartConfig>) => setConfig((c) => ({ ...c, ...u }));

  const data = useMemo(() => dataset?.transformedData ?? [], [dataset]);
  const colors = getChartColors(config.colorTheme);
  const { data: chartData } = useMemo(() =>
    buildChartData(config as ChartConfig, data, {}),
    [config, data]
  );

  const handleSaveToDashboard = () => {
    if (!dataset) return;
    addChart({
      id: generateId(),
      type: config.type ?? "bar",
      title: config.title ?? generateChartTitle(config.type ?? "bar", config.xColumn, config.yColumn),
      subtitle: config.subtitle,
      datasetId: dataset.id,
      xColumn: config.xColumn,
      yColumn: config.yColumn,
      colorColumn: config.colorColumn,
      aggregation: config.aggregation ?? "sum",
      showLegend: config.showLegend,
      showGridlines: config.showGridlines,
      showTooltips: config.showTooltips,
      colorTheme: config.colorTheme,
      w: config.w ?? 4,
      h: config.h ?? 3,
    });
    toast.success("Successfully saved to your dashboard canvas!");
  };

  const renderPreview = () => {
    const props = { data: chartData, margin: { top: 10, right: 10, bottom: 10, left: 0 } };
    const chartHeight = device === "mobile" ? 220 : 280;

    switch (config.type) {
      case "bar":
      case "horizontalBar":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart {...props} layout={config.type === "horizontalBar" ? "vertical" : "horizontal"}>
              {config.showGridlines && <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />}
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              {config.showTooltips && <Tooltip />}
              {config.showLegend && <Legend wrapperStyle={{ fontSize: 9 }} />}
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart {...props}>
              {config.showGridlines && <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />}
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              {config.showTooltips && <Tooltip />}
              <Line dataKey="value" stroke={colors[0]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart {...props}>
              {config.showGridlines && <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />}
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              {config.showTooltips && <Tooltip />}
              <Area dataKey="value" stroke={colors[0]} fill={colors[0] + "30"} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "pie":
      case "donut":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={config.type === "donut" ? "55%" : 0} outerRadius="80%" dataKey="value">
                {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              {config.showTooltips && <Tooltip />}
              {config.showLegend !== false && <Legend wrapperStyle={{ fontSize: 9 }} />}
            </PieChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ScatterChart {...props}>
              {config.showGridlines && <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />}
              <XAxis dataKey="x" tick={{ fontSize: 10 }} />
              <YAxis dataKey="y" tick={{ fontSize: 10 }} />
              {config.showTooltips && <Tooltip />}
              <Scatter data={chartData} fill={colors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="flex items-center justify-center h-52 text-text-tertiary">
            <BarChart3 className="w-12 h-12 opacity-20 animate-pulse" />
          </div>
        );
    }
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

        <main className="flex-grow overflow-hidden flex pt-[52px]">
          {/* A. MOBILE / SMARTPHONE LAYOUT FLOW (< 640px) */}
          {isMobile ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-950">
              {/* Stepper Progress Indicator */}
              <div className="flex items-center justify-between border-b px-4 py-2.5 bg-muted/30 text-xs">
                {[1, 2, 3, 4].map((stepNum) => (
                  <button
                    key={stepNum}
                    onClick={() => setActiveStep(stepNum as any)}
                    className={cn(
                      "flex items-center gap-1 font-bold pb-1 border-b-2 transition-all",
                      activeStep === stepNum ? "border-brand text-brand" : "border-transparent text-text-tertiary"
                    )}
                  >
                    <span>Step {stepNum}</span>
                  </button>
                ))}
              </div>

              {/* Step Main Viewport Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {activeStep === 1 && (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">1. Select Chart Visual Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CHART_TYPES.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => {
                            update({ type: value });
                            toast.success(`Selected ${label}!`);
                          }}
                          className={cn(
                            "py-3 px-3 text-xs rounded-xl border font-bold transition-all text-center flex flex-col items-center justify-center gap-1.5",
                            config.type === value ? "bg-brand text-white border-brand shadow" : "bg-white text-text-secondary border-border"
                          )}
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">2. Data Axis Configurations</label>
                    
                    <div>
                      <label className="text-xs font-semibold text-text-secondary mb-1 block">Title</label>
                      <input value={config.title ?? ""} onChange={(e) => update({ title: e.target.value })} className="input py-3" placeholder="Enter chart name" />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-secondary mb-1 block">X Axis Data Column</label>
                      <select value={config.xColumn ?? ""} onChange={(e) => update({ xColumn: e.target.value })} className="input select py-3">
                        <option value="">Select column...</option>
                        {colNames.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-secondary mb-1 block">Y Axis Data Column</label>
                      <select value={config.yColumn ?? ""} onChange={(e) => update({ yColumn: e.target.value })} className="input select py-3">
                        <option value="">Select column...</option>
                        {colNames.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-secondary mb-1 block">Calculation Aggregation</label>
                      <select value={config.aggregation ?? "sum"} onChange={(e) => update({ aggregation: e.target.value as AggFunction })} className="input select py-3">
                        {["sum","avg","count","min","max"].map((a) => <option key={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">3. Aesthetic Color Styles</label>
                    <div className="space-y-2">
                      {Object.entries(COLOR_PALETTES).map(([name, paletteColors]) => (
                        <button
                          key={name}
                          onClick={() => update({ colorTheme: name })}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                            config.colorTheme === name ? "border-brand bg-brand-50/30 text-brand font-bold" : "border-border hover:border-brand/40"
                          )}
                        >
                          <span className="text-xs capitalize">{name} Palette</span>
                          <div className="flex gap-0.5">
                            {paletteColors.slice(0, 5).map((c) => <div key={c} className="w-3.5 h-3.5 rounded-sm" style={{ background: c }} />)}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3 pt-3 border-t">
                      {[
                        { label: "Show Legend Label", key: "showLegend" },
                        { label: "Show Gridlines Background", key: "showGridlines" },
                        { label: "Show Tooltips Interaction", key: "showTooltips" },
                      ].map(({ label, key }) => (
                        <label key={key} className="flex items-center justify-between cursor-pointer py-1">
                          <span className="text-xs font-medium text-text-primary">{label}</span>
                          <button
                            onClick={() => update({ [key]: !config[key as keyof typeof config] })}
                            className={cn(
                              "w-10 h-6 rounded-full relative transition-colors",
                              config[key as keyof typeof config] ? "bg-brand" : "bg-gray-300"
                            )}
                          >
                            <span className={cn(
                              "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                              config[key as keyof typeof config] ? "translate-x-4.5" : "translate-x-0.5"
                            )} />
                          </button>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {activeStep === 4 && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">4. Final Visual Preview</label>
                    <div className={cn(
                      "rounded-xl border p-4 shadow-card",
                      isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border"
                    )}>
                      {!dataset ? (
                        <div className="flex items-center justify-center h-48 text-text-tertiary text-xs">
                          No pipeline data loaded.
                        </div>
                      ) : renderPreview()}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleSaveToDashboard}
                        disabled={!dataset}
                        className="py-3.5 bg-brand hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-4 h-4" />
                        Save widget to dashboard
                      </button>

                      <button
                        onClick={() => update({ xColumn: colNames[0], yColumn: numCols[0] })}
                        className="py-3 bg-muted text-text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <RefreshCcw className="w-4 h-4" />
                        Reset Axis Defaults
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Bottom Stepper Navigation Bar */}
              <div className="fixed bottom-0 inset-x-0 h-16 bg-white dark:bg-gray-950 border-t border-border flex items-center justify-between px-4 z-40">
                <button
                  onClick={() => setActiveStep(s => Math.max(1, s - 1) as any)}
                  disabled={activeStep === 1}
                  className="btn-secondary gap-1 disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                {activeStep < 4 ? (
                  <button
                    onClick={() => setActiveStep(s => Math.min(4, s + 1) as any)}
                    className="btn-primary gap-1"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSaveToDashboard}
                    disabled={!dataset}
                    className="py-2.5 px-4 bg-brand text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow"
                  >
                    <Check className="w-4 h-4" />
                    Save & Done
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* B. TABLET & DESKTOP DUAL VIEW LAYOUT */
            <>
              {/* Config Panel */}
              <div className={cn(
                "flex-shrink-0 border-r overflow-y-auto custom-scroll p-4 space-y-4 transition-all duration-300",
                isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border",
                device === "tablet" ? "w-[260px]" : "w-72" // tablet layout has 260px width
              )}>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1.5 block uppercase tracking-wider">Chart Type</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CHART_TYPES.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => update({ type: value })}
                        className={cn(
                          "py-2 text-xs rounded-lg border font-semibold transition-colors",
                          config.type === value ? "bg-brand text-white border-brand shadow-sm" : "bg-white text-text-secondary border-border hover:border-brand/40"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1.5 block">Title</label>
                  <input value={config.title ?? ""} onChange={(e) => update({ title: e.target.value })} className="input" />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1.5 block">Dataset</label>
                  <select value={config.datasetId ?? ""} onChange={(e) => update({ datasetId: e.target.value })} className="input select">
                    {datasets.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block">X Axis</label>
                    <select value={config.xColumn ?? ""} onChange={(e) => update({ xColumn: e.target.value })} className="input select">
                      <option value="">Select...</option>
                      {colNames.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block">Y Axis</label>
                    <select value={config.yColumn ?? ""} onChange={(e) => update({ yColumn: e.target.value })} className="input select">
                      <option value="">Select...</option>
                      {colNames.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1.5 block">Aggregation</label>
                  <select value={config.aggregation ?? "sum"} onChange={(e) => update({ aggregation: e.target.value as AggFunction })} className="input select">
                    {["sum","avg","count","min","max"].map((a) => <option key={a}>{a}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary mb-2 block">Color Palette</label>
                  {Object.entries(COLOR_PALETTES).map(([name, colorsList]) => (
                    <button
                      key={name}
                      onClick={() => update({ colorTheme: name })}
                      className={cn(
                        "w-full flex items-center justify-between p-2 mb-1.5 rounded-lg border transition-colors",
                        config.colorTheme === name ? "border-brand bg-brand-50" : "border-border hover:border-brand/40"
                      )}
                    >
                      <span className="text-xs capitalize">{name}</span>
                      <div className="flex gap-0.5">
                        {colorsList.slice(0, 4).map((c) => <div key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />)}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  {[
                    { label: "Show Legend", key: "showLegend" },
                    { label: "Show Gridlines", key: "showGridlines" },
                    { label: "Show Tooltips", key: "showTooltips" },
                  ].map(({ label, key }) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs text-text-primary">{label}</span>
                      <button
                        onClick={() => update({ [key]: !config[key as keyof typeof config] })}
                        className={cn(
                          "w-9 h-5 rounded-full relative transition-colors",
                          config[key as keyof typeof config] ? "bg-brand" : "bg-gray-300"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                          config[key as keyof typeof config] ? "translate-x-4" : "translate-x-0.5"
                        )} />
                      </button>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview Dashboard Area */}
              <div className="flex-1 overflow-auto custom-scroll p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className={cn(
                    "rounded-xl border p-4 shadow-card",
                    isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border"
                  )}>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className={cn("text-xs font-bold uppercase tracking-wide", isDarkMode ? "text-white" : "text-text-primary")}>
                        {config.title || "Chart Preview"}
                      </h2>
                    </div>
                    {!dataset ? (
                      <div className="flex items-center justify-center h-64 text-text-tertiary text-xs">
                        Import a dataset first to preview charts
                      </div>
                    ) : renderPreview()}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => update({ xColumn: colNames[0], yColumn: numCols[0] })}
                      className="btn-secondary gap-2"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Reset Axes
                    </button>
                    <button
                      onClick={handleSaveToDashboard}
                      disabled={!dataset}
                      className="btn-primary gap-2 flex-1"
                    >
                      <Save className="w-4 h-4" />
                      Save to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
