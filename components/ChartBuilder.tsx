"use client";

import { useState, useMemo, useCallback } from "react";
import { useStore, type ChartConfig, type ChartType, type Row } from "@/lib/store";
import { generateId, formatNumber } from "@/lib/utils";
import {
  BarChart2, TrendingUp, Circle, ScatterChart,
  Plus, X, Settings2,
  Activity
} from "lucide-react";

const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: "bar", label: "Bar", icon: <BarChart2 className="w-4 h-4" /> },
  { type: "line", label: "Line", icon: <TrendingUp className="w-4 h-4" /> },
  { type: "area", label: "Area", icon: <Activity className="w-4 h-4" /> },
  { type: "scatter", label: "Scatter", icon: <ScatterChart className="w-4 h-4" /> },
  { type: "pie", label: "Pie", icon: <Circle className="w-4 h-4" /> },
  { type: "donut", label: "Donut", icon: <Circle className="w-4 h-4" /> },
  { type: "histogram", label: "Histogram", icon: <BarChart2 className="w-4 h-4" /> },
];

// ─── Dynamic chart renderer using Recharts ─────────────────────────────────

function ChartRenderer({
  config,
  data,
  canvasBg,
}: {
  config: ChartConfig;
  data: Row[];
  canvasBg: string;
}) {
  const isDark = useMemo(() => {
    const hex = canvasBg.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16) || 255;
    const g = parseInt(hex.slice(2, 4), 16) || 255;
    const b = parseInt(hex.slice(4, 6), 16) || 255;
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }, [canvasBg]);

  const textColor = isDark ? "#e2e8f0" : "#475467";
  const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";

  const chartData = useMemo(() => {
    if (!config.xColumn) return [];
    const grouped = new Map<string, number[]>();
    for (const row of data) {
      const key = String(row[config.xColumn] ?? "Unknown");
      const val = config.yColumn ? Number(row[config.yColumn] || 0) : 1;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(val);
    }
    return Array.from(grouped.entries())
      .map(([name, vals]) => ({
        name,
        value: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)),
        total: parseFloat(vals.reduce((a, b) => a + b, 0).toFixed(2)),
        count: vals.length,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }, [data, config.xColumn, config.yColumn]);

  const scatterData = useMemo(() => {
    if (config.type !== "scatter" || !config.xColumn || !config.yColumn) return [];
    return data
      .slice(0, 500)
      .map((row) => ({
        x: Number(row[config.xColumn!] || 0),
        y: Number(row[config.yColumn!] || 0),
      }))
      .filter((d) => !isNaN(d.x) && !isNaN(d.y));
  }, [data, config.type, config.xColumn, config.yColumn]);

  const COLORS = ["#1D9E75", "#185FA5", "#854F0B", "#A32D2D", "#5DCAA5", "#8B5CF6", "#F59E0B", "#EC4899"];

  if (!config.xColumn) {
    return (
      <div className="flex items-center justify-center h-full text-text3 text-sm">
        <div className="text-center">
          <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Configure chart columns in the settings panel</p>
        </div>
      </div>
    );
  }

  // Render using SVG for a lightweight chart (no recharts required at bundle time)
  if (config.type === "bar" || config.type === "histogram") {
    const maxVal = Math.max(...chartData.map((d) => d.total), 1);
    const barW = Math.max(8, Math.min(40, 400 / chartData.length - 4));

    return (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: canvasBg }}>
        <div className="flex-1 overflow-hidden px-2 pt-2">
          <svg width="100%" height="100%" viewBox={`0 0 400 200`} preserveAspectRatio="xMidYMid meet">
            {chartData.map((d, i) => {
              const x = 30 + i * (400 / chartData.length);
              const barHeight = (d.total / maxVal) * 160;
              const y = 170 - barHeight;
              return (
                <g key={d.name}>
                  <rect x={x} y={y} width={barW} height={barHeight}
                    fill={COLORS[i % COLORS.length]} rx={2} opacity={0.9} />
                  <text x={x + barW / 2} y={185} textAnchor="middle" fontSize={7} fill={textColor}>
                    {d.name.slice(0, 8)}
                  </text>
                  <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={7} fill={textColor} fontWeight="600">
                    {formatNumber(d.total)}
                  </text>
                </g>
              );
            })}
            <line x1={30} y1={10} x2={30} y2={170} stroke={gridColor} strokeWidth={1} />
            <line x1={30} y1={170} x2={400} y2={170} stroke={gridColor} strokeWidth={1} />
          </svg>
        </div>
      </div>
    );
  }

  if (config.type === "pie" || config.type === "donut") {
    const total = chartData.reduce((a, d) => a + d.total, 0);
    let startAngle = -90;
    const cx = 150, cy = 100, r = config.type === "donut" ? 65 : 75;
    const innerR = config.type === "donut" ? 35 : 0;

    const slices = chartData.slice(0, 8).map((d, i) => {
      const angle = (d.total / total) * 360;
      const start = startAngle;
      startAngle += angle;
      const startRad = (start * Math.PI) / 180;
      const endRad = (startAngle * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const ix1 = cx + innerR * Math.cos(startRad);
      const iy1 = cy + innerR * Math.sin(startRad);
      const ix2 = cx + innerR * Math.cos(endRad);
      const iy2 = cy + innerR * Math.sin(endRad);
      const large = angle > 180 ? 1 : 0;
      const d_path = config.type === "donut"
        ? `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return { ...d, path: d_path, color: COLORS[i % COLORS.length], pct: ((d.total / total) * 100).toFixed(1) };
    });

    return (
      <div className="w-full h-full flex" style={{ backgroundColor: canvasBg }}>
        <svg width="50%" height="100%" viewBox="0 0 300 200">
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} stroke={canvasBg} strokeWidth={1.5} />
          ))}
          {config.type === "donut" && (
            <text x={cx} y={cy + 5} textAnchor="middle" fontSize={10} fill={textColor} fontWeight="600">
              {chartData.length} items
            </text>
          )}
        </svg>
        <div className="w-1/2 overflow-y-auto py-2">
          {slices.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 mb-1 px-2">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs truncate flex-1" style={{ color: textColor }}>{s.name}</span>
              <span className="text-xs font-mono font-semibold" style={{ color: textColor }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (config.type === "line" || config.type === "area") {
    const maxVal = Math.max(...chartData.map((d) => d.total), 1);
    const points = chartData.map((d, i) => ({
      x: 30 + (i / Math.max(chartData.length - 1, 1)) * 360,
      y: 170 - (d.total / maxVal) * 150,
      name: d.name,
      val: d.total,
    }));
    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${pathD} L ${points[points.length - 1]?.x ?? 390} 170 L ${points[0]?.x ?? 30} 170 Z`;

    return (
      <div className="w-full h-full" style={{ backgroundColor: canvasBg }}>
        <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
          {config.type === "area" && (
            <path d={areaD} fill="#1D9E75" opacity={0.15} />
          )}
          <path d={pathD} stroke="#1D9E75" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#1D9E75" />
          ))}
          <line x1={30} y1={170} x2={390} y2={170} stroke={gridColor} strokeWidth={1} />
        </svg>
      </div>
    );
  }

  if (config.type === "scatter") {
    const xs = scatterData.map((d) => d.x);
    const ys = scatterData.map((d) => d.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs) || 1;
    const yMin = Math.min(...ys), yMax = Math.max(...ys) || 1;
    return (
      <div className="w-full h-full" style={{ backgroundColor: canvasBg }}>
        <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
          {scatterData.slice(0, 200).map((d, i) => (
            <circle
              key={i}
              cx={30 + ((d.x - xMin) / (xMax - xMin)) * 360}
              cy={170 - ((d.y - yMin) / (yMax - yMin)) * 150}
              r={3}
              fill="#1D9E75"
              opacity={0.6}
            />
          ))}
          <line x1={30} y1={170} x2={390} y2={170} stroke={gridColor} strokeWidth={1} />
          <line x1={30} y1={10} x2={30} y2={170} stroke={gridColor} strokeWidth={1} />
        </svg>
      </div>
    );
  }

  return <div className="flex items-center justify-center h-full text-text3 text-sm">Chart type coming soon</div>;
}

