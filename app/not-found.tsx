"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 px-4 text-center">
      <h1 className="text-6xl font-black text-brand mb-4">404</h1>
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        We couldn't find the page you were looking for. It might have been moved or deleted.
      </p>
      <Link href="/dashboard" className="px-5 py-2.5 bg-brand hover:bg-brand-600 text-white rounded-lg text-xs font-bold shadow transition-all">
        Go to Dashboard
      </Link>
    </div>
  );
}
