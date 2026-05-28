"use client";

import { useState, useMemo } from "react";
import Editor from "@monaco-editor/react";
import {
  Play, Sparkles, AlertCircle, CheckCircle, X, Download,
  ChevronDown, ChevronRight, Undo, RefreshCw, Terminal,
  Table, BarChart4, Plus, GripVertical, ArrowRight
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import type { Row } from "@/store/useDataStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { usePyodide } from "@/lib/usePyodide";
import Papa from "papaparse";
import { cn } from "@/lib/utils";

interface PythonPipelineStep {
  id: string;
  name: string;
  code: string;
  status: "success" | "error" | "pending";
}

const SNIPPET_SECTIONS = [
  {
    title: "Basic Cleaning",
    snippets: [
      { label: "Remove duplicate rows", code: "df = df.drop_duplicates()" },
      { label: "Drop rows with any null", code: "df = df.dropna()" },
      { label: "Drop rows where column is null", code: "df = df.dropna(subset=['column_name'])" },
      { label: "Fill nulls with mean", code: "df['column_name'] = df['column_name'].fillna(df['column_name'].mean())" },
      { label: "Fill nulls with median", code: "df['column_name'] = df['column_name'].fillna(df['column_name'].median())" },
      { label: "Fill nulls with mode", code: "df['column_name'] = df['column_name'].fillna(df['column_name'].mode()[0])" },
      { label: "Fill nulls with custom value", code: "df['column_name'] = df['column_name'].fillna('custom_value')" },
      { label: "Drop columns with >50% nulls", code: "df = df.loc[:, df.isnull().mean() < 0.5]" },
      { label: "Reset index", code: "df = df.reset_index(drop=True)" },
    ],
  },
  {
    title: "Data Types",
    snippets: [
      { label: "Convert column to integer", code: "df['column_name'] = df['column_name'].astype(int)" },
      { label: "Convert column to float", code: "df['column_name'] = df['column_name'].astype(float)" },
      { label: "Convert column to string", code: "df['column_name'] = df['column_name'].astype(str)" },
      { label: "Convert column to datetime", code: "df['column_name'] = pd.to_datetime(df['column_name'])" },
      { label: "Convert column to boolean", code: "df['column_name'] = df['column_name'].astype(bool)" },
      {
        label: "Auto-detect and fix all types",
        code: `# Auto convert columns to optimal types
for col in df.columns:
    try:
        # Check if numeric
        num_converted = pd.to_numeric(df[col], errors='raise')
        df[col] = num_converted
    except (ValueError, TypeError):
        # Try datetime
        try:
            date_converted = pd.to_datetime(df[col], errors='raise')
            df[col] = date_converted
        except (ValueError, TypeError):
            # Leave as object/string
            pass`
      },
    ],
  },
  {
    title: "Text Cleaning",
    snippets: [
      { label: "Strip whitespace from strings", code: "string_cols = df.select_dtypes(include=['object']).columns\nfor col in string_cols:\n    df[col] = df[col].astype(str).str.strip()" },
      { label: "Lowercase string columns", code: "string_cols = df.select_dtypes(include=['object']).columns\nfor col in string_cols:\n    df[col] = df[col].astype(str).str.lower()" },
      { label: "Uppercase string columns", code: "string_cols = df.select_dtypes(include=['object']).columns\nfor col in string_cols:\n    df[col] = df[col].astype(str).str.upper()" },
      { label: "Title case string columns", code: "string_cols = df.select_dtypes(include=['object']).columns\nfor col in string_cols:\n    df[col] = df[col].astype(str).str.title()" },
      { label: "Remove special characters", code: "df['column_name'] = df['column_name'].astype(str).str.replace(r'[^a-zA-Z0-9\\s]', '', regex=True)" },
      { label: "Remove digits from strings", code: "df['column_name'] = df['column_name'].astype(str).str.replace(r'\\d', '', regex=True)" },
      { label: "Extract numbers from strings", code: "df['column_name_num'] = df['column_name'].astype(str).str.extract(r'(\\d+)')" },
      { label: "Replace string values", code: "df['column_name'] = df['column_name'].replace('find_value', 'replace_value')" },
      { label: "Split one column into two", code: "df[['col1', 'col2']] = df['column_name'].astype(str).str.split(' ', n=1, expand=True)" },
      { label: "Concatenate two columns", code: "df['new_col'] = df['col1'].astype(str) + '_' + df['col2'].astype(str)" },
    ],
  },
  {
    title: "Outlier Handling",
    snippets: [
      {
        label: "Detect outliers using IQR",
        code: `q1 = df['column_name'].quantile(0.25)
q3 = df['column_name'].quantile(0.75)
iqr = q3 - q1
outliers = df[(df['column_name'] < q1 - 1.5 * iqr) | (df['column_name'] > q3 + 1.5 * iqr)]
print(f"Outliers detected: {len(outliers)}")`
      },
      {
        label: "Remove outliers using IQR",
        code: `q1 = df['column_name'].quantile(0.25)
q3 = df['column_name'].quantile(0.75)
iqr = q3 - q1
df = df[(df['column_name'] >= q1 - 1.5 * iqr) & (df['column_name'] <= q3 + 1.5 * iqr)]`
      },
      {
        label: "Winsorize (Cap at 1.5x IQR)",
        code: `q1 = df['column_name'].quantile(0.25)
q3 = df['column_name'].quantile(0.75)
iqr = q3 - q1
df['column_name'] = df['column_name'].clip(lower=q1 - 1.5 * iqr, upper=q3 + 1.5 * iqr)`
      },
      {
        label: "Detect outliers using Z-score",
        code: `z_scores = (df['column_name'] - df['column_name'].mean()) / df['column_name'].std()
outliers = df[z_scores.abs() > 3]
print(f"Z-score outliers: {len(outliers)}")`
      },
      {
        label: "Remove outliers using Z-score",
        code: `z_scores = (df['column_name'] - df['column_name'].mean()) / df['column_name'].std()
df = df[z_scores.abs() <= 3]`
      },
      {
        label: "Replace outliers with median",
        code: `z_scores = (df['column_name'] - df['column_name'].mean()) / df['column_name'].std()
median_val = df['column_name'].median()
df.loc[z_scores.abs() > 3, 'column_name'] = median_val`
      },
    ],
  },
  {
    title: "Feature Engineering",
    snippets: [
      { label: "Normalise column (min-max)", code: "df['col_norm'] = (df['col'] - df['col'].min()) / (df['col'].max() - df['col'].min())" },
      { label: "Standardise column (Z-score)", code: "df['col_std'] = (df['col'] - df['col'].mean()) / df['col'].std()" },
      { label: "Log transform (log1p)", code: "df['col_log'] = np.log1p(df['col'])" },
      { label: "Square root transform", code: "df['col_sqrt'] = np.sqrt(df['col'])" },
      { label: "Bin into N equal buckets", code: "df['col_binned'] = pd.cut(df['col'], bins=5)" },
      { label: "Bin using custom edges", code: "df['col_binned'] = pd.cut(df['col'], bins=[0, 10, 50, 100], labels=['low', 'medium', 'high'])" },
      { label: "One-hot encode categorical", code: "df = pd.get_dummies(df, columns=['column_name'], drop_first=True)" },
      { label: "Label encode categorical", code: "df['column_encoded'] = df['column_name'].astype('category').cat.codes" },
      { label: "Extract year from date", code: "df['year'] = pd.to_datetime(df['date_col']).dt.year" },
      { label: "Extract month from date", code: "df['month'] = pd.to_datetime(df['date_col']).dt.month" },
      { label: "Extract day of week", code: "df['day_of_week'] = pd.to_datetime(df['date_col']).dt.day_name()" },
      { label: "Extract hour from date", code: "df['hour'] = pd.to_datetime(df['date_col']).dt.hour" },
      { label: "Date difference in days", code: "df['days_diff'] = (pd.to_datetime(df['date2']) - pd.to_datetime(df['date1'])).dt.days" },
      { label: "Create lag feature (shift)", code: "df['col_lag1'] = df['col'].shift(1)" },
      { label: "Create rolling average", code: "df['col_roll3'] = df['col'].rolling(window=3).mean()" },
      { label: "Create cumulative sum", code: "df['col_cumsum'] = df['col'].cumsum()" },
      { label: "Create rank column", code: "df['col_rank'] = df['col'].rank(ascending=True)" },
    ],
  },
  {
    title: "Aggregation & Reshape",
    snippets: [
      { label: "Group by column and sum", code: "df_grouped = df.groupby('group_col')['value_col'].sum().reset_index()" },
      { label: "Group by column and mean", code: "df_grouped = df.groupby('group_col')['value_col'].mean().reset_index()" },
      { label: "Group by multiple columns", code: "df_grouped = df.groupby(['col1', 'col2'])['val'].agg(['sum', 'mean']).reset_index()" },
      { label: "Pivot table", code: "df_pivot = df.pivot_table(index='row_col', columns='col_col', values='val_col', aggfunc='mean').reset_index()" },
      { label: "Melt (unpivot) wide to long", code: "df_melted = pd.melt(df, id_vars=['id_col'], value_vars=['val1', 'val2'], var_name='variable', value_name='value')" },
      { label: "Merge datasets on key", code: "df_merged = pd.merge(df, df_other, on='key_column', how='inner')" },
      { label: "Concatenate vertically", code: "df_concat = pd.concat([df, df_other], axis=0).reset_index(drop=True)" },
      { label: "Compute correlation matrix", code: "df_corr = df.select_dtypes(include=[np.number]).corr()" },
    ],
  },
  {
    title: "Validation & QA",
    snippets: [
      { label: "Check null counts", code: "print(df.isnull().sum())" },
      { label: "Check duplicate count", code: "print('Duplicate rows:', df.duplicated().sum())" },
      { label: "Check column value counts", code: "print(df['column_name'].value_counts())" },
      { label: "Check descriptive stats", code: "print(df.describe())" },
      { label: "Check column data types", code: "print(df.dtypes)" },
      { label: "Assert no nulls remain", code: "assert df['column_name'].isnull().sum() == 0, 'Null values still remain in column!'" },
      { label: "Assert values in allowed set", code: "assert df['column_name'].isin(['Allowed1', 'Allowed2']).all(), 'Unauthorized values detected!'" },
      {
        label: "Print full data quality report",
        code: `print("=== DATA QUALITY REPORT ===")
print(f"Shape: {df.shape[0]} rows x {df.shape[1]} columns")
print("\\n--- Null Count per Column ---")
print(df.isnull().sum())
print("\\n--- Duplicate Rows ---")
print(df.duplicated().sum())
print("\\n--- Numerical Summaries ---")
print(df.describe().T)`
      },
    ],
  },
];

const DEFAULT_BOILERPLATE = `# df is your dataset — already loaded as a pandas DataFrame
# Run this code to clean and transform it
# The result will update your dataset automatically

import pandas as pd
import numpy as np

print("Shape:", df.shape)
print("Columns:", df.columns.tolist())
print(df.head())
`;

interface ExecuteResult {
  console: string;
  csv: string;
  shape: string;
  dtypes: string;
  duration: number;
}

export default function PythonStep() {
  const { datasets, activeDatasetId, addDataset, setPipelineStep } = useDataStore();
  const { isDarkMode } = useCanvasStore();
  const dataset = datasets.find((d) => d.id === activeDatasetId);

  const { isReady, runPython } = usePyodide();

  // Code editor states
  const [code, setCode] = useState(DEFAULT_BOILERPLATE);
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Accordion state
  const [activeSection, setActiveSection] = useState<string | null>("Basic Cleaning");

  // Output tab state
  const [outputTab, setOutputTab] = useState<"console" | "preview" | "stats">("console");
  const [consoleLog, setConsoleLog] = useState<string>("");
  const [consoleError, setConsoleError] = useState<string | null>(null);

  // Result Preview Data
  const [previewData, setPreviewData] = useState<Row[]>([]);
  const [previewShape, setPreviewShape] = useState<string>("");
  const [previewDtypes, setPreviewDtypes] = useState<Record<string, string>>({});
  
  // Undo/History
  const [codeHistory, setCodeHistory] = useState<string[]>([DEFAULT_BOILERPLATE]);
  const [historyPointer, setHistoryPointer] = useState<number>(0);

  // Pipeline steps state
  const [pipelineSteps, setPipelineSteps] = useState<PythonPipelineStep[]>([
    { id: "step_load", name: "Step 1: Load Data", code: "# Loaded raw dataset", status: "success" }
  ]);
  const [runningStepIdx, setRunningStepIdx] = useState<number | null>(null);

  // AI Prompt State
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Drag and drop index
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Undo/redo helpers
  const handleCodeChange = (newVal: string | undefined) => {
    const val = newVal ?? "";
    setCode(val);
    const newHistory = codeHistory.slice(0, historyPointer + 1);
    newHistory.push(val);
    setCodeHistory(newHistory);
    setHistoryPointer(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyPointer > 0) {
      const nextPtr = historyPointer - 1;
      setHistoryPointer(nextPtr);
      setCode(codeHistory[nextPtr]);
    }
  };

  const handleSnippetClick = (snippetCode: string) => {
    // If the default boilerplate is still there, replace it
    if (code === DEFAULT_BOILERPLATE) {
      handleCodeChange(snippetCode);
    } else {
      handleCodeChange(code + "\n\n" + snippetCode);
    }
  };

  const executeCode = async (userCode: string, currentCsv: string): Promise<ExecuteResult> => {
    const start = performance.now();
    const result = await runPython(userCode, currentCsv);
    const duration = ((performance.now() - start) / 1000).toFixed(2);
    return { ...result, duration: parseFloat(duration) };
  };

  const handleRun = async () => {
    if (!dataset) return;
    setIsRunning(true);
    setConsoleError(null);
    setConsoleLog("Spawning Python execution inside Pyodide WebAssembly worker...");

    try {
      // Serialize raw data
      const csvStr = Papa.unparse(dataset.transformedData);
      const res = await executeCode(code, csvStr);

      setExecutionTime(res.duration);
      setConsoleLog(res.console || "Python script completed successfully with empty stdout.");

      // Parse resulting CSV
      const parsed = Papa.parse<Row>(res.csv, { header: true, dynamicTyping: true });
      const newRows = parsed.data.filter((r) => r && Object.keys(r).length > 0);

      setPreviewData(newRows);
      setPreviewShape(res.shape);
      
      let parsedDtypes = {};
      try {
        parsedDtypes = JSON.parse(res.dtypes);
      } catch {}
      setPreviewDtypes(parsedDtypes);
      setOutputTab("preview");

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setConsoleError(errMsg || "An unexpected error occurred during Python execution");
      setConsoleLog("");
      setOutputTab("console");
    } finally {
      setIsRunning(false);
    }
  };

  // AI Code Generation
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !dataset) return;
    setAiGenerating(true);
    setShowAiInput(false);

    try {
      const colInfo = dataset.columns.map((c) => `${c.name} (${c.type})`).join(", ");
      const sampleRows = dataset.transformedData.slice(0, 3);
      const nulls = dataset.columns.map((c) => {
        const count = dataset.transformedData.filter(r => r[c.name] === null || r[c.name] === "").length;
        return `${c.name}: ${count} nulls`;
      }).join(", ");

      const systemPrompt = `You are a Python data cleaning expert using pandas and numpy.
The user's DataFrame has these columns and types: ${colInfo}
Sample rows: ${JSON.stringify(sampleRows)}
Data quality issues detected: ${nulls}
Write clean, commented Python code that operates on a variable called 'df'. Do not reload the CSV. Return ONLY valid executable Python code inside a code block. Do not include any HTML, markdown descriptions outside the code block, or explanation. Add a print() at the end showing the shape and null count of the result.`;

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Please clean my data according to this prompt: "${aiPrompt}"` }],
          systemPrompt,
        }),
      });

      if (!response.ok) throw new Error("AI call failed");
      
      // Read stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let generated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value);
          const lines = chunkStr.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataStr);
                generated += parsed.text || "";
              } catch {}
            }
          }
        }
      }

      // Extract code block
      let finalCode = generated.trim();
      if (finalCode.includes("```python")) {
        finalCode = finalCode.split("```python")[1].split("```")[0].trim();
      } else if (finalCode.includes("```")) {
        finalCode = finalCode.split("```")[1].split("```")[0].trim();
      }

      if (finalCode) {
        handleCodeChange(finalCode);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setConsoleError("AI generation failed: " + errMsg);
    } finally {
      setAiGenerating(false);
      setAiPrompt("");
    }
  };

  const handleAiFix = async () => {
    if (!consoleError || !dataset) return;
    setAiGenerating(true);

    try {
      const colInfo = dataset.columns.map((c) => `${c.name} (${c.type})`).join(", ");
      
      const systemPrompt = `You are an expert Python data scientist.
The user ran some pandas code but got a compilation/runtime error.
Here is the dataset schema: ${colInfo}
Here is the error traceback:
${consoleError}

Please output the corrected Python code block. Return ONLY the code inside a standard python markdown block. Do not write any explanations or conversational chatter outside the code block.`;

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Please fix my python code so it runs successfully:\n\n${code}` }],
          systemPrompt,
        }),
      });

      if (!response.ok) throw new Error("AI call failed");
      
      // Read stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let generated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value);
          const lines = chunkStr.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataStr);
                generated += parsed.text || "";
              } catch {}
            }
          }
        }
      }

      // Extract code block
      let finalCode = generated.trim();
      if (finalCode.includes("```python")) {
        finalCode = finalCode.split("```python")[1].split("```")[0].trim();
      } else if (finalCode.includes("```")) {
        finalCode = finalCode.split("```")[1].split("```")[0].trim();
      }

      if (finalCode) {
        handleCodeChange(finalCode);
        setConsoleError(null);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setConsoleError("AI Fix failed: " + errMsg);
    } finally {
      setAiGenerating(false);
    }
  };

  // Pipeline Step Actions
  const handleSaveStep = () => {
    const stepName = `Step ${pipelineSteps.length + 1}: Preprocessing`;
    const newStep: PythonPipelineStep = {
      id: "step_" + Date.now(),
      name: stepName,
      code,
      status: "pending"
    };
    setPipelineSteps([...pipelineSteps, newStep]);
  };

  const handleRunAllSteps = async () => {
    if (!dataset) return;
    setIsRunning(true);
    setConsoleError(null);
    setConsoleLog("Executing all pipeline steps sequentially...");

    let workingCsv = Papa.unparse(dataset.rawData);
    const updatedSteps = [...pipelineSteps];

    try {
      for (let i = 0; i < updatedSteps.length; i++) {
        const step = updatedSteps[i];
        if (step.id === "step_load") {
          updatedSteps[i] = { ...step, status: "success" };
          setPipelineSteps([...updatedSteps]);
          continue;
        }

        setRunningStepIdx(i);
        setConsoleLog(`Running ${step.name}...`);
        
        try {
          const res = await executeCode(step.code, workingCsv);
          workingCsv = res.csv;
          updatedSteps[i] = { ...step, status: "success" };
        } catch (err: unknown) {
          updatedSteps[i] = { ...step, status: "error" };
          setPipelineSteps([...updatedSteps]);
          throw err;
        }
        setPipelineSteps([...updatedSteps]);
      }

      // Final parsed data
      const parsed = Papa.parse<Row>(workingCsv, { header: true, dynamicTyping: true });
      const finalRows = parsed.data.filter((r) => r && Object.keys(r).length > 0);

      setPreviewData(finalRows);
      setOutputTab("preview");
      setConsoleLog("All pipeline steps executed successfully!");

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setConsoleError(errMsg || "Pipeline execution failed at one of the steps.");
      setOutputTab("console");
    } finally {
      setIsRunning(false);
      setRunningStepIdx(null);
    }
  };

  const handleApplyToDataset = () => {
    if (!dataset || previewData.length === 0) return;

    // Detect new columns & types
    const firstRow = previewData[0];
    const newCols = Object.keys(firstRow).map((name) => {
      const val = firstRow[name];
      let type: "string" | "number" | "date" | "boolean" = "string";
      if (typeof val === "number") type = "number";
      else if (typeof val === "boolean") type = "boolean";
      else if ((val as unknown) instanceof Date) type = "date";
      return { name, type };
    });

    // Save as new version in Zustand
    const existingCleanedCount = datasets.filter((d) => d.name.startsWith(dataset.name.split(" (cleaned")[0])).length;
    const cleanName = `${dataset.name.split(" (")[0]} (cleaned — v${existingCleanedCount})`;

    const newDataset = {
      id: "dataset_" + Date.now(),
      name: cleanName,
      rawData: dataset.rawData,
      columns: newCols,
      pipeline: [],
      transformedData: previewData,
      createdAt: new Date().toISOString()
    };

    addDataset(newDataset);
    setPipelineStep(4); // Advance to Model
  };

  const handleExportPython = () => {
    let combinedScript = `"""
DataLens Generated Python Preprocessing Pipeline
"""
import pandas as pd
import numpy as np
import io

`;

    pipelineSteps.forEach((step) => {
      combinedScript += `\n# ── ${step.name} ──────────────────\n`;
      if (step.id === "step_load") {
        combinedScript += `df = pd.read_csv('dataset.csv')\n`;
      } else {
        combinedScript += step.code + "\n";
      }
    });

    const blob = new Blob([combinedScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataset?.name.split(".")[0] || "datalens"}_pipeline.py`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Diff metrics
  const diffSummary = useMemo(() => {
    if (!dataset || previewData.length === 0) return null;
    const rowDiff = previewData.length - dataset.transformedData.length;
    const colDiff = Object.keys(previewData[0] || {}).length - dataset.columns.length;
    
    // Null counts
    let totalNulls = 0;
    previewData.forEach((row) => {
      Object.values(row).forEach((val) => {
        if (val === null || val === undefined || val === "") totalNulls++;
      });
    });

    return {
      rowsRemoved: rowDiff < 0 ? Math.abs(rowDiff) : 0,
      rowsAdded: rowDiff > 0 ? rowDiff : 0,
      colsAdded: colDiff > 0 ? colDiff : 0,
      colsRemoved: colDiff < 0 ? Math.abs(colDiff) : 0,
      nullsRemaining: totalNulls
    };
  }, [dataset, previewData]);

  // Descriptive Stats
  const descriptiveStats = useMemo(() => {
    if (previewData.length === 0) return [];
    
    // Auto compute min/max/mean/std/nulls for stats preview tab
    const cols = Object.keys(previewData[0] || {});
    return cols.map((col) => {
      const vals = previewData.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== "");
      const nums = vals.map(Number).filter((n) => !isNaN(n));
      const nullsCount = previewData.length - vals.length;

      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        return { col, type: "number", nulls: nullsCount, mean: mean.toFixed(2), min: min.toFixed(2), max: max.toFixed(2) };
      }
      
      const uniques = new Set(vals).size;
      return { col, type: "string", nulls: nullsCount, mean: "—", min: "—", max: "—", unique: uniques };
    });
  }, [previewData]);

  if (!dataset) {
    return (
      <div className="text-center py-16 text-text-tertiary">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-yellow-500" />
        <p>No dataset loaded. Go back to Import first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-170px)] overflow-hidden space-y-3">
      {/* 3-Column workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 border border-border rounded-xl">
        
        {/* LEFT COLUMN: Snippet Library (320px) */}
        <div className={cn("w-80 flex flex-col border-r border-border min-h-0", isDarkMode ? "bg-gray-900" : "bg-white")}>
          <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Python Library</span>
            <span className="badge-brand text-[10px] px-2 py-0.5">Pandas 2.0</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1.5">
            {SNIPPET_SECTIONS.map((sec) => {
              const isOpen = activeSection === sec.title;
              return (
                <div key={sec.title} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveSection(isOpen ? null : sec.title)}
                    className={cn(
                      "w-full px-3 py-2 text-left flex items-center justify-between text-xs font-medium transition-colors",
                      isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50",
                      isOpen ? (isDarkMode ? "bg-gray-800 text-brand-400" : "bg-brand-50 text-brand") : "text-text-primary"
                    )}
                  >
                    <span>{sec.title}</span>
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  
                  {isOpen && (
                    <div className={cn("p-1.5 space-y-1 border-t border-border grid grid-cols-1", isDarkMode ? "bg-gray-950" : "bg-gray-50")}>
                      {sec.snippets.map((snip) => (
                        <button
                          key={snip.label}
                          onClick={() => handleSnippetClick(snip.code)}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 text-[11px] rounded transition-all flex items-center justify-between",
                            isDarkMode ? "hover:bg-gray-800 text-gray-300 hover:text-white" : "hover:bg-white text-text-secondary hover:text-text-primary border border-transparent hover:border-border hover:shadow-sm"
                          )}
                        >
                          <span className="truncate">{snip.label}</span>
                          <Plus className="w-3 h-3 text-brand opacity-60 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Monaco Editor */}
        <div className={cn("flex-1 flex flex-col min-h-0", isDarkMode ? "bg-gray-950" : "bg-surface1")}>
          {/* Editor Toolbar */}
          <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0 bg-muted/20">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRun}
                disabled={isRunning || !isReady}
                className={cn(
                  "btn-primary btn-sm h-8 px-3 gap-1.5 shadow-sm text-xs",
                  isRunning && "opacity-70 cursor-wait"
                )}
              >
                {isRunning ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                Run Python
              </button>

              <button
                onClick={() => setShowAiInput(true)}
                className="btn-outline btn-sm h-8 px-2.5 gap-1.5 text-xs text-brand border-brand/20 hover:bg-brand/5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Generate
              </button>

              {consoleError && (
                <button
                  onClick={handleAiFix}
                  className="btn-outline btn-sm h-8 px-2.5 gap-1.5 text-xs text-red-500 border-red-500/20 hover:bg-red-500/5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  AI Fix
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                className="btn-ghost btn-sm h-8 w-8 p-0"
                title="Undo edit"
                disabled={historyPointer === 0}
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleCodeChange(DEFAULT_BOILERPLATE)}
                className="btn-ghost btn-sm h-8 px-2.5 text-xs text-text-secondary"
              >
                Reset Boilerplate
              </button>
              <button
                onClick={handleSaveStep}
                className="btn-outline btn-sm h-8 px-2.5 text-xs text-text-secondary border-border"
              >
                Save Step
              </button>
              <button
                onClick={handleExportPython}
                className="btn-ghost btn-sm h-8 w-8 p-0"
                title="Export entire pipeline (.py)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Inline AI input overlay */}
          {showAiInput && (
            <div className="p-3 border-b border-border bg-brand-50/50 flex items-center gap-2 animate-slide-down flex-shrink-0">
              <Sparkles className="w-4 h-4 text-brand flex-shrink-0" />
              <input
                type="text"
                placeholder='e.g., "remove outliers from Revenue column and normalize between 0 and 1"'
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                className="input text-xs flex-1"
                autoFocus
              />
              <button onClick={handleAiGenerate} disabled={aiGenerating} className="btn-primary btn-sm h-8">
                Generate
              </button>
              <button onClick={() => setShowAiInput(false)} className="btn-ghost btn-sm h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-0 relative">
            {aiGenerating && (
              <div className="absolute inset-0 bg-white/40 dark:bg-black/40 z-10 flex items-center justify-center backdrop-blur-xs">
                <div className="panel p-4 flex items-center gap-3 shadow-lg max-w-sm">
                  <Sparkles className="w-5 h-5 text-brand animate-pulse" />
                  <span className="text-xs font-semibold text-text-primary">Claude is writing preprocessing code...</span>
                </div>
              </div>
            )}
            
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={handleCodeChange}
              theme={isDarkMode ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                fontFamily: "Fira Code, Menlo, Monaco, Consolas, monospace",
                lineNumbers: "on",
                automaticLayout: true,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Output & Preview (280px) */}
        <div className={cn("w-96 flex flex-col border-l border-border min-h-0", isDarkMode ? "bg-gray-900" : "bg-white")}>
          {/* Tab headers */}
          <div className="flex border-b border-border flex-shrink-0">
            {(["console", "preview", "stats"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOutputTab(t)}
                className={cn(
                  "flex-1 py-3 text-xs font-medium border-b-2 text-center transition-colors flex items-center justify-center gap-1.5",
                  outputTab === t
                    ? "text-brand border-brand"
                    : "text-text-secondary border-transparent hover:text-text-primary"
                )}
              >
                {t === "console" && <Terminal className="w-3.5 h-3.5" />}
                {t === "preview" && <Table className="w-3.5 h-3.5" />}
                {t === "stats" && <BarChart4 className="w-3.5 h-3.5" />}
                <span className="capitalize">{t}</span>
              </button>
            ))}
          </div>

          {/* Tab contents */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-3">
            {outputTab === "console" && (
              <div className="h-full flex flex-col min-h-0 space-y-2">
                <div className="flex items-center justify-between flex-shrink-0">
                  <span className="text-[10px] font-semibold text-text-tertiary uppercase">Console Terminal Output</span>
                  {executionTime !== null && (
                    <span className="text-[10px] text-text-tertiary">Ran in {executionTime}s</span>
                  )}
                </div>
                
                <div className={cn(
                  "flex-1 p-3 rounded-lg font-mono text-[11px] overflow-auto select-text leading-relaxed",
                  consoleError 
                    ? "bg-red-50 text-red-600 border border-red-100" 
                    : isDarkMode ? "bg-gray-950 text-emerald-400" : "bg-gray-50 text-text-primary"
                )}>
                  {consoleError ? (
                    <div className="space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Traceback (most recent call last):</span>
                      </div>
                      <pre className="whitespace-pre-wrap">{consoleError}</pre>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap">{consoleLog || "# Waiting for execution output..."}</pre>
                  )}
                </div>
              </div>
            )}

            {outputTab === "preview" && (
              <div className="h-full flex flex-col min-h-0 space-y-3">
                {previewData.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between flex-shrink-0">
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Shape: {previewShape || `${previewData.length} rows`}
                      </span>
                    </div>

                    {diffSummary && (
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] flex-shrink-0">
                        <div className="panel p-2 bg-muted/20">
                          <span className="text-text-secondary block">Rows Removed</span>
                          <span className="text-sm font-bold text-text-primary">{diffSummary.rowsRemoved}</span>
                        </div>
                        <div className="panel p-2 bg-muted/20">
                          <span className="text-text-secondary block">Columns Added</span>
                          <span className="text-sm font-bold text-emerald-600">{diffSummary.colsAdded}</span>
                        </div>
                        <div className="panel p-2 bg-muted/20 col-span-2">
                          <span className="text-text-secondary block">Nulls Remaining</span>
                          <span className={cn("text-sm font-bold", diffSummary.nullsRemaining > 0 ? "text-amber-600" : "text-emerald-600")}>
                            {diffSummary.nullsRemaining}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 overflow-auto border border-border rounded-lg">
                      <table className="data-table text-[10px]">
                        <thead>
                          <tr className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10">
                            {Object.keys(previewData[0] || {}).map((col) => {
                              const dt = previewDtypes[col] || "str";
                              return (
                                <th key={col} className="text-left py-1.5 px-2">
                                  <div>{col}</div>
                                  <div className="text-[8px] font-normal text-text-tertiary capitalize">
                                    {dt.includes("int") ? "int" : dt.includes("float") ? "float" : dt.includes("date") ? "date" : "str"}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(0, 20).map((row, i) => {
                            const originalRow = dataset.transformedData[i];
                            return (
                              <tr key={i} className="hover:bg-muted/40 transition-colors">
                                {Object.keys(row).map((col) => {
                                  const val = row[col];
                                  const isChanged = originalRow && originalRow[col] !== val;
                                  return (
                                    <td
                                      key={col}
                                      className={cn(
                                        "py-1.5 px-2 font-mono whitespace-nowrap",
                                        isChanged && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 font-medium"
                                      )}
                                    >
                                      {val === null || val === undefined ? (
                                        <span className="text-text-tertiary italic">null</span>
                                      ) : (
                                        String(val)
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <button onClick={handleApplyToDataset} className="btn-primary w-full gap-1.5 py-2.5 text-xs font-semibold shadow flex-shrink-0">
                      Apply Cleaning & Continue
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-tertiary">
                    <Table className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-xs">Run Python code to generate a preview table.</p>
                  </div>
                )}
              </div>
            )}

            {outputTab === "stats" && (
              <div className="h-full flex flex-col min-h-0 space-y-3">
                {descriptiveStats.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-semibold text-text-secondary uppercase mb-2">Descriptive Stats</h4>
                      <div className="overflow-auto border border-border rounded-lg max-h-48">
                        <table className="data-table text-[9px]">
                          <thead>
                            <tr className="sticky top-0 bg-muted/95 z-10">
                              <th className="py-1 px-1.5">Col</th>
                              <th className="py-1 px-1.5">Mean</th>
                              <th className="py-1 px-1.5">Min</th>
                              <th className="py-1 px-1.5">Max</th>
                              <th className="py-1 px-1.5">Nulls</th>
                            </tr>
                          </thead>
                          <tbody>
                            {descriptiveStats.map((st) => (
                              <tr key={st.col}>
                                <td className="py-1 px-1.5 font-semibold text-text-primary">{st.col}</td>
                                <td className="py-1 px-1.5 font-mono">{st.mean}</td>
                                <td className="py-1 px-1.5 font-mono">{st.min}</td>
                                <td className="py-1 px-1.5 font-mono">{st.max}</td>
                                <td className="py-1 px-1.5 font-mono text-amber-600">{st.nulls}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Data Type Stats visual representation */}
                    <div className="panel p-3 space-y-2">
                      <h4 className="text-[10px] font-semibold text-text-secondary uppercase">Null Value Densities</h4>
                      <div className="space-y-1.5">
                        {descriptiveStats.map((st) => {
                          const nullRate = (st.nulls / previewData.length) * 100;
                          return (
                            <div key={st.col} className="space-y-0.5">
                              <div className="flex items-center justify-between text-[9px]">
                                <span className="text-text-primary truncate max-w-40 font-medium">{st.col}</span>
                                <span className="text-text-tertiary">{nullRate.toFixed(0)}% Nulls</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand rounded-full" style={{ width: `${100 - nullRate}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-tertiary">
                    <BarChart4 className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-xs">Descriptive stats will load when Python code runs successfully.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PIPELINE STEPS PANEL (Bottom Strip) */}
      <div className="panel p-3 flex flex-col gap-2 flex-shrink-0 bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-primary">Pipeline Preprocessing Steps</span>
            <span className="text-[10px] text-text-tertiary">Drag tabs to reorder clean sequence</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRunAllSteps}
              disabled={isRunning || pipelineSteps.length <= 1}
              className="btn-outline btn-sm gap-1.5 h-8 text-xs font-semibold border-brand/30 hover:bg-brand/5 text-brand"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", runningStepIdx !== null && "animate-spin")} />
              Run All Steps
            </button>
          </div>
        </div>

        {/* Steps track */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 min-h-[44px] custom-scroll">
          {pipelineSteps.map((step, idx) => {
            const isLoad = step.id === "step_load";
            const isRunningNow = runningStepIdx === idx;
            
            return (
              <div
                key={step.id}
                draggable={!isLoad}
                onDragStart={() => setDraggedIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedIdx === null || draggedIdx === idx || isLoad) return;
                  const nextSteps = [...pipelineSteps];
                  const [removed] = nextSteps.splice(draggedIdx, 1);
                  nextSteps.splice(idx, 0, removed);
                  setPipelineSteps(nextSteps);
                  setDraggedIdx(null);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all select-none cursor-pointer flex-shrink-0",
                  isRunningNow && "bg-brand/5 border-brand ring-2 ring-brand/10 shadow-sm",
                  !isRunningNow && (isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-border hover:border-brand/40")
                )}
                onClick={() => {
                  if (!isLoad) {
                    setCode(step.code);
                  }
                }}
              >
                {!isLoad && <GripVertical className="w-3.5 h-3.5 text-text-tertiary cursor-grab" />}
                
                {/* Status Dot */}
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  step.status === "success" && "bg-emerald-500",
                  step.status === "error" && "bg-red-500",
                  step.status === "pending" && "bg-gray-400"
                )} />

                <span>{step.name}</span>

                {!isLoad && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPipelineSteps(pipelineSteps.filter((s) => s.id !== step.id));
                    }}
                    className="hover:text-red-600 transition-colors text-text-tertiary p-0.5 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleSaveStep}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-brand text-xs font-medium text-text-secondary hover:text-brand transition-all flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Step
          </button>
        </div>
      </div>
    </div>
  );
}