// ─── Single Chart Panel ────────────────────────────────────────────────────

function ChartPanel({
  config,
  data,
  canvasBg,
  onUpdate,
  onRemove,
}: {
  config: ChartConfig;
  data: Row[];
  canvasBg: string;
  onUpdate: (updates: Partial<ChartConfig>) => void;
  onRemove: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const columns = Object.keys(data[0] || {});
  const numericCols = columns.filter((c) => {
    const vals = data.slice(0, 10).map((r) => r[c]);
    return vals.some((v) => typeof v === "number");
  });

  return (
    <div className="dl-card overflow-hidden flex flex-col h-full group" style={{ backgroundColor: canvasBg }}>
      {/* Chart header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-white/90 backdrop-blur-sm">
        <input
          className="text-sm font-semibold text-text1 flex-1 bg-transparent border-none outline-none focus:bg-surface2 rounded px-1 py-0.5"
          value={config.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg hover:bg-surface2 text-text3 hover:text-text1 transition-colors"
            title="Configure"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-50 text-text3 hover:text-danger transition-colors"
            title="Remove chart"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white border-b border-border p-3 grid grid-cols-2 gap-2">
          <div>
            <label className="dl-label text-xs">Chart Type</label>
            <select
              className="dl-input text-xs"
              value={config.type}
              onChange={(e) => onUpdate({ type: e.target.value as ChartType })}
            >
              {CHART_TYPES.map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="dl-label text-xs">X / Category Column</label>
            <select
              className="dl-input text-xs"
              value={config.xColumn || ""}
              onChange={(e) => onUpdate({ xColumn: e.target.value })}
            >
              <option value="">Select...</option>
              {columns.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {config.type !== "pie" && config.type !== "donut" && (
            <div>
              <label className="dl-label text-xs">Y / Value Column</label>
              <select
                className="dl-input text-xs"
                value={config.yColumn || ""}
                onChange={(e) => onUpdate({ yColumn: e.target.value })}
              >
                <option value="">Select...</option>
                {numericCols.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Chart area */}
      <div className="flex-1 min-h-0 p-2" style={{ backgroundColor: canvasBg }}>
        <ChartRenderer config={config} data={data} canvasBg={canvasBg} />
      </div>
    </div>
  );
}

// ─── KPI Cards ─────────────────────────────────────────────────────────────

function KPICard({ column, data }: { column: string; data: Row[] }) {
  const values = data.map((r) => Number(r[column] || 0)).filter((v) => !isNaN(v));
  const total = values.reduce((a, b) => a + b, 0);
  const avg = values.length ? total / values.length : 0;
  const max = Math.max(...values);
  const change = values.length > 1
    ? ((values[values.length - 1] - values[0]) / (Math.abs(values[0]) || 1)) * 100
    : 0;

  return (
    <div className="kpi-card">
      <p className="text-xs font-semibold text-text3 uppercase tracking-wide mb-2 truncate">{column}</p>
      <p className="text-2xl font-bold text-text1 font-mono">{formatNumber(total)}</p>
      <div className="flex items-center gap-2 mt-2 text-xs text-text2">
        <span>avg: <span className="font-mono font-medium">{formatNumber(avg)}</span></span>
        <span>·</span>
        <span>max: <span className="font-mono font-medium">{formatNumber(max)}</span></span>
        {change !== 0 && (
          <>
            <span>·</span>
            <span className={change > 0 ? "text-brand font-medium" : "text-danger font-medium"}>
              {change > 0 ? "↑" : "↓"}{Math.abs(change).toFixed(1)}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Chart Builder (main export) ───────────────────────────────────────────

export default function ChartBuilder() {
  const { transformedData, columns, charts, canvasBg, addChart, updateChart, removeChart } = useStore();

  const numericColumns = columns.filter((c) => c.type === "number").map((c) => c.name);
  const stringColumns = columns.filter((c) => c.type === "string").map((c) => c.name);

  const handleAddChart = useCallback(() => {
    const newChart: ChartConfig = {
      id: generateId(),
      title: `Chart ${charts.length + 1}`,
      type: "bar",
      xColumn: stringColumns[0] || columns[0]?.name,
      yColumn: numericColumns[0],
      layout: { x: 0, y: 0, w: 6, h: 4 },
    };
    addChart(newChart);
  }, [charts.length, columns, numericColumns, stringColumns, addChart]);

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: canvasBg }}>
      {/* KPI Row */}
      {numericColumns.length > 0 && (
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {numericColumns.slice(0, 4).map((col) => (
              <KPICard key={col} column={col} data={transformedData} />
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text1">Charts</h3>
          <button
            id="add-chart-btn"
            onClick={handleAddChart}
            className="dl-btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Chart
          </button>
        </div>

        {charts.length === 0 ? (
          <div className="dl-card p-12 text-center">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 text-text3 opacity-30" />
            <h4 className="font-semibold text-text1 mb-1">No charts yet</h4>
            <p className="text-sm text-text2 mb-4">Add a chart to start visualizing your data, or ask the AI Assistant for suggestions.</p>
            <button onClick={handleAddChart} className="dl-btn-primary">
              <Plus className="w-4 h-4" />
              Add Your First Chart
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {charts.map((chart) => (
              <div key={chart.id} style={{ height: "320px" }}>
                <ChartPanel
                  config={chart}
                  data={transformedData}
                  canvasBg={canvasBg}
                  onUpdate={(updates) => updateChart(chart.id, updates)}
                  onRemove={() => removeChart(chart.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
