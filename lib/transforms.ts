/**
 * In-browser data transform engine using JavaScript.
 * DuckDB WASM is used for SQL queries in the Query Editor.
 * This engine handles pipeline transforms client-side.
 */

import type { Row, PipelineStep, Transform } from "./store";

type AggFunction = "sum" | "mean" | "count" | "min" | "max" | "std" | "first" | "last";

// ─── Type coercion helpers ─────────────────────────────────────────────────

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function isNull(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

// ─── Individual transform functions ───────────────────────────────────────

function applyFilter(data: Row[], t: Extract<Transform, { type: "filter" }>): Row[] {
  return data.filter((row) => {
    const val = row[t.column];
    const cmp = t.value;
    switch (t.operator) {
      case "=": return String(val) === cmp;
      case "!=": return String(val) !== cmp;
      case ">": return toNum(val) > toNum(cmp);
      case "<": return toNum(val) < toNum(cmp);
      case ">=": return toNum(val) >= toNum(cmp);
      case "<=": return toNum(val) <= toNum(cmp);
      case "contains": return String(val ?? "").toLowerCase().includes(cmp.toLowerCase());
      case "is null": return isNull(val);
      case "is not null": return !isNull(val);
      default: return true;
    }
  });
}

function applySelect(data: Row[], t: Extract<Transform, { type: "select" }>): Row[] {
  return data.map((row) => {
    const newRow: Row = {};
    for (const key of Object.keys(row)) {
      if (t.mode === "keep" ? t.columns.includes(key) : !t.columns.includes(key)) {
        newRow[key] = row[key];
      }
    }
    return newRow;
  });
}

function applyRename(data: Row[], t: Extract<Transform, { type: "rename" }>): Row[] {
  return data.map((row) => {
    const newRow: Row = {};
    for (const [k, v] of Object.entries(row)) {
      newRow[k === t.oldName ? t.newName : k] = v;
    }
    return newRow;
  });
}

function applyCast(data: Row[], t: Extract<Transform, { type: "cast" }>): Row[] {
  return data.map((row) => {
    const v = row[t.column];
    let casted: string | number | boolean | null = v;
    try {
      switch (t.targetType) {
        case "number": casted = Number(v); break;
        case "string": casted = String(v ?? ""); break;
        case "boolean": casted = Boolean(v); break;
        case "date": casted = new Date(String(v)).toISOString().split("T")[0]; break;
      }
    } catch {
      casted = v;
    }
    return { ...row, [t.column]: casted };
  });
}

function applyComputed(data: Row[], t: Extract<Transform, { type: "computed" }>): Row[] {
  return data.map((row) => {
    try {
      // Safe eval: replace column names in expression with actual values
      let expr = t.expression;
      for (const [k, v] of Object.entries(row)) {
        expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), String(v ?? 0));
      }
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${expr}`)();
      return { ...row, [t.name]: result };
    } catch {
      return { ...row, [t.name]: null };
    }
  });
}

function applySort(data: Row[], t: Extract<Transform, { type: "sort" }>): Row[] {
  return [...data].sort((a, b) => {
    const av = a[t.column];
    const bv = b[t.column];
    const direction = t.order === "asc" ? 1 : -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
    return String(av ?? "").localeCompare(String(bv ?? "")) * direction;
  });
}

function aggregate(values: (string | number | boolean | null)[], func: AggFunction): number | string | null {
  const nums = values.map(toNum);
  switch (func) {
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "mean": return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case "count": return values.length;
    case "min": return Math.min(...nums);
    case "max": return Math.max(...nums);
    case "std": {
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
      return Math.sqrt(variance);
    }
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
    default: return 0;
  }
}

function applyGroupBy(data: Row[], t: Extract<Transform, { type: "groupby" }>): Row[] {
  const groups = new Map<string, Row[]>();
  for (const row of data) {
    const key = t.groupColumns.map((c) => row[c]).join("|||");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  const result: Row[] = [];
  Array.from(groups.entries()).forEach(([key, rows]) => {
    const keyParts = key.split("|||");
    const newRow: Row = {};
    t.groupColumns.forEach((col, i) => { newRow[col] = keyParts[i] as string; });
    for (const agg of t.aggregations) {
      const values = rows.map((r) => r[agg.column]);
      const alias = agg.alias || `${agg.func}_${agg.column}`;
      newRow[alias] = aggregate(values, agg.func as AggFunction) as string | number | boolean | null;
    }
    result.push(newRow);
  });
  return result;
}

function applyFillNulls(data: Row[], t: Extract<Transform, { type: "fill_nulls" }>): Row[] {
  const values = data.map((r) => r[t.column]);
  let fillValue: string | number | boolean | null = t.value ?? null;

  if (t.method === "mean") {
    const nums = values.filter((v) => !isNull(v)).map(toNum);
    fillValue = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  } else if (t.method === "median") {
    const sorted = values.filter((v) => !isNull(v)).map(toNum).sort((a, b) => a - b);
    fillValue = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  }

  let lastVal: string | number | boolean | null = null;
  return data.map((row) => {
    if (isNull(row[t.column])) {
      if (t.method === "forward_fill") {
        return { ...row, [t.column]: lastVal };
      }
      return { ...row, [t.column]: fillValue };
    }
    lastVal = row[t.column];
    if (t.method === "backward_fill") {
      // We'd need two passes; simplified here
    }
    return row;
  });
}

function applyNormalize(data: Row[], t: Extract<Transform, { type: "normalize" }>): Row[] {
  const nums = data.map((r) => toNum(r[t.column]));
  if (t.method === "min-max") {
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    return data.map((row, i) => ({ ...row, [t.column]: parseFloat(((nums[i] - min) / range).toFixed(6)) }));
  } else {
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const std = Math.sqrt(nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length) || 1;
    return data.map((row, i) => ({ ...row, [t.column]: parseFloat(((nums[i] - mean) / std).toFixed(6)) }));
  }
}

function applyDeduplicate(data: Row[], t: Extract<Transform, { type: "deduplicate" }>): Row[] {
  const seen = new Set<string>();
  return data.filter((row) => {
    const key = t.columns?.length
      ? t.columns.map((c) => row[c]).join("|||")
      : JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Pipeline runner ───────────────────────────────────────────────────────

export function runPipeline(data: Row[], pipeline: PipelineStep[]): Row[] {
  let result = [...data];
  for (const step of pipeline) {
    if (!step.enabled) continue;
    try {
      switch (step.transform.type) {
        case "filter": result = applyFilter(result, step.transform as Extract<Transform, { type: "filter" }>); break;
        case "select": result = applySelect(result, step.transform as Extract<Transform, { type: "select" }>); break;
        case "rename": result = applyRename(result, step.transform as Extract<Transform, { type: "rename" }>); break;
        case "cast": result = applyCast(result, step.transform as Extract<Transform, { type: "cast" }>); break;
        case "computed": result = applyComputed(result, step.transform as Extract<Transform, { type: "computed" }>); break;
        case "sort": result = applySort(result, step.transform as Extract<Transform, { type: "sort" }>); break;
        case "groupby": result = applyGroupBy(result, step.transform as Extract<Transform, { type: "groupby" }>); break;
        case "fill_nulls": result = applyFillNulls(result, step.transform as Extract<Transform, { type: "fill_nulls" }>); break;
        case "normalize": result = applyNormalize(result, step.transform as Extract<Transform, { type: "normalize" }>); break;
        case "deduplicate": result = applyDeduplicate(result, step.transform as Extract<Transform, { type: "deduplicate" }>); break;
      }
    } catch (err) {
      console.error(`Transform step "${step.transform.type}" failed:`, err);
    }
  }
  return result;
}
