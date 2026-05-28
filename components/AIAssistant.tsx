"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Copy, Play, Loader2, MessageSquare, Trash2, Code2, ChevronDown } from "lucide-react";
import { useStore, type AIMessage } from "@/lib/store";
import { buildDataLensSystemPrompt } from "@/lib/ai-utils";
import { generateId } from "@/lib/utils";

const QUICK_PROMPTS = [
  { label: "Bar Chart", prompt: "Create a bar chart showing the distribution by category" },
  { label: "Scatter Plot", prompt: "Create a scatter plot to show correlation between two numeric columns" },
  { label: "Trend Line", prompt: "Show a time series trend line for the main metric over time" },
  { label: "Heatmap", prompt: "Create a correlation heatmap of all numeric columns" },
  { label: "Top 10", prompt: "Show the top 10 rows sorted by the highest value" },
  { label: "Anomalies", prompt: "Identify and visualize anomalies or outliers in the data" },
];

function extractCodeBlock(text: string): { code: string | null; text: string } {
  const match = text.match(/```(?:python)?\n?([\s\S]*?)```/);
  if (!match) return { code: null, text };
  return {
    code: match[1].trim(),
    text: text.replace(/```(?:python)?\n?[\s\S]*?```/, "").trim(),
  };
}

function MessageBubble({
  message,
  onApplyCode,
}: {
  message: AIMessage;
  onApplyCode?: (code: string) => void;
}) {
  const { code, text } = extractCodeBlock(message.content);
  const [copied, setCopied] = useState(false);
  const [codeOpen, setCodeOpen] = useState(true);

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (message.role === "user") {
    return (
      <div className="ai-message-user">
        <p className="leading-relaxed">{message.content}</p>
      </div>
    );
  }

  return (
    <div className="ai-message-ai space-y-2">
      {text && (
        <p className="text-text1 leading-relaxed text-sm whitespace-pre-wrap">{text}</p>
      )}
      {code && (
        <div className="rounded-xl overflow-hidden border border-border">
          <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e2e]">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-brand-mid" />
              <span className="text-xs font-medium text-gray-400 font-mono">python</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copied ? "Copied!" : "Copy"}
              </button>
              {onApplyCode && (
                <button
                  onClick={() => onApplyCode(code)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-brand text-white rounded hover:bg-brand-dark transition-colors"
                >
                  <Play className="w-3 h-3" />
                  Apply & Run
                </button>
              )}
              <button onClick={() => setCodeOpen(!codeOpen)} className="text-gray-500 hover:text-gray-300 ml-1">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${codeOpen ? "" : "-rotate-90"}`} />
              </button>
            </div>
          </div>
          {codeOpen && (
            <pre className="p-3 bg-[#12121e] text-xs text-gray-300 overflow-x-auto font-mono leading-relaxed">
              <code>{code}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIAssistant({
  onApplyCode,
}: {
  onApplyCode?: (code: string) => void;
}) {
  const { columns, transformedData, canvasBg, aiMessages, addAIMessage, clearAIMessages } = useStore();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, streamingText]);

  const handleSend = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;

    setInput("");

    const userMsg: AIMessage = {
      id: generateId(),
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };
    addAIMessage(userMsg);
    setIsLoading(true);
    setStreamingText("");

    try {
      const systemPrompt = buildDataLensSystemPrompt(
        columns.map((c) => c.name),
        transformedData.slice(0, 5) as Record<string, unknown>[],
        canvasBg
      );

      const messages = [...aiMessages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, systemPrompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "AI request failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              fullText += data.text;
              setStreamingText(fullText);
            } catch {}
          }
        }
      }

      const assistantMsg: AIMessage = {
        id: generateId(),
        role: "assistant",
        content: fullText,
        timestamp: Date.now(),
      };
      addAIMessage(assistantMsg);
    } catch (err) {
      const errorMsg: AIMessage = {
        id: generateId(),
        role: "assistant",
        content: `⚠️ Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: Date.now(),
      };
      addAIMessage(errorMsg);
    } finally {
      setIsLoading(false);
      setStreamingText("");
    }
  };

  // Auto-generate suggestion chips from column types
  const numericCols = columns.filter((c) => c.type === "number").map((c) => c.name);
  const categoryCols = columns.filter((c) => c.type === "string").map((c) => c.name);
  const dateCols = columns.filter((c) => c.type === "date").map((c) => c.name);

  const suggestions = [
    numericCols.length >= 2 && `Scatter plot: ${numericCols[0]} vs ${numericCols[1]}`,
    categoryCols.length && numericCols.length && `Bar chart: ${numericCols[0]} by ${categoryCols[0]}`,
    dateCols.length && numericCols.length && `Trend: ${numericCols[0]} over ${dateCols[0]}`,
    numericCols.length >= 3 && "Correlation heatmap of all numeric columns",
    "Detect outliers and anomalies",
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-brand to-brand-mid rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-text1 text-sm">DataLens AI</h3>
            <p className="text-xs text-text2">Powered by Claude</p>
          </div>
        </div>
        {aiMessages.length > 0 && (
          <button onClick={clearAIMessages} className="dl-btn-ghost text-xs p-1.5 text-text3">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {aiMessages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-brand-light rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6 text-brand" />
            </div>
            <h4 className="font-semibold text-text1 mb-1 text-sm">Ask DataLens AI</h4>
            <p className="text-xs text-text2 mb-4">
              I can create visualizations, find insights, and help analyze your data.
            </p>

            {/* Quick prompt buttons */}
            <div className="space-y-1.5">
              {QUICK_PROMPTS.slice(0, 4).map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => handleSend(qp.prompt)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-brand hover:bg-brand-light/30 transition-all text-xs text-text2 hover:text-brand"
                >
                  <span className="font-medium">{qp.label}</span>
                  <span className="block text-text3 mt-0.5 truncate">{qp.prompt}</span>
                </button>
              ))}
            </div>

            {/* Column-based suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-text3 mb-2">Based on your data:</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {suggestions.slice(0, 3).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="px-2.5 py-1 bg-brand-light text-brand text-xs rounded-full hover:bg-brand hover:text-white transition-colors font-medium"
                    >
                      {s.length > 30 ? s.slice(0, 30) + "…" : s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {aiMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onApplyCode={onApplyCode} />
        ))}

        {/* Streaming indicator */}
        {isLoading && streamingText && (
          <div className="ai-message-ai">
            <p className="text-sm text-text1 whitespace-pre-wrap">{streamingText}</p>
            <span className="inline-block w-1.5 h-4 bg-brand animate-pulse ml-0.5 align-text-bottom rounded" />
          </div>
        )}

        {isLoading && !streamingText && (
          <div className="ai-message-ai flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand" />
            <span className="text-sm text-text2">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            id="ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about your data... (Enter to send)"
            className="dl-input resize-none text-sm flex-1 min-h-[40px] max-h-[120px]"
            rows={1}
            disabled={isLoading}
          />
          <button
            id="ai-send-btn"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="dl-btn-primary p-2.5 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-text3 mt-1.5 text-center">Claude · Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
