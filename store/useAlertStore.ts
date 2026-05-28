import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId } from "@/lib/utils";
import { toast } from "sonner";

export interface AlertRule {
  id: string;
  datasetId: string;
  column: string;
  operator: "less_than" | "greater_than" | "equals" | "contains" | "anomaly_detected" | "null_count_exceeds";
  threshold: number | string;
  channels: ("email" | "in_app")[];
  cooldown: string; // "1h", "6h", "24h"
  lastTriggered?: string;
  isActive: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info" | "ai";
  timestamp: string;
  isRead: boolean;
  datasetName?: string;
  routeLink?: string;
}

interface AlertState {
  rules: AlertRule[];
  notifications: AppNotification[];
  addRule: (rule: Omit<AlertRule, "id" | "isActive">) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  addNotification: (notif: Omit<AppNotification, "id" | "timestamp" | "isRead">) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAllNotifications: () => void;
  evaluateAlertRules: (datasetId: string, datasetName: string, data: any[]) => void;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      rules: [],
      notifications: [
        {
          id: "welcome-notif",
          title: "Welcome to DataLens v2",
          message: "Real-time AI and Python capabilities are fully loaded. Drag and drop widgets to begin!",
          type: "ai",
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          isRead: false,
        }
      ],
      addRule: (rule) => set((state) => ({
        rules: [...state.rules, { ...rule, id: generateId(), isActive: true }]
      })),
      deleteRule: (id) => set((state) => ({
        rules: state.rules.filter((r) => r.id !== id)
      })),
      toggleRule: (id) => set((state) => ({
        rules: state.rules.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r)
      })),
      addNotification: (notif) => set((state) => {
        const newNotif = {
          ...notif,
          id: generateId(),
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        toast(newNotif.title, {
          description: newNotif.message,
        });
        return {
          notifications: [newNotif, ...state.notifications],
        };
      }),
      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n)
      })),
      markAllRead: () => set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true }))
      })),
      clearAllNotifications: () => set({ notifications: [] }),
      evaluateAlertRules: (datasetId, datasetName, data) => {
        const { rules, addNotification } = get();
        if (!data || data.length === 0) return;

        const activeRules = rules.filter((r) => r.datasetId === datasetId && r.isActive);

        activeRules.forEach((rule) => {
          // Check cooldown logic (mocked here or verified)
          if (rule.lastTriggered) {
            const lastTime = new Date(rule.lastTriggered).getTime();
            const cooldownMs = rule.cooldown === "1h" ? 3600000 : rule.cooldown === "6h" ? 21600000 : 86400000;
            if (Date.now() - lastTime < cooldownMs) return;
          }

          let triggered = false;
          let message = "";

          // 1. null_count_exceeds rule
          if (rule.operator === "null_count_exceeds") {
            const nullCount = data.filter((row) => row[rule.column] === null || row[rule.column] === "").length;
            const percentage = nullCount / data.length;
            const thresholdValue = Number(rule.threshold) / 100;
            if (percentage > thresholdValue) {
              triggered = true;
              message = `Null ratio in column '${rule.column}' is ${(percentage * 100).toFixed(1)}% (exceeds ${rule.threshold}% threshold).`;
            }
          }
          // 2. less_than / greater_than values
          else if (rule.column && rule.column in data[0]) {
            const numericValues = data.map((row) => Number(row[rule.column])).filter((val) => !isNaN(val));
            if (numericValues.length > 0) {
              if (rule.operator === "less_than") {
                const min = Math.min(...numericValues);
                if (min < Number(rule.threshold)) {
                  triggered = true;
                  message = `Column '${rule.column}' dropped to a minimum value of ${min} (below threshold limit of ${rule.threshold}).`;
                }
              } else if (rule.operator === "greater_than") {
                const max = Math.max(...numericValues);
                if (max > Number(rule.threshold)) {
                  triggered = true;
                  message = `Column '${rule.column}' surged to a maximum value of ${max} (exceeded threshold cap of ${rule.threshold}).`;
                }
              }
            }
          }

          if (triggered) {
            // Update lastTriggered timestamp
            set((state) => ({
              rules: state.rules.map((r) => r.id === rule.id ? { ...r, lastTriggered: new Date().toISOString() } : r)
            }));

            // Dispatch alert notification
            addNotification({
              title: `Alert Triggered: ${rule.column}`,
              message,
              type: "warning",
              datasetName,
              routeLink: "/transform",
            });
          }
        });
      },
    }),
    {
      name: "datalens-alerts",
    }
  )
);
