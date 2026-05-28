"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import {
  Upload, FileText, Database, Globe, Table2,
  ChevronRight, CheckCircle, AlertCircle, Loader2,
  BarChart3, Users, TrendingUp, X, Check, Edit2
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { parseExcelFile } from "@/lib/parseExcel";
import type { SheetData } from "@/lib/parseExcel";
import { inferColumns, generateId, SAMPLE_DATASETS, computeColumnStats } from "@/lib/utils";
import type { Row } from "@/store/useDataStore";
import { cn } from "@/lib/utils";

type ImportMode = "file" | "url" | "paste" | "sample";

export default function ImportStep() {
  const { addDataset, addSheets, setPipelineStep } = useDataStore();
  const [mode, setMode] = useState<ImportMode>("file");
  const [preview, setPreview] = useState<Row[]>([]);
  const [previewName, setPreviewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [pasteInput, setPasteInput] = useState("");

  // Multi-sheet excel support state
  const [excelSheets, setExcelSheets] = useState<SheetData[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<Record<string, boolean>>({});
  const [sheetRenames, setSheetRenames] = useState<Record<string, string>>({});
  const [editingSheetIndex, setEditingSheetIndex] = useState<number | null>(null);
  const [sheetPreview, setSheetPreview] = useState<SheetData | null>(null);

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
    setExcelSheets([]);
    setSheetPreview(null);

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
        const parsedSheets = await parseExcelFile(file);
        if (parsedSheets.length > 1) {
          // Multi-sheet flow
          setExcelSheets(parsedSheets);
          const initialSelection: Record<string, boolean> = {};
          const initialRenames: Record<string, string> = {};
          parsedSheets.forEach((s) => {
            initialSelection[s.name] = true;
            initialRenames[s.name] = s.name;
          });
          setSelectedSheets(initialSelection);
          setSheetRenames(initialRenames);
          setLoading(false);
        } else if (parsedSheets.length === 1) {
          // Single-sheet flow
          processData(parsedSheets[0].data as Row[], parsedSheets[0].name);
          setLoading(false);
        } else {
          setError("No sheets found in Excel file.");
          setLoading(false);
        }
      } else if (file.name.endsWith(".json")) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const data = Array.isArray(parsed) ? parsed : [parsed];
        processData(data, file.name.replace(/\.[^.]+$/, ""));
        setLoading(false);
      } else {
        setError("Unsupported file type. Use CSV, Excel (.xlsx), or JSON."); setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to read file.";
      setError(msg); setLoading(false);
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
    
    // Add to Sheets
    addSheets([{
      id,
      name: previewName || "Dataset",
      originalName: previewName || "Dataset",
      originalCsv: Papa.unparse(preview),
      cleanedCsv: null,
      columns: columns.map(c => ({
        name: c.name,
        type: c.type as "string" | "number" | "date" | "boolean",
        nullCount: preview.filter(r => r[c.name] === null || r[c.name] === '').length,
        uniqueCount: new Set(preview.map(r => r[c.name])).size,
        sample: preview.slice(0, 3).map(r => r[c.name])
      })),
      rowCount: preview.length,
      pipelineSteps: [],
      linkedTo: [],
      version: 1,
      lastModified: new Date(),
      data: preview as Record<string, unknown>[]
    }]);

    setPipelineStep(1);
  };

  const handleImportExcelSheets = () => {
    const activeSheets = excelSheets.filter(s => selectedSheets[s.name]);
    if (activeSheets.length === 0) {
      setError("Please select at least one sheet to import.");
      return;
    }

    const sheetsToLoad = activeSheets.map(s => {
      const renamed = sheetRenames[s.name] || s.name;
      return {
        id: generateId(),
        name: renamed,
        originalName: s.name,
        originalCsv: s.csvString,
        cleanedCsv: null,
        columns: s.columns.map(c => ({
          name: c.name,
          type: c.type,
          nullCount: c.nullCount,
          uniqueCount: c.uniqueCount,
          sample: c.sample
        })),
        rowCount: s.rowCount,
        pipelineSteps: [],
        linkedTo: [],
        version: 1,
        lastModified: new Date(),
        data: s.data
      };
    });

    addSheets(sheetsToLoad);
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
            onClick={() => {
              setMode(m);
              setPreview([]);
              setExcelSheets([]);
              setSheetPreview(null);
              setError(null);
            }}
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
      {mode === "file" && excelSheets.length === 0 && (
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

      {/* Multi-sheet Excel Selector Panel (FIX 4 Requirement) */}
      {excelSheets.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card-lg border-brand-200 bg-brand-50/20 p-6">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 mb-4">
              <Table2 className="w-5 h-5 text-brand" />
              📊 {excelSheets.length} sheets detected in your Excel file
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scroll pr-2">
              {excelSheets.map((sheet, index) => (
                <div key={sheet.name} className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={!!selectedSheets[sheet.name]}
                      onChange={(e) => setSelectedSheets({ ...selectedSheets, [sheet.name]: e.target.checked })}
                      className="w-4 h-4 rounded text-brand focus:ring-brand border-gray-300"
                    />

                    {editingSheetIndex === index ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={sheetRenames[sheet.name] || ""}
                          onChange={(e) => setSheetRenames({ ...sheetRenames, [sheet.name]: e.target.value })}
                          className="px-2 py-1 text-xs border rounded-lg focus:ring-1 focus:ring-brand"
                        />
                        <button onClick={() => setEditingSheetIndex(null)} className="w-6 h-6 rounded bg-brand text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-text-primary">{sheetRenames[sheet.name] || sheet.name}</span>
                        <button onClick={() => setEditingSheetIndex(index)} className="p-1 hover:bg-muted rounded text-text-tertiary">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <span className="text-xs text-text-tertiary">({sheet.rowCount} rows · {sheet.columns.length} columns)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSheetPreview(sheet)}
                      className="px-3 py-1.5 border hover:bg-muted text-text-secondary rounded-lg text-xs font-bold transition-all"
                    >
                      Preview Sheet
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <button
                onClick={() => { setExcelSheets([]); setSheetPreview(null); }}
                className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-muted transition-all"
              >
                Cancel Upload
              </button>
              <button
                onClick={handleImportExcelSheets}
                className="px-5 py-2.5 bg-green-primary hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-all"
              >
                Import All Selected Sheets
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mini Sheet Preview */}
          {sheetPreview && (
            <div className="panel animate-fade-in">
              <div className="panel-header flex justify-between items-center">
                <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-text-tertiary" />
                  Preview: {sheetRenames[sheetPreview.name] || sheetPreview.name} (First 5 Rows)
                </span>
                <button onClick={() => setSheetPreview(null)} className="text-text-tertiary hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-x-auto max-h-60 custom-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      {sheetPreview.columns.map((c) => (
                        <th key={c.name}>{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetPreview.data.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {sheetPreview.columns.map((c) => (
                          <td key={c.name}>{String(row[c.name] ?? "null")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
          </div>
        </div>
      )}

      {mode === "paste" && (
        <div className="space-y-3">
          <textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder={"Paste CSV or JSON data here...\n\nCSV example:\nname,age,city\nAlice,30,NYC\nBob,25,LA"}
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
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Data quality report */}
      {preview.length > 0 && excelSheets.length === 0 && (
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

          <button onClick={handleConfirm} className="btn-primary w-full gap-2">
            Import {preview.length.toLocaleString()} Rows → Continue to Clean
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
