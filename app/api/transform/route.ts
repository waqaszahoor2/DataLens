import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/transforms";
import type { Row, PipelineStep } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { data, pipeline } = (await req.json()) as {
      data: Row[];
      pipeline: PipelineStep[];
    };

    if (!Array.isArray(data) || !Array.isArray(pipeline)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const result = runPipeline(data, pipeline);
    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      data: result,
      rowCount: result.length,
      originalCount: data.length,
      elapsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Transform failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
