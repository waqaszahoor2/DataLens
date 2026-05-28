"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, GitBranch, BarChart3, Sparkles,
  Settings, Database, ChevronRight, Layers, X,
  Upload, Wand2, Activity, Pin, PinOff
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Pipeline",
    items: [
      { href: "/transform", icon: GitBranch, label: "Data Pipeline", badge: null },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", badge: null },
      { href: "/builder", icon: BarChart3, label: "Chart Builder", badge: null },
      { href: "/ai", icon: Sparkles, label: "AI Assistant", badge: "AI" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", icon: Settings, label: "Settings", badge: null },
    ],
  },
];

const PIPELINE_STEPS = [
  { step: 0, label: "Import", icon: Upload },
  { step: 1, label: "Clean", icon: Wand2 },
  { step: 2, label: "Transform", icon: GitBranch },
  { step: 3, label: "Model", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { datasets, activeDatasetId, pipelineStep, setPipelineStep, clearSession } = useDataStore();
  const { isDarkMode, mobileMenuOpen, setMobileMenuOpen } = useCanvasStore();
  const activeDataset = datasets.find((d) => d.id === activeDatasetId);
  const isTransformPage = pathname === "/transform";

  // Sidebar pin state for Tablet mode
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = isPinned || isHovered || mobileMenuOpen;

  const handleNavClick = () => {
    // Auto close drawer on navigation selection (mobile only)
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Drawer Top Header (Avatar & Email shown at top on mobile) */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3.5 border-b",
        isDarkMode ? "border-gray-800" : "border-border"
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7.5 h-7.5 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 shadow-sm">
            <Layers className="w-4.5 h-4.5 text-white" />
          </div>
          {isExpanded && (
            <div className="truncate animate-fade-in">
              <span className={cn("text-sm font-bold tracking-tight", isDarkMode ? "text-white" : "text-text-primary")}>
                DataLens
              </span>
              <div className={cn("text-[9px] font-medium leading-none", isDarkMode ? "text-gray-500" : "text-text-tertiary")}>
                AI Analytics Shell
              </div>
            </div>
          )}
        </div>

        {/* Pin Sidebar toggle (Only shown on Desktop/Tablet landscape) */}
        {isExpanded && (
          <button
            onClick={() => setIsPinned(!isPinned)}
            className="hidden sm:inline-flex p-1 hover:bg-muted text-text-secondary hover:text-brand rounded transition-colors"
            title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5 text-brand" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Mobile close button */}
        {mobileMenuOpen && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 hover:bg-muted text-text-secondary rounded lg:hidden transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile User Profile Card */}
      {isExpanded && (
        <div className={cn(
          "mx-3 mt-3 p-3 rounded-xl border flex items-center gap-2.5",
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-muted border-border"
        )}>
          <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center font-bold text-brand shadow-inner flex-shrink-0 text-sm">
            JD
          </div>
          <div className="truncate text-left">
            <div className={cn("text-xs font-bold truncate", isDarkMode ? "text-white" : "text-text-primary")}>
              John Doe
            </div>
            <div className={cn("text-[9px] truncate", isDarkMode ? "text-gray-500" : "text-text-tertiary")}>
              john.doe@datalens.ai
            </div>
          </div>
        </div>
      )}

      {/* Dataset indicator */}
      {activeDataset && isExpanded && (
        <div className={cn(
          "mx-3 mt-3 p-2.5 rounded-lg border animate-fade-in",
          isDarkMode ? "bg-gray-800/80 border-gray-700" : "bg-muted/80 border-border"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="w-3.5 h-3.5 text-brand flex-shrink-0" />
              <span className={cn(
                "text-xs font-medium truncate",
                isDarkMode ? "text-gray-200" : "text-text-primary"
              )}>
                {activeDataset.name}
              </span>
            </div>
            <button
              onClick={clearSession}
              className="text-text-tertiary hover:text-red-500 transition-colors ml-1 flex-shrink-0"
              title="Clear session"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className={cn("text-[10px] mt-1 text-left", isDarkMode ? "text-gray-500" : "text-text-tertiary")}>
            {activeDataset.transformedData.length.toLocaleString()} rows · {activeDataset.columns.length} cols
          </div>
        </div>
      )}

      {/* Pipeline steps (only on /transform page) */}
      {isTransformPage && isExpanded && (
        <div className={cn(
          "mx-3 mt-3 p-2.5 rounded-lg border animate-fade-in",
          isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-muted/50 border-border"
        )}>
          <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-2 text-left",
            isDarkMode ? "text-gray-500" : "text-text-tertiary")}>
            Pipeline Steps
          </div>
          <div className="space-y-0.5">
            {PIPELINE_STEPS.map(({ step: stepIdx, label, icon: Icon }) => {
              const isDone = pipelineStep > stepIdx;
              const isActive = pipelineStep === stepIdx;
              return (
                <button
                  key={stepIdx}
                  onClick={() => setPipelineStep(stepIdx)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2.5 rounded-md text-xs font-medium transition-all duration-150",
                    isActive && "bg-brand text-white",
                    isDone && !isActive && (isDarkMode ? "text-brand-300 bg-brand-900/20" : "text-brand bg-brand-50"),
                    !isActive && !isDone && (isDarkMode ? "text-gray-500" : "text-text-tertiary")
                  )}
                >
                  <span className={cn(
                    "w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0",
                    isActive ? "bg-white/20 text-white" : isDone ? "bg-brand text-white" : "bg-gray-200 text-gray-500"
                  )}>
                    {isDone ? "✓" : stepIdx + 1}
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto custom-scroll px-3 py-3 space-y-4">
        {NAV_ITEMS.map((group) => (
          <div key={group.label}>
            {isExpanded ? (
              <div className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-3 mb-1.5 text-left",
                isDarkMode ? "text-gray-600" : "text-text-tertiary"
              )}>
                {group.label}
              </div>
            ) : (
              <div className="h-4 border-b border-dashed border-border mx-1 my-2" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer min-h-[48px] py-3.5 px-3.5",
                      isActive ? (isDarkMode ? "bg-gray-800 text-brand font-bold" : "bg-brand-50 text-brand font-bold") : (isDarkMode ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-text-secondary hover:bg-muted hover:text-text-primary")
                    )}
                    title={item.label}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}
                    {item.badge === "AI" && isExpanded && (
                      <span className="badge-ai text-[8px] font-bold px-1.5 py-0.5">AI</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer (Version and logo details) */}
      <div className={cn(
        "px-4 py-3.5 border-t text-[10px] text-left truncate",
        isDarkMode ? "border-gray-800 text-gray-600" : "border-border text-text-tertiary"
      )}>
        {isExpanded ? "DataLens v2.0 · Professional Shell" : "v2.0"}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. MOBILE DRAWER BACKGROUND OVERLAY */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="drawer-overlay block lg:hidden"
        />
      )}

      {/* 2. RESPONSIVE SIDEBAR CONTAINER */}
      {/* Handles tabletCollapsed (width-12) and smooth expand transitions */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed top-0 bottom-0 left-0 bg-white border-r z-30 transition-all duration-300 overflow-hidden shadow-card",
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border",
          // Mobile state
          mobileMenuOpen ? "translate-x-0 w-64 block" : "-translate-x-full lg:translate-x-0",
          // Tablet/Desktop states
          !mobileMenuOpen && (isExpanded ? "w-56 lg:w-56 3xl:w-64" : "w-14")
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
