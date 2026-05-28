"use client";

import { useState } from "react";
import { X, Trash2, Settings2, Plus, Code } from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import type { ChartConfig, ChartType, AggFunction, ConditionalFormatRule } from "@/store/useDataStore";
import { generateId } from "@/lib/utils";
import { COLOR_PALETTES } from "@/lib/chartBuilder";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import { useCanvasStore } from "@/store/useCanvasStore";

const CHART_TYPE_OPTIONS: Array<{ value: ChartType; label: string }> = [
  { value: "bar", label: "Bar Chart" },
  { value: "stackedBar", label: "Stacked Bar" },
  { value: "horizontalBar", label: "Horizontal Bar" },
  { value: "line", label: "Line Chart" },
  { value: "multiLine", label: "Multi-Line" },
  { value: "area", label: "Area Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "donut", label: "Donut Chart" },
  { value: "scatter", label: "Scatter Plot" },
  { value: "heatmap", label: "Heatmap" },
  { value: "kpi", label: "KPI Card" },
  { value: "table", label: "Data Table" },
  { value: "filter", label: "Filter Widget" },
  { value: "text", label: "Text / Markdown" },
];

export default function WidgetConfigPanel() {
  const { charts, selectedChartId, updateChart, removeChart, setSelectedChart, datasets } = useDataStore();
  const chart = charts.find((c) => c.id === selectedChartId);
  const [section, setSection] = useState<"data" | "style" | "format">("data");
  const { isDarkMode } = useCanvasStore();
  const [showPythonEditor, setShowPythonEditor] = useState(false);

  if (!chart) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <Settings2 className="w-8 h-8 text-text-tertiary mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-tertiary">Select a widget to configure it</p>
        </div>
      </div>
    );
  }

  const dataset = datasets.find((d) => d.id === chart.datasetId);
  const columns = dataset?.columns ?? [];
  const colNames = columns.map((c) => c.name);

  const selectedXColumn = columns.find((c) => c.name === chart.xColumn);
  const isDateColumn = !!(selectedXColumn?.type === "date" || 
                       chart.xColumn?.toLowerCase().includes("date") ||
                       chart.xColumn?.toLowerCase().includes("time") ||
                       chart.xColumn?.toLowerCase().includes("year"));

  const update = (updates: Partial<ChartConfig>) => updateChart(chart.id, updates);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="panel-header flex-shrink-0">
        <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-brand" />
          Widget Config
        </span>
        <div className="flex gap-1">
          <button onClick={() => removeChart(chart.id)} className="btn-icon text-red-400 hover:text-red-600" title="Delete widget">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setSelectedChart(null)} className="btn-icon text-text-tertiary hover:text-text-primary">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        {(["data","style","format"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={cn(
              "flex-1 py-2 text-xs font-medium capitalize border-b-2 transition-colors",
              section === s ? "text-brand border-brand" : "text-text-secondary border-transparent hover:text-text-primary"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Config content */}
      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
        {section === "data" && (
          <>
            <Field label="Title">
              <input value={chart.title} onChange={(e) => update({ title: e.target.value })} className="input" />
            </Field>

            <Field label="Subtitle">
              <input value={chart.subtitle ?? ""} onChange={(e) => update({ subtitle: e.target.value })} className="input" placeholder="Optional subtitle" />
            </Field>

            <Field label="Chart Type">
              <select value={chart.type} onChange={(e) => update({ type: e.target.value as ChartType })} className="input">
                {CHART_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Data Source">
              <select value={chart.datasetId} onChange={(e) => update({ datasetId: e.target.value })} className="input">
                {datasets.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
              </select>
            </Field>

            <Field label="Widget Python Transform">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPythonEditor(!showPythonEditor)}
                  className="btn-outline w-full text-xs py-1.5 h-8 gap-1.5"
                >
                  <Code className="w-3.5 h-3.5" />
                  {chart.pythonCode ? "Edit Python Script" : "Add Python Preprocessor"}
                </button>
                {showPythonEditor && (
                  <div className="border border-border rounded-lg overflow-hidden animate-slide-down">
                    <div className="p-2 border-b border-border bg-muted/20 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-text-secondary">Transform Scoped Data Slice</span>
                      <button onClick={() => update({ pythonCode: undefined })} className="text-red-500 hover:text-red-700 text-[10px]">Clear</button>
                    </div>
                    <div className="h-[200px]">
                      <Editor
                        height="100%"
                        language="python"
                        value={chart.pythonCode || "# Scoped data transform\n# df represents this widget's input data\n\nimport pandas as pd\nimport numpy as np\n\n# e.g., df = df[df['value'] > 100]\n"}
                        onChange={(val) => update({ pythonCode: val })}
                        theme={isDarkMode ? "vs-dark" : "light"}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 10,
                          lineNumbers: "on",
                          automaticLayout: true
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Field>

            {!["kpi","text","filter"].includes(chart.type) && (
              <>
                <Field label="X Axis / Category">
                  <select value={chart.xColumn ?? ""} onChange={(e) => update({ xColumn: e.target.value })} className="input">
                    <option value="">Select column...</option>
                    {colNames.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>

                {isDateColumn && (
                  <Field label="Date Hierarchy Grain">
                    <select
                      value={chart.dateHierarchyGrain ?? ""}
                      onChange={(e) => update({ dateHierarchyGrain: e.target.value as any || undefined })}
                      className="input border-brand/50 bg-brand/[0.02]"
                    >
                      <option value="">Original values (No Hierarchy)</option>
                      <option value="year">Years (e.g., 2024)</option>
                      <option value="quarter">Quarters (e.g., 2024-Q1)</option>
                      <option value="month">Months (e.g., 2024-Jan)</option>
                      <option value="day">Days (e.g., 2024-05-28)</option>
                      <option value="weekday">Weekdays (e.g., Monday)</option>
                    </select>
                    <span className="text-[10px] text-brand font-medium mt-1 block">
                      ✨ Date hierarchy groupings active.
                    </span>
                  </Field>
                )}

                {!["pie","donut","heatmap"].includes(chart.type) || true ? (
                  <Field label="Y Axis / Value">
                    <select value={chart.yColumn ?? ""} onChange={(e) => update({ yColumn: e.target.value })} className="input">
                      <option value="">Select column...</option>
                      {colNames.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                ) : null}

                {["stackedBar","multiLine","scatter","heatmap"].includes(chart.type) && (
                  <Field label="Color By / Series">
                    <select value={chart.colorColumn ?? ""} onChange={(e) => update({ colorColumn: e.target.value })} className="input">
                      <option value="">None</option>
                      {colNames.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                )}

                <Field label="Aggregation">
                  <select value={chart.aggregation ?? "sum"} onChange={(e) => update({ aggregation: e.target.value as AggFunction })} className="input">
                    {["sum","avg","count","min","max","first","last"].map((a) => <option key={a}>{a}</option>)}
                  </select>
                </Field>
              </>
            )}

            {chart.type === "kpi" && (
              <>
                <Field label="Value Column">
                  <select value={chart.kpiValue ?? ""} onChange={(e) => update({ kpiValue: e.target.value })} className="input">
                    <option value="">Select...</option>
                    {colNames.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </>
            )}

            {chart.type === "text" && (
              <Field label="Content">
                <textarea
                  value={chart.textContent ?? ""}
                  onChange={(e) => update({ textContent: e.target.value })}
                  className="input h-32 resize-none"
                  placeholder="Enter text or Markdown..."
                />
              </Field>
            )}

            {chart.type === "filter" && (
              <Field label="Filter Column">
                <select value={chart.filterColumn ?? ""} onChange={(e) => update({ filterColumn: e.target.value })} className="input">
                  <option value="">Select...</option>
                  {colNames.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            )}
          </>
        )}

        {section === "style" && (
          <>
            <Field label="Color Palette">
              <div className="space-y-2">
                {Object.entries(COLOR_PALETTES).map(([name, colors]) => (
                  <button
                    key={name}
                    onClick={() => update({ colorTheme: name })}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-lg border transition-colors",
                      chart.colorTheme === name ? "border-brand bg-brand-50" : "border-border hover:border-brand/40"
                    )}
                  >
                    <div className="flex gap-0.5">
                      {colors.slice(0, 6).map((c) => (
                        <div key={c} className="w-3.5 h-3.5 rounded-sm" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="text-xs capitalize text-text-primary">{name}</span>
                  </button>
                ))}
              </div>
            </Field>

            <div className="space-y-3">
              <CheckboxField label="Show Legend" value={chart.showLegend ?? true} onChange={(v) => update({ showLegend: v })} />
              <CheckboxField label="Show Gridlines" value={chart.showGridlines ?? true} onChange={(v) => update({ showGridlines: v })} />
              <CheckboxField label="Show Labels" value={chart.showLabels ?? false} onChange={(v) => update({ showLabels: v })} />
              <CheckboxField label="Show Tooltips" value={chart.showTooltips ?? true} onChange={(v) => update({ showTooltips: v })} />
            </div>
          </>
        )}

        {section === "format" && chart.type === "table" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">Conditional Formatting</span>
              <button
                onClick={() => update({
                  conditionalFormats: [...(chart.conditionalFormats ?? []), {
                    id: generateId(), column: colNames[0] ?? "", operator: ">", value: "0", color: "#DC2626", backgroundColor: "#FEF2F2"
                  }]
                })}
                className="btn-ghost btn-sm gap-1"
              >
                <Plus className="w-3 h-3" /> Add Rule
              </button>
            </div>
            {(chart.conditionalFormats ?? []).map((rule) => (
              <div key={rule.id} className="panel p-3 space-y-2">
                <div className="flex gap-2">
                  <select value={rule.column} onChange={(e) => updateRule(chart, update, rule.id, { column: e.target.value })} className="input flex-1 text-xs">
                    {colNames.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <select value={rule.operator} onChange={(e) => updateRule(chart, update, rule.id, { operator: e.target.value as ConditionalFormatRule["operator"] })} className="input w-16 text-xs">
                    {[">","<","=","!=",">=","<="].map((op) => <option key={op}>{op}</option>)}
                  </select>
                  <input value={rule.value} onChange={(e) => updateRule(chart, update, rule.id, { value: e.target.value })} className="input w-20 text-xs" placeholder="value" />
                  <button onClick={() => update({ conditionalFormats: (chart.conditionalFormats ?? []).filter((r) => r.id !== rule.id) })} className="text-red-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-text-secondary">Text:</label>
                  <input type="color" value={rule.color} onChange={(e) => updateRule(chart, update, rule.id, { color: e.target.value })} className="w-7 h-7 rounded border border-border cursor-pointer" />
                  <label className="text-xs text-text-secondary">Background:</label>
                  <input type="color" value={rule.backgroundColor} onChange={(e) => updateRule(chart, update, rule.id, { backgroundColor: e.target.value })} className="w-7 h-7 rounded border border-border cursor-pointer" />
                </div>
              </div>
            ))}
          </div>
        )}

        {section === "format" && chart.type !== "table" && (
          <div className="text-center py-8 text-text-tertiary text-sm">
            Conditional formatting is available for Data Table widgets.
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-text-secondary mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function CheckboxField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-xs text-text-primary">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-9 h-5 rounded-full relative transition-colors duration-200",
          value ? "bg-brand" : "bg-gray-300"
        )}
      >
        <span className={cn(
          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
          value ? "translate-x-4" : "translate-x-0.5"
        )} />
      </button>
    </label>
  );
}

function updateRule(
  chart: ChartConfig,
  update: (u: Partial<ChartConfig>) => void,
  ruleId: string,
  changes: Partial<ConditionalFormatRule>
) {
  update({
    conditionalFormats: (chart.conditionalFormats ?? []).map((r) =>
      r.id === ruleId ? { ...r, ...changes } : r
    ),
  });
}
