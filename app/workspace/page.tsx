"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import Topbar from "@/components/topbar/Topbar";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useDataStore } from "@/store/useDataStore";
import { useDevice } from "@/lib/useDevice";
import {
  Layers, Plus, LayoutDashboard, Copy, Edit3, Trash2, Share2,
  Calendar, FileSpreadsheet, BarChart, ArrowRight, UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DashboardCard {
  id: string;
  name: string;
  lastModified: string;
  rowCount: number;
  chartCount: number;
  isPublic: boolean;
}

export default function WorkspacePage() {
  const { isDarkMode } = useCanvasStore();
  const { datasets, charts } = useDataStore();
  const device = useDevice();

  // Workspace selections
  const [workspaces, setWorkspaces] = useState([
    { id: "ws-1", name: "Personal Workspace", desc: "Private analytical sandbox" },
    { id: "ws-2", name: "Marketing Team Space", desc: "Cooperative campaign results" },
    { id: "ws-3", name: "Finance Corporate", desc: "Scoping balance charts" }
  ]);
  const [activeWs, setActiveWs] = useState("ws-1");

  // Dashboards list
  const [dashboards, setDashboards] = useState<DashboardCard[]>([
    {
      id: "dash-1",
      name: "Q2 Operations Analytics",
      lastModified: "2 minutes ago",
      rowCount: datasets[0]?.transformedData?.length ?? 1540,
      chartCount: charts.length || 3,
      isPublic: false,
    },
    {
      id: "dash-2",
      name: "Campaign Performance Monitor",
      lastModified: "3 hours ago",
      rowCount: 240,
      chartCount: 2,
      isPublic: true,
    }
  ]);

  const handleCreateWorkspace = () => {
    const name = prompt("Enter new workspace scope name:");
    if (name) {
      const newWs = {
        id: `ws-${Date.now()}`,
        name,
        desc: "Newly scoped collaborative room.",
      };
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWs(newWs.id);
      toast.success(`Created workspace scope: "${name}"`);
    }
  };

  const handleDuplicate = (id: string) => {
    const target = dashboards.find((d) => d.id === id);
    if (target) {
      const newDash = {
        ...target,
        id: `dash-${Date.now()}`,
        name: `${target.name} (Copy)`,
        lastModified: "Just now",
      };
      setDashboards((prev) => [...prev, newDash]);
      toast.success("Dashboard successfully duplicated!");
    }
  };

  const handleDelete = (id: string) => {
    setDashboards((prev) => prev.filter((d) => d.id !== id));
    toast.error("Dashboard widget successfully deleted.");
  };

  const handleShare = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/dashboard/share/${id}`);
    toast.success("Share token copied to clipboard!", {
      description: "Collaborators can view this read-only public view without signing in.",
    });
  };

  const isMobile = device === "mobile";

  // Dynamic layout margins based on responsive sidebar collapse state
  const paddingLeftClass = isMobile
    ? "pl-0"
    : device === "tablet"
      ? "pl-14"
      : "pl-56 3xl:pl-64";

  return (
    <div className={cn("h-screen flex overflow-hidden", isDarkMode ? "bg-gray-950" : "bg-surface2")}>
      <Sidebar />

      <div className={cn("flex-grow flex flex-col min-w-0 transition-all duration-300", paddingLeftClass)}>
        <Topbar />

        <main className="flex-1 overflow-y-auto custom-scroll pt-[52px]">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8 pb-20">
            {/* Scoped Switcher header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-text-primary flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand" />
                  Scoped Workspace Rooms
                </h1>
                <p className="text-xs text-text-tertiary mt-1">
                  Scope and sync dataframes, SQL filters, pipelines, and dashboards.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateWorkspace}
                  className="py-2.5 px-4 bg-brand hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Workspace
                </button>
              </div>
            </div>

            {/* Workspaces navigation list */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWs(ws.id);
                    toast.success(`Loaded settings for workspace scope: ${ws.name}`);
                  }}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    activeWs === ws.id
                      ? "border-brand bg-white dark:bg-gray-900 ring-2 ring-brand/10"
                      : "border-border bg-white/50 dark:bg-gray-900/40 hover:border-brand/40"
                  )}
                >
                  <span className={cn("text-xs font-bold block", activeWs === ws.id ? "text-brand" : "text-text-primary")}>
                    {ws.name}
                  </span>
                  <span className="text-[10px] text-text-tertiary block mt-0.5">{ws.desc}</span>
                </button>
              ))}
            </div>

            {/* Active dashboards table/grid */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
                Dashboards in Active Scope
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboards.map((dash) => (
                  <div
                    key={dash.id}
                    className={cn(
                      "rounded-xl border p-4 shadow-sm flex flex-col justify-between h-44 transition-all hover:-translate-y-0.5",
                      isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border"
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-brand-50 text-brand rounded-lg flex items-center justify-center">
                            <LayoutDashboard className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-text-primary">{dash.name}</h3>
                            <span className="text-[9px] text-text-tertiary flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              Modified {dash.lastModified}
                            </span>
                          </div>
                        </div>

                        {dash.isPublic && (
                          <span className="text-[9px] bg-brand-50 text-brand px-1.5 py-0.5 rounded font-bold">
                            Public
                          </span>
                        )}
                      </div>

                      {/* Small stats badges */}
                      <div className="flex gap-2 mt-4">
                        <span className="py-1 px-2.5 bg-muted rounded-lg text-[9px] font-bold text-text-secondary flex items-center gap-1">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          {dash.rowCount.toLocaleString()} Rows
                        </span>
                        <span className="py-1 px-2.5 bg-muted rounded-lg text-[9px] font-bold text-text-secondary flex items-center gap-1">
                          <BarChart className="w-3.5 h-3.5" />
                          {dash.chartCount} Charts
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5 pt-3 border-t">
                      <button
                        onClick={() => handleShare(dash.id)}
                        className="py-1.5 px-2.5 border rounded-lg hover:bg-muted text-[10px] font-bold text-text-primary flex items-center gap-1 flex-1 justify-center transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </button>
                      <button
                        onClick={() => handleDuplicate(dash.id)}
                        className="p-1.5 border rounded-lg hover:bg-muted text-text-tertiary hover:text-brand"
                        title="Duplicate dashboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(dash.id)}
                        className="p-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-500"
                        title="Delete dashboard"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
