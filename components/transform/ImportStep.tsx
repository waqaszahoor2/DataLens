"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload, FileText, Database, Globe, Table2,
  ChevronRight, CheckCircle, AlertCircle, Loader2,
  BarChart3, Users, TrendingUp, X
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { inferColumns, generateId, SAMPLE_DATASETS, computeColumnStats } from "@/lib/utils";
import type { Row } from "@/store/useDataStore";
import { cn } from "@/lib/utils";

type ImportMode = "file" | "url" | "paste" | "sample";

export default function ImportStep() {
  const { addDataset, setPipelineStep } = useDataStore();
  const [mode, setMode] = useState<ImportMode>("file");
  const [preview, setPreview] = useState<Row[]>([]);
  const [previewName, setPreviewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [pasteInput, setPasteInput] = useState("");

  const processData = useCallback((data: Row[], name: string) => {
    if (!data.length) { setError("File is empty or could not be parsed."); return; }
    setPreview(data.slice(0, 100));
    setPreviewName(name);
    setError(null);
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        Papa.parse(file, {
          header: true, skipEmptyLines: true,
          complete: (res) => {
            processData(res.data as Row[], file.name.replace(/\.[^.]+$/, ""));
            setLoading(false);
          },
          error: () => { setError("Failed to parse CSV."); setLoading(false); }
        });
      } else if (file.name.match(/\.xlsx?$/)) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Row>(ws);
        processData(data, file.name.replace(/\.[^.]+$/, ""));
        setLoading(false);
      } else if (file.name.endsWith(".json")) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const data = Array.isArray(parsed) ? parsed : [parsed];
        processData(data, file.name.replace(/\.[^.]+$/, ""));
        setLoading(false);
      } else {
        setError("Unsupported file type. Use CSV, Excel (.xlsx), or JSON."); setLoading(false);
      }
    } catch {
      setError("Failed to read file."); setLoading(false);
    }
  }, [processData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "text/csv": [".csv"], "application/json": [".json"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"] }, multiple: false,
  });

  const handleUrlImport = async () => {
    if (!urlInput) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/execute-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: `return null;`, data: [], columns: [] }),
      });
      if (!res.ok) throw new Error("Proxy unavailable");
      // Direct fetch (may fail on CORS)
      const dataRes = await fetch(urlInput);
      const text = await dataRes.text();
      if (urlInput.includes(".csv") || text.trim().startsWith('"') || text.includes(",")) {
        const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
        processData(parsed.data, urlInput.split("/").pop() ?? "dataset");
      } else {
        const json = JSON.parse(text);
        processData(Array.isArray(json) ? json : [json], "dataset");
      }
    } catch {
      setError("Failed to fetch URL. Check CORS or paste the content directly.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasteImport = () => {
    if (!pasteInput.trim()) return;
    setError(null);
    try {
      if (pasteInput.trim().startsWith("[") || pasteInput.trim().startsWith("{")) {
        const json = JSON.parse(pasteInput);
        processData(Array.isArray(json) ? json : [json], "pasted-data");
      } else {
        const parsed = Papa.parse<Row>(pasteInput, { header: true, skipEmptyLines: true });
        processData(parsed.data, "pasted-data");
      }
    } catch {
      setError("Could not parse pasted content. Try CSV or JSON format.");
    }
  };

  const handleLoadSample = (key: string) => {
    const sample = SAMPLE_DATASETS[key];
    if (sample) processData(sample.rows, sample.name);
  };

  const handleConfirm = () => {
    if (!preview.length) return;
    const columns = inferColumns(preview);
    const id = generateId();
    addDataset({
      id,
      name: previewName || "Dataset",
      rawData: preview,
      columns,
      pipeline: [],
      transformedData: preview,
      createdAt: new Date().toISOString(),
    });
    setPipelineStep(1);
  };

  const columns = preview.length ? inferColumns(preview) : [];
  const qualityStats = preview.length ? columns.map((col) => computeColumnStats(preview, col.name)) : [];
  const nullCount = qualityStats.reduce((s, q) => s + q.nullCount, 0);
  const dupCount = preview.length - new Set(preview.map((r) => JSON.stringify(r))).size;

  return (
    <div className="space-y-5">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(["file", "url", "paste", "sample"] as ImportMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setPreview([]); setError(null); }}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 capitalize",
              mode === m ? "bg-white shadow-card text-text-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {m === "file" ? "Upload File" : m === "url" ? "URL / API" : m === "paste" ? "Paste Data" : "Sample Data"}
          </button>
        ))}
      </div>

      {/* Import area */}
      {mode === "file" && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-card-lg p-12 text-center cursor-pointer transition-all duration-200",
            isDragActive ? "border-brand bg-brand-50" : "border-border hover:border-brand/50 hover:bg-muted/50"
          )}
        >
          <input {...getInputProps()} />
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" />
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 text-brand" />
              </div>
              <p className="text-sm font-medium text-text-primary mb-1">
                {isDragActive ? "Drop file here" : "Drag & drop your file"}
              </p>
              <p className="text-xs text-text-tertiary">
                Supports CSV, Excel (.xlsx), JSON · Max 50MB
              </p>
              <button className="btn-primary btn-sm mt-4">
                Browse Files
              </button>
            </>
          )}
        </div>
      )}

      {mode === "url" && (
        <div className="space-y-3">
          <div className="panel p-4">
            <label className="text-sm font-medium text-text-primary mb-2 block">
              REST API / CSV / JSON URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://api.example.com/data.csv"
                  className="input pl-9"
                  onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
                />
              </div>
              <button onClick={handleUrlImport} disabled={loading} className="btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                "https://raw.githubusercontent.com/datasets/covid-19/main/data/countries-aggregated.csv",
                "https://jsonplaceholder.typicode.com/users",
              ].map((url) => (
                <button
                  key={url}
                  onClick={() => setUrlInput(url)}
                  className="text-xs text-brand hover:underline truncate max-w-[300px]"
                >
                  {url.split("/").pop()}
                </button>
              ))}
            </div>
          </div>
          <div className="panel p-4">
            <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-text-tertiary" /> Connect to Database
            </h4>
            <p className="text-xs text-text-tertiary">
              PostgreSQL and Google Sheets connections require a backend proxy. Coming soon.
            </p>
          </div>
        </div>
      )}

      {mode === "paste" && (
        <div className="space-y-3">
          <textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder={"Paste CSV or JSON data here...\n\nCSV example:\nname,age,city\nAlice,30,NYC\nBob,25,LA\n\nOr paste JSON array."}
            className="input h-48 font-mono text-xs resize-none"
          />
          <button onClick={handlePasteImport} className="btn-primary">
            Parse Data
          </button>
        </div>
      )}

      {mode === "sample" && (
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(SAMPLE_DATASETS).map(([key, ds]) => {
            const icons: Record<string, React.ComponentType<{ className?: string }>> = {
              sales2024: BarChart3, employees: Users, marketing: TrendingUp,
            };
            const Icon = icons[key] ?? FileText;
            return (
              <button
                key={key}
                onClick={() => handleLoadSample(key)}
                className={cn(
                  "card-hover text-left flex items-start gap-3",
                  preview.length > 0 && previewName === ds.name && "ring-2 ring-brand"
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{ds.name}</div>
                  <div className="text-xs text-text-tertiary mt-0.5">{ds.description}</div>
                  <div className="text-xs text-brand mt-1">{ds.rows.length} rows</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Data quality report */}
      {preview.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-brand" />
              Data Quality Report
            </h3>
            <button onClick={() => setPreview([])} className="text-text-tertiary hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Rows", value: preview.length.toLocaleString() },
              { label: "Columns", value: columns.length },
              { label: "Null Values", value: nullCount, warn: nullCount > 0 },
              { label: "Duplicate Rows", value: dupCount, warn: dupCount > 0 },
            ].map((stat) => (
              <div key={stat.label} className={cn(
                "card text-center",
                stat.warn && (stat.value as number) > 0 && "border-yellow-200 bg-yellow-50"
              )}>
                <div className={cn(
                  "metric-value text-lg",
                  stat.warn && (stat.value as number) > 0 ? "text-yellow-700" : "text-text-primary"
                )}>
                  {stat.value}
                </div>
                <div className="metric-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Column type summary */}
          <div className="flex flex-wrap gap-2">
            {columns.map((col) => (
              <span key={col.name} className="badge-neutral">
                <span className="font-medium">{col.name}</span>
                <span className={cn(
                  "ml-1 text-[9px] px-1 py-0.5 rounded",
                  col.type === "number" ? "bg-blue-100 text-blue-600" :
                  col.type === "date" ? "bg-purple-100 text-purple-600" :
                  col.type === "boolean" ? "bg-green-100 text-green-600" :
                  "bg-gray-100 text-gray-500"
                )}>
                  {col.type}
                </span>
              </span>
            ))}
          </div>

          {/* Preview table */}
          <div className="panel">
            <div className="panel-header">
              <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Table2 className="w-4 h-4 text-text-tertiary" />
                Preview (first 10 rows of {preview.length})
              </span>
            </div>
            <div className="overflow-x-auto max-h-64 custom-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.name}>
                        <div className="flex items-center gap-1">
                          {col.name}
                          <span className={cn(
                            "text-[8px] px-1 rounded",
                            col.type === "number" ? "text-blue-500" :
                            col.type === "date" ? "text-purple-500" : "text-gray-400"
                          )}>
                            {col.type[0]}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      {columns.map((col) => (
                        <td key={col.name}>
                          {row[col.name] === null || row[col.name] === "" ? (
                            <span className="text-text-tertiary italic text-xs">null</span>
                          ) : String(row[col.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirm */}
          <button onClick={handleConfirm} className="btn-primary w-full gap-2">
            Import {preview.length.toLocaleString()} Rows → Continue to Clean
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
