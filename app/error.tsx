"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js App Router error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 px-4 text-center">
      <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-200">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold mb-2">Application Error</h2>
      <p className="text-xs text-gray-500 mb-6 max-w-sm">
        An unexpected error occurred while rendering the page.
      </p>
      <button onClick={() => reset()} className="px-5 py-2.5 bg-brand hover:bg-brand-600 text-white rounded-lg text-xs font-bold shadow transition-all">
        Try Again
      </button>
    </div>
  );
}
