import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  avatar: string;
  cursor?: { x: number; y: number };
  activeWidgetId?: string;
}

export function useCollaboration(dashboardId: string) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [myCursor, setMyCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Simulate collaborative mock users joining after some time to demonstrate Feature 11
    const timer1 = setTimeout(() => {
      const newUser: Collaborator = {
        id: "collab-1",
        name: "Sarah Chen",
        color: "#DC2626", // Red border highlight
        avatar: "SC",
        cursor: { x: 300, y: 400 },
      };
      setCollaborators((prev) => [...prev, newUser]);
    }, 8000);

    const timer2 = setTimeout(() => {
      const newUser: Collaborator = {
        id: "collab-2",
        name: "Marcus Aurelius",
        color: "#3B82F6", // Blue border
        avatar: "MA",
        cursor: { x: 600, y: 350 },
        activeWidgetId: "widget-kpi-1", // Highlight widget
      };
      setCollaborators((prev) => [...prev, newUser]);
    }, 18000);

    // 2. Simulate cursor movement for collaborators to make the page feel completely alive
    const interval = setInterval(() => {
      setCollaborators((prev) =>
        prev.map((c) => {
          if (!c.cursor) return c;
          const dx = (Math.random() - 0.5) * 30;
          const dy = (Math.random() - 0.5) * 30;
          return {
            ...c,
            cursor: {
              x: Math.max(100, Math.min(window.innerWidth - 200, c.cursor.x + dx)),
              y: Math.max(100, Math.min(window.innerHeight - 200, c.cursor.y + dy)),
            },
          };
        })
      );
    }, 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearInterval(interval);
    };
  }, [dashboardId]);

  // Handle local user cursor track broadcast
  const handleMouseMove = (e: React.MouseEvent) => {
    setMyCursor({ x: e.clientX, y: e.clientY });
  };

  const handleWidgetEdit = (widgetId: string | null) => {
    setActiveWidgetId(widgetId);
  };

  return {
    collaborators,
    myCursor,
    activeWidgetId,
    handleMouseMove,
    handleWidgetEdit,
  };
}
