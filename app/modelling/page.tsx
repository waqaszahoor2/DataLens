"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Cpu, Layers, BarChart3, TrendingUp, ScatterChart,
  AlertOctagon, Sparkles, RefreshCw, Download, Play, HelpCircle
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import Sidebar from "@/components/sidebar/Sidebar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Load Plotly dynamically to avoid server hydration issues
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] bg-muted/30 rounded-xl flex items-center justify-center">
      <RefreshCw className="w-5 h-5 animate-spin text-green-primary" />
    </div>
  )
});

export default function ModellingPage() {
  const { sheets, activeSheetId, setActiveSheet, updateSheet } = useDataStore();
  const [activeTab, setActiveTab] = useState<string>("All Sheets");

  // Selected numeric columns
  const [selectedSheetData, setSelectedSheetData] = useState<any[]>([]);
  const [numericCols, setNumericCols] = useState<string[]>([]);
  const [allCols, setAllCols] = useState<string[]>([]);

  // 1. Correlation Matrix State
  const [corrMatrix, setCorrMatrix] = useState<number[][]>([]);
  const [selectedCorrCell, setSelectedCorrCell] = useState<{ x: string; y: string } | null>(null);

  // 2. Descriptive Stats State
  const [descStats, setDescStats] = useState<any[]>([]);

  // 3. Forecast State
  const [forecastDateCol, setForecastDateCol] = useState("");
  const [forecastValCol, setForecastValCol] = useState("");
  const [forecastPeriods, setForecastPeriods] = useState(12);
  const [forecastData, setForecastData] = useState<any>(null);

  // 4. Clustering State
  const [clusterCols, setClusterCols] = useState<string[]>([]);
  const [clusterK, setClusterK] = useState(3);
  const [clusteredPoints, setClusteredPoints] = useState<any[]>([]);

  // 5. Anomaly Detection State
  const [anomalyCol, setAnomalyCol] = useState("");
  const [anomalyMethod, setAnomalyMethod] = useState<"iqr" | "zscore">("iqr");
  const [anomalyThreshold, setAnomalyThreshold] = useState(1.5);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  // 6. AI Summary State
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Load selected sheet details
  useEffect(() => {
    let data: any[] = [];
    if (activeTab === "All Sheets") {
      // Combine all sheets vertically
      sheets.forEach(s => {
        if (s.data) data = [...data, ...s.data];
      });
    } else {
      const activeSheet = sheets.find(s => s.name === activeTab);
      if (activeSheet && activeSheet.data) {
        data = activeSheet.data;
      }
    }

    setSelectedSheetData(data);

    if (data.length > 0) {
      const firstRow = data[0];
      const cols = Object.keys(firstRow);
      setAllCols(cols);

      // Infer numeric columns
      const numCols = cols.filter(c => {
        const sample = data.map(r => r[c]).filter(v => v !== null && v !== "");
        return sample.length > 0 && sample.every(v => !isNaN(Number(v)));
      });
      setNumericCols(numCols);

      if (numCols.length >= 2) {
        setSelectedCorrCell({ x: numCols[0], y: numCols[1] });
      }
      if (cols.length > 0) {
        setForecastDateCol(cols.find(c => c.toLowerCase().includes("date") || c.toLowerCase().includes("year")) || cols[0]);
        setForecastValCol(numCols[0] || cols[0]);
        setAnomalyCol(numCols[0] || cols[0]);
      }
    }
  }, [activeTab, sheets]);

  // Compute Correlation Matrix
  useEffect(() => {
    if (numericCols.length === 0 || selectedSheetData.length === 0) return;

    const matrix: number[][] = [];
    for (let i = 0; i < numericCols.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < numericCols.length; j++) {
        row.push(calculateCorrelation(numericCols[i], numericCols[j]));
      }
      matrix.push(row);
    }
    setCorrMatrix(matrix);
  }, [numericCols, selectedSheetData]);

  // Helper to calculate Pearson Correlation Coefficient
  const calculateCorrelation = (colX: string, colY: string): number => {
    const x = selectedSheetData.map(r => Number(r[colX])).filter(v => !isNaN(v));
    const y = selectedSheetData.map(r => Number(r[colY])).filter(v => !isNaN(v));
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (denominator === 0) return 0;
    return Number((numerator / denominator).toFixed(4));
  };

  // Compute Descriptive Stats
  useEffect(() => {
    if (numericCols.length === 0 || selectedSheetData.length === 0) return;

    const stats = numericCols.map(col => {
      const vals = selectedSheetData.map(r => Number(r[col])).filter(v => !isNaN(v)).sort((a, b) => a - b);
      const count = vals.length;
      if (count === 0) return null;

      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / count;
      const median = vals[Math.floor(count / 2)];
      const min = vals[0];
      const max = vals[count - 1];
      const p25 = vals[Math.floor(count * 0.25)];
      const p75 = vals[Math.floor(count * 0.75)];

      const sqDiffs = vals.map(v => Math.pow(v - mean, 2));
      const std = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / count);

      return {
        column: col,
        count,
        mean: mean.toFixed(2),
        median: median.toFixed(2),
        std: std.toFixed(2),
        min: min.toFixed(2),
        p25: p25.toFixed(2),
        p75: p75.toFixed(2),
        max: max.toFixed(2)
      };
    }).filter(Boolean);

    setDescStats(stats);
  }, [numericCols, selectedSheetData]);

  // Run Extrapolated Forecast
  const runForecast = () => {
    if (!forecastDateCol || !forecastValCol || selectedSheetData.length === 0) return;

    const sortedData = [...selectedSheetData]
      .map(r => ({
        date: r[forecastDateCol],
        val: Number(r[forecastValCol])
      }))
      .filter(v => v.date && !isNaN(v.val))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sortedData.length < 3) {
      toast.error("Need at least 3 historical rows to build forecast model.");
      return;
    }

    // Extrapolate using standard least squares
    const n = sortedData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += sortedData[i].val;
      sumXY += i * sortedData[i].val;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast periods
    const lastDate = new Date(sortedData[n - 1].date);
    const forecastPoints: any[] = [];
    for (let i = 1; i <= forecastPeriods; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setMonth(lastDate.getMonth() + i);

      const val = slope * (n - 1 + i) + intercept;
      forecastPoints.push({
        date: nextDate.toISOString().split("T")[0],
        val: Number(val.toFixed(2))
      });
    }

    setForecastData({
      history: sortedData,
      forecast: forecastPoints
    });
    toast.success("Extrapolated Forecast models calculated!");
  };

  // Run K-Means Clustering Natively
  const runClustering = () => {
    if (clusterCols.length < 2) {
      toast.error("Please select at least 2 columns to cluster on.");
      return;
    }

    // Filter valid rows
    const dataPoints = selectedSheetData.map((r, index) => {
      const pt: Record<string, number> = {};
      let valid = true;
      clusterCols.forEach(col => {
        const val = Number(r[col]);
        if (isNaN(val)) valid = false;
        pt[col] = val;
      });
      return { index, pt, valid };
    }).filter(p => p.valid);

    if (dataPoints.length === 0) {
      toast.error("No valid numeric records to cluster.");
      return;
    }

    // Initialize centroids randomly
    let centroids = dataPoints
      .slice(0, clusterK)
      .map(p => ({ ...p.pt }));

    let iterations = 10;
    const assignments: number[] = new Array(dataPoints.length).fill(0);

    for (let iter = 0; iter < iterations; iter++) {
      // Assign points to nearest centroid
      dataPoints.forEach((p, idx) => {
        let minDist = Infinity;
        let nearestCentroid = 0;
        centroids.forEach((c, cIdx) => {
          let dist = 0;
          clusterCols.forEach(col => {
            dist += Math.pow(p.pt[col] - c[col], 2);
          });
          if (dist < minDist) {
            minDist = dist;
            nearestCentroid = cIdx;
          }
        });
        assignments[idx] = nearestCentroid;
      });

      // Recalculate centroids
      centroids = centroids.map((c, cIdx) => {
        const assignedPoints = dataPoints.filter((_, idx) => assignments[idx] === cIdx);
        if (assignedPoints.length === 0) return c;
        const newCentroid: Record<string, number> = {};
        clusterCols.forEach(col => {
          newCentroid[col] = assignedPoints.reduce((sum, p) => sum + p.pt[col], 0) / assignedPoints.length;
        });
        return newCentroid;
      });
    }

    const output = dataPoints.map((p, idx) => ({
      x: p.pt[clusterCols[0]],
      y: p.pt[clusterCols[1]],
      cluster: `Cluster ${assignments[idx] + 1}`
    }));

    setClusteredPoints(output);
    toast.success(`K-Means clustering with K=${clusterK} completed!`);
  };

  // Run Anomaly Detection
  const runAnomalyDetection = () => {
    if (!anomalyCol) return;

    const values = selectedSheetData.map(r => Number(r[anomalyCol])).filter(v => !isNaN(v));
    if (values.length === 0) return;

    const hits: any[] = [];

    if (anomalyMethod === "iqr") {
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - anomalyThreshold * iqr;
      const upperBound = q3 + anomalyThreshold * iqr;

      selectedSheetData.forEach((row, i) => {
        const val = Number(row[anomalyCol]);
        if (!isNaN(val) && (val < lowerBound || val > upperBound)) {
          hits.push({ rowId: i, val, row });
        }
      });
    } else {
      // Z-Score method
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      selectedSheetData.forEach((row, i) => {
        const val = Number(row[anomalyCol]);
        if (!isNaN(val) && std > 0) {
          const z = Math.abs((val - mean) / std);
          if (z > anomalyThreshold) {
            hits.push({ rowId: i, val, row });
          }
        }
      });
    }

    setAnomalies(hits);
    toast.success(`Detected ${hits.length} anomalous values!`);
  };

  // Generate Claude AI summary
  const getAiSummary = async () => {
    setAiLoading(true);
    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Summarize this dataset schema:\n${sheets.map(s => `Sheet: ${s.name}, columns: ${s.columns.map(c => `${c.name} (${c.type})`).join(", ")}`).join("\n")}\nProvide a clear, high-level analysis of what the data contains, potential anomalies, and descriptive suggestions.`
            }
          ]
        })
      });
      const data = await response.json();
      setAiSummary(data.choices?.[0]?.message?.content || data.content || "Could not retrieve summary.");
      toast.success("AI Data summary successfully generated!");
    } catch {
      toast.error("AI request failed.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F8FA] overflow-hidden">
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 flex flex-col md:pl-[220px] h-full overflow-hidden transition-all duration-300">
        
        {/* Header row */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-light flex items-center justify-center">
              <Cpu className="w-4.5 h-4.5 text-green-primary" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-text-primary leading-tight">Data Modelling Workstation</h1>
              <p className="text-[10px] text-text-tertiary">Statistical analysis, predictions, and clustering</p>
            </div>
          </div>
        </header>

        {/* Dynamic Sheets Tabs Selector (TOP ROW) */}
        <div className="bg-white border-b px-6 py-2.5 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setActiveTab("All Sheets")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "All Sheets" ? "bg-green-primary text-white shadow" : "text-text-secondary hover:text-text-primary"
              )}
            >
              All Sheets
            </button>
            {sheets.map((sheet) => (
              <button
                key={sheet.name}
                onClick={() => {
                  setActiveTab(sheet.name);
                  setActiveSheet(sheet.id);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === sheet.name ? "bg-green-primary text-white shadow" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {sheet.name}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-text-tertiary font-medium">Loaded: {selectedSheetData.length.toLocaleString()} total rows</span>
        </div>

        {/* 2x3 Modeling Cards Grid */}
        <div className="flex-1 overflow-y-auto custom-scroll p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Card 1 — Correlation Matrix */}
          <div className="card-lg bg-white border border-border p-5 flex flex-col h-[360px] overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-text-tertiary" />
                Correlation Heatmap
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center overflow-hidden">
              {numericCols.length >= 2 && corrMatrix.length > 0 ? (
                <Plot
                  data={[
                    {
                      z: corrMatrix,
                      x: numericCols,
                      y: numericCols,
                      type: "heatmap",
                      colorscale: [
                        [0, "rgb(239, 68, 68)"], // negative (red)
                        [0.5, "rgb(255, 255, 255)"], // zero (white)
                        [1, "rgb(29, 158, 117)"] // positive (green)
                      ],
                      zmin: -1,
                      zmax: 1
                    }
                  ]}
                  layout={{
                    width: 320,
                    height: 240,
                    margin: { t: 10, b: 30, l: 50, r: 10 },
                    xaxis: { tickangle: 45 }
                  }}
                  config={{ displayModeBar: false }}
                />
              ) : (
                <div className="text-center text-text-tertiary py-10 text-xs">
                  Need at least 2 numeric columns to show heatmap.
                </div>
              )}
            </div>
          </div>

          {/* Card 2 — Descriptive Statistics */}
          <div className="card-lg bg-white border border-border p-5 flex flex-col h-[360px] overflow-hidden">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <span className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-text-tertiary" />
                Descriptive Statistics
              </span>
            </div>

            <div className="flex-1 overflow-auto custom-scroll">
              {descStats.length > 0 ? (
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="p-2 font-bold text-text-primary">Column</th>
                      <th className="p-2 font-bold text-text-primary">Mean</th>
                      <th className="p-2 font-bold text-text-primary">Median</th>
                      <th className="p-2 font-bold text-text-primary">Std Dev</th>
                      <th className="p-2 font-bold text-text-primary">Min</th>
                      <th className="p-2 font-bold text-text-primary">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {descStats.map((row) => (
                      <tr key={row.column} className="border-b hover:bg-muted/40">
                        <td className="p-2 font-bold truncate max-w-[80px] text-text-primary">{row.column}</td>
                        <td className="p-2">{row.mean}</td>
                        <td className="p-2">{row.median}</td>
                        <td className="p-2">{row.std}</td>
                        <td className="p-2">{row.min}</td>
                        <td className="p-2">{row.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-text-tertiary py-10 text-xs">
                  No descriptive stats available.
                </div>
              )}
            </div>
          </div>

          {/* Card 3 — Forecast */}
          <div className="card-lg bg-white border border-border p-5 flex flex-col h-[400px] overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <span className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-text-tertiary" />
                Forecast Predictive Models
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-shrink-0 mb-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">Date Column</label>
                <select value={forecastDateCol} onChange={(e) => setForecastDateCol(e.target.value)} className="w-full p-2 border rounded-lg text-xs">
                  {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">Value Column</label>
                <select value={forecastValCol} onChange={(e) => setForecastValCol(e.target.value)} className="w-full p-2 border rounded-lg text-xs">
                  {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-text-secondary block mb-1">Periods to Forecast: {forecastPeriods}</label>
                <input type="range" min="1" max="24" value={forecastPeriods} onChange={(e) => setForecastPeriods(Number(e.target.value))} className="w-full accent-green-primary" />
              </div>
            </div>

            <button onClick={runForecast} className="w-full py-2 bg-green-primary hover:bg-green-600 text-white rounded-xl text-xs font-bold mb-4 shadow transition-all">
              Run Least-Squares Forecast
            </button>

            {forecastData && (
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <Plot
                  data={[
                    {
                      x: forecastData.history.map((h: any) => h.date),
                      y: forecastData.history.map((h: any) => h.val),
                      name: "Historical",
                      type: "scatter",
                      mode: "lines",
                      line: { color: "rgb(29, 158, 117)" }
                    },
                    {
                      x: forecastData.forecast.map((f: any) => f.date),
                      y: forecastData.forecast.map((f: any) => f.val),
                      name: "Forecast",
                      type: "scatter",
                      mode: "lines",
                      line: { color: "rgb(83, 58, 185)", dash: "dash" }
                    }
                  ]}
                  layout={{
                    width: 320,
                    height: 180,
                    margin: { t: 10, b: 30, l: 40, r: 10 },
                    legend: { orientation: "h" }
                  }}
                  config={{ displayModeBar: false }}
                />
              </div>
            )}
          </div>

          {/* Card 4 — Clustering */}
          <div className="card-lg bg-white border border-border p-5 flex flex-col h-[400px] overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <span className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-text-tertiary" />
                K-Means Clustering
              </span>
            </div>

            <div className="space-y-3 flex-shrink-0 mb-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">Target Columns</label>
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                  {numericCols.map((col) => (
                    <label key={col} className="flex items-center gap-1 px-2.5 py-1 bg-muted rounded-lg text-[10px] font-bold cursor-pointer hover:bg-muted/70">
                      <input
                        type="checkbox"
                        checked={clusterCols.includes(col)}
                        onChange={(e) => {
                          if (e.target.checked) setClusterCols([...clusterCols, col]);
                          else setClusterCols(clusterCols.filter(c => c !== col));
                        }}
                      />
                      {col}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">Number of Clusters (K): {clusterK}</label>
                <input type="range" min="2" max="10" value={clusterK} onChange={(e) => setClusterK(Number(e.target.value))} className="w-full accent-green-primary" />
              </div>
            </div>

            <button onClick={runClustering} className="w-full py-2 bg-green-primary hover:bg-green-600 text-white rounded-xl text-xs font-bold mb-4 shadow transition-all">
              Run K-Means Centroid Algorithm
            </button>

            {clusteredPoints.length > 0 && (
              <div className="flex-1 flex items-center justify-center overflow-hidden animate-fade-in">
                <Plot
                  data={[
                    {
                      x: clusteredPoints.map(p => p.x),
                      y: clusteredPoints.map(p => p.y),
                      mode: "markers",
                      type: "scatter",
                      transforms: [{
                        type: "groupby",
                        groups: clusteredPoints.map(p => p.cluster)
                      }]
                    }
                  ] as any}
                  layout={{
                    width: 320,
                    height: 180,
                    margin: { t: 10, b: 30, l: 40, r: 10 }
                  }}
                  config={{ displayModeBar: false }}
                />
              </div>
            )}
          </div>

          {/* Card 5 — Anomaly Detection */}
          <div className="card-lg bg-white border border-border p-5 flex flex-col h-[400px] overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <span className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-text-tertiary" />
                Anomaly Detection
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-shrink-0 mb-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">Analyze Column</label>
                <select value={anomalyCol} onChange={(e) => setAnomalyCol(e.target.value)} className="w-full p-2 border rounded-lg text-xs">
                  {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">Threshold: {anomalyThreshold}</label>
                <input type="range" min="0.5" max="3" step="0.1" value={anomalyThreshold} onChange={(e) => setAnomalyThreshold(Number(e.target.value))} className="w-full accent-green-primary" />
              </div>
              <div className="col-span-2 flex gap-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input type="radio" name="anomalyMethod" checked={anomalyMethod === "iqr"} onChange={() => setAnomalyMethod("iqr")} /> IQR Method
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input type="radio" name="anomalyMethod" checked={anomalyMethod === "zscore"} onChange={() => setAnomalyMethod("zscore")} /> Z-Score Method
                </label>
              </div>
            </div>

            <button onClick={runAnomalyDetection} className="w-full py-2 bg-green-primary hover:bg-green-600 text-white rounded-xl text-xs font-bold mb-4 shadow transition-all">
              Run Detection Outliers
            </button>

            {anomalies.length > 0 && (
              <div className="flex-1 overflow-y-auto custom-scroll border rounded-xl">
                <table className="w-full text-left text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-red-50 border-b">
                      <th className="p-2 font-bold text-red-700">Row Index</th>
                      <th className="p-2 font-bold text-red-700">Outlier Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map((row) => (
                      <tr key={row.rowId} className="border-b bg-red-50/10 hover:bg-red-50/20">
                        <td className="p-2 font-bold text-text-primary">{row.rowId}</td>
                        <td className="p-2 text-red-600">{row.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card 6 — AI Summary */}
          <div className="card-lg bg-white border border-border p-5 flex flex-col h-[400px] overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <span className="text-xs font-extrabold text-[#533AB9] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#533AB9]" />
                AI Data summary (Claude)
              </span>
            </div>

            <button
              onClick={getAiSummary}
              disabled={aiLoading}
              className="w-full py-2 bg-[#533AB9] hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl text-xs font-bold mb-4 shadow flex items-center justify-center gap-1.5 transition-all"
            >
              {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate Claude AI Summary
            </button>

            <div className="flex-1 bg-muted/20 border rounded-xl p-4 text-xs leading-relaxed text-text-secondary text-left overflow-y-auto custom-scroll whitespace-pre-line select-text">
              {aiSummary || "Click the button to send sheet schemas to Claude for an instant multi-dimensional dataset summary, suggested key relationships, and chart suggestions."}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
