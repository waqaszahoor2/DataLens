"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCanvasStore, PRESET_THEMES } from "@/store/useCanvasStore";
import { useDataStore } from "@/store/useDataStore";
import { Search, Command, LayoutDashboard, GitBranch, BarChart3, Sparkles, Settings, ArrowRight, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  category: string;
  label: string;
  shortcut?: string;
  action: () => void;
  icon: React.ComponentType<{ className?: string }>;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { toggleDarkMode, applyPreset, isDarkMode } = useCanvasStore();
  const { datasets, activeDatasetId, setPipelineStep } = useDataStore();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);

  // Define static & dynamic commands list
  const commands: CommandItem[] = [
    // Navigation Category
    {
      category: "Navigation",
      label: "Go to Dashboard Canvas",
      shortcut: "G D",
      icon: LayoutDashboard,
      action: () => { router.push("/dashboard"); onClose(); }
    },
    {
      category: "Navigation",
      label: "Go to Data Pipeline Transformation",
      shortcut: "G T",
      icon: GitBranch,
      action: () => { router.push("/transform"); onClose(); }
    },
    {
      category: "Navigation",
      label: "Go to AI Assistant Chat",
      shortcut: "G A",
      icon: Sparkles,
      action: () => { router.push("/ai"); onClose(); }
    },
    {
      category: "Navigation",
      label: "Go to Settings preferences",
      icon: Settings,
      action: () => { router.push("/settings"); onClose(); }
    },

    // Actions & Tools
    {
      category: "Actions",
      label: "Toggle Interface Dark Mode Theme",
      shortcut: "⌘ B",
      icon: Zap,
      action: () => { toggleDarkMode(); onClose(); }
    },
    {
      category: "Actions",
      label: "Export Dashboard Canvas layout",
      shortcut: "⌘ E",
      icon: Command,
      action: () => {
        toast.success("Ready to export! Click 'Export' in the dashboard topbar.");
        router.push("/dashboard");
        onClose();
      }
    },
    {
      category: "Actions",
      label: "Purge All Datasets & Clear Session",
      icon: Zap,
      action: () => {
        if (confirm("Are you sure you want to clear your local workspace memory?")) {
          localStorage.clear();
          window.location.href = "/transform";
        }
      }
    },

    // Chart Templates Builder Jumps
    {
      category: "Charts Templates",
      label: "Create a new Bar Chart widget",
      icon: BarChart3,
      action: () => {
        router.push("/builder?type=bar");
        toast.info("Configuring new Bar Chart template...");
        onClose();
      }
    },
    {
      category: "Charts Templates",
      label: "Create a new Stacked Line Chart",
      icon: BarChart3,
      action: () => {
        router.push("/builder?type=line");
        toast.info("Configuring new Line Graph template...");
        onClose();
      }
    },
    {
      category: "Charts Templates",
      label: "Create a new Pie Circle widget",
      icon: BarChart3,
      action: () => {
        router.push("/builder?type=pie");
        toast.info("Configuring new Pie Circle template...");
        onClose();
      }
    },

    // Canvas Themes applying
    ...PRESET_THEMES.map((theme) => ({
      category: "Canvas Backgrounds",
      label: `Apply Canvas Theme Preset: ${theme.name}`,
      icon: Check,
      action: () => {
        applyPreset(theme.id);
        toast.success(`Theme set to ${theme.name}!`);
        onClose();
      }
    })),
  ];

  // Filter commands by search input
  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 overflow-hidden">
      {/* Backdrop */}
      <div onClick={onClose} className="drawer-overlay block" />

      {/* Main Palette Modal */}
      <div
        ref={containerRef}
        className={cn(
          "w-full max-w-lg rounded-2xl border shadow-card-lg overflow-hidden z-10 flex flex-col max-h-[420px] transition-all transform animate-fade-in",
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border"
        )}
      >
        {/* Search header bar */}
        <div className="flex items-center px-4 py-3 border-b border-border/80">
          <Search className="w-4 h-4 text-text-tertiary flex-shrink-0 mr-2.5" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command or search templates..."
            className="flex-1 bg-transparent border-0 outline-none text-xs md:text-sm text-text-primary placeholder-text-tertiary"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 border rounded bg-muted text-[10px] font-mono text-text-tertiary">
            ESC
          </kbd>
        </div>

        {/* List items viewport */}
        <div className="flex-grow overflow-y-auto custom-scroll p-2 max-h-[300px]">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-tertiary">
              No matching commands or widgets found.
            </div>
          ) : (
            Object.entries(
              filtered.reduce((acc, curr) => {
                acc[curr.category] = acc[curr.category] || [];
                acc[curr.category].push(curr);
                return acc;
              }, {} as Record<string, CommandItem[]>)
            ).map(([category, items]) => (
              <div key={category} className="space-y-1">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest px-3 py-1.5 block">
                  {category}
                </span>
                {items.map((item) => {
                  const idx = filtered.indexOf(item);
                  const isSel = idx === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-xs font-medium",
                        isSel
                          ? "bg-brand text-white shadow-sm"
                          : isDarkMode ? "hover:bg-gray-800 text-gray-300" : "hover:bg-muted text-text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", isSel ? "text-white" : "text-text-tertiary")} />
                        <span>{item.label}</span>
                      </div>
                      {item.shortcut ? (
                        <kbd className={cn("px-1.5 py-0.5 text-[9px] rounded font-mono", isSel ? "bg-white/20 text-white" : "bg-muted text-text-tertiary")}>
                          {item.shortcut}
                        </kbd>
                      ) : (
                        <ArrowRight className={cn("w-3 h-3 opacity-0", isSel && "opacity-100")} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t text-[10px] text-text-tertiary flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigation</span>
            <span>↵ Select</span>
          </div>
          <span>Power User Mode Enabled</span>
        </div>
      </div>
    </div>
  );
}
