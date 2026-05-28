import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColumnType = "number" | "string" | "date" | "boolean";

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  nullCount: number;
  uniqueCount: number;
  sample?: (string | number | boolean | null)[];
}

export type Row = Record<string, string | number | boolean | null>;

export type FilterOperator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "is null" | "is not null";
export type AggFunction = "sum" | "mean" | "count" | "min" | "max" | "std" | "first" | "last";
export type FillMethod = "constant" | "mean" | "median" | "forward_fill" | "backward_fill";
export type NormalizeMethod = "min-max" | "z-score";
export type JoinType = "inner" | "left" | "right" | "full";
export type SortOrder = "asc" | "desc";
export type CastType = "string" | "number" | "date" | "boolean";

export type TransformType =
  | "filter"
  | "select"
  | "rename"
  | "cast"
  | "computed"
  | "sort"
  | "groupby"
  | "pivot"
  | "join"
  | "fill_nulls"
  | "normalize"
  | "deduplicate";

export interface FilterTransform {
  type: "filter";
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface SelectTransform {
  type: "select";
  columns: string[];
  mode: "keep" | "drop";
}

export interface RenameTransform {
  type: "rename";
  oldName: string;
  newName: string;
}

export interface CastTransform {
  type: "cast";
  column: string;
  targetType: CastType;
}

export interface ComputedTransform {
  type: "computed";
  name: string;
  expression: string;
}

export interface SortTransform {
  type: "sort";
  column: string;
  order: SortOrder;
}

export interface GroupByTransform {
  type: "groupby";
  groupColumns: string[];
  aggregations: { column: string; func: AggFunction; alias?: string }[];
}

export interface PivotTransform {
  type: "pivot";
  indexColumns: string[];
  pivotColumn: string;
  valueColumn: string;
  aggFunc: AggFunction;
}

export interface JoinTransform {
  type: "join";
  rightDatasetId: string;
  joinType: JoinType;
  leftKey: string;
  rightKey: string;
}

export interface FillNullsTransform {
  type: "fill_nulls";
  column: string;
  method: FillMethod;
  value?: string | number;
}

export interface NormalizeTransform {
  type: "normalize";
  column: string;
  method: NormalizeMethod;
}

export interface DeduplicateTransform {
  type: "deduplicate";
  columns?: string[];
}

export type Transform =
  | FilterTransform
  | SelectTransform
  | RenameTransform
  | CastTransform
  | ComputedTransform
  | SortTransform
  | GroupByTransform
  | PivotTransform
  | JoinTransform
  | FillNullsTransform
  | NormalizeTransform
  | DeduplicateTransform;

export interface PipelineStep {
  id: string;
  transform: Transform;
  enabled: boolean;
  label?: string;
}

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  pipeline: PipelineStep[];
  rowCount: number;
}

export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "scatter"
  | "pie"
  | "donut"
  | "heatmap"
  | "histogram"
  | "box"
  | "treemap"
  | "funnel"
  | "geo";

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xColumn?: string;
  yColumn?: string;
  colorColumn?: string;
  aggregation?: AggFunction;
  customCode?: string;
  layout: { x: number; y: number; w: number; h: number };
  dataSource?: "main" | "query";
  queryResult?: Row[];
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  code?: string;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface DataLensState {
  // Data
  rawData: Row[];
  columns: ColumnMeta[];
  pipeline: PipelineStep[];
  transformedData: Row[];
  snapshots: Snapshot[];

  // Charts
  charts: ChartConfig[];
  canvasBg: string;

  // Query
  queryHistory: string[];
  lastQueryResult: Row[] | null;

  // AI
  aiMessages: AIMessage[];

  // UI
  isTransformDrawerOpen: boolean;

  // Actions
  setRawData: (data: Row[], columns: ColumnMeta[]) => void;
  setPipeline: (pipeline: PipelineStep[]) => void;
  addPipelineStep: (step: PipelineStep) => void;
  updatePipelineStep: (id: string, step: Partial<PipelineStep>) => void;
  removePipelineStep: (id: string) => void;
  togglePipelineStep: (id: string) => void;
  setTransformedData: (data: Row[]) => void;
  saveSnapshot: (name: string) => void;
  restoreSnapshot: (id: string) => void;

  addChart: (chart: ChartConfig) => void;
  updateChart: (id: string, updates: Partial<ChartConfig>) => void;
  removeChart: (id: string) => void;
  setCanvasBg: (color: string) => void;

  addQueryHistory: (query: string) => void;
  setLastQueryResult: (result: Row[] | null) => void;

  addAIMessage: (message: AIMessage) => void;
  clearAIMessages: () => void;

  setTransformDrawerOpen: (open: boolean) => void;

  clearSession: () => void;
}

const initialState = {
  rawData: [],
  columns: [],
  pipeline: [],
  transformedData: [],
  snapshots: [],
  charts: [],
  canvasBg: "#FFFFFF",
  queryHistory: [],
  lastQueryResult: null,
  aiMessages: [],
  isTransformDrawerOpen: false,
};

export const useStore = create<DataLensState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setRawData: (data, columns) =>
        set({ rawData: data, columns, transformedData: data }),

      setPipeline: (pipeline) => set({ pipeline }),

      addPipelineStep: (step) =>
        set((s) => ({ pipeline: [...s.pipeline, step] })),

      updatePipelineStep: (id, updates) =>
        set((s) => ({
          pipeline: s.pipeline.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      removePipelineStep: (id) =>
        set((s) => ({ pipeline: s.pipeline.filter((p) => p.id !== id) })),

      togglePipelineStep: (id) =>
        set((s) => ({
          pipeline: s.pipeline.map((p) =>
            p.id === id ? { ...p, enabled: !p.enabled } : p
          ),
        })),

      setTransformedData: (data) => set({ transformedData: data }),

      saveSnapshot: (name) => {
        const { pipeline, transformedData } = get();
        const snapshot: Snapshot = {
          id: `snap_${Date.now()}`,
          name,
          timestamp: Date.now(),
          pipeline: [...pipeline],
          rowCount: transformedData.length,
        };
        set((s) => ({ snapshots: [...s.snapshots, snapshot] }));
      },

      restoreSnapshot: (id) => {
        const snapshot = get().snapshots.find((s) => s.id === id);
        if (snapshot) {
          set({ pipeline: snapshot.pipeline });
        }
      },

      addChart: (chart) =>
        set((s) => ({ charts: [...s.charts, chart] })),

      updateChart: (id, updates) =>
        set((s) => ({
          charts: s.charts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      removeChart: (id) =>
        set((s) => ({ charts: s.charts.filter((c) => c.id !== id) })),

      setCanvasBg: (color) => set({ canvasBg: color }),

      addQueryHistory: (query) =>
        set((s) => ({
          queryHistory: [query, ...s.queryHistory].slice(0, 20),
        })),

      setLastQueryResult: (result) => set({ lastQueryResult: result }),

      addAIMessage: (message) =>
        set((s) => ({ aiMessages: [...s.aiMessages, message] })),

      clearAIMessages: () => set({ aiMessages: [] }),

      setTransformDrawerOpen: (open) => set({ isTransformDrawerOpen: open }),

      clearSession: () => set(initialState),
    }),
    {
      name: "datalens-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        rawData: state.rawData,
        columns: state.columns,
        pipeline: state.pipeline,
        transformedData: state.transformedData,
        charts: state.charts,
        canvasBg: state.canvasBg,
        snapshots: state.snapshots,
        queryHistory: state.queryHistory,
        aiMessages: state.aiMessages,
      }),
    }
  )
);
