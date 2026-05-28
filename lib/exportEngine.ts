import { toast } from "sonner";

export interface PDFExportOptions {
  pageSize: "a4" | "letter" | "a3";
  orientation: "portrait" | "landscape";
  includeCover: boolean;
  includeStats: boolean;
  includeAppendix: boolean;
}

export async function exportToPNG(elementId: string, filename = "datalens-dashboard") {
  toast.loading("Generating high-resolution PNG screenshot...", { id: "png-export" });
  try {
    const html2canvas = (await import("html2canvas")).default;
    const element = document.getElementById(elementId);
    if (!element) throw new Error("Target dashboard element not found.");

    // High quality scale option (2x retina render)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: document.documentElement.classList.contains("dark") ? "#0b0f19" : "#f7f8fa",
      logging: false,
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${filename}-${new Date().toISOString().split("T")[0]}.png`;
    link.href = dataUrl;
    link.click();
    toast.success("Successfully downloaded PNG screenshot!", { id: "png-export" });
  } catch (err) {
    console.error(err);
    toast.error("Failed to generate PNG screenshot.", { id: "png-export" });
  }
}

export async function exportToPDF(elementId: string, title = "DataLens Analytics Report", datasetName = "Dataset", options: PDFExportOptions) {
  toast.loading("Generating Multi-page PDF Report...", { id: "pdf-export" });
  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const element = document.getElementById(elementId);
    if (!element) throw new Error("Dashboard canvas not found.");

    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: "px",
      format: options.pageSize,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // 1. Optional Cover Page
    if (options.includeCover) {
      pdf.setFillColor(29, 158, 117); // Brand primary color
      pdf.rect(0, 0, pageWidth, 80, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.text("DATALENS ANALYTICS EXECUTIVE REPORT", 30, 48);

      pdf.setTextColor(20, 20, 20);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(`Report Title: ${title}`, 35, 140);
      pdf.text(`Active Dataset: ${datasetName}`, 35, 160);
      pdf.text(`Date Exported: ${new Date().toLocaleDateString()}`, 35, 180);
      pdf.text("This document contains automated AI data insights and visualizations.", 35, 200);

      pdf.setDrawColor(220, 220, 220);
      pdf.line(30, 230, pageWidth - 30, 230);
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text("CONFIDENTIAL · GENERATED DIRECTLY IN BROWSER", 30, pageHeight - 40);

      pdf.addPage();
    }

    // 2. Capture and append dashboard widgets
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const imgWidth = pageWidth - 60;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Interactive Dashboard Visualizations", 30, 40);
    pdf.addImage(imgData, "JPEG", 30, 60, imgWidth, imgHeight);

    // 3. Optional Appendix raw table page
    if (options.includeAppendix) {
      pdf.addPage();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("Appendix: Core Pipeline Raw Transformed Rows", 30, 40);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Limited preview of top data rows:", 30, 55);

      pdf.setFont("courier", "normal");
      pdf.text(
        "For complete logs, download sheet as spreadsheet format (.xlsx).",
        30,
        75
      );
    }

    pdf.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    toast.success("PDF Report generated successfully!", { id: "pdf-export" });
  } catch (err) {
    console.error(err);
    toast.error("Failed to generate PDF report.", { id: "pdf-export" });
  }
}

export async function exportToExcel(data: any[], filename = "datalens-data") {
  toast.loading("Compiling Excel Spreadsheet sheets...", { id: "excel-export" });
  try {
    const XLSX = await import("xlsx");
    
    // Create multi-sheet spreadsheet workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Transformed dataset
    const wsData = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, wsData, "Transformed Raw Data");

    // Sheet 2: Pivot Summary Matrix (Mock or compiled aggregate)
    const pivotMock = data.slice(0, 10).map((row) => ({
      Metric: Object.keys(row)[0] || "Key",
      Value: String(Object.values(row)[0] || "Value"),
    }));
    const wsPivot = XLSX.utils.json_to_sheet(pivotMock);
    XLSX.utils.book_append_sheet(wb, wsPivot, "Data Pivot Summary");

    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Spreadsheet generated successfully!", { id: "excel-export" });
  } catch (err) {
    console.error(err);
    toast.error("Failed to generate Excel sheet.", { id: "excel-export" });
  }
}

// Generate python-pandas stand-alone file
export function generatePythonScript(pipeline: any[], datasetName = "dataset.csv") {
  let script = `"""
DataLens Standalone Pipeline Preprocessing Script
Generated on: ${new Date().toLocaleDateString()}
Dataset source: ${datasetName}
"""

import pandas as pd
import numpy as np
import plotly.express as px

def run_datalens_pipeline(filepath_or_url):
    print("Loading raw CSV source...")
    df = pd.read_csv(filepath_or_url)
    print(f"Loaded {len(df)} original rows successfully.\\n")
    
`;

  if (!pipeline || pipeline.length === 0) {
    script += `    # No active visual transformations applied in pipeline.\n    pass\n`;
  } else {
    pipeline.forEach((step, idx) => {
      script += `    # Step ${idx + 1}: ${step.type} operations\n`;
      if (step.type === "removeDuplicates") {
        script += `    df.drop_duplicates(inplace=True)\n`;
      } else if (step.type === "dropColumns") {
        script += `    df.drop(columns=${JSON.stringify(step.columns)}, inplace=True, errors='ignore')\n`;
      } else if (step.type === "fillNulls") {
        const fillVal = step.method === "mean" ? `df['${step.column}'].mean()` : step.method === "median" ? `df['${step.column}'].median()` : `"${step.customValue ?? 0}"`;
        script += `    df['${step.column}'].fillna(${fillVal}, inplace=True)\n`;
      } else if (step.type === "changeType") {
        const dtype = step.toType === "number" ? "float" : step.toType === "boolean" ? "bool" : "str";
        script += `    df['${step.column}'] = df['${step.column}'].astype('${dtype}')\n`;
      } else {
        script += `    # Custom transformation logic:\n    # ${JSON.stringify(step)}\n`;
      }
      script += `\n`;
    });
  }

  script += `    return df

if __name__ == "__main__":
    # Standard requirements statement:
    # pip install pandas numpy plotly scipy
    df_cleaned = run_datalens_pipeline("${datasetName}")
    print("Pipeline run successfully! Transformed dataset heads:")
    print(df_cleaned.head(10))
`;

  // Standard requirements.txt statement
  const reqs = `pandas>=2.0.0
numpy>=1.24.0
plotly>=5.15.0
scipy>=1.10.0
`;

  const blob = new Blob([script], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = "analysis.py";
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);

  // Requirements script
  const blobReq = new Blob([reqs], { type: "text/plain" });
  const urlReq = URL.createObjectURL(blobReq);
  const linkReq = document.createElement("a");
  linkReq.download = "requirements.txt";
  linkReq.href = urlReq;
  linkReq.click();
  URL.revokeObjectURL(urlReq);

  toast.success("Python executable script and requirements.txt exported!");
}
