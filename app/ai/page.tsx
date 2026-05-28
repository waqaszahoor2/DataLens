"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/topbar/Topbar";
import { useDataStore } from "@/store/useDataStore";
import { useAIStore } from "@/store/useAIStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useDevice } from "@/lib/useDevice";
import { generateId } from "@/lib/utils";
import {
  Send, Sparkles, Trash2, Plus, MessageSquare,
  Copy, Check, Loader2, BarChart3, Wand2, TrendingUp,
  AlertCircle, FileCode2, Filter, Menu, X, ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUICK_ACTIONS = [
  { icon: BarChart3, label: "Create chart", prompt: "Create a chart showing " },
  { icon: Wand2, label: "Clean my data", prompt: "Analyze my data and suggest cleaning steps: " },
  { icon: TrendingUp, label: "Forecast revenue", prompt: "Forecast the next 6 periods for the revenue column" },
  { icon: AlertCircle, label: "Find anomalies", prompt: "Find and explain any anomalies or outliers in my data" },
  { icon: FileCode2, label: "Generate Python code", prompt: "Generate Python pandas code to: " },
  { icon: Filter, label: "Add filters", prompt: "What filter widgets should I add to my dashboard?" },
];

function buildSystemPrompt(datasets: ReturnType<typeof useDataStore.getState>["datasets"], activeDatasetId: string | null, charts: ReturnType<typeof useDataStore.getState>["charts"]) {
  const dataset = datasets.find((d) => d.id === activeDatasetId);
  const columnInfo = dataset?.columns.map((c) => `${c.name} (${c.type})`).join(", ") ?? "No dataset loaded";
  const sampleRows = dataset ? JSON.stringify(dataset.transformedData.slice(0, 5)) : "[]";
  const chartList = charts.map((c) => `${c.type} chart: ${c.title}`).join(", ") || "No charts yet";
  const rowCount = dataset?.transformedData.length ?? 0;

  return `You are DataLens AI, an expert data analyst and Python developer integrated into the DataLens platform.

The user has a dataset with these columns and types: ${columnInfo}.
Total rows: ${rowCount}.
Sample data (first 5 rows): ${sampleRows}
Current dashboard has these charts: ${chartList}.

When asked to create or modify charts, respond with a JSON block like:
\`\`\`json
{"action":"create_chart","type":"bar","x":"month","y":"revenue","color":"category","title":"Revenue by Month","aggregation":"sum"}
\`\`\`

When asked for code, write valid Python using pandas and plotly. When asked for insights, be concise and data-driven. Always reference actual column names from the dataset.`;
}

function CodeBlock({ code, language = "python" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="code-block my-2 text-xs md:text-sm">
      <div className="code-block-header px-3 py-2 flex items-center justify-between text-gray-400 bg-gray-900 border-b border-gray-800">
        <span>{language}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-white transition-colors">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="code-block-content p-3 overflow-x-auto bg-gray-950 font-mono text-[11px] leading-relaxed text-gray-300">{code}</pre>
    </div>
  );
}

// Compact static SVG chart suggestion widget inside messages
function ChartSuggestionCard({ action, onAdd }: { action: any; onAdd: () => void }) {
  return (
    <div className="mt-3 p-3 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200/50 rounded-xl flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[9px] font-bold text-brand uppercase tracking-wider block">AI Chart Suggestion</span>
          <h4 className="text-xs font-bold text-text-primary mt-0.5">{action.title || "Suggested Widget"}</h4>
        </div>
        <button
          onClick={onAdd}
          className="py-1 px-2.5 bg-brand hover:bg-brand-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all"
        >
          Add to Dashboard
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* SVG chart preview */}
      <div className="h-28 bg-white dark:bg-gray-900/60 border rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
        <svg className="w-full h-full opacity-60">
          <rect x="10%" y="20%" width="12%" height="60%" fill="#DC2626" rx="2" />
          <rect x="30%" y="40%" width="12%" height="40%" fill="#F87171" rx="2" />
          <rect x="50%" y="10%" width="12%" height="70%" fill="#DC2626" rx="2" />
          <rect x="70%" y="30%" width="12%" height="50%" fill="#FCA5A5" rx="2" />
        </svg>
        <span className="absolute text-[9px] font-mono text-text-tertiary bg-white/80 dark:bg-gray-800 px-2 py-0.5 rounded border">
          {action.type?.toUpperCase()} : {action.x} vs {action.y}
        </span>
      </div>
    </div>
  );
}

function MessageContent({ content, onAddChart }: { content: string; onAddChart: (action: any) => void }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3, -3).split("\n");
          const lang = lines[0].trim() || "text";
          const code = lines.slice(1).join("\n");

          // Check if it's a JSON chart action
          if (lang === "json") {
            try {
              const action = JSON.parse(code.trim());
              if (action.action === "create_chart") {
                return (
                  <ChartSuggestionCard
                    key={i}
                    action={action}
                    onAdd={() => onAddChart(action)}
                  />
                );
              }
            } catch {}
          }

          return <CodeBlock key={i} code={code} language={lang} />;
        }
        return (
          <p key={i} className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
            {part}
          </p>
        );
      })}
    </div>
  );
}

