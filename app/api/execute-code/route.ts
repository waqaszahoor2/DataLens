import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Safe JavaScript execution environment
// Evaluates data transformation code with access to dataset
export async function POST(req: NextRequest) {
  try {
    const { code, data, columns } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    // Sandbox using Function constructor with limited scope
    const output: string[] = [];
    const prints: string[] = [];

    // Build execution context
    const contextVars = {
      data: data ?? [],
      columns: columns ?? [],
      console: {
        log: (...args: unknown[]) => prints.push(args.map(String).join(" ")),
        warn: (...args: unknown[]) => prints.push("[WARN] " + args.map(String).join(" ")),
        error: (...args: unknown[]) => prints.push("[ERROR] " + args.map(String).join(" ")),
      },
      print: (...args: unknown[]) => prints.push(args.map(String).join(" ")),
      JSON,
      Math,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Date,
      parseFloat,
      parseInt,
      isNaN,
      isFinite,
    };

    let result: unknown = undefined;
    let error: string | null = null;

    try {
      const fn = new Function(
        ...Object.keys(contextVars),
        `"use strict";\n${code}\n`
      );
      result = fn(...Object.values(contextVars));
      if (result instanceof Promise) {
        result = await result;
      }
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }

    // Format result for display
    let displayResult: unknown = null;
    if (result !== undefined && result !== null) {
      if (Array.isArray(result) && result.length > 0 && typeof result[0] === "object") {
        // Dataframe-like result
        displayResult = { type: "dataframe", rows: result.slice(0, 100) };
      } else if (typeof result === "object") {
        displayResult = { type: "json", data: result };
      } else {
        displayResult = { type: "value", data: result };
        output.push(String(result));
      }
    }

    return NextResponse.json({
      output: [...prints, ...output],
      result: displayResult,
      error,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Execution failed" },
      { status: 500 }
    );
  }
}
