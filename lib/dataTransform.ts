// lib/dataTransform.ts
import type { Row, TransformStep, Column, ColumnType, FilterCondition } from "@/store/useDataStore";

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mode(vals: (string | number | boolean | null)[]): string | number | boolean | null {
  const freq: Map<string, number> = new Map();
  for (const v of vals) {
    const k = String(v);
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  freq.forEach((count, key) => {
    if (count > bestCount) { bestCount = count; best = key; }
  });
  return best;
}

function iqrBounds(nums: number[]): { lower: number; upper: number } {
  const sorted = [...nums].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return { lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr };
}

function aggregate(values: (string | number | boolean | null)[], func: string): number | string | null {
  const nums = values.map(toNum);
  switch (func) {
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "avg": return mean(nums);
    case "count": return values.length;
    case "min": return Math.min(...nums);
    case "max": return Math.max(...nums);
    case "first": {
      const v = values[0];
      if (v === null || v === undefined) return null;
      return typeof v === "boolean" ? Number(v) : v;
    }
    case "last": {
      const v = values[values.length - 1];
      if (v === null || v === undefined) return null;
      return typeof v === "boolean" ? Number(v) : v;
    }
    default: return null;
  }
}

function matchesFilter(row: Row, cond: FilterCondition): boolean {
  const val = row[cond.column];
  const v = String(val ?? "").toLowerCase();
  const target = cond.value.toLowerCase();
  switch (cond.operator) {
    case "=": return String(val) === cond.value;
    case "!=": return String(val) !== cond.value;
    case ">": return toNum(val) > toNum(cond.value);
    case "<": return toNum(val) < toNum(cond.value);
    case ">=": return toNum(val) >= toNum(cond.value);
    case "<=": return toNum(val) <= toNum(cond.value);
    case "contains": return v.includes(target);
    case "not_contains": return !v.includes(target);
    case "is_null": return val === null || val === undefined || val === "";
    case "is_not_null": return val !== null && val !== undefined && val !== "";
    default: return true;
  }
}

function evalFormula(formula: string, row: Row): number | string | null {
  try {
    // Replace column names with their values
    let expr = formula;
    for (const [col, val] of Object.entries(row)) {
      expr = expr.replace(new RegExp(`\\b${col}\\b`, "g"), String(val ?? 0));
    }
    // Handle date_diff function
    expr = expr.replace(/date_diff\(([^,]+),\s*([^)]+)\)/g, (_, a, b) => {
      const da = new Date(a.trim());
      const db = new Date(b.trim());
      return String(Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24)));
    });
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${expr})`)();
    return typeof result === "number" || typeof result === "string" ? result : null;
  } catch {
    return null;
  }
}

export function applyTransformStep(data: Row[], step: TransformStep): Row[] {
  switch (step.type) {
    case "removeDuplicates": {
      const seen = new Set<string>();
      return data.filter((row) => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    case "dropColumns":
      return data.map((row) => {
        const newRow = { ...row };
        for (const col of step.columns) delete newRow[col];
        return newRow;
      });

    case "fillNulls": {
      const { column, method, customValue } = step;
      const nums = data.map((r) => r[column]).filter((v) => v !== null && v !== "" && !isNaN(Number(v))).map(toNum);
      let fillVal: string | number | boolean | null = null;
      if (method === "mean") fillVal = mean(nums);
      else if (method === "median") fillVal = median(nums);
      else if (method === "mode") fillVal = mode(data.map((r) => r[column]));
      else if (method === "custom") fillVal = customValue ?? "";
      else if (method === "dropRow") {
        return data.filter((r) => r[column] !== null && r[column] !== "" && r[column] !== undefined);
      }
      return data.map((r) => (r[column] === null || r[column] === "" ? { ...r, [column]: fillVal } : r));
    }

    case "renameColumn":
      return data.map((row) => {
        const newRow = { ...row };
        newRow[step.to] = newRow[step.from];
        delete newRow[step.from];
        return newRow;
      });

    case "changeType":
      return data.map((row) => {
        let v = row[step.column];
        if (step.toType === "number") v = isNaN(Number(v)) ? null : Number(v);
        else if (step.toType === "string") v = String(v ?? "");
        else if (step.toType === "boolean") v = Boolean(v);
        else if (step.toType === "date") {
          const d = new Date(String(v));
          v = isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
        }
        return { ...row, [step.column]: v };
      });

    case "textOps":
      return data.map((row) => {
        const v = String(row[step.column] ?? "");
        let result = v;
        if (step.op === "trim") result = v.trim();
        else if (step.op === "upper") result = v.toUpperCase();
        else if (step.op === "lower") result = v.toLowerCase();
        else if (step.op === "title") result = v.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
        return { ...row, [step.column]: result };
      });

    case "removeOutliers": {
      const nums = data.map((r) => toNum(r[step.column]));
      const { lower, upper } = iqrBounds(nums);
      return data.filter((r) => { const n = toNum(r[step.column]); return n >= lower && n <= upper; });
    }

    case "filter": {
      const { conditions } = step;
      return data.filter((row) => {
        if (!conditions.length) return true;
        let result = matchesFilter(row, conditions[0]);
        for (let i = 1; i < conditions.length; i++) {
          const c = conditions[i];
          if (c.connector === "AND") result = result && matchesFilter(row, c);
          else result = result || matchesFilter(row, c);
        }
        return result;
      });
    }

    case "sort": {
      const { conditions } = step;
      return [...data].sort((a, b) => {
        for (const c of conditions) {
          const av = a[c.column];
          const bv = b[c.column];
          const na = toNum(av);
          const nb = toNum(bv);
          const cmp = isNaN(na) || isNaN(nb) ? String(av ?? "").localeCompare(String(bv ?? "")) : na - nb;
          if (cmp !== 0) return c.direction === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    }

    case "groupBy": {
      const { columns: groupColumns, aggregations } = step.config;
      const groups = new Map<string, Row[]>();
      for (const row of data) {
        const key = (groupColumns || []).map((c) => String(row[c] ?? "")).join("|||");
        const existing = groups.get(key) ?? [];
        existing.push(row);
        groups.set(key, existing);
      }
      const result: Row[] = [];
      Array.from(groups.entries()).forEach(([key, rows]) => {
        const keyParts = key.split("|||");
        const newRow: Row = {};
        (groupColumns || []).forEach((col, i) => { newRow[col] = keyParts[i]; });
        for (const agg of aggregations) {
          const vals = rows.map((r) => r[agg.column]);
          newRow[agg.alias || `${agg.func}_${agg.column}`] = aggregate(vals, agg.func);
        }
        result.push(newRow);
      });
      return result;
    }

    case "calculatedColumn": {
      const { name, formula } = step.config;
      return data.map((row) => ({ ...row, [name]: evalFormula(formula, row) }));
    }

    case "pivot": {
      const { rows, columns, values, aggregation } = step.config;
      const rowGroups = new Map<string, Row[]>();
      for (const row of data) {
        const key = (rows || []).map((r) => String(row[r] ?? "")).join("|||");
        const existing = rowGroups.get(key) ?? [];
        existing.push(row);
        rowGroups.set(key, existing);
      }
      const colVals = Array.from(new Set(data.map((r) => String(r[columns[0]] ?? ""))));
      const result: Row[] = [];
      Array.from(rowGroups.entries()).forEach(([key, rowData]) => {
        const keyParts = key.split("|||");
        const newRow: Row = {};
        (rows || []).forEach((r, i) => { newRow[r] = keyParts[i]; });
        for (const colVal of colVals) {
          const matching = rowData.filter((r) => String(r[columns[0]]) === colVal);
          const vals = matching.map((r) => r[values[0]]);
          newRow[colVal] = aggregate(vals, aggregation);
        }
        result.push(newRow);
      });
      return result;
    }

    case "merge": {
      const { type, key, rightKey, rightData } = step.config;
      const rk = rightKey || key;
      const rightMap = new Map<string, Row[]>();
      for (const r of rightData) {
        const k = String(r[rk] ?? "");
        const existing = rightMap.get(k) ?? [];
        existing.push(r);
        rightMap.set(k, existing);
      }
      const result: Row[] = [];
      if (type === "inner" || type === "left") {
        for (const row of data) {
          const k = String(row[key] ?? "");
          const matches = rightMap.get(k) ?? [];
          if (matches.length > 0) {
            for (const m of matches) result.push({ ...row, ...m });
          } else if (type === "left") {
            result.push(row);
          }
        }
      } else if (type === "right") {
        const leftMap = new Map<string, Row[]>();
        for (const r of data) {
          const k = String(r[key] ?? "");
          const existing = leftMap.get(k) ?? [];
          existing.push(r);
          leftMap.set(k, existing);
        }
        for (const rRow of rightData) {
          const k = String(rRow[rk] ?? "");
          const matches = leftMap.get(k) ?? [];
          if (matches.length > 0) {
            for (const m of matches) result.push({ ...m, ...rRow });
          } else {
            result.push(rRow);
          }
        }
      } else { // outer
        const matched = new Set<string>();
        for (const row of data) {
          const k = String(row[key] ?? "");
          const matches = rightMap.get(k) ?? [];
          if (matches.length > 0) {
            for (const m of matches) { result.push({ ...row, ...m }); matched.add(k); }
          } else {
            result.push(row);
          }
        }
        for (const rRow of rightData) {
          const k = String(rRow[rk] ?? "");
          if (!matched.has(k)) result.push(rRow);
        }
      }
      return result;
    }

    case "unpivot": {
      const { idColumns, valueColumns, variableName, valueName } = step;
      const result: Row[] = [];
      for (const row of data) {
        for (const col of valueColumns) {
          const newRow: Row = {};
          for (const id of idColumns) newRow[id] = row[id];
          newRow[variableName] = col;
          newRow[valueName] = row[col];
          result.push(newRow);
        }
      }
      return result;
    }

    case "dateExtract": {
      const { column, parts } = step;
      return data.map((row) => {
        const d = new Date(String(row[column] ?? ""));
        const newRow = { ...row };
        if (isNaN(d.getTime())) return newRow;
        if (parts.includes("year")) newRow[`${column}_year`] = d.getFullYear();
        if (parts.includes("month")) newRow[`${column}_month`] = d.getMonth() + 1;
        if (parts.includes("week")) newRow[`${column}_week`] = Math.ceil(d.getDate() / 7);
        if (parts.includes("day")) newRow[`${column}_day`] = d.getDate();
        if (parts.includes("hour")) newRow[`${column}_hour`] = d.getHours();
        return newRow;
      });
    }

    case "stringSplit": {
      const { column, separator, newColumns } = step;
      return data.map((row) => {
        const parts = String(row[column] ?? "").split(separator);
        const newRow = { ...row };
        newColumns.forEach((col, i) => { newRow[col] = parts[i] ?? ""; });
        return newRow;
      });
    }

    case "stringConcat": {
      const { columns, separator, newColumn } = step;
      return data.map((row) => ({
        ...row,
        [newColumn]: columns.map((c) => String(row[c] ?? "")).join(separator),
      }));
    }

    case "regexExtract": {
      const { column, pattern, newColumn } = step;
      return data.map((row) => {
        const match = String(row[column] ?? "").match(new RegExp(pattern));
        return { ...row, [newColumn]: match ? match[0] : null };
      });
    }

    case "rollingAvg": {
      const { column, window, newColumn } = step;
      return data.map((row, i) => {
        const slice = data.slice(Math.max(0, i - window + 1), i + 1).map((r) => toNum(r[column]));
        return { ...row, [newColumn]: mean(slice) };
      });
    }

    case "cumulativeSum": {
      const { column, newColumn } = step;
      let cum = 0;
      return data.map((row) => {
        cum += toNum(row[column]);
        return { ...row, [newColumn]: cum };
      });
    }

    case "rank": {
      const { column, newColumn, order } = step;
      const sorted = [...data].sort((a, b) => {
        const diff = toNum(a[column]) - toNum(b[column]);
        return order === "asc" ? diff : -diff;
      });
      const rankMap = new Map<Row, number>();
      sorted.forEach((row, i) => rankMap.set(row, i + 1));
      return data.map((row) => ({ ...row, [newColumn]: rankMap.get(row) ?? 0 }));
    }

    default:
      return data;
  }
}

export function runPipeline(data: Row[], steps: TransformStep[]): Row[] {
  let result = data;
  for (const step of steps) {
    result = applyTransformStep(result, step);
  }
  return result;
}

export function inferColumnType(values: (string | number | boolean | null)[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== "");
  if (!nonNull.length) return "string";
  const numCount = nonNull.filter((v) => !isNaN(Number(v))).length;
  if (numCount / nonNull.length > 0.8) return "number";
  const dateCount = nonNull.filter((v) => !isNaN(new Date(String(v)).getTime())).length;
  if (dateCount / nonNull.length > 0.8) return "date";
  const boolCount = nonNull.filter((v) => ["true", "false", "1", "0", "yes", "no"].includes(String(v).toLowerCase())).length;
  if (boolCount / nonNull.length > 0.9) return "boolean";
  return "string";
}

export function computeColumnStats(data: Row[], col: string): {
  nullCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  type: ColumnType;
} {
  const vals = data.map((r) => r[col]);
  const nullCount = vals.filter((v) => v === null || v === "").length;
  const uniqueCount = new Set(vals.map((v) => String(v))).size;
  const type = inferColumnType(vals);
  if (type === "number") {
    const nums = vals.filter((v) => v !== null && !isNaN(Number(v))).map(toNum);
    const m = mean(nums);
    const variance = nums.reduce((acc, n) => acc + Math.pow(n - m, 2), 0) / nums.length;
    return { nullCount, uniqueCount, min: Math.min(...nums), max: Math.max(...nums), mean: m, std: Math.sqrt(variance), type };
  }
  return { nullCount, uniqueCount, type };
}

export function detectOutliers(data: Row[], column: string): Set<number> {
  const nums = data.map((r, i) => ({ val: toNum(r[column]), i }));
  const validNums = nums.filter((n) => !isNaN(n.val));
  if (validNums.length < 4) return new Set();
  const { lower, upper } = iqrBounds(validNums.map((n) => n.val));
  return new Set(validNums.filter((n) => n.val < lower || n.val > upper).map((n) => n.i));
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function inferColumns(data: Row[]): Column[] {
  if (!data.length) return [];
  return Object.keys(data[0]).map((name) => ({
    name,
    type: inferColumnType(data.map((r) => r[name])),
  }));
}

// Linear regression for forecasting
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssTot = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
  const ssRes = y.reduce((acc, yi, i) => acc + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

// K-Means clustering
export function kMeans(data: Row[], columns: string[], k: number, maxIter = 100): number[] {
  const vectors = data.map((row) => columns.map((c) => toNum(row[c])));
  if (vectors.length < k) return vectors.map((_, i) => i % k);

  // Initialize centroids randomly
  const indices = Array.from(Array(vectors.length).keys()).sort(() => Math.random() - 0.5).slice(0, k);
  let centroids = indices.map((i) => [...vectors[i]]);
  let assignments = new Array(vectors.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    const newAssignments = vectors.map((vec) => {
      let minDist = Infinity;
      let closest = 0;
      centroids.forEach((centroid, ci) => {
        const dist = vec.reduce((acc, v, i) => acc + Math.pow(v - centroid[i], 2), 0);
        if (dist < minDist) { minDist = dist; closest = ci; }
      });
      return closest;
    });

    if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) break;
    assignments = newAssignments;

    // Update centroids
    centroids = centroids.map((_, ci) => {
      const members = vectors.filter((_, i) => assignments[i] === ci);
      if (!members.length) return centroids[ci];
      return columns.map((__, dim) => mean(members.map((v) => v[dim])));
    });
  }
  return assignments;
}

// Correlation matrix
export function correlationMatrix(data: Row[], columns: string[]): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const colA of columns) {
    matrix[colA] = {};
    for (const colB of columns) {
      const xVals = data.map((r) => toNum(r[colA]));
      const yVals = data.map((r) => toNum(r[colB]));
      const xMean = mean(xVals);
      const yMean = mean(yVals);
      const cov = xVals.reduce((acc, x, i) => acc + (x - xMean) * (yVals[i] - yMean), 0) / xVals.length;
      const xStd = Math.sqrt(xVals.reduce((acc, x) => acc + Math.pow(x - xMean, 2), 0) / xVals.length);
      const yStd = Math.sqrt(yVals.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0) / yVals.length);
      matrix[colA][colB] = xStd === 0 || yStd === 0 ? 0 : cov / (xStd * yStd);
    }
  }
  return matrix;
}
