// store/useDataStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ColumnType = "string" | "number" | "date" | "boolean";

export interface Column {
  name: string;
  type: ColumnType;
  originalName?: string;
}

export type Row = Record<string, string | number | boolean | null>;

export type AggFunction = "sum" | "avg" | "count" | "min" | "max" | "first" | "last";

export interface FilterCondition {
  id: string;
  column: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "not_contains" | "is_null" | "is_not_null";
  value: string;
  connector: "AND" | "OR";
}

export interface SortCondition {
  column: string;
  direction: "asc" | "desc";
}

export interface GroupByConfig {
  columns: string[];
  aggregations: Array<{ column: string; func: AggFunction; alias: string }>;
}

export interface CalculatedColumn {
  name: string;
  formula: string;
}

export interface PivotConfig {
  rows: string[];
  columns: string[];
  values: string[];
  aggregation: AggFunction;
}

export interface MergeConfig {
  type: "inner" | "left" | "right" | "outer";
  key: string;
  rightKey?: string;
  rightData: Row[];
  rightColumns: Column[];
}

export type TransformStep =
  | { id: string; type: "removeDuplicates" }
  | { id: string; type: "dropColumns"; columns: string[] }
  | { id: string; type: "fillNulls"; column: string; method: "mean" | "median" | "mode" | "custom" | "dropRow"; customValue?: string }
  | { id: string; type: "renameColumn"; from: string; to: string }
  | { id: string; type: "changeType"; column: string; toType: ColumnType }
  | { id: string; type: "textOps"; column: string; op: "trim" | "upper" | "lower" | "title" }
  | { id: string; type: "removeOutliers"; column: string }
  | { id: string; type: "filter"; conditions: FilterCondition[] }
  | { id: string; type: "sort"; conditions: SortCondition[] }
  | { id: string; type: "groupBy"; config: GroupByConfig }
  | { id: string; type: "calculatedColumn"; config: CalculatedColumn }
  | { id: string; type: "pivot"; config: PivotConfig }
  | { id: string; type: "merge"; config: MergeConfig }
  | { id: string; type: "unpivot"; idColumns: string[]; valueColumns: string[]; variableName: string; valueName: string }
  | { id: string; type: "dateExtract"; column: string; parts: Array<"year" | "month" | "week" | "day" | "hour"> }
  | { id: string; type: "stringSplit"; column: string; separator: string; newColumns: string[] }
  | { id: string; type: "stringConcat"; columns: string[]; separator: string; newColumn: string }
  | { id: string; type: "regexExtract"; column: string; pattern: string; newColumn: string }
  | { id: string; type: "rollingAvg"; column: string; window: number; newColumn: string }
  | { id: string; type: "cumulativeSum"; column: string; newColumn: string }
  | { id: string; type: "rank"; column: string; newColumn: string; order: "asc" | "desc" };

export type ChartType = "bar" | "stackedBar" | "horizontalBar" | "line" | "area" | "multiLine" | "pie" | "donut" | "scatter" | "heatmap" | "kpi" | "table" | "filter" | "text" | "image";

export interface ConditionalFormatRule {
  id: string;
  column: string;
  operator: ">" | "<" | "=" | "!=" | ">=" | "<=";
  value: string;
  color: string;
  backgroundColor: string;
}

export interface WidgetTransform {
  filters: FilterCondition[];
  groupBy?: GroupByConfig;
  sort?: SortCondition[];
  calculatedColumns?: CalculatedColumn[];
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  subtitle?: string;
  datasetId: string;
  xColumn?: string;
  yColumn?: string;
  colorColumn?: string;
  aggregation?: AggFunction;
  colorTheme?: string;
  customColors?: string[];
  showLegend?: boolean;
  showGridlines?: boolean;
  showLabels?: boolean;
  showTooltips?: boolean;
  showTrendLine?: boolean;
  areaFill?: boolean;
  borderRadius?: number;
  padding?: number;
  backgroundColor?: string;
  conditionalFormats?: ConditionalFormatRule[];
  kpiValue?: string;
  kpiDelta?: string;
  kpiSparkline?: string;
  filterColumn?: string;
  filterType?: "dropdown" | "multiselect" | "daterange" | "slider";
  textContent?: string;
  imageUrl?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  widgetTransform?: WidgetTransform;
  pythonCode?: string;
}

export interface Dataset {
  id: string;
  name: string;
  rawData: Row[];
  columns: Column[];
  pipeline: TransformStep[];
  transformedData: Row[];
  createdAt: string;
}

export interface ColumnMeta {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  nullCount: number;
  uniqueCount: number;
  sample: unknown[];
}

