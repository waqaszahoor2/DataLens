// lib/crossFilter.ts
import type { Row, ActiveFilters } from "@/store/useDataStore";

/**
 * Apply active cross-filters to a dataset.
 * All conditions use AND logic (each column must match).
 */
export function applyCrossFilters(data: Row[], filters: ActiveFilters): Row[] {
  const entries = Object.entries(filters);
  if (!entries.length) return data;

  return data.filter((row) => {
    for (const [column, values] of entries) {
      if (!values.length) continue;
      const cellVal = row[column];
      if (!values.some((v) => String(v) === String(cellVal))) return false;
    }
    return true;
  });
}

/**
 * Get filter opacity for a specific value in cross-filter context.
 * Returns 1 if the value is in the active filter (or no filters), 0.3 if dimmed.
 */
export function getFilterOpacity(
  column: string,
  value: string | number | boolean | null,
  filters: ActiveFilters
): number {
  const colFilter = filters[column];
  if (!colFilter || !colFilter.length) return 1;
  return colFilter.some((v) => String(v) === String(value)) ? 1 : 0.3;
}

/**
 * Check if any filters are active.
 */
export function hasActiveFilters(filters: ActiveFilters): boolean {
  return Object.values(filters).some((v) => v.length > 0);
}

/**
 * Count total active filter conditions.
 */
export function countActiveFilters(filters: ActiveFilters): number {
  return Object.values(filters).reduce((acc, v) => acc + v.length, 0);
}

/**
 * Check if a specific chart/widget is affected by current cross-filters
 * (i.e., the filters reference columns that exist in the chart's dataset).
 */
export function isChartAffected(
  chartColumns: string[],
  filters: ActiveFilters
): boolean {
  const filterCols = Object.keys(filters).filter((c) => filters[c].length > 0);
  return filterCols.some((col) => chartColumns.includes(col));
}
