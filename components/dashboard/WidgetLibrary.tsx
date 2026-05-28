"use client";

import {
  BarChart3, TrendingUp, PieChart, ScatterChart, Table2,
  Filter, Type, Image, Activity, LayoutGrid, Layers, Hash
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { generateId } from "@/lib/utils";
import { generateChartTitle } from "@/lib/chartBuilder";
import type { ChartType, ChartConfig } from "@/store/useDataStore";
import { cn } from "@/lib/utils";

const WIDGET_CATEGORIES = [
  {
    label: "Charts",
    items: [
      { type: "bar" as ChartType, icon: BarChart3, label: "Bar Chart", w: 4, h: 3 },
      { type: "stackedBar" as ChartType, icon: BarChart3, label: "Stacked Bar", w: 4, h: 3 },
      { type: "line" as ChartType, icon: TrendingUp, label: "Line Chart", w: 4, h: 3 },
      { type: "area" as ChartType, icon: Activity, label: "Area Chart", w: 4, h: 3 },
      { type: "multiLine" as ChartType, icon: TrendingUp, label: "Multi-Line", w: 4, h: 3 },
      { type: "pie" as ChartType, icon: PieChart, label: "Pie Chart", w: 3, h: 3 },
      { type: "donut" as ChartType, icon: PieChart, label: "Donut Chart", w: 3, h: 3 },
      { type: "scatter" as ChartType, icon: ScatterChart, label: "Scatter Plot", w: 4, h: 3 },
      { type: "heatmap" as ChartType, icon: LayoutGrid, label: "Heatmap", w: 4, h: 3 },
    ],
  },
  {
    label: "Data",
    items: [
      { type: "kpi" as ChartType, icon: Hash, label: "KPI Card", w: 2, h: 2 },
      { type: "table" as ChartType, icon: Table2, label: "Data Table", w: 6, h: 4 },
    ],
  },
  {
    label: "Interactive",
    items: [
      { type: "filter" as ChartType, icon: Filter, label: "Filter Widget", w: 2, h: 3 },
    ],
  },
  {
    label: "Content",
    items: [
      { type: "text" as ChartType, icon: Type, label: "Text Block", w: 3, h: 2 },
      { type: "image" as ChartType, icon: Image, label: "Image", w: 3, h: 3 },
    ],
  },
];

export default function WidgetLibrary() {
  const { addChart, datasets, activeDatasetId, setSelectedChart } = useDataStore();
  const dataset = datasets.find((d) => d.id === activeDatasetId);
  const colNames = dataset?.columns.map((c) => c.name) ?? [];

  const handleAdd = (type: ChartType, w: number, h: number) => {
    const xCol = colNames[0];
    const numCol = dataset?.columns.find((c) => c.type === "number")?.name ?? colNames[1];

    const newChart: ChartConfig = {
      id: generateId(),
      type,
      title: generateChartTitle(type, xCol, numCol),
      datasetId: activeDatasetId ?? dataset?.id ?? "",
      xColumn: xCol,
      yColumn: numCol,
      aggregation: "sum",
      showLegend: type === "pie" || type === "donut" || type === "stackedBar",
      showGridlines: !["pie","donut","kpi","filter","text","image"].includes(type),
      showTooltips: true,
      colorTheme: "default",
      w,
      h,
      x: 0,
      y: 9999, // append at bottom
    };

    addChart(newChart);
    setSelectedChart(newChart.id);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand" />
          Widgets
        </span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-4">
        {!dataset && (
          <div className="text-center py-4 text-text-tertiary text-xs">
            Import a dataset first to add widgets
          </div>
        )}
        {WIDGET_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1.5 px-1">{cat.label}</div>
            <div className="space-y-1">
              {cat.items.map(({ type, icon: Icon, label, w, h }) => (
                <button
                  key={type}
                  onClick={() => dataset && handleAdd(type, w, h)}
                  disabled={!dataset}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150",
                    dataset
                      ? "hover:bg-muted hover:shadow-card cursor-pointer"
                      : "opacity-40 cursor-not-allowed"
                  )}
                  title={label}
                >
                  <div className="w-7 h-7 rounded-md bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-text-primary">{label}</div>
                    <div className="text-[9px] text-text-tertiary">{w}×{h} grid</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