export default function AIPage() {
  const { datasets, activeDatasetId, charts, addChart } = useDataStore();
  const { sessions, activeSessionId, createSession, setActiveSession, addMessage, updateLastMessage, setStreaming, isStreaming, deleteSession } = useAIStore();
  const { isDarkMode } = useCanvasStore();
  const device = useDevice();

  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false); // Mobile slide-over list trigger
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    if (!activeSessionId && sessions.length === 0) {
      createSession();
    }
  }, [activeSessionId, sessions.length, createSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isStreaming) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createSession();
    }

    setInput("");

    const userMsg = {
      id: generateId(),
      role: "user" as const,
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    addMessage(sessionId, userMsg);

    const assistantMsg = {
      id: generateId(),
      role: "assistant" as const,
      content: "",
      timestamp: new Date().toISOString(),
    };
    addMessage(sessionId, assistantMsg);
    setStreaming(true);

    try {
      const history = (activeSession?.messages ?? []).map((m) => ({ role: m.role, content: m.content }));
      const systemPrompt = buildSystemPrompt(datasets, activeDatasetId, charts);

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: messageText }],
          systemPrompt,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "API error" }));
        updateLastMessage(sessionId, `Error: ${err.error ?? "API call failed. Check your ANTHROPIC_API_KEY."}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.text) {
                fullText += d.text;
                updateLastMessage(sessionId, fullText);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      updateLastMessage(sessionId, `Network error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setStreaming(false);
    }
  }, [input, isStreaming, activeSessionId, activeSession, datasets, activeDatasetId, charts, createSession, addMessage, updateLastMessage, setStreaming]);

  const handleAddChartSuggested = (action: any) => {
    if (datasets.length === 0) {
      toast.error("Please load a dataset before saving chart cards!");
      return;
    }
    const currentDataset = datasets.find((d) => d.id === activeDatasetId) ?? datasets[0];
    addChart({
      id: generateId(),
      type: action.type ?? "bar",
      title: action.title ?? "AI Suggested Widget",
      datasetId: currentDataset.id,
      xColumn: action.x,
      yColumn: action.y,
      colorColumn: action.color,
      aggregation: action.aggregation ?? "sum",
      showLegend: true,
      showGridlines: true,
      showTooltips: true,
      colorTheme: "default",
      w: 4, h: 3,
    });
    toast.success(`Successfully saved "${action.title}" to dashboard canvas!`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isMobile = device === "mobile";

  // Dynamic layout margins based on responsive sidebar collapse state
  const paddingLeftClass = isMobile
    ? "pl-0"
    : device === "tablet"
      ? "pl-14"
      : "pl-56 3xl:pl-64";

  const historySidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={cn("p-3 border-b flex items-center justify-between", isDarkMode ? "border-gray-800" : "border-border")}>
        <button
          onClick={() => { const id = createSession(); setActiveSession(id); setHistoryOpen(false); }}
          className="btn-primary btn-sm flex-grow gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
        {isMobile && (
          <button onClick={() => setHistoryOpen(false)} className="p-1.5 ml-2 hover:bg-muted text-text-secondary rounded">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
        {sessions.length === 0 && (
          <p className={cn("text-xs text-center py-4", isDarkMode ? "text-gray-600" : "text-text-tertiary")}>
            No chats yet
          </p>
        )}
        {sessions.map((sess) => (
          <div
            key={sess.id}
            className={cn(
              "group flex items-start gap-2 px-2.5 py-2.5 rounded-lg cursor-pointer transition-colors min-h-[48px] items-center",
              activeSessionId === sess.id
                ? isDarkMode ? "bg-gray-800" : "bg-brand-50"
                : isDarkMode ? "hover:bg-gray-800/50" : "hover:bg-muted"
            )}
            onClick={() => { setActiveSession(sess.id); setHistoryOpen(false); }}
          >
            <MessageSquare className={cn("w-4 h-4 flex-shrink-0", activeSessionId === sess.id ? "text-brand" : "text-text-tertiary")} />
            <div className="min-w-0 flex-1 text-left">
              <p className={cn("text-xs font-semibold truncate", isDarkMode ? "text-gray-200" : "text-text-primary")}>
                {sess.title || "New Chat"}
              </p>
              <p className={cn("text-[9px]", isDarkMode ? "text-gray-600" : "text-text-tertiary")}>
                {sess.messages.length} messages
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); deleteSession(sess.id); }}
              className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-500 transition-all p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cn("h-screen flex overflow-hidden", isDarkMode ? "bg-gray-950" : "bg-surface2")}>
      <Sidebar />

      <div className={cn("flex-grow flex flex-col min-w-0 transition-all duration-300 relative", paddingLeftClass)}>
        <Topbar />

        <div className="flex-1 flex min-h-0 pt-[52px] relative overflow-hidden bg-white dark:bg-gray-950">
          
          {/* A. MOBILE FLOATING CHAT DRAWER BACKDROP */}
          {isMobile && historyOpen && (
            <div onClick={() => setHistoryOpen(false)} className="drawer-overlay block lg:hidden" />
          )}

          {/* B. RESPONSIVE CHAT HISTORY SIDE PANEL */}
          <div className={cn(
            "flex-shrink-0 border-r flex flex-col transition-all duration-300 z-30",
            isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border",
            isMobile
              ? cn("fixed top-0 bottom-0 left-0 w-64 translate-x-0 shadow-card-lg", historyOpen ? "translate-x-0" : "-translate-x-full")
              : "w-56"
          )}>
            {historySidebarContent}
          </div>

          {/* C. MAIN CHAT ENGINE WORKSPACE */}
          <div className="flex-grow flex flex-col min-w-0 h-full relative">
            
            {/* Mobile Header indicator action bar */}
            {isMobile && (
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="text-xs font-bold text-brand flex items-center gap-1.5 py-1 px-2.5 border rounded-lg bg-white dark:bg-gray-900"
                >
                  <Menu className="w-3.5 h-3.5" />
                  Chat History
                </button>

                <button
                  onClick={() => { const id = createSession(); setActiveSession(id); }}
                  className="text-xs font-bold text-text-primary flex items-center gap-1.5 py-1 px-2.5 border rounded-lg bg-white dark:bg-gray-900"
                >
                  <Plus className="w-3.5 h-3.5 text-brand" />
                  New Chat
                </button>
              </div>
            )}

            {/* Chat Responses list */}
            <div className="flex-grow overflow-y-auto custom-scroll p-4">
              {(!activeSession || activeSession.messages.length === 0) ? (
                <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center max-w-md mx-auto gap-6">
                  <div>
                    <div className="w-14 h-14 rounded-2xl gradient-ai flex items-center justify-center mx-auto mb-3 animate-pulse shadow-md">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <h2 className={cn("text-lg font-bold mb-1", isDarkMode ? "text-white" : "text-text-primary")}>
                      DataLens AI Analytica
                    </h2>
                    <p className={cn("text-xs leading-normal", isDarkMode ? "text-gray-400" : "text-text-secondary")}>
                      Ask queries about columns, request data charts, anomalies, revenue forecasting, or standard pandas processing.
                    </p>
                  </div>

                  {/* Horizontal Scrollable Quick Actions strip on Mobile, static on Desktop */}
                  <div className="w-full flex lg:grid lg:grid-cols-2 gap-2 overflow-x-auto pb-2 custom-scroll flex-nowrap lg:flex-wrap">
                    {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
                      <button
                        key={label}
                        onClick={() => sendMessage(prompt)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border text-left transition-all flex-shrink-0 lg:flex-shrink w-48 lg:w-auto hover:bg-muted/40",
                          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-border"
                        )}
                      >
                        <Icon className="w-4 h-4 text-brand flex-shrink-0" />
                        <span className={cn("text-[10px] font-bold truncate", isDarkMode ? "text-gray-200" : "text-text-primary")}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-4 pb-20">
                  {activeSession.messages.map((msg) => (
                    <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      {msg.role === "assistant" && (
                        <div className="w-6.5 h-6.5 rounded-lg gradient-ai flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-3 shadow-sm",
                        msg.role === "user"
                          ? "bg-brand text-white rounded-tr-sm"
                          : isDarkMode ? "bg-gray-800 text-gray-100 rounded-tl-sm" : "bg-muted text-text-primary rounded-tl-sm"
                      )}>
                        {msg.role === "assistant" ? (
                          <MessageContent content={msg.content || (isStreaming ? "▌" : "...")} onAddChart={handleAddChartSuggested} />
                        ) : (
                          <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isStreaming && (
                    <div className="flex items-center gap-2 text-text-tertiary text-xs italic pl-8">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                      Generating insight streaming...
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className={cn(
              "border-t p-3 flex-shrink-0 bg-white dark:bg-gray-950",
              isDarkMode ? "border-gray-800" : "border-border"
            )}>
              <div className={cn(
                "flex items-end gap-2 rounded-xl border p-2.5 transition-colors focus-within:ring-2 focus-within:ring-brand/20",
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-border shadow-sm"
              )}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about columns, suggest charts, revenue models..."
                  rows={1}
                  className={cn(
                    "flex-grow bg-transparent text-xs md:text-sm resize-none outline-none max-h-24 leading-relaxed",
                    isDarkMode ? "text-gray-100 placeholder-gray-600" : "text-text-primary placeholder-text-tertiary"
                  )}
                  style={{ minHeight: 22 }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isStreaming}
                  className="p-2 bg-brand text-white rounded-xl flex-shrink-0 disabled:opacity-40 hover:bg-brand-600 transition-colors"
                >
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className={cn("text-[9px] mt-1 text-center leading-none", isDarkMode ? "text-gray-700" : "text-text-tertiary")}>
                Press Enter to submit message · Shift+Enter for new line · Suggest charts added dynamically
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