export interface Sheet {
  id: string;
  name: string;
  originalName: string;
  originalCsv: string;
  cleanedCsv: string | null;
  columns: ColumnMeta[];
  rowCount: number;
  pipelineSteps: PipelineStep[];
  linkedTo: SheetLink[];
  version: number;
  lastModified: string | Date;
  data?: Record<string, unknown>[];
}

export interface SheetLink {
  id: string;
  fromSheetId: string;
  fromColumn: string;
  toSheetId: string;
  toColumn: string;
  joinType: "inner" | "left" | "right" | "outer";
  name: string;
}

export interface PipelineStep {
  id: string;
  name: string;
  code: string;
  order: number;
  status: "success" | "error" | "pending";
  output: string | null;
}

export interface LinkedDataset {
  id: string;
  name: string;
  data: Record<string, unknown>[];
  columns: ColumnMeta[];
  rowCount: number;
}

export type ActiveFilters = Record<string, (string | number | boolean | null)[]>;

interface DataState {
  // Original Datasets compatibility aliases
  datasets: Dataset[];
  activeDatasetId: string | null;
  activeFilters: ActiveFilters;
  pipelineStep: number;
  charts: ChartConfig[];
  selectedChartId: string | null;

  // New Multi-sheet system state
  sheets: Sheet[];
  activeSheetId: string | null;
  links: SheetLink[];
  linkedDatasets: LinkedDataset[];

  // Actions
  addDataset: (dataset: Dataset) => void;
  updateDataset: (id: string, updates: Partial<Dataset>) => void;
  removeDataset: (id: string) => void;
  setActiveDataset: (id: string) => void;
  getActiveDataset: () => Dataset | null;

  setPipelineStep: (step: number) => void;
  addTransformStep: (datasetId: string, step: TransformStep) => void;
  removeTransformStep: (datasetId: string, stepId: string) => void;
  clearPipeline: (datasetId: string) => void;

  addChart: (chart: ChartConfig) => void;
  updateChart: (id: string, updates: Partial<ChartConfig>) => void;
  removeChart: (id: string) => void;
  setSelectedChart: (id: string | null) => void;

  toggleFilter: (column: string, value: string | number | boolean | null) => void;
  clearAllFilters: () => void;
  clearSession: () => void;

  // New Multi-sheet Actions
  addSheets: (sheets: Sheet[]) => void;
  updateSheet: (id: string, updates: Partial<Sheet>) => void;
  removeSheet: (id: string) => void;
  setActiveSheet: (id: string) => void;
  addLink: (link: SheetLink) => void;
  removeLink: (id: string) => void;
  addLinkedDataset: (dataset: LinkedDataset) => void;

  // Getters
  getActiveSheet: () => Sheet | null;
  getSheetById: (id: string) => Sheet | null;
  getAllColumns: () => Record<string, ColumnMeta[]>;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      datasets: [],
      activeDatasetId: null,
      activeFilters: {},
      pipelineStep: 0,
      charts: [],
      selectedChartId: null,

      sheets: [],
      activeSheetId: null,
      links: [],
      linkedDatasets: [],

      addDataset: (dataset) =>
        set((s) => ({
          datasets: [...s.datasets, dataset],
          activeDatasetId: dataset.id,
        })),

