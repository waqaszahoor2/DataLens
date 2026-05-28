"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Code, Play, Sparkles, AlertTriangle, CheckCircle,
  Copy, Trash2, Download, Plus, Layers, Terminal,
  BarChart3, RefreshCw, HelpCircle, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { usePyodide } from "@/lib/usePyodide";
import Sidebar from "@/components/sidebar/Sidebar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

// Load Monaco Editor dynamically to prevent SSR hydration crashes
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// Load Plotly dynamically to avoid "window is not defined" issues
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-muted/30 rounded-xl flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-green-primary" />
    </div>
  )
});

interface Snippet {
  label: string;
  code: string;
}

interface SnippetGroup {
  section: string;
  items: Snippet[];
}

export default function PythonPage() {
  const { sheets, addChart } = useDataStore();
  const { isReady, runPython } = usePyodide();

  const [code, setCode] = useState<string>(`# ── DataLens Python Environment ──────────────
# All your sheets are pre-loaded as dataframes:
#   df_sheet1  — first sheet
#   df_sheet2  — second sheet
#   df_sheet3  — third sheet
#   df_sheet4  — fourth sheet
#   sheets     — dict of all sheets {'Sheet1': df, ...}
#
# To create a chart: build a plotly figure and
# assign it to the variable: output_chart
# It will render automatically in the Output panel.
# ─────────────────────────────────────────────

import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

# Print info about your sheets
for name, df in sheets.items():
    print(f"{name}: {df.shape[0]} rows × {df.shape[1]} cols")
    print(f"  Columns: {df.columns.tolist()}")
    print()
`);

  // Accordion active groups
  const [openAccordion, setOpenAccordion] = useState<string>("Create Charts");
  const [activeTab, setActiveTab] = useState<"chart" | "console" | "preview">("console");

  // Output states
  const [isRunning, setIsRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string>("Environment ready. Click [Run] to execute.");
  const [chartData, setChartData] = useState<any>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewShape, setPreviewShape] = useState<string>("(0, 0)");
  const [previewDtypes, setPreviewDtypes] = useState<Record<string, string>>({});
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // AI states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Snippets library
  const SNIPPET_GROUPS: SnippetGroup[] = [
    {
      section: "Create Charts",
      items: [
        { label: "Bar chart with plotly", code: "fig = px.bar(df, x=df.columns[0], y=df.columns[1], title='Simple Bar Chart')\noutput_chart = fig" },
        { label: "Line chart with plotly", code: "fig = px.line(df, x=df.columns[0], y=df.columns[1], title='Simple Line Chart')\noutput_chart = fig" },
        { label: "Pie chart with plotly", code: "fig = px.pie(df, names=df.columns[0], values=df.columns[1], title='Simple Pie Chart')\noutput_chart = fig" },
        { label: "Scatter plot with plotly", code: "fig = px.scatter(df, x=df.columns[0], y=df.columns[1], title='Scatter Plot')\noutput_chart = fig" },
        { label: "Heatmap with plotly", code: "corr = df.select_dtypes(include=[np.number]).corr()\nfig = px.imshow(corr, text_auto=True, title='Correlation Matrix Heatmap')\noutput_chart = fig" },
        { label: "Donut chart with plotly", code: "fig = px.pie(df, names=df.columns[0], values=df.columns[1], hole=0.4, title='Donut Chart')\noutput_chart = fig" }
      ]
    },
    {
      section: "Data Cleaning",
      items: [
        { label: "Remove duplicates", code: "result_df = df.drop_duplicates()\nprint(f'Removed {len(df) - len(result_df)} duplicate rows.')" },
        { label: "Drop null rows", code: "result_df = df.dropna()\nprint(f'Dropped {len(df) - len(result_df)} rows containing null values.')" },
        { label: "Fill nulls with mean", code: "numeric_cols = df.select_dtypes(include=[np.number]).columns\nresult_df = df.copy()\nfor col in numeric_cols:\n    result_df[col] = result_df[col].fillna(result_df[col].mean())\nprint('Filled missing numeric values with mean.')" },
        { label: "Fix column data types", code: "result_df = df.copy()\n# Example: Convert a column to numeric\n# result_df['column_name'] = pd.to_numeric(result_df['column_name'], errors='coerce')" },
        { label: "Strip whitespace", code: "result_df = df.copy()\nfor col in result_df.select_dtypes(include=['object']).columns:\n    result_df[col] = result_df[col].astype(str).str.strip()\nprint('Stripped leading/trailing whitespace from string columns.')" }
      ]
    },
    {
      section: "Data Transform",
      items: [
        { label: "Group by and sum", code: "result_df = df.groupby(df.columns[0]).sum().reset_index()\nprint('Grouped and aggregated dataset.')" },
        { label: "Filter rows by condition", code: "# Edit the condition to match your headers\nresult_df = df[df[df.columns[1]] > 0]\nprint(f'Filtered to {len(result_df)} rows.')" },
        { label: "Pivot table", code: "result_df = df.pivot_table(index=df.columns[0], columns=df.columns[1], values=df.columns[2], aggfunc='mean').reset_index()" },
        { label: "Cumulative sum", code: "result_df = df.copy()\nresult_df['cumulative_sum'] = result_df[df.columns[1]].cumsum()" }
      ]
    },
    {
      section: "Multi-Sheet Operations",
      items: [
        { label: "Load specific sheet", code: "sheet_name = list(sheets.keys())[0]\nfirst_df = sheets[sheet_name]\nprint(f'Loaded sheet: {sheet_name}')" },
        { label: "Merge Sheet1 with Sheet2", code: "# Merges two sheets on a common key\nkeys = list(sheets.keys())\nif len(keys) >= 2:\n    df1 = sheets[keys[0]]\n    df2 = sheets[keys[1]]\n    result_df = pd.merge(df1, df2, on='customer_id', how='inner')\n    print('Sheets merged successfully.')\nelse:\n    print('Need at least 2 loaded sheets to perform merge.')" }
      ]
    },
    {
      section: "Analysis & Modelling",
      items: [
        { label: "Descriptive statistics", code: "result_df = df.describe().reset_index()\nprint('Generated summary statistics.')" },
        { label: "Linear regression forecast", code: "from scipy.stats import linregress\n# Fits a linear trend to numeric columns\nx = np.arange(len(df))\ny = df[df.columns[1]].values\nslope, intercept, r_val, p_val, std_err = linregress(x, y)\nprint(f'Slope: {slope:.4f}, R-Squared: {r_val**2:.4f}')" }
      ]
    }
  ];

  const handleSnippetClick = (snippetCode: string) => {
    setCode(prev => prev + "\n" + snippetCode);
    toast.success("Snippet appended to editor!");
  };

  const handleRun = async () => {
    if (!isReady) {
      toast.error("Python environment is still initializing. Please wait...");
      return;
    }
    setIsRunning(true);
    setLastError(null);
    setConsoleLogs("Running code...");
    const startTime = performance.now();

    try {
      // Map sheets structure
      const workerSheets = sheets.map(s => ({
        name: s.name,
        csv: s.originalCsv
      }));

      const res = await runPython(code, workerSheets);
      const endTime = performance.now();
      setLastExecutionTime((endTime - startTime) / 1000);

      // Parse logs and outputs
      setConsoleLogs(res.console || "Code executed successfully with no print outputs.");
      setPreviewShape(res.shape || "(0, 0)");

      if (res.dtypes) {
        setPreviewDtypes(JSON.parse(res.dtypes));
      }

      if (res.csv) {
        Papa.parse(res.csv, {
          header: true,
          dynamicTyping: true,
          complete: (p) => {
            setPreviewRows(p.data.slice(0, 20));
          }
        });
      }

      if (res.chartJson) {
        setChartData(JSON.parse(res.chartJson));
        setActiveTab("chart");
        toast.success("Code run complete! Chart output updated.");
      } else {
        setChartData(null);
        setActiveTab("console");
        toast.success("Code run complete!");
      }
    } catch (err: any) {
      setLastError(err.message || "Failed to execute Python code.");
      setConsoleLogs(`Error occurred during execution:\n${err.message}`);
      setActiveTab("console");
      toast.error("Execution error! Check console tab.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Write complete python code for this goal: "${aiPrompt}". Here is the database schema:\n${sheets.map(s => `Sheet: ${s.name}, columns: ${s.columns.map(c => c.name).join(", ")}`).join("\n")}\nAlways assign any chart to 'output_chart' and results to 'result_df'. Respond ONLY with clean Python code inside code block.`
            }
          ]
        })
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.content || "";
      const codeMatch = content.match(/```python([\s\S]*?)```/) || content.match(/```([\s\S]*?)```/);
      const generatedCode = codeMatch ? codeMatch[1].trim() : content.trim();

      setCode(generatedCode);
      setShowAiInput(false);
      setAiPrompt("");
      toast.success("AI generated code inserted!");
    } catch {
      toast.error("AI Generation failed. Check API configuration.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiFix = async () => {
    if (!lastError) {
      toast.info("No execution errors found to fix.");
      return;
    }
    setAiGenerating(true);
    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Here is my Python code:\n\`\`\`python\n${code}\n\`\`\`\n\nIt failed with this error:\n${lastError}\n\nPlease fix the code and return only the corrected python code.`
            }
          ]
        })
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.content || "";
      const codeMatch = content.match(/```python([\s\S]*?)```/) || content.match(/```([\s\S]*?)```/);
      const fixedCode = codeMatch ? codeMatch[1].trim() : content.trim();

      setCode(fixedCode);
      toast.success("AI corrected code inserted!");
    } catch {
      toast.error("AI fix failed.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleFormat = () => {
    // Simple mock formatting
    toast.info("Format complete!");
  };

  const handleClear = () => {
    setCode("");
    toast.success("Editor cleared!");
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  const handleExportPy = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "datalens_script.py";
    a.click();
    toast.success("Script exported as .py file!");
  };

  const handleAddToDashboard = () => {
    if (!chartData) return;
    addChart({
      id: Math.random().toString(36).substring(2, 9),
      type: "scatter", // Compatibility fallback
      title: "Python Custom Visualization",
      datasetId: sheets[0]?.id || "python",
      pythonCode: code,
      x: 0,
      y: 0,
      w: 6,
      h: 4
    });
    toast.success("Widget added to Dashboard canvas!");
  };

  return (
    <div className="flex h-screen bg-[#F7F8FA] overflow-hidden">
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 flex flex-col md:pl-[220px] h-full overflow-hidden transition-all duration-300">
        
        {/* Header toolbar */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Code className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-text-primary leading-tight">Python Workspace</h1>
              <p className="text-[10px] text-text-tertiary">Real-time WebAssembly Pandas sandbox</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelpModal(true)}
              className="px-3.5 py-2 border border-border hover:bg-muted text-text-secondary rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <HelpCircle className="w-4 h-4 text-text-tertiary" />
              How to Use
            </button>

            <button
              onClick={handleRun}
              disabled={isRunning || !isReady}
              className="px-4 py-2 bg-green-primary hover:bg-green-600 disabled:bg-gray-200 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-all"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run Script
            </button>
          </div>
        </header>

        {/* Content Body — Three Columns */}
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT PANEL — Snippets Library (260px) */}
          <div className="w-[260px] border-r bg-white flex flex-col overflow-y-auto custom-scroll flex-shrink-0">
            <div className="p-4 border-b bg-muted/40">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-text-tertiary" />
                Python Snippet Library
              </span>
            </div>

            <div className="flex-1">
              {SNIPPET_GROUPS.map((group) => {
                const isOpen = openAccordion === group.section;
                return (
                  <div key={group.section} className="border-b">
                    <button
                      onClick={() => setOpenAccordion(isOpen ? "" : group.section)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                    >
                      <span className="text-xs font-bold text-text-primary">{group.section}</span>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isOpen && (
                      <div className="px-2 pb-3 pt-1 space-y-1 bg-muted/20 animate-fade-in">
                        {group.items.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => handleSnippetClick(item.code)}
                            className="w-full text-left px-3 py-2 text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-white rounded-lg border border-transparent hover:border-border shadow-sm hover:shadow transition-all"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTRE PANEL — Editor (Flexible) */}
          <div className="flex-1 border-r bg-white flex flex-col overflow-hidden">
            
            {/* Editor Toolbar */}
            <div className="p-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-1">
                <button onClick={() => setShowAiInput(!showAiInput)} className="px-3 py-1.5 bg-[#EEEDFE] hover:bg-[#DDD6FE] text-[#533AB9] rounded-lg text-xs font-bold flex items-center gap-1 transition-all">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Generate
                </button>
                <button onClick={handleAiFix} disabled={!lastError} className="px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 disabled:bg-gray-100 disabled:text-gray-400 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  AI Fix
                </button>
                <button onClick={handleFormat} className="px-2.5 py-1.5 hover:bg-muted text-text-secondary rounded-lg text-xs font-bold transition-all">
                  Format
                </button>
                <button onClick={handleClear} className="px-2.5 py-1.5 hover:bg-muted text-text-secondary rounded-lg text-xs font-bold transition-all">
                  Clear
                </button>
                <button onClick={handleCopyAll} className="px-2.5 py-1.5 hover:bg-muted text-text-secondary rounded-lg text-xs font-bold transition-all">
                  Copy All
                </button>
                <button onClick={handleExportPy} className="px-2.5 py-1.5 hover:bg-muted text-text-secondary rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  Export .py
                </button>
              </div>
            </div>

            {/* Inline AI Prompt Input */}
            {showAiInput && (
              <div className="p-3 border-b bg-[#EEEDFE]/40 animate-fade-in flex gap-2">
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. create a bar chart of units by region..."
                  className="flex-1 px-3 py-1.5 border rounded-lg text-xs focus:ring-1 focus:ring-[#533AB9] outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                />
                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating}
                  className="px-4 py-1.5 bg-[#533AB9] hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate
                </button>
              </div>
            )}

            {/* Monaco Container */}
            <div className="flex-1 relative">
              <Editor
                height="100%"
                language="python"
                value={code}
                onChange={(val) => setCode(val || "")}
                theme="light"
                options={{
                  fontSize: 12,
                  fontFamily: "JetBrains Mono, monospace",
                  minimap: { enabled: false },
                  scrollbar: { vertical: "visible", horizontal: "visible" },
                  automaticLayout: true
                }}
              />
            </div>
          </div>

          {/* RIGHT PANEL — Output (280px) */}
          <div className="w-[280px] bg-white flex flex-col overflow-hidden flex-shrink-0">
            
            {/* Tabs */}
            <div className="flex border-b bg-muted/40 h-10 flex-shrink-0">
              {(["chart", "console", "preview"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 text-center text-xs font-bold border-b-2 capitalize transition-all",
                    activeTab === tab ? "border-green-primary text-green-primary bg-white" : "border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab contents */}
            <div className="flex-1 overflow-y-auto custom-scroll p-4">
              
              {activeTab === "chart" && (
                <div className="space-y-4 animate-fade-in">
                  {chartData ? (
                    <>
                      <div className="border rounded-xl p-2 bg-[#F7F8FA]">
                        <Plot
                          data={chartData.data || []}
                          layout={{
                            ...chartData.layout,
                            width: 240,
                            height: 280,
                            margin: { t: 30, b: 30, l: 30, r: 10 }
                          }}
                          config={{ displayModeBar: false }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddToDashboard}
                          className="flex-1 py-2 bg-green-primary hover:bg-green-600 text-white text-xs font-bold rounded-lg shadow transition-all"
                        >
                          Add to Dashboard
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="h-[250px] border border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4">
                      <BarChart3 className="w-8 h-8 text-text-tertiary mb-2" />
                      <span className="text-xs font-semibold text-text-secondary">No output chart yet</span>
                      <span className="text-[10px] text-text-tertiary mt-1">Assign your Plotly graph to output_chart</span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "console" && (
                <div className="space-y-3 font-mono text-[11px] leading-relaxed text-left animate-fade-in">
                  <div className="bg-[#1E1E1E] text-green-400 p-3 rounded-xl min-h-[300px] overflow-x-auto whitespace-pre-wrap select-text">
                    <div className="text-gray-500 mb-2 border-b border-gray-800 pb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Terminal className="w-3.5 h-3.5" /> CONSOLE</span>
                      {lastExecutionTime !== null && <span>({lastExecutionTime.toFixed(2)}s)</span>}
                    </div>
                    {consoleLogs}
                  </div>
                </div>
              )}

              {activeTab === "preview" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
                    <span>Shape: {previewShape}</span>
                  </div>

                  {previewRows.length > 0 ? (
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                          <tr className="bg-muted border-b">
                            {Object.keys(previewRows[0] || {}).map((col) => (
                              <th key={col} className="p-2 border-r truncate font-bold text-text-primary max-w-[80px]">
                                {col}
                                <span className="block text-[8px] text-text-tertiary font-medium capitalize">
                                  {previewDtypes[col] ? previewDtypes[col].replace("object", "str") : "str"}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, i) => (
                            <tr key={i} className="border-b hover:bg-muted/40">
                              {Object.keys(previewRows[0] || {}).map((col) => (
                                <td key={col} className="p-2 border-r truncate max-w-[80px]">
                                  {String(row[col] ?? "null")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-[250px] border border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4">
                      <Layers className="w-8 h-8 text-text-tertiary mb-2" />
                      <span className="text-xs font-semibold text-text-secondary">No dataframe result yet</span>
                      <span className="text-[10px] text-text-tertiary mt-1">Assign result_df to preview output</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

        {showHelpModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto custom-scroll p-6 relative">
              <button
                onClick={() => setShowHelpModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-muted text-text-secondary hover:text-text-primary rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4 border-b pb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <HelpCircle className="w-5.5 h-5.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-text-primary">Python Workspace Guide</h2>
                  <p className="text-[10px] text-text-tertiary">How to execute scripts & create custom dashboard widgets</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-text-secondary leading-relaxed text-left">
                <div className="p-4 bg-blue-light/30 border border-blue-primary/20 rounded-xl text-blue-primary font-medium">
                  💡 <strong>DataLens</strong> executes real Python directly inside your browser using <strong>WebAssembly (Pyodide)</strong>. There is no external server needed—all execution is sandboxed, private, and runs in a separate background thread!
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                    <span className="text-green-primary">1.</span> Pre-loaded Dataframes
                  </h3>
                  <p>When your csv/excel sheets are loaded, the workspace automatically translates them into fully functional <strong>Pandas DataFrames</strong> before your script runs:</p>
                  <ul className="list-disc pl-5 space-y-1 bg-muted/20 p-3 rounded-lg font-mono text-[10px]">
                    <li><code>df_sheet1</code>: First spreadsheet dataset</li>
                    <li><code>df_sheet2</code>: Second spreadsheet dataset (if imported)</li>
                    <li><code>df_sheet3</code>: Third spreadsheet dataset (if imported)</li>
                    <li><code>sheets</code>: A global python dictionary matching sheet names to dataframes, e.g. <code>sheets[&apos;Sales Report&apos;]</code></li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                    <span className="text-green-primary">2.</span> How to Create Custom Dashboard Widgets
                  </h3>
                  <p>To capture your python analysis and render it on your main interactive Canvas Dashboard, you must write a script that does the following:</p>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-[10px] space-y-2">
                    <p className="text-gray-500"># 1. Access the dataset</p>
                    <p>df = df_sheet1</p>
                    <br />
                    <p className="text-gray-500"># 2. Build your custom visualization with Plotly Express</p>
                    <p>fig = px.scatter(df, x=df.columns[0], y=df.columns[1], title=&apos;Profit Trend Analysis&apos;)</p>
                    <br />
                    <p className="text-gray-500"># 3. ASSIGN THE PLOTLY FIGURE TO: output_chart (Crucial!)</p>
                    <p className="text-white font-bold">output_chart = fig</p>
                  </div>
                  <p>Once you run the script, the chart will render in the <strong>&quot;Chart&quot;</strong> tab. Simply click the <strong className="text-green-primary">&quot;Add to Dashboard&quot;</strong> button at the bottom of the tab! This will package your python code and immediately create an interactive canvas widget.</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                    <span className="text-green-primary">3.</span> How to Preview Cleaned Datasets
                  </h3>
                  <p>If you are cleaning or transforming your dataset, assign the final pandas dataframe to the variable <code>result_df</code>. The result will display in the <strong>&quot;Preview&quot;</strong> tab so you can audit the rows and data types instantly!</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-text-primary flex items-center gap-1">
                    <span className="text-green-primary">4.</span> Use the Snippet Accordion
                  </h3>
                  <p>Stuck on code? Click the <strong>Snippet Library</strong> categories on the left pane to insert templates for charts, filters, pivot tables, cleaning, and multi-sheet joins in one-click.</p>
                </div>
              </div>

              <button
                onClick={() => setShowHelpModal(false)}
                className="mt-6 w-full py-2.5 bg-green-primary hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                Get Started Writing Python
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
