// lib/usePyodide.ts
import { useEffect, useRef, useState, useCallback } from "react";

export interface PyodideResult {
  console: string;
  csv: string;
  shape: string;
  dtypes: string;
  chartJson?: string;
  error?: string;
  traceback?: string;
}

export function usePyodide() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const resolversRef = useRef<Map<string, { resolve: (val: PyodideResult) => void; reject: (err: Error) => void }>>(new Map());

  useEffect(() => {
    // Instantiate Web Worker
    const worker = new Worker("/pyodide-worker.js");
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, id, console: consoleOutput, csv, shape, dtypes, chartJson, error: workerErr } = e.data;

      if (type === "ready") {
        setIsReady(true);
        setError(null);
      } else if (type === "success") {
        const resolver = resolversRef.current.get(id);
        if (resolver) {
          resolver.resolve({ console: consoleOutput, csv, shape, dtypes, chartJson });
          resolversRef.current.delete(id);
        }
      } else if (type === "error") {
        if (id) {
          const resolver = resolversRef.current.get(id);
          if (resolver) {
            resolver.reject(new Error(workerErr || "Python execution failed"));
            resolversRef.current.delete(id);
          }
        } else {
          setError(workerErr || "An error occurred in Pyodide Web Worker");
        }
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  const runPython = useCallback((code: string, sheetsOrCsv: string | Array<{ name: string; csv: string }>): Promise<PyodideResult> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        return reject(new Error("Pyodide worker is not initialized"));
      }

      const id = Math.random().toString(36).substring(2, 9);
      resolversRef.current.set(id, { resolve, reject });

      // If a single CSV string is passed, wrap it as a single sheet array
      const sheetsList = typeof sheetsOrCsv === "string"
        ? [{ name: "Dataset", csv: sheetsOrCsv }]
        : sheetsOrCsv;

      // Send to Web Worker
      workerRef.current.postMessage({ code, sheets: sheetsList, id });

      // 30-second timeout
      setTimeout(() => {
        const resolver = resolversRef.current.get(id);
        if (resolver) {
          resolver.reject(new Error("Python execution timed out after 30 seconds"));
          resolversRef.current.delete(id);
        }
      }, 30000);
    });
  }, []);

  return {
    isReady,
    error,
    runPython
  };
}
