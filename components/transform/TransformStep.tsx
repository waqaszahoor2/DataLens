"use client";

import { useState, useMemo } from "react";
import {
  Plus, Trash2, ChevronRight, Play, X,
  Filter, ArrowUpDown, Group, Calculator,
  Calendar, Type, RotateCcw, TrendingUp
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { runPipeline, generateId } from "@/lib/dataTransform";
import type { TransformStep, FilterCondition } from "@/store/useDataStore";
import { cn } from "@/lib/utils";

type StepType = "filter" | "sort" | "groupBy" | "calculatedColumn" | "dateExtract" | "rollingAvg" | "cumulativeSum" | "stringSplit" | "stringConcat" | "unpivot";

const STEP_TYPES: Array<{ type: StepType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
  { type: "filter", label: "Filter Rows", icon: Filter, desc: "Add conditions to filter rows" },
  { type: "sort", label: "Sort", icon: ArrowUpDown, desc: "Sort by one or more columns" },
  { type: "groupBy", label: "Group By", icon: Group, desc: "Aggregate by column values" },
  { type: "calculatedColumn", label: "Calculated Column", icon: Calculator, desc: "Create formula-based column" },
  { type: "dateExtract", label: "Date Extract", icon: Calendar, desc: "Extract year, month, day from date" },
  { type: "rollingAvg", label: "Rolling Average", icon: TrendingUp, desc: "Moving window average" },
  { type: "cumulativeSum", label: "Cumulative Sum", icon: TrendingUp, desc: "Running total" },
  { type: "stringSplit", label: "Split Column", icon: Type, desc: "Split string into multiple columns" },
  { type: "stringConcat", label: "Concat Columns", icon: Type, desc: "Combine multiple columns" },
  { type: "unpivot", label: "Unpivot (Melt)", icon: RotateCcw, desc: "Wide to long format" },
];

export default function TransformStep() {
  const { datasets, activeDatasetId, updateDataset, setPipelineStep } = useDataStore();
  const dataset = datasets.find((d) => d.id === activeDatasetId);

  const [pendingSteps, setPendingSteps] = useState<TransformStep[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [preview, setPreview] = useState<boolean>(false);

  const columns = dataset?.columns ?? [];
  const colNames = columns.map((c) => c.name);

  const addStep = (type: StepType) => {
    let step: TransformStep;
    const id = generateId();
    switch (type) {
      case "filter":
        step = { id, type: "filter", conditions: [{ id: generateId(), column: colNames[0] ?? "", operator: "=", value: "", connector: "AND" }] };
        break;
      case "sort":
        step = { id, type: "sort", conditions: [{ column: colNames[0] ?? "", direction: "asc" }] };
        break;
      case "groupBy":
        step = { id, type: "groupBy", config: { columns: [colNames[0] ?? ""], aggregations: [{ column: colNames[1] ?? "", func: "sum", alias: `sum_${colNames[1] ?? ""}` }] } };
        break;
      case "calculatedColumn":
        step = { id, type: "calculatedColumn", config: { name: "new_column", formula: "" } };
        break;
      case "dateExtract":
        step = { id, type: "dateExtract", column: colNames[0] ?? "", parts: ["year", "month"] };
        break;
      case "rollingAvg":
        step = { id, type: "rollingAvg", column: colNames[0] ?? "", window: 3, newColumn: `rolling_${colNames[0] ?? ""}` };
        break;
      case "cumulativeSum":
        step = { id, type: "cumulativeSum", column: colNames[0] ?? "", newColumn: `cum_${colNames[0] ?? ""}` };
        break;
      case "stringSplit":
        step = { id, type: "stringSplit", column: colNames[0] ?? "", separator: ",", newColumns: ["part_1", "part_2"] };
        break;
      case "stringConcat":
        step = { id, type: "stringConcat", columns: colNames.slice(0, 2), separator: "_", newColumn: "combined" };
        break;
      case "unpivot":
        step = { id, type: "unpivot", idColumns: colNames.slice(0, 1), valueColumns: colNames.slice(1), variableName: "variable", valueName: "value" };
        break;
      default:
        return;
    }
    setPendingSteps([...pendingSteps, step]);
    setEditingStep(id);
    setShowAddMenu(false);
  };

  const removeStep = (id: string) => setPendingSteps(pendingSteps.filter((s) => s.id !== id));

  const previewData = useMemo(() => {
    if (!dataset || !preview) return [];
    const allSteps = [...dataset.pipeline, ...pendingSteps];
    return runPipeline(dataset.rawData, allSteps).slice(0, 20);
  }, [dataset, pendingSteps, preview]);

  const handleApply = () => {
    if (!dataset || !pendingSteps.length) {
      setPipelineStep(3);
      return;
    }
    const allSteps = [...dataset.pipeline, ...pendingSteps];
    const transformedData = runPipeline(dataset.rawData, allSteps);
    updateDataset(dataset.id, { pipeline: allSteps, transformedData });
    setPipelineStep(3);
  };

  const updateStep = (id: string, updater: (s: TransformStep) => TransformStep) => {
    setPendingSteps(pendingSteps.map((s) => s.id === id ? updater(s) : s));
  };

  if (!dataset) return (
    <div className="text-center py-16 text-text-tertiary">
      <p>No dataset loaded. Go back to Import first.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Existing pipeline */}
      {dataset.pipeline.length > 0 && (
        <div className="panel p-4">
          <h4 className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
            Applied in Clean Step ({dataset.pipeline.length} steps)
          </h4>
          <div className="flex flex-wrap gap-1">
            {dataset.pipeline.map((s) => (
              <span key={s.id} className="badge-neutral text-[10px]">{s.type}</span>
            ))}
          </div>
        </div>
      )}

      {/* Pending steps */}
      {pendingSteps.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Transform Steps</h3>
          {pendingSteps.map((step, idx) => (
            <StepEditor
              key={step.id}
              step={step}
              index={idx}
              columns={colNames}
              isEditing={editingStep === step.id}
              onToggleEdit={() => setEditingStep(editingStep === step.id ? null : step.id)}
              onRemove={() => removeStep(step.id)}
              onUpdate={(updater) => updateStep(step.id, updater)}
            />
          ))}
        </div>
      )}

      {/* Add step menu */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="btn-outline w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Transform Step
        </button>
        {showAddMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-card-lg shadow-card-lg z-20 p-2 grid grid-cols-2 gap-1 animate-fade-in">
            {STEP_TYPES.map(({ type, label, icon: Icon, desc }) => (
              <button
                key={type}
                onClick={() => addStep(type)}
                className="flex items-start gap-2 p-2 rounded-lg text-left hover:bg-muted transition-colors"
              >
                <Icon className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-text-primary">{label}</div>
                  <div className="text-[10px] text-text-tertiary">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview toggle */}
      {pendingSteps.length > 0 && (
        <button
          onClick={() => setPreview(!preview)}
          className="btn-secondary gap-2 w-full"
        >
          <Play className="w-4 h-4 text-brand" />
          {preview ? "Hide Preview" : "Preview Result"}
        </button>
      )}

      {preview && previewData.length > 0 && (
        <div className="panel overflow-hidden animate-fade-in">
          <div className="panel-header">
            <span className="text-sm font-semibold text-text-primary">
              Preview ({previewData.length} rows)
            </span>
          </div>
          <div className="overflow-x-auto max-h-56 custom-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(previewData[0] ?? {}).map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 15).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{String(val ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button onClick={handleApply} className="btn-primary w-full gap-2">
        {pendingSteps.length > 0 ? `Apply ${pendingSteps.length} Transform${pendingSteps.length > 1 ? "s" : ""}` : "Skip Transforms"}
        <ChevronRight className="w-4 h-4" />
        Continue to Model
      </button>
    </div>
  );
}

function StepEditor({
  step, index, columns, isEditing, onToggleEdit, onRemove, onUpdate,
}: {
  step: TransformStep;
  index: number;
  columns: string[];
  isEditing: boolean;
  onToggleEdit: () => void;
  onRemove: () => void;
  onUpdate: (updater: (s: TransformStep) => TransformStep) => void;
}) {
  return (
    <div className="panel overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleEdit}
      >
        <span className="w-5 h-5 rounded bg-brand text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <span className="text-sm font-medium text-text-primary flex-1">{step.type}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="btn-icon text-red-400 hover:text-red-600">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {isEditing && (
        <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30 space-y-2 animate-fade-in">
          {step.type === "filter" && (
            <FilterEditor step={step} columns={columns} onUpdate={onUpdate} />
          )}
          {step.type === "sort" && (
            <SortEditor step={step} columns={columns} onUpdate={onUpdate} />
          )}
          {step.type === "groupBy" && (
            <GroupByEditor step={step} columns={columns} onUpdate={onUpdate} />
          )}
          {step.type === "calculatedColumn" && (
            <CalcColEditor step={step} columns={columns} onUpdate={onUpdate} />
          )}
          {step.type === "dateExtract" && (
            <div className="flex gap-3 flex-wrap text-sm">
              <select
                value={step.column}
                onChange={(e) => onUpdate((s) => s.type === "dateExtract" ? { ...s, column: e.target.value } : s)}
                className="input w-40"
              >
                {columns.map((c) => <option key={c}>{c}</option>)}
              </select>
              {(["year","month","week","day","hour"] as const).map((p) => (
                <label key={p} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(step.parts as string[]).includes(p)}
                    onChange={(e) => {
                      onUpdate((s) => {
                        if (s.type !== "dateExtract") return s;
                        const parts = e.target.checked
                          ? [...s.parts, p]
                          : s.parts.filter((x) => x !== p);
                        return { ...s, parts };
                      });
                    }}
                    className="accent-brand"
                  />
                  {p}
                </label>
              ))}
            </div>
          )}
          {(step.type === "rollingAvg" || step.type === "cumulativeSum") && (
            <div className="flex gap-2">
              <select
                value={step.column}
                onChange={(e) => onUpdate((s) => ({ ...s, column: e.target.value }))}
                className="input flex-1"
              >
                {columns.map((c) => <option key={c}>{c}</option>)}
              </select>
              {step.type === "rollingAvg" && (
                <input
                  type="number"
                  value={step.window}
                  onChange={(e) => onUpdate((s) => s.type === "rollingAvg" ? { ...s, window: Number(e.target.value) } : s)}
                  className="input w-20"
                  placeholder="Window"
                  min={1}
                />
              )}
              <input
                value={step.newColumn}
                onChange={(e) => onUpdate((s) => ({ ...s, newColumn: e.target.value }))}
                className="input flex-1"
                placeholder="Output column name"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterEditor({ step, columns, onUpdate }: {
  step: Extract<TransformStep, { type: "filter" }>;
  columns: string[];
  onUpdate: (u: (s: TransformStep) => TransformStep) => void;
}) {
  const addCond = () => {
    onUpdate((s) => s.type !== "filter" ? s : {
      ...s, conditions: [...s.conditions, { id: generateId(), column: columns[0] ?? "", operator: "=", value: "", connector: "AND" }]
    });
  };
  return (
    <div className="space-y-2">
      {step.conditions.map((cond, i) => (
        <div key={cond.id} className="flex items-center gap-2">
          {i > 0 && (
            <select
              value={cond.connector}
              onChange={(e) => onUpdate((s) => s.type !== "filter" ? s : {
                ...s, conditions: s.conditions.map((c) => c.id === cond.id ? { ...c, connector: e.target.value as "AND"|"OR" } : c)
              })}
              className="input w-16 text-xs"
            >
              <option>AND</option><option>OR</option>
            </select>
          )}
          <select value={cond.column} onChange={(e) => onUpdate((s) => s.type !== "filter" ? s : {
            ...s, conditions: s.conditions.map((c) => c.id === cond.id ? { ...c, column: e.target.value } : c)
          })} className="input flex-1 text-xs">
            {columns.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={cond.operator} onChange={(e) => onUpdate((s) => s.type !== "filter" ? s : {
            ...s, conditions: s.conditions.map((c) => c.id === cond.id ? { ...c, operator: e.target.value as FilterCondition["operator"] } : c)
          })} className="input w-28 text-xs">
            {["=","!=",">","<",">=","<=","contains","not_contains","is_null","is_not_null"].map((op) => (
              <option key={op}>{op}</option>
            ))}
          </select>
          {!["is_null","is_not_null"].includes(cond.operator) && (
            <input value={cond.value} onChange={(e) => onUpdate((s) => s.type !== "filter" ? s : {
              ...s, conditions: s.conditions.map((c) => c.id === cond.id ? { ...c, value: e.target.value } : c)
            })} className="input flex-1 text-xs" placeholder="value" />
          )}
          <button onClick={() => onUpdate((s) => s.type !== "filter" ? s : {
            ...s, conditions: s.conditions.filter((c) => c.id !== cond.id)
          })} className="text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button onClick={addCond} className="btn-ghost btn-sm gap-1">
        <Plus className="w-3 h-3" /> Add Condition
      </button>
    </div>
  );
}

function SortEditor({ step, columns, onUpdate }: {
  step: Extract<TransformStep, { type: "sort" }>;
  columns: string[];
  onUpdate: (u: (s: TransformStep) => TransformStep) => void;
}) {
  return (
    <div className="space-y-2">
      {step.conditions.map((cond, i) => (
        <div key={i} className="flex items-center gap-2">
          <select value={cond.column} onChange={(e) => onUpdate((s) => s.type !== "sort" ? s : {
            ...s, conditions: s.conditions.map((c, j) => j === i ? { ...c, column: e.target.value } : c)
          })} className="input flex-1 text-xs">
            {columns.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={cond.direction} onChange={(e) => onUpdate((s) => s.type !== "sort" ? s : {
            ...s, conditions: s.conditions.map((c, j) => j === i ? { ...c, direction: e.target.value as "asc"|"desc" } : c)
          })} className="input w-20 text-xs">
            <option value="asc">ASC</option><option value="desc">DESC</option>
          </select>
          <button onClick={() => onUpdate((s) => s.type !== "sort" ? s : {
            ...s, conditions: s.conditions.filter((_, j) => j !== i)
          })} className="text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button onClick={() => onUpdate((s) => s.type !== "sort" ? s : {
        ...s, conditions: [...s.conditions, { column: columns[0] ?? "", direction: "asc" as const }]
      })} className="btn-ghost btn-sm gap-1">
        <Plus className="w-3 h-3" /> Add Column
      </button>
    </div>
  );
}

function GroupByEditor({ step, columns, onUpdate }: {
  step: Extract<TransformStep, { type: "groupBy" }>;
  columns: string[];
  onUpdate: (u: (s: TransformStep) => TransformStep) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text-secondary mb-1 block">Group By Columns</label>
        <div className="flex flex-wrap gap-1">
          {columns.map((col) => (
            <button
              key={col}
              onClick={() => onUpdate((s) => {
                if (s.type !== "groupBy") return s;
                const cols = s.config.columns.includes(col)
                  ? s.config.columns.filter((c) => c !== col)
                  : [...s.config.columns, col];
                return { ...s, config: { ...s.config, columns: cols } };
              })}
              className={cn(
                "badge cursor-pointer transition-colors",
                (step.config.columns as string[]).includes(col) ? "badge-brand" : "badge-neutral"
              )}
            >
              {col}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-text-secondary mb-1 block">Aggregations</label>
        {(step.config.aggregations as Array<{ column: string; func: string; alias: string }>).map((agg, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <select value={agg.func} onChange={(e) => onUpdate((s) => {
              if (s.type !== "groupBy") return s;
              const aggs = s.config.aggregations.map((a, j) => j === i ? { ...a, func: e.target.value as "sum"|"avg"|"count"|"min"|"max"|"first"|"last" } : a);
              return { ...s, config: { ...s.config, aggregations: aggs } };
            })} className="input w-24 text-xs">
              {["sum","avg","count","min","max"].map((f) => <option key={f}>{f}</option>)}
            </select>
            <select value={agg.column} onChange={(e) => onUpdate((s) => {
              if (s.type !== "groupBy") return s;
              const aggs = s.config.aggregations.map((a, j) => j === i ? { ...a, column: e.target.value, alias: `${a.func}_${e.target.value}` } : a);
              return { ...s, config: { ...s.config, aggregations: aggs } };
            })} className="input flex-1 text-xs">
              {columns.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input value={agg.alias} onChange={(e) => onUpdate((s) => {
              if (s.type !== "groupBy") return s;
              const aggs = s.config.aggregations.map((a, j) => j === i ? { ...a, alias: e.target.value } : a);
              return { ...s, config: { ...s.config, aggregations: aggs } };
            })} className="input flex-1 text-xs" placeholder="alias" />
          </div>
        ))}
        <button onClick={() => onUpdate((s) => {
          if (s.type !== "groupBy") return s;
          return { ...s, config: { ...s.config, aggregations: [...s.config.aggregations, { column: columns[0] ?? "", func: "sum" as const, alias: `sum_${columns[0] ?? ""}` }] } };
        })} className="btn-ghost btn-sm gap-1">
          <Plus className="w-3 h-3" /> Add Aggregation
        </button>
      </div>
    </div>
  );
}

function CalcColEditor({ step, columns, onUpdate }: {
  step: Extract<TransformStep, { type: "calculatedColumn" }>;
  columns: string[];
  onUpdate: (u: (s: TransformStep) => TransformStep) => void;
}) {
  return (
    <div className="space-y-2">
      <input
        value={step.config.name}
        onChange={(e) => onUpdate((s) => s.type !== "calculatedColumn" ? s : { ...s, config: { ...s.config, name: e.target.value } })}
        className="input text-xs"
        placeholder="New column name"
      />
      <input
        value={step.config.formula}
        onChange={(e) => onUpdate((s) => s.type !== "calculatedColumn" ? s : { ...s, config: { ...s.config, formula: e.target.value } })}
        className="input font-mono text-xs"
        placeholder="e.g. revenue * 0.9 or date_diff(end_date, start_date)"
      />
      <div className="flex flex-wrap gap-1">
        {columns.map((col) => (
          <button key={col} onClick={() => onUpdate((s) => s.type !== "calculatedColumn" ? s : {
            ...s, config: { ...s.config, formula: (s.config.formula ?? "") + col }
          })} className="badge-neutral cursor-pointer hover:bg-muted text-[10px]">
            {col}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-text-tertiary">
        Use column names directly in formulas. Supported: +, -, *, /, Math.*(), date_diff(a,b)
      </p>
    </div>
  );
}
