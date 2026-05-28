"use client";

import { Suspense, useState } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/topbar/Topbar";
import { useDataStore } from "@/store/useDataStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useDevice } from "@/lib/useDevice";
import ImportStep from "@/components/transform/ImportStep";
import CleanStep from "@/components/transform/CleanStep";
import TransformStepComponent from "@/components/transform/TransformStep";
import PythonStep from "@/components/transform/PythonStep";
import ModelStep from "@/components/transform/ModelStep";
import { Upload, Wand2, GitBranch, Code, Activity, ChevronRight, Table2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { step: 0, label: "Import", sublabel: "Load your data", icon: Upload },
  { step: 1, label: "Clean", sublabel: "Fix quality issues", icon: Wand2 },
  { step: 2, label: "Transform", sublabel: "Reshape & compute", icon: GitBranch },
  { step: 3, label: "Python", sublabel: "Code Preprocessing", icon: Code },
  { step: 4, label: "Model", sublabel: "Analyze & enrich", icon: Activity },
];

export default function TransformPage() {
  const { pipelineStep, setPipelineStep, datasets, activeDatasetId } = useDataStore();
  const { isDarkMode } = useCanvasStore();
  const device = useDevice();

  const dataset = datasets.find((d) => d.id === activeDatasetId);
  const hasData = !!dataset;

  // Mobile layout state: active tab ("configure" or "preview")
  const [mobileTab, setMobileTab] = useState<"configure" | "preview">("configure");

  const isMobile = device === "mobile";
  const isTablet = device === "tablet";

  // Dynamic layout margins based on responsive sidebar collapse state
  const paddingLeftClass = isMobile
    ? "pl-0"
    : isTablet
      ? "pl-14"
      : "pl-56 3xl:pl-64";

  // Render the responsive table preview container for mobile/tablet
  const renderDataPreviewTable = () => {
    if (!dataset) {
      return (
        <div className="flex items-center justify-center h-48 text-xs text-text-tertiary">
          No pipeline data loaded.
        </div>
      );
    }

    const columnsToShow = isMobile ? dataset.columns.slice(0, 4) : dataset.columns;

    return (
      <div className="space-y-3 p-4 bg-white dark:bg-gray-900 border rounded-xl shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b">
          <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Table2 className="w-4 h-4 text-brand" />
            Active Preview ({dataset.transformedData.length.toLocaleString()} rows)
          </span>
          {isMobile && (
            <span className="text-[10px] bg-brand-50 text-brand px-1.5 py-0.5 rounded font-medium">
              Showing 4 main columns
            </span>
          )}
        </div>

        <div className="overflow-x-auto max-h-72 custom-scroll border rounded-lg">
          <table className="data-table">
            <thead>
              <tr>
                {columnsToShow.map((col) => (
                  <th key={col.name} className="text-left py-2 px-3 bg-muted text-[10px] font-bold">
                    {col.name}
                    <span className="text-[8px] opacity-40 ml-1">({col.type[0]})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.transformedData.slice(0, 8).map((row, i) => (
                <tr key={i} className="hover:bg-muted/40 border-b last:border-0">
                  {columnsToShow.map((col) => (
                    <td key={col.name} className="py-2.5 px-3 text-xs truncate max-w-[120px]">
                      {row[col.name] === null || row[col.name] === "" ? (
                        <span className="text-text-tertiary italic">null</span>
                      ) : (
                        String(row[col.name])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("h-screen flex overflow-hidden", isDarkMode ? "bg-gray-950" : "bg-surface2")}>
      <Sidebar />

      <div className={cn("flex-grow flex flex-col min-w-0 transition-all duration-300", paddingLeftClass)}>
        <Topbar />

        <main className="flex-1 overflow-hidden flex flex-col pt-[52px]">
          {/* A. MOBILE HEADER AND TABS */}
          {isMobile ? (
            <div className="flex flex-col bg-white dark:bg-gray-950 border-b flex-shrink-0">
              {/* Stepper buttons (swipeable horizontal strip) */}
              <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 custom-scroll border-b">
                {STEPS.map(({ step, label, icon: Icon }) => {
                  const isDone = pipelineStep > step;
                  const isActive = pipelineStep === step;
                  const isAccessible = step === 0 || hasData || step <= pipelineStep;
                  return (
                    <button
                      key={step}
                      onClick={() => isAccessible && setPipelineStep(step)}
                      disabled={!isAccessible}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0",
                        isActive ? "bg-brand text-white" : isDone ? "bg-brand-50 text-brand" : "bg-muted text-text-tertiary",
                        !isAccessible && "opacity-40"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* View toggle tabs */}
              <div className="grid grid-cols-2 text-center text-xs">
                <button
                  onClick={() => setMobileTab("configure")}
                  className={cn(
                    "py-3 border-b-2 font-bold flex items-center justify-center gap-1.5",
                    mobileTab === "configure" ? "border-brand text-brand" : "border-transparent text-text-tertiary"
                  )}
                >
                  <Settings2 className="w-4 h-4" />
                  Configure Step
                </button>
                <button
                  onClick={() => setMobileTab("preview")}
                  className={cn(
                    "py-3 border-b-2 font-bold flex items-center justify-center gap-1.5",
                    mobileTab === "preview" ? "border-brand text-brand" : "border-transparent text-text-tertiary"
                  )}
                >
                  <Table2 className="w-4 h-4" />
                  Data Preview
                </button>
              </div>
            </div>
          ) : (
            /* B. DESKTOP / TABLET STEP PROGRESS HEADER BAR */
            <div className={cn(
              "border-b px-6 py-3.5 flex-shrink-0",
              isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border"
            )}>
              <div className="flex items-center gap-0 max-w-4xl">
                {STEPS.map(({ step, label, sublabel, icon: Icon }, idx) => {
                  const isDone = pipelineStep > step;
                  const isActive = pipelineStep === step;
                  const isAccessible = step === 0 || hasData || step <= pipelineStep;
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <button
                        onClick={() => isAccessible && setPipelineStep(step)}
                        disabled={!isAccessible}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 flex-1",
                          isActive && "bg-brand text-white",
                          isDone && !isActive && (isDarkMode ? "text-brand-400" : "text-brand"),
                          !isActive && !isDone && (isDarkMode ? "text-gray-600" : "text-text-tertiary"),
                          isAccessible && !isActive && "hover:bg-muted cursor-pointer",
                          !isAccessible && "cursor-not-allowed opacity-40"
                        )}
                      >
                        <span className={cn(
                          "w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 transition-all",
                          isActive ? "bg-white/20 text-white" :
                          isDone ? "bg-brand text-white" :
                          isDarkMode ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"
                        )}>
                          {isDone ? "✓" : step + 1}
                        </span>
                        <div className="text-left min-w-0 flex items-center gap-1.5">
                          <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive ? "text-white" : isDone ? "text-brand" : "text-text-tertiary")} />
                          <div>
                            <div className="text-xs font-bold truncate">{label}</div>
                            <div className={cn(
                              "text-[9px] truncate hidden sm:block",
                              isActive ? "text-white/70" : isDarkMode ? "text-gray-600" : "text-text-tertiary"
                            )}>
                              {sublabel}
                            </div>
                          </div>
                        </div>
                      </button>
                      {idx < STEPS.length - 1 && (
                        <ChevronRight className={cn(
                          "w-4 h-4 flex-shrink-0 mx-1",
                          isDarkMode ? "text-gray-700" : "text-border"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MAIN PIPELINE VIEWPORT SPLITTER AREA */}
          <div className="flex-grow overflow-hidden flex">
            {/* 1. TABLET ONLY DOCK CONFIG DOCK SPLITTER CONTAINER */}
            {isTablet ? (
              <>
                {/* Left Config Panel */}
                <div className="w-[300px] border-r overflow-y-auto custom-scroll p-4 space-y-4 bg-white dark:bg-gray-950 flex-shrink-0">
                  <Suspense fallback={<div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mt-10" />}>
                    {pipelineStep === 0 && <ImportStep />}
                    {pipelineStep === 1 && <CleanStep />}
                    {pipelineStep === 2 && <TransformStepComponent />}
                    {pipelineStep === 3 && <PythonStep />}
                    {pipelineStep === 4 && <ModelStep />}
                  </Suspense>
                </div>

                {/* Right Active Preview Table */}
                <div className="flex-grow overflow-y-auto p-4 bg-muted/20">
                  {renderDataPreviewTable()}
                </div>
              </>
            ) : isMobile ? (
              /* 2. MOBILE VIEW: SINGLE PANEL VIEWPORT PORTAL */
              <div className="flex-grow overflow-y-auto p-4 pb-20">
                {mobileTab === "configure" ? (
                  <Suspense fallback={<div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mt-10" />}>
                    {pipelineStep === 0 && <ImportStep />}
                    {pipelineStep === 1 && <CleanStep />}
                    {pipelineStep === 2 && <TransformStepComponent />}
                    {pipelineStep === 3 && <PythonStep />}
                    {pipelineStep === 4 && <ModelStep />}
                  </Suspense>
                ) : (
                  renderDataPreviewTable()
                )}
              </div>
            ) : (
              /* 3. DESKTOP Standard single custom scroll wrapper */
              <div className={cn("flex-grow min-h-0", pipelineStep === 3 ? "flex flex-col" : "overflow-y-auto custom-scroll")}>
                <div className={cn(pipelineStep === 3 ? "flex-1 p-6 flex flex-col min-h-0" : "max-w-4xl mx-auto px-6 py-6")}>
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-48">
                      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                  }>
                    {pipelineStep === 0 && <ImportStep />}
                    {pipelineStep === 1 && <CleanStep />}
                    {pipelineStep === 2 && <TransformStepComponent />}
                    {pipelineStep === 3 && <PythonStep />}
                    {pipelineStep === 4 && <ModelStep />}
                  </Suspense>

                  {/* Desktop active preview helper */}
                  {pipelineStep > 0 && pipelineStep < 4 && (
                    <div className="mt-8">
                      {renderDataPreviewTable()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
