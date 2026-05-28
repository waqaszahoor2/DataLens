"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/topbar/Topbar";
import { useDataStore } from "@/store/useDataStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useDevice } from "@/lib/useDevice";
import ImportStep from "@/components/transform/ImportStep";
import CleanStep from "@/components/transform/CleanStep";
import TransformStepComponent from "@/components/transform/TransformStep";
import LinkStep from "@/components/transform/LinkStep";
import ModelStep from "@/components/transform/ModelStep";
import { Upload, Wand2, GitBranch, Link2, Code, Activity, ChevronRight, Table2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { step: 0, label: "Import", sublabel: "Load your data", icon: Upload, key: "import" },
  { step: 1, label: "Clean", sublabel: "Fix quality issues", icon: Wand2, key: "clean" },
  { step: 2, label: "Transform", sublabel: "Reshape & compute", icon: GitBranch, key: "transform" },
  { step: 3, label: "Link Sheets", sublabel: "Database relations", icon: Link2, key: "link" },
  { step: 4, label: "Model", sublabel: "Analyze & enrich", icon: Activity, key: "model" },
];

function TransformPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pipelineStep, setPipelineStep, datasets, activeDatasetId, sheets } = useDataStore();
  const { isDarkMode } = useCanvasStore();
  const device = useDevice();

  // Sync state step with query parameters
  const stepParam = searchParams.get("step");
  
  useEffect(() => {
    if (stepParam) {
      const match = STEPS.find(s => s.key === stepParam);
      if (match) {
        setPipelineStep(match.step);
      }
    }
  }, [stepParam, setPipelineStep]);

  const dataset = datasets.find((d) => d.id === activeDatasetId);
  const hasData = sheets.length > 0;

  // Mobile layout state: active tab ("configure" or "preview")
  const [mobileTab, setMobileTab] = useState<"configure" | "preview">("configure");

  const isMobile = device === "mobile";
  const isTablet = device === "tablet";

  const paddingLeftClass = isMobile
    ? "pl-0"
    : isTablet
      ? "pl-14"
      : "pl-56 3xl:pl-64";

  const handleStepClick = (step: number, key: string) => {
    setPipelineStep(step);
    router.push(`/transform?step=${key}`);
  };

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
            <Table2 className="w-4 h-4 text-green-primary" />
            Active Preview ({dataset.transformedData.length.toLocaleString()} rows)
          </span>
          {isMobile && (
            <span className="text-[10px] bg-green-light text-green-primary px-1.5 py-0.5 rounded font-medium">
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
    <div className={cn("h-screen flex overflow-hidden", isDarkMode ? "bg-gray-950" : "bg-[#F7F8FA]")}>
      <Sidebar />

      <div className={cn("flex-grow flex flex-col min-w-0 transition-all duration-300", paddingLeftClass)}>
        <Topbar />

        <main className="flex-1 overflow-hidden flex flex-col pt-[52px]">
          {/* A. MOBILE HEADER AND TABS */}
          {isMobile ? (
            <div className="flex flex-col bg-white dark:bg-gray-950 border-b flex-shrink-0">
              {/* Stepper buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 custom-scroll border-b">
                {STEPS.map(({ step, label, icon: Icon, key }) => {
                  const isDone = pipelineStep > step;
                  const isActive = pipelineStep === step;
                  const isAccessible = step === 0 || hasData || step <= pipelineStep;
                  return (
                    <button
                      key={step}
                      onClick={() => isAccessible && handleStepClick(step, key)}
                      disabled={!isAccessible}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0",
                        isActive ? "bg-green-primary text-white" : isDone ? "bg-green-light text-green-primary" : "bg-muted text-text-tertiary",
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
                    mobileTab === "configure" ? "border-green-primary text-green-primary" : "border-transparent text-text-tertiary"
                  )}
                >
                  <Settings2 className="w-4 h-4" />
                  Configure Step
                </button>
                <button
                  onClick={() => setMobileTab("preview")}
                  className={cn(
                    "py-3 border-b-2 font-bold flex items-center justify-center gap-1.5",
                    mobileTab === "preview" ? "border-green-primary text-green-primary" : "border-transparent text-text-tertiary"
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
              <div className="flex items-center gap-0 max-w-5xl">
                {STEPS.map(({ step, label, sublabel, icon: Icon, key }, idx) => {
                  const isDone = pipelineStep > step;
                  const isActive = pipelineStep === step;
                  const isAccessible = step === 0 || hasData || step <= pipelineStep;
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <button
                        onClick={() => isAccessible && handleStepClick(step, key)}
                        disabled={!isAccessible}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 flex-1",
                          isActive ? "bg-green-primary text-white" :
                          isDone && !isActive ? "text-green-primary bg-[#E1F5EE]/40" :
                          isDarkMode ? "text-gray-600" : "text-text-tertiary",
                          isAccessible && !isActive && "hover:bg-muted cursor-pointer",
                          !isAccessible && "cursor-not-allowed opacity-40"
                        )}
                      >
                        <span className={cn(
                          "w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 transition-all",
                          isActive ? "bg-white/20 text-white" :
                          isDone ? "bg-green-primary text-white" :
                          isDarkMode ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"
                        )}>
                          {isDone ? "✓" : step + 1}
                        </span>
                        <div className="text-left min-w-0 flex items-center gap-1.5">
                          <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive ? "text-white" : isDone ? "text-green-primary" : "text-text-tertiary")} />
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
            {isTablet ? (
              <>
                {/* Left Config Panel */}
                <div className="w-[300px] border-r overflow-y-auto custom-scroll p-4 space-y-4 bg-white dark:bg-gray-950 flex-shrink-0">
                  {pipelineStep === 0 && <ImportStep />}
                  {pipelineStep === 1 && <CleanStep />}
                  {pipelineStep === 2 && <TransformStepComponent />}
                  {pipelineStep === 3 && <LinkStep />}
                  {pipelineStep === 4 && <ModelStep />}
                </div>

                {/* Right Active Preview Table */}
                <div className="flex-grow overflow-y-auto p-4 bg-muted/20">
                  {renderDataPreviewTable()}
                </div>
              </>
            ) : isMobile ? (
              /* MOBILE VIEW */
              <div className="flex-grow overflow-y-auto p-4 pb-20">
                {mobileTab === "configure" ? (
                  <>
                    {pipelineStep === 0 && <ImportStep />}
                    {pipelineStep === 1 && <CleanStep />}
                    {pipelineStep === 2 && <TransformStepComponent />}
                    {pipelineStep === 3 && <LinkStep />}
                    {pipelineStep === 4 && <ModelStep />}
                  </>
                ) : (
                  renderDataPreviewTable()
                )}
              </div>
            ) : (
              /* DESKTOP VIEW */
              <div className={cn("flex-grow min-h-0", "overflow-y-auto custom-scroll")}>
                <div className={cn("max-w-5xl mx-auto px-6 py-6")}>
                  {pipelineStep === 0 && <ImportStep />}
                  {pipelineStep === 1 && <CleanStep />}
                  {pipelineStep === 2 && <TransformStepComponent />}
                  {pipelineStep === 3 && <LinkStep />}
                  {pipelineStep === 4 && <ModelStep />}

                  {/* Desktop active preview helper */}
                  {pipelineStep > 0 && pipelineStep !== 3 && pipelineStep < 4 && (
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

export default function TransformPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="w-8 h-8 border-4 border-green-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TransformPageContent />
    </Suspense>
  );
}
