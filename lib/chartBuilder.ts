// lib/chartBuilder.ts
import type { ChartConfig, Row } from "@/store/useDataStore";
import { applyCrossFilters } from "./crossFilter";
import type { ActiveFilters } from "@/store/useDataStore";

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function groupAggregate(
  data: Row[],
  xCol: string,
  yCol: string,
  agg: string = "sum"
): ChartDataPoint[] {
  const groups = new Map<string, number[]>();
  for (const row of data) {
    const key = String(row[xCol] ?? "");
    const nums = groups.get(key) ?? [];
    nums.push(toNum(row[yCol]));
    groups.set(key, nums);
  }
  const result: ChartDataPoint[] = [];
  Array.from(groups.entries()).forEach(([name, vals]) => {
    let value = 0;
    if (agg === "sum") value = vals.reduce((a, b) => a + b, 0);
    else if (agg === "avg") value = vals.reduce((a, b) => a + b, 0) / vals.length;
    else if (agg === "count") value = vals.length;
    else if (agg === "min") value = Math.min(...vals);
    else if (agg === "max") value = Math.max(...vals);
    result.push({ name, value });
  });
  return result;
}

/**
 * Build chart-ready data from a chart config, raw dataset rows, and active cross-filters.
 */
export function buildChartData(
  config: ChartConfig,
  data: Row[],
  filters: ActiveFilters
): { data: ChartDataPoint[]; keys?: string[] } {
  const filtered = applyCrossFilters(data, filters);

  const { type, xColumn, yColumn, colorColumn, aggregation = "sum" } = config;

  if (!xColumn || !data.length) return { data: [] };

  if (type === "scatter") {
    return {
      data: filtered.map((row) => ({
        name: String(row[xColumn] ?? ""),
        value: toNum(row[yColumn ?? xColumn]),
        x: toNum(row[xColumn]),
        y: yColumn ? toNum(row[yColumn]) : 0,
        color: colorColumn ? String(row[colorColumn] ?? "") : "",
      })),
    };
  }

  if (type === "stackedBar" && colorColumn) {
    // Multi-series stacked bar
    const groups = new Map<string, Map<string, number[]>>();
    const seriesKeys = new Set<string>();
    for (const row of filtered) {
      const xKey = String(row[xColumn] ?? "");
      const seriesKey = String(row[colorColumn] ?? "");
      seriesKeys.add(seriesKey);
      if (!groups.has(xKey)) groups.set(xKey, new Map());
      const seriesMap = groups.get(xKey)!;
      const vals = seriesMap.get(seriesKey) ?? [];
      vals.push(toNum(row[yColumn ?? ""]));
      seriesMap.set(seriesKey, vals);
    }
    const keys = Array.from(seriesKeys);
    const result: ChartDataPoint[] = [];
    Array.from(groups.entries()).forEach(([name, seriesMap]) => {
      const point: ChartDataPoint = { name, value: 0 };
      keys.forEach((k) => {
        const vals = seriesMap.get(k) ?? [0];
        let v = 0;
        if (aggregation === "sum") v = vals.reduce((a, b) => a + b, 0);
        else if (aggregation === "avg") v = vals.reduce((a, b) => a + b, 0) / vals.length;
        else if (aggregation === "count") v = vals.length;
        point[k] = v;
      });
      result.push(point);
    });
    return { data: result, keys };
  }

  if ((type === "multiLine" || type === "area") && colorColumn) {
    // Multi-series line
    const groups = new Map<string, Map<string, number[]>>();
    const seriesKeys = new Set<string>();
    for (const row of filtered) {
      const xKey = String(row[xColumn] ?? "");
      const seriesKey = String(row[colorColumn] ?? "");
      seriesKeys.add(seriesKey);
      if (!groups.has(xKey)) groups.set(xKey, new Map());
      const seriesMap = groups.get(xKey)!;
      const vals = seriesMap.get(seriesKey) ?? [];
      vals.push(toNum(row[yColumn ?? ""]));
      seriesMap.set(seriesKey, vals);
    }
    const keys = Array.from(seriesKeys);
    const result: ChartDataPoint[] = [];
    Array.from(groups.entries()).forEach(([name, seriesMap]) => {
      const point: ChartDataPoint = { name, value: 0 };
      keys.forEach((k) => {
        const vals = seriesMap.get(k) ?? [0];
        point[k] = aggregation === "avg"
          ? vals.reduce((a, b) => a + b, 0) / vals.length
          : vals.reduce((a, b) => a + b, 0);
      });
      result.push(point);
    });
    return { data: result, keys };
  }

  if ((type === "pie" || type === "donut") && xColumn && yColumn) {
    return { data: groupAggregate(filtered, xColumn, yColumn, aggregation) };
  }

  if (type === "heatmap" && colorColumn && yColumn) {
    const xVals = Array.from(new Set(filtered.map((r) => String(r[xColumn] ?? ""))));
    const yVals = Array.from(new Set(filtered.map((r) => String(r[yColumn] ?? ""))));
    const result: ChartDataPoint[] = [];
    for (const xv of xVals) {
      for (const yv of yVals) {
        const matching = filtered.filter(
          (r) => String(r[xColumn]) === xv && String(r[yColumn]) === yv
        );
        const vals = matching.map((r) => toNum(r[colorColumn]));
        const value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        result.push({ name: xv, value, y: yv, x: xv });
      }
    }
    return { data: result };
  }

  // Default: grouped aggregation
  if (yColumn) {
    return { data: groupAggregate(filtered, xColumn, yColumn, aggregation) };
  }

  // Count by x column
  const counts = new Map<string, number>();
  for (const row of filtered) {
    const k = String(row[xColumn] ?? "");
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return {
    data: Array.from(counts.entries()).map(([name, value]) => ({ name, value })),
  };
}

// Color palettes
export const COLOR_PALETTES: Record<string, string[]> = {
  default: ["#1D9E75", "#533AB9", "#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899"],
  ocean: ["#0EA5E9", "#38BDF8", "#7DD3FC", "#BAE6FD", "#0369A1", "#0284C7", "#0891B2", "#06B6D4"],
  sunset: ["#F97316", "#FB923C", "#FDBA74", "#FED7AA", "#EF4444", "#DC2626", "#F59E0B", "#D97706"],
  forest: ["#16A34A", "#22C55E", "#4ADE80", "#86EFAC", "#15803D", "#166534", "#14532D", "#052E16"],
  royal: ["#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD", "#6D28D9", "#5B21B6", "#4C1D95", "#DDD6FE"],
  monochrome: ["#111827", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#E5E7EB", "#F3F4F6", "#F9FAFB"],
};

export function getChartColors(theme?: string): string[] {
  return COLOR_PALETTES[theme ?? "default"] ?? COLOR_PALETTES.default;
}

export function generateChartTitle(type: string, xCol?: string, yCol?: string): string {
  const typeLabels: Record<string, string> = {
    bar: "Bar Chart", stackedBar: "Stacked Bar", horizontalBar: "Horizontal Bar",
    line: "Line Chart", area: "Area Chart", multiLine: "Multi-Line Chart",
    pie: "Pie Chart", donut: "Donut Chart", scatter: "Scatter Plot",
    heatmap: "Heatmap", kpi: "KPI Card", table: "Data Table",
  };
  const label = typeLabels[type] ?? "Chart";
  if (xCol && yCol) return `${yCol} by ${xCol}`;
  if (xCol) return `${xCol} ${label}`;
  return label;
}
