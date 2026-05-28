"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Grid, FileText, Upload, Brush, Shuffle, Link2,
  BarChart3, Settings, Filter, Code, Cpu, Sparkles,
  Wand2, Brain, FileText as ReportIcon, Share2, Bell,
  Palette, User, Cog, MoreVertical, LogOut, ChevronRight, X, Pin, PinOff
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: {
    text: string;
    variant: "green" | "blue" | "purple" | "dynamic";
  };
}

interface SidebarSection {
  title: string;
  isAi?: boolean;
  items: SidebarItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { sheets, links } = useDataStore();
  const { isDarkMode, mobileMenuOpen, setMobileMenuOpen } = useCanvasStore();

  // Pinned & Hovered states (Tablet collapses to 52px, Hover expands to 220px)
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isExpanded = isPinned || isHovered || mobileMenuOpen;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = () => {
    // Auto close on mobile
    setMobileMenuOpen(false);
  };

  // Define sidebar sections exactly in order
  const SECTIONS: SidebarSection[] = [
    {
      title: "MAIN",
      items: [
        { icon: Grid, label: "Dashboard", href: "/dashboard" },
        {
          icon: FileText,
          label: "Data Sources",
          href: "/sources",
          badge: { text: String(sheets?.length || 0), variant: "dynamic" }
        }
      ]
    },
    {
      title: "DATA PIPELINE",
      items: [
        { icon: Upload, label: "Import Data", href: "/transform?step=import" },
        { icon: Brush, label: "Clean Data", href: "/transform?step=clean" },
        { icon: Shuffle, label: "Transform", href: "/transform?step=transform" },
        {
          icon: Link2,
          label: "Link Sheets",
          href: "/transform?step=link",
          badge: { text: "NEW", variant: "green" }
        }
      ]
    },
    {
      title: "ANALYSE",
      items: [
        { icon: BarChart3, label: "Visualize", href: "/dashboard" },
        { icon: Settings, label: "Chart Builder", href: "/builder" },
        { icon: Filter, label: "Filters", href: "/dashboard?filters=true" },
        {
          icon: Code,
          label: "Python Code",
          href: "/python",
          badge: { text: "PY", variant: "blue" }
        },
        {
          icon: Cpu,
          label: "Data Modelling",
          href: "/modelling",
          badge: { text: "NEW", variant: "green" }
        }
      ]
    },
    {
      title: "AI TOOLS",
      isAi: true,
      items: [
        {
          icon: Sparkles,
          label: "AI Assistant",
          href: "/ai",
          badge: { text: "AI", variant: "purple" }
        },
        { icon: Wand2, label: "AI Code Gen", href: "/ai?mode=codegen" },
        { icon: Brain, label: "AI Insights", href: "/ai?mode=insights" }
      ]
    },
    {
      title: "OUTPUT",
      items: [
        { icon: FileText, label: "Reports", href: "/reports" },
        { icon: Share2, label: "Export", href: "/export" },
        { icon: Bell, label: "Alerts", href: "/alerts" }
      ]
    },
    {
      title: "SETTINGS",
      items: [
        { icon: Palette, label: "Canvas Theme", href: "/settings?tab=theme" },
        { icon: User, label: "Profile", href: "/profile" },
        { icon: Cog, label: "Settings", href: "/settings" }
      ]
    }
  ];

  // User details (fallback to J.D. if not authenticated)
  const userInitials = session?.user?.name
    ? session.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "JD";
  const userName = session?.user?.name || "John Doe";
  const userRole = session?.user?.email === "admin@datalens.ai" ? "Administrator" : "Data Analyst";

