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
    // Simulated mock collaboration removed to keep workspace clean
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
