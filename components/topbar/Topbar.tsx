"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Sun, Moon, Settings2, FilterX, Sparkles, Bell, Menu, Zap, Layers,
  CheckCircle, ChevronDown, Check, Plus, Trash2, Clock, Play
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useAlertStore } from "@/store/useAlertStore";
import { useCollaboration } from "@/lib/useCollaboration";
import { hasActiveFilters, countActiveFilters } from "@/lib/crossFilter";
import CommandPalette from "@/components/shortcuts/CommandPalette";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/transform": { title: "Data Pipeline", subtitle: "Import → Clean → Transform → Model" },
  "/dashboard": { title: "Dashboard Builder", subtitle: "Drag & drop visual analytics" },
  "/builder": { title: "Chart Builder", subtitle: "Configure and preview charts" },
  "/ai": { title: "AI Assistant", subtitle: "Ask anything about your data" },
  "/settings": { title: "Settings", subtitle: "Appearance & preferences" },
};

export default function Topbar() {
  const pathname = usePathname();
  const { activeFilters, clearAllFilters, datasets, activeDatasetId } = useDataStore();
  const {
    isDarkMode,
    toggleDarkMode,
    setSettingsOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    isEmergencyMode,
    setEmergencyMode
  } = useCanvasStore();

  const { notifications, markAllRead, clearAllNotifications, markAsRead } = useAlertStore();

  // Multi-workspace mock state
  const [workspaces, setWorkspaces] = useState(["Personal Workspace", "Marketing Team", "Finance Portal"]);
  const [activeWorkspace, setActiveWorkspace] = useState("Personal Workspace");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  // Notifications Drawer trigger
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);

  // Command Palette trigger
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Collaboration users
  const { collaborators, myCursor, handleMouseMove } = useCollaboration("active-dashboard");

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const pageInfo = PAGE_TITLES[pathname] ?? { title: "DataLens", subtitle: "" };
  const filtersActive = hasActiveFilters(activeFilters);
  const filterCount = countActiveFilters(activeFilters);

  // Keyboard shortcuts configuration
  useKeyboardShortcuts({
    onToggleCommandPalette: () => setCommandPaletteOpen((prev) => !prev),
    onUndo: () => toast.success("Canvas layout undone successfully!"),
    onRedo: () => toast.success("Canvas layout redone successfully!"),
    onDeleteWidget: () => toast.info("Widget deleted. Layout refreshed."),
  });

  const handleAddWorkspace = () => {
    const name = prompt("Enter new workspace name:");
    if (name) {
      setWorkspaces((prev) => [...prev, name]);
      setActiveWorkspace(name);
      toast.success(`Successfully switched to "${name}" workspace!`, {
        description: "Created private scoped tables and dashboards.",
      });
    }
  };

  return (
    <>
      <header
        onMouseMove={handleMouseMove}
        className={cn(
          "topbar px-4 gap-4 flex items-center justify-between z-40 relative border-b",
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border"
        )}
      >
        {/* Hamburger Menu & Logo (Visible on mobile/tablet) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(
              "p-2 rounded-lg lg:hidden transition-colors",
              isDarkMode ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-text-secondary hover:bg-muted hover:text-text-primary"
            )}
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Logo inside topbar for mobile */}
          <div className="flex lg:hidden items-center gap-1.5">
            <div className="w-6.5 h-6.5 rounded-md gradient-brand flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={cn("text-xs font-extrabold sm:inline hidden", isDarkMode ? "text-white" : "text-text-primary")}>
              DataLens
            </span>
          </div>

          {/* Workspace Switcher in header (dropdown) */}
          <div className="relative hidden lg:block ml-1">
            <button
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              className="flex items-center gap-1 py-1 px-2 border rounded-lg bg-muted/40 hover:bg-muted text-[11px] font-bold text-text-primary transition-all select-none"
            >
              <span>{activeWorkspace}</span>
              <ChevronDown className="w-3 h-3 text-text-tertiary" />
            </button>
            {workspaceOpen && (
              <>
                <div onClick={() => setWorkspaceOpen(false)} className="fixed inset-0 z-40" />
                <div className={cn(
                  "absolute left-0 mt-1.5 w-48 rounded-xl border p-1 shadow-card-lg z-50 animate-fade-in",
                  isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border"
                )}>
                  {workspaces.map((ws) => (
                    <button
                      key={ws}
                      onClick={() => {
                        setActiveWorkspace(ws);
                        setWorkspaceOpen(false);
                        toast.success(`Active workspace: ${ws}`);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold hover:bg-muted",
                        activeWorkspace === ws ? "text-brand" : "text-text-secondary"
                      )}
                    >
                      <span>{ws}</span>
                      {activeWorkspace === ws && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                  <div className="border-t my-1" />
                  <button
                    onClick={() => { handleAddWorkspace(); setWorkspaceOpen(false); }}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left text-xs font-bold text-brand hover:bg-muted"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Workspace
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Page info (Desktop only) */}
        <div className="hidden lg:block flex-1 min-w-0">
          <h1 className={cn(
            "text-sm font-semibold leading-none",
            isDarkMode ? "text-white" : "text-text-primary"
          )}>
            {pageInfo.title}
          </h1>
          {pageInfo.subtitle && (
            <p className={cn(
              "text-[10px] mt-0.5",
              isDarkMode ? "text-gray-500" : "text-text-tertiary"
            )}>
              {pageInfo.subtitle}
            </p>
          )}
        </div>

        {/* Center title on mobile view */}
        <div className="lg:hidden block text-center flex-1">
          <span className={cn("text-xs font-extrabold", isDarkMode ? "text-white" : "text-text-primary")}>
            {pageInfo.title}
          </span>
        </div>

        {/* Dynamic active crossfilter badges */}
        {filtersActive && (
          <button
            onClick={clearAllFilters}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand border border-brand-200 text-xs font-medium hover:bg-brand-100 transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" />
            Clear {filterCount} filters
          </button>
        )}

        {/* Collaborators bubbles in Topbar */}
        <div className="flex items-center -space-x-1.5 mr-2">
          {collaborators.map((c) => (
            <div
              key={c.id}
              className="w-6.5 h-6.5 rounded-full border-2 border-white dark:border-gray-900 bg-brand-50 dark:bg-gray-800 text-[10px] font-extrabold flex items-center justify-center cursor-default shadow-sm select-none"
              style={{ color: c.color }}
              title={`${c.name} is online`}
            >
              {c.avatar}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Red lightning bolt button for Emergency Mode */}
          <button
            onClick={() => setEmergencyMode(true)}
            className={cn(
              "btn-icon rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200",
              isEmergencyMode && "bg-red-600 text-white"
            )}
            title="Emergency Recovery Mode"
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* Clock icon for version history */}
          <button
            onClick={() => toast.info("Opening dashboard version timeline history logs...")}
            className={cn(
              "btn-icon rounded-lg",
              isDarkMode ? "text-gray-400 hover:bg-gray-800" : "text-text-secondary hover:bg-muted"
            )}
            title="Version History (Clock)"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* AI quick access */}
          <a
            href="/ai"
            className={cn(
              "btn-icon rounded-lg",
              isDarkMode ? "text-gray-400 hover:bg-gray-800 hover:text-ai" : "text-text-secondary hover:bg-muted hover:text-ai"
            )}
            title="Open AI Assistant"
          >
            <Sparkles className="w-4 h-4" />
          </a>

          {/* Canvas settings (only on dashboard) */}
          {pathname === "/dashboard" && (
            <button
              onClick={() => setSettingsOpen(true)}
              className={cn(
                "btn-icon rounded-lg",
                isDarkMode ? "text-gray-400 hover:bg-gray-800" : "text-text-secondary hover:bg-muted"
              )}
              title="Canvas Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className={cn(
              "btn-icon rounded-lg",
              isDarkMode ? "text-yellow-400 hover:bg-gray-800" : "text-text-secondary hover:bg-muted"
            )}
            title={isDarkMode ? "Light mode" : "Dark mode"}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Bell Notifications drawer toggle */}
          <button
            onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
            className={cn(
              "btn-icon rounded-lg relative transition-all",
              isDarkMode ? "text-gray-400 hover:bg-gray-800" : "text-text-secondary hover:bg-muted"
            )}
            title="Notification Center"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-brand text-white rounded-full text-[9px] font-extrabold flex items-center justify-center animate-bounce shadow">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* D. NOTIFICATIONS CENTER SIDE-DRAWER */}
      {notifDrawerOpen && (
        <>
          <div onClick={() => setNotifDrawerOpen(false)} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs transition-opacity" />
          <div className={cn(
            "fixed right-0 top-0 bottom-0 w-80 shadow-card-lg z-50 flex flex-col overflow-hidden animate-fade-in p-4 border-l transition-all",
            isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border"
          )}>
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <div className="flex items-center gap-1.5">
                <Bell className="w-4.5 h-4.5 text-brand" />
                <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Notification Center</span>
              </div>
              <button onClick={() => setNotifDrawerOpen(false)} className="text-[10px] hover:underline font-bold text-text-tertiary">
                Close
              </button>
            </div>

            <div className="flex-grow overflow-y-auto custom-scroll space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-16 text-text-tertiary text-xs">
                  No active alerts or updates.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left cursor-pointer transition-all hover:bg-muted/40",
                      notif.isRead ? "opacity-60 border-border" : "border-brand bg-brand-50/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[9px] font-bold text-brand uppercase tracking-wider block">
                        {notif.type.toUpperCase()} ALERT
                      </span>
                      {!notif.isRead && <span className="w-2 h-2 rounded-full bg-brand" />}
                    </div>
                    <h4 className="text-xs font-bold mt-1 text-text-primary">{notif.title}</h4>
                    <p className="text-[10px] mt-0.5 text-text-secondary leading-normal">{notif.message}</p>
                    <span className="text-[8px] text-text-tertiary block mt-1">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-3 flex gap-2">
              <button onClick={markAllRead} className="py-2 px-3 border rounded-lg text-[10px] font-bold flex-1 hover:bg-muted text-text-primary">
                Mark all read
              </button>
              <button onClick={clearAllNotifications} className="py-2 px-3 border border-red-100 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-50">
                Clear all
              </button>
            </div>
          </div>
        </>
      )}

      {/* E. COMMAND PALETTE MODAL PANEL */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}