  const renderBadge = (badge: SidebarItem["badge"]) => {
    if (!badge) return null;
    const badgeText = badge.variant === "dynamic" ? String(sheets?.length || 0) : badge.text;

    return (
      <span className={cn(
        "text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center transition-all animate-fade-in",
        badge.variant === "green" && "bg-[#E1F5EE] text-[#1D9E75]",
        badge.variant === "blue" && "bg-blue-50 text-blue-600 border border-blue-100",
        badge.variant === "purple" && "bg-[#EEEDFE] text-[#533AB9]",
        badge.variant === "dynamic" && "bg-gray-100 text-text-primary"
      )}>
        {badgeText}
      </span>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* 1. Header Row */}
      <div className={cn(
        "flex items-center justify-between px-4 py-4 border-b h-16 flex-shrink-0",
        isDarkMode ? "border-gray-800" : "border-border"
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-green-primary flex items-center justify-center flex-shrink-0 shadow-md">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          {isExpanded && (
            <div className="truncate text-left animate-fade-in">
              <span className={cn("text-sm font-extrabold tracking-tight", isDarkMode ? "text-white" : "text-text-primary")}>
                DataLens
              </span>
              <div className="text-[9px] font-bold text-green-primary leading-none">
                AI Platform Shell
              </div>
            </div>
          )}
        </div>

        {/* Pin toggle for desktop/tablet */}
        {isExpanded && (
          <button
            onClick={() => setIsPinned(!isPinned)}
            className="hidden md:inline-flex p-1 hover:bg-muted text-text-secondary hover:text-green-primary rounded-lg transition-all"
            title={isPinned ? "Unpin sidebar (collapse to icons)" : "Pin sidebar open"}
          >
            {isPinned ? <PinOff className="w-4 h-4 text-green-primary" /> : <Pin className="w-4 h-4" />}
          </button>
        )}

        {/* Mobile close button */}
        {mobileMenuOpen && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 hover:bg-muted text-text-secondary rounded-lg md:hidden transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Scrollable Navigation List */}
      <nav className="flex-1 overflow-y-auto custom-scroll px-3 py-4 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {isExpanded ? (
              <div className={cn(
                "text-[10px] font-extrabold uppercase tracking-wider px-3 mb-2 text-left",
                isDarkMode ? "text-gray-600" : "text-text-tertiary"
              )}>
                {section.title}
              </div>
            ) : (
              <div className="h-px border-b border-dashed border-border mx-1 my-2" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 rounded-xl transition-all duration-150 min-h-[44px] px-3.5 py-2.5",
                      isActive
                        ? section.isAi
                          ? "bg-[#EEEDFE] text-[#533AB9] font-bold"
                          : "bg-[#E1F5EE] text-[#1D9E75] font-bold"
                        : isDarkMode
                          ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                          : "text-text-secondary hover:bg-muted hover:text-text-primary"
                    )}
                    title={item.label}
                  >
                    <item.icon className={cn("w-4.5 h-4.5 flex-shrink-0", isActive ? (section.isAi ? "text-[#533AB9]" : "text-[#1D9E75]") : "text-text-secondary")} />
                    {isExpanded && (
                      <span className="flex-1 text-left text-[13px] font-semibold tracking-tight truncate">
                        {item.label}
                      </span>
                    )}
                    {isExpanded && renderBadge(item.badge)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 3. Rebuilt Footer Profile with Three-dot dropdown menu */}
      <div className={cn(
        "p-3 border-t flex-shrink-0 relative",
        isDarkMode ? "border-gray-800 bg-gray-900/50" : "border-border bg-white"
      )} ref={dropdownRef}>
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-green-light flex items-center justify-center font-extrabold text-green-primary shadow flex-shrink-0 text-sm">
              {userInitials}
            </div>
            {isExpanded && (
              <div className="truncate text-left animate-fade-in min-w-0">
                <div className={cn("text-xs font-bold truncate leading-snug", isDarkMode ? "text-white" : "text-text-primary")}>
                  {userName}
                </div>
                <div className="text-[10px] text-text-tertiary truncate leading-none">
                  {userRole}
                </div>
              </div>
            )}
          </div>

          {isExpanded && (
            <button
              onClick={() => setMenuDropdownOpen(!menuDropdownOpen)}
              className="p-1.5 hover:bg-muted text-text-secondary hover:text-text-primary rounded-lg transition-all flex-shrink-0"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Floating Settings Dropdown Menu */}
        {menuDropdownOpen && (
          <div className={cn(
            "absolute bottom-16 right-3 w-48 rounded-xl border shadow-lg py-1.5 z-50 animate-fade-in",
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-border"
          )}>
            <button
              onClick={() => { setMenuDropdownOpen(false); router.push("/profile"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-text-primary hover:bg-muted text-left transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              View Profile
            </button>
            <button
              onClick={() => { setMenuDropdownOpen(false); router.push("/settings"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-text-primary hover:bg-muted text-left transition-colors"
            >
              <Cog className="w-3.5 h-3.5" />
              Settings
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => { setMenuDropdownOpen(false); signOut(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 text-left transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Responsive Sidebar Container */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setMenuDropdownOpen(false); }}
        className={cn(
          "fixed top-0 bottom-0 left-0 bg-white border-r z-40 transition-all duration-300 overflow-hidden shadow-xl",
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border",
          // Mobile responsive drawer widths
          mobileMenuOpen ? "translate-x-0 w-[260px]" : "-translate-x-full md:translate-x-0",
          // Tablet collapsed (52px) vs expanded (220px)
          !mobileMenuOpen && (isExpanded ? "w-[220px]" : "w-[52px]")
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
