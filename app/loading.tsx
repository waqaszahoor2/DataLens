"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-900">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loading DataLens...</span>
      </div>
    </div>
  );
}
