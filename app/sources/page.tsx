"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Upload, Link2, Eye, Brush, Code, Play,
  Plus, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle, X, Table2
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import Sidebar from "@/components/sidebar/Sidebar";
import { toast } from "sonner";

export default function SourcesPage() {
  const router = useRouter();
  const { sheets, links, removeSheet } = useDataStore();
  const [selectedSheetPreview, setSelectedSheetPreview] = useState<any | null>(null);

  // Helper to calculate column type icons
  const getColIcon = (type: string) => {
    switch (type) {
      case "number": return "🔢";
      case "date": return "📅";
      case "boolean": return "✅";
      default: return "🔤";
    }
  };

  // Helper to calculate linked sheets
  const getSheetLinks = (sheetId: string) => {
    const connected: string[] = [];
    links.forEach(l => {
      if (l.fromSheetId === sheetId) {
        const other = sheets.find(s => s.id === l.toSheetId);
        if (other) connected.push(other.name);
      }
      if (l.toSheetId === sheetId) {
        const other = sheets.find(s => s.id === l.fromSheetId);
        if (other) connected.push(other.name);
      }
    });
    return Array.from(new Set(connected));
  };

  // Helper to calculate quality score (0-100)
  const calculateQualityScore = (sheet: any) => {
    if (!sheet.columns || sheet.columns.length === 0) return 100;
    
    // Deduct points for nulls and blank cells
    const totalCells = sheet.rowCount * sheet.columns.length;
    if (totalCells === 0) return 100;

    let nullCount = 0;
    sheet.columns.forEach((c: any) => {
      nullCount += c.nullCount || 0;
    });

    const nullPercentage = nullCount / totalCells;
    const score = Math.max(0, 100 - nullPercentage * 100);
    return Math.round(score);
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
              <FileText className="w-4.5 h-4.5 text-green-primary" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-text-primary leading-tight">Data Sources</h1>
              <p className="text-[10px] text-text-tertiary">Central hub for uploaded sheets and schemas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/transform?step=import")}
              className="px-3.5 py-2 bg-green-primary hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Import New File
            </button>
            <button
              onClick={() => router.push("/transform?step=link")}
              className="px-3.5 py-2 bg-[#533AB9] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-all"
            >
              <Link2 className="w-3.5 h-3.5" />
              Link Sheets
            </button>
          </div>
        </header>

        {/* Sheet Card Grid */}
        <div className="flex-1 overflow-y-auto custom-scroll p-6">
          {sheets.length === 0 ? (
            <div className="h-[400px] border border-dashed rounded-2xl bg-white flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto mt-12 shadow">
              <FileText className="w-12 h-12 text-text-tertiary mb-3 animate-pulse" />
              <h3 className="text-sm font-bold text-text-primary mb-1">No Data Sources Connected</h3>
              <p className="text-xs text-text-tertiary max-w-xs mb-6">
                Upload Excel or CSV spreadsheets using our central import wizard to begin analysis.
              </p>
              <button
                onClick={() => router.push("/transform?step=import")}
                className="px-4 py-2 bg-green-primary hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all"
              >
                Launch Import Wizard
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {sheets.map((sheet) => {
                const score = calculateQualityScore(sheet);
                const connectedSheets = getSheetLinks(sheet.id);
                
                return (
                  <div key={sheet.id} className="card-lg bg-white border border-border p-5 flex flex-col justify-between hover:shadow-md transition-all">
                    
                    {/* Header detail */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📋</span>
                          <span className="text-sm font-extrabold text-text-primary truncate max-w-[200px]">{sheet.name}</span>
                        </div>
                        <button
                          onClick={() => { removeSheet(sheet.id); toast.success(`Removed sheet ${sheet.name}`); }}
                          className="p-1 hover:bg-red-50 text-text-tertiary hover:text-red-500 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="text-[10px] text-text-tertiary text-left">
                        {sheet.rowCount.toLocaleString()} rows · {sheet.columns.length} columns · Local File
                      </div>
                    </div>

                    {/* Columns preview list */}
                    <div className="my-4 border-t border-b py-3 flex-1">
                      <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2 text-left">
                        Columns schema
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                        {sheet.columns.map((col: any) => (
                          <span key={col.name} className="badge-neutral text-[10px] font-bold py-1 px-2 flex items-center gap-1 shadow-sm">
                            <span>{getColIcon(col.type)}</span>
                            <span>{col.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Quality score bar */}
                    <div className="space-y-1.5 mb-4 text-left">
                      <div className="flex justify-between items-center text-[10px] font-bold text-text-secondary">
                        <span>DATA QUALITY PROFILE</span>
                        <span>{score}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full transition-all duration-300 ${
                            score > 80 ? "bg-green-primary" : score > 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>

                    {/* Relationships / Linked sheets */}
                    <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-text-tertiary text-left">
                      <Link2 className="w-3.5 h-3.5 text-text-tertiary" />
                      <span>Links:</span>
                      {connectedSheets.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {connectedSheets.map(n => (
                            <span key={n} className="px-1.5 py-0.5 bg-[#EEEDFE] text-[#533AB9] rounded border border-[#DDD6FE]">
                              {n}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="italic font-medium">None connected</span>
                      )}
                    </div>

                    {/* Quick action buttons */}
                    <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                      <button
                        onClick={() => setSelectedSheetPreview(sheet)}
                        className="py-2 border hover:bg-muted text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => router.push(`/transform?step=clean&sheet=${sheet.name}`)}
                        className="py-2 border hover:bg-muted text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Brush className="w-3.5 h-3.5" />
                        Clean
                      </button>
                      <button
                        onClick={() => router.push("/python")}
                        className="py-2 border hover:bg-muted text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Code className="w-3.5 h-3.5" />
                        Python
                      </button>
                      <button
                        onClick={() => router.push("/transform?step=link")}
                        className="py-2 border hover:bg-muted text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Link
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Sheet Preview */}
        {selectedSheetPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                <span className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-text-tertiary" />
                  Dataset Preview: {selectedSheetPreview.name}
                </span>
                <button
                  onClick={() => setSelectedSheetPreview(null)}
                  className="p-1 hover:bg-muted text-text-tertiary hover:text-red-500 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-x-auto overflow-y-auto custom-scroll p-4">
                {selectedSheetPreview.data && selectedSheetPreview.data.length > 0 ? (
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        {selectedSheetPreview.columns.map((c: any) => (
                          <th key={c.name}>{c.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSheetPreview.data.slice(0, 15).map((row: any, i: number) => (
                        <tr key={i}>
                          {selectedSheetPreview.columns.map((c: any) => (
                            <td key={c.name}>{String(row[c.name] ?? "null")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-10 text-xs text-text-tertiary">No rows to display.</div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
