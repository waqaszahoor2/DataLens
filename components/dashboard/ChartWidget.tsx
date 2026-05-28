"use client";

import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ScatterChart,
  Scatter, ResponsiveContainer
} from "recharts";
import { useDataStore } from "@/store/useDataStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useDevice } from "@/lib/useDevice";
import { buildChartData, getChartColors } from "@/lib/chartBuilder";
import { applyCrossFilters, isChartAffected } from "@/lib/crossFilter";
import { formatNumber } from "@/lib/utils";
import type { ChartConfig, Row, Column } from "@/store/useDataStore";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, Filter, AlertCircle, BarChart3, Code, Loader2
} from "lucide-react";
import { usePyodide } from "@/lib/usePyodide";
import Papa from "papaparse";

interface WidgetProps {
  config: ChartConfig;
  data: Row[];
  isSelected: boolean;
  onClick: () => void;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-card-md px-3 py-2 text-xs">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-text-secondary">{p.name}:</span>
          <span className="font-medium text-text-primary">{typeof p.value === "number" ? formatNumber(p.value, 1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

function KPIWidget({ config, data, colors }: { config: ChartConfig; data: Row[]; colors: string[] }) {
  const col = config.kpiValue ?? config.yColumn ?? config.xColumn ?? "";
  const vals = data.map((r) => Number(r[col])).filter((v) => !isNaN(v));
  const value = vals.reduce((a, b) => a + b, 0);
  const prevValue = value * 0.9; // Simulated comparison
  const delta = ((value - prevValue) / prevValue) * 100;
  const sparkline = vals.slice(-12).map((v, i) => ({ i, v }));

  return (
    <div className="h-full flex flex-col justify-between p-1">
      <div>
        <div className="text-xs text-text-tertiary mb-1 uppercase tracking-wide font-medium">{config.title}</div>
        <div className="text-2xl font-semibold text-text-primary leading-none">{formatNumber(value)}</div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className={cn(
          "flex items-center gap-0.5 text-xs font-medium",
          delta > 0 ? "text-green-600" : delta < 0 ? "text-red-500" : "text-text-tertiary"
        )}>
          {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {Math.abs(delta).toFixed(1)}%
        </span>
        {sparkline.length > 2 && (
          <ResponsiveContainer width={60} height={24}>
            <LineChart data={sparkline}>
              <Line dataKey="v" stroke={colors[0]} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function TableWidget({ config, data, filters }: { config: ChartConfig; data: Row[]; filters: Record<string, (string | number | boolean | null)[]> }) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const filtered = applyCrossFilters(data, filters);
  const cols = Object.keys(filtered[0] ?? {});
  const perPage = 15;

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const rows = sorted.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(sorted.length / perPage);

  const handleSort = (colName: string) => {
    if (sortCol === colName) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(colName); setSortDir("asc"); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto custom-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {cols.map((colName) => (
                <th key={colName} onClick={() => handleSort(colName)} className="cursor-pointer hover:bg-gray-100 select-none">
                  <span className="flex items-center gap-1">
                    {colName}
                    {sortCol === colName && <span className="text-brand">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {cols.map((colName) => {
                  const val = row[colName];
                  const rule = config.conditionalFormats?.find((r) => {
                    const rv = Number(val);
                    switch (r.operator) {
                      case ">": return rv > Number(r.value);
                      case "<": return rv < Number(r.value);
                      case "=": return String(val) === r.value;
                      case "!=": return String(val) !== r.value;
                      case ">=": return rv >= Number(r.value);
                      case "<=": return rv <= Number(r.value);
                      default: return false;
                    }
                  });
                  return (
                    <td key={colName} style={rule ? { color: rule.color, backgroundColor: rule.backgroundColor } : undefined}>
                      {String(val ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-text-secondary flex-shrink-0">
          <span>Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, sorted.length)} of {sorted.length}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded border border-border disabled:opacity-40">‹</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 rounded border border-border disabled:opacity-40">›</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterWidgetComponent({ config, data, activeFilters, onToggle }: {
  config: ChartConfig;
  data: Row[];
  activeFilters: Record<string, (string | number | boolean | null)[]>;
  onToggle: (col: string, val: string | number | boolean | null) => void;
}) {
  const col = config.filterColumn ?? config.xColumn ?? "";
  const vals = Array.from(new Set(data.map((r) => r[col]))).filter((v) => v !== null && v !== "").slice(0, 20);
  const selected = activeFilters[col] ?? [];

  return (
    <div className="p-2 space-y-1">
      <div className="text-xs font-medium text-text-secondary mb-2">{col}</div>
      {vals.map((val) => (
        <label key={String(val)} className="flex items-center gap-2 cursor-pointer hover:bg-muted rounded px-1 py-0.5">
          <input
            type="checkbox"
            checked={selected.some((v) => v === val)}
            onChange={() => onToggle(col, val)}
            className="w-3.5 h-3.5 accent-brand"
          />
          <span className="text-xs text-text-primary truncate">{String(val)}</span>
        </label>
      ))}
    </div>
  );
}

export default function ChartWidget({ config, data: rawData, isSelected, onClick }: WidgetProps) {
  const { activeFilters, toggleFilter, datasets } = useDataStore();
  const { card, isDarkMode } = useCanvasStore();
  const device = useDevice();
  
  const colors = getChartColors(config.colorTheme);
  const dataset = datasets.find((d) => d.id === config.datasetId);
  const isDatasetCleaned = !!dataset?.name.includes("(cleaned");

  // Local Python preprocessor logic
  const { runPython } = usePyodide();
  const [pythonData, setPythonData] = useState<Row[] | null>(null);
  const [pyRunning, setPyRunning] = useState(false);

  useEffect(() => {
    if (!config.pythonCode || !rawData.length) {
      setPythonData(null);
      return;
    }

    let isMounted = true;
    const runLocalTransform = async () => {
      setPyRunning(true);
      try {
        const csvStr = Papa.unparse(rawData);
        const res = await runPython(config.pythonCode!, csvStr);
        if (isMounted) {
          const parsed = Papa.parse(res.csv, { header: true, dynamicTyping: true });
          const rows = parsed.data.filter((r) => r && Object.keys(r).length > 0) as Row[];
          setPythonData(rows);
        }
      } catch (err) {
        console.error("Local widget Python execution failed:", err);
      } finally {
        if (isMounted) setPyRunning(false);
      }
    };

    runLocalTransform();
    return () => {
      isMounted = false;
    };
  }, [config.pythonCode, rawData, runPython]);

  const activeData = pythonData || rawData;

  const { data: chartData, keys } = useMemo(() =>
    buildChartData(config, activeData, activeFilters),
    [config, activeData, activeFilters]
  );

  const affected = isChartAffected(
    Object.keys(activeData[0] ?? {}),
    activeFilters
  );

  // Responsive Chart parameters calculation
  const isMobile = device === "mobile";
  
  const minHeight = isMobile
    ? "200px"
    : device === "tablet"
      ? "260px"
      : device === "ultrawide"
        ? "360px"
        : "300px";

  const legendLayout = isMobile ? "horizontal" as const : "vertical" as const;
  const legendAlign = isMobile ? "center" as const : "right" as const;
  const legendVerticalAlign = isMobile ? "bottom" as const : "middle" as const;
  
  const tickCount = isMobile ? 4 : undefined;
  const barSize = isMobile ? undefined : 24;
  const hideLabels = isMobile;

  const cardBg = card.background === "glass" ? "bg-white/80 backdrop-blur-sm" :
    card.background === "dark" ? "bg-gray-900" :
    card.background === "transparent" ? "bg-transparent" : "bg-white";

  const cardShadow = card.shadow === "soft" ? "shadow-card" :
    card.shadow === "medium" ? "shadow-card-md" :
    card.shadow === "hard" ? "shadow-card-lg" : "";

  const cardBorder = card.borderStyle === "glow"
    ? `ring-2 ring-[${card.borderColor}]/40`
    : card.borderStyle === "none" ? ""
    : `border ${card.borderStyle === "dashed" ? "border-dashed" : "border-solid"}`;

  const style = {
    borderRadius: card.borderRadius,
    borderColor: card.borderStyle !== "none" ? card.borderColor : undefined,
    borderStyle: card.borderStyle === "dashed" ? "dashed" as const : "solid" as const,
  };

  if (!activeData.length) {
    return (
      <div
        className={cn("h-full flex flex-col items-center justify-center cursor-pointer", cardBg, cardShadow, cardBorder, isSelected && "ring-2 ring-brand")}
        style={style}
        onClick={onClick}
      >
        <AlertCircle className="w-8 h-8 text-text-tertiary mb-2" />
        <p className="text-xs text-text-tertiary">No data</p>
      </div>
    );
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 8, right: 8, bottom: 4, left: 0 },
    };

    switch (config.type) {
      case "bar":
      case "horizontalBar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps} layout={config.type === "horizontalBar" ? "vertical" : "horizontal"}>
              {config.showGridlines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />}
              <XAxis dataKey={config.type === "horizontalBar" ? "value" : "name"} tick={!hideLabels ? { fontSize: 10 } : false} />
              <YAxis tick={!hideLabels ? { fontSize: 10 } : false} tickFormatter={(v) => formatNumber(v, 0)} tickCount={tickCount} />
              {config.showTooltips !== false && <Tooltip content={<CustomTooltip />} />}
              {config.showLegend && <Legend layout={legendLayout} align={legendAlign} verticalAlign={legendVerticalAlign} wrapperStyle={{ fontSize: 9 }} />}
              <Bar
                dataKey="value"
                fill={colors[0]}
                radius={[2, 2, 0, 0]}
                barSize={barSize}
                onClick={(entry) => {
                  if (config.xColumn) toggleFilter(config.xColumn, entry.name);
                }}
                cursor="pointer"
              >
                {chartData.map((entry, i) => {
                  const colFilter = activeFilters[config.xColumn ?? ""];
                  const dimmed = colFilter?.length && !colFilter.some((v) => v === entry.name);
                  return (
                    <Cell
                      key={i}
                      fill={colors[i % colors.length]}
                      opacity={dimmed ? 0.3 : 1}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "stackedBar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              {config.showGridlines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />}
              <XAxis dataKey="name" tick={!hideLabels ? { fontSize: 10 } : false} />
              <YAxis tick={!hideLabels ? { fontSize: 10 } : false} tickCount={tickCount} />
              {config.showTooltips !== false && <Tooltip content={<CustomTooltip />} />}
              {config.showLegend !== false && <Legend layout={legendLayout} align={legendAlign} verticalAlign={legendVerticalAlign} wrapperStyle={{ fontSize: 9 }} />}
              {(keys ?? []).map((k, i) => (
                <Bar key={k} dataKey={k} stackId="s" fill={colors[i % colors.length]} barSize={barSize} radius={i === (keys?.length ?? 1) - 1 ? [2, 2, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
      case "multiLine":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              {config.showGridlines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />}
              <XAxis dataKey="name" tick={!hideLabels ? { fontSize: 10 } : false} />
              <YAxis tick={!hideLabels ? { fontSize: 10 } : false} tickCount={tickCount} />
              {config.showTooltips !== false && <Tooltip content={<CustomTooltip />} />}
              {config.showLegend && <Legend layout={legendLayout} align={legendAlign} verticalAlign={legendVerticalAlign} wrapperStyle={{ fontSize: 9 }} />}
              {keys
                ? keys.map((k, i) => (
                    <Line key={k} dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
                  ))
                : <Line dataKey="value" stroke={colors[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              }
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              {config.showGridlines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />}
              <XAxis dataKey="name" tick={!hideLabels ? { fontSize: 10 } : false} />
              <YAxis tick={!hideLabels ? { fontSize: 10 } : false} tickCount={tickCount} />
              {config.showTooltips !== false && <Tooltip content={<CustomTooltip />} />}
              {keys
                ? keys.map((k, i) => (
                    <Area key={k} dataKey={k} stroke={colors[i % colors.length]} fill={colors[i % colors.length] + "30"} strokeWidth={2} />
                  ))
                : <Area dataKey="value" stroke={colors[0]} fill={colors[0] + "30"} strokeWidth={2} />
              }
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
      case "donut":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {config.showTooltips !== false && <Tooltip content={<CustomTooltip />} />}
              {config.showLegend && <Legend layout={legendLayout} align={legendAlign} verticalAlign={legendVerticalAlign} wrapperStyle={{ fontSize: 9 }} />}
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={config.type === "donut" ? "50%" : 0}
                outerRadius="75%"
                label={!hideLabels}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart {...commonProps}>
              {config.showGridlines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />}
              <XAxis dataKey="name" tick={!hideLabels ? { fontSize: 10 } : false} />
              <YAxis tick={!hideLabels ? { fontSize: 10 } : false} tickCount={tickCount} />
              {config.showTooltips !== false && <Tooltip content={<CustomTooltip />} />}
              <Scatter name="Points" data={chartData} fill={colors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col p-4 cursor-pointer select-none transition-all duration-300 relative group overflow-hidden border",
        cardBg, cardShadow, cardBorder,
        isSelected && "ring-2 ring-brand border-brand"
      )}
      style={{
        ...style,
        minHeight: minHeight,
      }}
      onClick={onClick}
    >
      {/* Widget Header & badges */}
      <div className="flex items-start justify-between mb-3 border-b pb-2">
        <div>
          <h3 className={cn("text-xs font-bold truncate", isDarkMode ? "text-white" : "text-text-primary")}>
            {config.title || "Untitled Widget"}
          </h3>
          {config.subtitle && (
            <p className="text-[10px] text-text-tertiary truncate leading-none mt-0.5">{config.subtitle}</p>
          )}
        </div>
        
        {/* Dynamic Badging Indicator */}
        <div className="flex items-center gap-1.5">
          {affected && (
            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-brand-50 text-[8px] font-bold text-brand border border-brand-200">
              <Filter className="w-2.5 h-2.5" />
              Filtered
            </span>
          )}
          {(isDatasetCleaned || config.pythonCode) && (
            <span className="px-2 py-0.5 rounded bg-purple-50 text-[8px] font-bold text-purple-700 border border-purple-200 flex items-center gap-1 animate-pulse">
              <Code className="w-2.5 h-2.5" />
              Python Cleaned
            </span>
          )}
          {pyRunning && (
            <span className="px-2 py-0.5 rounded bg-amber-50 text-[8px] font-bold text-amber-700 border border-amber-200 flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Running...
            </span>
          )}
        </div>
      </div>

      {/* Main Chart content area */}
      <div className="flex-1 min-h-0 relative">
        {config.type === "kpi" ? (
          <KPIWidget config={config} data={activeData} colors={colors} />
        ) : config.type === "table" ? (
          <TableWidget config={config} data={activeData} filters={activeFilters} />
        ) : config.type === "filter" ? (
          <FilterWidgetComponent config={config} data={activeData} activeFilters={activeFilters} onToggle={toggleFilter} />
        ) : (
          renderChart()
        )}
      </div>
    </div>
  );
}
