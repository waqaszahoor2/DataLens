"use client";

import { useRouter } from "next/navigation";
import { useCanvasStore } from "@/store/useCanvasStore";
import {
  Layers, ArrowRight, Zap, Sparkles, LayoutDashboard, GitBranch, Shield, Globe, Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useCanvasStore();

  const features = [
    {
      icon: Cpu,
      title: "In-Browser Pyodide Engine",
      desc: "Execute actual Python and Pandas code client-side using WebAssembly technology. No servers, zero latency."
    },
    {
      icon: LayoutDashboard,
      title: "Interactive Canvas Grid",
      desc: "Drag and drop responsive charts, KPI cards, and Markdown widgets. Customize themes, gradients, and borders."
    },
    {
      icon: Sparkles,
      title: "AI Analysis Assistants",
      desc: "Instant insight cards, automated data cleaning advisors, and prompt-to-chart generators powered by Claude."
    },
    {
      icon: GitBranch,
      title: "Transform Pipelines",
      desc: "Import, clean, and model datasets sequentially with live step history and automated rules checks."
    },
    {
      icon: Shield,
      title: "Secure Workspace Rooms",
      desc: "Create isolated user profiles and scopes. Secure credentials with NextAuth standard protection."
    },
    {
      icon: Globe,
      title: "Real-Time Collaboration",
      desc: "Sync filters, theme configurations, and layouts with simultaneous cursor highlights and avatar presence."
    }
  ];

  return (
    <div className={cn(
      "min-h-screen font-sans flex flex-col justify-between overflow-x-hidden relative transition-colors duration-300",
      isDarkMode ? "bg-gray-950 text-gray-100" : "bg-surface2 text-text-primary"
    )}>
      {/* Radiant Glowing Background spots */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header navbar */}
      <header className={cn(
        "px-6 py-4 flex items-center justify-between border-b backdrop-blur-md sticky top-0 z-40 transition-colors",
        isDarkMode ? "border-gray-800 bg-gray-950/80" : "border-border/60 bg-white/80"
      )}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow">
            <Layers className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-sm font-extrabold tracking-tight">DataLens Enterprise</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/auth/login")}
            className="px-3.5 py-1.5 border rounded-lg text-xs font-bold hover:bg-muted transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => router.push("/transform")}
            className="px-3.5 py-1.5 bg-brand hover:bg-brand-600 text-white rounded-lg text-xs font-bold shadow transition-all"
          >
            Open Console
          </button>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-grow max-w-5xl mx-auto px-6 py-12 md:py-20 z-10 flex flex-col items-center text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-200 bg-brand-50/50 text-brand text-[10px] font-extrabold uppercase tracking-wider animate-bounce">
          <Zap className="w-3 h-3" />
          Next-Generation BI Platform
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight max-w-3xl">
          Clean, Transform, and Visualize Data{" "}
          <span className="text-transparent bg-clip-text gradient-brand">
            Directly in the Browser
          </span>
        </h1>

        <p className="text-xs md:text-sm text-text-secondary max-w-2xl leading-relaxed">
          Unlock high-performance analytical pipeline tools without a server backend. Stream millions of CSV rows, compile WebAssembly Python operations, and collaborate on real-time canvas boards instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={() => router.push("/transform")}
            className="px-6 py-3.5 bg-brand hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-card-lg flex items-center gap-1.5 transition-all scale-100 active:scale-95"
          >
            Launch Data Pipeline
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3.5 border rounded-xl text-xs font-bold hover:bg-muted transition-all"
          >
            Explore Dashboard Builder
          </button>
        </div>

        {/* Feature grids section */}
        <section className="pt-16 md:pt-24 w-full space-y-6">
          <h2 className="text-xs font-bold text-brand uppercase tracking-widest">
            Enterprise Analytical Matrix
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "p-5 rounded-2xl border text-left flex flex-col justify-between space-y-3 transition-all hover:-translate-y-0.5 hover:shadow-card-md",
                    isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-border/80"
                  )}
                >
                  <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text-primary">{f.title}</h3>
                    <p className="text-[10px] text-text-secondary leading-relaxed mt-1">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer copyright */}
      <footer className={cn(
        "px-6 py-6 border-t text-center text-[10px] text-text-tertiary transition-colors",
        isDarkMode ? "border-gray-800 bg-gray-950" : "border-border/60 bg-white"
      )}>
        <p>© {new Date().getFullYear()} DataLens Corporation. Enterprise WebAssembly Analytics Suite. GDPR Compliant.</p>
      </footer>
    </div>
  );
}
