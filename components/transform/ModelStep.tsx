"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, TrendingUp, Activity, Brain,
  ChevronRight, Loader2, Sparkles, AlertTriangle
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { correlationMatrix, linearRegression, kMeans, detectOutliers } from "@/lib/dataTransform";

import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, ReferenceLine
} from "recharts";

export default function ModelStep() {
  const router = useRouter();
  const { datasets, activeDatasetId } = useDataStore();
  const dataset = datasets.find((d) => d.id === activeDatasetId);

  const [activeTab, setActiveTab] = useState<"stats" | "correlation" | "forecast" | "cluster" | "anomaly" | "ai">("stats");
  const [forecastCol, setForecastCol] = useState("");
  const [forecastDate, setForecastDate] = useState("");
  const [forecastN, setForecastN] = useState(6);
  const [clusterCols, setClusterCols] = useState<string[]>([]);
  const [k, setK] = useState(3);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [clusterResult, setClusterResult] = useState<number[] | null>(null);

  const data = useMemo(() => dataset?.transformedData ?? [], [dataset]);
  const numCols = useMemo(() => dataset?.columns.filter((c) => c.type === "number").map((c) => c.name) ?? [], [dataset]);
  const dateCols = useMemo(() => dataset?.columns.filter((c) => c.type === "date" || c.name.toLowerCase().includes("date") || c.name.toLowerCase().includes("month")).map((c) => c.name) ?? [], [dataset]);

  const descStats = useMemo(() => {
    return numCols.slice(0, 8).map((col) => {
      const vals = data.map((r) => Number(r[col])).filter((v) => !isNaN(v));
      if (!vals.length) return null;
      const sorted = [...vals].sort((a, b) => a - b);
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / vals.length;
      const variance = vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / vals.length;
      return {
        col, count: vals.length,
        mean: mean.toFixed(2), std: Math.sqrt(variance).toFixed(2),
        min: sorted[0].toFixed(2), max: sorted[sorted.length-1].toFixed(2),
        p25: sorted[Math.floor(sorted.length*0.25)].toFixed(2),
        p50: sorted[Math.floor(sorted.length*0.5)].toFixed(2),
        p75: sorted[Math.floor(sorted.length*0.75)].toFixed(2),
      };
    }).filter(Boolean);
  }, [data, numCols]);

  const corrMatrix = useMemo(() => {
    if (numCols.length < 2) return null;
    return correlationMatrix(data, numCols.slice(0, 6));
  }, [data, numCols]);

  const forecastData = useMemo(() => {
    if (!forecastCol || !forecastDate || !data.length) return null;
    const sorted = [...data].sort((a, b) => String(a[forecastDate] ?? "").localeCompare(String(b[forecastDate] ?? "")));
    const yVals = sorted.map((r) => Number(r[forecastCol])).filter((v) => !isNaN(v));
    const xVals = yVals.map((_, i) => i);
    const { slope, intercept, r2 } = linearRegression(xVals, yVals);
    const historical = sorted.slice(-20).map((r, i) => ({
      x: String(r[forecastDate] ?? i),
      actual: Number(r[forecastCol]),
      fitted: slope * (xVals.length - 20 + i) + intercept,
    }));
    const forecasts = Array.from({ length: forecastN }, (_, i) => ({
      x: `+${i+1}`,
      forecast: slope * (xVals.length + i) + intercept,
      upper: (slope * (xVals.length + i) + intercept) * 1.1,
      lower: (slope * (xVals.length + i) + intercept) * 0.9,
    }));
    return { historical, forecasts, r2: r2.toFixed(3), slope: slope.toFixed(4) };
  }, [data, forecastCol, forecastDate, forecastN]);

  const anomalyData = useMemo(() => {
    if (!numCols.length) return [];
    return numCols.slice(0, 4).map((col) => {
      const outlierSet = detectOutliers(data, col);
      return { col, count: outlierSet.size, indices: Array.from(outlierSet).slice(0, 5) };
    });
  }, [data, numCols]);

  if (!dataset) return (
    <div className="text-center py-16 text-text-tertiary">
      <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-yellow-400" />
      <p>No dataset loaded.</p>
    </div>
  );

  const runClustering = () => {
    if (clusterCols.length < 1) return;
    const labels = kMeans(data, clusterCols, k);
    setClusterResult(labels);
  };

  const generateAISummary = async () => {
    setAiLoading(true);
    try {
      const colInfo = dataset.columns.map((c) => `${c.name} (${c.type})`).join(", ");
      const sampleRows = JSON.stringify(data.slice(0, 5));
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Analyze this dataset and provide a concise plain-English summary (3-4 sentences) covering: what the data is about, key patterns, notable statistics, and any recommendations for analysis.\n\nColumns: ${colInfo}\n\nSample (first 5 rows): ${sampleRows}\n\nTotal rows: ${data.length}`
          }],
          systemPrompt: "You are DataLens AI, an expert data analyst. Be concise, insightful, and data-driven. Focus on what's interesting about the data.",
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      let text = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const d = JSON.parse(line.slice(6));
              text += d.text ?? "";
              setAiSummary(text);
            } catch {}
          }
        }
      }
    } catch {
      setAiSummary("Failed to generate AI summary. Check your API key.");
    } finally {
      setAiLoading(false);
    }
  };

  const corrCols = numCols.slice(0, 6);
  const corrVals = corrMatrix ? corrCols : [];

  const getHeatColor = (val: number) => {
    const abs = Math.abs(val);
    if (val > 0) return `rgba(29, 158, 117, ${abs})`;
    return `rgba(239, 68, 68, ${abs})`;
  };

  return (
    <div className="space-y-5">
      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl overflow-x-auto no-scrollbar">
        {[
          { id: "stats", label: "Statistics", icon: BarChart3 },
          { id: "correlation", label: "Correlation", icon: Activity },
          { id: "forecast", label: "Forecast", icon: TrendingUp },
          { id: "cluster", label: "Clustering", icon: Brain },
          { id: "anomaly", label: "Anomalies", icon: AlertTriangle },
          { id: "ai", label: "AI Summary", icon: Sparkles },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0",
              activeTab === id ? "bg-white shadow-card text-text-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {activeTab === "stats" && (
        <div className="panel overflow-hidden animate-fade-in">
          <div className="panel-header">
            <span className="text-sm font-semibold text-text-primary">Descriptive Statistics</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {["Column","Count","Mean","Std Dev","Min","25%","50%","75%","Max"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {descStats.map((s) => s && (
                  <tr key={s.col}>
                    <td className="font-semibold text-brand">{s.col}</td>
                    <td>{s.count}</td>
                    <td>{s.mean}</td>
                    <td>{s.std}</td>
                    <td>{s.min}</td>
                    <td>{s.p25}</td>
                    <td>{s.p50}</td>
                    <td>{s.p75}</td>
                    <td>{s.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correlation tab */}
      {activeTab === "correlation" && corrMatrix && (
        <div className="panel overflow-hidden animate-fade-in">
          <div className="panel-header">
            <span className="text-sm font-semibold text-text-primary">Correlation Matrix</span>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-text-tertiary"></th>
                  {corrVals.map((c) => (
                    <th key={c} className="px-2 py-1 text-text-secondary font-medium text-center max-w-16 truncate">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrVals.map((rowCol) => (
                  <tr key={rowCol}>
                    <td className="px-2 py-1 font-semibold text-text-secondary pr-3 text-right">{rowCol}</td>
                    {corrVals.map((colCol) => {
                      const val = corrMatrix[rowCol]?.[colCol] ?? 0;
                      return (
                        <td key={colCol} className="px-1 py-1 text-center">
                          <div
                            className="w-12 h-8 rounded flex items-center justify-center text-[10px] font-mono font-medium mx-auto"
                            style={{ background: getHeatColor(val), color: Math.abs(val) > 0.5 ? "white" : "#101828" }}
                          >
                            {val.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Forecast tab */}
      {activeTab === "forecast" && (
        <div className="space-y-4 animate-fade-in">
          <div className="panel p-4 flex gap-3 flex-wrap">
            <div className="flex-1 min-w-32">
              <label className="text-xs font-medium text-text-secondary mb-1 block">Date Column</label>
              <select value={forecastDate} onChange={(e) => setForecastDate(e.target.value)} className="input">
                <option value="">Select...</option>
                {[...dateCols, ...dataset.columns.map((c) => c.name)].filter((v, i, a) => a.indexOf(v) === i).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-32">
              <label className="text-xs font-medium text-text-secondary mb-1 block">Value Column</label>
              <select value={forecastCol} onChange={(e) => setForecastCol(e.target.value)} className="input">
                <option value="">Select...</option>
                {numCols.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-text-secondary mb-1 block">Periods</label>
              <input type="number" value={forecastN} onChange={(e) => setForecastN(Number(e.target.value))} className="input" min={1} max={24} />
            </div>
          </div>
          {forecastData && (
            <div className="panel p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-text-primary">Linear Regression Forecast</h4>
                <div className="flex gap-3 text-xs text-text-secondary">
                  <span>R² = {forecastData.r2}</span>
                  <span>Slope = {forecastData.slope}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={[...forecastData.historical, ...forecastData.forecasts]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
                  <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line dataKey="actual" stroke="#1D9E75" strokeWidth={2} dot={false} name="Actual" />
                  <Line dataKey="fitted" stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Fitted" />
                  <Line dataKey="forecast" stroke="#533AB9" strokeWidth={2} dot={{ fill: "#533AB9", r: 3 }} name="Forecast" />
                  <ReferenceLine x={forecastData.historical[forecastData.historical.length-1]?.x} stroke="#E4E7EC" strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Clustering tab */}
      {activeTab === "cluster" && (
        <div className="space-y-4 animate-fade-in">
          <div className="panel p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-2 block">Select Columns for Clustering</label>
              <div className="flex flex-wrap gap-1">
                {numCols.map((col) => (
                  <button
                    key={col}
                    onClick={() => setClusterCols(clusterCols.includes(col) ? clusterCols.filter((c) => c !== col) : [...clusterCols, col])}
                    className={cn("badge cursor-pointer transition-colors", clusterCols.includes(col) ? "badge-brand" : "badge-neutral")}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-text-secondary">K (clusters):</label>
              <input type="number" value={k} onChange={(e) => setK(Number(e.target.value))} className="input w-20" min={2} max={10} />
              <button onClick={runClustering} disabled={clusterCols.length < 1} className="btn-primary btn-sm gap-1">
                <Brain className="w-3.5 h-3.5" /> Run K-Means
              </button>
            </div>
          </div>
          {clusterResult && clusterCols.length >= 2 && (
            <div className="panel p-4 animate-fade-in">
              <h4 className="text-sm font-semibold mb-3">Cluster Visualization ({k} clusters)</h4>
              <div className="flex gap-2 mb-3 flex-wrap">
                {Array.from({ length: k }, (_, i) => (
                  <span key={i} className="badge" style={{ background: `hsl(${i * 360/k}, 70%, 90%)`, color: `hsl(${i * 360/k}, 70%, 30%)` }}>
                    Cluster {i+1}: {clusterResult.filter((c) => c === i).length} rows
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
                  <XAxis dataKey="x" name={clusterCols[0]} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="y" name={clusterCols[1]} tick={{ fontSize: 10 }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  {Array.from({ length: k }, (_, ci) => (
                    <Scatter
                      key={ci}
                      name={`Cluster ${ci+1}`}
                      data={data.filter((_, i) => clusterResult[i] === ci).slice(0, 200).map((r) => ({
                        x: Number(r[clusterCols[0]]),
                        y: clusterCols[1] ? Number(r[clusterCols[1]]) : 0,
                      }))}
                      fill={`hsl(${ci * 360/k}, 70%, 55%)`}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Anomaly tab */}
      {activeTab === "anomaly" && (
        <div className="space-y-3 animate-fade-in">
          {anomalyData.map(({ col, count }) => (
            <div key={col} className={cn("panel p-4", count > 0 && "border-orange-200")}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">{col}</span>
                {count > 0
                  ? <span className="badge-warning">{count} outlier{count !== 1 ? "s" : ""} (IQR)</span>
                  : <span className="badge-success">No outliers</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Summary tab */}
      {activeTab === "ai" && (
        <div className="space-y-4 animate-fade-in">
          <div className="panel p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-ai flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">AI Data Summary</h4>
                <p className="text-xs text-text-tertiary">Claude analyzes your dataset and provides insights</p>
              </div>
            </div>
            <button onClick={generateAISummary} disabled={aiLoading} className="btn-ai gap-2 w-full mb-4">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiLoading ? "Generating..." : "Generate AI Summary"}
            </button>
            {aiSummary && (
              <div className="bg-ai-50 border border-ai-200 rounded-lg p-4 text-sm text-text-primary leading-relaxed animate-fade-in">
                {aiSummary}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Continue button */}
      <button onClick={() => router.push("/dashboard")} className="btn-primary w-full gap-2">
        <BarChart3 className="w-4 h-4" />
        Go to Dashboard Builder
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