      updateDataset: (id, updates) =>
        set((s) => ({
          datasets: s.datasets.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      removeDataset: (id) =>
        set((s) => ({
          datasets: s.datasets.filter((d) => d.id !== id),
          activeDatasetId: s.activeDatasetId === id ? (s.datasets[0]?.id ?? null) : s.activeDatasetId,
        })),

      setActiveDataset: (id) => set({ activeDatasetId: id }),

      getActiveDataset: () => {
        const { datasets, activeDatasetId } = get();
        return datasets.find((d) => d.id === activeDatasetId) ?? null;
      },

      setPipelineStep: (step) => set({ pipelineStep: step }),

      addTransformStep: (datasetId, step) =>
        set((s) => ({
          datasets: s.datasets.map((d) =>
            d.id === datasetId ? { ...d, pipeline: [...d.pipeline, step] } : d
          ),
        })),

      removeTransformStep: (datasetId, stepId) =>
        set((s) => ({
          datasets: s.datasets.map((d) =>
            d.id === datasetId
              ? { ...d, pipeline: d.pipeline.filter((p) => p.id !== stepId) }
              : d
          ),
        })),

      clearPipeline: (datasetId) =>
        set((s) => ({
          datasets: s.datasets.map((d) =>
            d.id === datasetId ? { ...d, pipeline: [], transformedData: d.rawData } : d
          ),
        })),

      addChart: (chart) =>
        set((s) => ({ charts: [...s.charts, chart] })),

      updateChart: (id, updates) =>
        set((s) => ({
          charts: s.charts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      removeChart: (id) =>
        set((s) => ({
          charts: s.charts.filter((c) => c.id !== id),
          selectedChartId: s.selectedChartId === id ? null : s.selectedChartId,
        })),

      setSelectedChart: (id) => set({ selectedChartId: id }),

      toggleFilter: (column, value) =>
        set((s) => {
          const current = s.activeFilters[column] ?? [];
          const exists = current.some((v) => v === value);
          if (exists) {
            const next = current.filter((v) => v !== value);
            const filters = { ...s.activeFilters };
            if (next.length === 0) {
              delete filters[column];
            } else {
              filters[column] = next;
            }
            return { activeFilters: filters };
          }
          return { activeFilters: { ...s.activeFilters, [column]: [...current, value] } };
        }),

      clearAllFilters: () => set({ activeFilters: {} }),

      clearSession: () =>
        set({
          datasets: [],
          activeDatasetId: null,
          activeFilters: {},
          pipelineStep: 0,
          charts: [],
          selectedChartId: null,
          sheets: [],
          activeSheetId: null,
          links: [],
          linkedDatasets: [],
        }),

      // New Multi-sheet system actions
      addSheets: (newSheets) =>
        set((state) => {
          // Compatibility map sheets to datasets
          const mappedDatasets: Dataset[] = newSheets.map((sheet) => ({
            id: sheet.id,
            name: sheet.name,
            rawData: (sheet.data || []) as Row[],
            columns: sheet.columns.map((c) => ({
              name: c.name,
              type: c.type as ColumnType,
            })),
            pipeline: [],
            transformedData: (sheet.data || []) as Row[],
            createdAt: new Date().toISOString(),
          }));

          return {
            sheets: [...state.sheets, ...newSheets],
            activeSheetId: newSheets[0]?.id ?? state.activeSheetId,
            datasets: [...state.datasets, ...mappedDatasets],
            activeDatasetId: mappedDatasets[0]?.id ?? state.activeDatasetId,
          };
        }),

      updateSheet: (id, updates) =>
        set((state) => ({
          sheets: state.sheets.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      removeSheet: (id) =>
        set((state) => ({
          sheets: state.sheets.filter((s) => s.id !== id),
          activeSheetId: state.activeSheetId === id ? (state.sheets[0]?.id ?? null) : state.activeSheetId,
          links: state.links.filter((l) => l.fromSheetId !== id && l.toSheetId !== id),
          datasets: state.datasets.filter((d) => d.id !== id),
          activeDatasetId: state.activeDatasetId === id ? (state.datasets[0]?.id ?? null) : state.activeDatasetId,
        })),

      setActiveSheet: (id) => set({ activeSheetId: id, activeDatasetId: id }),

      addLink: (link) =>
        set((state) => ({ links: [...state.links, link] })),

      removeLink: (id) =>
        set((state) => ({
          links: state.links.filter((l) => l.id !== id),
        })),

      addLinkedDataset: (dataset) =>
        set((state) => {
          // Map to compatibility datasets as well
          const compatibilityDataset: Dataset = {
            id: dataset.id,
            name: dataset.name,
            rawData: dataset.data as Row[],
            columns: dataset.columns.map((c) => ({
              name: c.name,
              type: c.type as ColumnType,
            })),
            pipeline: [],
            transformedData: dataset.data as Row[],
            createdAt: new Date().toISOString(),
          };

          return {
            linkedDatasets: [...state.linkedDatasets, dataset],
            datasets: [...state.datasets, compatibilityDataset],
            activeDatasetId: dataset.id,
          };
        }),

      getActiveSheet: () => {
        const { sheets, activeSheetId } = get();
        return sheets.find((s) => s.id === activeSheetId) ?? null;
      },

      getSheetById: (id) => {
        return get().sheets.find((s) => s.id === id) ?? null;
      },

      getAllColumns: () => {
        return get().sheets.reduce((acc, sheet) => {
          acc[sheet.name] = sheet.columns;
          return acc;
        }, {} as Record<string, ColumnMeta[]>);
      },
    }),
    {
      name: "datalens-data",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        datasets: s.datasets,
        activeDatasetId: s.activeDatasetId,
        pipelineStep: s.pipelineStep,
        charts: s.charts,
        sheets: s.sheets,
        activeSheetId: s.activeSheetId,
        links: s.links,
        linkedDatasets: s.linkedDatasets,
      }),
    }
  )
);
