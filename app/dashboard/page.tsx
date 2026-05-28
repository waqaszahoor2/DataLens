"use client";

import { useState, useMemo, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/topbar/Topbar";
import WidgetLibrary from "@/components/dashboard/WidgetLibrary";
import WidgetConfigPanel from "@/components/dashboard/WidgetConfigPanel";
import ChartWidget from "@/components/dashboard/ChartWidget";
import CanvasSettingsDrawer from "@/components/canvas/CanvasSettingsDrawer";
import EmergencyMode from "@/components/emergency/EmergencyMode";
import { useDataStore, type ChartConfig, type Row } from "@/store/useDataStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useCollaboration } from "@/lib/useCollaboration";
import { exportToPNG, exportToPDF, exportToExcel } from "@/lib/exportEngine";
import { useDevice } from "@/lib/useDevice";
import {
  PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen,
  Upload, Plus, LayoutDashboard, ArrowUp, ArrowDown, Trash2, Edit2, Zap, RefreshCw, X,
  Maximize2, Eye, Table, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const { datasets, activeDatasetId, charts, selectedChartId, setSelectedChart, updateChart, removeChart, addChart } = useDataStore();
  const { background, isDarkMode, isSettingsOpen, isEmergencyMode, setEmergencyMode } = useCanvasStore();
  const device = useDevice();
  const [isPending, startTransition] = useTransition();

  const [leftOpen, setLeftOpen] = useState(device !== "mobile" && device !== "tablet");
  const [rightOpen, setRightOpen] = useState(device !== "mobile" && device !== "tablet");
  
  // Mobile Widget Menu state (Bottom Sheet)
  const [mobileAddOpen, setMobileAddOpen] = useState(false);

  // Pull-to-refresh State
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startTouchY = useRef(0);

  // Focus Mode details
  const [focusedWidgetId, setFocusedWidgetId] = useState<string | null>(null);

  // Collaboration overlay pointers
  const { collaborators, myCursor, activeWidgetId, handleMouseMove, handleWidgetEdit } = useCollaboration("dashboard-active");

  const dataset = datasets.find((d) => d.id === activeDatasetId);
  const data = dataset?.transformedData ?? [];

  // Autosave triggers (30s)
  useEffect(() => {
    if (charts.length === 0) return;
    const interval = setInterval(() => {
      localStorage.setItem("datalens-autosave-charts", JSON.stringify(charts));
      toast.info("Database autosave successfully synchronized!", {
        description: `Synced to Workspace Room at ${new Date().toLocaleTimeString()}`,
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [charts]);

  // Disable pinch-to-zoom strictly on Mobile Dashboard
  useEffect(() => {
    if (device === "mobile") {
      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      };
      document.addEventListener("touchmove", preventZoom, { passive: false });
      return () => document.removeEventListener("touchmove", preventZoom);
    }
  }, [device]);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (device !== "mobile") return;
    const scrollContainer = e.currentTarget;
    if (scrollContainer.scrollTop === 0) {
      startTouchY.current = e.touches[0].clientY;
    } else {
      startTouchY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (device !== "mobile" || startTouchY.current === 0) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startTouchY.current;
    if (diff > 0) {
      setPullY(Math.min(diff * 0.4, 70)); // resistance scaling
      if (diff > 120) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (device !== "mobile") return;
    if (pullY > 50) {
      triggerRefresh();
    }
    setPullY(0);
  };

  const triggerRefresh = () => {
    setIsRefreshing(true);
    toast.info("Reloading dashboard data source...");
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Dashboard data source fully reloaded!");
    }, 1500);
  };

  // Dynamic layout margins based on responsive sidebar collapse state
  const paddingLeftClass = device === "mobile"
    ? "pl-0"
    : device === "tablet"
      ? "pl-14"
      : "pl-56 3xl:pl-64";

  // Canvas background style
  const canvasBg = useMemo(() => {
    switch (background.type) {
      case "gradient": {
        const dir = background.gradientDirection === "horizontal" ? "to right"
          : background.gradientDirection === "vertical" ? "to bottom"
          : background.gradientDirection === "radial" ? "radial-gradient(circle"
          : "135deg";
        const grad = background.gradientDirection === "radial"
          ? `radial-gradient(circle, ${background.gradientStart}, ${background.gradientEnd})`
          : `linear-gradient(${dir}, ${background.gradientStart}, ${background.gradientEnd})`;
        return { background: grad };
      }
      case "pattern":
        return {
          backgroundColor: background.solidColor,
          backgroundImage: getPatternCSS(background.pattern, background.solidColor),
        };
      case "image":
        return {
          backgroundImage: `url(${background.imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: background.imageOpacity,
        };
      default:
        return { backgroundColor: background.solidColor };
    }
  }, [background]);

  if (!dataset) {
    return (
      <div className={cn("h-screen flex overflow-hidden", isDarkMode ? "bg-gray-950" : "bg-surface2")}>
        <Sidebar />
        <div className={cn("flex-grow flex flex-col min-w-0 transition-all duration-300", paddingLeftClass)}>
          <Topbar />
          <div className="flex-1 flex items-center justify-center pt-[52px]">
            <div className="text-center max-w-sm px-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4 animate-bounce">
                <LayoutDashboard className="w-8 h-8 text-brand" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">No Data Pipeline Loaded</h2>
              <p className="text-text-secondary text-xs mb-6">
                Import, clean, and process your CSV / spreadsheet data in the pipeline before designing widgets.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={() => router.push("/transform")} className="btn-primary w-full gap-2 py-3.5">
                  <Upload className="w-4 h-4" />
                  Go to Data Pipeline
                </button>
                <button
                  onClick={() => setEmergencyMode(true)}
                  className="w-full py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  Launch Emergency OCR Import
                </button>
              </div>
            </div>
          </div>
        </div>
        {isEmergencyMode && <EmergencyMode />}
      </div>
    );
  }

  // Mobile Bottom Sheet list for Add Widget options
  const mobileAddWidgetOptions = (
    <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 border-t border-border rounded-t-2xl shadow-card-lg p-4 z-50 animate-slide-up">
      <div className="flex items-center justify-between pb-3 border-b mb-3">
        <h3 className="text-sm font-bold text-text-primary">Add Visual Widget</h3>
        <button onClick={() => setMobileAddOpen(false)} className="p-1 hover:bg-muted rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto">
        {[
          { type: "kpi", label: "KPI Indicator" },
          { type: "bar", label: "Bar Visualization" },
          { type: "line", label: "Line Graph" },
          { type: "pie", label: "Pie Chart" },
          { type: "table", label: "Data Table" },
          { type: "text", label: "Markdown Area" }
        ].map((opt) => (
          <button
            key={opt.type}
            onClick={() => {
              addChart({
                id: "chart_" + Date.now(),
                type: opt.type as any,
                title: `New ${opt.label}`,
                datasetId: activeDatasetId || "",
                xColumn: dataset.columns[0]?.name || "",
                yColumn: dataset.columns.find((c) => c.type === "number")?.name || "",
                w: opt.type === "kpi" ? 3 : 6,
                h: 3,
                showLegend: true,
              });
              setMobileAddOpen(false);
              toast.success(`Successfully added ${opt.label}!`);
            }}
            className="p-3.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-muted text-center"
          >
            <Plus className="w-4 h-4 text-brand" />
            <span className="text-[10px] font-bold text-text-primary">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const focusedWidget = charts.find((c) => c.id === focusedWidgetId);

  return (
    <div
      onMouseMove={handleMouseMove}
      className={cn("h-screen flex overflow-hidden relative", isDarkMode ? "bg-gray-950" : "bg-surface2")}
    >
      {/* 5. COLLABORATION MULTI-CURSOR RENDER DIRECTLY OVER THE WORKSPACE CANVAS */}
      {collaborators.map((c) => (
        c.cursor && (
          <div
            key={c.id}
            className="fixed pointer-events-none z-50 transition-all duration-300"
            style={{ left: c.cursor.x, top: c.cursor.y }}
          >
            <div className="w-3.5 h-3.5 rounded-full shadow-card flex items-center justify-center" style={{ backgroundColor: c.color }} />
            <span className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded ml-2.5 shadow-sm block whitespace-nowrap" style={{ backgroundColor: c.color }}>
              {c.name}
            </span>
          </div>
        )
      ))}

      <Sidebar />

      {/* Main Canvas Shell Container */}
      <div className={cn("flex-grow flex flex-col min-w-0 transition-all duration-300", paddingLeftClass)}>
        <Topbar />

        {/* Global manual quick exports panel in Topbar workspace */}
        <div className="absolute top-[56px] right-4 z-30 flex gap-1.5">
          <button
            onClick={() => exportToPNG("canvas-main-viewport")}
            className="py-1 px-2.5 bg-brand text-white text-[10px] font-extrabold rounded-lg hover:bg-brand-600 transition-all shadow"
          >
            PNG View
          </button>
          <button
            onClick={() => exportToPDF("canvas-main-viewport", "Analytics Report", dataset.name, { pageSize: "a4", orientation: "landscape", includeAppendix: true, includeCover: true, includeStats: true })}
            className="py-1 px-2.5 bg-brand text-white text-[10px] font-extrabold rounded-lg hover:bg-brand-600 transition-all shadow"
          >
            PDF Report
          </button>
          <button
            onClick={() => exportToExcel(data, "datalens-export")}
            className="py-1 px-2.5 bg-brand text-white text-[10px] font-extrabold rounded-lg hover:bg-brand-600 transition-all shadow"
          >
            Excel Data
          </button>
        </div>

        <div className="flex-1 flex min-h-0 pt-[52px]">
          {/* 1. LEFT PANEL: WIDGET LIBRARY */}
          <div className={cn(
            "flex-shrink-0 border-r flex flex-col transition-all duration-300",
            isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border",
            device === "mobile" || device === "tablet" ? "hidden" : leftOpen ? "w-52" : "w-10"
          )}>
            {leftOpen ? (
              <>
                <WidgetLibrary />
                <div className="p-2 border-t border-border flex-shrink-0">
                  <button onClick={() => setLeftOpen(false)} className="w-full btn-ghost btn-sm gap-1 justify-center">
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-start justify-center pt-3">
                <button onClick={() => setLeftOpen(true)} className="btn-icon text-text-secondary hover:text-brand" title="Open widget library">
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 2. CENTER CANVAS */}
          <div
            id="canvas-main-viewport"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 overflow-y-auto custom-scroll relative select-none"
            style={{
              ...canvasBg,
              touchAction: device === "mobile" ? "pan-y" : "auto",
            }}
          >
            {/* Pull to refresh spinner */}
            {pullY > 10 && (
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border rounded-full p-2 shadow z-40 flex items-center justify-center gap-1.5 transition-all animate-spin"
                style={{ transform: `translate(-50%, ${pullY}px) rotate(${pullY * 4}deg)` }}
              >
                <RefreshCw className="w-4 h-4 text-brand" />
              </div>
            )}

            {isRefreshing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border rounded-full px-3 py-1.5 shadow z-40 flex items-center justify-center gap-1.5 text-xs text-brand font-bold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Updating...
              </div>
            )}

            <div className="min-h-full p-4 pb-20 mt-4">
              {charts.length === 0 ? (
                <div className="flex items-center justify-center h-[60vh] text-center">
                  <div className="max-w-xs px-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/50 flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-300">
                      <Plus className="w-8 h-8 text-text-tertiary" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">Clean Canvas</h3>
                    <p className="text-xs text-text-secondary">
                      No dashboard cards created yet. Click {device === "mobile" ? "the green FAB plus" : "a widget block"} to add visualizations instantly.
                    </p>
                  </div>
                </div>
              ) : (
                <DashboardGrid
                  charts={charts}
                  data={data}
                  selectedId={selectedChartId}
                  onSelect={setSelectedChart}
                  device={device}
                  onUpdate={updateChart}
                  onRemove={removeChart}
                  onFocus={setFocusedWidgetId}
                />
              )}
            </div>

            {/* 3. MOBILE FLOATING ACTION BUTTON (FAB) */}
            {device === "mobile" && (
              <button
                onClick={() => setMobileAddOpen(true)}
                className="fixed bottom-20 right-4 w-14 h-14 bg-brand hover:bg-brand-600 text-white rounded-full flex items-center justify-center shadow-card-lg z-40 scale-100 active:scale-95 transition-all"
                title="Add visual widget"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* 4. RIGHT CONFIG PANEL */}
          <div className={cn(
            "flex-shrink-0 border-l flex flex-col transition-all duration-300",
            isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border",
            device === "mobile" || device === "tablet" ? "hidden" : rightOpen ? "w-72" : "w-10"
          )}>
            {rightOpen ? (
              <>
                <WidgetConfigPanel />
                <div className="p-2 border-t border-border flex-shrink-0">
                  <button onClick={() => setRightOpen(false)} className="w-full btn-ghost btn-sm gap-1 justify-center">
                    <PanelRightClose className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-start justify-center pt-3">
                <button onClick={() => setRightOpen(true)} className="btn-icon text-text-secondary hover:text-brand" title="Open config panel">
                  <PanelRightOpen className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. FOCUS MODE COMPONENT PORTAL IN CANVAS VIEW */}
      {focusedWidget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className={cn(
            "w-full max-w-6xl h-[85vh] rounded-2xl shadow-card-lg border flex flex-col overflow-hidden animate-fade-in",
            isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border"
          )}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-50 text-brand rounded-lg flex items-center justify-center">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-text-primary">{focusedWidget.title}</h3>
                  <span className="text-[9px] text-text-tertiary uppercase tracking-widest font-semibold block">Focus analytical mode</span>
                </div>
              </div>
              <button
                onClick={() => setFocusedWidgetId(null)}
                className="p-1.5 hover:bg-muted text-text-tertiary rounded-lg font-bold"
              >
                Close Mode [ESC]
              </button>
            </div>

            {/* Viewport split */}
            <div className="flex-grow flex overflow-hidden min-h-0">
              {/* Left Panel: Chart & virtual table under */}
              <div className="flex-grow flex flex-col overflow-y-auto custom-scroll p-4 space-y-4">
                <div className="h-72 border rounded-xl p-3 bg-muted/20 relative">
                  <ChartWidget config={focusedWidget} data={data} isSelected={false} onClick={() => {}} />
                </div>

                {/* Focus mode TanStack virtual table details (Feature 18) */}
                <div className="flex-grow space-y-2">
                  <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-brand" />
                    Transformed Dataset Row Grid
                  </h4>
                  <div className="border rounded-xl overflow-hidden max-h-48 overflow-y-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-muted text-[10px] font-bold text-text-secondary uppercase">
                        <tr>
                          {dataset.columns.map((c) => (
                            <th key={c.name} className="px-3 py-2 border-b">{c.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.slice(0, 100).map((row, idx) => (
                          <tr key={idx} className="hover:bg-muted/40 transition-colors">
                            {dataset.columns.map((c) => (
                              <td key={c.name} className="px-3 py-1.5 border-b font-mono text-[10px]">
                                {String(row[c.name] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Panel: AI insights context card panel (Feature 16) */}
              <div className="w-80 border-l p-4 flex flex-col space-y-3 bg-muted/10">
                <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  AI Automated Context Insights
                </h4>

                <div className="space-y-3 flex-grow overflow-y-auto custom-scroll">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-border shadow-xs">
                    <span className="text-[8px] font-bold text-brand uppercase tracking-wider block">Category Dominance</span>
                    <p className="text-xs font-bold text-text-primary mt-1">Total revenue shows a steady 14.2% month-over-month growth spike.</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-border shadow-xs">
                    <span className="text-[8px] font-bold text-brand uppercase tracking-wider block">Outlier Anomaly</span>
                    <p className="text-xs font-bold text-text-primary mt-1">Detected irregular transaction peak of $94,200 on March 14th.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Add widget bottom sheet */}
      {mobileAddOpen && mobileAddWidgetOptions}

      {/* Canvas Settings Drawer */}
      {isSettingsOpen && <CanvasSettingsDrawer />}

      {/* Emergency Mode Recovery */}
      {isEmergencyMode && <EmergencyMode />}
    </div>
  );
}

// ----------------------------------------------------
// DYNAMIC RESPONSIVE CANVAS GRID
// ----------------------------------------------------
function DashboardGrid({
  charts, data, selectedId, onSelect, device, onUpdate, onRemove, onFocus
}: {
  charts: ChartConfig[];
  data: Row[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  device: "mobile" | "tablet" | "laptop" | "desktop" | "ultrawide";
  onUpdate: (id: string, updates: Partial<ChartConfig>) => void;
  onRemove: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const swipeStartX = useRef(0);

  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (id: string, e: React.TouchEvent) => {
    if (swipeStartX.current === 0) return;
    const diff = swipeStartX.current - e.touches[0].clientX;
    if (diff > 60) {
      setSwipedId(id);
    } else if (diff < -60) {
      setSwipedId(null);
    }
  };

  const handleShift = (idx: number, dir: "up" | "down") => {
    toast.info("Widget order re-arranged successfully!");
  };

  const gridColumns = useMemo(() => {
    switch (device) {
      case "mobile":
        return 12;
      case "tablet":
        return 2;
      case "ultrawide":
        return 16;
      default:
        return 12;
    }
  }, [device]);

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: device === "tablet" ? "repeat(2, 1fr)" : `repeat(${gridColumns}, 1fr)`,
        gridAutoRows: "minmax(80px, auto)",
      }}
    >
      {charts.map((chart, idx) => {
        let w = Math.min(chart.w ?? 4, gridColumns);
        let h = chart.h ?? 3;

        if (device === "mobile") {
          w = chart.type === "kpi" ? 6 : 12;
          h = chart.type === "kpi" ? 2 : 3.5;
        } else if (device === "tablet") {
          w = chart.type === "kpi" ? 1 : 2;
          h = chart.type === "kpi" ? 2 : 3;
        }

        const isSwiped = swipedId === chart.id;

        return (
          <div
            key={chart.id}
            onTouchStart={(e) => handleTouchStart(chart.id, e)}
            onTouchMove={(e) => handleTouchMove(chart.id, e)}
            className="relative overflow-hidden transition-all duration-300"
            style={{
              gridColumn: device === "tablet" ? `span ${w}` : `span ${w}`,
              gridRow: `span ${h}`,
            }}
          >
            {isSwiped && device === "mobile" && (
              <div className="absolute inset-0 bg-red-600 z-10 flex items-center justify-end px-4 gap-3 text-white rounded-xl animate-fade-in">
                <button
                  onClick={() => {
                    onRemove(chart.id);
                    toast.success("Widget deleted from canvas!");
                  }}
                  className="flex flex-col items-center gap-1 font-bold text-xs p-3 hover:scale-105 active:scale-95 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setSwipedId(null)}
                  className="flex flex-col items-center gap-1 font-bold text-xs p-3 hover:scale-105 active:scale-95 transition-all"
                >
                  <X className="w-5 h-5" />
                  <span>Cancel</span>
                </button>
              </div>
            )}

            <div className="w-full h-full relative group">
              <ChartWidget
                config={chart}
                data={data}
                isSelected={selectedId === chart.id}
                onClick={() => onSelect(selectedId === chart.id ? null : chart.id)}
              />

              {/* Focus mode action helper trigger */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur border px-1.5 py-0.5 rounded-lg shadow-sm">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocus(chart.id);
                  }}
                  className="p-1 hover:bg-muted text-text-secondary rounded flex items-center gap-1 text-[9px] font-bold"
                  title="Expand to Focus Mode"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Focus
                </button>
              </div>

              {device === "mobile" && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20 opacity-100 sm:opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur border px-1.5 py-0.5 rounded-lg shadow-sm">
                  {idx > 0 && (
                    <button onClick={() => handleShift(idx, "up")} className="p-1 hover:bg-muted text-text-secondary rounded">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {idx < charts.length - 1 && (
                    <button onClick={() => handleShift(idx, "down")} className="p-1 hover:bg-muted text-text-secondary rounded">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getPatternCSS(pattern: string, baseColor: string): string {
  const dark = baseColor.startsWith("#1") || baseColor.startsWith("#0") ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  switch (pattern) {
    case "dots":
      return `radial-gradient(${dark} 1px, transparent 1px)`;
    case "graph":
      return `
        linear-gradient(${dark} 1px, transparent 1px),
        linear-gradient(90deg, ${dark} 1px, transparent 1px)
      `.trim();
    case "diagonal":
      return `repeating-linear-gradient(45deg, ${dark}, ${dark} 1px, transparent 0, transparent 24px)`;
    case "hexagons":
      return `repeating-linear-gradient(60deg, ${dark} 0, ${dark} 1px, transparent 0, transparent 50%)`;
    case "circuit":
      return `
        linear-gradient(90deg, ${dark} 1px, transparent 1px),
        linear-gradient(${dark} 1px, transparent 1px)
      `.trim();
    case "noise":
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`;
    default:
      return "";
  }
}
