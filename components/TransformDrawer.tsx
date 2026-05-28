"use client";

import { useState, useCallback } from "react";
import { X, Play, ArrowUpDown, Save, Layers } from "lucide-react";
import { useStore } from "@/lib/store";
import { runPipeline } from "@/lib/transforms";
import type { PipelineStep } from "@/lib/store";

export default function TransformDrawer({ onClose }: { onClose: () => void }) {
  const {
    rawData, pipeline, transformedData, setTransformedData,
    togglePipelineStep, removePipelineStep, saveSnapshot
  } = useStore();
  const [snapshotName, setSnapshotName] = useState("");
  const [ran, setRan] = useState(false);

  const handleRun = useCallback(() => {
    const result = runPipeline(rawData, pipeline);
    setTransformedData(result);
    setRan(true);
    setTimeout(() => setRan(false), 2000);
  }, [rawData, pipeline, setTransformedData]);

  const activeTransforms = pipeline.filter((p) => p.enabled).length;

  return (
    <div className="absolute left-0 top-0 h-full z-40 flex animate-slide-right">
      {/* Drawer */}
      <div className="w-96 bg-white border-r border-border shadow-panel flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand" />
            <div>
              <h3 className="font-semibold text-text1">Re-Transform Data</h3>
              <p className="text-xs text-text2">{activeTransforms} active · {transformedData.length.toLocaleString()} rows</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface2 text-text3 hover:text-text1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pipeline list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {pipeline.length === 0 ? (
            <div className="text-center py-8 text-text3">
              <ArrowUpDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No transforms in pipeline.</p>
              <p className="text-xs mt-1">Go to the Transform page to add operations.</p>
            </div>
          ) : (
            pipeline.map((step, i) => (
              <DrawerStepCard
                key={step.id}
                step={step}
                index={i}
                onToggle={() => togglePipelineStep(step.id)}
                onRemove={() => removePipelineStep(step.id)}
              />
            ))
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <button
            id="drawer-run-pipeline-btn"
            onClick={handleRun}
            className={`dl-btn-primary w-full justify-center ${ran ? "bg-green-500" : ""}`}
          >
            <Play className="w-4 h-4" />
            {ran ? "✓ Applied!" : "Run Pipeline & Update Charts"}
          </button>

          <div className="flex gap-2">
            <input
              className="dl-input flex-1 text-sm"
              placeholder="Save as snapshot..."
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
            />
            <button
              onClick={() => {
                if (snapshotName) {
                  saveSnapshot(snapshotName);
                  setSnapshotName("");
                }
              }}
              className="dl-btn-secondary text-sm px-3"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Click-away overlay */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}

function DrawerStepCard({
  step,
  index,
  onToggle,
  onRemove,
}: {
  step: PipelineStep;
  index: number;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const t = step.transform;
  const label = step.label || t.type;

  return (
    <div className={`p-3 rounded-xl border ${step.enabled ? "border-brand/30 bg-brand-light/20" : "border-border bg-surface2 opacity-60"}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-text3">#{index + 1}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text1">{label}</p>
          <p className="text-xs text-text2 font-mono">
            {t.type === "filter" && `${t.column} ${t.operator} "${t.value}"`}
            {t.type === "sort" && `${t.column} (${t.order})`}
            {t.type === "groupby" && `by ${t.groupColumns.join(", ")}`}
            {t.type === "rename" && `${t.oldName} → ${t.newName}`}
            {t.type === "computed" && `${t.name} = ${t.expression}`}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onToggle}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
              step.enabled
                ? "border-brand bg-brand text-white"
                : "border-border text-text3 hover:border-brand hover:text-brand"
            }`}
          >
            {step.enabled ? "ON" : "OFF"}
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded-lg hover:bg-red-50 text-text3 hover:text-danger"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
