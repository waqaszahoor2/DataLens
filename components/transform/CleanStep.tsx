"use client";

import { useState, useMemo } from "react";
import {
  CheckSquare, Square, Wand2,
  AlertTriangle, RefreshCcw, ChevronRight
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { runPipeline, detectOutliers, computeColumnStats, generateId } from "@/lib/dataTransform";
import type { TransformStep, ColumnType } from "@/store/useDataStore";
import { cn } from "@/lib/utils";

export default function CleanStep() {
  const { datasets, activeDatasetId, updateDataset, setPipelineStep } = useDataStore();
  const dataset = datasets.find((d) => d.id === activeDatasetId);

  const [droppedCols, setDroppedCols] = useState<Set<string>>(new Set());
  const [fillNullsConfig, setFillNullsConfig] = useState<Record<string, {
    method: "mean" | "median" | "mode" | "custom" | "dropRow"; customValue?: string
  }>>({});
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [typeChanges, setTypeChanges] = useState<Record<string, ColumnType>>({});
  const [textOps, setTextOps] = useState<Record<string, "trim" | "upper" | "lower" | "title">>({});
  const [removeOutliersSet, setRemoveOutliersSet] = useState<Set<string>>(new Set());

  const stats = useMemo(
    () => (dataset?.columns ?? []).map((col) => ({
      col,
      stats: computeColumnStats(dataset?.rawData ?? [], col.name),
      outlierCount: (dataset?.rawData?.length ?? 0) > 0 && col.type === "number"
        ? detectOutliers(dataset?.rawData ?? [], col.name).size : 0,
    })),
    [dataset]
  );

  if (!dataset) return (
    <div className="text-center py-16 text-text-tertiary">
      <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-yellow-400" />
      <p>No dataset loaded. Go back to Import first.</p>
    </div>
  );

  const totalNulls = stats.reduce((s, { stats: st }) => s + st.nullCount, 0);
  const dupCount = dataset.rawData.length - new Set(dataset.rawData.map((r) => JSON.stringify(r))).size;

  const buildAndApply = () => {
    const steps: TransformStep[] = [];

    if (dupCount > 0) {
      steps.push({ id: generateId(), type: "removeDuplicates" });
    }

    if (droppedCols.size > 0) {
      steps.push({ id: generateId(), type: "dropColumns", columns: Array.from(droppedCols) });
    }

    for (const [col, config] of Object.entries(fillNullsConfig)) {
      steps.push({ id: generateId(), type: "fillNulls", column: col, ...config });
    }

    for (const [from, to] of Object.entries(renames)) {
      if (to && to !== from) {
        steps.push({ id: generateId(), type: "renameColumn", from, to });
      }
    }

    for (const [column, toType] of Object.entries(typeChanges)) {
      steps.push({ id: generateId(), type: "changeType", column, toType });
    }

    for (const [column, op] of Object.entries(textOps)) {
      steps.push({ id: generateId(), type: "textOps", column, op });
    }

    Array.from(removeOutliersSet).forEach((col) => {
      steps.push({ id: generateId(), type: "removeOutliers", column: col });
    });

    const newPipeline = [...dataset.pipeline, ...steps];
    const transformedData = runPipeline(dataset.rawData, newPipeline);

    updateDataset(dataset.id, { pipeline: newPipeline, transformedData });
    setPipelineStep(2);
  };

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className={cn("card text-center", dupCount > 0 && "border-yellow-200 bg-yellow-50")}>
          <div className="metric-value text-lg">{dupCount}</div>
          <div className="metric-label">Duplicate Rows</div>
          {dupCount > 0 && (
            <div className="text-[10px] text-yellow-600 mt-1">Will be removed</div>
          )}
        </div>
        <div className={cn("card text-center", totalNulls > 0 && "border-orange-200 bg-orange-50")}>
          <div className="metric-value text-lg">{totalNulls}</div>
          <div className="metric-label">Null Values</div>
        </div>
        <div className="card text-center">
          <div className="metric-value text-lg">{dataset.columns.length}</div>
          <div className="metric-label">Columns</div>
        </div>
      </div>

      {/* Column by column config */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-brand" />
          Clean by Column
        </h3>

        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary w-8">Keep</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Column</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Nulls</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Rename</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Fill Nulls</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Text Ops</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Outliers</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(({ col, stats: st, outlierCount }) => {
                  const isDropped = droppedCols.has(col.name);
                  return (
                    <tr key={col.name} className={cn("border-t border-border", isDropped && "opacity-40")}>
                      <td className="px-3 py-2">
                        <button onClick={() => {
                          const next = new Set(droppedCols);
                          if (next.has(col.name)) next.delete(col.name);
                          else next.add(col.name);
                          setDroppedCols(next);
                        }}>
                          {isDropped
                            ? <Square className="w-4 h-4 text-text-tertiary" />
                            : <CheckSquare className="w-4 h-4 text-brand" />
                          }
                        </button>
                      </td>
                      <td className="px-3 py-2 font-medium text-text-primary">{col.name}</td>
                      <td className="px-3 py-2">
                        <select
                          value={typeChanges[col.name] ?? col.type}
                          onChange={(e) => setTypeChanges({ ...typeChanges, [col.name]: e.target.value as ColumnType })}
                          className="text-xs border border-border rounded px-1.5 py-1 bg-white text-text-primary"
                          disabled={isDropped}
                        >
                          {["string","number","date","boolean"].map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {st.nullCount > 0
                          ? <span className="badge-warning">{st.nullCount}</span>
                          : <span className="text-text-tertiary">0</span>
                        }
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={renames[col.name] ?? col.name}
                          onChange={(e) => setRenames({ ...renames, [col.name]: e.target.value })}
                          className="text-xs border border-border rounded px-2 py-1 w-28 text-text-primary"
                          disabled={isDropped}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {st.nullCount > 0 ? (
                          <select
                            value={fillNullsConfig[col.name]?.method ?? ""}
                            onChange={(e) => {
                              if (!e.target.value) {
                                const next = { ...fillNullsConfig };
                                delete next[col.name];
                                setFillNullsConfig(next);
                              } else {
                                setFillNullsConfig({
                                  ...fillNullsConfig,
                                  [col.name]: { method: e.target.value as "mean" | "median" | "mode" | "custom" | "dropRow" }
                                });
                              }
                            }}
                            className="text-xs border border-border rounded px-1.5 py-1 bg-white text-text-primary"
                            disabled={isDropped}
                          >
                            <option value="">skip</option>
                            <option value="mean">mean</option>
                            <option value="median">median</option>
                            <option value="mode">mode</option>
                            <option value="dropRow">drop row</option>
                            <option value="custom">custom</option>
                          </select>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {col.type === "string" ? (
                          <select
                            value={textOps[col.name] ?? ""}
                            onChange={(e) => {
                              const next = { ...textOps };
                              if (!e.target.value) delete next[col.name];
                              else next[col.name] = e.target.value as "trim" | "upper" | "lower" | "title";
                              setTextOps(next);
                            }}
                            className="text-xs border border-border rounded px-1.5 py-1 bg-white text-text-primary"
                            disabled={isDropped}
                          >
                            <option value="">none</option>
                            <option value="trim">trim</option>
                            <option value="upper">UPPER</option>
                            <option value="lower">lower</option>
                            <option value="title">Title</option>
                          </select>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {outlierCount > 0 ? (
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={removeOutliersSet.has(col.name)}
                              onChange={(e) => {
                                const next = new Set(removeOutliersSet);
                                if (e.target.checked) next.add(col.name);
                                else next.delete(col.name);
                                setRemoveOutliersSet(next);
                              }}
                              className="w-3.5 h-3.5 accent-brand"
                            />
                            <span className={cn("badge text-[10px] px-1.5 py-0.5",
                              removeOutliersSet.has(col.name) ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                            )}>
                              {outlierCount}
                            </span>
                          </label>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Apply button */}
      <button onClick={buildAndApply} className="btn-primary w-full gap-2">
        <RefreshCcw className="w-4 h-4" />
        Apply Cleaning & Continue to Transform
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
