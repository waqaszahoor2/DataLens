import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Row, Column, ColumnType } from "@/store/useDataStore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatNumber(n: number, decimals = 2): string {
  if (isNaN(n)) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(decimals);
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
  } catch {
    return dateStr;
  }
}

export function inferColumnType(values: (string | number | boolean | null)[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== "");
  if (!nonNull.length) return "string";
  const numCount = nonNull.filter((v) => !isNaN(Number(v))).length;
  if (numCount / nonNull.length > 0.8) return "number";
  const dateCount = nonNull.filter((v) => {
    const d = new Date(String(v));
    return !isNaN(d.getTime()) && String(v).length > 4;
  }).length;
  if (dateCount / nonNull.length > 0.8) return "date";
  const boolCount = nonNull.filter((v) =>
    ["true", "false", "1", "0", "yes", "no"].includes(String(v).toLowerCase())
  ).length;
  if (boolCount / nonNull.length > 0.9) return "boolean";
  return "string";
}

export function inferColumns(data: Row[]): Column[] {
  if (!data.length) return [];
  return Object.keys(data[0]).map((name) => ({
    name,
    type: inferColumnType(data.map((r) => r[name])),
  }));
}

export function computeColumnStats(data: Row[], col: string) {
  const vals = data.map((r) => r[col]);
  const nullCount = vals.filter((v) => v === null || v === "").length;
  const uniqueCount = new Set(vals.map((v) => String(v ?? ""))).size;
  const type = inferColumnType(vals);
  if (type === "number") {
    const nums = vals.filter((v) => v !== null && !isNaN(Number(v))).map(Number);
    const m = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((acc, n) => acc + Math.pow(n - m, 2), 0) / nums.length;
    return {
      nullCount, uniqueCount, type,
      min: Math.min(...nums), max: Math.max(...nums),
      mean: m, std: Math.sqrt(variance),
    };
  }
  return { nullCount, uniqueCount, type };
}

export function downloadCSV(data: Row[], filename = "export.csv") {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const v = row[h];
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const SAMPLE_DATASETS: Record<string, { name: string; description: string; rows: Row[] }> = {
  sales2024: {
    name: "Sales 2024",
    description: "Monthly sales by product category and region",
    rows: (() => {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const categories = ["Electronics","Clothing","Food","Furniture","Sports"];
      const regions = ["North","South","East","West"];
      const rows: Row[] = [];
      let id = 1;
      for (const month of months) {
        for (const cat of categories) {
          for (const reg of regions) {
            const base = { Electronics: 50000, Clothing: 30000, Food: 20000, Furniture: 40000, Sports: 25000 }[cat] ?? 30000;
            const revenue = Math.round(base * (0.7 + Math.random() * 0.6));
            const units = Math.round(revenue / (Math.random() * 50 + 20));
            rows.push({
              id, month, category: cat, region: reg,
              revenue, units,
              profit: Math.round(revenue * (0.15 + Math.random() * 0.2)),
              date: `2024-${String(months.indexOf(month) + 1).padStart(2,"0")}-01`,
              customer_satisfaction: +(3.5 + Math.random() * 1.5).toFixed(1),
            });
            id++;
          }
        }
      }
      return rows;
    })(),
  },
  employees: {
    name: "Employee Analytics",
    description: "HR dataset with employee demographics, performance, and compensation",
    rows: (() => {
      const depts = ["Engineering","Marketing","Sales","HR","Finance","Operations"];
      const titles = {
        Engineering: ["Junior Dev","Senior Dev","Lead Dev","Principal Eng"],
        Marketing: ["Analyst","Sr. Analyst","Manager","Director"],
        Sales: ["Rep","Sr. Rep","Manager","VP Sales"],
        HR: ["Coordinator","Specialist","Manager","Director"],
        Finance: ["Analyst","Sr. Analyst","Controller","CFO"],
        Operations: ["Coordinator","Manager","Sr. Manager","VP Ops"],
      };
      const rows: Row[] = [];
      for (let i = 1; i <= 150; i++) {
        const dept = depts[Math.floor(Math.random() * depts.length)] as keyof typeof titles;
        const t = titles[dept];
        const titleIdx = Math.floor(Math.random() * t.length);
        const yearsExp = titleIdx * 3 + Math.floor(Math.random() * 3);
        const baseSalary = [55000,75000,110000,155000][titleIdx];
        rows.push({
          employee_id: i,
          name: `Employee ${i}`,
          department: dept,
          title: t[titleIdx],
          years_experience: yearsExp,
          salary: Math.round(baseSalary * (0.9 + Math.random() * 0.2)),
          performance_score: +(2.5 + Math.random() * 2.5).toFixed(1),
          remote_days: Math.floor(Math.random() * 5),
          hire_date: `20${Math.floor(Math.random() * 10 + 14).toString().padStart(2,"0")}-${String(Math.floor(Math.random()*12)+1).padStart(2,"0")}-01`,
          gender: Math.random() > 0.5 ? "Female" : "Male",
          age: Math.floor(25 + Math.random() * 35),
        });
      }
      return rows;
    })(),
  },
  marketing: {
    name: "Marketing Funnel",
    description: "Campaign performance with funnel metrics by channel",
    rows: (() => {
      const channels = ["Google Ads","Facebook","Email","Organic","LinkedIn","Twitter","Referral"];
      const campaigns = ["Brand Awareness","Lead Gen","Retargeting","Product Launch","Seasonal"];
      const rows: Row[] = [];
      let id = 1;
      for (let week = 1; week <= 20; week++) {
        for (const channel of channels) {
          for (const campaign of campaigns) {
            const impressions = Math.floor(Math.random() * 100000 + 10000);
            const ctr = 0.01 + Math.random() * 0.05;
            const clicks = Math.floor(impressions * ctr);
            const conv = 0.02 + Math.random() * 0.08;
            const conversions = Math.floor(clicks * conv);
            rows.push({
              id: id++, week, channel, campaign,
              impressions, clicks, conversions,
              ctr: +ctr.toFixed(4),
              conversion_rate: +conv.toFixed(4),
              spend: Math.round(Math.random() * 5000 + 500),
              revenue: Math.round(conversions * (Math.random() * 200 + 50)),
              cpc: +(Math.random() * 3 + 0.5).toFixed(2),
            });
          }
        }
      }
      return rows;
    })(),
  },
};
