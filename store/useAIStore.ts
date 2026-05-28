// store/useAIStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  codeBlocks?: string[];
  chartAction?: {
    type: string;
    x?: string;
    y?: string;
    color?: string;
    title?: string;
    aggregation?: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

interface AIState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isStreaming: boolean;
  selectedChartId: string | null;

  // Actions
  createSession: () => string;
  setActiveSession: (id: string) => void;
  addMessage: (sessionId: string, message: AIMessage) => void;
  updateLastMessage: (sessionId: string, content: string) => void;
  deleteSession: (id: string) => void;
  setStreaming: (val: boolean) => void;
  setSelectedChartForAI: (id: string | null) => void;
  getActiveSession: () => ChatSession | null;
  clearAllSessions: () => void;
}

const makeSession = (): ChatSession => ({
  id: `session_${Date.now()}`,
  title: "New Chat",
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isStreaming: false,
      selectedChartId: null,

      createSession: () => {
        const session = makeSession();
        set((s) => ({
          sessions: [session, ...s.sessions],
          activeSessionId: session.id,
        }));
        return session.id;
      },

      setActiveSession: (id) => set({ activeSessionId: id }),

      addMessage: (sessionId, message) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: [...sess.messages, message],
                  updatedAt: new Date().toISOString(),
                  title:
                    sess.messages.length === 0 && message.role === "user"
                      ? message.content.slice(0, 40)
                      : sess.title,
                }
              : sess
          ),
        })),

      updateLastMessage: (sessionId, content) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: sess.messages.map((m, i) =>
                    i === sess.messages.length - 1 ? { ...m, content } : m
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : sess
          ),
        })),

      deleteSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== id),
          activeSessionId: s.activeSessionId === id ? (s.sessions[0]?.id ?? null) : s.activeSessionId,
        })),

      setStreaming: (val) => set({ isStreaming: val }),

      setSelectedChartForAI: (id) => set({ selectedChartId: id }),

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId) ?? null;
      },

      clearAllSessions: () => set({ sessions: [], activeSessionId: null }),
    }),
    {
      name: "datalens-ai",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ sessions: s.sessions, activeSessionId: s.activeSessionId }),
    }
  )
);
