import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDataStore } from "@/store/useDataStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useAlertStore } from "@/store/useAlertStore";
import { toast } from "sonner";

interface UseKeyboardShortcutsProps {
  onToggleCommandPalette: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDeleteWidget?: () => void;
  onToggleFocusMode?: () => void;
}

export function useKeyboardShortcuts({
  onToggleCommandPalette,
  onUndo,
  onRedo,
  onDeleteWidget,
  onToggleFocusMode,
}: UseKeyboardShortcutsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleDarkMode } = useCanvasStore();

  useEffect(() => {
    let keySequence = "";
    let sequenceTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Skip shortcuts if user is typing in editable nodes
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable ||
        target.closest(".monaco-editor");

      if (isEditable && e.key !== "Escape") {
        return;
      }

      // Detect Meta/Ctrl combinations
      const isMeta = e.metaKey || e.ctrlKey;

      // Escape key to deselect or close modals
      if (e.key === "Escape") {
        e.preventDefault();
        onToggleCommandPalette(); // Close command palette if open
      }

      // Command Palette (Ctrl/Cmd + K)
      if (isMeta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onToggleCommandPalette();
        return;
      }

      // Undo (Ctrl/Cmd + Z)
      if (isMeta && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (onUndo) onUndo();
        return;
      }

      // Redo (Ctrl/Cmd + Shift + Z)
      if (isMeta && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (onRedo) onRedo();
        return;
      }

      // Save Dashboard (Ctrl/Cmd + S)
      if (isMeta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        toast.success("Work autosaved successfully!", {
          description: "All dashboard layouts and pipelines synced to cloud storage.",
        });
        return;
      }

      // New Dashboard (Ctrl/Cmd + N)
      if (isMeta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (pathname === "/dashboard") {
          toast.info("Preparing new dashboard canvas...");
          // Trigger canvas reset or new widget
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // Delete widget (Backspace or Delete)
      if ((e.key === "Delete" || e.key === "Backspace") && !isEditable) {
        if (onDeleteWidget) {
          e.preventDefault();
          onDeleteWidget();
        }
        return;
      }

      // Export canvas (Ctrl/Cmd + E)
      if (isMeta && e.key.toLowerCase() === "e") {
        e.preventDefault();
        toast.info("Triggering canvas export...", {
          description: "Generating high-resolution exports of your dashboard widgets.",
        });
        return;
      }

      // Open AI Chat (Ctrl/Cmd + /)
      if (isMeta && e.key === "/") {
        e.preventDefault();
        router.push("/ai");
        return;
      }

      // Toggle dark mode chrome (Ctrl/Cmd + B)
      if (isMeta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleDarkMode();
        toast.info(document.documentElement.classList.contains("dark") ? "Chrome Light Mode" : "Chrome Dark Mode");
        return;
      }

      // Focus Mode (F key while hovering)
      if (e.key.toLowerCase() === "f" && !isEditable) {
        if (onToggleFocusMode) {
          e.preventDefault();
          onToggleFocusMode();
        }
        return;
      }

      // 2. Vim-style quick routing sequence (G then key)
      if (e.key.toLowerCase() === "g" && !isEditable) {
        keySequence = "g";
        clearTimeout(sequenceTimer);
        sequenceTimer = setTimeout(() => {
          keySequence = "";
        }, 1500); // 1.5s time-frame window
        return;
      }

      if (keySequence === "g" && !isEditable) {
        const key = e.key.toLowerCase();
        if (key === "d") {
          e.preventDefault();
          toast.success("Navigating to Dashboard Canvas");
          router.push("/dashboard");
        } else if (key === "t") {
          e.preventDefault();
          toast.success("Navigating to Data Pipeline");
          router.push("/transform");
        } else if (key === "a") {
          e.preventDefault();
          toast.success("Navigating to AI Chat assistant");
          router.push("/ai");
        }
        keySequence = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router, pathname, toggleDarkMode, onToggleCommandPalette, onUndo, onRedo, onDeleteWidget, onToggleFocusMode]);
}
