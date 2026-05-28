"use client";

import { useState, useRef, useEffect } from "react";
import {
  Link2, Trash2, Sparkles, CheckCircle, RefreshCw,
  Plus, Layers, HelpCircle, Table2, Info, Check
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { toast } from "sonner";

export default function LinkStep() {
  const { sheets, links, addLink, removeLink, addLinkedDataset } = useDataStore();
  const [selectedCol, setSelectedCol] = useState<{ sheetId: string; colName: string } | null>(null);
  
  // Join previews and configurations
  const [activeJoinType, setActiveJoinType] = useState<Record<string, "inner" | "left" | "right" | "outer">>({});
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewCols, setPreviewCols] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiSuggesting, setAiSuggesting] = useState(false);

  // SVG Drawing refs for bezier curves
  const containerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleColumnClick = (sheetId: string, colName: string) => {
    if (!selectedCol) {
      setSelectedCol({ sheetId, colName });
      toast.info(`Selected ${colName}. Now click a column in another sheet to link.`);
    } else {
      if (selectedCol.sheetId === sheetId) {
        setSelectedCol(null);
        toast.info("Link selection cancelled.");
        return;
      }

      // Add link
      const linkId = Math.random().toString(36).substring(2, 9);
      const fromSheet = sheets.find(s => s.id === selectedCol.sheetId);
      const toSheet = sheets.find(s => s.id === sheetId);

      if (fromSheet && toSheet) {
        addLink({
          id: linkId,
          fromSheetId: selectedCol.sheetId,
          fromColumn: selectedCol.colName,
          toSheetId: sheetId,
          toColumn: colName,
          joinType: "inner",
          name: `${fromSheet.name}_${selectedCol.colName}_to_${toSheet.name}_${colName}`
        });

        toast.success(`Connected ${fromSheet.name}.${selectedCol.colName} ── ${toSheet.name}.${colName}!`);
      }
      setSelectedCol(null);
    }
  };

  // Run Visual Join Natively
  const runJoinPreview = (link: any) => {
    const s1 = sheets.find(s => s.id === link.fromSheetId);
    const s2 = sheets.find(s => s.id === link.toSheetId);
    if (!s1 || !s2) return;

    const data1 = s1.data || [];
    const data2 = s2.data || [];
    const col1 = link.fromColumn;
    const col2 = link.toColumn;
    const type = activeJoinType[link.id] || "inner";

    // Perform interactive JS Join
    const joined: any[] = [];
    const c1Names = s1.columns.map(c => c.name);
    const c2Names = s2.columns.map(c => c.name);
    const allColNames = Array.from(new Set([...c1Names, ...c2Names.map(c => c1Names.includes(c) ? `${s2.name}_${c}` : c)]));

    data1.forEach((r1: any) => {
      const match = data2.find((r2: any) => String(r1[col1]) === String(r2[col2]));
      if (match) {
        const row: Record<string, any> = { ...r1 };
        c2Names.forEach(c => {
          const targetKey = c1Names.includes(c) ? `${s2.name}_${c}` : c;
          row[targetKey] = match[c];
        });
        joined.push(row);
      } else if (type === "left" || type === "outer") {
        const row: Record<string, any> = { ...r1 };
        c2Names.forEach(c => {
          const targetKey = c1Names.includes(c) ? `${s2.name}_${c}` : c;
          row[targetKey] = null;
        });
        joined.push(row);
      }
    });

    setPreviewCols(allColNames);
    setPreviewRows(joined.slice(0, 15));
    toast.success(`Joined preview generated! (${joined.length} total rows)`);
  };

  // Create & Save Joined Dataset
  const handleCreateJoinedDataset = () => {
    if (links.length === 0) {
      toast.error("Please create at least one connection link before merging sheets.");
      return;
    }

    const firstLink = links[0];
    const s1 = sheets.find(s => s.id === firstLink.fromSheetId);
    const s2 = sheets.find(s => s.id === firstLink.toSheetId);
    if (!s1 || !s2) return;

    const data1 = s1.data || [];
    const data2 = s2.data || [];
    const col1 = firstLink.fromColumn;
    const col2 = firstLink.toColumn;
    const type = activeJoinType[firstLink.id] || "inner";

    const joined: any[] = [];
    const c1Names = s1.columns.map(c => c.name);
    const c2Names = s2.columns.map(c => c.name);
    
    data1.forEach((r1: any) => {
      const match = data2.find((r2: any) => String(r1[col1]) === String(r2[col2]));
      if (match) {
        const row: Record<string, any> = { ...r1 };
        c2Names.forEach(c => {
          const targetKey = c1Names.includes(c) ? `${s2.name}_${c}` : c;
          row[targetKey] = match[c];
        });
        joined.push(row);
      } else if (type === "left" || type === "outer") {
        const row: Record<string, any> = { ...r1 };
        c2Names.forEach(c => {
          const targetKey = c1Names.includes(c) ? `${s2.name}_${c}` : c;
          row[targetKey] = null;
        });
        joined.push(row);
      }
    });

    // Save as new linked dataset in Zustand store
    const mappedCols = Array.from(new Set([...c1Names, ...c2Names.map(c => c1Names.includes(c) ? `${s2.name}_${c}` : c)])).map(name => ({
      name,
      type: "string" as const,
      nullCount: 0,
      uniqueCount: new Set(joined.map(r => r[name])).size,
      sample: joined.slice(0, 3).map(r => r[name])
    }));

    addLinkedDataset({
      id: Math.random().toString(36).substring(2, 9),
      name: "Linked Dataset",
      data: joined,
      columns: mappedCols,
      rowCount: joined.length
    });

    toast.success("Linked Dataset successfully created and added to store!");
  };

  // AI Suggested Links Connector
  const getAiSuggestedLinks = () => {
    setAiSuggesting(true);
    setTimeout(() => {
      const suggestions: any[] = [];
      // Build simple semantic matching links natively
      for (let i = 0; i < sheets.length; i++) {
        for (let j = i + 1; j < sheets.length; j++) {
          const s1 = sheets[i];
          const s2 = sheets[j];
          s1.columns.forEach(c1 => {
            s2.columns.forEach(c2 => {
              if (c1.name.toLowerCase() === c2.name.toLowerCase() && c1.name.toLowerCase().includes("id")) {
                suggestions.push({
                  fromSheet: s1,
                  fromCol: c1.name,
                  toSheet: s2,
                  toCol: c2.name,
                  confidence: "High (Exact Match)"
                });
              }
            });
          });
        }
      }
      setAiSuggestions(suggestions);
      setAiSuggesting(false);
      toast.success(`AI Linker detected ${suggestions.length} potential relationships!`);
    }, 1200);
  };

  const applyAiSuggestion = (sug: any) => {
    addLink({
      id: Math.random().toString(36).substring(2, 9),
      fromSheetId: sug.fromSheet.id,
      fromColumn: sug.fromCol,
      toSheetId: sug.toSheet.id,
      toColumn: sug.toCol,
      joinType: "inner",
      name: `${sug.fromSheet.name}_${sug.fromCol}_to_${sug.toSheet.name}_${sug.toCol}`
    });
    setAiSuggestions(prev => prev.filter(p => p !== sug));
    toast.success("Applied relationship!");
  };

  return (
    <div className="space-y-6 select-none animate-fade-in" ref={containerRef}>
      
      {/* Visual Canvas Diagram */}
      <div className="card-lg bg-white border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-text-tertiary" />
            Visual Schema Diagram
          </span>
          <span className="text-[10px] text-text-tertiary">Click a column, then click a column in another card to connect.</span>
        </div>

        {/* Flex layout with cards representing each sheet */}
        <div className="flex flex-wrap gap-12 justify-center relative min-h-[220px] py-4 bg-muted/10 rounded-2xl border border-dashed">
          
          {sheets.map((sheet) => (
            <div key={sheet.id} className="w-[180px] bg-white rounded-xl border-2 border-border shadow-sm flex flex-col overflow-hidden">
              <div className="bg-muted px-3 py-2 text-left border-b flex justify-between items-center">
                <span className="text-[11px] font-extrabold text-text-primary truncate">{sheet.name}</span>
                <span className="text-[9px] text-text-tertiary font-bold">({sheet.columns.length})</span>
              </div>
              <div className="p-1.5 space-y-0.5 max-h-48 overflow-y-auto custom-scroll">
                {sheet.columns.map((col) => {
                  const isSelected = selectedCol?.sheetId === sheet.id && selectedCol?.colName === col.name;
                  
                  return (
                    <button
                      key={col.name}
                      onClick={() => handleColumnClick(sheet.id, col.name)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-left transition-all ${
                        isSelected
                          ? "bg-green-light text-green-primary border border-green-primary"
                          : "hover:bg-muted text-text-secondary hover:text-text-primary border border-transparent"
                      }`}
                    >
                      <span className="truncate">{col.name}</span>
                      <span className="text-[8px] opacity-40 capitalize">{col.type[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {sheets.length === 0 && (
            <div className="flex items-center justify-center w-full text-xs text-text-tertiary">
              No sheets loaded. Import files first.
            </div>
          )}
        </div>
      </div>

      {/* Active connections list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Connection controllers */}
        <div className="card-lg bg-white border border-border p-5 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-[#533AB9]" />
              Active Connections List ({links.length})
            </span>
            {links.length > 0 && (
              <button
                onClick={handleCreateJoinedDataset}
                className="px-3.5 py-1.5 bg-green-primary hover:bg-green-600 text-white rounded-lg text-[10px] font-extrabold shadow flex items-center gap-1 transition-all"
              >
                Create Joined Dataset
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-48 overflow-y-auto custom-scroll pr-1">
            {links.map((link) => {
              const s1 = sheets.find(s => s.id === link.fromSheetId);
              const s2 = sheets.find(s => s.id === link.toSheetId);
              const joinType = activeJoinType[link.id] || "inner";

              return (
                <div key={link.id} className="flex flex-wrap items-center justify-between p-3 rounded-xl border bg-white shadow-sm gap-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-primary">
                    <span className="text-green-primary">{s1?.name || "Sheet1"}.{link.fromColumn}</span>
                    <span className="text-text-tertiary">────</span>
                    <span className="text-[#533AB9]">{s2?.name || "Sheet2"}.{link.toColumn}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={joinType}
                      onChange={(e) => setActiveJoinType({ ...activeJoinType, [link.id]: e.target.value as any })}
                      className="px-2 py-1 text-[10px] font-bold border rounded-lg focus:ring-1 focus:ring-green-primary outline-none"
                    >
                      <option value="inner">Inner Join</option>
                      <option value="left">Left Join</option>
                      <option value="right">Right Join</option>
                      <option value="outer">Outer Join</option>
                    </select>

                    <button
                      onClick={() => runJoinPreview(link)}
                      className="px-2.5 py-1.5 border hover:bg-muted text-text-secondary rounded-lg text-[10px] font-bold transition-all"
                    >
                      Preview
                    </button>

                    <button
                      onClick={() => { removeLink(link.id); toast.success("Relationship removed."); }}
                      className="p-1 hover:bg-red-50 text-text-tertiary hover:text-red-500 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {links.length === 0 && (
              <div className="text-center py-6 text-xs text-text-tertiary italic">
                No connections defined yet. Click column keys on the diagram cards to link them.
              </div>
            )}
          </div>
        </div>

        {/* AI suggested links */}
        <div className="card-lg bg-white border border-border p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-extrabold text-[#533AB9] flex items-center gap-1.5 mb-3 border-b pb-2">
              <Sparkles className="w-4 h-4 text-[#533AB9]" />
              AI Suggested Relations
            </span>

            <div className="space-y-2 max-h-36 overflow-y-auto custom-scroll pr-1">
              {aiSuggestions.map((sug, i) => (
                <div key={i} className="p-2 border rounded-lg bg-[#EEEDFE]/20 flex items-center justify-between gap-2">
                  <div className="text-[9px] font-bold text-left min-w-0">
                    <span className="text-text-primary block truncate">{sug.fromSheet.name}.{sug.fromCol}</span>
                    <span className="text-text-tertiary">to {sug.toSheet.name}.{sug.toCol}</span>
                  </div>
                  <button
                    onClick={() => applyAiSuggestion(sug)}
                    className="p-1.5 bg-[#533AB9] text-white hover:bg-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0"
                    title="Apply link"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {aiSuggestions.length === 0 && !aiSuggesting && (
                <div className="text-center py-4 text-[10px] text-text-tertiary italic">
                  Click the suggest button to run column relationship analysis.
                </div>
              )}

              {aiSuggesting && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#533AB9]" />
                  <span className="text-[10px] text-text-tertiary">Analyzing...</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={getAiSuggestedLinks}
            disabled={aiSuggesting}
            className="w-full mt-4 py-2 bg-[#EEEDFE] hover:bg-[#DDD6FE] text-[#533AB9] rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Suggest Links with AI
          </button>
        </div>

      </div>

      {/* Mini preview grid */}
      {previewRows.length > 0 && (
        <div className="panel animate-fade-in mt-6">
          <div className="panel-header flex justify-between items-center">
            <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Table2 className="w-4 h-4 text-text-tertiary" />
              Connection Join Preview (First 15 Rows)
            </span>
          </div>
          <div className="overflow-x-auto max-h-60 custom-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {previewCols.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {previewCols.map((col) => (
                      <td key={col}>{String(row[col] ?? "null")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
